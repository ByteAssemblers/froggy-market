import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { fromAddress, toAddress, amount, privateKeyWIF } = await req.json();

    const RPC_URL = process.env.PEPECOIN_RPC_URL!;
    const RPC_USER = process.env.PEPECOIN_RPC_USER!;
    const RPC_PASSWORD = process.env.PEPECOIN_RPC_PASSWORD!;

    async function rpcCall<T>(method: string, params: any[] = []): Promise<T> {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + btoa(`${RPC_USER}:${RPC_PASSWORD}`),
        },
        body: JSON.stringify({
          jsonrpc: "1.0",
          id: "pepewallet",
          method,
          params,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`RPC HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.result;
    }

    // 1️⃣ List unspent
    const utxos = await rpcCall<any[]>("listunspent", [1, 9999999, [fromAddress]]);
    if (!utxos || utxos.length === 0) throw new Error("No UTXOs found");

    // 2️⃣ Build transaction
    const inputs = utxos.map((u) => ({ txid: u.txid, vout: u.vout }));
    const sendAmount = Number(amount);
    const totalInput = utxos.reduce((sum, u) => sum + u.amount, 0);
    const fee = 0.01;
    const change = totalInput - sendAmount - fee;
    if (change < 0) throw new Error("Insufficient funds");

    const outputs: Record<string, number> = {};
    outputs[toAddress] = sendAmount;
    if (change > 0) outputs[fromAddress] = change;

    const rawTx = await rpcCall<string>("createrawtransaction", [inputs, outputs]);
    const signed = await rpcCall<{ hex: string; complete: boolean }>(
      "signrawtransactionwithkey",
      [rawTx, [privateKeyWIF]],
    );

    if (!signed.complete) throw new Error("Transaction not fully signed");

    const txid = await rpcCall<string>("sendrawtransaction", [signed.hex]);

    return NextResponse.json({ success: true, txid });
  } catch (err: any) {
    console.error("Send PEPE error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
