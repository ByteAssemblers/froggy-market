"use client";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";
import { pepeNetwork } from "./pepeNetwork";

const ECPair = ECPairFactory(ecc);

export type UTXO = {
  txid: string;
  vout: number;
  value: number;
};

// --- Helper: Broadcast ---
async function broadcastRawTransaction(rawTx: string): Promise<string> {
  const res = await fetch("https://api2.dogepaywallet.space/tx", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: rawTx,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Broadcast failed (${res.status}): ${text}`);

  try {
    const parsed = JSON.parse(text);
    return parsed.txid || text.trim();
  } catch {
    return text.trim();
  }
}

// --- Helper: Fetch raw transaction (binary-safe) ---
async function fetchRawTransactionHex(txid: string): Promise<string> {
  const url = `https://api2.dogepaywallet.space/tx/${txid}/raw`;
  const res = await fetch(url);

  if (!res.ok) throw new Error(`Failed to fetch raw tx (${res.status}) for ${txid}`);

  // Try array buffer first — Dogepay often returns binary
  const buffer = await res.arrayBuffer();
  const hex = Buffer.from(buffer).toString("hex");

  if (hex && hex.length > 100) return hex;

  // Fallback: try text → JSON
  try {
    const txt = await res.text();
    const parsed = JSON.parse(txt);
    const rawHex = parsed.rawtx || parsed.hex || parsed.data || "";
    if (!rawHex || rawHex.length < 100) throw new Error("Invalid hex data");
    return rawHex.trim();
  } catch {
    throw new Error(`Invalid raw tx format for ${txid}`);
  }
}

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
    const utxoRes = await fetch(`https://api2.dogepaywallet.space/address/${address}/utxo`);
    if (!utxoRes.ok) throw new Error(`UTXO fetch failed (${utxoRes.status})`);
    const utxos: UTXO[] = await utxoRes.json();
    if (utxos.length === 0) throw new Error("No UTXOs to spend.");

    // --- Select inputs ---
    let totalIn = BigInt(0);
    const inputs: UTXO[] = [];
    for (const u of utxos) {
      inputs.push(u);
      totalIn += BigInt(u.value);
      if (totalIn >= amountSats + BigInt(1_000_000)) break;
    }
    if (totalIn < amountSats) throw new Error("Insufficient balance for transaction.");

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
