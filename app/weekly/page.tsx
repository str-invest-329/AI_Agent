import Link from "next/link";

export const metadata = {
  title: "Stock Weekly — 個股週報",
};

export default function WeeklyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-page)]">
      <h1 className="text-2xl font-bold">Stock Weekly</h1>
      <p className="mt-2 text-[var(--text-muted)]">遷移中...</p>
      <Link href="/" className="mt-4 text-[var(--primary)] hover:underline">
        ← Portal
      </Link>
    </div>
  );
}
