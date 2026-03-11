// ============================================================
// AlphaDash — Data Layer
// 來源：總股本.csv + 日記帳.csv，截至 2026-02-13
// ============================================================

export interface Account {
  id: string;
  name: string;
  initial_capital: number;
  cash: number;
  realized_pnl: { trading: number; interest: number; dividend: number };
}

export interface Stock {
  name: string;
  price: number;
  sector: string;
  live?: boolean;
}

export interface Holding {
  acc: string;
  code: string;
  qty: number;
  avg_cost: number;
}

export interface Transaction {
  id: string;
  acc: string;
  code: string;
  dir: "buy" | "sell";
  type: "open" | "close";
  qty: number;
  price: number;
  date: string;
  fee: number;
  rpnl: number | null;
}

export interface Dividend {
  acc: string;
  code: string;
  amount: number;
  date: string;
}

export interface DailyPnlRecord {
  date: string;
  daily: number;
  cumulative: number;
}

export const ACCOUNTS: Account[] = [
  {
    id: "ACC-A",
    name: "上海-A",
    initial_capital: 500000,
    cash: 187735,
    realized_pnl: { trading: -70658.54, interest: 220, dividend: 115 },
  },
  {
    id: "ACC-B",
    name: "元大-B",
    initial_capital: 200000,
    cash: 176340,
    realized_pnl: { trading: 0, interest: 100, dividend: 0 },
  },
];

export const STOCKS: Record<string, Stock> = {
  QQQ: { name: "QQQ (Nasdaq ETF)", price: 180, sector: "ETF" },
  MU: { name: "Micron Technology", price: 420, sector: "半導體" },
};

export const HOLDINGS: Holding[] = [
  { acc: "ACC-A", code: "QQQ", qty: 400, avg_cost: 264.8537 },
  { acc: "ACC-B", code: "MU", qty: 380, avg_cost: 420.4211 },
];

export const TRANSACTIONS: Transaction[] = [
  { id: "T001", acc: "ACC-A", code: "QQQ", dir: "buy", type: "open", qty: 680, price: 260, date: "2025-12-10", fee: 250, rpnl: null },
  { id: "T002", acc: "ACC-A", code: "QQQ", dir: "buy", type: "open", qty: 550, price: 270, date: "2025-12-12", fee: 220, rpnl: null },
  { id: "T003", acc: "ACC-B", code: "MU", dir: "buy", type: "open", qty: 380, price: 420, date: "2026-02-12", fee: 160, rpnl: null },
  { id: "T004", acc: "ACC-A", code: "QQQ", dir: "sell", type: "close", qty: 830, price: 180, date: "2026-02-13", fee: 230, rpnl: -70658.54 },
];

export const DIVIDENDS: Dividend[] = [
  { acc: "ACC-A", code: "QQQ", amount: 115, date: "2026-02-05" },
];

// ── Daily P&L time-series (deterministic LCG) ──

function getBusinessDays(startStr: string, endStr: string): string[] {
  const days: string[] = [];
  const d = new Date(startStr + "T00:00:00");
  const e = new Date(endStr + "T00:00:00");
  while (d <= e) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function generateDailyPnl(): Record<string, DailyPnlRecord[]> {
  const days = getBusinessDays("2025-12-01", "2026-02-28");
  const cfg: Record<string, [number, number]> = {
    "ACC-A": [-1500, 8000],
    "ACC-B": [0, 500],
  };
  const result: Record<string, DailyPnlRecord[]> = {};
  ACCOUNTS.forEach((a) => {
    let cumPnl = 0;
    let s = ((a.id.charCodeAt(3) * 1000 + a.id.charCodeAt(4) * 7) >>> 0);
    const rand = () => {
      s = (Math.imul(s ^ (s >>> 13), 1664525) + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const [trend, vol] = cfg[a.id] || [3000, 8000];
    result[a.id] = days.map((date) => {
      const daily = Math.round(trend + (rand() - 0.46) * vol * 2);
      cumPnl += daily;
      return { date, daily, cumulative: cumPnl };
    });
  });
  return result;
}

// ── Computed helpers ──

export function getAccountObj(id: string): Account | undefined {
  return ACCOUNTS.find((a) => a.id === id);
}

export function computeRealized(account: Account, type: string): number {
  const rp = account.realized_pnl;
  if (type === "trading") return rp.trading;
  if (type === "interest") return rp.interest;
  if (type === "dividend") return rp.dividend;
  return rp.trading + rp.interest + rp.dividend;
}

export interface Summary {
  cash: number;
  mktVal: number;
  unrealized: number;
  realized: number;
  realizedAll: number;
  capital: number;
  costBasis: number;
  nav: number;
  totalPnl: number;
  retRate: number;
}

export function computeSummary(accFilter: string, realizedType?: string): Summary {
  const accs = accFilter === "ALL" ? ACCOUNTS : ACCOUNTS.filter((a) => a.id === accFilter);
  let cash = 0, mktVal = 0, unrealized = 0, realized = 0, realizedAll = 0, capital = 0, costBasis = 0;
  accs.forEach((a) => {
    cash += a.cash;
    capital += a.initial_capital;
    realized += computeRealized(a, realizedType || "ALL");
    realizedAll += computeRealized(a, "ALL");
    HOLDINGS.filter((h) => h.acc === a.id).forEach((h) => {
      const s = STOCKS[h.code];
      if (!s) return;
      mktVal += h.qty * s.price;
      unrealized += (s.price - h.avg_cost) * h.qty;
      costBasis += h.qty * h.avg_cost;
    });
  });
  const nav = cash + mktVal;
  const totalPnl = unrealized + realizedAll;
  const retRate = capital > 0 ? (totalPnl / capital) * 100 : 0;
  return { cash, mktVal, unrealized, realized, realizedAll, capital, costBasis, nav, totalPnl, retRate };
}

export function computePieData(accFilter: string, groupBy: string) {
  if (groupBy === "account" && accFilter === "ALL") {
    const labels: string[] = [];
    const values: number[] = [];
    ACCOUNTS.forEach((a) => {
      let nav = a.cash;
      HOLDINGS.filter((h) => h.acc === a.id).forEach((h) => {
        const s = STOCKS[h.code];
        if (s) nav += h.qty * s.price;
      });
      labels.push(a.name);
      values.push(nav);
    });
    return { labels, values };
  }
  const accIds = accFilter === "ALL" ? ACCOUNTS.map((a) => a.id) : [accFilter];
  const stockMap: Record<string, number> = {};
  let totalCash = 0;
  accIds.forEach((id) => {
    const a = getAccountObj(id);
    if (a) totalCash += a.cash;
    HOLDINGS.filter((h) => h.acc === id).forEach((h) => {
      const s = STOCKS[h.code];
      if (!s) return;
      const key = `${h.code} ${s.name}`;
      stockMap[key] = (stockMap[key] || 0) + h.qty * s.price;
    });
  });
  return { labels: [...Object.keys(stockMap), "現金"], values: [...Object.values(stockMap), totalCash] };
}

export function computeLineData(
  accFilter: string,
  dateRange: string,
  trendType: string,
  dailyPnl: Record<string, DailyPnlRecord[]>
) {
  const accIds = accFilter === "ALL" ? ACCOUNTS.map((a) => a.id) : [accFilter];
  const now = new Date("2026-02-28T00:00:00");
  let startDate = new Date("2025-12-01T00:00:00");
  if (dateRange === "1M") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 1);
  } else if (dateRange === "3M") {
    startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 3);
  } else if (dateRange === "YTD") {
    startDate = new Date("2026-01-01T00:00:00");
  }
  const startStr = startDate.toISOString().slice(0, 10);
  const COLORS = ["#1a3a6b", "#28a745", "#fd7e14", "#6f42c1", "#17a2b8"];

  const refData = dailyPnl[accIds[0]] || [];
  const labels = refData.filter((d) => d.date >= startStr).map((d) => d.date);
  const datasets = accIds.map((id, i) => {
    const a = getAccountObj(id);
    const rows = (dailyPnl[id] || []).filter((d) => d.date >= startStr);
    return {
      label: a ? a.name : id,
      data: rows.map((d) => (trendType === "daily" ? d.daily : d.cumulative)),
      borderColor: COLORS[i % COLORS.length],
      backgroundColor: COLORS[i % COLORS.length] + "22",
      tension: 0.35,
      pointRadius: 0,
      borderWidth: 2,
      fill: accIds.length === 1,
    };
  });
  return { labels, datasets };
}

// ── Formatting ──

export const fmt = (n: number | null) =>
  n == null ? "-" : Math.round(n).toLocaleString("zh-TW");

export const fmtP = (n: number | null) =>
  n == null ? "-" : (n >= 0 ? "+" : "") + n.toFixed(2) + "%";

export const cls = (n: number) =>
  n > 0 ? "positive" : n < 0 ? "negative" : "neutral";

export const sgn = (n: number) => (n > 0 ? "+" : "");

// ── Real-time price fetch ──

export async function fetchRealtimePrices(): Promise<number> {
  const symbols = Object.keys(STOCKS);
  let hitCount = 0;

  await Promise.all(
    symbols.map(async (symbol) => {
      const base = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      let price: number | null = null;
      try {
        const r = await fetch(base, { cache: "no-cache" });
        if (r.ok) {
          const d = await r.json();
          price = d.chart.result[0].meta.regularMarketPrice;
        }
      } catch {}
      if (price === null) {
        try {
          const r = await fetch("https://corsproxy.io/?" + encodeURIComponent(base), { cache: "no-cache" });
          if (r.ok) {
            const d = await r.json();
            price = d.chart.result[0].meta.regularMarketPrice;
          }
        } catch {}
      }
      if (price !== null) {
        STOCKS[symbol].price = price;
        STOCKS[symbol].live = true;
        hitCount++;
      }
    })
  );

  return hitCount;
}
