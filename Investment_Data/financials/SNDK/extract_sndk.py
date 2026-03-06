"""
extract_sndk.py — Extract SNDK financials from XBRL companyfacts JSON
Outputs: SNDK_financials.json (tidy/long format) + SNDK_financials.xlsx
"""
import json, os, sys
from datetime import date
from collections import defaultdict

DIR = os.path.dirname(os.path.abspath(__file__))
XBRL_PATH = os.path.join(DIR, "sndk_xbrl_raw.json")
JSON_OUT = os.path.join(DIR, "SNDK_financials.json")

# ── SNDK Fiscal Year mapping ──
# FY ends late June. CY frames → FY quarters:
FRAME_TO_FQ = {
    # Income statement / cash flow (duration)
    "CY2024Q3": "Q1_FY2025",
    "CY2024Q4": "Q2_FY2025",
    "CY2025Q1": "Q3_FY2025",
    # Q4_FY2025 = derived (full year CY2024 minus 9-month YTD)
    "CY2025Q3": "Q1_FY2026",
    "CY2025Q4": "Q2_FY2026",
}

# Balance sheet (instant) — maps to "as of" date
FRAME_TO_FQ_BS = {
    "CY2024Q2I": "FY2025_START",  # Jun 28, 2024 — opening balance
    "CY2024Q4I": "Q2_FY2025",
    "CY2025Q1I": "Q3_FY2025",
    "CY2025Q2I": "Q4_FY2025",
    "CY2025Q3I": "Q1_FY2026",
    "CY2025Q4I": "Q2_FY2026",
}

PERIODS_IS = ["Q1_FY2025", "Q2_FY2025", "Q3_FY2025", "Q4_FY2025", "Q1_FY2026", "Q2_FY2026"]
PERIODS_BS = ["FY2025_START", "Q2_FY2025", "Q3_FY2025", "Q4_FY2025", "Q1_FY2026", "Q2_FY2026"]

PERIOD_ENDS = {
    "FY2025_START": "2024-06-28",
    "Q1_FY2025": "2024-09-27",
    "Q2_FY2025": "2024-12-27",
    "Q3_FY2025": "2025-03-28",
    "Q4_FY2025": "2025-06-27",
    "Q1_FY2026": "2025-10-03",
    "Q2_FY2026": "2026-01-02",
}

FILING_INFO = {
    "Q2_FY2025": {"form": "10-Q", "filing_date": "2025-03-07", "accession": "0002023554-25-000004"},
    "Q3_FY2025": {"form": "10-Q", "filing_date": "2025-05-12", "accession": "0002023554-25-000027"},
    "Q4_FY2025": {"form": "10-K", "filing_date": "2025-08-21", "accession": "0002023554-25-000034"},
    "Q1_FY2026": {"form": "10-Q", "filing_date": "2025-11-07", "accession": "0001628280-25-050698"},
    "Q2_FY2026": {"form": "10-Q", "filing_date": "2026-01-30", "accession": "0001628280-26-004407"},
}


def load_xbrl():
    with open(XBRL_PATH, "r") as f:
        return json.load(f)


def get_val_by_frame(entries, frame):
    """Get value from entries matching a specific CY frame."""
    for e in entries:
        if e.get("frame") == frame:
            return e["val"]
    return None


def get_val_by_dates(entries, start, end):
    """Get value from entries matching specific start/end dates."""
    for e in entries:
        if e.get("start") == start and e.get("end") == end:
            return e["val"]
    return None


def get_instant_val(entries, end_date):
    """Get instant value matching end date."""
    for e in entries:
        if e.get("end") == end_date and "start" not in e:
            return e["val"]
    return None


def extract_duration_tag(facts, tag_name, unit="USD"):
    """Extract quarterly values for a duration tag (IS/CF)."""
    if tag_name not in facts:
        return {}
    entries = facts[tag_name]["units"].get(unit, [])
    result = {}

    # Direct frame matches
    for frame, fq in FRAME_TO_FQ.items():
        val = get_val_by_frame(entries, frame)
        if val is not None:
            result[fq] = val

    # Q4 FY2025: full year (CY2024) minus 9-month YTD
    fy_full = get_val_by_frame(entries, "CY2024")
    ytd_9m = get_val_by_dates(entries, "2024-06-29", "2025-03-28")
    if fy_full is not None and ytd_9m is not None:
        result["Q4_FY2025"] = fy_full - ytd_9m
    elif fy_full is not None:
        # Try: 9-month = sum of Q1+Q2+Q3
        q1 = result.get("Q1_FY2025")
        q2 = result.get("Q2_FY2025")
        q3 = result.get("Q3_FY2025")
        if q1 is not None and q2 is not None and q3 is not None:
            result["Q4_FY2025"] = fy_full - (q1 + q2 + q3)

    # Fallback: try unframed entries by date range
    DATE_RANGES = {
        "Q1_FY2025": ("2024-06-29", "2024-09-27"),
        "Q2_FY2025": ("2024-09-28", "2024-12-27"),
        "Q3_FY2025": ("2024-12-28", "2025-03-28"),
        "Q1_FY2026": ("2025-06-28", "2025-10-03"),
        "Q2_FY2026": ("2025-10-04", "2026-01-02"),
    }
    for fq, (s, e) in DATE_RANGES.items():
        if fq not in result:
            val = get_val_by_dates(entries, s, e)
            if val is not None:
                result[fq] = val

    return result


def extract_instant_tag(facts, tag_name, unit="USD"):
    """Extract values for an instant (balance sheet) tag."""
    if tag_name not in facts:
        return {}
    entries = facts[tag_name]["units"].get(unit, [])
    result = {}
    for frame, fq in FRAME_TO_FQ_BS.items():
        val = get_val_by_frame(entries, frame)
        if val is not None:
            result[fq] = val
    # Fallback by end date
    DATE_MAP = {
        "FY2025_START": "2024-06-28",
        "Q2_FY2025": "2024-12-27",
        "Q3_FY2025": "2025-03-28",
        "Q4_FY2025": "2025-06-27",
        "Q1_FY2026": "2025-10-03",
        "Q2_FY2026": "2026-01-02",
    }
    for fq, end_date in DATE_MAP.items():
        if fq not in result:
            val = get_instant_val(entries, end_date)
            if val is not None:
                result[fq] = val
    return result


def to_millions(d):
    """Convert values from raw (in ones) to millions."""
    return {k: round(v / 1_000_000, 1) if v is not None else None for k, v in d.items()}


def to_millions_precise(d):
    """Convert values with more decimal places for small numbers."""
    return {k: round(v / 1_000_000, 2) if v is not None else None for k, v in d.items()}


def compute_pct(numerator_dict, denominator_dict):
    """Compute ratio dict from two dicts with matching keys."""
    result = {}
    for k in set(numerator_dict) | set(denominator_dict):
        n = numerator_dict.get(k)
        d = denominator_dict.get(k)
        if n is not None and d is not None and d != 0:
            result[k] = round(n / d, 4)
    return result


def build_long_format(data):
    """Convert the structured data into tidy/long format rows."""
    rows = []
    periods_is = data["metadata"]["periods_income_statement"]
    periods_bs = data["metadata"]["periods_balance_sheet"]

    for metric, vals in data["income_statement"].items():
        for p in periods_is:
            v = vals.get(p)
            if v is not None:
                unit = "pct" if "pct" in metric else ("USD_per_share" if "eps" in metric else ("millions_shares" if "shares" in metric else "USD_millions"))
                rows.append({
                    "period": p, "period_end": PERIOD_ENDS.get(p, ""),
                    "statement": "income_statement", "metric": metric,
                    "value": v, "unit": unit
                })

    for section in ["assets", "liabilities", "equity"]:
        for metric, vals in data["balance_sheet"].get(section, {}).items():
            for p in periods_bs:
                v = vals.get(p)
                if v is not None:
                    rows.append({
                        "period": p, "period_end": PERIOD_ENDS.get(p, ""),
                        "statement": f"balance_sheet_{section}", "metric": metric,
                        "value": v, "unit": "USD_millions"
                    })

    for section in ["operating_activities", "investing_activities", "financing_activities"]:
        for metric, vals in data["cash_flow_statement"].get(section, {}).items():
            for p in periods_is:
                v = vals.get(p)
                if v is not None:
                    rows.append({
                        "period": p, "period_end": PERIOD_ENDS.get(p, ""),
                        "statement": f"cash_flow_{section}", "metric": metric,
                        "value": v, "unit": "USD_millions"
                    })

    for metric in ["free_cash_flow", "net_change_in_cash", "ending_cash"]:
        vals = data["cash_flow_statement"].get(metric, {})
        for p in periods_is:
            v = vals.get(p)
            if v is not None:
                rows.append({
                    "period": p, "period_end": PERIOD_ENDS.get(p, ""),
                    "statement": "cash_flow_summary", "metric": metric,
                    "value": v, "unit": "USD_millions"
                })

    return rows


def main():
    print("Loading XBRL data...")
    xbrl = load_xbrl()
    facts = xbrl["facts"]["us-gaap"]

    # ═══ Income Statement ═══
    print("Extracting Income Statement...")
    revenue = to_millions(extract_duration_tag(facts, "RevenueFromContractWithCustomerExcludingAssessedTax"))
    cogs = to_millions(extract_duration_tag(facts, "CostOfGoodsAndServicesSold"))
    gross_profit = to_millions(extract_duration_tag(facts, "GrossProfit"))
    rd = to_millions(extract_duration_tag(facts, "ResearchAndDevelopmentExpense"))
    sga = to_millions(extract_duration_tag(facts, "SellingGeneralAndAdministrativeExpense"))
    restructuring = to_millions(extract_duration_tag(facts, "RestructuringCharges"))
    op_income = to_millions(extract_duration_tag(facts, "OperatingIncomeLoss"))
    interest_exp = to_millions(extract_duration_tag(facts, "InterestExpenseNonoperating"))
    interest_inc = to_millions(extract_duration_tag(facts, "InvestmentIncomeInterest"))
    other_nonop = to_millions(extract_duration_tag(facts, "OtherNonoperatingIncomeExpense"))
    nonop_total = to_millions(extract_duration_tag(facts, "NonoperatingIncomeExpense"))
    pretax = to_millions(extract_duration_tag(facts, "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest"))
    tax = to_millions(extract_duration_tag(facts, "IncomeTaxExpenseBenefit"))
    net_income = to_millions(extract_duration_tag(facts, "NetIncomeLoss"))
    eps_basic = extract_duration_tag(facts, "EarningsPerShareBasic", unit="USD/shares")
    eps_diluted = extract_duration_tag(facts, "EarningsPerShareDiluted", unit="USD/shares")
    shares_basic = extract_duration_tag(facts, "WeightedAverageNumberOfSharesOutstandingBasic", unit="shares")
    shares_diluted = extract_duration_tag(facts, "WeightedAverageNumberOfDilutedSharesOutstanding", unit="shares")
    shares_basic_m = {k: round(v / 1_000_000, 1) for k, v in shares_basic.items()}
    shares_diluted_m = {k: round(v / 1_000_000, 1) for k, v in shares_diluted.items()}

    # Q4 FY2025: weighted avg shares & EPS cannot be derived by subtraction — set to null
    for d in [eps_basic, eps_diluted, shares_basic_m, shares_diluted_m]:
        d.pop("Q4_FY2025", None)
    # Round EPS to 2 decimal places
    eps_basic = {k: round(v, 2) for k, v in eps_basic.items()}
    eps_diluted = {k: round(v, 2) for k, v in eps_diluted.items()}
    equity_method = to_millions(extract_duration_tag(facts, "IncomeLossFromEquityMethodInvestments"))

    income_statement = {
        "revenue": revenue,
        "cost_of_goods_sold": cogs,
        "gross_profit": gross_profit,
        "gross_margin_pct": compute_pct(gross_profit, revenue),
        "research_and_development": rd,
        "selling_general_administrative": sga,
        "restructuring_charges": restructuring,
        "operating_income": op_income,
        "operating_margin_pct": compute_pct(op_income, revenue),
        "interest_expense": interest_exp,
        "interest_income": interest_inc,
        "other_nonoperating_income_expense": other_nonop,
        "nonoperating_income_expense_total": nonop_total,
        "income_before_taxes": pretax,
        "income_tax_expense": tax,
        "effective_tax_rate": compute_pct(tax, pretax),
        "equity_method_investments": equity_method,
        "net_income": net_income,
        "net_margin_pct": compute_pct(net_income, revenue),
        "eps_basic": eps_basic,
        "eps_diluted": eps_diluted,
        "shares_basic_millions": shares_basic_m,
        "shares_diluted_millions": shares_diluted_m,
    }

    # ═══ Balance Sheet ═══
    print("Extracting Balance Sheet...")
    bs_assets = {
        "cash_and_cash_equivalents": to_millions(extract_instant_tag(facts, "CashAndCashEquivalentsAtCarryingValue")),
        "accounts_receivable": to_millions(extract_instant_tag(facts, "AccountsReceivableNetCurrent")),
        "inventories": to_millions(extract_instant_tag(facts, "InventoryNet")),
        "other_current_assets": to_millions(extract_instant_tag(facts, "OtherAssetsCurrent")),
        "total_current_assets": to_millions(extract_instant_tag(facts, "AssetsCurrent")),
        "property_plant_equipment_net": to_millions(extract_instant_tag(facts, "PropertyPlantAndEquipmentNet")),
        "operating_lease_rou_asset": to_millions(extract_instant_tag(facts, "OperatingLeaseRightOfUseAsset")),
        "goodwill": to_millions(extract_instant_tag(facts, "Goodwill")),
        "deferred_tax_assets_net": to_millions(extract_instant_tag(facts, "DeferredIncomeTaxAssetsNet")),
        "other_noncurrent_assets": to_millions(extract_instant_tag(facts, "OtherAssetsNoncurrent")),
        "total_assets": to_millions(extract_instant_tag(facts, "Assets")),
    }
    bs_liabilities = {
        "accrued_liabilities_current": to_millions(extract_instant_tag(facts, "AccruedLiabilitiesCurrent")),
        "employee_related_liabilities_current": to_millions(extract_instant_tag(facts, "EmployeeRelatedLiabilitiesCurrent")),
        "current_debt": to_millions(extract_instant_tag(facts, "LongTermDebtCurrent")),
        "operating_lease_liability_current": to_millions(extract_instant_tag(facts, "OperatingLeaseLiabilityCurrent")),
        "total_current_liabilities": to_millions(extract_instant_tag(facts, "LiabilitiesCurrent")),
        "long_term_debt_noncurrent": to_millions(extract_instant_tag(facts, "LongTermDebtNoncurrent")),
        "operating_lease_liability_noncurrent": to_millions(extract_instant_tag(facts, "OperatingLeaseLiabilityNoncurrent")),
        "other_noncurrent_liabilities": to_millions(extract_instant_tag(facts, "OtherLiabilitiesNoncurrent")),
        "total_liabilities": to_millions(extract_instant_tag(facts, "Liabilities")),
    }
    bs_equity = {
        "common_stock": to_millions(extract_instant_tag(facts, "CommonStockValue")),
        "additional_paid_in_capital": to_millions(extract_instant_tag(facts, "AdditionalPaidInCapital")),
        "retained_earnings": to_millions(extract_instant_tag(facts, "RetainedEarningsAccumulatedDeficit")),
        "aoci": to_millions(extract_instant_tag(facts, "AccumulatedOtherComprehensiveIncomeLossNetOfTax")),
        "total_equity": to_millions(extract_instant_tag(facts, "StockholdersEquity")),
        "total_liabilities_and_equity": to_millions(extract_instant_tag(facts, "LiabilitiesAndStockholdersEquity")),
    }

    # ═══ Cash Flow Statement ═══
    print("Extracting Cash Flow Statement...")
    # Cash flow only has annual + 9-month YTD in XBRL, need special handling
    cf_ops = {
        "net_income": to_millions(extract_duration_tag(facts, "NetIncomeLoss")),
        "depreciation_and_amortization": to_millions(extract_duration_tag(facts, "DepreciationAndAmortization")),
        "share_based_compensation": to_millions(extract_duration_tag(facts, "ShareBasedCompensation")),
        "deferred_income_tax": to_millions(extract_duration_tag(facts, "DeferredIncomeTaxExpenseBenefit")),
        "goodwill_impairment": to_millions(extract_duration_tag(facts, "GoodwillImpairmentLoss")),
        "other_asset_impairment": to_millions(extract_duration_tag(facts, "OtherAssetImpairmentCharges")),
        "gain_loss_on_sale_of_business": to_millions(extract_duration_tag(facts, "GainLossOnSaleOfBusiness")),
        "change_in_receivables": to_millions(extract_duration_tag(facts, "IncreaseDecreaseInAccountsReceivable")),
        "change_in_inventories": to_millions(extract_duration_tag(facts, "IncreaseDecreaseInInventories")),
        "change_in_accounts_payable": to_millions(extract_duration_tag(facts, "IncreaseDecreaseInAccountsPayableTrade")),
        "change_in_accrued_liabilities": to_millions(extract_duration_tag(facts, "IncreaseDecreaseInAccruedLiabilities")),
        "change_in_employee_liabilities": to_millions(extract_duration_tag(facts, "IncreaseDecreaseInEmployeeRelatedLiabilities")),
        "other_operating": to_millions(extract_duration_tag(facts, "OtherOperatingActivitiesCashFlowStatement")),
        "net_cash_from_operating": to_millions(extract_duration_tag(facts, "NetCashProvidedByUsedInOperatingActivities")),
    }
    cf_inv = {
        "capital_expenditures": to_millions(extract_duration_tag(facts, "PaymentsToAcquirePropertyPlantAndEquipment")),
        "proceeds_from_sale_of_business": to_millions(extract_duration_tag(facts, "ProceedsFromDivestitureOfBusinesses")),
        "proceeds_from_sale_of_ppe": to_millions(extract_duration_tag(facts, "ProceedsFromSaleOfPropertyPlantAndEquipment")),
        "net_cash_from_investing": to_millions(extract_duration_tag(facts, "NetCashProvidedByUsedInInvestingActivities")),
    }
    cf_fin = {
        "proceeds_from_debt": to_millions(extract_duration_tag(facts, "ProceedsFromIssuanceOfDebt")),
        "repayments_of_debt": to_millions(extract_duration_tag(facts, "RepaymentsOfDebt")),
        "proceeds_from_equity": to_millions(extract_duration_tag(facts, "ProceedsFromIssuanceOrSaleOfEquity")),
        "tax_withholding_payments": to_millions(extract_duration_tag(facts, "PaymentsRelatedToTaxWithholdingForShareBasedCompensation")),
        "net_cash_from_financing": to_millions(extract_duration_tag(facts, "NetCashProvidedByUsedInFinancingActivities")),
    }
    fx_effect = to_millions(extract_duration_tag(facts, "EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"))
    net_change = to_millions(extract_duration_tag(facts, "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect"))
    ending_cash = to_millions(extract_instant_tag(facts, "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"))

    # Free cash flow = OCF + CapEx (capex is negative)
    fcf = {}
    ocf = cf_ops.get("net_cash_from_operating", {})
    capex = cf_inv.get("capital_expenditures", {})
    for p in PERIODS_IS:
        o = ocf.get(p)
        c = capex.get(p)
        if o is not None and c is not None:
            fcf[p] = round(o - c, 1)  # capex is positive in XBRL (payments), so subtract

    # ═══ Financial Ratios ═══
    print("Computing financial ratios...")
    ratios = {}
    for p in PERIODS_BS:
        ca = bs_assets["total_current_assets"].get(p)
        cl = bs_liabilities["total_current_liabilities"].get(p)
        inv = bs_assets["inventories"].get(p)
        cash = bs_assets["cash_and_cash_equivalents"].get(p)
        ta = bs_assets["total_assets"].get(p)
        tl = bs_liabilities["total_liabilities"].get(p)
        te = bs_equity["total_equity"].get(p)
        ltd = bs_liabilities["long_term_debt_noncurrent"].get(p, 0)
        cd = bs_liabilities["current_debt"].get(p, 0)
        total_debt = (ltd or 0) + (cd or 0)

        r = {}
        if ca is not None and cl is not None and cl != 0:
            r["current_ratio"] = round(ca / cl, 2)
        if ca is not None and inv is not None and cl is not None and cl != 0:
            r["quick_ratio"] = round((ca - (inv or 0)) / cl, 2)
        if tl is not None and te is not None and te != 0:
            r["debt_to_equity"] = round(tl / te, 2)
        if total_debt and te is not None and te != 0:
            r["net_debt_to_equity"] = round((total_debt - (cash or 0)) / te, 2)
        if ta is not None and ta != 0 and te is not None:
            r["equity_ratio"] = round(te / ta, 4)
        if r:
            ratios[p] = r

    # ═══ Assemble output ═══
    print("Assembling JSON output...")
    data = {
        "metadata": {
            "company": "Sandisk Corporation",
            "ticker": "SNDK",
            "exchange": "NASDAQ",
            "cik": "0002023554",
            "fiscal_year_end": "Late June (52/53-week fiscal year)",
            "currency": "USD",
            "unit": "millions_except_per_share",
            "last_updated": str(date.today()),
            "data_source": "SEC EDGAR XBRL API (data.sec.gov/api/xbrl/companyfacts)",
            "periods_income_statement": PERIODS_IS,
            "periods_balance_sheet": PERIODS_BS,
            "notes": "Q1 FY2025 income statement from comparative period in Q2 10-Q. Q4 FY2025 income statement/cash flow derived (FY full year minus 9-month YTD). Q1 FY2025 balance sheet not available (no Q1 filing). FY2025_START is the opening balance (Jun 28, 2024)."
        },
        "filings": {p: {
            "form": info["form"],
            "period_end": PERIOD_ENDS[p],
            "filing_date": info["filing_date"],
            "accession_number": info["accession"],
            "source_url": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002023554&type=10-&dateb=&owner=include&count=40"
        } for p, info in FILING_INFO.items()},
        "income_statement": income_statement,
        "balance_sheet": {
            "assets": bs_assets,
            "liabilities": bs_liabilities,
            "equity": bs_equity,
        },
        "cash_flow_statement": {
            "operating_activities": cf_ops,
            "investing_activities": cf_inv,
            "financing_activities": cf_fin,
            "fx_effect_on_cash": fx_effect,
            "net_change_in_cash": net_change,
            "ending_cash": ending_cash,
            "free_cash_flow": fcf,
        },
        "financial_ratios": ratios,
        "notable_events": [
            {
                "period": "Q1_FY2025",
                "category": "Corporate",
                "date": "2024-09-27",
                "description": "Q1 FY2025 is the first quarter after separation from Western Digital. SNDK began trading independently."
            },
            {
                "period": "Q3_FY2025",
                "category": "Impairment",
                "date": "2025-03-28",
                "description": "Q3 FY2025 Net Income includes large impairment/restructuring charges leading to -$1,933M net loss."
            },
            {
                "period": "Q4_FY2025",
                "category": "Data Note",
                "date": "2025-06-27",
                "description": "Q4 FY2025 income statement and cash flow are DERIVED (full-year 10-K minus 9-month YTD from Q3 10-Q)."
            },
        ],
    }

    # Build long format
    data["long_format"] = build_long_format(data)

    # Add ratios to long format
    for p, r in ratios.items():
        for metric, val in r.items():
            data["long_format"].append({
                "period": p, "period_end": PERIOD_ENDS.get(p, ""),
                "statement": "financial_ratios", "metric": metric,
                "value": val, "unit": "ratio"
            })

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✓ JSON saved: {JSON_OUT}")
    print(f"  Income Statement periods: {PERIODS_IS}")
    print(f"  Balance Sheet periods: {PERIODS_BS}")
    print(f"  Long format rows: {len(data['long_format'])}")

    # Print summary
    print("\n=== Revenue Summary (USD M) ===")
    for p in PERIODS_IS:
        v = revenue.get(p, "—")
        print(f"  {p}: {v}")

    print("\n=== Net Income Summary (USD M) ===")
    for p in PERIODS_IS:
        v = net_income.get(p, "—")
        print(f"  {p}: {v}")

    print("\n=== Total Assets (USD M) ===")
    for p in PERIODS_BS:
        v = bs_assets["total_assets"].get(p, "—")
        print(f"  {p}: {v}")

    # Count missing values
    missing = 0
    total = 0
    for metric, vals in income_statement.items():
        for p in PERIODS_IS:
            total += 1
            if vals.get(p) is None:
                missing += 1
                print(f"  MISSING: income_statement.{metric}.{p}")

    print(f"\n  Income Statement coverage: {total - missing}/{total} ({(total-missing)/total*100:.0f}%)")

    return data


if __name__ == "__main__":
    main()
