"use client";

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
    const res = await fetch(
      `https://api2.dogepaywallet.space/address/${address}/utxo`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch UTXOs (${res.status})`);
    }

    const utxos: UTXO[] = await res.json();

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
