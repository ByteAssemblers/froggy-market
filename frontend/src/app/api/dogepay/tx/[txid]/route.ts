import { NextResponse } from 'next/server';
import axios from 'axios';

const DOGEPAY_API = 'https://api2.dogepaywallet.space';

const dogePayClient = axios.create({
  baseURL: DOGEPAY_API,
  timeout: 30000,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ txid: string }> }
) {
  try {
    const { txid } = await params;

    if (!txid) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Try array buffer first (for raw binary data)
    try {
      const response = await dogePayClient.get(`/tx/${txid}/raw`, {
        responseType: 'arraybuffer',
      });

      const buffer = response.data;
      const hex = Buffer.from(buffer).toString('hex');

      if (hex && hex.length > 100) {
        return NextResponse.json({ hex });
      }
    } catch (bufferError) {
      console.log('Buffer method failed, trying JSON...');
    }

    // Fallback to JSON format
    const response = await dogePayClient.get(`/tx/${txid}/raw`);
    const data = response.data;

    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        const rawHex = parsed.rawtx || parsed.hex || parsed.data || '';
        if (!rawHex || rawHex.length < 100) {
          throw new Error('Invalid hex data');
        }
        return NextResponse.json({ hex: rawHex.trim() });
      } catch {
        return NextResponse.json(
          { error: `Invalid raw tx format for ${txid}` },
          { status: 500 }
        );
      }
    }

    const rawHex = data.rawtx || data.hex || data.data || '';
    if (!rawHex || rawHex.length < 100) {
      return NextResponse.json(
        { error: 'Invalid hex data' },
        { status: 500 }
      );
    }

    return NextResponse.json({ hex: rawHex.trim() });
  } catch (error: any) {
    console.error('Error fetching raw transaction:', error.message);
    return NextResponse.json(
      { error: `Failed to fetch raw tx: ${error.message}` },
      { status: error.response?.status || 500 }
    );
  }
}
