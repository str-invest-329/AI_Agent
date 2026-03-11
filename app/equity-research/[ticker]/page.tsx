import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Report from "./report";

const TICKER_META: Record<string, { title: string; name: string; updated: string }> = {
  SNDK: { title: "SNDK 個股研究", name: "Sandisk Corp", updated: "2026-03-10" },
};

export function generateStaticParams() {
  return Object.keys(TICKER_META).map((ticker) => ({ ticker }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const meta = TICKER_META[ticker.toUpperCase()];
  return { title: meta?.title ?? `${ticker} — Equity Research` };
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const key = ticker.toUpperCase();
  if (!TICKER_META[key]) notFound();
  const meta = TICKER_META[key];
  return <Report ticker={key} name={meta.name} updated={meta.updated} />;
}
