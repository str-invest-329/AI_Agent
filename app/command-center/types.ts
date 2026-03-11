import type { NewsItem } from "@/app/components/news/types";
export type { NewsItem };

export interface ReportData {
  REPORT_DATE: string;
  REPORT_WEEK: string;
  dataFreshness: Record<string, string>;
  yieldCurveData: {
    labels: string[];
    current: number[];
    prevWeek: number[];
  };
  fedFundsRate: {
    current: number | null;
    target: string;
  };
  inflationData: {
    labels: string[];
    cpiYoY: number[];
    coreYoY: number[];
    pceYoY: number[];
    corePce: number[];
  };
  employmentData: {
    labels: string[];
    nfp: number[];
    unemployRate: number[];
    avgHourlyEarningsYoY: number[] | null;
    joltsCurrent: number | null;
  };
  equityData: {
    indices: { name: string; value: number; chgPct: number }[];
  };
  leadingIndicators: Indicator[];
  riskIndicators: Indicator[];
  newsItems: NewsItem[];
}

export interface Indicator {
  id: number;
  name: string;
  type: string;
  prev: string | number | null;
  latest: string | number | null;
  chgPct: number | null;
  date: string;
  nextUpdate: string;
  history?: { labels: string[]; values: number[] };
}

export interface MarketIndex {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
}

export interface MarketData {
  indices: MarketIndex[];
  fetched_at: string;
}

export interface DvRanking {
  rank: number;
  ticker: string;
  industry: string;
  last_price: number;
  total_volume: number;
  dollar_volume: number;
  avg_daily_dv: number;
  is_etf: boolean;
}

export interface DvTimeframe {
  period: string;
  rankings: DvRanking[];
}

export interface DvData {
  timeframes: Record<string, DvTimeframe>;
}

export const DEBUG_NOTES: Record<string, {
  notes?: { level: string; msg: string }[];
  indicators?: Record<number, { src: string; api: string; note: string }>;
}> = {
  "sec-rates": { notes: [] },
  "sec-inflation": {
    notes: [{ level: "info", msg: "CPI / PCE 數據已自動從 FRED 填入" }],
  },
  "sec-employment": {
    notes: [
      { level: "warn", msg: "employmentData.avgHourlyEarningsYoY：未設 API，請手動填入" },
      { level: "warn", msg: "employmentData.joltsCurrent：JOLTS 未設 API，請手動填入" },
    ],
  },
  "sec-equity": {
    notes: [{ level: "warn", msg: "股市指數 / SPX 週線：無 API，請手動填入 equityData" }],
  },
  "sec-leading": {
    notes: [{ level: "warn", msg: "以下指標無 API 或資料缺失（id: 7, 9, 15, 16），顯示 '—'，請手動填入" }],
    indicators: {
      1: { src: "FRED / A191RL1Q225SBEA", api: "ok", note: "BEA 初估值，後續有修訂" },
      2: { src: "FRED / FEDFUNDS", api: "ok", note: "" },
      3: { src: "FRED / PCEPI", api: "ok", note: "" },
      4: { src: "FRED / PCEPILFE", api: "ok", note: "" },
      5: { src: "FRED / CPIAUCSL", api: "ok", note: "" },
      6: { src: "FRED / CPILFESL", api: "ok", note: "" },
      7: { src: "ISM 官網", api: "none", note: "ISM 付費授權，FRED 無收錄，需手動填入" },
      8: { src: "FRED / VIXCLS", api: "ok", note: "" },
      9: { src: "CBOE 官網", api: "none", note: "無 FRED API，需手動填入" },
      10: { src: "FRED / USALOLITONOSTSAM", api: "ok", note: "資料可能落後數月" },
      11: { src: "FRED / BSCICP03USM665S", api: "ok", note: "資料可能落後數月" },
      12: { src: "FRED / CP", api: "ok", note: "" },
      13: { src: "FRED / PAYEMS", api: "ok", note: "" },
      14: { src: "FRED / UNRATE", api: "ok", note: "" },
      15: { src: "FRED / ADPWNUSNERSA", api: "none", note: "ADPWNUSNERSA 為週頻實際人數，非月度新增千人，需換用正確 series 或手動填入" },
      16: { src: "台灣統計局/MOEA", api: "none", note: "需手動填入" },
    },
  },
  "sec-risk": {
    notes: [{ level: "warn", msg: "以下指標無 API 或資料缺失（id: 1, 4, 7），顯示 '—'，請手動填入" }],
    indicators: {
      1: { src: "worldgovernmentbonds.com", api: "none", note: "JS 渲染，無法直接抓取，需手動填入" },
      2: { src: "FRED / DRALACBN", api: "ok", note: "" },
      3: { src: "FRED / DRSFRMACBS", api: "ok", note: "" },
      4: { src: "NY Fed HHDC", api: "none", note: "FRED 無獨立 series，需手動從 HHDC 季報取得" },
      5: { src: "FRED / DRCLACBS", api: "ok", note: "" },
      6: { src: "FRED / DRCCLACBS", api: "ok", note: "" },
      7: { src: "NY Fed HHDC", api: "none", note: "FRED 無獨立 series，需手動從 HHDC 季報取得" },
      8: { src: "FRED / DRCCLACBS", api: "ok", note: "" },
      9: { src: "FRED / BAMLH0A1HYBBEY", api: "ok", note: "" },
      10: { src: "FRED / BAMLH0A2HYBEY", api: "ok", note: "" },
      11: { src: "FRED / BAMLH0A3HYCEY", api: "ok", note: "" },
      12: { src: "FRED / DRSDCILM", api: "ok", note: "" },
      13: { src: "FRED / DRTSCILM", api: "ok", note: "" },
      14: { src: "FRED / DRSDCIS", api: "ok", note: "" },
      15: { src: "FRED / DRTSCIS", api: "ok", note: "" },
    },
  },
  "sec-news": { notes: [] },
};
