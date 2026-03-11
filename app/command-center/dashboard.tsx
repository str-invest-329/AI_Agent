"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import type {
  ReportData,
  MarketData,
  MarketIndex,
  DvData,
  DvRanking,
  Indicator,
} from "./types";
import { DEBUG_NOTES } from "./types";
import { NewsTable } from "@/app/components/news";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

/* ── Chart default options ────────────────────────────────────── */
const CHART_DEFAULTS = {
  responsive: true,
  interaction: { mode: "index" as const, intersect: false },
  plugins: { legend: { labels: { color: "#7A5860", font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: "#7A5860" }, grid: { color: "#EDE5E5" } },
    y: { ticks: { color: "#7A5860" }, grid: { color: "#EDE5E5" } },
  },
};

/* ── Industry Map static data ─────────────────────────────────── */
const INDUSTRY_MAP = [
  {
    titleEn: "Support",
    titleZh: "AI基建",
    inPool: [{ cat: "能源供給", tickers: ["LEU"] }],
    observe: [
      { cat: "能源供給", tickers: ["OKLO"] },
      { cat: "原物料", tickers: ["UUUU"] },
      { cat: "光模組", tickers: ["GLW"] },
    ],
  },
  {
    titleEn: "Core Industry",
    titleZh: "AI半導體",
    inPool: [
      { cat: "晶圓代工", tickers: ["TSM", "MU"] },
      { cat: "AI晶片", tickers: ["NVDA", "GOOGL"] },
    ],
    observe: [
      { cat: "AI晶片", tickers: ["AMD", "AVGO", "QCOM"] },
      { cat: "半導體設備", tickers: ["鴻勁"] },
    ],
  },
  {
    titleEn: "Application",
    titleZh: "AI應用端",
    inPool: [{ cat: "AI應用端", tickers: ["AMZN", "GOOGL", "ORCL"] }],
    observe: [{ cat: "醫藥生技", tickers: ["RXRX"] }],
  },
];

/* ── Type badge color mapping ─────────────────────────────────── */
const TYPE_COLORS: Record<string, string> = {
  "信用風險": "bg-[#FDECEA] text-[#8B1A22]",
  "風險報酬": "bg-[#E8F4FD] text-[#1A5276]",
  "景氣訊號": "bg-[#E9F7EF] text-[#1A6B3A]",
  "景氣": "bg-[#E9F7EF] text-[#1A6B3A]",
  "通膨": "bg-[#FEF3C7] text-[#78350F]",
  "就業": "bg-[#EDE9FE] text-[#4C1D95]",
  "利率": "bg-[#E0F2FE] text-[#0C4A6E]",
  "市場": "bg-[#FDF4FF] text-[#701A75]",
  "海外": "bg-[#F0FDF4] text-[#14532D]",
};

/* ── Helpers ──────────────────────────────────────────────────── */
const isNA = (val: string | number | null | undefined): boolean =>
  val == null || val === "—";

const fmtPct = (v: number, sign = true) =>
  (sign && v > 0 ? "+" : "") + v.toFixed(2) + "%";

function fmtLargeNum(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toFixed(0);
}

function fmtDollarLarge(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
  return "$" + n.toFixed(0);
}

const LEVEL_ICON: Record<string, string> = {
  info: "\u2139",
  warn: "\u26A0",
  error: "\u2715",
};
const API_LABEL: Record<string, string> = {
  ok: "\u2713 FRED API",
  excel: "\uD83D\uDCE5 Excel \u4E0B\u8F09",
  none: "\u2717 \u7121 API",
};

/* ── Direction class helpers ──────────────────────────────────── */
const DIR_CLASS: Record<string, string> = {
  up: "text-[#1A7F6E]",
  down: "text-[#C02734]",
  neu: "text-[#B07A20]",
};

/* ── TradingView Widget ──────────────────────────────────────── */
function TradingViewWidget({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedSymbolRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mountedSymbolRef.current === symbol) return;
    mountedSymbolRef.current = symbol;

    // Clear previous widget if switching symbol
    containerRef.current.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container";
    wrapper.style.cssText = "height:100%;width:100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.cssText = "height:calc(100% - 32px);width:100%";
    wrapper.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "W",
      timezone: "Asia/Taipei",
      theme: "light",
      style: "1",
      locale: "zh_TW",
      enable_publishing: false,
      allow_symbol_change: true,
      studies: [
        { id: "MASimple@tv-basicstudies", inputs: { length: 20 } },
        { id: "MASimple@tv-basicstudies", inputs: { length: 60 } },
        { id: "MASimple@tv-basicstudies", inputs: { length: 120 } },
      ],
    });
    wrapper.appendChild(script);
    containerRef.current.appendChild(wrapper);
  }, [symbol]);

  return <div ref={containerRef} className="h-full w-full" />;
}

/* ── Latest values overlay component ─────────────────────────── */
function LatestVals({
  items,
}: {
  items: { label: string; value: number | null; color: string; fmt?: (v: number) => string }[];
}) {
  const filtered = items.filter((i) => i.value != null);
  if (filtered.length === 0) return null;
  return (
    <div className="absolute top-5 right-5 text-right text-[0.82rem] font-semibold leading-relaxed">
      {filtered.map((item) => (
        <div key={item.label} style={{ color: item.color }}>
          {item.label}:{" "}
          {item.fmt
            ? item.fmt(item.value!)
            : item.value!.toFixed(2) + "%"}
        </div>
      ))}
    </div>
  );
}

/* ── Update chip component ───────────────────────────────────── */
function UpdateChip({ date }: { date?: string }) {
  if (!date) return null;
  return <span className="inline-block text-[0.68rem] bg-[#EDF2F7] text-[#4A5568] px-1.5 py-px rounded ml-1.5 align-middle font-medium">{date}</span>;
}

/* ── Debug section notes component ───────────────────────────── */
function DebugSectionNotes({ sectionId }: { sectionId: string }) {
  const data = DEBUG_NOTES[sectionId];
  if (!data?.notes || data.notes.length === 0) return null;

  const levelClasses: Record<string, string> = {
    info: "bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]",
    warn: "bg-[#FFFBEB] text-[#92400E] border-[#D97706]",
  };

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      {data.notes.map((n, i) => (
        <div key={i} className={`flex items-baseline gap-1.5 text-[0.78rem] px-3 py-1 rounded-[5px] border-l-[3px] ${levelClasses[n.level] || ""}`}>
          <span>{LEVEL_ICON[n.level]}</span>
          <span>{n.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Indicator detail chart (lazy rendered) ──────────────────── */
function IndicatorDetailChart({ indicator }: { indicator: Indicator }) {
  if (!indicator.history?.labels || indicator.history.labels.length === 0)
    return null;
  return (
    <div className="max-w-[560px] h-[180px]">
      <Line
        data={{
          labels: indicator.history.labels,
          datasets: [
            {
              label: indicator.name,
              data: indicator.history.values,
              borderColor: "#63b3ed",
              tension: 0.3,
              fill: false,
              pointRadius: 2,
            },
          ],
        }}
        options={{
          ...CHART_DEFAULTS,
          maintainAspectRatio: false,
          plugins: {
            ...CHART_DEFAULTS.plugins,
            legend: { display: false },
          },
        }}
      />
    </div>
  );
}

/* ── Indicator table component ───────────────────────────────── */
function IndicatorTable({
  indicators,
  sectionId,
  debug,
}: {
  indicators: Indicator[];
  sectionId: string;
  debug: boolean;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const debugMap =
    (DEBUG_NOTES[sectionId] || ({} as (typeof DEBUG_NOTES)[string]))
      .indicators || {};

  return (
    <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative">
      <table className="w-full border-collapse text-[0.88rem]">
        <thead>
          <tr>
            <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-center">#</th>
            <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-left">指標名稱</th>
            <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-center">類型</th>
            <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-center">前值</th>
            <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-center">最新數據</th>
            <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-center">變動(%)</th>
            <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-center">數據日期</th>
            <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-center">下次更新</th>
            {debug && (
              <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] whitespace-nowrap font-medium text-left min-w-[160px]">
                資料狀態
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind) => {
            const na = isNA(ind.latest);
            const chgCls =
              ind.chgPct === null
                ? "neu"
                : ind.chgPct > 0
                  ? "up"
                  : ind.chgPct < 0
                    ? "down"
                    : "neu";
            const chgStr =
              ind.chgPct === null
                ? "—"
                : (ind.chgPct > 0 ? "+" : "") + ind.chgPct.toFixed(2) + "%";
            const hasHistory =
              ind.history?.labels && ind.history.labels.length > 0;
            const isExpanded = expandedId === ind.id;
            const d = debugMap[ind.id] || ({} as { src?: string; api?: string; note?: string });

            return (
              <IndicatorTableRowGroup
                key={ind.id}
                ind={ind}
                na={na}
                chgCls={chgCls}
                chgStr={chgStr}
                hasHistory={!!hasHistory}
                isExpanded={isExpanded}
                onToggle={() =>
                  setExpandedId(isExpanded ? null : ind.id)
                }
                debug={debug}
                debugInfo={d}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* Single indicator row + detail row */
function IndicatorTableRowGroup({
  ind,
  na,
  chgCls,
  chgStr,
  hasHistory,
  isExpanded,
  onToggle,
  debug,
  debugInfo,
}: {
  ind: Indicator;
  na: boolean;
  chgCls: string;
  chgStr: string;
  hasHistory: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  debug: boolean;
  debugInfo: { src?: string; api?: string; note?: string };
}) {
  const api = debugInfo.api || "none";
  const typeBadgeColor = TYPE_COLORS[ind.type] || "bg-gray-100 text-gray-700";

  const apiClasses: Record<string, string> = {
    ok: "bg-[#DCFCE7] text-[#166534]",
    excel: "bg-[#DBEAFE] text-[#1E40AF]",
    none: "bg-[#FEF9C3] text-[#854D0E]",
  };

  return (
    <>
      <tr className={na ? "text-[#B8B0B0] bg-[#F5F2F2]" : undefined}>
        <td className="px-3 py-2 border-b border-[#E2D8D8] whitespace-nowrap text-center text-[#B09898]">{ind.id}</td>
        <td className="px-3 py-2 border-b border-[#E2D8D8] text-left">
          {hasHistory ? (
            <button
              className="inline-flex items-center gap-1.5 bg-transparent border-none p-0 font-inherit text-inherit text-left cursor-pointer"
              onClick={onToggle}
            >
              <span className={`text-[0.55rem] text-[#B09898] transition-transform ${isExpanded ? "rotate-90" : ""}`}>&#9654;</span>
              {ind.name}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 p-0 text-inherit text-left">
              {ind.name}
            </span>
          )}
        </td>
        <td className="px-3 py-2 border-b border-[#E2D8D8] whitespace-nowrap text-center">
          <span className={`inline-block px-2 py-0.5 rounded text-[0.72rem] font-medium ${typeBadgeColor} ${na ? "opacity-45" : ""}`}>{ind.type}</span>
        </td>
        <td className="px-3 py-2 border-b border-[#E2D8D8] whitespace-nowrap text-center">{isNA(ind.prev) ? <span className="text-[#C8C0C0]">N/A</span> : String(ind.prev)}</td>
        <td className={`px-3 py-2 border-b border-[#E2D8D8] whitespace-nowrap text-center font-bold ${na ? "text-[#B8B0B0]" : ""}`}>
          {na ? (
            <span className="text-[#C8C0C0]">N/A</span>
          ) : (
            <span className={DIR_CLASS[chgCls] || ""}>{String(ind.latest)}</span>
          )}
        </td>
        <td className={`px-3 py-2 border-b border-[#E2D8D8] whitespace-nowrap text-center ${DIR_CLASS[chgCls] || ""}`}>{chgStr}</td>
        <td className="px-3 py-2 border-b border-[#E2D8D8] whitespace-nowrap text-center">{isNA(ind.date as string) ? "—" : ind.date}</td>
        <td className="px-3 py-2 border-b border-[#E2D8D8] whitespace-nowrap text-center">{ind.nextUpdate}</td>
        {debug && (
          <td className="px-3 py-2 border-b border-[#E2D8D8] whitespace-nowrap text-left">
            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[0.7rem] font-semibold whitespace-nowrap ${apiClasses[api] || ""}`}>
              {API_LABEL[api] || api}
            </span>
            {debugInfo.src && (
              <span className="block font-mono text-[0.67rem] text-[#B09898] mt-0.5 whitespace-nowrap">{debugInfo.src}</span>
            )}
            {debugInfo.note && (
              <span className="block text-[0.67rem] text-[#D97706] mt-0.5 max-w-[180px] whitespace-normal">{debugInfo.note}</span>
            )}
          </td>
        )}
      </tr>
      {hasHistory && isExpanded && (
        <tr>
          <td
            colSpan={debug ? 9 : 8}
            className="px-4 pb-4 pl-10 bg-[#FAF7F7] border-b border-[#E2D8D8]"
          >
            <IndicatorDetailChart indicator={ind} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Main Dashboard Component ────────────────────────────────── */
export default function Dashboard() {
  const searchParams = useSearchParams();
  const debug = searchParams.has("debug");

  /* ── State ──────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [dvData, setDvData] = useState<DvData | null>(null);

  // Dollar Volume controls
  const [dvDays, setDvDays] = useState<"1" | "5" | "10">("10");
  const [dvSortCol, setDvSortCol] = useState("dollar_volume");
  const [dvSortAsc, setDvSortAsc] = useState(false);
  const [dvHideEtf, setDvHideEtf] = useState(true);

  // News
  const [newsItems, setNewsItems] = useState<import("@/app/components/news/types").NewsItem[]>([]);

  /* ── Data fetching ──────────────────────────────────────────── */
  useEffect(() => {
    fetch("/data/command-center/data.json")
      .then((r) => r.json())
      .then((d: ReportData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Market data with 30-minute auto-refresh
  const loadMarket = useCallback(() => {
    fetch("/data/command-center/market.json?_=" + Date.now())
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: MarketData) => setMarketData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMarket();
    const interval = setInterval(loadMarket, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadMarket]);

  // Dollar Volume data
  useEffect(() => {
    fetch("/data/command-center/dollar_volume.json?_=" + Date.now())
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: DvData) => setDvData(d))
      .catch(() => {});
  }, []);

  // News data
  useEffect(() => {
    fetch("/data/command-center/news.json?_=" + Date.now())
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: { items: import("./types").NewsItem[] }) => setNewsItems(d.items || []))
      .catch(() => {});
  }, []);

  /* ── Dollar Volume computed ─────────────────────────────────── */
  const dvRows = (() => {
    if (!dvData?.timeframes[dvDays]) return [];
    let rows = [...dvData.timeframes[dvDays].rankings];
    if (dvHideEtf) rows = rows.filter((r) => !r.is_etf);
    rows = rows.slice(0, 20);

    rows.sort((a, b) => {
      const va = a[dvSortCol as keyof DvRanking];
      const vb = b[dvSortCol as keyof DvRanking];
      if (
        dvSortCol === "ticker" ||
        dvSortCol === "is_etf" ||
        dvSortCol === "industry"
      ) {
        const sa =
          dvSortCol === "is_etf"
            ? a.is_etf
              ? "ETF"
              : "Stock"
            : String(va || "");
        const sb =
          dvSortCol === "is_etf"
            ? b.is_etf
              ? "ETF"
              : "Stock"
            : String(vb || "");
        return dvSortAsc ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }
      return dvSortAsc
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });

    return rows;
  })();

  const dvPeriod = dvData?.timeframes[dvDays]?.period || "";

  const DV_COL_LABELS: Record<string, string> = {
    rank: "#",
    ticker: "Ticker",
    industry: "Industry",
    last_price: "Price",
    total_volume: "Vol",
    dollar_volume: "$ Vol",
    avg_daily_dv: "Avg/Day",
    is_etf: "Type",
  };

  const dvColumns = [
    { col: "rank", type: "num" },
    { col: "ticker", type: "str" },
    { col: "industry", type: "str" },
    { col: "last_price", type: "num" },
    { col: "total_volume", type: "num" },
    { col: "dollar_volume", type: "num" },
    { col: "avg_daily_dv", type: "num" },
    { col: "is_etf", type: "str" },
  ];

  function handleDvSort(col: string, type: string) {
    if (col === dvSortCol) {
      setDvSortAsc(!dvSortAsc);
    } else {
      setDvSortCol(col);
      setDvSortAsc(type === "str");
    }
  }

  /* ── Render nothing while loading ───────────────────────────── */
  if (loading || !data) {
    return (
      <div className="fixed inset-0 bg-[#F8F4F4] flex flex-col items-center justify-center gap-4 z-[9999] text-[0.9rem] text-[#7A5860]">
        <div className="w-9 h-9 border-[3px] border-[#E2D8D8] border-t-[#C02734] rounded-full animate-spin" />
        <span>資料載入中…</span>
      </div>
    );
  }

  const {
    REPORT_DATE,
    REPORT_WEEK,
    dataFreshness,
    yieldCurveData,
    fedFundsRate,
    inflationData,
    employmentData,
    leadingIndicators,
    riskIndicators,
  } = data;

  /* ── Unemployment chart datasets ────────────────────────────── */
  const unempDatasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    tension: number;
    yAxisID: string;
    fill: boolean;
  }> = [
    {
      label: "失業率 %",
      data: employmentData.unemployRate,
      borderColor: "#fc8181",
      tension: 0.3,
      yAxisID: "y",
      fill: false,
    },
  ];
  if (employmentData.avgHourlyEarningsYoY != null) {
    unempDatasets.push({
      label: "平均時薪 YoY %",
      data: employmentData.avgHourlyEarningsYoY,
      borderColor: "#68d391",
      tension: 0.3,
      yAxisID: "y2",
      fill: false,
    });
  }

  /* ── Market table rows ──────────────────────────────────────── */
  const marketFetchedAt = marketData?.fetched_at
    ? new Date(marketData.fetched_at).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false,
      })
    : "";

  return (
    <div className="font-['Helvetica_Neue',Arial,'PingFang_TC','Noto_Sans_TC',sans-serif] bg-[#F8F4F4] text-[#2C1517] leading-relaxed min-h-screen">
      <div className="max-w-[1280px] mx-auto px-6 py-8 pb-16">
        {/* Back link */}
        <Link
          href="/"
          className="inline-block mb-3 text-[#C02734] no-underline text-[0.85rem] font-semibold opacity-70"
        >
          &larr; Portal
        </Link>

        {/* ── Header ──────────────────────────────────────────── */}
        <header className="flex justify-between items-end border-b-2 border-[#C02734] pb-5 mb-8">
          <div>
            <h1 className="text-[1.8rem] font-bold tracking-wide">
              Command <span className="text-[#C02734]">Center</span>
              {debug && <span className="inline-flex items-center gap-1 bg-[#D97706] text-white text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded ml-2 align-middle">&#9873; debug</span>}
            </h1>
          </div>
          <div className="text-right text-[0.85rem] text-[#7A5860]">
            <div>
              <strong className="text-[#2C1517]">{REPORT_WEEK}</strong>
            </div>
            <div>{REPORT_DATE}</div>
          </div>
        </header>

        {/* ── Debug banner ────────────────────────────────────── */}
        {debug && (
          <div className="flex items-start gap-4 bg-[#FFFBEB] border-[1.5px] border-dashed border-[#D97706] rounded-lg px-5 py-3.5 mb-7 text-[0.85rem] text-[#78350F]">
            <div>&#9873;</div>
            <div>
              <strong className="block text-[#92400E] text-[0.9rem] mb-0.5">DEBUG MODE 已啟用</strong>
              各 section 下方顯示標註訊息，風險指標表格顯示資料來源與 API
              狀態。 關閉：移除網址中的 <code>?debug</code> 參數。
            </div>
          </div>
        )}

        {/* ── Section 01: News ────────────────────────────────── */}
        <section id="sec-news" className="mb-12">
          <div className="text-lg font-semibold uppercase tracking-wide text-[#C02734] border-l-[3px] border-[#C02734] pl-3 mb-5">01 &middot; News</div>
          {debug && <DebugSectionNotes sectionId="sec-news" />}
          <NewsTable items={newsItems} />
        </section>

        {/* ── Section 02: Macro ───────────────────────────────── */}
        <section id="sec-macro" className="mb-12">
          <div className="text-lg font-semibold uppercase tracking-wide text-[#C02734] border-l-[3px] border-[#C02734] pl-3 mb-5">02 &middot; 通膨 &middot; 利率 &middot; 就業</div>
          {debug && <DebugSectionNotes sectionId="sec-inflation" />}
          {debug && <DebugSectionNotes sectionId="sec-rates" />}
          {debug && <DebugSectionNotes sectionId="sec-employment" />}

          {/* Inflation charts */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(480px,1fr))]">
            {/* CPI chart */}
            <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative">
              <h3 className="text-[0.88rem] text-[#2C1517] font-semibold mb-3">
                CPI YoY vs Core CPI YoY（%）
                <UpdateChip date={dataFreshness?.cpi} />
              </h3>
              <LatestVals
                items={[
                  {
                    label: "CPI YoY",
                    value: inflationData.cpiYoY.at(-1) ?? null,
                    color: "#fc8181",
                  },
                  {
                    label: "Core CPI YoY",
                    value: inflationData.coreYoY.at(-1) ?? null,
                    color: "#fbd38d",
                  },
                ]}
              />
              <Line
                data={{
                  labels: inflationData.labels,
                  datasets: [
                    {
                      label: "CPI YoY",
                      data: inflationData.cpiYoY,
                      borderColor: "#fc8181",
                      tension: 0.3,
                      fill: false,
                    },
                    {
                      label: "Core CPI YoY",
                      data: inflationData.coreYoY,
                      borderColor: "#fbd38d",
                      tension: 0.3,
                      fill: false,
                    },
                  ],
                }}
                options={CHART_DEFAULTS}
              />
            </div>

            {/* PCE chart */}
            <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative">
              <h3 className="text-[0.88rem] text-[#2C1517] font-semibold mb-3">
                PCE YoY vs Core PCE YoY（%）
                <UpdateChip date={dataFreshness?.pce} />
              </h3>
              <LatestVals
                items={[
                  {
                    label: "PCE YoY",
                    value: inflationData.pceYoY.at(-1) ?? null,
                    color: "#68d391",
                  },
                  {
                    label: "Core PCE YoY",
                    value: inflationData.corePce.at(-1) ?? null,
                    color: "#76e4f7",
                  },
                ]}
              />
              <Line
                data={{
                  labels: inflationData.labels,
                  datasets: [
                    {
                      label: "PCE YoY",
                      data: inflationData.pceYoY,
                      borderColor: "#68d391",
                      tension: 0.3,
                      fill: false,
                    },
                    {
                      label: "Core PCE YoY",
                      data: inflationData.corePce,
                      borderColor: "#76e4f7",
                      tension: 0.3,
                      fill: false,
                    },
                  ],
                }}
                options={CHART_DEFAULTS}
              />
            </div>
          </div>
          <p className="text-[0.78rem] text-[#B09898] mt-2">
            ※ X 軸為數據統計月份（非發布月份），通常落後發布約 1 個月
          </p>

          {/* Fed Funds Rate card */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] mt-6 mb-4">
            <div className="bg-white border border-[#E2D8D8] rounded-lg px-5 py-4 shadow-[0_1px_3px_rgba(44,21,23,0.06)]">
              <div className="text-xs text-[#7A5860] uppercase tracking-wider">
                Fed Funds Rate
                <UpdateChip date={dataFreshness?.ffr} />
              </div>
              <div className="text-[1.6rem] font-bold mt-1 text-[#B07A20]">
                {fedFundsRate.current != null
                  ? fedFundsRate.current.toFixed(2) + "%"
                  : "N/A"}
              </div>
              <div className="text-sm text-[#7A5860] mt-0.5">
                Target: {fedFundsRate.target ?? "N/A"}
              </div>
            </div>
          </div>

          {/* Yield Curve chart */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(480px,1fr))]">
            <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative">
              <h3 className="text-[0.88rem] text-[#2C1517] font-semibold mb-3">美債殖利率曲線（本週 vs 上週）</h3>
              <LatestVals
                items={[
                  {
                    label: "2Y",
                    value: yieldCurveData.current[4],
                    color: "#63b3ed",
                  },
                  {
                    label: "10Y",
                    value: yieldCurveData.current[6],
                    color: "#63b3ed",
                  },
                  {
                    label: "10Y-2Y",
                    value:
                      yieldCurveData.current[6] - yieldCurveData.current[4],
                    color: "#718096",
                    fmt: (v) => (v >= 0 ? "+" : "") + v.toFixed(2) + "%",
                  },
                ]}
              />
              <Line
                data={{
                  labels: yieldCurveData.labels,
                  datasets: [
                    {
                      label: "本週",
                      data: yieldCurveData.current,
                      borderColor: "#63b3ed",
                      tension: 0.3,
                      fill: false,
                    },
                    {
                      label: "上週",
                      data: yieldCurveData.prevWeek,
                      borderColor: "#718096",
                      borderDash: [4, 3],
                      tension: 0.3,
                      fill: false,
                    },
                  ],
                }}
                options={CHART_DEFAULTS}
              />
            </div>
          </div>

          {/* JOLTS card */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] mt-6 mb-4">
            <div className="bg-white border border-[#E2D8D8] rounded-lg px-5 py-4 shadow-[0_1px_3px_rgba(44,21,23,0.06)]">
              <div className="text-xs text-[#7A5860] uppercase tracking-wider">JOLTS（百萬）</div>
              <div className="text-[1.6rem] font-bold mt-1 text-[#B07A20]">
                {employmentData.joltsCurrent != null
                  ? employmentData.joltsCurrent.toFixed(2) + "M"
                  : "N/A"}
              </div>
            </div>
          </div>

          {/* NFP + Unemployment charts */}
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(480px,1fr))]">
            <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative">
              <h3 className="text-[0.88rem] text-[#2C1517] font-semibold mb-3">
                非農就業（千人）
                <UpdateChip date={dataFreshness?.nfp} />
              </h3>
              <LatestVals
                items={[
                  {
                    label: "NFP",
                    value: employmentData.nfp.at(-1) ?? null,
                    color: "#63b3ed",
                    fmt: (v) => (v > 0 ? "+" : "") + Math.round(v) + "K",
                  },
                ]}
              />
              <Bar
                data={{
                  labels: employmentData.labels,
                  datasets: [
                    {
                      label: "NFP (K)",
                      data: employmentData.nfp,
                      backgroundColor: "#63b3ed",
                    },
                  ],
                }}
                options={CHART_DEFAULTS}
              />
            </div>

            <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative">
              <h3 className="text-[0.88rem] text-[#2C1517] font-semibold mb-3">
                失業率（%）&amp; 平均時薪年增（%）
                <UpdateChip date={dataFreshness?.unemployment} />
              </h3>
              <LatestVals
                items={[
                  {
                    label: "失業率",
                    value: employmentData.unemployRate.at(-1) ?? null,
                    color: "#fc8181",
                  },
                  ...(employmentData.avgHourlyEarningsYoY != null
                    ? [
                        {
                          label: "時薪 YoY",
                          value:
                            employmentData.avgHourlyEarningsYoY.at(-1) ?? null,
                          color: "#68d391",
                        },
                      ]
                    : []),
                ]}
              />
              <Line
                data={{
                  labels: employmentData.labels,
                  datasets: unempDatasets,
                }}
                options={{
                  ...CHART_DEFAULTS,
                  scales: {
                    x: {
                      ticks: { color: "#7A5860" },
                      grid: { color: "#EDE5E5" },
                    },
                    y: {
                      ticks: { color: "#7A5860" },
                      grid: { color: "#EDE5E5" },
                      position: "left" as const,
                    },
                    y2: {
                      ticks: { color: "#7A5860" },
                      grid: { display: false },
                      position: "right" as const,
                    },
                  },
                }}
              />
            </div>
          </div>
        </section>

        {/* ── Section 03: Equity ──────────────────────────────── */}
        <section id="sec-equity" className="mb-12">
          <div className="text-lg font-semibold uppercase tracking-wide text-[#C02734] border-l-[3px] border-[#C02734] pl-3 mb-5">03 &middot; 股市指數</div>
          {debug && <DebugSectionNotes sectionId="sec-equity" />}

          {/* TradingView widgets */}
          <div className="mb-4">
            <div className="bg-white border border-[#E2D8D8] rounded-lg shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative p-0 overflow-hidden h-[480px]">
              <TradingViewWidget symbol="OANDA:SPX500USD" />
            </div>
          </div>

          {/* ETF tracking table */}
          <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[0.82rem] font-semibold text-[#2C1517]">
                以 ETF 追蹤（DIA / SPY / QQQ / IWM / UUP）&middot; 每 30 分鐘自動更新
              </span>
              <span className="text-[0.75rem] text-[#B09898]">
                {marketFetchedAt && `更新：${marketFetchedAt}`}
              </span>
            </div>
            <table className="w-full border-collapse text-[0.88rem]">
              <thead>
                <tr>
                  <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-left">ETF</th>
                  <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-left">追蹤指數</th>
                  <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-left">ETF 價格</th>
                  <th className="px-3 py-2 bg-[#F8F4F4] text-[#7A5860] text-xs uppercase border-b border-[#E2D8D8] text-left">日漲跌 %</th>
                </tr>
              </thead>
              <tbody>
                {marketData?.indices && marketData.indices.length > 0 ? (
                  marketData.indices.map((idx: MarketIndex) => {
                    const cls =
                      idx.change_pct > 0
                        ? "up"
                        : idx.change_pct < 0
                          ? "down"
                          : "neu";
                    const sign = idx.change_pct > 0 ? "+" : "";
                    return (
                      <tr key={idx.symbol}>
                        <td className="px-3 py-2 border-b border-[#E2D8D8]">
                          <strong>{idx.symbol}</strong>
                        </td>
                        <td className="px-3 py-2 border-b border-[#E2D8D8]">{idx.name}</td>
                        <td className="px-3 py-2 border-b border-[#E2D8D8]">
                          {idx.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className={`px-3 py-2 border-b border-[#E2D8D8] ${DIR_CLASS[cls] || ""}`}>
                          {sign}
                          {idx.change_pct.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-2 border-b border-[#E2D8D8] text-center">
                      <span className="text-[#C8C0C0]">N/A</span> 股市指數數據
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Dollar Volume Top 20 */}
          <div className="bg-white border border-[#E2D8D8] rounded-lg p-5 shadow-[0_1px_3px_rgba(44,21,23,0.06)] relative mt-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <span className="relative cursor-help group text-[0.82rem] font-semibold text-[#2C1517]">
                  Dollar Volume Top 20
                  <span className="hidden group-hover:block absolute bottom-full left-0 bg-[#2D3748] text-white px-3 py-2 rounded-md text-xs font-normal w-max max-w-[340px] z-10 leading-relaxed">
                    Dollar Volume = Daily Close Price &times; Daily Volume，逐日加總。
                    <br />
                    資料來源：Finviz（候選池）+ Yahoo Finance（歷史價量）。
                    <br />
                    排名取 volume 前 400 支標的計算。
                  </span>
                </span>
                <div className="inline-flex gap-0.5 bg-[#EDF2F7] rounded-[5px] p-0.5">
                  {(["1", "5", "10"] as const).map((d) => (
                    <button
                      key={d}
                      className={`border-none bg-transparent px-2.5 py-0.5 text-[0.76rem] font-semibold cursor-pointer rounded text-[#4A5568] ${dvDays === d ? "bg-white shadow-sm !text-[#C02734]" : ""}`}
                      onClick={() => setDvDays(d)}
                    >
                      {d}D
                    </button>
                  ))}
                </div>
                <button
                  className={`border border-[#CBD5E0] bg-white px-2.5 py-0.5 text-[0.76rem] font-semibold cursor-pointer rounded text-[#4A5568] ${!dvHideEtf ? "!bg-[#C02734] !text-white !border-[#C02734]" : ""}`}
                  onClick={() => setDvHideEtf(!dvHideEtf)}
                >
                  ETF
                </button>
              </div>
              <span className="text-[0.75rem] text-[#B09898]">
                {dvPeriod}
              </span>
            </div>
            <table className="w-full border-collapse text-[0.88rem]">
              <thead>
                <tr>
                  {dvColumns.map(({ col, type }) => {
                    const isActive = col === dvSortCol;
                    const base = DV_COL_LABELS[col] || col;
                    const label = isActive
                      ? base + (dvSortAsc ? " \u25B2" : " \u25BC")
                      : base;
                    return (
                      <th
                        key={col}
                        className={`px-3 py-2 bg-[#F8F4F4] text-xs uppercase border-b border-[#E2D8D8] text-left cursor-pointer select-none hover:text-[#C02734] ${isActive ? "text-[#C02734]" : "text-[#7A5860]"}`}
                        onClick={() => handleDvSort(col, type)}
                      >
                        {label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {dvRows.length > 0 ? (
                  dvRows.map((item, i) => (
                    <tr key={item.ticker + "-" + i}>
                      <td className="px-3 py-2 border-b border-[#E2D8D8] text-center text-[#B09898]">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 border-b border-[#E2D8D8]">
                        <div className="flex items-center gap-1.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="w-5 h-5 rounded-full object-cover"
                            src={`https://assets.parqet.com/logos/symbol/${item.ticker}`}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                          <strong>{item.ticker}</strong>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-b border-[#E2D8D8] text-xs text-[#7A5860] max-w-[160px] whitespace-nowrap overflow-hidden text-ellipsis">
                        {item.industry || "—"}
                      </td>
                      <td className="px-3 py-2 border-b border-[#E2D8D8]">
                        {item.last_price.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-3 py-2 border-b border-[#E2D8D8]">{fmtLargeNum(item.total_volume)}</td>
                      <td className="px-3 py-2 border-b border-[#E2D8D8]">{fmtDollarLarge(item.dollar_volume)}</td>
                      <td className="px-3 py-2 border-b border-[#E2D8D8]">{fmtDollarLarge(item.avg_daily_dv)}</td>
                      <td className="px-3 py-2 border-b border-[#E2D8D8] text-[0.75rem] text-[#B09898]">
                        {item.is_etf ? "ETF" : "Stock"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-2 border-b border-[#E2D8D8] text-center">
                      Dollar Volume 數據尚未載入
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 04: Leading Indicators ──────────────────── */}
        <section id="sec-leading" className="mb-12">
          <div className="text-lg font-semibold uppercase tracking-wide text-[#C02734] border-l-[3px] border-[#C02734] pl-3 mb-5">04 &middot; 先期指標</div>
          {debug && <DebugSectionNotes sectionId="sec-leading" />}
          <IndicatorTable
            indicators={leadingIndicators}
            sectionId="sec-leading"
            debug={debug}
          />
        </section>

        {/* ── Section 05: Risk Indicators ─────────────────────── */}
        <section id="sec-risk" className="mb-12">
          <div className="text-lg font-semibold uppercase tracking-wide text-[#C02734] border-l-[3px] border-[#C02734] pl-3 mb-5">05 &middot; 風險指標</div>
          {debug && <DebugSectionNotes sectionId="sec-risk" />}
          <IndicatorTable
            indicators={riskIndicators}
            sectionId="sec-risk"
            debug={debug}
          />
        </section>

        {/* ── Section 06: Industry Map ────────────────────────── */}
        <section id="sec-industry" className="mb-12">
          <div className="text-lg font-semibold uppercase tracking-wide text-[#C02734] border-l-[3px] border-[#C02734] pl-3 mb-5">06 &middot; 產業領域</div>
          <div className="flex items-stretch">
            {INDUSTRY_MAP.map((sector, sIdx) => (
              <IndustryMapSector key={sector.titleEn} sector={sector} index={sIdx} total={INDUSTRY_MAP.length} />
            ))}
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="border-t border-[#E2D8D8] pt-4 text-[0.75rem] text-[#B09898]">
          Data sources: CME FedWatch &middot; BLS &middot; FRED &middot; FinViz
          &middot; Fintel &middot; barchart
        </footer>
      </div>
    </div>
  );
}

/* ── Industry Map Sector component ───────────────────────────── */
function IndustryMapSector({
  sector,
  index,
  total,
}: {
  sector: (typeof INDUSTRY_MAP)[number];
  index: number;
  total: number;
}) {
  return (
    <>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="text-center px-1.5 pb-3.5">
          <div className="text-lg font-bold text-[#2C1517]">{sector.titleEn}</div>
          <div className="text-[0.83rem] text-[#7A5860] mt-0.5">{sector.titleZh}</div>
        </div>
        <div className="flex-1 flex rounded-lg overflow-hidden border-[1.5px] border-[#E2D8D8]">
          {/* In Pool */}
          <div className="flex-1 px-2.5 py-3 pt-3 flex flex-col gap-3.5 bg-[rgba(99,179,237,0.1)] border-r-[1.5px] border-[#E2D8D8]">
            <div className="text-[0.68rem] font-bold text-[#7A5860] uppercase tracking-wider text-center pb-1.5 border-b border-[#E2D8D8]">In Pool</div>
            {sector.inPool.map((group) => (
              <div className="flex flex-col gap-1.5" key={group.cat}>
                <span className="block bg-[#3D4B5C] text-white text-[0.8rem] font-semibold px-2 py-1 rounded-[5px] text-center">{group.cat}</span>
                <div className="flex flex-col gap-[0.28rem]">
                  {group.tickers.map((t) => (
                    <span className="inline-block bg-white text-[#2C1517] text-xs font-bold font-mono px-2 py-0.5 rounded border border-[#E2D8D8] w-fit hover:shadow-md hover:border-[#63B3ED] transition-all" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Observe */}
          <div className="flex-1 px-2.5 py-3 pt-3 flex flex-col gap-3.5 bg-[rgba(160,174,192,0.08)]">
            <div className="text-[0.68rem] font-bold text-[#7A5860] uppercase tracking-wider text-center pb-1.5 border-b border-[#E2D8D8]">Observe</div>
            {sector.observe.map((group) => (
              <div className="flex flex-col gap-1.5" key={group.cat}>
                <span className="block bg-[#3D4B5C] text-white text-[0.8rem] font-semibold px-2 py-1 rounded-[5px] text-center">{group.cat}</span>
                <div className="flex flex-col gap-[0.28rem]">
                  {group.tickers.map((t) => (
                    <span className="inline-block bg-white text-[#2C1517] text-xs font-bold font-mono px-2 py-0.5 rounded border border-[#E2D8D8] w-fit hover:shadow-md hover:border-[#63B3ED] transition-all" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Arrow between sectors */}
      {index < total - 1 && (
        <div className="flex-[0_0_46px] flex items-center justify-center pt-16">
          <svg width="36" height="60" viewBox="0 0 36 60" fill="none">
            <path
              d="M4 5 L32 30 L4 55"
              stroke="#E2D8D8"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </>
  );
}
