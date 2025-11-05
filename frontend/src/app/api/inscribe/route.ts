import { NextResponse } from "next/server";
import { broadcastPepecoinTransaction } from "./pepecoinService";

function parseAllowHighFees(value: string | undefined): boolean {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const trimmedRaw = raw.trim();

    if (!trimmedRaw) {
      return NextResponse.json(
        { error: "pepecoin broadcast failed", details: "empty payload" },
        { status: 400 },
      );
    }

    const query: any = new URL(req.url).searchParams;
    const allowHighFees = parseAllowHighFees(query.get("allowHighFees"));

    const result = await broadcastPepecoinTransaction(trimmedRaw, {
      allowHighFees,
    });
    const txid = typeof result === "string" ? result.trim() : null;

    if (!txid || txid.length !== 64) {
      return NextResponse.json({ txid: null, result });
    }

    return NextResponse.json({ txid, result });
  } catch (error: any) {
    const status = error.code === -26 ? 400 : 500;
    return NextResponse.json(
      {
        error: "pepecoin broadcast failed",
        details: error.message,
        code: error.code,
        rpcResponse: error.rpcResponse || null,
      },
      { status },
    );
  }
}
