"""Build script — inlines src/ files into a single dashboard.html."""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
TEMPLATE = SRC / "template.html"
OUTPUT = ROOT / "dashboard.html"

INLINE_RE = re.compile(r"/\* BUILD:INLINE (.+?) \*/")


def build():
    if not TEMPLATE.exists():
        print(f"ERROR: template not found at {TEMPLATE}", file=sys.stderr)
        sys.exit(1)

    html = TEMPLATE.read_text(encoding="utf-8")
    inlined = []

    def replace(match):
        rel_path = match.group(1).strip()
        src_file = SRC / rel_path
        if not src_file.exists():
            print(f"ERROR: source file not found: {src_file}", file=sys.stderr)
            sys.exit(1)
        content = src_file.read_text(encoding="utf-8")
        inlined.append(rel_path)
        return content

    result = INLINE_RE.sub(replace, html)

    OUTPUT.write_text(result, encoding="utf-8")

    lines = result.count("\n") + 1
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"Built {OUTPUT.name}")
    print(f"  Inlined: {', '.join(inlined)} ({len(inlined)} files)")
    print(f"  Output:  {lines} lines, {size_kb:.1f} KB")


if __name__ == "__main__":
    build()
