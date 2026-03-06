#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["requests", "python-dotenv"]
# ///
"""
Macro Weekly — Market Price Fetcher (Finnhub)
=============================================
用法:
  uv run fetch_market.py           # 抓所有指數
  uv run fetch_market.py --dry     # 只印結果，不寫檔

排程建議（每 15 分鐘）:
  crontab -e
  */15 * * * * cd /path/to/Macro_Weekly && uv run fetch_market.py

環境變數（填於 .env）:
  FINNHUB_API_KEY   必要

輸出:
  market.json   各指數最新報價
"""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
MARKET_FILE = BASE_DIR / "market.json"

load_dotenv(BASE_DIR / ".env")
FINNHUB_KEY = os.getenv("FINNHUB_API_KEY", "")

# Finnhub 免費版不支援 CFD 指數（^GSPC 等），改用追蹤 ETF 代替
# DIA→Dow Jones / SPY→S&P 500 / QQQ→NASDAQ / IWM→Russell 2000 / UUP→USD Index
INDICES = [
    {"id": "dow_jones",   "name": "Dow Jones",        "symbol": "DIA"},
    {"id": "sp500",       "name": "S&P 500",           "symbol": "SPY"},
    {"id": "nasdaq",      "name": "NASDAQ",            "symbol": "QQQ"},
    {"id": "russell2000", "name": "Russell 2000",      "symbol": "IWM"},
    {"id": "dxy",         "name": "US Dollar Index",   "symbol": "UUP"},
]


def fetch_quote(symbol: str) -> dict | None:
    try:
        resp = requests.get(
            "https://finnhub.io/api/v1/quote",
            params={"symbol": symbol, "token": FINNHUB_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        # Finnhub 對無效符號回傳 {"c": 0, "d": 0, ...}
        if not data.get("c"):
            return None
        return data
    except requests.RequestException as e:
        print(f"  ✗ {symbol}: {e}")
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry", action="store_true", help="只印結果，不寫 market.json")
    args = parser.parse_args()

    if not FINNHUB_KEY:
        print("✗ FINNHUB_API_KEY 未設定，請在 .env 填入後重試。")
        return

    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%SZ")

    print(f"== Market Fetch @ {now_iso} ==")

    results = []
    for index in INDICES:
        quote = fetch_quote(index["symbol"])
        if quote:
            entry = {
                "id":         index["id"],
                "name":       index["name"],
                "symbol":     index["symbol"],
                "price":      quote["c"],
                "change":     quote["d"],
                "change_pct": round(quote["dp"], 2),
                "prev_close": quote["pc"],
                "high":       quote["h"],
                "low":        quote["l"],
                "open":       quote["o"],
                "timestamp":  quote["t"],
            }
            results.append(entry)
            direction = "+" if quote["d"] >= 0 else ""
            print(f"  {index['name']:<20} {quote['c']:>12,.2f}  {direction}{quote['dp']:.2f}%")
        else:
            print(f"  {index['name']:<20} 無法取得（符號可能不支援或市場休市）")

    market = {
        "fetched_at": now_iso,
        "indices": results,
    }

    if not args.dry:
        MARKET_FILE.write_text(
            json.dumps(market, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\n  輸出 -> {MARKET_FILE.name}  ({len(results)}/{len(INDICES)} 個指數)")

        # 同步到本機 dev 目錄（本機開發用）
        dev_copies = [
            BASE_DIR / "dev" / "2026-W10" / "market.json",
            BASE_DIR / "dev" / "template" / "market.json",
        ]
        for dest in dev_copies:
            if dest.parent.exists():
                import shutil
                shutil.copy2(str(MARKET_FILE), str(dest))
                print(f"  同步 -> {dest.relative_to(BASE_DIR)}")

        # TODO: 上傳 GCS（BigQuery 架構建置後啟用）
        # from google.cloud import storage
        # client = storage.Client()
        # bucket = client.bucket(os.getenv("GCS_BUCKET_NAME"))
        # bucket.blob("market.json").upload_from_filename(str(MARKET_FILE))
    else:
        print("\n[dry mode] 未寫入檔案")


if __name__ == "__main__":
    main()
