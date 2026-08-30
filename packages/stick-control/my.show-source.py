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
    page-34.HEIC · full width, line 8     ->   ./my.show-source.py 34 left 8 --single

Personal tooling: it reads the photographed pages under `sources/`, which are
committed alongside the transcription so any exercise can be checked against
its page from a clone alone.
"""
import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

ASSETS = Path(__file__).parent / "sources" / "stick-control-for-the-snare-drummer"

# Line slots down a column, where a page does not have the usual twelve. A rule
# ruled across the page takes a slot of its own even though no staff sits on
# it, and counting it is what puts a crop of anything below the rule on the
# right line: pages 16, 24, 25, 26 and 34 come to thirteen that way, and 42,
# which is ruled twice, to fourteen.
LINES = {16: 13, 24: 13, 25: 13, 26: 13, 34: 13, 42: 14}

# Fractions of the page that hold the exercises. The photographs are hand-held
# and vary a little, so these are deliberately generous: the point is to land
# the right line on screen, not to crop it to the pixel.
TOP, BOTTOM = 0.045, 0.975

# Pages that print something under their last staff — a footnote, a legend, an
# instruction — leave less of the sheet to the exercises, and the even division
# above would then place the bottom lines below where they are. These were read
# off the photographs: the fraction of the page the last staff sits at, turned
# into the bottom of the band. Only the pages that need one are listed.
EXTENT = {16: 0.853, 24: 0.881, 25: 0.870, 26: 0.867, 34: 0.888, 42: 0.932}
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
    ap.add_argument("--lines", type=int, default=None,
                    help="line slots down the page (default: what the page has, usually 12)")
    ap.add_argument("--span", type=int, default=1, help="staff lines the exercise occupies")
    ap.add_argument("--columns", type=int, default=None, help="columns on the page (default: 2, or 1 if column is 0 and --single)")
    ap.add_argument("--single", action="store_true", help="the page is one full-width column")
    ap.add_argument("--out", default="source-line.jpg")
    args = ap.parse_args()

    lines = args.lines or LINES.get(args.page, 12)
    columns = args.columns or (1 if args.single else 2)
    column = 0 if args.column == "left" else 1
    if column >= columns:
        sys.exit(f"page has {columns} column(s); asked for the {args.column} one")
    if not 1 <= args.line <= lines:
        sys.exit(f"page has {lines} line slots; asked for line {args.line}")
    line = args.line - 1

    im = load(args.page)
    W, H = im.size

    x0, x1 = COLUMN_X[columns][column]
    bottom = EXTENT.get(args.page, BOTTOM)
    band = (bottom - TOP) / lines
    # Bleed above and below, for two reasons. The sticking letters and any
    # label sit under the staff rather than on it, and a page with a rule
    # across it does not space its lines evenly enough for an even division to
    # land on the middle of one — half a line out is normal there. Half a line
    # of bleed each way absorbs that, at the cost of showing the neighbours.
    y0 = TOP + band * line - band * 0.45
    y1 = TOP + band * (line + args.span) + band * 0.55

    crop = im.crop((int(x0 * W), int(max(0.0, y0) * H), int(x1 * W), int(min(1.0, y1) * H)))
    scale = min(3.0, 2400 / max(1, crop.width))
    if scale > 1:
        crop = crop.resize((int(crop.width * scale), int(crop.height * scale)))
    crop.save(args.out, quality=94)
    print(f"page {args.page}, {args.column} column, line {args.line} -> {args.out} {crop.size}")


if __name__ == "__main__":
    main()
