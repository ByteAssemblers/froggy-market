import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tick = url.searchParams.get("tick");
  const page = url.searchParams.get("page");

  if (!tick) {
    return NextResponse.json(
      { error: "Tick parameter is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(
      `http://localhost:8000/holders?tick=${tick}&page=${page}`,
    );
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch token data" },
        { status: 500 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
