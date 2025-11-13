import { NextResponse } from "next/server";
import axios from 'axios';

const BELINDEX_API_BASE = process.env.BELINDEX_API_BASE!;

const belIndexClient = axios.create({
  baseURL: BELINDEX_API_BASE,
  timeout: 30000,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams);

    console.log('[BelIndex Tokens] Fetching with params:', params);

    const response = await belIndexClient.get('tokens', { params });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('[BelIndex Tokens] Error:', error.message);
    return NextResponse.json(
      { error: error.response?.data?.message || "Failed to fetch tokens" },
      { status: error.response?.status || 500 }
    );
  }
}
