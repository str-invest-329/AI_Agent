"use client";

import { useState, useMemo } from "react";
import {
  TOTAL_KEYS, sortPeriods, fmtVal, labelFor,
  type ValMap, type FinData,
} from "./constants";
import { useFinancialData, toAnnualData } from "./useFinancialData";

/* ================================================================
   Row types
   ================================================================ */
type TableRow =
  | { type: "section"; label: string }
  | { type: "data"; key: string; label: string; vals: ValMap };

/* ================================================================
   Row builders for each statement type
   ================================================================ */

function buildIncomeRows(data: FinData): TableRow[] {
  const src = data.income_statement || {};
  return Object.entries(src).map(([key, vals]) => ({
    type: "data" as const,
    key,
    label: labelFor(key),
    vals: vals as ValMap,
  }));
}

function buildBalanceSheetRows(data: FinData): TableRow[] {
  const BS = data.balance_sheet || {};
  const rows: TableRow[] = [];
  for (const [secKey, secLabel] of [
    ["assets", "ASSETS"],
    ["liabilities", "LIABILITIES"],
    ["equity", "EQUITY"],
  ] as const) {
    const sec = BS[secKey];
    if (!sec) continue;
    rows.push({ type: "section", label: secLabel });
    for (const key of Object.keys(sec)) {
      rows.push({ type: "data", key, label: labelFor(key), vals: sec[key] });
    }
  }
  return rows;
}

function buildCashFlowRows(data: FinData): TableRow[] {
  const CF = data.cash_flow_statement || {};
  const rows: TableRow[] = [];
  for (const [secKey, secLabel] of [
    ["operating_activities", "OPERATING ACTIVITIES"],
    ["investing_activities", "INVESTING ACTIVITIES"],
    ["financing_activities", "FINANCING ACTIVITIES"],
  ] as const) {
    const sec = CF[secKey];
    if (!sec) continue;
    rows.push({ type: "section", label: secLabel });
    for (const [key, vals] of Object.entries(sec)) {
      if (typeof vals === "object" && vals !== null && !Array.isArray(vals))
        rows.push({ type: "data", key, label: labelFor(key), vals: vals as ValMap });
    }
  }
  rows.push({ type: "section", label: "SUMMARY" });
  for (const key of ["fx_effect_on_cash", "net_change_in_cash", "beginning_cash", "ending_cash", "free_cash_flow"]) {
    if (CF[key] && typeof CF[key] === "object")
      rows.push({ type: "data", key, label: labelFor(key), vals: CF[key] });
  }
  return rows;
}

const ROW_BUILDERS: Record<string, (data: FinData) => TableRow[]> = {
  income_statement: buildIncomeRows,
  balance_sheet: buildBalanceSheetRows,
  cash_flow_statement: buildCashFlowRows,
};

function getPeriodsKey(statement: string) {
  return statement === "balance_sheet"
    ? "periods_balance_sheet"
    : "periods_income_statement";
}

/* ================================================================
   FinancialTable Component
   ================================================================ */

interface FinancialTableProps {
  ticker: string;
  statement: "income_statement" | "balance_sheet" | "cash_flow_statement";
  metrics?: string[];
  maxPeriods?: number;
  defaultView?: "quarterly" | "annual";
}

export default function FinancialTable({
  ticker,
  statement,
  metrics,
  maxPeriods,
  defaultView = "quarterly",
}: FinancialTableProps) {
  const { data: rawData, loading, error } = useFinancialData(ticker);
  const [viewMode, setViewMode] = useState<"quarterly" | "annual">(defaultView);

  const displayData = useMemo(() => {
    if (!rawData) return null;
    return viewMode === "annual" ? toAnnualData(rawData) : rawData;
  }, [rawData, viewMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-[var(--text-faint)]">
        載入財務數據中...
      </div>
    );
  }

  if (error || !displayData) {
    return (
      <div className="py-6 text-center text-sm text-[var(--text-faint)]">
        {error ? `無法載入 ${ticker} 財務數據：${error}` : "無數據"}
      </div>
    );
  }

  // Build rows
  const builder = ROW_BUILDERS[statement];
  if (!builder) return null;
  let allRows = builder(displayData);

  // Filter to specific metrics if provided
  if (metrics && metrics.length > 0) {
    const metricSet = new Set(metrics);
    allRows = allRows.filter((row) => {
      if (row.type === "section") {
        // Keep section headers only if they have visible data rows after them
        return true;
      }
      return metricSet.has(row.key);
    });
    // Remove orphan section headers (no data rows follow)
    const cleaned: TableRow[] = [];
    for (let i = 0; i < allRows.length; i++) {
      if (allRows[i].type === "section") {
        // Check if any data row follows before next section
        let hasData = false;
        for (let j = i + 1; j < allRows.length; j++) {
          if (allRows[j].type === "section") break;
          if (allRows[j].type === "data") { hasData = true; break; }
        }
        if (hasData) cleaned.push(allRows[i]);
      } else {
        cleaned.push(allRows[i]);
      }
    }
    allRows = cleaned;
  }

  // Get periods and apply maxPeriods limit
  const periodsKey = getPeriodsKey(statement);
  let periods = sortPeriods(displayData.metadata[periodsKey] || []);
  if (maxPeriods && maxPeriods > 0 && periods.length > maxPeriods) {
    periods = periods.slice(-maxPeriods);
  }

  if (!allRows.length) {
    return <div className="py-6 text-center text-sm text-[var(--text-faint)]">無數據</div>;
  }

  return (
    <div>
      {/* View mode toggle */}
      <div className="mb-3 flex justify-end gap-1">
        {(["quarterly", "annual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={`rounded border px-2.5 py-1 text-xs font-semibold transition-all select-none ${
              viewMode === m
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:border-[var(--primary)]"
            }`}
          >
            {m === "quarterly" ? "季度" : "年度"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md shadow-sm">
        <table className="w-full border-collapse bg-[var(--bg-card)] text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-[11] min-w-[180px] border border-[var(--border)] bg-[#1f4e79] px-3 py-1.5 text-left font-semibold text-white">
                Metric
              </th>
              {periods.map((p) => {
                const end = displayData.filings?.[p]?.period_end ?? "";
                return (
                  <th key={p} className="border border-[var(--border)] bg-[#1f4e79] px-3 py-1.5 text-center font-semibold text-white whitespace-nowrap">
                    {p}
                    {end && <span className="block text-[10px] font-normal text-white/70">{end}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => {
              if (row.type === "section") {
                return (
                  <tr key={`sec-${i}`}>
                    <td
                      colSpan={periods.length + 1}
                      className="border border-[var(--border)] bg-[#d6e4f0] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1f4e79]"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }
              const isTotal = TOTAL_KEYS.has(row.key);
              const bgBase = isTotal
                ? "bg-[var(--bg-highlight)]"
                : i % 2 === 0
                  ? "bg-[var(--bg-subtle)]"
                  : "bg-[var(--bg-card)]";
              const textCls = isTotal ? "font-bold text-[#7b3f00]" : "";
              return (
                <tr key={row.key + i}>
                  <td className={`sticky left-0 z-[5] border border-[var(--border)] px-3 py-1.5 text-left font-medium whitespace-nowrap ${bgBase} ${textCls}`}>
                    {row.label}
                  </td>
                  {periods.map((p) => {
                    const v = row.vals?.[p];
                    const f = fmtVal(v, row.key);
                    return (
                      <td
                        key={p}
                        className={`border border-[var(--border)] px-3 py-1.5 tabular-nums ${bgBase} ${textCls} ${
                          f.cls === "negative"
                            ? "text-right text-[#c0392b]"
                            : f.cls === "null-val"
                              ? "text-center text-[#7f8c8d]"
                              : "text-right"
                        }`}
                      >
                        {f.text}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
