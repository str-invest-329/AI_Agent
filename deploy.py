#!/usr/bin/env python3
"""
Deploy script: copies web projects from AI_Agent to AI_Agent_Publish repo.

Usage:
    python3 deploy.py              # copy files + git push
    python3 deploy.py --dry-run    # preview only, no copy

To add a new project, add an entry to DEPLOY_ITEMS below.
"""

import shutil
import subprocess
import sys
from pathlib import Path

# ── Paths ──
SOURCE = Path(__file__).parent.resolve()
PUBLISH = SOURCE.parent / "AI_Agent_Publish"

# ── What to deploy ──
# Each entry: (source_path_relative_to_AI_Agent, destination_path_in_publish_repo)
# Use None as destination to keep the same path.
DEPLOY_ITEMS = [
    # Entry page
    ("index.html", None),
    ("Portal", None),

    # Shared assets (images, css, fonts)
    ("Assets/images", None),
    ("Assets/css", None),
    ("Assets/fonts", None),
    ("Assets/colors.json", None),

    # Command Center (latest weekly report)
    ("Command_Center/dev/2026-W10", None),
    ("Command_Center/dev/template", None),

    # AlphaDash
    ("AlphaDash/index.html", None),
    ("AlphaDash/Data", None),

    # Stock Weekly
    ("Stock_Weekly/dev", None),

    # Financials Viewer
    ("Investment_Data/financials_viewer.html", None),
    ("Investment_Data/tickers.json", None),

    # Equity Research
    ("Equity_Research/US", None),
    ("Equity_Research/TW", None),
]

# Financial data: deploy only the JSON files (not xlsx, filings, backups, raw)
FINANCIALS_DIR = "Investment_Data/financials"
FINANCIALS_INCLUDE = ["_financials.json"]  # filename must end with this


def copy_financials(dry_run: bool):
    """Copy only the clean JSON files for each ticker."""
    src_dir = SOURCE / FINANCIALS_DIR
    if not src_dir.exists():
        return
    for ticker_dir in sorted(src_dir.iterdir()):
        if not ticker_dir.is_dir():
            continue
        for f in ticker_dir.iterdir():
            if f.is_file() and any(f.name.endswith(suffix) for suffix in FINANCIALS_INCLUDE):
                dest = PUBLISH / FINANCIALS_DIR / ticker_dir.name / f.name
                if dry_run:
                    print(f"  [financials] {f.relative_to(SOURCE)} -> {dest.relative_to(PUBLISH)}")
                else:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(f, dest)


def deploy(dry_run: bool):
    if not PUBLISH.exists():
        print(f"Error: Publish repo not found at {PUBLISH}")
        print(f"Run: git clone https://github.com/str-invest-329/AI_Agent_Publish.git {PUBLISH}")
        sys.exit(1)

    # Clean old files (except .git)
    if not dry_run:
        for item in PUBLISH.iterdir():
            if item.name == ".git":
                continue
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()

    print("Deploying items:")
    for src_rel, dest_rel in DEPLOY_ITEMS:
        src = SOURCE / src_rel
        dest = PUBLISH / (dest_rel or src_rel)

        if not src.exists():
            print(f"  [SKIP] {src_rel} (not found)")
            continue

        if dry_run:
            print(f"  {src_rel} -> {dest.relative_to(PUBLISH)}")
            continue

        if src.is_file():
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
        else:
            shutil.copytree(src, dest, dirs_exist_ok=True)

    # Financial data (selective copy)
    copy_financials(dry_run)

    if dry_run:
        print("\n(Dry run - no files were copied)")
        return

    # Git add, commit, push
    print("\nPushing to AI_Agent_Publish...")
    subprocess.run(["git", "add", "-A"], cwd=PUBLISH, check=True)

    # Check if there are changes to commit
    result = subprocess.run(
        ["git", "diff", "--cached", "--quiet"],
        cwd=PUBLISH,
    )
    if result.returncode == 0:
        print("No changes to deploy.")
        return

    subprocess.run(
        ["git", "commit", "-m", "Deploy update"],
        cwd=PUBLISH,
        check=True,
    )
    subprocess.run(
        ["git", "push", "origin", "main"],
        cwd=PUBLISH,
        check=True,
    )
    print("Deploy complete!")


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    deploy(dry_run)
