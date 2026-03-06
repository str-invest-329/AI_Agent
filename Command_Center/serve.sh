#!/bin/bash
# 啟動本地 HTTP server，自動找最新週次
# 用法：./serve.sh [port]

PORT=${1:-8765}
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 找 dev/ 下最新的週資料夾（按名稱排序取最後一個）
LATEST=$(ls "$SCRIPT_DIR/dev/" | grep -E '^[0-9]{4}-W[0-9]+$' | sort | tail -1)

if [ -z "$LATEST" ]; then
  echo "找不到週資料夾，請確認 dev/ 目錄下有 YYYY-WNN 格式的資料夾"
  exit 1
fi

WEEK_DIR="$SCRIPT_DIR/dev/$LATEST"
echo "▶ 開啟 $LATEST（port $PORT）"
echo "  → http://localhost:$PORT"
echo "  按 Ctrl+C 停止"
echo ""

cd "$WEEK_DIR" && python3 -m http.server "$PORT"
