"use client";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";
import { pepeNetwork } from "./pepeNetwork";
import axios from 'axios';

const ECPair = ECPairFactory(ecc);

export type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

// --- Helper: Broadcast ---
async function broadcastRawTransaction(rawTx: string): Promise<string> {
  try {
    // Use Next.js API route proxy to avoid CORS issues
    const response = await axios.post('/api/dogepay/tx', rawTx, {
      headers: { 'Content-Type': 'text/plain' },
    });

    const data = response.data;
    return data.txid || data;
  } catch (error: any) {
    const message = error.response?.data?.error || error.message;
    throw new Error(`Broadcast failed: ${message}`);
  }
}

// --- Helper: Fetch raw transaction (binary-safe) ---
async function fetchRawTransactionHex(txid: string): Promise<string> {
  try {
    // Use Next.js API route proxy to avoid CORS issues
    const response = await axios.get(`/api/dogepay/tx/${txid}`);
    const data = response.data;

    const rawHex = data.hex || "";
    if (!rawHex || rawHex.length < 100) {
      throw new Error("Invalid hex data");
    }
    return rawHex.trim();
  } catch (error: any) {
    throw new Error(`Failed to fetch raw tx for ${txid}: ${error.message}`);
  }
}

/**
 * Inscription UTXOs always have exactly 0.01 PEPE (1,000,000 sats)
 * Skip these to avoid accidentally spending inscriptions
 */
const INSCRIPTION_VALUE = 100_000; // 0.001 PEPE in sats

export async function sendPepeTransaction(
  privateKeyWIF: string,
  recipient: string,
  amountPepe: number
): Promise<string> {
  try {
    const amountSats = BigInt(Math.round(amountPepe * 1e8));
    const keyPair = ECPair.fromWIF(privateKeyWIF, pepeNetwork);

    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: pepeNetwork,
    });

    // --- Fetch UTXOs ---
    const utxoRes = await axios.get(`/api/dogepay/utxo/${address}`);
    const utxos: UTXO[] = utxoRes.data;
    if (utxos.length === 0) throw new Error("No UTXOs to spend.");

    // --- Filter out inscription UTXOs (they always have exactly 0.01 PEPE) ---
    console.log('🔍 Filtering out inscription UTXOs (value = 0.01 PEPE)...');
    const safeUTXOs = utxos.filter(u => {
      const isInscription = u.value === INSCRIPTION_VALUE;
      if (isInscription) {
        console.log(`🚫 Skipping inscription UTXO: ${u.txid}:${u.vout} (${u.value} sats)`);
      }
      return !isInscription;
    });

    if (safeUTXOs.length === 0) {
      throw new Error("No spendable UTXOs available (all UTXOs are inscriptions with 0.01 PEPE)");
    }

    console.log(`✅ Found ${safeUTXOs.length} safe UTXOs for spending`);

    // --- Select inputs ---
    let totalIn = BigInt(0);
    const inputs: UTXO[] = [];
    for (const u of safeUTXOs) {
      inputs.push(u);
      totalIn += BigInt(u.value);
      if (totalIn >= amountSats + BigInt(1_000_000)) break;
    }
    if (totalIn < amountSats) throw new Error("Insufficient balance for transaction (excluding inscription UTXOs).");

    // --- Build PSBT ---
    const psbt = new bitcoin.Psbt({ network: pepeNetwork });

    for (const input of inputs) {
      const rawHex = await fetchRawTransactionHex(input.txid);

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        nonWitnessUtxo: Buffer.from(rawHex, "hex"),
      });
    }

    // --- Add outputs ---
    psbt.addOutput({
      address: recipient,
      value: amountSats,
    });

    const fee = BigInt(1_000_000); // 0.01 PEPE fee
    const change = totalIn - amountSats - fee;

    if (change > BigInt(0)) {
      psbt.addOutput({
        address: address!,
        value: change,
      });
    }

    // --- Sign & finalize ---
    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const rawTx = psbt.extractTransaction().toHex();

    // --- Broadcast ---
    const txid = await broadcastRawTransaction(rawTx);

    return txid;
  } catch (err: any) {
    console.error("Error sending transaction:", err);
    throw new Error(err.message || "Transaction failed");
  }
}
