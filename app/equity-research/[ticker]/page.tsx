import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readFileSync, readdirSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { Suspense } from "react";
import Report from "./report";

const DATA_DIR = join(process.cwd(), "public/data/equity-research");

function getTickers() {
  try {
    return readdirSync(DATA_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  } catch {
    return [];
  }
}

export function generateStaticParams() {
  return getTickers().map((ticker) => ({ ticker }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker} — 個股研究` };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const filePath = join(DATA_DIR, `${ticker}.json`);
  let data;
  try {
    data = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    notFound();
  }

  // Auto-derive "updated" from last git commit date of the JSON file
  try {
    const gitDate = execSync(
      `git log -1 --format=%ci -- "${filePath}"`,
      { encoding: "utf8" },
    ).trim();
    if (gitDate) {
      data.updated = gitDate.slice(0, 10); // "YYYY-MM-DD"
    }
  } catch {
    // fallback: keep the manual date in JSON
  }

  return (
    <Suspense>
      <Report data={data} />
    </Suspense>
  );
}
