"use client";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";
import { pepeNetwork } from "@/lib/wallet/pepeNetwork";
import axios from "axios";
import { apiClient } from "../axios";
import { fetchRawTransaction as fetchRawTransactionHex } from "../inscription/inscribe";

const ECPair = ECPairFactory(ecc);

function extractLocationFromHtml(htmlString: string): string | null {
  // Create a DOMParser instance to parse the HTML string
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");

  // Find all <dt> elements and search for the "location" one
  const dtElements = doc.querySelectorAll("dt");
  for (let dt of dtElements) {
    if (dt.textContent?.trim() === "location") {
      // Get the next sibling <dd> element
      const dd = dt.nextElementSibling as HTMLElement;
      if (dd && dd.classList.contains("monospace")) {
        return dd.textContent?.trim() || null;
      }
    }
  }
  return null;
}

// Helper: Post transaction via backend API
async function postPepecoinTransaction(
  rawHex: string,
  options: { allowHighFees?: boolean } = {},
) {
  // Call backend API instead of calling RPC directly from browser
  return apiClient.post("/pepecoin/tx", {
    rawHex,
    allowHighFees: options.allowHighFees || false,
  });
}

export type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

/**
 * Find the UTXO that contains a specific inscription
 *
 * @param address - The address that owns the inscription
 * @param inscriptionId - The inscription ID
 * @returns The UTXO containing the inscription
 */
export async function findInscriptionUTXO(
  address: string,
  inscriptionId: string,
): Promise<UTXO> {
  try {
    // Fetch all UTXOs for the address
    const utxoRes = await axios.get(`/api/dogepay/utxo/${address}`);
    const utxos: UTXO[] = utxoRes.data;

    // Fetch inscription details from the blockchain API
    const inscriptionRes = await axios.get(
      `${process.env.NEXT_PUBLIC_ORD_API_BASE}/inscription/${inscriptionId}`,
    );
    const inscriptionData = inscriptionRes.data;

    // The inscription is located at a specific output of a transaction
    const location = extractLocationFromHtml(inscriptionData);
    if (!location) {
      throw new Error("Could not find inscription location");
    }

    // Parse location format: "txid:vout"
    const [txid, voutStr] = location.split(":");
    const vout = parseInt(voutStr, 10);

    // Find the matching UTXO
    const inscriptionUtxo = utxos.find(
      (u) => u.txid === txid && u.vout === vout,
    );

    if (!inscriptionUtxo) {
      throw new Error(
        `Inscription UTXO not found. Make sure you own this inscription.`,
      );
    }

    return inscriptionUtxo;
  } catch (err: any) {
    console.error("Error finding inscription UTXO:", err);
    throw new Error(err.message || "Failed to find inscription UTXO");
  }
}

// Helper: Broadcast transaction
async function broadcastRawTransaction(
  rawTx: string,
  options: { allowHighFees?: boolean } = {},
): Promise<string> {
  try {
    // Validate hex format
    const trimmed = rawTx.trim();
    if (!/^[0-9a-fA-F]+$/.test(trimmed) || trimmed.length % 2 !== 0) {
      throw new Error("Invalid raw transaction hex");
    }
    if (trimmed.startsWith("70736274ff") || trimmed.startsWith("cHNidP")) {
      throw new Error("Got PSBT, need signed raw transaction hex");
    }

    // Broadcast transaction via backend API
    const response = await postPepecoinTransaction(trimmed, options);

    const data = response.data;

    // Handle backend API response format
    if (data && typeof data === "object") {
      // Check for success
      if (
        data.success &&
        typeof data.txid === "string" &&
        data.txid.length === 64
      ) {
        return data.txid;
      }

      // Handle error in response
      if (data.error) {
        throw new Error(`API Error: ${data.error}`);
      }
    }

    throw new Error(
      `Unexpected response from backend: ${JSON.stringify(data)}`,
    );
  } catch (error: any) {
    // Handle backend API error response
    if (error.response?.data) {
      const errorData = error.response.data;

      // Extract error message from backend response
      const message =
        errorData.message || errorData.error || JSON.stringify(errorData);
      throw new Error(`Broadcast failed: ${message}`);
    }

    throw new Error(`Broadcast failed: ${error.message}`);
  }
}

/**
 * Create a listing PSBT for selling an NFT inscription
 *
 * IMPORTANT: This PSBT uses SIGHASH_NONE | SIGHASH_ANYONECANPAY
 * - Seller signs ONLY the inscription input (input 0)
 * - Seller does NOT commit to any outputs
 * - Buyer will create ALL outputs when purchasing
 * - Price is stored in the database, NOT in the PSBT
 *
 * @param inscriptionUtxo - The UTXO containing the inscription to sell
 * @param priceSats - Listing price in satoshis (stored in DB, not enforced by PSBT)
 * @param sellerPrivateKeyWIF - Seller's private key in WIF format
 * @param sellerAddress - Seller's address (used for validation)
 * @returns Base64 encoded PSBT with signed inscription input, zero outputs
 */
export async function createListingPSBT(
  inscriptionUtxo: UTXO,
  priceSats: number,
  sellerPrivateKeyWIF: string,
  sellerAddress: string,
): Promise<string> {
  try {
    priceSats = priceSats * 1e8;
    console.log("📝 Creating Listing PSBT:");
    console.log(
      `  Inscription UTXO: ${inscriptionUtxo.txid}:${inscriptionUtxo.vout}`,
    );
    console.log(`  Inscription Value: ${inscriptionUtxo.value} sats`);
    console.log(`  Listing Price: ${priceSats} sats (${priceSats / 1e8} PEPE)`);
    console.log(`  Seller Address: ${sellerAddress}`);

    const keyPair = ECPair.fromWIF(sellerPrivateKeyWIF, pepeNetwork);

    // Create PSBT
    const psbt = new bitcoin.Psbt({ network: pepeNetwork });

    // Use SIGHASH_NONE | SIGHASH_ANYONECANPAY
    // - SIGHASH_NONE: Seller doesn't commit to ANY outputs
    // - SIGHASH_ANYONECANPAY: Seller only commits to input 0 (the inscription)
    // This allows buyer to freely construct all outputs
    const sighashType =
      bitcoin.Transaction.SIGHASH_NONE |
      bitcoin.Transaction.SIGHASH_ANYONECANPAY;

    // Fetch the raw transaction for the inscription UTXO
    const rawHex = await fetchRawTransactionHex(inscriptionUtxo.txid);

    // Add inscription input (this will be spent to transfer the NFT)
    psbt.addInput({
      hash: inscriptionUtxo.txid,
      index: inscriptionUtxo.vout,
      nonWitnessUtxo: Buffer.from(rawHex, "hex"),
      sighashType: sighashType, // Whitelist this sighash type
    });

    // Verify the inscription belongs to the seller
    const inscriptionTx = bitcoin.Transaction.fromBuffer(
      Buffer.from(rawHex, "hex"),
    );
    const inscriptionOutput = inscriptionTx.outs[inscriptionUtxo.vout];
    const inscriptionAddress = bitcoin.address.fromOutputScript(
      inscriptionOutput.script,
      pepeNetwork,
    );

    if (inscriptionAddress !== sellerAddress) {
      throw new Error(
        `Inscription does not belong to seller. Expected ${sellerAddress}, got ${inscriptionAddress}`,
      );
    }

    console.log("✅ Inscription ownership verified");

    // Seller signs input 0 with SIGHASH_NONE | SIGHASH_ANYONECANPAY
    psbt.signInput(0, keyPair, [sighashType]);

    console.log("✅ Seller signed inscription input");
    console.log(
      "📦 PSBT created with 1 input, 0 outputs (buyer will add all outputs)",
    );

    // Return as base64
    return psbt.toBase64();
  } catch (err: any) {
    console.error("❌ Error creating listing PSBT:", err);
    throw new Error(err.message || "Failed to create listing PSBT");
  }
}

/**
 * Complete a buy transaction for a listed NFT
 *
 * IMPORTANT: This function works with PSBTs created using SIGHASH_NONE
 * - Seller's PSBT has 1 signed input (inscription), 0 outputs
 * - Buyer creates ALL outputs:
 *   - Output 0: NFT to buyer (inscription value)
 *   - Output 1: Payment to seller (listing price)
 *   - Output N: Change to buyer (if any)
 * - Buyer adds their payment inputs
 * - Buyer signs their inputs
 * - Transaction is finalized and broadcast
 *
 * @param psbtBase64 - Seller's partially signed PSBT (base64 encoded)
 * @param buyerPrivateKeyWIF - Buyer's private key in WIF format
 * @param buyerAddress - Buyer's address to receive the NFT
 * @param priceSats - Listing price in satoshis (from database)
 * @returns Transaction ID of the broadcast transaction
 */
export async function completeBuyPSBT(
  psbtBase64: string,
  buyerPrivateKeyWIF: string,
  buyerAddress: string,
  priceInPEP: number,
): Promise<string> {
  const priceSats = Math.round(priceInPEP * 1e8);

  console.log("\n" + "=".repeat(80));
  console.log("🛒 STARTING BUY TRANSACTION");
  console.log("=".repeat(80));
  console.log(`Buyer Address: ${buyerAddress}`);
  console.log(`Listing Price: ${priceSats} sats (${priceInPEP} PEPE)`);
  console.log("=".repeat(80) + "\n");

  // Validate price is reasonable
  if (!priceSats || priceSats < 1000) {
    throw new Error(
      `Invalid listing price: ${priceSats} sats. Price must be at least 1000 sats (dust threshold).`,
    );
  }

  // ============================================================================
  // STEP 1: Initialize and parse the PSBT
  // ============================================================================
  const keyPair = ECPair.fromWIF(buyerPrivateKeyWIF, pepeNetwork);
  const psbt = bitcoin.Psbt.fromBase64(psbtBase64, {
    network: pepeNetwork,
    maximumFeeRate: 100000, // Allow high fee rates (100,000 sats/byte)
  });

  console.log("📦 PSBT Loaded:");
  console.log(`  Inputs: ${psbt.txInputs.length}`);
  console.log(`  Outputs: ${psbt.txOutputs.length}`);

  if (psbt.txInputs.length !== 1 || psbt.txOutputs.length !== 0) {
    throw new Error(
      `Invalid PSBT format. Expected 1 input and 0 outputs, got ${psbt.txInputs.length} inputs and ${psbt.txOutputs.length} outputs`,
    );
  }

  // ============================================================================
  // STEP 2: Get inscription input value and seller's address
  // ============================================================================
  // The seller signed with SIGHASH_NONE | SIGHASH_ANYONECANPAY
  // This means NO outputs are committed, so we create them all

  // Get the inscription UTXO value from input 0
  const inscriptionInput = psbt.data.inputs[0];
  const inscriptionTx = bitcoin.Transaction.fromBuffer(
    inscriptionInput.nonWitnessUtxo!,
  );
  const inscriptionOutputIndex = psbt.txInputs[0].index;
  const inscriptionValue = inscriptionTx.outs[inscriptionOutputIndex].value;

  console.log(`  Inscription UTXO Value: ${inscriptionValue} sats`);

  // Get seller's address from the partial signature data
  // Extract it from the input's witnessScript or nonWitnessUtxo
  const inscriptionOutput = inscriptionTx.outs[inscriptionOutputIndex];
  const sellerAddress = bitcoin.address.fromOutputScript(
    inscriptionOutput.script,
    pepeNetwork,
  );

  console.log(`  Seller: ${sellerAddress}`);

  // ============================================================================
  // STEP 3: Add ALL outputs (seller didn't commit to any)
  // ============================================================================

  console.log("\n🔧 DEBUGGING OUTPUT CREATION:");
  console.log(`  priceSats (raw): ${priceSats}`);
  console.log(`  priceSats (type): ${typeof priceSats}`);
  console.log(`  priceSats (BigInt): ${BigInt(priceSats)}`);
  console.log(`  inscriptionValue: ${inscriptionValue}`);
  console.log(`  inscriptionValue (type): ${typeof inscriptionValue}`);

  // CRITICAL: Validate priceSats before using it
  if (!priceSats || priceSats < 1000 ) {
    throw new Error(
      `❌ INVALID PRICE: priceSats = ${priceSats} sats. This is below minimum (1000 sats). ` +
        `The listing price in the database is WRONG! Expected a value like 100000000 (1 PEPE), got ${priceSats}.`,
    );
  }

  if (inscriptionValue < 546) {
    throw new Error(
      `❌ INVALID INSCRIPTION VALUE: ${inscriptionValue} sats is below dust threshold (546 sats)`,
    );
  }

  // Output 0: Send NFT to buyer
  console.log(`\n  📤 Creating Output 0: NFT to buyer`);
  console.log(`    Address: ${buyerAddress}`);
  console.log(`    Value: ${inscriptionValue} sats`);

  psbt.addOutput({
    address: buyerAddress,
    value: BigInt(inscriptionValue),
  });

  // Output 1: Payment to seller
  console.log(`\n  📤 Creating Output 1: Payment to seller`);
  console.log(`    Address: ${sellerAddress}`);
  console.log(`    Value: ${priceSats} sats (${priceSats / 1e8} PEPE)`);

  psbt.addOutput({
    address: sellerAddress,
    value: BigInt(priceSats),
  });

  console.log(`\n✅ Outputs created successfully`);
  console.log(`  Output 0: ${psbt.txOutputs[0].value} sats to ${buyerAddress}`);
  console.log(
    `  Output 1: ${psbt.txOutputs[1].value} sats to ${sellerAddress}`,
  );

  // ============================================================================
  // STEP 4: Fetch buyer's UTXOs and calculate requirements
  // ============================================================================
  const utxoRes = await axios.get(`/api/dogepay/utxo/${buyerAddress}`);
  const utxos: UTXO[] = utxoRes.data;

  if (!utxos || utxos.length === 0) {
    throw new Error("No UTXOs available for payment");
  }

  // Calculate what the buyer needs to pay
  const NETWORK_FEE = BigInt(10_000_000); // 0.1 PEPE
  const totalOutputValue = BigInt(inscriptionValue) + BigInt(priceSats);
  const totalRequired = totalOutputValue + NETWORK_FEE;

  console.log("💰 Payment Calculation:");
  console.log(`  NFT Output: ${inscriptionValue} sats`);
  console.log(`  Payment to Seller: ${priceSats} sats`);
  console.log(`  Network Fee: ${NETWORK_FEE} sats`);
  console.log(`  Total Required: ${totalRequired} sats`);

  // ============================================================================
  // STEP 5: Select UTXOs for payment (coin selection)
  // ============================================================================
  let totalInputValue = BigInt(0);
  const selectedUtxos: UTXO[] = [];

  // Sort UTXOs by value (largest first) for efficient selection
  const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);

  for (const utxo of sortedUtxos) {
    selectedUtxos.push(utxo);
    totalInputValue += BigInt(utxo.value);

    // Include buffer for change output if needed
    if (totalInputValue >= totalRequired + BigInt(10_000_000)) {
      break;
    }
  }

  // Check if we have enough funds
  if (totalInputValue < totalRequired) {
    const needed = Number(totalRequired) / 1e8;
    const have = Number(totalInputValue) / 1e8;
    throw new Error(
      `Insufficient balance. Need ${needed} PEPE, but only have ${have} PEPE`,
    );
  }

  console.log(`✅ Selected ${selectedUtxos.length} UTXOs for payment`);

  // ============================================================================
  // STEP 6: Add buyer's payment inputs to PSBT
  // ============================================================================
  for (const utxo of selectedUtxos) {
    const rawTxHex = await fetchRawTransactionHex(utxo.txid);

    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(rawTxHex, "hex"),
    });
  }

  // ============================================================================
  // STEP 7: Calculate and add change output
  // ============================================================================
  // Inscription value was already calculated as inscriptionValue earlier

  const totalAllInputs = totalInputValue + BigInt(inscriptionValue);
  const change = totalAllInputs - totalOutputValue - NETWORK_FEE;

  console.log("🔄 Change Calculation:");
  console.log(`  Total Inputs: ${totalAllInputs} sats`);
  console.log(`  Total Outputs: ${totalOutputValue} sats`);
  console.log(`  Network Fee: ${NETWORK_FEE} sats`);
  console.log(`  Change: ${change} sats`);

  // Only add change output if it's above dust threshold
  const CHANGE_DUST_THRESHOLD = BigInt(10_000_000); // 0.01 PEPE
  if (change > CHANGE_DUST_THRESHOLD) {
    psbt.addOutput({
      address: buyerAddress,
      value: change,
    });
    console.log(`✅ Change output added: ${change} sats`);
  } else {
    console.log(`⚠️ Change too small (${change} sats), added to fee`);
  }

  // ============================================================================
  // STEP 8: Sign buyer's inputs
  // ============================================================================
  // Input 0 is already signed by the seller
  // We sign inputs 1+ (buyer's payment inputs)
  const totalInputs = psbt.data.inputs.length;
  for (let i = 1; i < totalInputs; i++) {
    psbt.signInput(i, keyPair);
  }

  console.log(`✍️ Signed ${totalInputs - 1} buyer inputs`);

  // ============================================================================
  // STEP 9: Finalize and extract transaction
  // ============================================================================
  psbt.finalizeAllInputs();

  const finalTx = psbt.extractTransaction();
  const rawTxHex = finalTx.toHex();

  console.log("\n📡 Final Transaction Details:");
  console.log(`  Transaction size: ${rawTxHex.length / 2} bytes`);
  console.log(`  Total inputs: ${finalTx.ins.length}`);
  console.log(`  Total outputs: ${finalTx.outs.length}`);

  console.log("\n📋 Final Transaction Outputs:");
  finalTx.outs.forEach((out, index) => {
    try {
      const addr = bitcoin.address.fromOutputScript(out.script, pepeNetwork);
      console.log(`  Output ${index}: ${out.value} sats → ${addr}`);
    } catch (e) {
      console.log(`  Output ${index}: ${out.value} sats (non-standard script)`);
    }
  });

  console.log("\n📜 Raw Transaction Hex:");
  console.log(rawTxHex);
  // ============================================================================
  // STEP 10: Broadcast to Pepecoin network
  // ============================================================================
  console.log("\n🚀 Broadcasting transaction to network...");

  const txid = await broadcastRawTransaction(rawTxHex, { allowHighFees: true });

  console.log(`✅ Transaction broadcast successful!`);
  console.log(`📋 TXID: ${txid}`);

  return txid;
}
