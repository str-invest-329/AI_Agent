// ============================================================
// debug.js — 標注層
// 記載各 section 與資料來源目前的狀態、問題、備註。
// 與 data.js（市場數據）和 index.html（佈局）完全獨立。
// 透過網址加上 ?debug 參數開啟 debug 模式後可見。
// ============================================================

const DEBUG_NOTES = {

  "sec-technical": {
    notes: [
      // { level: "info" | "warn" | "error", msg: "訊息內容" },
    ],
    // api: "ok" = 有資料 | "empty" = 無資料 | "error" = 抓取失敗
    api: { yfinance: "ok" },
  },

  "sec-chips": {
    notes: [],
    api: {
      finmind:  "ok",   // tw only
      fintel:   "ok",   // us only
    },
  },

  "sec-news": {
    notes: [],
    api: { yfinance_news: "ok" },
  },

};
