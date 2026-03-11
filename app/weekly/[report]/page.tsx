import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { Suspense } from "react";
import Dashboard from "./dashboard";

const DATA_DIR = join(process.cwd(), "public/data/weekly");

function getReportIds() {
  try {
    return readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json") && f !== "manifest.json")
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

export function generateStaticParams() {
  return getReportIds().map((report) => ({ report }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ report: string }>;
}): Promise<Metadata> {
  const { report } = await params;
  return { title: `${report} — 個股週報` };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ report: string }>;
}) {
  const { report } = await params;
  const filePath = join(DATA_DIR, `${report}.json`);
  let data;
  try {
    data = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    notFound();
  }
  return (
    <Suspense>
      <Dashboard data={data} />
    </Suspense>
  );
}
