"use client";

export async function sendPepecoin(
  fromAddress: string,
  toAddress: string,
  amount: number,
  privateKeyWIF: string
) {
  const res = await fetch("/api/sendPepe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromAddress, toAddress, amount, privateKeyWIF }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Transaction failed");
  }

  return data.txid as string;
}
