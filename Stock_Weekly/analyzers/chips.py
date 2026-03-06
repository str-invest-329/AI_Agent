"""籌碼面分析：台股三大法人、融資融券；美股空頭部位、機構持股"""


class ChipsAnalyzer:
    def analyze_tw(self, institutional: list, margin: list) -> dict:
        """
        分析台股籌碼：三大法人 + 融資融券。
        institutional: FinMindFetcher.get_institutional() 回傳資料
        margin: FinMindFetcher.get_margin() 回傳資料
        """
        result = {}

        # 三大法人最近一筆
        if institutional:
            latest = institutional[-1]
            result["institutional"] = {
                "date": latest.get("date"),
                "foreign_net": latest.get("Foreign_Investor_Buy", 0) - latest.get("Foreign_Investor_Sell", 0),
                "trust_net": latest.get("Investment_Trust_Buy", 0) - latest.get("Investment_Trust_Sell", 0),
                "dealer_net": latest.get("Dealer_Buy", 0) - latest.get("Dealer_Sell", 0),
            }
            # 近 5 日外資累計
            last5 = institutional[-5:]
            result["institutional"]["foreign_5d_net"] = sum(
                r.get("Foreign_Investor_Buy", 0) - r.get("Foreign_Investor_Sell", 0)
                for r in last5
            )

        # 融資融券最近一筆
        if margin:
            latest = margin[-1]
            result["margin"] = {
                "date": latest.get("date"),
                "margin_balance": latest.get("MarginPurchaseBalance"),      # 融資餘額
                "short_balance": latest.get("ShortSaleBalance"),            # 融券餘額
                "margin_change": latest.get("MarginPurchaseTodayBalance"),  # 融資增減
                "short_change": latest.get("ShortSaleTodayBalance"),        # 融券增減
            }

        return result

    def analyze_us(self, short_interest: dict, institutional: dict) -> dict:
        """分析美股籌碼：空頭部位 + 機構持股"""
        result = {}

        if short_interest and "error" not in short_interest:
            result["short_interest"] = short_interest

        if institutional and "error" not in institutional:
            result["institutional_ownership"] = institutional

        return result
