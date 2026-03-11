"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);

/* ================================================================
   Constants & Helpers
   ================================================================ */

const LABEL_MAP: Record<string, string> = {
  revenue: "Revenue",
  cost_of_goods_sold: "Cost of Goods Sold",
  cost_of_goods_and_services_sold: "Cost of Goods Sold",
  gross_profit: "Gross Profit",
  gross_margin: "Gross Margin",
  gross_margin_pct: "  Gross Margin %",
  research_and_development: "R&D Expense",
  selling_general_administrative: "SG&A Expense",
  selling_general_and_administrative: "SG&A Expense",
  restructuring_charges: "Restructuring Charges",
  advanced_technology_costs: "Advanced Technology Costs",
  equity_related_compensation: "Equity-related Compensation",
  amortization_of_intangible_assets: "Amortization of Intangibles",
  other_operating_income_expense_net: "Other Operating Income/Exp",
  operating_income: "Operating Income (Loss)",
  operating_margin_pct: "  Operating Margin %",
  interest_expense: "Interest Expense",
  interest_income: "Interest Income",
  interest_income_net: "Interest Income (net)",
  investment_income: "Investment Income",
  other_nonoperating_income_expense: "Other Non-op Income/Exp",
  nonoperating_income_expense_total: "Non-op Income/Exp Total",
  income_before_taxes: "Income Before Taxes",
  income_tax_expense: "Income Tax Expense",
  income_tax_provision: "Income Tax Provision",
  effective_tax_rate: "  Effective Tax Rate",
  equity_method_investments: "Equity Method Investments",
  equity_in_net_income_of_investees: "Equity in Investees",
  net_income: "Net Income (Loss)",
  net_margin_pct: "  Net Margin %",
  eps_basic: "EPS — Basic",
  eps_diluted: "EPS — Diluted",
  shares_basic_millions: "Shares Basic (M)",
  shares_diluted_millions: "Shares Diluted (M)",
  cash_and_cash_equivalents: "Cash & Cash Equivalents",
  short_term_investments: "Short-term Investments",
  accounts_receivable: "Accounts Receivable",
  receivables: "Receivables",
  inventories: "Inventories",
  other_current_assets: "Other Current Assets",
  total_current_assets: "Total Current Assets",
  property_plant_equipment_net: "PP&E (net)",
  operating_lease_rou_asset: "Operating Lease ROU",
  operating_lease_right_of_use: "Operating Lease ROU",
  long_term_marketable_investments: "LT Marketable Investments",
  goodwill: "Goodwill",
  intangible_assets: "Intangible Assets",
  deferred_tax_assets: "Deferred Tax Assets",
  deferred_tax_assets_net: "Deferred Tax Assets (net)",
  other_noncurrent_assets: "Other Noncurrent Assets",
  total_assets: "Total Assets",
  accounts_payable_and_accrued_expenses: "AP & Accrued Expenses",
  accrued_liabilities_current: "Accrued Liabilities",
  employee_related_liabilities_current: "Employee Liabilities",
  current_debt: "Current Debt",
  operating_lease_liability_current: "Operating Lease (Current)",
  other_current_liabilities: "Other Current Liabilities",
  total_current_liabilities: "Total Current Liabilities",
  long_term_debt: "Long-term Debt",
  long_term_debt_noncurrent: "Long-term Debt",
  noncurrent_operating_lease_liabilities: "Operating Lease (NC)",
  operating_lease_liability_noncurrent: "Operating Lease (NC)",
  noncurrent_unearned_gov_incentives: "Unearned Gov Incentives",
  other_noncurrent_liabilities: "Other Noncurrent Liabilities",
  total_liabilities: "Total Liabilities",
  common_stock: "Common Stock",
  additional_capital: "Additional Paid-in Capital",
  additional_paid_in_capital: "Additional Paid-in Capital",
  retained_earnings: "Retained Earnings (Deficit)",
  retained_earnings_accumulated_deficit: "Retained Earnings (Deficit)",
  treasury_stock: "Treasury Stock",
  aoci: "AOCI",
  accumulated_other_comprehensive_income_loss: "AOCI",
  total_equity: "Total Equity",
  total_liabilities_and_equity: "Total Liabilities & Equity",
  net_cash_from_operating: "Net Cash from Operating",
  net_cash_from_operating_activities: "Net Cash from Operating",
  depreciation_and_amortization: "Depreciation & Amortization",
  share_based_compensation: "Share-based Compensation",
  stock_based_compensation: "Share-based Compensation",
  deferred_income_tax: "Deferred Income Tax",
  goodwill_impairment: "Goodwill Impairment",
  other_asset_impairment: "Other Asset Impairment",
  gain_loss_on_sale_of_business: "Gain/Loss on Sale of Business",
  change_in_receivables: "Change in Receivables",
  change_in_inventories: "Change in Inventories",
  change_in_accounts_payable: "Change in AP",
  change_in_accounts_payable_accrued: "Change in AP & Accrued",
  change_in_accrued_liabilities: "Change in Accrued Liabilities",
  change_in_employee_liabilities: "Change in Employee Liabilities",
  change_in_other_current_liabilities: "Change in Other CL",
  change_in_other_noncurrent_liabilities: "Change in Other NCL",
  other_operating: "Other Operating",
  other: "Other",
  capital_expenditures: "Capital Expenditures",
  proceeds_from_sale_of_business: "Proceeds from Sale of Business",
  proceeds_from_sale_of_ppe: "Proceeds from Sale of PP&E",
  purchases_of_afs_securities: "Purchases of AFS Securities",
  proceeds_from_government_incentives: "Gov Incentive Proceeds",
  proceeds_from_maturities_sales_of_afs: "Proceeds from AFS",
  net_cash_from_investing: "Net Cash from Investing",
  net_cash_used_for_investing_activities: "Net Cash from Investing",
  proceeds_from_debt: "Proceeds from Debt",
  repayments_of_debt: "Repayments of Debt",
  repayments_stock_withholdings: "Stock Withholdings",
  repurchases_stock_program: "Stock Repurchases",
  proceeds_from_equity: "Proceeds from Equity",
  tax_withholding_payments: "Tax Withholding Payments",
  dividends_paid: "Dividends Paid",
  net_cash_from_financing: "Net Cash from Financing",
  net_cash_used_for_financing_activities: "Net Cash from Financing",
  net_cash_from_financing_activities: "Net Cash from Financing",
  fx_effect_on_cash: "FX Effect on Cash",
  net_change_in_cash: "Net Change in Cash",
  beginning_cash: "Beginning Cash",
  ending_cash: "Ending Cash",
  free_cash_flow: "Free Cash Flow",
  current_ratio: "Current Ratio",
  quick_ratio: "Quick Ratio",
  debt_to_equity: "Debt-to-Equity",
  net_debt_to_equity: "Net Debt-to-Equity",
  equity_ratio: "Equity Ratio",
  roe: "ROE",
  roa: "ROA",
  asset_turnover: "Asset Turnover",
  interest_coverage: "Interest Coverage",
  fcf_margin_pct: "FCF Margin %",
};

const TOTAL_KEYS = new Set([
  "revenue", "gross_profit", "gross_margin", "operating_income",
  "income_before_taxes", "net_income", "total_current_assets", "total_assets",
  "total_current_liabilities", "total_liabilities", "total_equity",
  "total_liabilities_and_equity", "net_cash_from_operating",
  "net_cash_from_operating_activities", "net_cash_from_investing",
  "net_cash_used_for_investing_activities", "net_cash_from_financing",
  "net_cash_used_for_financing_activities", "net_cash_from_financing_activities",
  "free_cash_flow", "ending_cash", "current_ratio", "eps_diluted",
]);

const RATIO_ORDER = [
  "gross_margin_pct", "operating_margin_pct", "net_margin_pct",
  "roe", "roa", "asset_turnover", "interest_coverage", "fcf_margin_pct",
  "current_ratio", "quick_ratio", "debt_to_equity", "net_debt_to_equity",
  "equity_ratio",
];

const RATIO_DEFINITIONS: Record<string, string> = {
  current_ratio: "Current Assets ÷ Current Liabilities — measures short-term liquidity",
  quick_ratio: "(Current Assets − Inventory) ÷ Current Liabilities — liquidity excluding inventory",
  debt_to_equity: "Total Liabilities ÷ Total Equity — overall leverage",
  net_debt_to_equity: "(Total Debt − Cash) ÷ Total Equity — net leverage",
  equity_ratio: "Total Equity ÷ Total Assets — proportion funded by shareholders",
  gross_margin_pct: "Gross Profit ÷ Revenue — profitability after direct costs",
  operating_margin_pct: "Operating Income ÷ Revenue — profitability after all opex",
  net_margin_pct: "Net Income ÷ Revenue — bottom-line profitability",
  roe: "Net Income ÷ Total Equity — return on shareholders' equity (quarterly, not annualized)",
  roa: "Net Income ÷ Total Assets — return on total assets (quarterly, not annualized)",
  asset_turnover: "Revenue ÷ Total Assets — asset efficiency (quarterly, not annualized)",
  interest_coverage: "Operating Income ÷ Interest Expense — ability to service debt",
  fcf_margin_pct: "Free Cash Flow ÷ Revenue — cash generation efficiency",
};

const CHART_COLORS = [
  "#1f4e79", "#c0392b", "#27ae60", "#8e44ad", "#e67e22",
  "#2980b9", "#d35400", "#16a085", "#7f8c8d", "#f39c12",
  "#6c3483", "#1abc9c", "#e74c3c",
];

/* eslint-disable @typescript-eslint/no-explicit-any */
type ValMap = Record<string, number | null>;
type FinData = any;

const PERIOD_ORDER_WEIGHT = (p: string) => {
  const m = p.match(/Q(\d+)_FY(\d+)/);
  if (m) return parseInt(m[2]) * 10 + parseInt(m[1]);
  const fy = p.match(/^FY(\d+)$/);
  if (fy) return parseInt(fy[1]) * 10 + 5;
  if (p.includes("START")) return -1;
  return 0;
};

const sortPeriods = (periods: string[]) =>
  [...periods].sort((a, b) => PERIOD_ORDER_WEIGHT(a) - PERIOD_ORDER_WEIGHT(b));

const isPct = (key: string) =>
  key.includes("pct") || key.includes("rate") || key === "equity_ratio" || key === "roe" || key === "roa" || key === "asset_turnover";
const isEps = (key: string) => key.startsWith("eps");

function fmtVal(val: number | null | undefined, key: string) {
  if (val === null || val === undefined) return { text: "—", cls: "null-val" };
  if (isPct(key)) return { text: (val * 100).toFixed(1) + "%", cls: val < 0 ? "negative" : "" };
  if (isEps(key)) return { text: "$" + val.toFixed(2), cls: val < 0 ? "negative" : "" };
  if (key.includes("ratio") || key === "debt_to_equity" || key === "net_debt_to_equity")
    return { text: val.toFixed(2), cls: "" };
  const neg = val < 0;
  const abs = Math.abs(val);
  const text = abs >= 1 ? abs.toLocaleString("en-US", { maximumFractionDigits: 1 }) : abs.toFixed(2);
  return { text: neg ? `(${text})` : text, cls: neg ? "negative" : "" };
}

function labelFor(key: string) {
  return LABEL_MAP[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPeriodEnd(data: FinData, period: string) {
  return data.filings?.[period]?.period_end ?? "";
}

/* ================================================================
   Annual aggregation
   ================================================================ */
const SUM_EXCLUDE = new Set(["eps_basic", "eps_diluted", "shares_basic", "shares_diluted", "shares_basic_millions", "shares_diluted_millions"]);
const AVG_KEYS = new Set(["shares_basic", "shares_diluted", "shares_basic_millions", "shares_diluted_millions"]);

function groupByFY(periods: string[]) {
  const map: Record<string, string[]> = {};
  for (const p of periods) {
    const m = p.match(/Q(\d+)_FY(\d+)/);
    if (!m) continue;
    const fy = `FY${m[2]}`;
    if (!map[fy]) map[fy] = [];
    map[fy].push(p);
  }
  return map;
}

function aggVals(valObj: ValMap, fyMap: Record<string, string[]>, mode: "sum" | "avg" | "last") {
  const result: ValMap = {};
  for (const [fy, quarters] of Object.entries(fyMap)) {
    const vals = quarters.map((q) => valObj[q]).filter((v): v is number => v !== null && v !== undefined);
    if (!vals.length) continue;
    if (mode === "sum") result[fy] = Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
    else if (mode === "avg") result[fy] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
    else {
      const q4 = quarters.find((q) => q.startsWith("Q4"));
      if (q4 && valObj[q4] !== null && valObj[q4] !== undefined) result[fy] = valObj[q4];
    }
  }
  return result;
}

function toAnnualData(data: FinData): FinData {
  const isFyMap = groupByFY(data.metadata.periods_income_statement || []);
  const bsFyMap = groupByFY(data.metadata.periods_balance_sheet || []);
  const fys = [...new Set([...Object.keys(isFyMap), ...Object.keys(bsFyMap)])].sort();

  const annIS: Record<string, ValMap> = {};
  const srcIS = data.income_statement || {};
  for (const [key, vals] of Object.entries(srcIS) as [string, ValMap][]) {
    if (SUM_EXCLUDE.has(key)) {
      if (AVG_KEYS.has(key)) annIS[key] = aggVals(vals, isFyMap, "avg");
    } else {
      annIS[key] = aggVals(vals, isFyMap, "sum");
    }
  }
  for (const epsKey of ["eps_basic", "eps_diluted"]) {
    const sharesKey = epsKey === "eps_basic" ? "shares_basic" : "shares_diluted";
    const ni = annIS.net_income || {};
    const sh = annIS[sharesKey] || annIS[sharesKey + "_millions"] || {};
    if (Object.keys(ni).length && Object.keys(sh).length) {
      annIS[epsKey] = {};
      for (const fy of fys) {
        if (ni[fy] !== undefined && ni[fy] !== null && sh[fy] && sh[fy] !== 0)
          annIS[epsKey][fy] = Math.round((ni[fy]! / sh[fy]!) * 100) / 100;
      }
    }
  }

  const annBS: Record<string, Record<string, ValMap>> = { assets: {}, liabilities: {}, equity: {} };
  const srcBS = data.balance_sheet || {};
  for (const sec of ["assets", "liabilities", "equity"] as const) {
    if (!srcBS[sec]) continue;
    for (const [key, vals] of Object.entries(srcBS[sec]) as [string, ValMap][]) {
      annBS[sec][key] = aggVals(vals, bsFyMap, "last");
    }
  }

  const annCF: any = {};
  const srcCF = data.cash_flow_statement || {};
  for (const secKey of ["operating_activities", "investing_activities", "financing_activities"]) {
    if (!srcCF[secKey]) continue;
    annCF[secKey] = {};
    for (const [key, vals] of Object.entries(srcCF[secKey])) {
      if (typeof vals === "object" && vals !== null && !Array.isArray(vals))
        annCF[secKey][key] = aggVals(vals as ValMap, isFyMap, "sum");
    }
  }
  for (const key of ["fx_effect_on_cash", "net_change_in_cash", "free_cash_flow"]) {
    if (srcCF[key] && typeof srcCF[key] === "object") annCF[key] = aggVals(srcCF[key], isFyMap, "sum");
  }
  if (srcCF.ending_cash) annCF.ending_cash = aggVals(srcCF.ending_cash, isFyMap, "last");
  if (srcCF.beginning_cash) {
    const bc: ValMap = {};
    for (const [fy, quarters] of Object.entries(isFyMap)) {
      const q1 = quarters.find((q) => q.startsWith("Q1"));
      if (q1 && srcCF.beginning_cash[q1] !== undefined) bc[fy] = srcCF.beginning_cash[q1];
    }
    annCF.beginning_cash = bc;
  }

  const annRatios: Record<string, Record<string, number>> = {};
  for (const fy of fys) {
    const r: Record<string, number> = {};
    const g = (sec: string, key: string) => annBS[sec]?.[key]?.[fy];
    const ca = g("assets", "total_current_assets");
    const cl = g("liabilities", "total_current_liabilities");
    const inv = g("assets", "inventories");
    const cash = g("assets", "cash_and_cash_equivalents");
    const ta = g("assets", "total_assets");
    const tl = g("liabilities", "total_liabilities");
    const te = g("equity", "total_equity");
    const ltd = g("liabilities", "long_term_debt") || 0;
    const cd = g("liabilities", "current_debt") || 0;
    const totalDebt = ltd + cd;
    const rev = annIS.revenue?.[fy];
    const gp = annIS.gross_profit?.[fy];
    const oi = annIS.operating_income?.[fy];
    const ni = annIS.net_income?.[fy];
    const intExp = annIS.interest_expense?.[fy];
    const ocf = annCF.operating_activities?.net_cash_from_operating?.[fy];
    const capex = annCF.investing_activities?.capital_expenditures?.[fy];
    const fcfVal = ocf != null && capex != null ? ocf - capex : annCF.free_cash_flow?.[fy];

    const rnd = (v: number) => Math.round(v * 100) / 100;
    const rnd4 = (v: number) => Math.round(v * 10000) / 10000;
    if (ca && cl && cl !== 0) r.current_ratio = rnd(ca / cl);
    if (ca != null && cl && cl !== 0) r.quick_ratio = rnd((ca - (inv || 0)) / cl);
    if (tl != null && te && te !== 0) r.debt_to_equity = rnd(tl / te);
    if (totalDebt && te && te !== 0) r.net_debt_to_equity = rnd((totalDebt - (cash || 0)) / te);
    if (ta && ta !== 0 && te != null) r.equity_ratio = rnd4(te / ta);
    if (gp != null && rev && rev !== 0) r.gross_margin_pct = rnd4(gp / rev);
    if (oi != null && rev && rev !== 0) r.operating_margin_pct = rnd4(oi / rev);
    if (ni != null && rev && rev !== 0) r.net_margin_pct = rnd4(ni / rev);
    if (ni != null && te && te !== 0) r.roe = rnd4(ni / te);
    if (ni != null && ta && ta !== 0) r.roa = rnd4(ni / ta);
    if (rev != null && ta && ta !== 0) r.asset_turnover = rnd4(rev / ta);
    if (oi != null && intExp && intExp !== 0) r.interest_coverage = rnd(oi / intExp);
    if (fcfVal != null && rev && rev !== 0) r.fcf_margin_pct = rnd4(fcfVal / rev);

    if (Object.keys(r).length) annRatios[fy] = r;
  }

  const annFilings: any = {};
  for (const [fy, quarters] of Object.entries(bsFyMap)) {
    const q4 = quarters.find((q) => q.startsWith("Q4"));
    if (q4 && data.filings?.[q4]) annFilings[fy] = data.filings[q4];
  }

  return {
    metadata: { ...data.metadata, periods_income_statement: fys, periods_balance_sheet: fys },
    filings: annFilings,
    income_statement: annIS,
    balance_sheet: annBS,
    cash_flow_statement: annCF,
    financial_ratios: annRatios,
    classification_audit: data.classification_audit,
  };
}

/* ================================================================
   Row types for table rendering
   ================================================================ */
type TableRow =
  | { type: "section"; label: string }
  | { type: "data"; key: string; label: string; vals: ValMap };

function buildRows(metrics: Record<string, ValMap>): TableRow[] {
  return Object.entries(metrics).map(([key, vals]) => ({
    type: "data" as const,
    key,
    label: labelFor(key),
    vals,
  }));
}

/* ================================================================
   Sub-components
   ================================================================ */

/* ── Generic data table ── */
function DataTable({
  periods,
  rows,
  data,
}: {
  periods: string[];
  rows: TableRow[];
  data: FinData;
}) {
  if (!rows.length) return <div className="p-10 text-center text-sm text-[#7f8c8d]">No data available.</div>;
  return (
    <div className="overflow-x-auto rounded-md shadow-sm">
      <table className="w-full border-collapse bg-white text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-[11] min-w-[260px] border border-[#e2e5ea] bg-[#1f4e79] px-3 py-1.5 text-left font-semibold text-white">
              Metric
            </th>
            {periods.map((p) => {
              const end = getPeriodEnd(data, p);
              return (
                <th key={p} className="border border-[#e2e5ea] bg-[#1f4e79] px-3 py-1.5 text-center font-semibold text-white">
                  {p}
                  {end && <span className="block text-[10px] font-normal text-white/70">{end}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === "section") {
              return (
                <tr key={`sec-${i}`}>
                  <td
                    colSpan={periods.length + 1}
                    className="border border-[#e2e5ea] bg-[#d6e4f0] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1f4e79]"
                  >
                    {row.label}
                  </td>
                </tr>
              );
            }
            const isTotal = TOTAL_KEYS.has(row.key);
            const bgBase = isTotal
              ? "bg-[#fff8e1]"
              : i % 2 === 0
                ? "bg-[#f2f8fd]"
                : "bg-white";
            const textCls = isTotal ? "font-bold text-[#7b3f00]" : "";
            return (
              <tr key={row.key + i}>
                <td className={`sticky left-0 z-[5] border border-[#e2e5ea] px-3 py-1.5 text-left font-medium ${bgBase} ${textCls}`}>
                  {row.label}
                </td>
                {periods.map((p) => {
                  const v = row.vals?.[p];
                  const f = fmtVal(v, row.key);
                  return (
                    <td
                      key={p}
                      className={`border border-[#e2e5ea] px-3 py-1.5 tabular-nums ${bgBase} ${textCls} ${
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
  );
}

/* ── Income Statement ── */
function IncomeStatement({ data }: { data: FinData }) {
  const periods = sortPeriods(data.metadata.periods_income_statement || []);
  const rows = buildRows(data.income_statement || {});
  return <DataTable periods={periods} rows={rows} data={data} />;
}

/* ── Balance Sheet ── */
function BalanceSheet({ data }: { data: FinData }) {
  const periods = sortPeriods(data.metadata.periods_balance_sheet || []);
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
  return <DataTable periods={periods} rows={rows} data={data} />;
}

/* ── Cash Flow ── */
function CashFlowStatement({ data }: { data: FinData }) {
  const periods = sortPeriods(data.metadata.periods_income_statement || []);
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
  return <DataTable periods={periods} rows={rows} data={data} />;
}

/* ── Ratios Panel (chart + table) ── */
function RatiosPanel({ data }: { data: FinData }) {
  const ratios = data.financial_ratios;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(["gross_margin_pct", "operating_margin_pct", "net_margin_pct"]),
  );

  if (!ratios || !Object.keys(ratios).length)
    return <div className="p-10 text-center text-sm text-[#7f8c8d]">No financial ratios computed.</div>;

  const periods = sortPeriods(Object.keys(ratios));
  const metricKeys = new Set<string>();
  for (const p of periods) for (const k of Object.keys(ratios[p])) metricKeys.add(k);
  const ordered = RATIO_ORDER.filter((k) => metricKeys.has(k));
  for (const k of metricKeys) if (!ordered.includes(k)) ordered.push(k);

  const toggleMetric = (m: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const selArr = ordered.filter((k) => selected.has(k));
  const usePercent = selArr.some(
    (k) => k.includes("pct") || k === "roe" || k === "roa" || k === "equity_ratio" || k === "asset_turnover",
  );

  const chartData = {
    labels: periods,
    datasets: selArr.map((key, i) => ({
      label: labelFor(key),
      data: periods.map((p) => ratios[p]?.[key] ?? null),
      borderColor: CHART_COLORS[i % CHART_COLORS.length],
      backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + "22",
      tension: 0.3,
      pointRadius: 3,
      spanGaps: true,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const key = selArr[ctx.datasetIndex];
            const v = ctx.parsed.y;
            if (v === null) return `${ctx.dataset.label}: —`;
            if (isPct(key)) return `${ctx.dataset.label}: ${(v * 100).toFixed(1)}%`;
            return `${ctx.dataset.label}: ${v.toFixed(2)}`;
          },
        },
      },
      legend: { position: "bottom" as const, labels: { boxWidth: 12, font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { font: { size: 10 }, maxRotation: 45 } },
      y: {
        ticks: {
          font: { size: 10 },
          callback: (v: any) => (usePercent ? (v * 100).toFixed(0) + "%" : Number(v).toFixed(2)),
        },
      },
    },
  };

  return (
    <>
      {/* Chart */}
      <div className="mb-4 rounded-md bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {ordered.map((key) => (
            <button
              key={key}
              onClick={() => toggleMetric(key)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-all select-none ${
                selected.has(key)
                  ? "border-[#1f4e79] bg-[#1f4e79] text-white"
                  : "border-[#e2e5ea] bg-[#f7f8fa] text-[#2c3e50] hover:border-[#2a6da8] hover:text-[#2a6da8]"
              }`}
            >
              {labelFor(key)}
            </button>
          ))}
        </div>
        <div className="relative h-[320px]">
          {selArr.length > 0 && <Line data={chartData} options={chartOptions} />}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md shadow-sm">
        <table className="w-full border-collapse bg-white text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-[11] min-w-[260px] border border-[#e2e5ea] bg-[#1f4e79] px-3 py-1.5 text-left font-semibold text-white">
                Metric
              </th>
              {periods.map((p) => {
                const end = getPeriodEnd(data, p);
                return (
                  <th key={p} className="border border-[#e2e5ea] bg-[#1f4e79] px-3 py-1.5 text-center font-semibold text-white">
                    {p}
                    {end && <span className="block text-[10px] font-normal text-white/70">{end}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ordered.map((key, i) => {
              const isTotal = TOTAL_KEYS.has(key);
              const bgBase = isTotal ? "bg-[#fff8e1]" : i % 2 === 0 ? "bg-[#f2f8fd]" : "bg-white";
              const textCls = isTotal ? "font-bold text-[#7b3f00]" : "";
              const def = RATIO_DEFINITIONS[key];
              return (
                <tr key={key}>
                  <td className={`group sticky left-0 z-[5] border border-[#e2e5ea] px-3 py-1.5 text-left font-medium ${bgBase} ${textCls} relative cursor-help`}>
                    {labelFor(key)}
                    {def && (
                      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded bg-[#2c3e50] px-2.5 py-1.5 text-[11px] font-normal text-white shadow-lg group-hover:block">
                        {def}
                      </span>
                    )}
                  </td>
                  {periods.map((p) => {
                    const v = (data.financial_ratios[p] as any)?.[key] ?? null;
                    const f = fmtVal(v, key);
                    return (
                      <td
                        key={p}
                        className={`border border-[#e2e5ea] px-3 py-1.5 tabular-nums ${bgBase} ${textCls} ${
                          f.cls === "negative" ? "text-right text-[#c0392b]" : f.cls === "null-val" ? "text-center text-[#7f8c8d]" : "text-right"
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
    </>
  );
}

/* ── Tag Audit ── */
const IS_METRICS = new Set([
  "revenue", "cost_of_goods_sold", "gross_profit", "research_and_development",
  "selling_general_administrative", "restructuring_charges", "operating_income",
  "interest_expense", "interest_income", "other_nonoperating_income_expense",
  "income_before_taxes", "income_tax_expense", "equity_method_investments",
  "net_income", "eps_basic", "eps_diluted", "shares_basic", "shares_diluted",
]);
const BS_METRICS = new Set([
  "cash_and_cash_equivalents", "short_term_investments", "accounts_receivable",
  "inventories", "other_current_assets", "total_current_assets",
  "property_plant_equipment_net", "operating_lease_rou_asset", "goodwill",
  "intangible_assets", "deferred_tax_assets", "other_noncurrent_assets",
  "total_assets", "accounts_payable", "accrued_liabilities", "current_debt",
  "other_current_liabilities", "total_current_liabilities", "long_term_debt",
  "operating_lease_noncurrent", "other_noncurrent_liabilities",
  "total_liabilities", "common_stock", "additional_paid_in_capital",
  "retained_earnings", "treasury_stock", "aoci", "total_equity",
  "total_liabilities_and_equity",
]);

function TagAuditPanel({ data }: { data: FinData }) {
  const audit = data.classification_audit || data.tag_history || {};
  if (!Object.keys(audit).length)
    return <div className="p-10 text-center text-sm text-[#7f8c8d]">No tag audit data available.</div>;

  const isNew = !!data.classification_audit;
  const groups: Record<string, { metric: string; info: any }[]> = {
    "Income Statement": [],
    "Balance Sheet": [],
    "Cash Flow": [],
  };
  for (const [metric, info] of Object.entries(audit)) {
    const bucket = IS_METRICS.has(metric) ? "Income Statement" : BS_METRICS.has(metric) ? "Balance Sheet" : "Cash Flow";
    groups[bucket].push({ metric, info });
  }

  const BADGE: Record<string, { cls: string; text: string }> = {
    known: { cls: "bg-[#27ae60]", text: "K" },
    label_discovery: { cls: "bg-[#2980b9]", text: "L" },
    llm_inference: { cls: "bg-[#8e44ad]", text: "AI" },
  };

  return (
    <div>
      {/* Legend */}
      <div className="mb-3 flex gap-4 border-b border-[#e2e5ea] pb-3 text-xs text-[#7f8c8d]">
        {Object.entries(BADGE).map(([method, b]) => (
          <div key={method} className="flex items-center gap-1">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${b.cls}`}>{b.text}</span>
            {method === "known" ? "Known candidate" : method === "label_discovery" ? "Label discovery" : "LLM inference"}
          </div>
        ))}
      </div>

      {Object.entries(groups).map(([section, items]) => {
        if (!items.length) return null;
        return (
          <div key={section}>
            <div className="my-4 rounded bg-[#d6e4f0] px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-[#1f4e79]">
              {section}
            </div>
            {items.map(({ metric, info }) => {
              const tags = isNew
                ? (info.tags || [])
                : ((info as any).tags_used || []).map((tag: string) => ({
                    tag,
                    label: tag,
                    method: "known",
                    confidence: 1.0,
                    periods: Object.entries((info as any).tag_by_period || {})
                      .filter(([, t]) => t === tag)
                      .map(([p]) => p),
                  }));
              const hasLLM = tags.some((t: any) => t.method === "llm_inference");
              return (
                <div
                  key={metric}
                  className={`mb-3 rounded-md border-l-4 bg-white p-4 shadow-sm ${
                    tags.length > 1 ? "border-l-[#e67e22]" : hasLLM ? "border-l-[#8e44ad]" : "border-l-[#1f4e79]"
                  }`}
                >
                  <div className="mb-2 text-sm font-bold text-[#1f4e79]">
                    {labelFor(metric)} <span className="font-normal text-[#7f8c8d]">({metric})</span>
                  </div>
                  {tags.map((t: any, ti: number) => {
                    const badge = BADGE[t.method] || BADGE.known;
                    const periods = sortPeriods(t.periods || []);
                    return (
                      <div key={ti} className="mb-1.5 flex items-start gap-2 rounded bg-[#f7f8fa] px-3 py-2 text-xs last:mb-0">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${badge.cls}`}>
                          {badge.text}
                        </span>
                        <div>
                          <div className="font-medium">{t.label || t.tag}</div>
                          <div className="font-mono text-[11px] text-[#555] break-all">{t.tag}</div>
                          {periods.length > 0 && (
                            <div className="mt-1 text-[11px] text-[#7f8c8d]">
                              {periods.length} periods: {periods[0]} → {periods[periods.length - 1]}
                            </div>
                          )}
                          {t.confidence < 1.0 && (
                            <div className="text-[11px] text-[#7f8c8d]">
                              Confidence: {(t.confidence * 100).toFixed(0)}%
                            </div>
                          )}
                          {t.reasoning && (
                            <div className="mt-1 text-[11px] italic text-[#8e44ad]">&ldquo;{t.reasoning}&rdquo;</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   Main Viewer
   ================================================================ */
const TABS = [
  { id: "is", label: "Income Statement" },
  { id: "bs", label: "Balance Sheet" },
  { id: "cf", label: "Cash Flow" },
  { id: "ratios", label: "Financial Ratios" },
  { id: "audit", label: "Tag Audit" },
];

export default function Viewer() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [ticker, setTicker] = useState("");
  const [tab, setTab] = useState("is");
  const [viewMode, setViewMode] = useState<"quarterly" | "annual">("quarterly");
  const [rawData, setRawData] = useState<FinData | null>(null);
  const [loading, setLoading] = useState(false);

  // Load ticker list
  useEffect(() => {
    fetch("/data/financials/tickers.json")
      .then((r) => r.json())
      .then(setTickers)
      .catch(() => setTickers(["SNDK", "MU", "LEU"]));
  }, []);

  // Load financials on ticker change
  useEffect(() => {
    if (!ticker) {
      setRawData(null);
      return;
    }
    setLoading(true);
    fetch(`/data/financials/${ticker}/${ticker}_financials.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setRawData(d);
        setLoading(false);
      })
      .catch((e) => {
        setRawData(null);
        setLoading(false);
        alert(`Failed to load ${ticker}: ${e.message}`);
      });
  }, [ticker]);

  const displayData = useMemo(() => {
    if (!rawData) return null;
    return viewMode === "annual" ? toAnnualData(rawData) : rawData;
  }, [rawData, viewMode]);

  const meta = rawData?.metadata;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-50 flex items-center gap-4 bg-[#1f4e79] px-6 py-3 text-white shadow-md">
        <Link
          href="/"
          className="text-sm text-white opacity-70 transition-opacity hover:opacity-100"
        >
          ← Portal
        </Link>
        <h1 className="text-base font-semibold whitespace-nowrap">Financials Viewer</h1>
        <select
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          className="cursor-pointer rounded border-none bg-white/15 px-3 py-1.5 text-sm font-semibold text-white [&>option]:bg-white [&>option]:text-[#333]"
        >
          <option value="">-- Select Ticker --</option>
          {tickers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* View toggle */}
        <div className="ml-4 flex">
          {(["quarterly", "annual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`cursor-pointer border border-white/30 px-3.5 py-1 text-xs font-semibold transition-all first:rounded-l last:rounded-r last:border-l-0 ${
                viewMode === m ? "bg-white/20 text-white" : "text-white/70"
              }`}
            >
              {m === "quarterly" ? "Quarterly" : "Annual"}
            </button>
          ))}
        </div>

        {meta && (
          <div className="ml-auto text-xs text-white/70">
            {meta.company} | {meta.exchange} | FY End: {meta.fiscal_year_end} | Updated: {meta.last_updated}
          </div>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div className="sticky top-[48px] z-40 flex gap-0 border-b-2 border-[#e2e5ea] bg-white px-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-0.5 cursor-pointer border-b-2 px-5 py-2.5 text-[13px] font-medium transition-all select-none ${
              tab === t.id
                ? "border-[#1f4e79] font-bold text-[#1f4e79]"
                : "border-transparent text-[#7f8c8d] hover:text-[#2a6da8]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-full overflow-x-auto p-4 px-6">
        {loading && <div className="py-16 text-center text-sm text-[#7f8c8d]">Loading...</div>}
        {!loading && !displayData && (
          <div className="py-16 text-center text-sm text-[#7f8c8d]">Select a ticker to view financial statements.</div>
        )}
        {!loading && displayData && (
          <>
            {tab === "is" && <IncomeStatement data={displayData} />}
            {tab === "bs" && <BalanceSheet data={displayData} />}
            {tab === "cf" && <CashFlowStatement data={displayData} />}
            {tab === "ratios" && <RatiosPanel data={displayData} />}
            {tab === "audit" && <TagAuditPanel data={displayData} />}
          </>
        )}
      </div>
    </div>
  );
}
