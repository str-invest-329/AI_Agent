"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import {
  ACCOUNTS,
  STOCKS,
  HOLDINGS,
  TRANSACTIONS,
  DIVIDENDS,
  generateDailyPnl,
  computeSummary,
  computePieData,
  computeLineData,
  getAccountObj,
  fetchRealtimePrices,
  fmt,
  fmtP,
  cls,
  sgn,
  type DailyPnlRecord,
} from "./data";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler, Tooltip, Legend);

const PIE_COLORS = ["#1a3a6b", "#2556a0", "#28a745", "#fd7e14", "#6f42c1", "#17a2b8", "#ffc107", "#dc3545", "#20c997"];

const colorClass: Record<string, string> = {
  positive: "text-[#198754] font-semibold",
  negative: "text-[#dc3545] font-semibold",
  neutral: "text-[#6c757d]",
};

// ── KPI Cards ──

function KpiCard({ label, value, sub, borderColor }: { label: string; value: string; sub: React.ReactNode; borderColor: string }) {
  return (
    <div className="rounded-[10px] bg-white p-[18px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
      <div className={`border-l-[3px] pl-3.5`} style={{ borderColor }}>
        <div className="mb-1.5 text-[0.78rem] font-semibold uppercase tracking-[0.6px] text-[#6c757d]">{label}</div>
        <div className="text-[1.55rem] font-bold leading-tight">{value}</div>
        <div className="mt-1 text-[0.8rem] text-[#6c757d]">{sub}</div>
      </div>
    </div>
  );
}

function KpiRow({ accFilter, realizedType }: { accFilter: string; realizedType: string }) {
  const s = computeSummary(accFilter, realizedType);
  const rlabels: Record<string, string> = {
    ALL: "已實現損益（全部）",
    trading: "已實現損益（交易）",
    interest: "利息收入",
    dividend: "配息收入",
  };
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <KpiCard label="總股本 (USD)" value={`$${fmt(s.capital)}`} sub="外部注資合計" borderColor="#1a3a6b" />
      <KpiCard
        label="帳戶總淨值 (NAV)"
        value={`$${fmt(s.nav)}`}
        sub={`持倉市值 $${fmt(s.mktVal)} ｜ 現金 $${fmt(s.cash)}`}
        borderColor="#1a3a6b"
      />
      <KpiCard label="持倉成本總額 (USD)" value={`$${fmt(s.costBasis)}`} sub="現有部位加權均成本合計" borderColor="#0dcaf0" />
      <KpiCard
        label="未實現損益"
        value={`${sgn(s.unrealized)}$${fmt(s.unrealized)}`}
        sub={<span className={colorClass[cls(s.unrealized)]}>{fmtP((s.unrealized / s.capital) * 100)} 相對期初資本</span>}
        borderColor="#198754"
      />
      <KpiCard
        label={rlabels[realizedType] || rlabels.ALL}
        value={`${sgn(s.realized)}$${fmt(s.realized)}`}
        sub={<span className={colorClass[cls(s.realized)]}>{fmtP((s.realized / s.capital) * 100)} 相對期初資本</span>}
        borderColor="#fd7e14"
      />
      <KpiCard
        label="總報酬率"
        value={fmtP(s.retRate)}
        sub={`合計損益 ${sgn(s.totalPnl)}$${fmt(s.totalPnl)}`}
        borderColor="#6f42c1"
      />
    </div>
  );
}

// ── Tables ──

function TxTable({ accFilter }: { accFilter: string }) {
  const rows = [...TRANSACTIONS]
    .filter((t) => accFilter === "ALL" || t.acc === accFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.82rem]">
          <thead>
            <tr className="bg-[#f8f9fa] text-[0.78rem] font-semibold text-[#495057]">
              <th className="whitespace-nowrap p-2">交易日期</th>
              <th className="whitespace-nowrap p-2">帳戶</th>
              <th className="whitespace-nowrap p-2">股票</th>
              <th className="whitespace-nowrap p-2">方向</th>
              <th className="whitespace-nowrap p-2 text-right">數量</th>
              <th className="whitespace-nowrap p-2 text-right">成交價</th>
              <th className="whitespace-nowrap p-2 text-right">成交金額</th>
              <th className="whitespace-nowrap p-2 text-right">手續費</th>
              <th className="whitespace-nowrap p-2 text-right">實現損益</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const a = getAccountObj(t.acc);
              const s = STOCKS[t.code];
              return (
                <tr key={t.id} className="border-b border-[#dee2e6] hover:bg-[#f8f9fa]">
                  <td className="whitespace-nowrap p-2">{t.date}</td>
                  <td className="p-2"><span className="rounded-xl bg-[#e8eef7] px-2 py-0.5 text-[0.76rem] font-semibold text-[#1a3a6b]">{a?.name || t.acc}</span></td>
                  <td className="p-2"><span className="font-bold text-[#2556a0]">{t.code}</span> {s?.name || ""}</td>
                  <td className="p-2">
                    <span className={`rounded px-1.5 py-0.5 text-[0.74rem] font-semibold ${t.dir === "buy" ? "bg-[#d4edda] text-[#155724]" : "bg-[#f8d7da] text-[#721c24]"}`}>
                      {t.dir === "buy" ? "買入" : "賣出"}
                    </span>{" "}
                    <span className={`rounded px-1.5 py-0.5 text-[0.74rem] font-semibold ${t.type === "open" ? "bg-[#cce5ff] text-[#004085]" : "bg-[#e2e3e5] text-[#383d41]"}`}>
                      {t.type === "open" ? "開倉" : "平倉"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-2 text-right">{fmt(t.qty)}</td>
                  <td className="whitespace-nowrap p-2 text-right">${t.price.toLocaleString()}</td>
                  <td className="whitespace-nowrap p-2 text-right">${fmt(t.qty * t.price)}</td>
                  <td className="whitespace-nowrap p-2 text-right text-[#6c757d]">${fmt(t.fee)}</td>
                  <td className={`whitespace-nowrap p-2 text-right ${t.rpnl != null ? colorClass[cls(t.rpnl)] : "text-[#6c757d]"}`}>
                    {t.rpnl != null ? `${sgn(t.rpnl)}$${fmt(t.rpnl)}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2.5 text-[0.75rem] text-[#999]">共 {rows.length} 筆，僅顯示近期交易紀錄；已實現損益含所有歷史平倉</div>
    </>
  );
}

function HoldingsTable({ accFilter }: { accFilter: string }) {
  const accs = accFilter === "ALL" ? ACCOUNTS : ACCOUNTS.filter((a) => a.id === accFilter);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.82rem]">
          <thead>
            <tr className="bg-[#f8f9fa] text-[0.78rem] font-semibold text-[#495057]">
              <th className="whitespace-nowrap p-2">代號</th>
              <th className="whitespace-nowrap p-2">股票名稱</th>
              <th className="whitespace-nowrap p-2 text-right">持有股數</th>
              <th className="whitespace-nowrap p-2 text-right">成本均價</th>
              <th className="whitespace-nowrap p-2 text-right">現價</th>
              <th className="whitespace-nowrap p-2 text-right">市值</th>
              <th className="whitespace-nowrap p-2 text-right">成本總額</th>
              <th className="whitespace-nowrap p-2 text-right">未實現損益</th>
              <th className="whitespace-nowrap p-2 text-right">損益%</th>
            </tr>
          </thead>
          <tbody>
            {accs.map((a) => {
              const holdings = HOLDINGS.filter((h) => h.acc === a.id);
              let accMv = a.cash, accUnrealized = 0;
              holdings.forEach((h) => {
                const s = STOCKS[h.code]; if (!s) return;
                accMv += h.qty * s.price;
                accUnrealized += (s.price - h.avg_cost) * h.qty;
              });
              return [
                <tr key={`hdr-${a.id}`} className="bg-[#f1f3f8]">
                  <td colSpan={9} className="p-2 text-[0.82rem] font-bold text-[#1a3a6b]">
                    {a.name} <span className="font-normal text-[0.78rem] text-[#6c757d]">{a.id} ｜ NAV: ${fmt(accMv)} ｜ 未實現: <span className={colorClass[cls(accUnrealized)]}>{sgn(accUnrealized)}${fmt(accUnrealized)}</span></span>
                  </td>
                </tr>,
                <tr key={`cash-${a.id}`} className="border-b border-[#dee2e6] hover:bg-[#f8f9fa]">
                  <td className="p-2 font-bold text-[#2556a0]">CASH</td>
                  <td className="p-2">現金餘額</td>
                  <td className="p-2 text-right">—</td><td className="p-2 text-right">—</td><td className="p-2 text-right">—</td>
                  <td className="p-2 text-right font-bold">${fmt(a.cash)}</td>
                  <td className="p-2 text-right">—</td><td className="p-2 text-right">—</td><td className="p-2 text-right">—</td>
                </tr>,
                ...holdings.map((h) => {
                  const s = STOCKS[h.code]; if (!s) return null;
                  const mv = h.qty * s.price;
                  const costBasis = h.qty * h.avg_cost;
                  const unr = (s.price - h.avg_cost) * h.qty;
                  const unrPct = (unr / costBasis) * 100;
                  return (
                    <tr key={`${a.id}-${h.code}`} className="border-b border-[#dee2e6] hover:bg-[#f8f9fa]">
                      <td className="p-2 font-bold text-[#2556a0]">{h.code}</td>
                      <td className="p-2">{s.name} <span className="text-[0.76rem] text-[#6c757d]">{s.sector}</span></td>
                      <td className="p-2 text-right">{fmt(h.qty)}</td>
                      <td className="p-2 text-right">${h.avg_cost.toLocaleString()}</td>
                      <td className="p-2 text-right">${s.price.toLocaleString()}</td>
                      <td className="p-2 text-right">${fmt(mv)}</td>
                      <td className="p-2 text-right">${fmt(costBasis)}</td>
                      <td className={`p-2 text-right ${colorClass[cls(unr)]}`}>{sgn(unr)}${fmt(unr)}</td>
                      <td className={`p-2 text-right ${colorClass[cls(unrPct)]}`}>{fmtP(unrPct)}</td>
                    </tr>
                  );
                }),
              ];
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2.5 text-[0.75rem] text-[#999]">現價為截至 2026-03-03 收盤價（模擬）</div>
    </>
  );
}

function PnlTable({ accFilter, dailyPnl }: { accFilter: string; dailyPnl: Record<string, DailyPnlRecord[]> }) {
  const accs = accFilter === "ALL" ? ACCOUNTS : ACCOUNTS.filter((a) => a.id === accFilter);
  const accIds = accFilter === "ALL" ? ACCOUNTS.map((a) => a.id) : [accFilter];
  const refDays = (dailyPnl[accIds[0]] || []).slice(-20).map((d) => d.date).reverse();

  return (
    <>
      <div className="mb-3">
        <div className="mb-2 text-[0.76rem] font-bold uppercase tracking-[0.7px] text-[#1a3a6b]">帳戶損益概覽</div>
        <div className="overflow-x-auto">
          <table className="w-full text-[0.82rem]">
            <thead>
              <tr className="bg-[#f8f9fa] text-[0.78rem] font-semibold text-[#495057]">
                <th className="p-2">帳戶</th>
                <th className="p-2 text-right">期初資本</th><th className="p-2 text-right">當前淨值</th>
                <th className="p-2 text-right">淨值增減</th><th className="p-2 text-right">未實現損益</th>
                <th className="p-2 text-right">交易損益</th><th className="p-2 text-right">利息收入</th>
                <th className="p-2 text-right">配息收入</th><th className="p-2 text-right">總損益</th>
                <th className="p-2 text-right">總報酬率</th><th className="p-2 text-right">當日損益(估)</th>
              </tr>
            </thead>
            <tbody>
              {accs.map((a) => {
                let mktVal = 0, unr = 0;
                HOLDINGS.filter((h) => h.acc === a.id).forEach((h) => {
                  const s = STOCKS[h.code]; if (!s) return;
                  mktVal += h.qty * s.price;
                  unr += (s.price - h.avg_cost) * h.qty;
                });
                const nav = a.cash + mktVal;
                const rp = a.realized_pnl;
                const realizedAll = rp.trading + rp.interest + rp.dividend;
                const totalPnl = unr + realizedAll;
                const retRate = (totalPnl / a.initial_capital) * 100;
                const dayRows = dailyPnl[a.id] || [];
                const todayPnl = dayRows.length > 0 ? dayRows[dayRows.length - 1].daily : 0;
                const navChg = nav - a.initial_capital;
                return (
                  <tr key={a.id} className="border-b border-[#dee2e6] hover:bg-[#f8f9fa]">
                    <td className="p-2"><span className="rounded-xl bg-[#e8eef7] px-2 py-0.5 text-[0.76rem] font-semibold text-[#1a3a6b]">{a.name}</span></td>
                    <td className="p-2 text-right">${fmt(a.initial_capital)}</td>
                    <td className="p-2 text-right">${fmt(nav)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(navChg)]}`}>{sgn(navChg)}${fmt(navChg)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(unr)]}`}>{sgn(unr)}${fmt(unr)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(rp.trading)]}`}>{sgn(rp.trading)}${fmt(rp.trading)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(rp.interest)]}`}>{sgn(rp.interest)}${fmt(rp.interest)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(rp.dividend)]}`}>{sgn(rp.dividend)}${fmt(rp.dividend)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(totalPnl)]}`}>{sgn(totalPnl)}${fmt(totalPnl)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(retRate)]}`}>{fmtP(retRate)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(todayPnl)]}`}>{sgn(todayPnl)}${fmt(todayPnl)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <hr className="my-3" />
      <div className="mb-2 text-[0.76rem] font-bold uppercase tracking-[0.7px] text-[#1a3a6b]">近 20 個交易日損益紀錄</div>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.82rem]">
          <thead>
            <tr className="bg-[#f8f9fa] text-[0.78rem] font-semibold text-[#495057]">
              <th className="p-2">日期</th><th className="p-2">帳戶</th>
              <th className="p-2 text-right">當日損益</th><th className="p-2 text-right">累計損益（估）</th>
            </tr>
          </thead>
          <tbody>
            {refDays.flatMap((date) =>
              accIds.map((id) => {
                const a = getAccountObj(id);
                const rec = (dailyPnl[id] || []).find((d) => d.date === date);
                if (!rec) return null;
                return (
                  <tr key={`${date}-${id}`} className="border-b border-[#dee2e6] hover:bg-[#f8f9fa]">
                    <td className="p-2">{date}</td>
                    <td className="p-2"><span className="rounded-xl bg-[#e8eef7] px-2 py-0.5 text-[0.76rem] font-semibold text-[#1a3a6b]">{a?.name || id}</span></td>
                    <td className={`p-2 text-right ${colorClass[cls(rec.daily)]}`}>{sgn(rec.daily)}${fmt(rec.daily)}</td>
                    <td className={`p-2 text-right ${colorClass[cls(rec.cumulative)]}`}>{sgn(rec.cumulative)}${fmt(rec.cumulative)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2.5 text-[0.75rem] text-[#999]">當日損益為估算值，基於持倉模擬波動計算；已實現損益以實際交易紀錄為準</div>
    </>
  );
}

function StockSummaryTable({ accFilter }: { accFilter: string }) {
  const filteredH = HOLDINGS.filter((h) => accFilter === "ALL" || h.acc === accFilter);
  if (filteredH.length === 0) return <div className="p-3 text-[0.75rem] text-[#999]">目前篩選條件下無持倉</div>;

  const groups: Record<string, typeof HOLDINGS> = {};
  filteredH.forEach((h) => {
    if (!groups[h.code]) groups[h.code] = [];
    groups[h.code].push(h);
  });

  let grandMktVal = 0, grandCost = 0, grandUnr = 0, grandDiv = 0;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-[0.82rem]">
          <thead>
            <tr className="bg-[#f8f9fa] text-[0.78rem] font-semibold text-[#495057]">
              <th className="p-2">代號 ／ 名稱（帳戶）</th>
              <th className="p-2 text-right">持有股數</th>
              <th className="p-2 text-right">均成本 (USD)</th>
              <th className="p-2 text-right">現價 (USD)</th>
              <th className="p-2 text-right">市值 (USD)</th>
              <th className="p-2 text-right">未實現損益 (USD)</th>
              <th className="p-2 text-right">未實現損益%</th>
              <th className="p-2 text-right">配息收入 (USD)</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groups).map(([code, positions]) => {
              const s = STOCKS[code]; if (!s) return null;
              const totalQty = positions.reduce((n, h) => n + h.qty, 0);
              const totalCost = positions.reduce((n, h) => n + h.qty * h.avg_cost, 0);
              const totalMktVal = totalQty * s.price;
              const totalUnr = totalMktVal - totalCost;
              const totalUnrPct = totalCost > 0 ? (totalUnr / totalCost) * 100 : 0;
              const wAvgCost = totalCost / totalQty;
              const totalDiv = DIVIDENDS
                .filter((d) => d.code === code && (accFilter === "ALL" || d.acc === accFilter))
                .reduce((sum, d) => sum + d.amount, 0);
              grandMktVal += totalMktVal; grandCost += totalCost; grandUnr += totalUnr; grandDiv += totalDiv;

              return [
                <tr key={`g-${code}`} className="bg-[#f1f3f8]">
                  <td className="p-2 font-bold text-[#1a3a6b]">
                    <span className="font-bold text-[#2556a0]">{code}</span> {s.name}{" "}
                    <span className="text-[0.76rem] text-[#6c757d]">{s.sector}</span>
                  </td>
                  <td className="p-2 text-right">{fmt(totalQty)}</td>
                  <td className="p-2 text-right">${wAvgCost.toFixed(2)}</td>
                  <td className="p-2 text-right">
                    ${s.price.toFixed(2)}
                    <span className={`ml-1 rounded-[10px] px-2 py-0.5 text-[0.72rem] font-semibold ${s.live ? "bg-[#d4edda] text-[#155724]" : "bg-[#fff3cd] text-[#856404]"}`}>
                      {s.live ? "即時" : "最後交易"}
                    </span>
                  </td>
                  <td className="p-2 text-right">${fmt(totalMktVal)}</td>
                  <td className={`p-2 text-right ${colorClass[cls(totalUnr)]}`}>{sgn(totalUnr)}${fmt(totalUnr)}</td>
                  <td className={`p-2 text-right ${colorClass[cls(totalUnrPct)]}`}>{fmtP(totalUnrPct)}</td>
                  <td className={`p-2 text-right ${colorClass.positive}`}>{totalDiv > 0 ? `+$${fmt(totalDiv)}` : "—"}</td>
                </tr>,
                ...positions.map((h) => {
                  const a = getAccountObj(h.acc);
                  const mv = h.qty * s.price;
                  const unr = (s.price - h.avg_cost) * h.qty;
                  const unrPct = h.qty * h.avg_cost > 0 ? (unr / (h.qty * h.avg_cost)) * 100 : 0;
                  const accDiv = DIVIDENDS.filter((d) => d.code === code && d.acc === h.acc).reduce((sum, d) => sum + d.amount, 0);
                  return (
                    <tr key={`${code}-${h.acc}`} className="border-b border-[#dee2e6] hover:bg-[#f8f9fa]">
                      <td className="p-2 pl-7"><span className="rounded-xl bg-[#e8eef7] px-2 py-0.5 text-[0.76rem] font-semibold text-[#1a3a6b]">{a?.name || h.acc}</span></td>
                      <td className="p-2 text-right">{fmt(h.qty)}</td>
                      <td className="p-2 text-right">${h.avg_cost.toFixed(2)}</td>
                      <td className="p-2 text-right">${s.price.toFixed(2)}</td>
                      <td className="p-2 text-right">${fmt(mv)}</td>
                      <td className={`p-2 text-right ${colorClass[cls(unr)]}`}>{sgn(unr)}${fmt(unr)}</td>
                      <td className={`p-2 text-right ${colorClass[cls(unrPct)]}`}>{fmtP(unrPct)}</td>
                      <td className={`p-2 text-right ${colorClass.positive}`}>{accDiv > 0 ? `+$${fmt(accDiv)}` : "—"}</td>
                    </tr>
                  );
                }),
              ];
            })}
            <tr className="bg-[#f1f3f8] font-bold">
              <td className="p-2">合計持倉</td><td /><td /><td />
              <td className="p-2 text-right">${fmt(grandMktVal)}</td>
              <td className={`p-2 text-right ${colorClass[cls(grandUnr)]}`}>{sgn(grandUnr)}${fmt(grandUnr)}</td>
              <td className={`p-2 text-right ${colorClass[cls(grandCost > 0 ? (grandUnr / grandCost) * 100 : 0)]}`}>{fmtP(grandCost > 0 ? (grandUnr / grandCost) * 100 : 0)}</td>
              <td className={`p-2 text-right ${colorClass.positive}`}>{grandDiv > 0 ? `+$${fmt(grandDiv)}` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-2.5 text-[0.75rem] text-[#999]">未實現損益 = (現價 − 均成本) × 股數，不含已實現；配息收入為累計已入帳金額</div>
    </>
  );
}

// ── Main Dashboard ──

const TABS = [
  { id: "tx", label: "股票交易紀錄" },
  { id: "holdings", label: "帳戶持倉狀態" },
  { id: "pnl", label: "損益分析" },
  { id: "stocks", label: "股票彙總" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AlphaDashboard() {
  const [accFilter, setAccFilter] = useState("ALL");
  const [dateRange, setDateRange] = useState("3M");
  const [groupBy, setGroupBy] = useState("stock");
  const [trendType, setTrendType] = useState("cumulative");
  const [realizedType, setRealizedType] = useState("ALL");
  const [activeTab, setActiveTab] = useState<TabId>("tx");
  const [priceStatus, setPriceStatus] = useState<{ text: string; live: boolean }>({ text: "最後交易價", live: false });
  const [refreshing, setRefreshing] = useState(false);
  const [, forceUpdate] = useState(0);

  const dailyPnl = useMemo(() => generateDailyPnl(), []);

  const doRefreshPrices = useCallback(async () => {
    setRefreshing(true);
    setPriceStatus({ text: "更新中…", live: false });
    const hitCount = await fetchRealtimePrices();
    if (hitCount > 0) {
      const ts = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
      setPriceStatus({ text: `即時 ${ts}`, live: true });
      forceUpdate((n) => n + 1);
    } else {
      setPriceStatus({ text: "最後交易價", live: false });
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    doRefreshPrices();
  }, [doRefreshPrices]);

  const resetFilters = () => {
    setAccFilter("ALL");
    setDateRange("3M");
    setGroupBy("stock");
    setTrendType("cumulative");
    setRealizedType("ALL");
  };

  // Pie chart data
  const pieData = computePieData(accFilter, groupBy);
  const pieTitle = groupBy === "account" ? "資產分布（依帳戶）" : "資產配置（依持股）";

  // Line chart data
  const lineData = computeLineData(accFilter, dateRange, trendType, dailyPnl);
  const lineTitleMap: Record<string, string> = { cumulative: "累計損益走勢", daily: "當日損益走勢" };

  return (
    <div className="min-h-screen bg-[#eef0f5] text-sm" style={{ fontFamily: "'Segoe UI', 'Microsoft JhengHei', sans-serif" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-[#1a3a6b] px-6 py-3 text-white">
        <div className="flex items-center gap-3.5">
          <Link href="/" className="text-[0.85rem] text-white/80 no-underline transition-opacity hover:text-white">← Portal</Link>
          <div className="text-[1.1rem] font-bold tracking-[0.5px]">📊&nbsp; AlphaDash — 財務系統儀表板</div>
        </div>
        <div className="text-[0.8rem] opacity-65">v1.0 &nbsp;|&nbsp; 資料截止：2026-02-13 &nbsp;|&nbsp; 帳戶數：2 &nbsp;|&nbsp; 幣別：USD</div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-[#dee2e6] bg-white px-5 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-0.5 block text-[0.82rem] font-semibold text-[#495057]">股票帳戶</label>
            <select className="rounded border border-[#dee2e6] px-2 py-1 text-[0.82rem]" value={accFilter} onChange={(e) => setAccFilter(e.target.value)}>
              <option value="ALL">全部帳戶</option>
              {ACCOUNTS.map((a) => <option key={a.id} value={a.id}>{a.name}（{a.id}）</option>)}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[0.82rem] font-semibold text-[#495057]">時間範圍</label>
            <select className="rounded border border-[#dee2e6] px-2 py-1 text-[0.82rem]" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="1M">近 1 個月</option>
              <option value="3M">近 3 個月</option>
              <option value="YTD">今年至今</option>
              <option value="ALL">全部</option>
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[0.82rem] font-semibold text-[#495057]">餅圖分組</label>
            <select className="rounded border border-[#dee2e6] px-2 py-1 text-[0.82rem]" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <option value="stock">依持股</option>
              <option value="account">依帳戶</option>
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[0.82rem] font-semibold text-[#495057]">走勢類型</label>
            <select className="rounded border border-[#dee2e6] px-2 py-1 text-[0.82rem]" value={trendType} onChange={(e) => setTrendType(e.target.value)}>
              <option value="cumulative">累計損益</option>
              <option value="daily">當日損益</option>
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[0.82rem] font-semibold text-[#495057]">損益計入</label>
            <select className="rounded border border-[#dee2e6] px-2 py-1 text-[0.82rem]" value={realizedType} onChange={(e) => setRealizedType(e.target.value)}>
              <option value="ALL">全部</option>
              <option value="trading">交易</option>
              <option value="interest">利息</option>
              <option value="dividend">配息</option>
            </select>
          </div>
          <div className="ml-auto flex items-end gap-2">
            <button className="rounded border border-[#1a3a6b] px-3 py-1 text-[0.82rem] font-medium text-[#1a3a6b] hover:bg-[#1a3a6b] hover:text-white disabled:opacity-50" disabled={refreshing} onClick={doRefreshPrices}>
              更新報價
            </button>
            <button className="rounded border border-[#6c757d] px-3 py-1 text-[0.82rem] font-medium text-[#6c757d] hover:bg-[#6c757d] hover:text-white" onClick={resetFilters}>
              重置
            </button>
            <span className={`self-center rounded-[10px] px-2 py-0.5 text-[0.72rem] font-semibold ${priceStatus.live ? "bg-[#d4edda] text-[#155724]" : "bg-[#fff3cd] text-[#856404]"}`}>
              {priceStatus.text}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5 px-6">
        {/* KPI */}
        <KpiRow accFilter={accFilter} realizedType={realizedType} />

        {/* Charts */}
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[5fr_8fr]">
          <div className="rounded-[10px] bg-white p-[18px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="mb-3.5 text-[0.78rem] font-bold uppercase tracking-[0.8px] text-[#1a3a6b]">{pieTitle}</div>
            <Doughnut
              data={{
                labels: pieData.labels,
                datasets: [{ data: pieData.values, backgroundColor: PIE_COLORS, borderWidth: 2, borderColor: "#fff" }],
              }}
              options={{
                responsive: true,
                cutout: "55%",
                plugins: {
                  legend: { position: "bottom", labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
                        const pct = ((ctx.parsed / total) * 100).toFixed(1);
                        return ` ${ctx.label}: $${fmt(ctx.parsed)} (${pct}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
          <div className="rounded-[10px] bg-white p-[18px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <div className="mb-3.5 text-[0.78rem] font-bold uppercase tracking-[0.8px] text-[#1a3a6b]">{lineTitleMap[trendType] || "損益走勢"}</div>
            <Line
              data={{ labels: lineData.labels, datasets: lineData.datasets }}
              options={{
                responsive: true,
                interaction: { mode: "index", intersect: false },
                scales: {
                  x: { ticks: { maxTicksLimit: 9, font: { size: 10 }, maxRotation: 0 }, grid: { display: false } },
                  y: {
                    ticks: {
                      font: { size: 10 },
                      callback: (v) => {
                        const n = Number(v);
                        if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M";
                        if (Math.abs(n) >= 1000) return (n / 1000).toFixed(0) + "K";
                        return String(v);
                      },
                    },
                  },
                },
                plugins: {
                  legend: { labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 8 } },
                  tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: $${fmt(Math.round(ctx.parsed.y ?? 0))}` } },
                },
              }}
            />
          </div>
        </div>

        {/* Tables */}
        <div className="rounded-[10px] bg-white p-[18px_20px] shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
          <div className="mb-3.5 flex gap-0 border-b border-[#dee2e6]">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`px-4 py-2 text-[0.85rem] transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-[#1a3a6b] font-bold text-[#1a3a6b]"
                    : "text-[#6c757d] hover:text-[#1a3a6b]"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "tx" && <TxTable accFilter={accFilter} />}
          {activeTab === "holdings" && <HoldingsTable accFilter={accFilter} />}
          {activeTab === "pnl" && <PnlTable accFilter={accFilter} dailyPnl={dailyPnl} />}
          {activeTab === "stocks" && <StockSummaryTable accFilter={accFilter} />}
        </div>
      </div>
    </div>
  );
}
