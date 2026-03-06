#!/usr/bin/env python3
"""
更新歷史週報

用法：
  python3 update_report.py 2026-W09 --html
  python3 update_report.py 2026-W09 --data path/to/data.js
  python3 update_report.py 2026-W09 --images img1.png img2.png
  python3 update_report.py 2026-W09 --html --data new_data.js --images chart.png
"""

import sys
import shutil
import argparse
from pathlib import Path

BASE = Path(__file__).parent
TEMPLATE = BASE / "dev" / "template"
REPORTS = BASE / "reports"


def main():
    parser = argparse.ArgumentParser(description="更新歷史週報")
    parser.add_argument("week", help="週次，例如 2026-W09")
    parser.add_argument("--html", action="store_true", help="從 template 同步 index.html")
    parser.add_argument("--data", metavar="FILE", help="替換 data.js")
    parser.add_argument("--images", metavar="FILE", nargs="+", help="複製圖片到 images/")
    args = parser.parse_args()

    dest = REPORTS / args.week
    if not dest.exists():
        print(f"找不到週報資料夾：{dest}")
        sys.exit(1)

    if not any([args.html, args.data, args.images]):
        parser.print_help()
        sys.exit(0)

    if args.html:
        shutil.copy(TEMPLATE / "index.html", dest / "index.html")
        print(f"已同步 index.html → {dest}")

    if args.data:
        src = Path(args.data)
        if not src.exists():
            print(f"找不到檔案：{src}")
            sys.exit(1)
        shutil.copy(src, dest / "data.js")
        print(f"已更新 data.js → {dest}")

    if args.images:
        img_dir = dest / "images"
        img_dir.mkdir(exist_ok=True)
        for f in args.images:
            src = Path(f)
            if not src.exists():
                print(f"找不到圖片：{src}")
                continue
            shutil.copy(src, img_dir / src.name)
            print(f"已複製 {src.name} → {img_dir}")


if __name__ == "__main__":
    main()
