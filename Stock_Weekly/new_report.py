#!/usr/bin/env python3
"""
新建個股週報資料夾

用法：
  python3 new_report.py NVDA            # 自動使用當週
  python3 new_report.py NVDA 2026-W10   # 指定週數
"""

import sys
import shutil
from datetime import date
from pathlib import Path

BASE     = Path(__file__).parent
TEMPLATE = BASE / "dev" / "template"
DEV      = BASE / "dev"


def current_week() -> str:
    d = date.today()
    year, week, _ = d.isocalendar()
    return f"{year}-W{week:02d}"


def main():
    if len(sys.argv) < 2:
        print("用法: python3 new_report.py TICKER [WEEK]")
        print("  例: python3 new_report.py NVDA")
        print("  例: python3 new_report.py NVDA 2026-W10")
        sys.exit(1)

    ticker = sys.argv[1].upper()
    week   = sys.argv[2] if len(sys.argv) > 2 else current_week()
    folder = f"{ticker}-{week}"
    dest   = DEV / folder

    if dest.exists():
        print(f"已存在：{dest}")
        sys.exit(1)

    dest.mkdir(parents=True)
    shutil.copy(TEMPLATE / "index.html", dest / "index.html")
    shutil.copy(TEMPLATE / "data.js",    dest / "data.js")
    shutil.copy(TEMPLATE / "debug.js",   dest / "debug.js")
    (dest / "images").mkdir()

    print(f"建立完成：{dest}")


if __name__ == "__main__":
    main()
