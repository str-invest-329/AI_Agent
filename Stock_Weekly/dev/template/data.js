// ============================================================
// 由 fetch.py 自動寫入，請勿手動編輯
// ============================================================

const REPORT_DATE    = "";
const REPORT_WEEK    = "";
const REPORT_TICKER  = "";
const REPORT_COMPANY = "";
const REPORT_MARKET  = "us";   // "tw" | "us"

// ------------------------------------------------------------
// 1. 技術面
// ------------------------------------------------------------
const technicalData = {
  close: null,
  weekChangePct: null,
  volume: null,
  date: "",
  ma: { MA5: null, MA20: null, MA60: null },
  macd: { macd: null, signal: null, hist: null },
  bollinger: { upper: null, mid: null, lower: null },
  weeklyLabels: [],
  weeklyClose:  [],
};

// ------------------------------------------------------------
// 2. 籌碼面
// ------------------------------------------------------------
const chipsData = {
  market: "us",   // "tw" | "us"
  tw: {
    institutional: {
      date: "", foreign_net: null, trust_net: null,
      dealer_net: null, foreign_5d_net: null,
    },
    margin: {
      date: "", margin_balance: null, short_balance: null,
      margin_change: null, short_change: null,
    },
  },
  us: {
    shortInterest: null,
    institutionalOwnership: null,
  },
};

// ------------------------------------------------------------
// 3. 消息面
// ------------------------------------------------------------
const newsItems = [
  // { date: "YYYY-MM-DD", headline: "標題", link: "https://...", publishTime: "" },
];
