import { NextResponse } from 'next/server';

const BELINDEX_API_BASE = process.env.BELINDEX_API_BASE!;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tick = url.searchParams.get('tick');

  if (!tick) {
    return NextResponse.json({ error: 'Tick parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${BELINDEX_API_BASE}token?tick=${tick}`);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch token data' }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
