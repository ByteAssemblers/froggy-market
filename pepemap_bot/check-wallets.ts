import { fetchUtxos } from "./inscribe";

// The 5 wallet addresses
const ADDRESSES = [
  "PfYMNqxRo4yGhmgSYckVAijVsdsKG2MDrY", // Wallet 3
  "PgkSUGrukA9LYZme86aCrijDR2KaRRgae6", // Wallet 4
  "PndwgBLDDWGtNDRccGANVu9nfrwcU2Woa6", // Wallet 5
];

async function checkWallets() {
  console.log("Checking wallet UTXOs...\n");

  for (const address of ADDRESSES) {
    console.log(`Wallet: ${address}`);
    try {
      const utxos = await fetchUtxos(address);
      console.log(`  UTXOs: ${utxos.length}`);

      if (utxos.length > 0) {
        utxos.forEach((utxo, idx) => {
          console.log(`    [${idx + 1}] ${utxo.txid}:${utxo.vout}`);
          console.log(`        Value: ${utxo.value} koinu`);
          console.log(`        Confirmations: ${utxo.confirmations}`);
        });
      } else {
        console.log("    No UTXOs available!");
      }
    } catch (error: any) {
      console.log(`    Error: ${error.message}`);
    }
    console.log();
  }
}

checkWallets();
