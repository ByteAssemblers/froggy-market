"use client";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";
import { pepeNetwork } from "./pepeNetwork";
import axios from 'axios';
import { apiClient } from '../axios';

const ECPair = ECPairFactory(ecc);

export type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

// Helper: Fetch raw transaction (binary-safe)
async function fetchRawTransactionHex(txid: string): Promise<string> {
  try {
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

// Helper: Broadcast transaction
async function broadcastRawTransaction(rawTx: string): Promise<string> {
  try {
    const response = await apiClient.post('/pepecoin/tx', {
      rawHex: rawTx,
      allowHighFees: true,
    });

    const data = response.data;

    if (data.success && data.txid) {
      return data.txid;
    }

    throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
  } catch (error: any) {
    const message = error.response?.data?.details || error.message;
    throw new Error(`Broadcast failed: ${message}`);
  }
}

/**
 * Send an NFT inscription to another address
 *
 * @param inscriptionUtxo - The UTXO containing the inscription
 * @param privateKeyWIF - Sender's private key in WIF format
 * @param senderAddress - Sender's address
 * @param recipientAddress - Recipient's address
 * @returns Transaction ID
 */
export async function sendInscriptionTransaction(
  inscriptionUtxo: UTXO,
  privateKeyWIF: string,
  senderAddress: string,
  recipientAddress: string
): Promise<string> {
  try {
    console.log("📤 Sending NFT Inscription:");
    console.log(`  Inscription UTXO: ${inscriptionUtxo.txid}:${inscriptionUtxo.vout}`);
    console.log(`  Inscription Value: ${inscriptionUtxo.value} sats`);
    console.log(`  From: ${senderAddress}`);
    console.log(`  To: ${recipientAddress}`);

    const keyPair = ECPair.fromWIF(privateKeyWIF, pepeNetwork);

    // Build PSBT
    const psbt = new bitcoin.Psbt({
      network: pepeNetwork,
      maximumFeeRate: 100000, // Allow high fees
    });

    // Fetch the raw transaction for the inscription UTXO
    const inscriptionRawHex = await fetchRawTransactionHex(inscriptionUtxo.txid);

    // Add inscription input
    psbt.addInput({
      hash: inscriptionUtxo.txid,
      index: inscriptionUtxo.vout,
      nonWitnessUtxo: Buffer.from(inscriptionRawHex, "hex"),
    });

    // Fetch payment UTXOs to cover the network fee
    const utxoRes = await axios.get(`/api/dogepay/utxo/${senderAddress}`);
    const utxos: UTXO[] = utxoRes.data;

    if (utxos.length === 0) {
      throw new Error("No UTXOs available for payment");
    }

    // Filter out the inscription UTXO itself
    const paymentUtxos = utxos.filter(
      u => !(u.txid === inscriptionUtxo.txid && u.vout === inscriptionUtxo.vout)
    );

    if (paymentUtxos.length === 0) {
      throw new Error("No payment UTXOs available (only inscription UTXO found)");
    }

    // Select UTXOs for fee payment
    const NETWORK_FEE = BigInt(1_500_000); // 0.015 PEPE for NFT transfer
    let totalPaymentInput = BigInt(0);
    const selectedPaymentUtxos: UTXO[] = [];

    // Sort by value (largest first)
    const sortedUtxos = [...paymentUtxos].sort((a, b) => b.value - a.value);

    for (const utxo of sortedUtxos) {
      selectedPaymentUtxos.push(utxo);
      totalPaymentInput += BigInt(utxo.value);

      if (totalPaymentInput >= NETWORK_FEE + BigInt(1_000_000)) {
        break;
      }
    }

    if (totalPaymentInput < NETWORK_FEE) {
      throw new Error(
        `Insufficient balance for network fee. Need ${NETWORK_FEE} sats, have ${totalPaymentInput} sats`
      );
    }

    // Add payment inputs
    for (const utxo of selectedPaymentUtxos) {
      const rawHex = await fetchRawTransactionHex(utxo.txid);

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(rawHex, "hex"),
      });
    }

    console.log(`💰 Payment inputs: ${selectedPaymentUtxos.length} UTXOs, total: ${totalPaymentInput} sats`);

    // Add outputs

    // Output 0: Send inscription to recipient
    psbt.addOutput({
      address: recipientAddress,
      value: BigInt(inscriptionUtxo.value),
    });

    console.log(`✅ Output 0: Inscription to ${recipientAddress} (${inscriptionUtxo.value} sats)`);

    // Calculate change
    const totalInput = BigInt(inscriptionUtxo.value) + totalPaymentInput;
    const totalOutput = BigInt(inscriptionUtxo.value);
    const change = totalInput - totalOutput - NETWORK_FEE;

    console.log(`🔄 Change calculation:`);
    console.log(`  Total input: ${totalInput} sats`);
    console.log(`  Inscription output: ${inscriptionUtxo.value} sats`);
    console.log(`  Network fee: ${NETWORK_FEE} sats`);
    console.log(`  Change: ${change} sats`);

    // Add change output if above dust threshold
    const DUST_THRESHOLD = BigInt(1_000_000);
    if (change > DUST_THRESHOLD) {
      psbt.addOutput({
        address: senderAddress,
        value: change,
      });
      console.log(`✅ Output 1: Change to ${senderAddress} (${change} sats)`);
    } else {
      console.log(`⚠️ Change too small (${change} sats), added to fee`);
    }

    // Sign all inputs
    const totalInputs = psbt.data.inputs.length;
    for (let i = 0; i < totalInputs; i++) {
      psbt.signInput(i, keyPair);
    }

    console.log(`✍️ Signed ${totalInputs} inputs`);

    // Finalize and extract
    psbt.finalizeAllInputs();

    const finalTx = psbt.extractTransaction();
    const rawTxHex = finalTx.toHex();

    console.log("\n📡 Final Transaction:");
    console.log(`  Size: ${rawTxHex.length / 2} bytes`);
    console.log(`  Inputs: ${finalTx.ins.length}`);
    console.log(`  Outputs: ${finalTx.outs.length}`);

    // Broadcast
    console.log("\n🚀 Broadcasting transaction...");
    const txid = await broadcastRawTransaction(rawTxHex);

    console.log(`✅ Transaction broadcast successful!`);
    console.log(`📋 TXID: ${txid}`);

    return txid;
  } catch (err: any) {
    console.error("❌ Error sending inscription:", err);
    throw new Error(err.message || "Failed to send inscription");
  }
}
