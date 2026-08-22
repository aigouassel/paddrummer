#!/usr/bin/env python3
"""Crop one exercise's staff line out of a photographed book page.

The Stick Control page in the app shows each exercise's provenance as
`page · column · line`. Feed that triple to this script and it writes the
matching strip of the original photograph, so a transcription can be checked
against the page it came from rather than taken on trust.

The app prints it exactly as this script wants it, so a reference can be
copied straight across:

    page-12.HEIC · right column, line 1   ->   ./my.show-source.py 12 right 1
    page-9.HEIC · line 5-6                ->   ./my.show-source.py 9 left 5 --span 2 --single

Personal tooling: it reads `assets/`, which is gitignored because the scans are
a copyrighted book, so it only runs where those files exist.
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

ASSETS = Path(__file__).parent / "assets" / "stick-control-for-the-snare-drummer"

# Fractions of the page that hold the exercises. The photographs are hand-held
# and vary a little, so these are deliberately generous: the point is to land
# the right line on screen, not to crop it to the pixel.
TOP, BOTTOM = 0.045, 0.975
COLUMN_X = {1: [(0.02, 0.99)], 2: [(0.02, 0.545), (0.485, 0.99)]}


def load(page: int):
    try:
        from PIL import Image, ImageOps
    except ImportError:
        sys.exit("Pillow is needed: pip install pillow")

    heic = ASSETS / f"page-{page}.HEIC"
    if not heic.exists():
        sys.exit(f"No scan for page {page} at {heic}")

    # sips ships with macOS and reads HEIC, which Pillow generally will not.
    with tempfile.TemporaryDirectory() as tmp:
        jpg = Path(tmp) / "page.jpg"
        subprocess.run(
            ["sips", "-s", "format", "jpeg", str(heic), "--out", str(jpg)],
            check=True, capture_output=True,
        )
        return ImageOps.exif_transpose(Image.open(jpg)).copy()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("page", type=int, help="printed page number, e.g. 12")
    ap.add_argument("column", choices=["left", "right"], help="which column of exercises")
    ap.add_argument("line", type=int, help="staff line down that column, counting from 1 as the app shows it")
    ap.add_argument("--lines", type=int, default=12, help="staff lines on the page (default 12)")
    ap.add_argument("--span", type=int, default=1, help="staff lines the exercise occupies")
    ap.add_argument("--columns", type=int, default=None, help="columns on the page (default: 2, or 1 if column is 0 and --single)")
    ap.add_argument("--single", action="store_true", help="the page is one full-width column")
    ap.add_argument("--out", default="source-line.jpg")
    args = ap.parse_args()

    columns = args.columns or (1 if args.single else 2)
    column = 0 if args.column == "left" else 1
    if column >= columns:
        sys.exit(f"page has {columns} column(s); asked for the {args.column} one")
    if not 1 <= args.line <= args.lines:
        sys.exit(f"page has {args.lines} lines; asked for line {args.line}")
    line = args.line - 1

    im = load(args.page)
    W, H = im.size

    x0, x1 = COLUMN_X[columns][column]
    band = (BOTTOM - TOP) / args.lines
    # A little bleed above and below so the sticking letters and any label
    # printed under the staff come with it.
    y0 = TOP + band * line - band * 0.25
    y1 = TOP + band * (line + args.span) + band * 0.35

    crop = im.crop((int(x0 * W), int(max(0.0, y0) * H), int(x1 * W), int(min(1.0, y1) * H)))
    scale = min(3.0, 2400 / max(1, crop.width))
    if scale > 1:
        crop = crop.resize((int(crop.width * scale), int(crop.height * scale)))
    crop.save(args.out, quality=94)
    print(f"page {args.page}, {args.column} column, line {args.line} -> {args.out} {crop.size}")


if __name__ == "__main__":
    main()
