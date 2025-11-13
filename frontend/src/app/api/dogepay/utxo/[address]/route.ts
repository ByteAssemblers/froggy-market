import { NextResponse } from 'next/server';
import axios from 'axios';

const DOGEPAY_API = 'https://api2.dogepaywallet.space';

const dogePayClient = axios.create({
  baseURL: DOGEPAY_API,
  timeout: 30000,
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const response = await dogePayClient.get(`/address/${address}/utxo`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching UTXOs:', error.message);
    return NextResponse.json(
      { error: error.response?.data?.message || 'Failed to fetch UTXOs' },
      { status: error.response?.status || 500 }
    );
  }
}
