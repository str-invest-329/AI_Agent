"""
xbrl_extract.py — Extract financials from SEC EDGAR XBRL API
Generic for any US-listed company.

Usage:
    python3 xbrl_extract.py --cik 0002023554 --ticker SNDK --fy-end-month 6 \
        --start Q1_FY2025 --out-dir ~/Investment_Data/financials/SNDK/

Output:
    {TICKER}_financials.json (tidy/long format + structured statements)

The script:
1. Downloads XBRL companyfacts from data.sec.gov
2. Maps CY frames to the company's fiscal quarters
3. Derives Q4 from full year minus 9-month YTD when needed
4. Computes financial ratios
5. Outputs structured JSON with long_format tidy data
"""
import argparse, json, os, sys, shutil
from datetime import date, datetime
from collections import OrderedDict

USER_AGENT = "Mozilla/5.0 (research tool) claude-code/1.0 contact@researchbot.local"


def fetch_xbrl(cik_padded):
    """Download XBRL companyfacts JSON from SEC EDGAR."""
    import subprocess
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik_padded}.json"
    result = subprocess.run(
        ["curl", "-s", "-A", USER_AGENT, url],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"ERROR: Failed to fetch XBRL data from {url}", file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)


def fetch_submissions(cik_padded):
    """Download submissions JSON to get filing details."""
    import subprocess
    url = f"https://data.sec.gov/submissions/CIK{cik_padded}.json"
    result = subprocess.run(
        ["curl", "-s", "-A", USER_AGENT, url],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


# ── Fiscal year / period mapping ──

def fy_quarter_for_date(period_end_str, fy_end_month):
    """
    Given a period_end date and fiscal year end month,
    determine FY quarter (Q1-Q4) and fiscal year.

    Example: fy_end_month=6 (June), period_end=2024-09-27 → Q1 FY2025
             fy_end_month=8 (Aug),  period_end=2024-11-28 → Q1 FY2025
             fy_end_month=12 (Dec), period_end=2025-03-31 → Q1 FY2025
    """
    d = datetime.strptime(period_end_str, "%Y-%m-%d")
    month = d.month

    # Months offset from FY start
    fy_start_month = (fy_end_month % 12) + 1  # month after FY end
    months_into_fy = (month - fy_start_month) % 12
    quarter = (months_into_fy // 3) + 1

    # Determine fiscal year
    if month > fy_end_month:
        fiscal_year = d.year + 1
    else:
        fiscal_year = d.year

    return quarter, fiscal_year


def build_frame_mapping(fy_end_month, start_q, start_fy, end_q=None, end_fy=None):
    """
    Build mapping from CY XBRL frames to FY quarters.
    Returns dict: { "CY2024Q3": "Q1_FY2025", ... } for duration tags
    and { "CY2024Q2I": "FY2025_START", ... } for instant tags.
    """
    # This is complex because XBRL uses calendar year frames.
    # We rely on actual date matching instead of frame names.
    # Frame names are used as hints but dates are authoritative.
    return {}  # We use date-based matching instead


def get_val_by_frame(entries, frame):
    for e in entries:
        if e.get("frame") == frame:
            return e["val"]
    return None


def get_val_by_dates(entries, start, end):
    for e in entries:
        if e.get("start") == start and e.get("end") == end:
            return e["val"]
    return None


def get_instant_val(entries, end_date):
    for e in entries:
        if e.get("end") == end_date and "start" not in e:
            return e["val"]
    return None


def extract_duration_tag(facts, tag_name, quarterly_periods, fy_full_year_period=None,
                         ytd_9m_dates=None, unit="USD"):
    """
    Extract quarterly values for a duration tag (IS/CF).

    quarterly_periods: dict { "Q1_FY2025": {"start": "2024-06-29", "end": "2024-09-27"}, ... }
    fy_full_year_period: {"start": "...", "end": "..."} for full year (to derive Q4)
    ytd_9m_dates: {"start": "...", "end": "..."} for 9-month YTD
    """
    if tag_name not in facts:
        return {}
    entries = facts[tag_name]["units"].get(unit, [])
    result = {}

    # Direct match by date range
    for fq, dates in quarterly_periods.items():
        val = get_val_by_dates(entries, dates["start"], dates["end"])
        if val is not None:
            result[fq] = val

    # Also try frame-based matching
    for e in entries:
        frame = e.get("frame", "")
        if not frame or frame.endswith("I"):
            continue
        start = e.get("start", "")
        end = e.get("end", "")
        if not start or not end:
            continue
        for fq, dates in quarterly_periods.items():
            if fq not in result and dates["start"] == start and dates["end"] == end:
                result[fq] = e["val"]

    # Derive Q4 if we have full year and 9-month YTD
    q4_key = None
    for fq in quarterly_periods:
        if fq.startswith("Q4_"):
            q4_key = fq
            break

    if q4_key and q4_key not in result and fy_full_year_period and ytd_9m_dates:
        fy_val = get_val_by_dates(entries, fy_full_year_period["start"], fy_full_year_period["end"])
        ytd_val = get_val_by_dates(entries, ytd_9m_dates["start"], ytd_9m_dates["end"])
        if fy_val is not None and ytd_val is not None:
            result[q4_key] = fy_val - ytd_val
        elif fy_val is not None:
            # Fallback: sum Q1+Q2+Q3
            q1k = q4_key.replace("Q4_", "Q1_")
            q2k = q4_key.replace("Q4_", "Q2_")
            q3k = q4_key.replace("Q4_", "Q3_")
            if all(k in result for k in [q1k, q2k, q3k]):
                result[q4_key] = fy_val - sum(result[k] for k in [q1k, q2k, q3k])

    return result


def extract_instant_tag(facts, tag_name, bs_date_map, unit="USD"):
    """
    Extract values for an instant (balance sheet) tag.
    bs_date_map: { "Q2_FY2025": "2024-12-27", ... }
    """
    if tag_name not in facts:
        return {}
    entries = facts[tag_name]["units"].get(unit, [])
    result = {}
    for fq, end_date in bs_date_map.items():
        # Try frame match first
        for e in entries:
            if e.get("end") == end_date and "start" not in e:
                result[fq] = e["val"]
                break
    return result


def to_millions(d, decimals=1):
    return {k: round(v / 1_000_000, decimals) if v is not None else None for k, v in d.items()}


def compute_pct(num_dict, den_dict):
    result = {}
    for k in set(num_dict) | set(den_dict):
        n = num_dict.get(k)
        d = den_dict.get(k)
        if n is not None and d is not None and d != 0:
            result[k] = round(n / d, 4)
    return result


# ── Tag discovery ──

# Common XBRL tags for the 3 statements, in priority order (first match wins)
IS_TAG_MAP = OrderedDict([
    ("revenue", ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet"]),
    ("cost_of_goods_sold", ["CostOfGoodsAndServicesSold", "CostOfRevenue", "CostOfGoodsSold", "CostOfGoodsAndServiceExcludingDepreciationDepletionAndAmortization"]),
    ("gross_profit", ["GrossProfit"]),
    ("research_and_development", ["ResearchAndDevelopmentExpense"]),
    ("selling_general_administrative", ["SellingGeneralAndAdministrativeExpense"]),
    ("restructuring_charges", ["RestructuringCharges", "RestructuringSettlementAndImpairmentProvisions"]),
    ("operating_income", ["OperatingIncomeLoss"]),
    ("interest_expense", ["InterestExpense", "InterestExpenseNonoperating"]),
    ("interest_income", ["InvestmentIncomeInterest", "InterestIncomeOther", "InterestAndDividendIncomeOperating"]),
    ("other_nonoperating_income_expense", ["OtherNonoperatingIncomeExpense", "NonoperatingIncomeExpense"]),
    ("income_before_taxes", ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest", "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments"]),
    ("income_tax_expense", ["IncomeTaxExpenseBenefit"]),
    ("equity_method_investments", ["IncomeLossFromEquityMethodInvestments"]),
    ("net_income", ["NetIncomeLoss"]),
    ("eps_basic", ["EarningsPerShareBasic"]),
    ("eps_diluted", ["EarningsPerShareDiluted"]),
    ("shares_basic", ["WeightedAverageNumberOfSharesOutstandingBasic"]),
    ("shares_diluted", ["WeightedAverageNumberOfDilutedSharesOutstanding"]),
])

BS_TAG_MAP = OrderedDict([
    ("cash_and_cash_equivalents", ["CashAndCashEquivalentsAtCarryingValue"]),
    ("short_term_investments", ["ShortTermInvestments", "AvailableForSaleSecuritiesDebtSecuritiesCurrent", "MarketableSecuritiesCurrent"]),
    ("accounts_receivable", ["AccountsReceivableNetCurrent"]),
    ("inventories", ["InventoryNet"]),
    ("other_current_assets", ["OtherAssetsCurrent", "PrepaidExpenseAndOtherAssetsCurrent"]),
    ("total_current_assets", ["AssetsCurrent"]),
    ("property_plant_equipment_net", ["PropertyPlantAndEquipmentNet"]),
    ("operating_lease_rou_asset", ["OperatingLeaseRightOfUseAsset"]),
    ("goodwill", ["Goodwill"]),
    ("intangible_assets", ["IntangibleAssetsNetExcludingGoodwill"]),
    ("deferred_tax_assets", ["DeferredIncomeTaxAssetsNet"]),
    ("other_noncurrent_assets", ["OtherAssetsNoncurrent"]),
    ("total_assets", ["Assets"]),
    ("accounts_payable", ["AccountsPayableCurrent"]),
    ("accrued_liabilities", ["AccruedLiabilitiesCurrent"]),
    ("current_debt", ["LongTermDebtCurrent", "ShortTermBorrowings"]),
    ("other_current_liabilities", ["OtherLiabilitiesCurrent"]),
    ("total_current_liabilities", ["LiabilitiesCurrent"]),
    ("long_term_debt", ["LongTermDebtNoncurrent", "LongTermDebt"]),
    ("operating_lease_noncurrent", ["OperatingLeaseLiabilityNoncurrent"]),
    ("other_noncurrent_liabilities", ["OtherLiabilitiesNoncurrent"]),
    ("total_liabilities", ["Liabilities"]),
    ("common_stock", ["CommonStockValue"]),
    ("additional_paid_in_capital", ["AdditionalPaidInCapital", "AdditionalPaidInCapitalCommonStock"]),
    ("retained_earnings", ["RetainedEarningsAccumulatedDeficit"]),
    ("treasury_stock", ["TreasuryStockValue"]),
    ("aoci", ["AccumulatedOtherComprehensiveIncomeLossNetOfTax"]),
    ("total_equity", ["StockholdersEquity"]),
    ("total_liabilities_and_equity", ["LiabilitiesAndStockholdersEquity"]),
])

CF_TAG_MAP = OrderedDict([
    ("depreciation_and_amortization", ["DepreciationAndAmortization", "DepreciationDepletionAndAmortization"]),
    ("share_based_compensation", ["ShareBasedCompensation", "AllocatedShareBasedCompensationExpense"]),
    ("deferred_income_tax", ["DeferredIncomeTaxExpenseBenefit"]),
    ("goodwill_impairment", ["GoodwillImpairmentLoss"]),
    ("other_asset_impairment", ["OtherAssetImpairmentCharges", "AssetImpairmentCharges"]),
    ("change_in_receivables", ["IncreaseDecreaseInAccountsReceivable"]),
    ("change_in_inventories", ["IncreaseDecreaseInInventories"]),
    ("change_in_accounts_payable", ["IncreaseDecreaseInAccountsPayableTrade", "IncreaseDecreaseInAccountsPayable"]),
    ("change_in_accrued_liabilities", ["IncreaseDecreaseInAccruedLiabilities"]),
    ("net_cash_from_operating", ["NetCashProvidedByUsedInOperatingActivities"]),
    ("capital_expenditures", ["PaymentsToAcquirePropertyPlantAndEquipment"]),
    ("net_cash_from_investing", ["NetCashProvidedByUsedInInvestingActivities"]),
    ("proceeds_from_debt", ["ProceedsFromIssuanceOfDebt", "ProceedsFromIssuanceOfLongTermDebt"]),
    ("repayments_of_debt", ["RepaymentsOfDebt", "RepaymentsOfLongTermDebt"]),
    ("net_cash_from_financing", ["NetCashProvidedByUsedInFinancingActivities"]),
    ("fx_effect", ["EffectOfExchangeRateOnCashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"]),
    ("net_change_in_cash", ["CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalentsPeriodIncreaseDecreaseIncludingExchangeRateEffect"]),
])


def find_first_tag(facts, candidates, min_year=None):
    """Return the first tag name that exists in facts with recent data.
    If min_year is set, prefer tags that have entries ending in or after that year.
    Falls back to first existing tag if none have recent data."""
    fallback = None
    for tag in candidates:
        if tag not in facts:
            continue
        if fallback is None:
            fallback = tag
        if min_year is None:
            return tag
        # Check if tag has recent data
        for unit_entries in facts[tag].get("units", {}).values():
            for e in unit_entries:
                end = e.get("end", "")
                if end and end[:4] >= str(min_year):
                    return tag
    return fallback


def resolve_tag_map(facts, tag_map, min_year=None):
    """Resolve a tag_map to actual tag names found in XBRL data.
    If min_year is set, prefer tags with data from that year onward."""
    resolved = {}
    for metric, candidates in tag_map.items():
        tag = find_first_tag(facts, candidates, min_year=min_year)
        if tag:
            resolved[metric] = tag
    return resolved


# ── Period detection from filings ──

def detect_periods_from_submissions(submissions, fy_end_month, start_q, start_fy):
    """
    Analyze 10-Q/10-K filings to determine quarterly periods and date ranges.
    Returns: quarterly_periods, bs_date_map, fy_full_year_period, ytd_9m_dates, filing_info
    """
    recent = submissions.get("filings", {}).get("recent", {})
    forms = recent.get("form", [])
    filing_dates = recent.get("filingDate", [])
    report_dates = recent.get("reportDate", [])
    accessions = recent.get("accessionNumber", [])
    primary_docs = recent.get("primaryDocument", [])

    filings = []
    for i in range(len(forms)):
        if forms[i] in ("10-Q", "10-K", "10-Q/A"):
            filings.append({
                "form": forms[i],
                "filing_date": filing_dates[i],
                "period_end": report_dates[i],
                "accession": accessions[i],
                "primary_doc": primary_docs[i],
            })

    # Sort by period_end
    filings.sort(key=lambda x: x["period_end"])

    # Determine quarters
    quarterly_periods = {}
    bs_date_map = {}
    filing_info = {}
    prev_end = None

    for f in filings:
        q, fy = fy_quarter_for_date(f["period_end"], fy_end_month)
        fq = f"Q{q}_FY{fy}"

        # Skip if before start
        if fy < start_fy or (fy == start_fy and q < start_q):
            prev_end = f["period_end"]
            continue

        # Skip 10-Q/A (amended) if we already have the period
        if f["form"] == "10-Q/A" and fq in filing_info:
            continue

        bs_date_map[fq] = f["period_end"]

        # For filing info, prefer 10-Q/10-K over amendments
        if fq not in filing_info or f["form"] != "10-Q/A":
            filing_info[fq] = {
                "form": "10-K" if f["form"] == "10-K" else "10-Q",
                "period_end": f["period_end"],
                "filing_date": f["filing_date"],
                "accession_number": f["accession"],
                "primary_doc": f["primary_doc"],
            }

        prev_end = f["period_end"]

    # Build quarterly date ranges (start = day after previous period end)
    # We need to figure out the start dates from the XBRL entries
    # For now, we'll rely on XBRL date matching

    return quarterly_periods, bs_date_map, filing_info


def build_periods_from_xbrl(facts, tag_name, fy_end_month, start_q, start_fy, unit="USD"):
    """
    Analyze a well-populated XBRL tag (like Revenue) to discover
    all quarterly periods with their exact date ranges.
    Returns: quarterly, annuals_by_fy, ytd_9m_by_fy, ytd_6m_by_fy
    """
    if tag_name not in facts:
        return {}, {}, {}, {}
    entries = facts[tag_name]["units"].get(unit, [])

    quarterly = {}
    annuals_by_fy = {}
    ytd_9m_by_fy = {}
    ytd_6m_by_fy = {}

    for e in entries:
        start = e.get("start")
        end = e.get("end")
        if not start or not end:
            continue

        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d")
        days = (end_dt - start_dt).days

        q, fy = fy_quarter_for_date(end, fy_end_month)
        fq = f"Q{q}_FY{fy}"

        if fy < start_fy or (fy == start_fy and q < start_q):
            continue

        if 60 <= days <= 105:  # Quarterly (~90 days)
            if fq not in quarterly:
                quarterly[fq] = {"start": start, "end": end}
        elif 340 <= days <= 380:  # Annual (~365 days)
            end_q, end_fy = fy_quarter_for_date(end, fy_end_month)
            if end_q == 4:
                annuals_by_fy[end_fy] = {"start": start, "end": end, "fy": end_fy}
        elif 240 <= days <= 290:  # 9-month YTD (~270 days)
            end_q, end_fy = fy_quarter_for_date(end, fy_end_month)
            if end_q == 3:
                ytd_9m_by_fy[end_fy] = {"start": start, "end": end, "fy": end_fy}
        elif 160 <= days <= 200:  # 6-month YTD (~180 days)
            end_q, end_fy = fy_quarter_for_date(end, fy_end_month)
            if end_q == 2:
                ytd_6m_by_fy[end_fy] = {"start": start, "end": end, "fy": end_fy}

    return quarterly, annuals_by_fy, ytd_9m_by_fy, ytd_6m_by_fy


def extract_duration_tag_with_ytd(facts, tag_name, quarterly_periods, fy_end_month,
                                   ytd_6m_by_fy, ytd_9m_by_fy, unit="USD"):
    """
    Extract quarterly values, deriving Q2/Q3 from YTD when standalone quarterly data is missing.
    Q2 = YTD_6M - Q1, Q3 = YTD_9M - YTD_6M
    """
    if tag_name not in facts:
        return {}
    entries = facts[tag_name]["units"].get(unit, [])
    result = {}

    # First get direct quarterly matches
    for fq, dates in quarterly_periods.items():
        if dates.get("start") == "DERIVED":
            continue
        val = get_val_by_dates(entries, dates["start"], dates["end"])
        if val is not None:
            result[fq] = val

    # Derive Q2 from YTD_6M - Q1
    for fy, ytd6 in ytd_6m_by_fy.items():
        q2_key = f"Q2_FY{fy}"
        q1_key = f"Q1_FY{fy}"
        if q2_key not in result and q2_key in quarterly_periods:
            ytd6_val = get_val_by_dates(entries, ytd6["start"], ytd6["end"])
            q1_val = result.get(q1_key)
            if ytd6_val is not None and q1_val is not None:
                result[q2_key] = ytd6_val - q1_val

    # Derive Q3 from YTD_9M - YTD_6M
    for fy, ytd9 in ytd_9m_by_fy.items():
        q3_key = f"Q3_FY{fy}"
        if q3_key not in result and q3_key in quarterly_periods:
            ytd9_val = get_val_by_dates(entries, ytd9["start"], ytd9["end"])
            ytd6 = ytd_6m_by_fy.get(fy)
            if ytd9_val is not None and ytd6:
                ytd6_val = get_val_by_dates(entries, ytd6["start"], ytd6["end"])
                if ytd6_val is not None:
                    result[q3_key] = ytd9_val - ytd6_val

    return result


def main():
    parser = argparse.ArgumentParser(description="Extract financials from SEC XBRL API")
    parser.add_argument("--cik", required=True, help="SEC CIK (zero-padded 10 digits)")
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--fy-end-month", type=int, required=True, help="Fiscal year end month (1-12)")
    parser.add_argument("--start", required=True, help="Start period e.g. Q1_FY2025")
    parser.add_argument("--out-dir", required=True, help="Output directory")
    parser.add_argument("--exchange", default="", help="Exchange name")
    parser.add_argument("--company", default="", help="Company name")
    args = parser.parse_args()

    ticker = args.ticker.upper()
    cik = args.cik.zfill(10)
    fy_end_month = args.fy_end_month
    out_dir = os.path.expanduser(args.out_dir)
    os.makedirs(out_dir, exist_ok=True)

    # Parse start period
    m = args.start.upper().replace(" ", "_")
    start_q = int(m.split("_")[0].replace("Q", ""))
    start_fy = int(m.split("_")[1].replace("FY", ""))

    # Fetch data
    print(f"Fetching XBRL data for {ticker} (CIK {cik})...")
    xbrl = fetch_xbrl(cik)
    facts = xbrl.get("facts", {}).get("us-gaap", {})
    entity_name = xbrl.get("entityName", args.company or ticker)

    print(f"Fetching submissions for filing details...")
    submissions = fetch_submissions(cik)

    # Save raw XBRL
    raw_path = os.path.join(out_dir, f"{ticker.lower()}_xbrl_raw.json")
    with open(raw_path, "w") as f:
        json.dump(xbrl, f)
    print(f"  Raw XBRL saved: {raw_path}")

    # Resolve tags (prefer tags with data from start fiscal year onward)
    print("Resolving XBRL tags...")
    is_tags = resolve_tag_map(facts, IS_TAG_MAP, min_year=start_fy - 1)
    bs_tags = resolve_tag_map(facts, BS_TAG_MAP, min_year=start_fy - 1)
    cf_tags = resolve_tag_map(facts, CF_TAG_MAP, min_year=start_fy - 1)

    print(f"  IS: {len(is_tags)}/{len(IS_TAG_MAP)} tags found")
    print(f"  BS: {len(bs_tags)}/{len(BS_TAG_MAP)} tags found")
    print(f"  CF: {len(cf_tags)}/{len(CF_TAG_MAP)} tags found")

    # Discover periods from a well-populated tag (Revenue or Net Income)
    rev_tag = is_tags.get("revenue")
    ni_tag = is_tags.get("net_income")
    discover_tag = rev_tag or ni_tag
    if not discover_tag:
        print("ERROR: Cannot find Revenue or Net Income tag", file=sys.stderr)
        sys.exit(1)

    print(f"Discovering periods from {discover_tag}...")
    quarterly_periods, annuals_by_fy, ytd_9m_by_fy, ytd_6m_by_fy = build_periods_from_xbrl(
        facts, discover_tag, fy_end_month, start_q, start_fy
    )

    # Get filing info
    _, bs_date_map, filing_info = detect_periods_from_submissions(
        submissions, fy_end_month, start_q, start_fy
    )

    # Determine all periods
    all_is_periods = sorted(quarterly_periods.keys(),
                            key=lambda p: (int(p.split("_")[1].replace("FY","")), int(p.split("_")[0].replace("Q",""))))

    # Check which Q4s need derivation (multiple fiscal years possible)
    q4_derivations = {}  # { "Q4_FY2024": {"fy_dates": ..., "ytd_dates": ...}, ... }
    for p in list(filing_info.keys()):
        if p.startswith("Q4_") and p not in quarterly_periods:
            fy = int(p.split("_")[1].replace("FY", ""))
            if fy in annuals_by_fy:
                annual = annuals_by_fy[fy]
                ytd = ytd_9m_by_fy.get(fy)
                q4_derivations[p] = {
                    "fy_dates": {"start": annual["start"], "end": annual["end"]},
                    "ytd_dates": {"start": ytd["start"], "end": ytd["end"]} if ytd else None,
                }
                if p not in all_is_periods:
                    all_is_periods.append(p)
                quarterly_periods[p] = {"start": "DERIVED", "end": "DERIVED"}

    all_is_periods.sort(key=lambda p: (int(p.split("_")[1].replace("FY","")), int(p.split("_")[0].replace("Q",""))))

    all_bs_periods = sorted(bs_date_map.keys(),
                            key=lambda p: (int(p.split("_")[1].replace("FY","")) if "FY" in p else 0,
                                           int(p.split("_")[0].replace("Q","")) if p[0]=="Q" else 0))

    print(f"\nPeriods found:")
    print(f"  IS: {all_is_periods}")
    print(f"  BS: {all_bs_periods}")
    for q4k in q4_derivations:
        print(f"  Q4 derivation: {q4k} (full year minus 9-month YTD)")

    # ── Extract Income Statement ──
    print("\nExtracting Income Statement...")
    income_statement = {}
    NON_DERIVABLE = {"eps_basic", "eps_diluted", "shares_basic", "shares_diluted"}

    for metric, tag in is_tags.items():
        unit = "USD"
        if metric in ("eps_basic", "eps_diluted"):
            unit = "USD/shares"
        elif metric in ("shares_basic", "shares_diluted"):
            unit = "shares"

        # Extract with Q4 derivation for each fiscal year
        vals = extract_duration_tag(facts, tag, quarterly_periods, unit=unit)

        # Derive Q4 for each fiscal year that needs it
        if metric not in NON_DERIVABLE:
            for q4k, q4info in q4_derivations.items():
                if q4k not in vals:
                    q4_vals = extract_duration_tag(
                        facts, tag, {q4k: quarterly_periods[q4k]},
                        fy_full_year_period=q4info["fy_dates"],
                        ytd_9m_dates=q4info["ytd_dates"],
                        unit=unit
                    )
                    vals.update(q4_vals)

        if metric in ("shares_basic", "shares_diluted"):
            vals = {k: round(v / 1_000_000, 1) for k, v in vals.items()}
            metric = metric + "_millions"
        elif metric in ("eps_basic", "eps_diluted"):
            vals = {k: round(v, 2) for k, v in vals.items()}
        else:
            vals = to_millions(vals)

        # Remove Q4 derived values for non-derivable metrics (weighted averages)
        if metric.replace("_millions", "") in NON_DERIVABLE:
            for q4k in q4_derivations:
                vals.pop(q4k, None)

        income_statement[metric] = vals

    # Compute margins
    rev = income_statement.get("revenue", {})
    gp = income_statement.get("gross_profit", {})
    oi = income_statement.get("operating_income", {})
    ni = income_statement.get("net_income", {})
    pretax = income_statement.get("income_before_taxes", {})
    tax = income_statement.get("income_tax_expense", {})

    income_statement["gross_margin_pct"] = compute_pct(gp, rev)
    income_statement["operating_margin_pct"] = compute_pct(oi, rev)
    income_statement["net_margin_pct"] = compute_pct(ni, rev)
    income_statement["effective_tax_rate"] = compute_pct(tax, pretax)

    # ── Extract Balance Sheet ──
    print("Extracting Balance Sheet...")
    bs_assets = {}
    bs_liabilities = {}
    bs_equity = {}

    ASSET_KEYS = ["cash_and_cash_equivalents", "short_term_investments", "accounts_receivable",
                  "inventories", "other_current_assets", "total_current_assets",
                  "property_plant_equipment_net", "operating_lease_rou_asset", "goodwill",
                  "intangible_assets", "deferred_tax_assets", "other_noncurrent_assets", "total_assets"]
    LIAB_KEYS = ["accounts_payable", "accrued_liabilities", "current_debt",
                 "other_current_liabilities", "total_current_liabilities",
                 "long_term_debt", "operating_lease_noncurrent",
                 "other_noncurrent_liabilities", "total_liabilities"]
    EQUITY_KEYS = ["common_stock", "additional_paid_in_capital", "retained_earnings",
                   "treasury_stock", "aoci", "total_equity", "total_liabilities_and_equity"]

    for metric, tag in bs_tags.items():
        vals = to_millions(extract_instant_tag(facts, tag, bs_date_map))
        if metric in ASSET_KEYS:
            bs_assets[metric] = vals
        elif metric in LIAB_KEYS:
            bs_liabilities[metric] = vals
        elif metric in EQUITY_KEYS:
            bs_equity[metric] = vals

    # ── Extract Cash Flow ──
    print("Extracting Cash Flow Statement...")
    cf_ops = {}
    cf_inv = {}
    cf_fin = {}
    cf_summary = {}

    OPS_KEYS = ["depreciation_and_amortization", "share_based_compensation", "deferred_income_tax",
                "goodwill_impairment", "other_asset_impairment", "change_in_receivables",
                "change_in_inventories", "change_in_accounts_payable", "change_in_accrued_liabilities",
                "net_cash_from_operating"]
    INV_KEYS = ["capital_expenditures", "net_cash_from_investing"]
    FIN_KEYS = ["proceeds_from_debt", "repayments_of_debt", "net_cash_from_financing"]
    SUMMARY_KEYS = ["fx_effect", "net_change_in_cash"]

    for metric, tag in cf_tags.items():
        # Try direct quarterly match first, then YTD derivation for Q2/Q3
        vals = extract_duration_tag_with_ytd(
            facts, tag, quarterly_periods, fy_end_month,
            ytd_6m_by_fy, ytd_9m_by_fy
        )
        # Also try basic extraction for any remaining
        basic = extract_duration_tag(facts, tag, quarterly_periods)
        for k, v in basic.items():
            if k not in vals:
                vals[k] = v
        # Derive Q4 for each fiscal year
        for q4k, q4info in q4_derivations.items():
            if q4k not in vals:
                q4_vals = extract_duration_tag(
                    facts, tag, {q4k: quarterly_periods[q4k]},
                    fy_full_year_period=q4info["fy_dates"],
                    ytd_9m_dates=q4info["ytd_dates"]
                )
                vals.update(q4_vals)
        vals = to_millions(vals)
        if metric in OPS_KEYS:
            cf_ops[metric] = vals
        elif metric in INV_KEYS:
            cf_inv[metric] = vals
        elif metric in FIN_KEYS:
            cf_fin[metric] = vals
        elif metric in SUMMARY_KEYS:
            cf_summary[metric] = vals

    # Add net_income to operating activities
    cf_ops = {"net_income": income_statement.get("net_income", {}), **cf_ops}

    # Ending cash (instant)
    ending_cash_tag = find_first_tag(facts, ["CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
                                              "CashAndCashEquivalentsAtCarryingValue"])
    ending_cash = to_millions(extract_instant_tag(facts, ending_cash_tag, bs_date_map)) if ending_cash_tag else {}

    # Free cash flow
    fcf = {}
    ocf = cf_ops.get("net_cash_from_operating", {})
    capex = cf_inv.get("capital_expenditures", {})
    for p in all_is_periods:
        o = ocf.get(p)
        c = capex.get(p)
        if o is not None and c is not None:
            fcf[p] = round(o - c, 1)

    # ── Financial Ratios ──
    print("Computing financial ratios...")
    ratios = {}
    for p in all_bs_periods:
        ca = bs_assets.get("total_current_assets", {}).get(p)
        cl = bs_liabilities.get("total_current_liabilities", {}).get(p)
        inv = bs_assets.get("inventories", {}).get(p)
        cash = bs_assets.get("cash_and_cash_equivalents", {}).get(p)
        ta = bs_assets.get("total_assets", {}).get(p)
        tl = bs_liabilities.get("total_liabilities", {}).get(p)
        te = bs_equity.get("total_equity", {}).get(p)
        ltd = bs_liabilities.get("long_term_debt", {}).get(p, 0) or 0
        cd = bs_liabilities.get("current_debt", {}).get(p, 0) or 0
        total_debt = ltd + cd

        r = {}
        if ca and cl and cl != 0:
            r["current_ratio"] = round(ca / cl, 2)
        if ca is not None and inv is not None and cl and cl != 0:
            r["quick_ratio"] = round((ca - (inv or 0)) / cl, 2)
        if tl is not None and te and te != 0:
            r["debt_to_equity"] = round(tl / te, 2)
        if total_debt and te and te != 0:
            r["net_debt_to_equity"] = round((total_debt - (cash or 0)) / te, 2)
        if ta and ta != 0 and te is not None:
            r["equity_ratio"] = round(te / ta, 4)
        if r:
            ratios[p] = r

    # ── Period end dates ──
    period_ends = {}
    for p in all_is_periods:
        if p in filing_info:
            period_ends[p] = filing_info[p]["period_end"]
    for p in all_bs_periods:
        if p in bs_date_map:
            period_ends[p] = bs_date_map[p]

    # ── Build long format ──
    print("Building long format...")
    long_rows = []
    for metric, vals in income_statement.items():
        for p in all_is_periods:
            v = vals.get(p)
            if v is not None:
                unit = "pct" if "pct" in metric or "rate" in metric else (
                    "USD_per_share" if "eps" in metric else (
                    "millions_shares" if "shares" in metric else "USD_millions"))
                long_rows.append({"period": p, "period_end": period_ends.get(p, ""),
                                  "statement": "income_statement", "metric": metric,
                                  "value": v, "unit": unit})

    for section, section_data in [("assets", bs_assets), ("liabilities", bs_liabilities), ("equity", bs_equity)]:
        for metric, vals in section_data.items():
            for p in all_bs_periods:
                v = vals.get(p)
                if v is not None:
                    long_rows.append({"period": p, "period_end": period_ends.get(p, ""),
                                      "statement": f"balance_sheet_{section}", "metric": metric,
                                      "value": v, "unit": "USD_millions"})

    # ── Assemble output ──
    notes_parts = []
    for q4k in q4_derivations:
        notes_parts.append(f"{q4k} income statement and cash flow are DERIVED (full-year 10-K minus 9-month YTD).")

    data = {
        "metadata": {
            "company": entity_name,
            "ticker": ticker,
            "exchange": args.exchange or "",
            "cik": cik,
            "fiscal_year_end_month": fy_end_month,
            "currency": "USD",
            "unit": "millions_except_per_share",
            "last_updated": str(date.today()),
            "data_source": "SEC EDGAR XBRL API (data.sec.gov/api/xbrl/companyfacts)",
            "periods_income_statement": all_is_periods,
            "periods_balance_sheet": all_bs_periods,
            "notes": " ".join(notes_parts) if notes_parts else "",
        },
        "filings": filing_info,
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
            "ending_cash": ending_cash,
            "free_cash_flow": fcf,
            **{k: v for k, v in cf_summary.items()},
        },
        "financial_ratios": ratios,
        "notable_events": [],
        "long_format": long_rows,
    }

    # Backup existing JSON if present
    json_path = os.path.join(out_dir, f"{ticker}_financials.json")
    if os.path.exists(json_path):
        backup = json_path.replace(".json", f"_backup_{date.today()}.json")
        shutil.copy(json_path, backup)
        print(f"  Backup: {backup}")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"  {ticker} financials extracted successfully")
    print(f"  JSON: {json_path}")
    print(f"  IS periods: {all_is_periods}")
    print(f"  BS periods: {all_bs_periods}")
    print(f"  Long format rows: {len(long_rows)}")
    print(f"  IS metrics: {len(income_statement)}")
    print(f"  BS metrics: {sum(len(v) for v in [bs_assets, bs_liabilities, bs_equity])}")
    print(f"  CF metrics: {sum(len(v) for v in [cf_ops, cf_inv, cf_fin, cf_summary])}")
    print(f"{'='*60}")

    # Print revenue summary
    print(f"\nRevenue (USD M):")
    for p in all_is_periods:
        v = income_statement.get("revenue", {}).get(p, "—")
        print(f"  {p}: {v}")

    return data


if __name__ == "__main__":
    main()
