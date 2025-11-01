import { proxyBelIndexerRequest } from "../utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await proxyBelIndexerRequest("/events", "POST", body, {
      headers: { "Content-Type": "application/json" },
    });
    return NextResponse.json(response.data, { status: response.status });
  } catch (error: any) {
    console.error("bel indexer events subscription failed:", error.message);
    return NextResponse.json(
      { error: "bel indexer events subscription failed" },
      { status: 500 },
    );
  }
}
