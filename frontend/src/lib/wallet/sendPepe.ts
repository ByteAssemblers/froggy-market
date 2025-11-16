"use client";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";
import { pepeNetwork } from "./pepeNetwork";
import axios from 'axios';
import { blockchainClient } from '../axios';

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
 * Get all inscription UTXOs for an address to avoid spending them
 */
async function getInscriptionUTXOs(address: string): Promise<Set<string>> {
  try {
    const inscriptionUTXOs = new Set<string>();
    let page = 1;
    let continueFetching = true;

    // Fetch all inscriptions for this address (paginated)
    while (continueFetching) {
      const response = await blockchainClient.get(
        `/inscriptions/balance/${address}/${page}`
      );

      const inscriptions = response.data?.inscriptions || [];

      if (inscriptions && inscriptions.length > 0) {
        for (const inscription of inscriptions) {
          // Each inscription has an inscription_id
          // We need to fetch the location for each inscription
          if (inscription.inscription_id) {
            try {
              const detailResponse = await blockchainClient.get(
                `/inscription/${inscription.inscription_id}`
              );

              // Extract location from the HTML response
              const location = extractLocationFromHtml(detailResponse.data);
              if (location) {
                const [txid, vout] = location.split(':');
                if (txid && vout !== undefined) {
                  inscriptionUTXOs.add(`${txid}:${vout}`);
                  console.log(`📍 Inscription ${inscription.inscription_id} at ${txid}:${vout}`);
                }
              }
            } catch (err) {
              console.warn(`Failed to fetch location for inscription ${inscription.inscription_id}:`, err);
            }
          }
        }
        page++;
      } else {
        continueFetching = false;
      }
    }

    return inscriptionUTXOs;
  } catch (error) {
    console.warn('Failed to fetch inscriptions, assuming no inscriptions:', error);
    return new Set();
  }
}

/**
 * Extract location (txid:vout) from HTML response
 */
function extractLocationFromHtml(htmlString: string): string | null {
  // Create a DOMParser instance to parse the HTML string
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // Find all <dt> elements and search for the "location" one
  const dtElements = doc.querySelectorAll('dt');
  for (let dt of dtElements) {
    if (dt.textContent?.trim() === 'location') {
      // Get the next sibling <dd> element
      const dd = dt.nextElementSibling as HTMLElement;
      if (dd && dd.classList.contains('monospace')) {
        return dd.textContent?.trim() || null;
      }
    }
  }
  return null;
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
    const utxoRes = await axios.get(`/api/dogepay/utxo/${address}`);
    const utxos: UTXO[] = utxoRes.data;
    if (utxos.length === 0) throw new Error("No UTXOs to spend.");

    // --- Fetch inscription UTXOs to avoid spending them ---
    console.log('🔍 Checking for inscription UTXOs to exclude...');
    const inscriptionUTXOs = await getInscriptionUTXOs(address!);
    console.log(`📌 Found ${inscriptionUTXOs.size} inscription UTXOs to protect`);

    // --- Filter out inscription UTXOs ---
    const safeUTXOs = utxos.filter(u => {
      const utxoKey = `${u.txid}:${u.vout}`;
      const isInscription = inscriptionUTXOs.has(utxoKey);
      if (isInscription) {
        console.log(`🚫 Skipping inscription UTXO: ${utxoKey}`);
      }
      return !isInscription;
    });

    if (safeUTXOs.length === 0) {
      throw new Error("No spendable UTXOs available (all UTXOs contain inscriptions)");
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
