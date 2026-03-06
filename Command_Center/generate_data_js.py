#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""
Macro Weekly — 自動產生 data.json + debug.js
=============================================
從 data/timeseries.json + data/manual.json 讀取數據，
有 API 的欄位自動填入；無 API 的欄位填 null，並在 debug.js 標示。
既有 data.json 中的 history 陣列會自動保留（merge）。

用法:
  uv run generate_data_js.py                   # 產生當週（自動判斷）
  uv run generate_data_js.py --week 2026-W10   # 指定週次
  uv run generate_data_js.py --week template   # 寫入 template
"""

import json
import sys
import argparse
from datetime import date, datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = Path(__file__).parent.parent / "Investment_Data" / "macro"

YIELD_SERIES = [
    ("DGS1MO",  "1M"),
    ("DGS3MO",  "3M"),
    ("DGS6MO",  "6M"),
    ("DGS1",    "1Y"),
    ("DGS2",    "2Y"),
    ("DGS5",    "5Y"),
    ("DGS10",   "10Y"),
    ("DGS20",   "20Y"),
    ("DGS30",   "30Y"),
]

MONTH_ABBR = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
}

# ── Data loading ───────────────────────────────────────────────────────────────

def load_all():
    records = []
    for f in [DATA_DIR / "timeseries.json", DATA_DIR / "manual.json"]:
        if not f.exists():
            continue
        text = f.read_text(encoding="utf-8").strip()
        if not text:
            continue
        records.extend(json.loads(text))
    return records


def build_index(records):
    """{ (indicator_id, series_id): [records sorted by series_date] }"""
    idx = {}
    for r in records:
        k = (r["indicator_id"], r["series_id"])
        idx.setdefault(k, []).append(r)
    for k in idx:
        idx[k].sort(key=lambda r: r["series_date"])
    return idx


# ── Helpers ────────────────────────────────────────────────────────────────────

def last_n(idx, ind_id, series_id, n):
    return idx.get((ind_id, series_id), [])[-n:]


def to_month_abbr(date_str):
    d = datetime.strptime(date_str[:7], "%Y-%m")
    return MONTH_ABBR[d.month]


def to_month_year(date_str):
    """回傳 'Jan \'26' 格式，用於圖表 X 軸標籤"""
    d = datetime.strptime(date_str[:7], "%Y-%m")
    return f"{MONTH_ABBR[d.month]} '{str(d.year)[2:]}"


def to_quarter(date_str):
    d = datetime.strptime(date_str[:7], "%Y-%m")
    return f"{d.year}Q{(d.month - 1) // 3 + 1}"


def get_last_fetched(idx, ind_id, series_id):
    recs = idx.get((ind_id, series_id), [])
    return recs[-1]["last_fetched"][:10] if recs else None


def chg_pct(latest, prev):
    if latest is None or prev is None or prev == 0:
        return None
    return round((latest - prev) / abs(prev) * 100, 2)


def fmt_pct(v, dec=2):
    return f"{v:.{dec}f}%" if v is not None else "—"


def fmt_num(v, dec=2):
    return f"{v:.{dec}f}" if v is not None else "—"


def fmt_int(v):
    return str(round(v)) if v is not None else "—"


# ── Section builders ───────────────────────────────────────────────────────────

def build_rates(idx):
    missing = []

    recs = last_n(idx, "us_ffr", "FEDFUNDS", 1)
    ffr_current = round(recs[-1]["value"], 2) if recs else None

    if ffr_current is None:
        missing.append({"level": "error", "msg": "fedFundsRate.current：FEDFUNDS 無資料"})

    # 目標利率範圍（DFEDTARU 上限 / DFEDTARL 下限）
    upper_recs = last_n(idx, "us_ffr", "DFEDTARU", 1)
    lower_recs = last_n(idx, "us_ffr", "DFEDTARL", 1)
    if upper_recs and lower_recs:
        upper = upper_recs[-1]["value"]
        lower = lower_recs[-1]["value"]
        ffr_target = f"{lower:.2f}–{upper:.2f}%"
    else:
        ffr_target = None
        missing.append({"level": "warn", "msg": "fedFundsRate.target：DFEDTARU/DFEDTARL 無資料，請手動填入（如 '4.25–4.50%'）"})

    # 殖利率曲線（us_yield_curve，9 個 FRED series）
    current_yields   = []
    prev_week_yields = []
    yield_missing    = False
    for sid, _ in YIELD_SERIES:
        recs_y = idx.get(("us_yield_curve", sid), [])
        if not recs_y:
            yield_missing = True
            current_yields.append(None)
            prev_week_yields.append(None)
            continue
        current_yields.append(round(recs_y[-1]["value"], 2))
        latest_dt = datetime.strptime(recs_y[-1]["series_date"], "%Y-%m-%d")
        cutoff    = (latest_dt - timedelta(days=7)).strftime("%Y-%m-%d")
        prev_recs = [r for r in recs_y if r["series_date"] <= cutoff]
        prev_week_yields.append(round(prev_recs[-1]["value"], 2) if prev_recs else None)

    if yield_missing:
        missing.append({"level": "warn", "msg": "yieldCurveData：部分殖利率資料缺失，請執行 fetch.py --indicator us_yield_curve"})

    return {
        "ffr_current":     ffr_current,
        "ffr_target":      ffr_target,
        "yield_current":   current_yields,
        "yield_prev_week": prev_week_yields,
        "missing":         missing,
    }


def build_inflation(idx, n=5):
    missing = []

    def extract(ind_id, series_id, label):
        recs = last_n(idx, ind_id, series_id, n)
        if not recs:
            missing.append({"level": "error", "msg": f"{label}（{series_id}）：無資料"})
            return [], []
        return (
            [to_month_year(r["series_date"]) for r in recs],
            [round(r["value"], 2) for r in recs],
        )

    cpi_labels,  cpi_vals  = extract("us_cpi", "CPIAUCSL",  "inflationData.cpiYoY")
    _,           core_vals = extract("us_cpi", "CPILFESL",  "inflationData.coreYoY")
    pce_labels,  pce_vals  = extract("us_pce", "PCEPI",     "inflationData.pceYoY")
    _,           cpce_vals = extract("us_pce", "PCEPILFE",  "inflationData.corePce")

    labels = cpi_labels or pce_labels or []

    return {
        "labels":   labels,
        "cpiYoY":   cpi_vals,
        "coreYoY":  core_vals,
        "pceYoY":   pce_vals,
        "corePce":  cpce_vals,
        "missing":  missing,
    }


def build_employment(idx, n=5):
    missing = []

    # Unemployment: level series
    unemp = last_n(idx, "us_unemployment", "UNRATE", n)
    unemp_vals   = [round(r["value"], 1) for r in unemp]
    unemp_labels = [to_month_year(r["series_date"]) for r in unemp]
    if not unemp:
        missing.append({"level": "error", "msg": "employmentData.unemployRate（UNRATE）：無資料"})

    # NFP: PAYEMS is a level series → compute MoM diffs
    payems = last_n(idx, "us_nfp", "PAYEMS", n + 1)
    if len(payems) >= 2:
        nfp_vals   = [round(payems[i]["value"] - payems[i-1]["value"])
                      for i in range(1, len(payems))]
        nfp_labels = [to_month_year(r["series_date"]) for r in payems[1:]]
    else:
        nfp_vals   = []
        nfp_labels = []
        missing.append({"level": "error", "msg": "employmentData.nfp（PAYEMS）：無資料"})

    missing += [
        {"level": "warn", "msg": "employmentData.avgHourlyEarningsYoY：未設 API，請手動填入"},
        {"level": "warn", "msg": "employmentData.joltsCurrent：JOLTS 未設 API，請手動填入"},
    ]

    labels = nfp_labels or unemp_labels
    return {
        "labels":              labels,
        "nfp":                 nfp_vals,
        "unemployRate":        unemp_vals,
        "missing":             missing,
    }


def build_leading(idx):
    """
    回傳 (rows, missing_ids, indicator_debug_map)
    """
    missing_ids = []
    dbg_map     = {}  # id -> {src, api, note}

    def row(id_, name, type_, ind_id, series_id, fmt_fn, freq="Monthly",
            next_upd="Monthly", is_diff=False, src="FRED", note=""):
        n = 3 if is_diff else 2
        recs = last_n(idx, ind_id, series_id, n)

        if is_diff and len(recs) >= 2:
            l_val = recs[-1]["value"] - recs[-2]["value"]
            p_val = (recs[-2]["value"] - recs[-3]["value"]) if len(recs) >= 3 else None
        elif not is_diff and recs:
            l_val = recs[-1]["value"]
            p_val = recs[-2]["value"] if len(recs) >= 2 else None
        else:
            l_val = None
            p_val = None

        d_str = recs[-1]["series_date"] if recs else None
        if freq == "Quarterly":
            d_display = to_quarter(d_str) if d_str else "—"
        elif freq == "Daily":
            d_display = d_str[:10] if d_str else "—"
        else:
            d_display = d_str[:7] if d_str else "—"

        has_data = l_val is not None
        if not has_data:
            missing_ids.append(id_)

        dbg_map[id_] = {
            "src": f"FRED / {series_id}",
            "api": "ok" if has_data else "none",
            "note": note,
        }

        return {
            "id":         id_,
            "name":       name,
            "type":       type_,
            "prev":       fmt_fn(p_val),
            "latest":     fmt_fn(l_val),
            "chgPct":     chg_pct(l_val, p_val),
            "date":       d_display,
            "nextUpdate": next_upd,
        }

    def null_row(id_, name, type_, next_upd, src="—", note="無 API，需手動填入"):
        missing_ids.append(id_)
        dbg_map[id_] = {"src": src, "api": "none", "note": note}
        return {"id":id_, "name":name, "type":type_,
                "prev":"—", "latest":"—", "chgPct":None,
                "date":"—", "nextUpdate":next_upd}

    rows = [
        row( 1, "GDP QoQ SAAR",               "景氣", "us_real_gdp_yoy", "A191RL1Q225SBEA",  fmt_pct,  "Quarterly", "2026年3月",   note="BEA 初估值，後續有修訂"),
        row( 2, "聯邦基金有效利率",             "利率", "us_ffr",          "FEDFUNDS",          fmt_pct,  "Monthly",   "FOMC 決議"),
        row( 3, "PCE 年增率 YoY",              "通膨", "us_pce",          "PCEPI",             fmt_pct,  "Monthly",   "Monthly"),
        row( 4, "核心 PCE 年增率 YoY",         "通膨", "us_pce",          "PCEPILFE",          fmt_pct,  "Monthly",   "Monthly"),
        row( 5, "CPI 年增率 YoY",              "通膨", "us_cpi",          "CPIAUCSL",          fmt_pct,  "Monthly",   "Monthly"),
        row( 6, "核心 CPI 年增率 YoY",         "通膨", "us_cpi",          "CPILFESL",          fmt_pct,  "Monthly",   "Monthly"),
        null_row(7,  "ISM 製造業 PMI",         "景氣", "每月首週",      src="ISM 官網",  note="ISM 付費授權，FRED 無收錄，需手動填入"),
        row( 8, "VIX（CBOE 波動率指數）",       "市場", "vix",             "VIXCLS",            fmt_num,  "Daily",     "Daily"),
        null_row(9,  "VXN（Nasdaq 波動率指數）","市場", "Daily",         src="CBOE 官網", note="無 FRED API，需手動填入"),
        row(10, "OECD 美國先行指標 CLI",        "海外", "oecd_cli",        "USALOLITONOSTSAM",  fmt_num,  "Monthly",   "Monthly",  note="資料可能落後數月"),
        row(11, "OECD 商業信心指數 BCI",        "海外", "oecd_bci",        "BSCICP03USM665S",   fmt_num,  "Monthly",   "Monthly",  note="資料可能落後數月"),
        row(12, "美國企業利潤（十億美元）",       "景氣", "us_corp_profit",  "CP",                fmt_num,  "Quarterly", "2026年4月"),
        row(13, "非農就業 NFP MoM（千人）",      "就業", "us_nfp",          "PAYEMS",            fmt_int,  "Monthly",   "Monthly",  is_diff=True),
        row(14, "失業率",                        "就業", "us_unemployment", "UNRATE",            fmt_pct,  "Monthly",   "Monthly"),
        null_row(15, "ADP 就業人數變動（千人）",    "就業", "每月第一週", src="FRED / ADPWNUSNERSA", note="ADPWNUSNERSA 為週頻實際人數，非月度新增千人，需換用正確 series 或手動填入"),
        null_row(16, "台灣出口訂單 YoY",         "海外", "Monthly",       src="台灣統計局/MOEA", note="需手動填入"),
    ]

    return rows, missing_ids, dbg_map


def build_risk(idx):
    missing_ids = []
    dbg_map     = {}

    def row(id_, name, type_, ind_id, series_id, fmt_fn, freq="Quarterly",
            next_upd="Quarterly", note=""):
        recs = last_n(idx, ind_id, series_id, 2)
        l_val = recs[-1]["value"] if recs else None
        p_val = recs[-2]["value"] if len(recs) >= 2 else None

        if freq == "Daily":
            d_display = recs[-1]["series_date"][:10] if recs else "—"
        else:
            d_display = to_quarter(recs[-1]["series_date"]) if recs else "—"

        has_data = l_val is not None
        if not has_data:
            missing_ids.append(id_)

        dbg_map[id_] = {
            "src": f"FRED / {series_id}",
            "api": "ok" if has_data else "none",
            "note": note,
        }

        return {
            "id":         id_,
            "name":       name,
            "type":       type_,
            "prev":       fmt_fn(p_val),
            "latest":     fmt_fn(l_val),
            "chgPct":     chg_pct(l_val, p_val),
            "date":       d_display,
            "nextUpdate": next_upd,
        }

    def null_row(id_, name, type_, next_upd, src="—", note="無 API，需手動填入"):
        missing_ids.append(id_)
        dbg_map[id_] = {"src": src, "api": "none", "note": note}
        return {"id":id_, "name":name, "type":type_,
                "prev":"—", "latest":"—", "chgPct":None,
                "date":"—", "nextUpdate":next_upd}

    rows = [
        null_row( 1, "美國 5年CDS (Basic Point)",                              "信用風險", "未公布",     src="worldgovernmentbonds.com",   note="JS 渲染，無法直接抓取，需手動填入"),
        row( 2, "90天以上貸款逾期未繳-全部",                                    "信用風險", "delinquency_all",      "DRALACBN",       fmt_num, next_upd="每季"),
        row( 3, "90天以上貸款逾期未繳-住宅抵押",                                "信用風險", "delinquency_mortgage", "DRSFRMACBS",     fmt_num, next_upd="每季"),
        null_row( 4, "90天以上貸款逾期未繳-循環型房貸",                          "信用風險", "每季",       src="NY Fed HHDC",               note="FRED 無獨立 series，需手動從 HHDC 季報取得"),
        row( 5, "90天以上貸款逾期未繳-車貸",                                    "信用風險", "delinquency_auto",     "DRCLACBS",       fmt_num, next_upd="每季"),
        row( 6, "90天以上貸款逾期未繳-信用卡",                                   "信用風險", "delinquency_cc",       "DRCCLACBS",      fmt_num, next_upd="每季"),
        null_row( 7, "90天以上貸款逾期未繳-學貸",                                "信用風險", "每季",       src="NY Fed HHDC",               note="FRED 無獨立 series，需手動從 HHDC 季報取得"),
        row( 8, "美國-商銀貸款拖欠率-信用卡",                                   "信用風險", "bank_cc_delinquency",  "DRCCLACBS",      fmt_pct, next_upd="每季"),
        row( 9, "美國 高收益公司債有效殖利率（BB級）",                            "風險報酬", "hy_yield_bb",          "BAMLH0A1HYBBEY", fmt_pct, freq="Daily", next_upd="Daily"),
        row(10, "美國 高收益公司債有效殖利率（B級）",                             "風險報酬", "hy_yield_b",           "BAMLH0A2HYBEY",  fmt_pct, freq="Daily", next_upd="Daily"),
        row(11, "美國 高收益公司債有效殖利率（CCC級或以下）",                      "風險報酬", "hy_yield_ccc",         "BAMLH0A3HYCEY",  fmt_pct, freq="Daily", next_upd="Daily"),
        row(12, "SLOOS 中大型企業貸款淨需求比例",                                "景氣訊號", "sloos_large_demand",   "DRSDCILM",       fmt_pct, next_upd="每季"),
        row(13, "SLOOS 國內銀行緊縮中大型企業貸款標準淨比例",                     "景氣訊號", "sloos_large_standard", "DRTSCILM",       fmt_pct, next_upd="每季"),
        row(14, "SLOOS 小型企業貸款淨需求比例",                                  "景氣訊號", "sloos_small_demand",   "DRSDCIS",        fmt_pct, next_upd="每季"),
        row(15, "SLOOS 國內銀行緊縮小型企業貸款標準淨比例",                      "景氣訊號", "sloos_small_standard", "DRTSCIS",        fmt_pct, next_upd="每季"),
    ]

    return rows, missing_ids, dbg_map


# ── JS output helpers（debug.js 仍用）─────────────────────────────────────────

def jv(v):
    """Python value → JS literal."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "[" + ", ".join(jv(i) for i in v) + "]"
    return json.dumps(v, ensure_ascii=False)


# ── Generate ───────────────────────────────────────────────────────────────────

def generate(week_dir: Path, week_label: str):
    records = load_all()
    idx     = build_index(records)
    today   = date.today().isoformat()

    rates = build_rates(idx)
    infl  = build_inflation(idx)
    empl  = build_employment(idx)
    lead, lead_missing, lead_dbg = build_leading(idx)
    risk,  risk_missing, risk_dbg = build_risk(idx)

    freshness = {
        "ffr":          get_last_fetched(idx, "us_ffr",          "FEDFUNDS"),
        "cpi":          get_last_fetched(idx, "us_cpi",          "CPIAUCSL"),
        "pce":          get_last_fetched(idx, "us_pce",          "PCEPI"),
        "nfp":          get_last_fetched(idx, "us_nfp",          "PAYEMS"),
        "unemployment": get_last_fetched(idx, "us_unemployment", "UNRATE"),
    }

    # ── Merge history arrays from existing data.json ──────────────────────────
    existing_json = week_dir / "data.json"
    history_leading: dict = {}
    history_risk: dict = {}
    if existing_json.exists():
        try:
            prev = json.loads(existing_json.read_text("utf-8"))
            for ind in prev.get("leadingIndicators", []):
                if "history" in ind:
                    history_leading[ind["id"]] = ind["history"]
            for ind in prev.get("riskIndicators", []):
                if "history" in ind:
                    history_risk[ind["id"]] = ind["history"]
        except Exception:
            pass

    for r in lead:
        if r["id"] in history_leading:
            r["history"] = history_leading[r["id"]]
    for r in risk:
        if r["id"] in history_risk:
            r["history"] = history_risk[r["id"]]

    # ── data.json ─────────────────────────────────────────────────────────────
    data = {
        "REPORT_DATE": today,
        "REPORT_WEEK": week_label,
        "dataFreshness": freshness,
        "yieldCurveData": {
            "labels":   [l for _, l in YIELD_SERIES],
            "current":  rates["yield_current"],
            "prevWeek": rates["yield_prev_week"],
        },
        "fedFundsRate": {
            "current": rates["ffr_current"],
            "target":  rates["ffr_target"],
        },
        "inflationData": {
            "labels":  infl["labels"],
            "cpiYoY":  infl["cpiYoY"],
            "coreYoY": infl["coreYoY"],
            "pceYoY":  infl["pceYoY"],
            "corePce": infl["corePce"],
        },
        "employmentData": {
            "labels":               empl["labels"],
            "nfp":                  empl["nfp"],
            "unemployRate":         empl["unemployRate"],
            "avgHourlyEarningsYoY": None,
            "joltsCurrent":         None,
        },
        "equityData": {
            "indices":         [],
            "spxWeeklyLabels": [],
            "spxWeeklyClose":  [],
        },
        "leadingIndicators": lead,
        "riskIndicators":    risk,
        "newsItems":         [],
    }

    existing_json.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── debug.js ──────────────────────────────────────────────────────────────
    D = []
    b = D.append

    b(f"// Auto-generated by generate_data_js.py  ({today})")
    b("")
    b("const DEBUG_NOTES = {")

    def sec_notes(sec_id, notes, indicators=None):
        b(f"")
        b(f'  "{sec_id}": {{')
        b(f"    notes: [")
        for n in notes:
            b(f"      {{ level: {jv(n['level'])}, msg: {jv(n['msg'])} }},")
        b(f"    ],")
        if indicators:
            b(f"    indicators: {{")
            for id_, d in indicators.items():
                b(f"      {id_}: {{ src: {jv(d['src'])}, api: {jv(d['api'])}, note: {jv(d['note'])} }},")
            b(f"    }},")
        b(f"  }},")

    sec_notes("sec-rates", rates["missing"])

    infl_notes = infl["missing"]
    if not infl_notes:
        infl_notes = [{"level": "info", "msg": "CPI / PCE 數據已自動從 FRED 填入"}]
    sec_notes("sec-inflation", infl_notes)

    sec_notes("sec-employment", empl["missing"])

    sec_notes("sec-equity", [
        {"level": "warn", "msg": "股市指數 / SPX 週線：無 API，請手動填入 equityData"},
    ])

    lead_section_notes = []
    if lead_missing:
        ids_str = ", ".join(str(i) for i in lead_missing)
        lead_section_notes.append({
            "level": "warn",
            "msg": f"以下指標無 API 或資料缺失（id: {ids_str}），顯示 '—'，請手動填入",
        })
    sec_notes("sec-leading", lead_section_notes, lead_dbg)

    risk_section_notes = []
    if risk_missing:
        ids_str = ", ".join(str(i) for i in risk_missing)
        risk_section_notes.append({
            "level": "warn",
            "msg": f"以下指標無 API 或資料缺失（id: {ids_str}），顯示 '—'，請手動填入",
        })
    sec_notes("sec-risk", risk_section_notes, risk_dbg)

    sec_notes("sec-news", [])

    b("")
    b("};")

    (week_dir / "debug.js").write_text("\n".join(D), encoding="utf-8")

    # ── Summary ───────────────────────────────────────────────────────────────
    total_null = len(lead_missing) + len(risk_missing)
    print(f"  ✓  data.json → {week_dir / 'data.json'}")
    print(f"  ✓  debug.js  → {week_dir / 'debug.js'}")
    print(f"  ─  需手動填入：先期指標 {len(lead_missing)} 項 / 風險指標 {len(risk_missing)} 項")
    print(f"  ─  股市 / avgHourlyEarnings / JOLTS 需手動填入")


# ── Entry ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Macro Weekly data.js generator")
    parser.add_argument("--week", default=None,
                        help="週次（如 2026-W10）或 'template'，預設為當前週")
    args = parser.parse_args()

    if args.week == "template":
        week_label = "TEMPLATE"
        week_dir   = BASE_DIR / "dev" / "template"
    else:
        if args.week:
            week_label = args.week
        else:
            d = date.today()
            y, w, _ = d.isocalendar()
            week_label = f"{y}-W{w:02d}"
        week_dir = BASE_DIR / "dev" / week_label

    if not week_dir.exists():
        print(f"✗ 找不到資料夾：{week_dir}，請先執行 new_report.py 建立")
        sys.exit(1)

    print(f"══ Generate data.json  {week_label} {'═'*23}")
    generate(week_dir, week_label)
    print("✓ 完成")


if __name__ == "__main__":
    main()
