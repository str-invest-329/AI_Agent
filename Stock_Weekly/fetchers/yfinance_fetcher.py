"""yfinance fetcher：取得台股/美股價格與基本資料"""

from datetime import datetime, timedelta
import yfinance as yf


def _tw_ticker(ticker: str) -> str:
    """台股 ticker 補上 .TW 後綴"""
    return ticker if "." in ticker else f"{ticker}.TW"


class YFinanceFetcher:
    def __init__(self, market: str = "us"):
        """
        market: 'tw' | 'us'
        """
        self.market = market

    def _resolve(self, ticker: str) -> str:
        return _tw_ticker(ticker) if self.market == "tw" else ticker

    def get_price_history(self, ticker: str, days: int = 60) -> dict:
        """
        取得近 N 天 OHLCV 資料。
        回傳格式：
        {
            "ticker": str,
            "df": pd.DataFrame,   # columns: Open, High, Low, Close, Volume
            "currency": str,
            "longName": str,
        }
        """
        symbol = self._resolve(ticker)
        end = datetime.today()
        start = end - timedelta(days=days)
        yf_ticker = yf.Ticker(symbol)
        df = yf_ticker.history(start=start.strftime("%Y-%m-%d"),
                                end=end.strftime("%Y-%m-%d"))
        info = yf_ticker.info
        return {
            "ticker": ticker,
            "symbol": symbol,
            "df": df,
            "currency": info.get("currency", ""),
            "longName": info.get("longName") or info.get("shortName", ticker),
        }

    def get_info(self, ticker: str) -> dict:
        """取得公司基本資訊（市值、產業、PE 等）"""
        symbol = self._resolve(ticker)
        return yf.Ticker(symbol).info
