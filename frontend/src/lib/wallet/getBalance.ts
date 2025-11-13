"use client";

import axios from 'axios';

export type UTXO = {
  txid: string;
  vout: number;
  value: number; // in satoshis
  address: string;
  scriptPubKey: string;
  confirmations: number;
};

export async function getPepecoinBalance(address: string): Promise<number> {
  try {
    // Use Next.js API route proxy to avoid CORS issues
    const response = await axios.get(`/api/dogepay/utxo/${address}`, {
      // Disable caching for balance queries
      headers: { 'Cache-Control': 'no-cache' }
    });

    const utxos: UTXO[] = response.data;

    // Sum all unspent outputs (value is in satoshis)
    const totalSats = utxos.reduce((sum, utxo) => sum + utxo.value, 0);

    // Pepecoin (like Dogecoin) uses 8 decimals
    const totalPEPE = totalSats / 1e8;

    return totalPEPE;
  } catch (err) {
    console.error("Error fetching balance:", err);
    return 0;
  }
}
