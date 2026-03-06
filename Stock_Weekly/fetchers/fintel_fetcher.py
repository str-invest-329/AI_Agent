"""Fintel / Barchart fetcher：美股籌碼面資料"""

import requests


class FintelFetcher:
    """
    使用 Fintel API 取得美股籌碼資料。
    目前支援：
      - 空頭部位（short interest）
      - 機構持股變化
    需要 Fintel API Key。
    """

    FINTEL_BASE = "https://fintel.io/api"

    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    def get_short_interest(self, ticker: str) -> dict:
        """取得最新空頭部位資料"""
        if not self.api_key:
            return {"error": "Fintel API key not configured"}
        url = f"{self.FINTEL_BASE}/si/{ticker}"
        resp = requests.get(url, headers=self.headers, timeout=15)
        resp.raise_for_status()
        return resp.json()

    def get_institutional_ownership(self, ticker: str) -> dict:
        """取得機構持股摘要"""
        if not self.api_key:
            return {"error": "Fintel API key not configured"}
        url = f"{self.FINTEL_BASE}/so/top/{ticker}"
        resp = requests.get(url, headers=self.headers, timeout=15)
        resp.raise_for_status()
        return resp.json()
