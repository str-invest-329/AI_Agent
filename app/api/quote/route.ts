import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "missing ticker" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`,
      { next: { revalidate: 300 } }, // cache 5 min
    );
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (!price) {
      return NextResponse.json({ error: "no price data" }, { status: 404 });
    }
    return NextResponse.json({ ticker, price });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
