import Link from "next/link";

export const metadata = {
  title: "Equity Research — 個股研究報告",
};

export default function EquityResearchPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-page)]">
      <h1 className="text-2xl font-bold">Equity Research</h1>
      <p className="mt-2 text-[var(--text-muted)]">遷移中...</p>
      <Link href="/" className="mt-4 text-[var(--primary)] hover:underline">
        ← Portal
      </Link>
    </div>
  );
}
