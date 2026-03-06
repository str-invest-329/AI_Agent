#!/usr/bin/env bash
# ============================================================
# Macro Weekly — 一鍵驗證 + 抓取
# 用法: bash setup_and_fetch.sh
# ============================================================
set -e
cd "$(dirname "$0")"

BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

echo -e "${BOLD}══ Macro Weekly Setup & Fetch ══════════════════════${RESET}"

# ── 1. 確認 .env 存在 ─────────────────────────────────────
if [ ! -f .env ]; then
  echo -e "${RED}✗ 找不到 .env，請先執行：cp .env.example .env${RESET}"
  exit 1
fi

# ── 2. 讀取並驗證 FRED_API_KEY ───────────────────────────
source .env
if [ -z "$FRED_API_KEY" ] || [ "$FRED_API_KEY" = "YOUR_FRED_API_KEY_HERE" ]; then
  echo -e "${RED}✗ FRED_API_KEY 未設定${RESET}"
  echo ""
  echo -e "${BOLD}申請步驟：${RESET}"
  echo -e "  1. 前往 ${BLUE}https://fredaccount.stlouisfed.org/login/secure/${RESET}"
  echo -e "  2. 建立免費帳號（或登入）"
  echo -e "  3. 點選右上角帳號 → API Keys → Request API Key"
  echo -e "  4. 填寫用途（e.g. Personal research / weekly macro report）"
  echo -e "  5. 複製 32 位英數字 Key"
  echo -e "  6. 填入 .env："
  echo -e "     ${YELLOW}FRED_API_KEY=your_32_char_key_here${RESET}"
  echo ""
  echo -e "     也填入 .mcp.json（兩個 \"YOUR_FRED_API_KEY_HERE\" 位置）"
  exit 1
fi

echo -e "${GREEN}✓ FRED_API_KEY 已設定${RESET}"

# ── 3. 驗證 FRED API 連線 ────────────────────────────────
echo -n "  驗證 FRED 連線... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 \
  "https://api.stlouisfed.org/fred/series?series_id=UNRATE&api_key=${FRED_API_KEY}&file_type=json")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}OK (HTTP $HTTP_CODE)${RESET}"
else
  echo -e "${RED}失敗 (HTTP $HTTP_CODE)，請確認 Key 是否正確${RESET}"
  exit 1
fi

# ── 4. 更新 .mcp.json 的 Key ────────────────────────────
if grep -q "YOUR_FRED_API_KEY_HERE" .mcp.json 2>/dev/null; then
  sed -i '' "s/YOUR_FRED_API_KEY_HERE/${FRED_API_KEY}/g" .mcp.json
  echo -e "${GREEN}✓ .mcp.json 已更新${RESET}"
fi

# ── 5. 執行 fetch ────────────────────────────────────────
echo ""
echo -e "${BOLD}[ 開始抓取資料 ]${RESET}"
uv run fetch.py --start 2020-01-01 --snapshot

echo ""
echo -e "${BOLD}[ 完成 ]${RESET}"
echo -e "  資料位置：${BLUE}data/timeseries.json${RESET}"
echo -e "  快照位置：${BLUE}data/snapshots/$(date +%Y-W%V).json${RESET}"
echo ""
echo -e "  MCP Server 重啟 Claude Code 後即可使用："
echo -e "  ${YELLOW}fred${RESET}  → FRED 840,000+ 經濟時間序列"
echo -e "  ${YELLOW}macro${RESET} → macroeconomic-mcp-server（FRED + 分析工具）"
