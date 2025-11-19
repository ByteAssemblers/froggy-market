import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_API_BASE = process.env.BACKEND_API_BASE || 'http://localhost:5555/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blockNumber: string }> }
) {
  try {
    const { blockNumber } = await params;

    // Parse and validate block number
    const blockNum = parseInt(blockNumber.replace('.png', ''), 10);
    if (!Number.isFinite(blockNum) || blockNum < 0) {
      return NextResponse.json(
        { error: 'Invalid block number' },
        { status: 400 }
      );
    }

    // Call NestJS backend to generate/fetch pepemap image
    const backendUrl = `${BACKEND_API_BASE}/pepemap/${blockNum}`;
    const response = await axios.get(backendUrl, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 seconds for generation
    });

    // Return the image with proper headers
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    // Only log non-500 errors to avoid console spam
    if (error.response?.status !== 500) {
      console.error('Pepemap API Error:', error.message);
    }

    // Handle specific error codes
    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Block not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch pepemap image',
        details: error.message,
      },
      { status: error.response?.status || 500 }
    );
  }
}
