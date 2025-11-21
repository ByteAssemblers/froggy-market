import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

const BELINDEX_API_BASE = (
  process.env.NEXT_PUBLIC_BELINDEX_API_BASE || "http://172.16.11.131:8000"
).replace(/\/$/, "");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string; tick: string }> },
) {
  try {
    const { address } = await params;
    const { tick } = await params;

    const response = await axios.get(
      `${BELINDEX_API_BASE}/address/${address}/${tick}/balance`,
      {
        timeout: 30000,
      },
    );

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error("BelIndex API Error:", error.message);

    return NextResponse.json(
      {
        error: "Failed to fetch PRC-20 balance",
        details: error.message,
      },
      { status: error.response?.status || 500 },
    );
  }
}
