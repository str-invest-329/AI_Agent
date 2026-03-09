#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["yfinance", "pandas"]
# ///
"""
Investment Data — Price History Fetcher
========================================
用法:
  uv run fetch_history.py                # 拉 tickers.json 所有標的
  uv run fetch_history.py SNDK           # 只拉一檔
  uv run fetch_history.py SNDK MU NVDA   # 拉多檔
  uv run fetch_history.py --update       # 只補新數據（增量更新）

輸出:
  prices/{TICKER}_daily.json

格式:
  [
    {"date": "2025-02-13", "open": 42.5, "high": 45.0, "low": 41.8, "close": 44.2, "volume": 12345678},
    ...
  ]

設計原則:
  - 只存原始 OHLCV 事實，不存衍生值（漲跌幅、技術指標等由消費端計算）
  - JSON array of objects，方便擴充欄位、導入 BigQuery / Supabase
  - 增量更新：讀取既有 JSON，只補 last_date 之後的新數據
"""

import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
import yfinance as yf

BASE = Path(__file__).parent
PRICES_DIR = BASE / "prices"
TICKERS_FILE = BASE / "tickers.json"


def load_tickers() -> list[str]:
    with open(TICKERS_FILE, "r") as f:
        return json.load(f)


def fetch_daily(ticker: str, start: str | None = None) -> list[dict]:
    """
    從 yfinance 拉日線 OHLCV。
    start: "YYYY-MM-DD"，若為 None 則拉全部歷史（max）。
    """
    yf_ticker = yf.Ticker(ticker)

    if start:
        df = yf_ticker.history(start=start)
    else:
        df = yf_ticker.history(period="max")

    if df.empty:
        return []

    # 統一欄位、去 timezone
    records = []
    for idx, row in df.iterrows():
        dt = idx
        if hasattr(dt, "tz") and dt.tz is not None:
            dt = dt.tz_localize(None)
        records.append({
            "date":   dt.strftime("%Y-%m-%d"),
            "open":   round(float(row["Open"]), 4),
            "high":   round(float(row["High"]), 4),
            "low":    round(float(row["Low"]), 4),
            "close":  round(float(row["Close"]), 4),
            "volume": int(row["Volume"]),
        })

    return records


def load_existing(ticker: str) -> list[dict]:
    path = PRICES_DIR / f"{ticker}_daily.json"
    if not path.exists():
        return []
    with open(path, "r") as f:
        return json.load(f)


def save(ticker: str, records: list[dict]) -> Path:
    path = PRICES_DIR / f"{ticker}_daily.json"
    with open(path, "w") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))
    return path


def fetch_and_save(ticker: str, update_only: bool = False) -> None:
    existing = load_existing(ticker)

    if update_only and existing:
        last_date = existing[-1]["date"]
        # 從 last_date 的隔天開始拉
        start = (datetime.strptime(last_date, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
        print(f"[{ticker}] 增量更新，從 {start} 開始...")
        new_records = fetch_daily(ticker, start=start)

        if new_records:
            # 去重（以 date 為 key）
            existing_dates = {r["date"] for r in existing}
            new_records = [r for r in new_records if r["date"] not in existing_dates]
            merged = existing + new_records
            path = save(ticker, merged)
            print(f"  新增 {len(new_records)} 筆 → 共 {len(merged)} 筆  {path.name}")
        else:
            print(f"  無新數據（已是最新）")
    else:
        print(f"[{ticker}] 拉取完整歷史...")
        records = fetch_daily(ticker)
        if records:
            path = save(ticker, records)
            print(f"  {records[0]['date']} ~ {records[-1]['date']}  共 {len(records)} 筆  {path.name}")
        else:
            print(f"  警告：無法取得價格資料")


def main():
    PRICES_DIR.mkdir(exist_ok=True)

    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    update_only = "--update" in sys.argv

    tickers = args if args else load_tickers()

    for t in tickers:
        t = t.upper()
        fetch_and_save(t, update_only=update_only)

    print(f"\n完成，共處理 {len(tickers)} 檔")


if __name__ == "__main__":
    main()
