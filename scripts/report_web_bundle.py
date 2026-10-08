#!/usr/bin/env python3
"""Report reproducible static bundle measurements for a built Memos web tree.

This is measurement-only. It deliberately does not encode acceptance budgets.
"""

from __future__ import annotations

import argparse
import gzip
from pathlib import Path


def format_bytes(value: int) -> str:
    units = ("B", "KiB", "MiB", "GiB")
    amount = float(value)
    for unit in units:
        if amount < 1024 or unit == units[-1]:
            return f"{amount:.2f} {unit}" if unit != "B" else f"{int(amount)} B"
        amount /= 1024
    raise AssertionError("unreachable")


def measure(root: Path) -> list[tuple[str, int, int]]:
    rows: list[tuple[str, int, int]] = []
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        data = path.read_bytes()
        rows.append((path.relative_to(root).as_posix(), len(data), len(gzip.compress(data, compresslevel=9, mtime=0))))
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("dist", type=Path, help="Vite output directory")
    parser.add_argument("--top", type=int, default=20, help="number of largest assets to report")
    args = parser.parse_args()

    if not args.dist.is_dir():
        parser.error(f"dist directory does not exist: {args.dist}")

    rows = measure(args.dist)
    total_raw = sum(row[1] for row in rows)
    total_gzip = sum(row[2] for row in rows)
    js = [row for row in rows if row[0].endswith(".js")]
    css = [row for row in rows if row[0].endswith(".css")]

    print("## Web bundle measurement")
    print()
    print("Measurement only — no Memos-specific acceptance threshold is claimed by this report.")
    print()
    print("| Metric | Raw | Deterministic gzip |")
    print("| --- | ---: | ---: |")
    print(f"| All built files ({len(rows)}) | {format_bytes(total_raw)} | {format_bytes(total_gzip)} |")
    print(f"| JavaScript ({len(js)}) | {format_bytes(sum(r[1] for r in js))} | {format_bytes(sum(r[2] for r in js))} |")
    print(f"| CSS ({len(css)}) | {format_bytes(sum(r[1] for r in css))} | {format_bytes(sum(r[2] for r in css))} |")
    print()
    print(f"### Largest {min(args.top, len(rows))} files by raw size")
    print()
    print("| File | Raw | Deterministic gzip |")
    print("| --- | ---: | ---: |")
    for name, raw, gz in sorted(rows, key=lambda row: row[1], reverse=True)[: args.top]:
        print(f"| `{name}` | {format_bytes(raw)} | {format_bytes(gz)} |")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
