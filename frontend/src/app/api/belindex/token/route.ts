import { NextResponse } from 'next/server';
import axios from 'axios';

const BELINDEX_API_BASE = process.env.BELINDEX_API_BASE!;

const belIndexClient = axios.create({
  baseURL: BELINDEX_API_BASE,
  timeout: 30000,
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tick = url.searchParams.get('tick');

  if (!tick) {
    return NextResponse.json({ error: 'Tick parameter is required' }, { status: 400 });
  }

  try {
    const response = await belIndexClient.get('token', {
      params: { tick }
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.response?.data?.message || 'Internal Server Error' },
      { status: error.response?.status || 500 }
    );
  }
}
