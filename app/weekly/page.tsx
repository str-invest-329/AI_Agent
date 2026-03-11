import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "fs";
import { join } from "path";

export const metadata: Metadata = {
  title: "Stock Weekly — 個股週報",
};

interface ManifestItem {
  id: string;
  ticker: string;
  company: string;
  week: string;
  date: string;
  market: string;
}

export default function WeeklyPage() {
  let reports: ManifestItem[] = [];
  try {
    const raw = readFileSync(
      join(process.cwd(), "public/data/weekly/manifest.json"),
      "utf8",
    );
    reports = JSON.parse(raw);
  } catch {
    /* empty */
  }

  // Group by ticker
  const byTicker: Record<string, ManifestItem[]> = {};
  for (const r of reports) {
    if (!byTicker[r.ticker]) byTicker[r.ticker] = [];
    byTicker[r.ticker].push(r);
  }

  return (
    <div className="mx-auto max-w-[720px] px-6 py-12 pb-16">
      <Link
        href="/"
        className="mb-3 inline-block text-sm font-semibold text-[var(--primary)] opacity-70 transition-opacity hover:opacity-100"
      >
        ← Portal
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-wide">
          <span className="text-[var(--primary)]">Stock</span> Weekly
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">個股週報</p>
      </header>

      {Object.entries(byTicker).map(([ticker, items]) => (
        <div key={ticker} className="mb-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {ticker} — {items[0].company}
          </div>
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {items.map((r) => (
              <Link
                key={r.id}
                href={`/weekly/${r.id}`}
                className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm transition-all hover:border-[var(--primary)] hover:shadow-md"
              >
                <div className="text-lg font-bold text-[var(--primary)]">
                  {r.week}
                </div>
                <div className="mt-0.5 text-xs text-[#6B5E60]">{r.date}</div>
                <div className="mt-2">
                  <span className="rounded bg-[#F0EAEA] px-2 py-0.5 text-[0.68rem] text-[var(--text-muted)]">
                    {r.market.toUpperCase()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {reports.length === 0 && (
        <p className="py-8 text-center text-sm italic text-[var(--text-faint)]">
          尚無週報
        </p>
      )}

      <footer className="border-t border-[var(--border)] pt-4 text-xs text-[var(--text-faint)]">
        Stock Weekly Portal
      </footer>
    </div>
  );
}
