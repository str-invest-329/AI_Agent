#!/usr/bin/env python3
"""
新建週報資料夾
用法：
  python3 new_report.py          # 自動使用當週
  python3 new_report.py 2026-W10 # 指定週數
"""

import sys
import shutil
from datetime import date
from pathlib import Path

BASE = Path(__file__).parent
TEMPLATE = BASE / "dev" / "template"
REPORTS = BASE / "reports"


def current_week() -> str:
    d = date.today()
    year, week, _ = d.isocalendar()
    return f"{year}-W{week:02d}"


def main():
    week = sys.argv[1] if len(sys.argv) > 1 else current_week()

    dest = REPORTS / week
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
