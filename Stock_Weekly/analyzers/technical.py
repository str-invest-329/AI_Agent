"""技術面分析：均線、RSI、MACD、布林通道"""

import pandas as pd


class TechnicalAnalyzer:
    def __init__(self, config: dict):
        self.ma_periods = config.get("ma_periods", [5, 20, 60])
        self.rsi_period = config.get("rsi_period", 14)
        macd_cfg = config.get("macd", {})
        self.macd_fast = macd_cfg.get("fast", 12)
        self.macd_slow = macd_cfg.get("slow", 26)
        self.macd_signal = macd_cfg.get("signal", 9)
        bb_cfg = config.get("bollinger", {})
        self.bb_period = bb_cfg.get("period", 20)
        self.bb_std = bb_cfg.get("std_dev", 2)

    def analyze(self, df: pd.DataFrame) -> dict:
        """
        輸入 OHLCV DataFrame，輸出技術指標摘要。
        """
        close = df["Close"]
        result = {}

        # --- 均線 ---
        for p in self.ma_periods:
            if len(close) >= p:
                result[f"MA{p}"] = round(close.rolling(p).mean().iloc[-1], 2)

        # --- RSI ---
        result["RSI"] = round(self._rsi(close, self.rsi_period), 2)

        # --- MACD ---
        macd_line, signal_line, hist = self._macd(close)
        result["MACD"] = {
            "macd": round(macd_line, 4),
            "signal": round(signal_line, 4),
            "hist": round(hist, 4),
        }

        # --- 布林通道 ---
        bb_mid = close.rolling(self.bb_period).mean()
        bb_std = close.rolling(self.bb_period).std()
        result["Bollinger"] = {
            "upper": round((bb_mid + self.bb_std * bb_std).iloc[-1], 2),
            "mid": round(bb_mid.iloc[-1], 2),
            "lower": round((bb_mid - self.bb_std * bb_std).iloc[-1], 2),
        }

        # --- 近週漲跌幅 ---
        if len(close) >= 6:
            result["week_change_pct"] = round(
                (close.iloc[-1] - close.iloc[-6]) / close.iloc[-6] * 100, 2
            )

        # --- 最新收盤價 & 成交量 ---
        result["close"] = round(close.iloc[-1], 2)
        result["volume"] = int(df["Volume"].iloc[-1])
        result["date"] = str(df.index[-1].date())

        return result

    # ── 私有計算方法 ──────────────────────────────────────────────────────────

    def _rsi(self, series: pd.Series, period: int) -> float:
        delta = series.diff()
        gain = delta.clip(lower=0).rolling(period).mean()
        loss = (-delta.clip(upper=0)).rolling(period).mean()
        rs = gain / loss.replace(0, float("nan"))
        rsi = 100 - 100 / (1 + rs)
        return rsi.iloc[-1]

    def _macd(self, series: pd.Series) -> tuple[float, float, float]:
        ema_fast = series.ewm(span=self.macd_fast, adjust=False).mean()
        ema_slow = series.ewm(span=self.macd_slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=self.macd_signal, adjust=False).mean()
        hist = macd_line - signal_line
        return macd_line.iloc[-1], signal_line.iloc[-1], hist.iloc[-1]
