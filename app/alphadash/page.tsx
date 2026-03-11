import Link from "next/link";

export const metadata = {
  title: "AlphaDash — 財務系統儀表板",
};

export default function AlphaDashPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-page)]">
      <h1 className="text-2xl font-bold">AlphaDash</h1>
      <p className="mt-2 text-[var(--text-muted)]">遷移中...</p>
      <Link href="/" className="mt-4 text-[var(--primary)] hover:underline">
        ← Portal
      </Link>
    </div>
  );
}
