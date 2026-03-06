"""News fetcher：從 yfinance 取得個股近期新聞"""

import yfinance as yf


def _tw_ticker(ticker: str) -> str:
    return ticker if "." in ticker else f"{ticker}.TW"


class NewsFetcher:
    def __init__(self, market: str = "us"):
        self.market = market

    def _resolve(self, ticker: str) -> str:
        return _tw_ticker(ticker) if self.market == "tw" else ticker

    def get_news(self, ticker: str, max_items: int = 10) -> list[dict]:
        """
        取得個股近期新聞。
        回傳格式：[{"title": str, "link": str, "publishTime": str}, ...]
        """
        symbol = self._resolve(ticker)
        raw = yf.Ticker(symbol).news or []
        results = []
        for item in raw[:max_items]:
            content = item.get("content", {})
            pub_date = content.get("pubDate", "")
            title = content.get("title", item.get("title", ""))
            # canonicalUrl 或 clickThroughUrl
            link = (
                content.get("canonicalUrl", {}).get("url")
                or content.get("clickThroughUrl", {}).get("url")
                or item.get("link", "")
            )
            if title:
                results.append({
                    "title": title,
                    "link": link,
                    "publishTime": pub_date,
                })
        return results
