import axios from "axios";
import {
  ensureCryptoReady,
  fetchUtxos,
  buildCommitPsbtMulti,
  buildPepinalsPartial,
  buildLockForPartial,
  splitPartialForScriptSig,
  calculateCommitChainPlan,
  buildChainedCommitTx,
  buildAndSignRevealTx,
  signPsbtWithWallet,
  finalizeAndExtractPsbtBase64,
  broadcastRawTxCore,
  waitForRawTx,
  buildEPH,
} from "./inscribe";
import { pepeNetwork } from "./pepeNetwork";
import { MIN_COMMIT_VALUE } from "./inscription";

const STATUS_URL = "http://172.16.11.131:8000/status";
const POLL_INTERVAL = 10000; // 10 seconds
const FEE_RATE = 0.042; // PEP per KB

// Configure your 5 wallet private keys (WIF format)
const WALLETS = [
  "QPn1EF5wzPCXKTuCZ1zmQgbmuonpk7fQZakGpcSRMfm3KkrjLcCD", // Wallet 1
  "QRjqkmDYJGtwS7YKCc33dwJMwRjhKWzWEGqFv5KM99jsUMXCFQbV", // Wallet 2
  "QPLn53AEzZU381up6k2vnhzjdCsjfymBRyWtkfZMt4tkW3nGsjfg", // Wallet 3
  "QPjEbcZeSvWF2gX3E4AUKyQ7NMdWdHXVsk4ZfaJ8jrBDqbjq9Rv3", // Wallet 4
  "QRDw9TfJf4gcutH3NGZAePZseLnp7XK5PwTd31AZSKA5JxCyZYxY", // Wallet 5
];

let lastHeight = 0;
const processingHeights = new Set<number>(); // Track which heights are being inscribed

// Get wallet address from private key
async function getAddressFromWIF(wif: string): Promise<string> {
  const { btc, ECPair } = await ensureCryptoReady();
  const keyPair = ECPair.fromWIF(wif, pepeNetwork);
  const { address } = btc.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: pepeNetwork,
  });
  if (!address) throw new Error("Failed to derive address from WIF");
  return address;
}

// Create and inscribe a pepemap
async function inscribePepemap(
  walletWIF: string,
  blockHeight: number
): Promise<void> {
  console.log(`\n🐸 Starting inscription for block ${blockHeight}...`);

  try {
    // Initialize crypto libraries
    await ensureCryptoReady();

    // Get wallet address
    const walletAddress = await getAddressFromWIF(walletWIF);
    console.log(`📍 Using wallet address: ${walletAddress}`);

    // Create pepemap content: just the block number
    const content = `${blockHeight}.pepemap`;
    const contentBuffer = Buffer.from(content, "utf-8");
    const contentType = "text/plain;charset=utf-8";

    console.log(`📝 Pepemap content: "${content}"`);

    // Build inscription data
    const partialItems = buildPepinalsPartial(contentType, contentBuffer);
    const segments = splitPartialForScriptSig(partialItems);

    // Create ephemeral key for inscription
    const ephemeralKey = await buildEPH();
    const ephemeralWIF = ephemeralKey.toWIF();
    const { btc } = await ensureCryptoReady();
    const { address: ephemeralAddress } = btc.payments.p2pkh({
      pubkey: ephemeralKey.publicKey,
      network: pepeNetwork,
    });

    if (!ephemeralAddress)
      throw new Error("Failed to derive ephemeral address");

    // Build locks for each segment
    const locks = segments.map((segment) =>
      buildLockForPartial(ephemeralKey.publicKey, segment.length)
    );

    // Calculate commit chain plan
    const { commitOutputValue, segmentValues } = calculateCommitChainPlan({
      segments,
      locks,
      feeRate: FEE_RATE,
      revealOutputValue: MIN_COMMIT_VALUE,
    });

    console.log(`💰 Commit output value: ${commitOutputValue} koinu`);

    // Fetch UTXOs from wallet
    console.log(`🔍 Fetching UTXOs for ${walletAddress}...`);
    const utxos = await fetchUtxos(walletAddress);

    if (!utxos || utxos.length === 0) {
      throw new Error(`No UTXOs found for wallet ${walletAddress}`);
    }

    const confirmedCount = utxos.filter((u) => u.confirmations > 0).length;
    console.log(
      `✅ Found ${utxos.length} UTXOs (${confirmedCount} confirmed, ${utxos.length - confirmedCount} unconfirmed)`
    );

    // Build and sign commit transaction
    console.log(`📦 Building commit transaction...`);
    const commitPsbt = await buildCommitPsbtMulti({
      utxos,
      lockScript: locks[0],
      perCommitValue: MIN_COMMIT_VALUE,
      changeAddress: walletAddress,
      feeRate: FEE_RATE,
      partialItems: segments[0],
      commitOutputValueOverride: commitOutputValue,
    });

    // Sign the commit PSBT
    const signedCommitPsbt = await signPsbtWithWallet(
      commitPsbt.toBase64(),
      walletWIF
    );
    const commitTxHex = await finalizeAndExtractPsbtBase64(signedCommitPsbt);

    // Broadcast commit transaction
    console.log(`📡 Broadcasting commit transaction...`);
    const commitTxId = await broadcastRawTxCore(commitTxHex);
    console.log(`✅ Commit TX broadcast: ${commitTxId}`);

    // Wait for commit transaction to be in mempool
    console.log(`⏳ Waiting for commit transaction...`);
    let currentTxId = commitTxId;
    let currentTxHex = await waitForRawTx(commitTxId);
    let currentVout = 0;

    // Build and broadcast chained commit transactions if needed
    for (let i = 1; i < segments.length; i++) {
      console.log(`🔗 Building chained commit ${i}/${segments.length - 1}...`);
      const { hex, txid } = await buildChainedCommitTx({
        prevTxId: currentTxId,
        prevVout: currentVout,
        prevRawTx: currentTxHex,
        lockScript: locks[i - 1],
        partialItems: segments[i - 1],
        nextLockScript: locks[i],
        nextOutputValue: segmentValues[i],
        ephemeralWIF,
      });

      console.log(`📡 Broadcasting chained commit ${i}...`);
      await broadcastRawTxCore(hex);
      console.log(`✅ Chained commit ${i} TX: ${txid}`);

      currentTxId = txid;
      currentTxHex = await waitForRawTx(txid);
      currentVout = 0;
    }

    // Build and broadcast reveal transaction
    console.log(`🎨 Building reveal transaction...`);
    const lastSegment = segments[segments.length - 1];
    const lastLock = locks[locks.length - 1];

    const revealTxHex = await buildAndSignRevealTx({
      prevTxId: currentTxId,
      prevVout: currentVout,
      prevRawTx: currentTxHex,
      lockScript: lastLock,
      partialItems: lastSegment,
      revealOutputValue: MIN_COMMIT_VALUE,
      toAddress: walletAddress,
      ephemeralWIF,
      feeRate: FEE_RATE,
    });

    console.log(`📡 Broadcasting reveal transaction...`);
    const revealTxId = await broadcastRawTxCore(revealTxHex);
    console.log(`✅ Reveal TX broadcast: ${revealTxId}`);

    console.log(`\n🎉 SUCCESS! Pepemap "${blockHeight}.pepemap" inscribed!`);
    console.log(`🔗 Inscription TXID: ${revealTxId}`);
  } catch (error: any) {
    console.error(`❌ Error inscribing pepemap:`, error.message);
    throw error;
  }
}

// Check block height and trigger inscription if needed
async function checkBlockHeight(): Promise<void> {
  try {
    const response = await axios.get(STATUS_URL);
    const currentHeight = response.data.height;

    if (!currentHeight) {
      console.error("❌ Invalid response from status endpoint");
      return;
    }

    // Initialize on first run and inscribe immediately
    if (lastHeight === 0) {
      lastHeight = currentHeight;
      console.log(`🚀 Bot started at block height: ${currentHeight}`);

      // Immediately inscribe for next block
      const walletIndex = currentHeight % 5;
      const walletNumber = walletIndex + 1;
      const walletWIF = WALLETS[walletIndex];
      const nextBlockHeight = currentHeight + 1;

      console.log(`🔑 Using wallet #${walletNumber} for initial inscription`);
      console.log(`📝 Starting inscription for ${nextBlockHeight}.pepemap`);

      // Mark as processing
      processingHeights.add(nextBlockHeight);

      // Start inscription in background
      inscribePepemap(walletWIF, nextBlockHeight)
        .then(() => {
          console.log(`✅ Finished inscribing ${nextBlockHeight}.pepemap`);
        })
        .catch((error: any) => {
          if (error.message.includes("txn-mempool-conflict")) {
            console.log(`⏸️  Wallet busy (mempool conflict), will retry later`);
          } else {
            console.error(
              `❌ Inscription failed for ${nextBlockHeight}.pepemap:`,
              error.message
            );
          }
        })
        .finally(() => {
          processingHeights.delete(nextBlockHeight);
        });

      return;
    }

    // Check if height has increased
    if (currentHeight > lastHeight) {
      console.log(
        `\n📈 Block height increased: ${lastHeight} → ${currentHeight}`
      );

      // Calculate which wallet to use: (height % 5) + 1
      const walletIndex = currentHeight % 5;
      const walletNumber = walletIndex + 1;
      const walletWIF = WALLETS[walletIndex];

      console.log(`🔑 Using wallet #${walletNumber}`);

      // Inscribe next block number
      const nextBlockHeight = currentHeight + 1;

      // Check if we're already inscribing this height
      if (processingHeights.has(nextBlockHeight)) {
        console.log(`⏭️  Already inscribing ${nextBlockHeight}.pepemap, skipping`);
        return;
      }

      // Mark this height as being processed
      processingHeights.add(nextBlockHeight);

      // Update last height immediately to trigger next block
      lastHeight = currentHeight;

      // Start inscription in background (don't await)
      inscribePepemap(walletWIF, nextBlockHeight)
        .then(() => {
          console.log(`✅ Finished inscribing ${nextBlockHeight}.pepemap`);
        })
        .catch((error: any) => {
          // Handle mempool conflict - means UTXO is already being spent
          if (error.message.includes("txn-mempool-conflict")) {
            console.log(`⏸️  Wallet busy (mempool conflict), will retry later`);
          } else {
            console.error(
              `❌ Inscription failed for ${nextBlockHeight}.pepemap:`,
              error.message
            );
          }
        })
        .finally(() => {
          // Remove from processing set when done
          processingHeights.delete(nextBlockHeight);
        });
    }
    // Silent polling when height unchanged - no log output
  } catch (error: any) {
    console.error(`❌ Error checking block height:`, error.message);
  }
}

// Main bot loop
async function startBot(): Promise<void> {
  console.log("🤖 Pepemap Auto-Inscription Bot Starting...");
  console.log(`📊 Status URL: ${STATUS_URL}`);
  console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`💼 Wallets configured: ${WALLETS.length}`);

  // Validate wallets
  if (WALLETS.some((w) => w.startsWith("WALLET_"))) {
    console.warn(
      "\n⚠️  WARNING: Please configure your wallet private keys in the WALLETS array!"
    );
    console.warn(
      "Replace WALLET_X_PRIVATE_KEY_WIF with actual WIF private keys\n"
    );
  }

  // Start polling
  setInterval(checkBlockHeight, POLL_INTERVAL);

  // Run first check immediately
  await checkBlockHeight();
}

// Start the bot
startBot().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});
