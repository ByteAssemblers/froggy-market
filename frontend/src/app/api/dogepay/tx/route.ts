import { NextResponse } from 'next/server';
import axios from 'axios';

const DOGEPAY_API = 'https://api2.dogepaywallet.space';

const dogePayClient = axios.create({
  baseURL: DOGEPAY_API,
  timeout: 30000,
});

export async function POST(request: Request) {
  try {
    const rawTx = await request.text();

    if (!rawTx) {
      return NextResponse.json(
        { error: 'Transaction data is required' },
        { status: 400 }
      );
    }

    const response = await dogePayClient.post('/tx', rawTx, {
      headers: { 'Content-Type': 'text/plain' },
    });

    const data = response.data;

    // Handle different response formats
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return NextResponse.json({ txid: parsed.txid || data.trim() });
      } catch {
        return NextResponse.json({ txid: data.trim() });
      }
    }

    return NextResponse.json({ txid: data.txid || JSON.stringify(data) });
  } catch (error: any) {
    console.error('Error broadcasting transaction:', error.message);
    const message = error.response?.data || error.message;
    return NextResponse.json(
      { error: `Broadcast failed: ${message}` },
      { status: error.response?.status || 500 }
    );
  }
}
