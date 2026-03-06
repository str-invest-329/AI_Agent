"""FinMind fetcher：台股籌碼面資料（三大法人、融資融券）"""

from datetime import datetime, timedelta
import requests


FINMIND_API = "https://api.finmindtrade.com/api/v4/data"


class FinMindFetcher:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key

    def _get(self, dataset: str, ticker: str, days: int) -> list:
        start = (datetime.today() - timedelta(days=days)).strftime("%Y-%m-%d")
        params = {
            "dataset": dataset,
            "data_id": ticker,
            "start_date": start,
            "token": self.api_key,
        }
        resp = requests.get(FINMIND_API, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json().get("data", [])

    def get_institutional(self, ticker: str, days: int = 30) -> list:
        """三大法人買賣超（外資、投信、自營商）"""
        return self._get("TaiwanStockInstitutionalInvestorsBuySell", ticker, days)

    def get_margin(self, ticker: str, days: int = 30) -> list:
        """融資融券餘額"""
        return self._get("TaiwanStockMarginPurchaseShortSale", ticker, days)

    def get_shareholding(self, ticker: str, days: int = 30) -> list:
        """大股東持股（董監事）"""
        return self._get("TaiwanStockHoldingSharesPer", ticker, days)
