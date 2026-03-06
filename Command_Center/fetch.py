#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["requests", "python-dotenv"]
# ///
"""
Macro Weekly — Fetch Script
============================
用法:
  uv run fetch.py                      # 抓所有指標（預設從 2020-01-01）
  uv run fetch.py --start 2024-01-01   # 指定起始日期
  uv run fetch.py --indicator us_cpi   # 只抓特定指標
  uv run fetch.py --snapshot           # 抓完後額外存一份週快照

環境變數（填於 .env）:
  FRED_API_KEY   必要，FRED 系列均需
  BLS_API_KEY    選用，不填則使用匿名模式（限 25 次/天）
  BEA_API_KEY    選用，BEA 直連時需要

資料儲存:
  data/timeseries.json   長表主檔（Long Format，upsert 模式）
  data/manual.json       無 API 指標的手動填入檔
  data/snapshots/        每次執行 --snapshot 時的快照（各週最新一筆）
"""

import json
import os
import sys
import argparse
from datetime import datetime, date, timezone
from pathlib import Path

import requests
from dotenv import load_dotenv

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR        = Path(__file__).parent
INDICATORS_FILE = BASE_DIR / "indicators.json"
DATA_DIR        = Path(__file__).parent.parent / "Investment_Data" / "macro"
TIMESERIES_FILE = DATA_DIR / "timeseries.json"
SNAPSHOTS_DIR   = Path(__file__).parent / "data" / "snapshots"
BACKUPS_DIR     = DATA_DIR / "backups"

DATA_DIR.mkdir(exist_ok=True)
SNAPSHOTS_DIR.mkdir(exist_ok=True)
BACKUPS_DIR.mkdir(exist_ok=True)

KEEP_BACKUPS = 10  # 保留最近幾份備份

# ── Env ───────────────────────────────────────────────────────────────────────
load_dotenv(BASE_DIR / ".env")
FRED_API_KEY = os.getenv("FRED_API_KEY", "")
BLS_API_KEY  = os.getenv("BLS_API_KEY", "")
BEA_API_KEY  = os.getenv("BEA_API_KEY", "")

NOW_ISO = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

# ── 各指標的單位與 FRED 轉換參數 ──────────────────────────────────────────────
# fred_units:
#   "lin" = 原始值  "pc1" = 年增率（% change from year ago）  None = 無 FRED
# source_keys: 要從 indicators.json 的哪些 source key 抓 FRED 資料
INDICATOR_META = {
    # ── 先期指標 ────────────────────────────────────────────────────────────
    "us_real_gdp_yoy":      {"unit": "% (QoQ SAAR)",  "fred_units": "lin",
                              "source_keys": ["fred"]},
    "us_ffr":               {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred", "fred_target_upper", "fred_target_lower"]},
    "us_yield_curve":       {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred_1m", "fred_3m", "fred_6m", "fred_1y",
                                              "fred_2y", "fred_5y", "fred_10y", "fred_20y", "fred_30y"]},
    "us_pce":               {"unit": "YoY %",          "fred_units": "pc1",
                              "source_keys": ["fred", "fred_core"]},
    "us_cpi":               {"unit": "YoY %",          "fred_units": "pc1",
                              "source_keys": ["fred", "fred_core"]},
    "us_ism_pmi":           {"unit": "Index",          "fred_units": "lin",
                              "source_keys": ["fred_mfg", "fred_service"]},
    "vix":                  {"unit": "Index",          "fred_units": "lin",
                              "source_keys": ["fred"]},
    "vxn":                  {"unit": "Index",          "fred_units": None,
                              "source_keys": []},                              # 手動
    "oecd_cli":             {"unit": "Index",          "fred_units": "lin",
                              "source_keys": ["fred"]},
    "oecd_bci":             {"unit": "Index",          "fred_units": "lin",
                              "source_keys": ["fred"]},
    "us_corp_profit":       {"unit": "$B",             "fred_units": "lin",
                              "source_keys": ["fred"]},
    "us_nfp":               {"unit": "千人",           "fred_units": "lin",
                              "source_keys": ["fred"]},
    "us_unemployment":      {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "us_adp":               {"unit": "千人",           "fred_units": "lin",
                              "source_keys": ["fred"]},
    "tw_business_cycle":    {"unit": "Score",          "fred_units": None,
                              "source_keys": []},                              # 手動
    # ── 風險指標 ────────────────────────────────────────────────────────────
    "us_5y_cds":            {"unit": "bp",             "fred_units": None,
                              "source_keys": []},                              # 手動
    "delinquency_all":      {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "delinquency_mortgage": {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "delinquency_heloc":    {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},                        # ID 待確認
    "delinquency_auto":     {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "delinquency_cc":       {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "delinquency_student":  {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},                        # ID 待確認
    "bank_cc_delinquency":  {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "hy_yield_bb":          {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "hy_yield_b":           {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "hy_yield_ccc":         {"unit": "%",              "fred_units": "lin",
                              "source_keys": ["fred"]},
    "sloos_large_demand":   {"unit": "Net %",          "fred_units": "lin",
                              "source_keys": ["fred"]},
    "sloos_large_standard": {"unit": "Net %",          "fred_units": "lin",
                              "source_keys": ["fred"]},
    "sloos_small_demand":   {"unit": "Net %",          "fred_units": "lin",
                              "source_keys": ["fred"]},                        # ID 待確認
    "sloos_small_standard": {"unit": "Net %",          "fred_units": "lin",
                              "source_keys": ["fred"]},                        # ID 待確認
}

# ── 長表 Schema（每筆記錄的欄位說明）─────────────────────────────────────────
# indicator_id      : str   — 對應 indicators.json 的 id
# indicator_name_zh : str   — 中文名稱
# series_id         : str   — 資料來源的 series 識別碼（如 FRED series_id）
# series_date       : str   — 數據對應的時間點（YYYY-MM-DD）
# release_date      : str?  — 官方發布日期（YYYY-MM-DD，可為 null）
# value             : float — 數值
# unit              : str   — 單位
# source            : str   — 資料來源名稱（FRED / OECD / MANUAL…）
# last_fetched      : str   — 本次抓取時間（ISO 8601 UTC）

# ── Storage helpers ───────────────────────────────────────────────────────────

def load_timeseries() -> list[dict]:
    if TIMESERIES_FILE.exists():
        return json.loads(TIMESERIES_FILE.read_text(encoding="utf-8"))
    return []


def backup_timeseries() -> None:
    """寫入前備份現有 timeseries.json，並清理超出 KEEP_BACKUPS 的舊備份。"""
    if not TIMESERIES_FILE.exists():
        return
    ts = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    backup_file = BACKUPS_DIR / f"timeseries_{ts}.json"
    backup_file.write_bytes(TIMESERIES_FILE.read_bytes())
    print(f"  備份 → {backup_file.name}")

    # 清理舊備份，只保留最近 KEEP_BACKUPS 份
    backups = sorted(BACKUPS_DIR.glob("timeseries_*.json"))
    for old in backups[:-KEEP_BACKUPS]:
        old.unlink()
        print(f"  清除舊備份：{old.name}")


def save_timeseries(records: list[dict]) -> None:
    backup_timeseries()
    TIMESERIES_FILE.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def upsert(existing: list[dict], new_records: list[dict]) -> list[dict]:
    """Upsert by (indicator_id, series_id, series_date)."""
    def key(r):
        return (r["indicator_id"], r["series_id"], r["series_date"])

    index  = {key(r): i for i, r in enumerate(existing)}
    result = list(existing)
    added = updated = 0

    for rec in new_records:
        k = key(rec)
        if k in index:
            result[index[k]] = rec
            updated += 1
        else:
            index[k] = len(result)
            result.append(rec)
            added += 1

    print(f"    新增 {added} 筆 / 更新 {updated} 筆")
    return result


def save_snapshot(records: list[dict]) -> None:
    """每週快照：每個 (indicator_id, series_id) 只保留最新一筆。"""
    latest: dict[tuple, dict] = {}
    for r in records:
        k = (r["indicator_id"], r["series_id"])
        if k not in latest or r["series_date"] > latest[k]["series_date"]:
            latest[k] = r

    week = date.today().strftime("%Y-W%V")
    out  = SNAPSHOTS_DIR / f"{week}.json"
    out.write_text(
        json.dumps(list(latest.values()), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  快照 → {out.name}（{len(latest)} 個 series 最新值）")


# ── Record factory ────────────────────────────────────────────────────────────

def make_record(
    indicator_id:      str,
    indicator_name_zh: str,
    series_id:         str,
    series_date:       str,
    value:             float,
    unit:              str,
    source:            str,
    release_date:      str | None = None,
) -> dict:
    return {
        "indicator_id":      indicator_id,
        "indicator_name_zh": indicator_name_zh,
        "series_id":         series_id,
        "series_date":       series_date,
        "release_date":      release_date,
        "value":             value,
        "unit":              unit,
        "source":            source,
        "last_fetched":      NOW_ISO,
    }


# ── FRED fetcher ──────────────────────────────────────────────────────────────

def fetch_fred(
    indicator_id: str,
    name_zh:      str,
    series_id:    str,
    start_date:   str,
    units:        str = "lin",
) -> list[dict]:
    if not FRED_API_KEY:
        print(f"  ⚠  FRED_API_KEY 未設定，跳過 {series_id}")
        return []

    try:
        resp = requests.get(
            "https://api.stlouisfed.org/fred/series/observations",
            params={
                "series_id":         series_id,
                "api_key":           FRED_API_KEY,
                "file_type":         "json",
                "observation_start": start_date,
                "sort_order":        "asc",
                "units":             units,
            },
            timeout=15,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  ✗  FRED {series_id} 請求失敗：{e}")
        return []

    unit = INDICATOR_META.get(indicator_id, {}).get("unit", "")
    # 若為 Core variant（fred_core），unit 前補 "Core "
    if units == "pc1" and series_id.endswith("LFE") or series_id.endswith("ILFE"):
        unit = "Core " + unit

    records = []
    for obs in resp.json().get("observations", []):
        if obs["value"] == ".":   # FRED 缺值符號
            continue
        try:
            value = float(obs["value"])
        except ValueError:
            continue
        records.append(make_record(
            indicator_id      = indicator_id,
            indicator_name_zh = name_zh,
            series_id         = series_id,
            series_date       = obs["date"],
            value             = value,
            unit              = unit,
            source            = "FRED",
        ))

    status = "✓" if records else "⚠"
    print(f"  {status}  FRED  {series_id:<25} {len(records):>4} 筆")
    return records


# ── OECD fetcher（SDMX-JSON，不需 Key）───────────────────────────────────────

def fetch_oecd(
    indicator_id: str,
    name_zh:      str,
    dataset:      str,
    series_key:   str,
    start_period: str,
) -> list[dict]:
    try:
        resp = requests.get(
            f"https://sdmx.oecd.org/public/rest/data/{dataset}/{series_key}",
            params={"startPeriod": start_period, "format": "jsondata"},
            timeout=20,
        )
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"  ✗  OECD {dataset} 請求失敗：{e}")
        return []

    try:
        data       = resp.json()
        dims       = data["data"]["structure"]["dimensions"]["observation"]
        time_dim   = next(d for d in dims if d["id"] == "TIME_PERIOD")
        time_vals  = [v["id"] for v in time_dim["values"]]
        obs_series = data["data"]["dataSets"][0]["series"]
    except (KeyError, StopIteration) as e:
        print(f"  ✗  OECD {dataset} 解析失敗：{e}")
        return []

    unit    = INDICATOR_META.get(indicator_id, {}).get("unit", "")
    records = []
    for obs_values in obs_series.values():
        for t_idx, val_list in obs_values.get("observations", {}).items():
            if val_list[0] is None:
                continue
            period = time_vals[int(t_idx)]
            # "2026-01" → "2026-01-01"
            series_date = period + "-01" if len(period) == 7 else period
            records.append(make_record(
                indicator_id      = indicator_id,
                indicator_name_zh = name_zh,
                series_id         = f"{dataset}/{series_key}",
                series_date       = series_date,
                value             = float(val_list[0]),
                unit              = unit,
                source            = "OECD",
            ))

    status = "✓" if records else "⚠"
    print(f"  {status}  OECD  {dataset:<25} {len(records):>4} 筆")
    return records


# ── Manual entries（無 API 指標）─────────────────────────────────────────────

def load_manual() -> list[dict]:
    manual_file = DATA_DIR / "manual.json"
    if not manual_file.exists():
        return []
    data = json.loads(manual_file.read_text(encoding="utf-8"))
    print(f"  ✓  手動資料 載入 {len(data)} 筆")
    return data


# ── Build fetch tasks from indicators.json ────────────────────────────────────

def build_tasks(indicators_config: dict) -> list[dict]:
    """
    從 indicators.json 動態建立 fetch task 清單。
    每個 task 對應一個 (indicator, source_key) 組合。
    """
    tasks = []
    for category in ["leading_indicators", "risk_indicators"]:
        for ind in indicators_config.get(category, []):
            iid     = ind["id"]
            name    = ind.get("name_zh", iid)
            meta    = INDICATOR_META.get(iid, {})
            src_keys = meta.get("source_keys", [])

            if not src_keys:
                tasks.append({"type": "manual", "indicator_id": iid, "name_zh": name})
                continue

            for src_key in src_keys:
                src = ind.get("sources", {}).get(src_key, {})
                series_id = src.get("series_id")
                if not series_id:
                    continue

                # 跳過標記為待確認的 series
                if "待確認" in src.get("notes", ""):
                    tasks.append({
                        "type":         "skip",
                        "indicator_id": iid,
                        "name_zh":      name,
                        "series_id":    series_id,
                        "reason":       "Series ID 待確認",
                    })
                    continue

                # FRED units：fred_core 固定用 pc1，其他按 meta
                if src_key == "fred_core":
                    fred_units = "pc1"
                else:
                    fred_units = meta.get("fred_units", "lin")

                tasks.append({
                    "type":         "fred",
                    "indicator_id": iid,
                    "name_zh":      name,
                    "series_id":    series_id,
                    "fred_units":   fred_units,
                })

    return tasks


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Macro Weekly Fetch Script")
    parser.add_argument("--start",      default="2020-01-01",
                        help="資料起始日期（YYYY-MM-DD），預設 2020-01-01")
    parser.add_argument("--snapshot",   action="store_true",
                        help="抓完後存一份本週快照到 data/snapshots/")
    parser.add_argument("--indicator",  default=None,
                        help="只抓單一指標（填 indicator_id）")
    args = parser.parse_args()

    if not FRED_API_KEY:
        print("⚠  FRED_API_KEY 未設定，請在 .env 填入後重試。")
        print("   申請：https://fred.stlouisfed.org/docs/api/api_key.html")
        print()

    if not INDICATORS_FILE.exists():
        print(f"✗ 找不到 {INDICATORS_FILE}")
        sys.exit(1)

    indicators_config = json.loads(INDICATORS_FILE.read_text(encoding="utf-8"))

    print(f"══ Macro Weekly Fetch {'═'*30}")
    print(f"  起始日期 : {args.start}")
    print(f"  執行時間 : {NOW_ISO}")
    if args.indicator:
        print(f"  過濾指標 : {args.indicator}")
    print(f"{'═'*52}")

    tasks      = build_tasks(indicators_config)
    all_new    = []
    skipped    = []
    manual_ids = []

    for task in tasks:
        iid = task["indicator_id"]
        if args.indicator and iid != args.indicator:
            continue

        if task["type"] == "skip":
            skipped.append(task)
            continue

        if task["type"] == "manual":
            manual_ids.append(iid)
            continue

        if task["type"] == "fred":
            records = fetch_fred(
                indicator_id = iid,
                name_zh      = task["name_zh"],
                series_id    = task["series_id"],
                start_date   = args.start,
                units        = task["fred_units"],
            )
            all_new.extend(records)

    # 手動資料（僅提示，不寫入 timeseries.json）
    if manual_ids:
        print(f"\n[ 手動資料（略過，請維護 Investment_Data/macro/manual.json）]")
        for iid in manual_ids:
            print(f"  ─  {iid}")

    # 待確認 Series 彙整
    if skipped:
        print(f"\n[ 待確認 Series ID（跳過） ]")
        for s in skipped:
            print(f"  ⚠  {s['indicator_id']:<30} {s['series_id']}  ← {s['reason']}")

    if not all_new:
        print("\n沒有取得任何資料，請確認 API Key 設定。")
        return

    # Upsert
    print(f"\n[ 儲存 → timeseries.json ]")
    existing = load_timeseries()
    print(f"  現有：{len(existing)} 筆")
    merged = upsert(existing, all_new)
    save_timeseries(merged)
    print(f"  最終：{len(merged)} 筆")

    # Snapshot
    if args.snapshot:
        print(f"\n[ 快照 ]")
        save_snapshot(merged)

    print("\n✓ 完成")


if __name__ == "__main__":
    main()
