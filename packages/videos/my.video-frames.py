#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Put chosen video frames on screen as one labelled contact sheet.

The other half of transcribing a drum video: which hand played the stroke.
Nothing automatic managed it on the video this was written for -- pad occlusion
is blind to strikes on the far rim and counts a resting stick as a stroke,
timbre clustering overlaps too much to label a single note, and skin-colour
hand tracking pins itself to a beige wall. What works is looking, with the
audio grid deciding *where* to look.

So the loop is: `my.video-grid.py` says a stroke falls at 6.259s, and this
crops the frames either side of it, labels each with its number and time, and
tiles them. Every frame carries its own timestamp, so a reading can always be
traced back to the frame it came from -- the same reason the Stick Control
exercises carry a page and a staff line.

    ./my.video-frames.py sources/<clip>/clip.mp4 --extract
    ./my.video-frames.py sources/<clip>/clip.mp4 --frames 114-118,150-154 --out bar3.jpg
    ./my.video-frames.py sources/<clip>/clip.mp4 --at 3.861 4.261 4.661 5.060 --window 2

Frames are cached on first use because seeking per frame is both slow and
imprecise: `-ss` lands on the wrong side of a keyframe often enough to matter
when three frames make a sixteenth note. Extract once, index by number, and the
mapping from time to frame stays exact.

Do not interpolate to slow a clip down. Repeating frames is safe; inventing
them (`minterpolate`, or any AI in-betweener) fabricates the very evidence you
are trying to read -- a stick can appear to touch the pad in a frame that never
existed.

Personal tooling, like my.show-source.py: a checking aid, not app code.
"""
import argparse
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def cache_dir(video: Path) -> Path:
    return video.parent / f".frames-{video.stem}"


def extract(video: Path, crop: str | None) -> Path:
    out = cache_dir(video)
    out.mkdir(exist_ok=True)
    if any(out.glob("f*.jpg")):
        return out
    vf = []
    if crop:
        x0, y0, x1, y1 = (int(v) for v in crop.split(","))
        vf.append(f"crop={x1-x0}:{y1-y0}:{x0}:{y0}")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(video)]
    if vf:
        cmd += ["-vf", ",".join(vf)]
    cmd += ["-q:v", "3", "-start_number", "0", str(out / "f%05d.jpg")]
    subprocess.run(cmd, check=True)
    print(f"cached {len(list(out.glob('f*.jpg')))} frames in {out}", file=sys.stderr)
    return out


def fps_of(video: Path) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", str(video)],
        check=True, capture_output=True, text=True).stdout.strip()
    num, den = (float(v) for v in r.split("/"))
    return num / den


def parse_frames(spec: str) -> list[int]:
    out: list[int] = []
    for part in spec.split(","):
        if "-" in part.strip("-"):
            a, b = part.split("-")
            out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video", type=Path)
    ap.add_argument("--extract", action="store_true", help="build the frame cache and stop")
    ap.add_argument("--crop", help="x0,y0,x1,y1 kept from every frame when caching")
    ap.add_argument("--frames", help="frame numbers: 114-118,150,152")
    ap.add_argument("--at", nargs="+", type=float, help="times in seconds")
    ap.add_argument("--window", type=int, default=1,
                    help="frames either side of each --at time (default 1)")
    ap.add_argument("--box", help="x0,y0,x1,y1 crop of the cached frame to show")
    ap.add_argument("--cols", type=int, default=5)
    ap.add_argument("--scale", type=float, default=0.6)
    ap.add_argument("--out", type=Path, default=Path("frames.jpg"))
    args = ap.parse_args()

    cache = extract(args.video, args.crop)
    if args.extract:
        return

    fps = fps_of(args.video)
    if args.frames:
        wanted = parse_frames(args.frames)
    elif args.at:
        wanted = sorted({int(round(t * fps)) + d
                         for t in args.at
                         for d in range(-args.window, args.window + 1)})
    else:
        sys.exit("give --frames or --at")

    box = tuple(int(v) for v in args.box.split(",")) if args.box else None
    font = ImageFont.truetype(FONT, 22)
    cells = []
    for n in wanted:
        f = cache / f"f{n:05d}.jpg"
        if not f.exists():
            print(f"no frame {n}", file=sys.stderr)
            continue
        im = Image.open(f)
        if box:
            im = im.crop(box)
        im = im.resize((int(im.width * args.scale), int(im.height * args.scale)))
        d = ImageDraw.Draw(im)
        label = f"{n}  {n/fps:.3f}s"
        d.rectangle([0, 0, 10 + len(label) * 12, 28], fill=(0, 0, 0))
        d.text((5, 2), label, fill=(255, 255, 0), font=font)
        cells.append(im)
    if not cells:
        sys.exit("nothing to show")

    w, h = cells[0].size
    rows = (len(cells) + args.cols - 1) // args.cols
    sheet = Image.new("RGB", (args.cols * (w + 3), rows * (h + 3)), (255, 255, 255))
    for i, c in enumerate(cells):
        sheet.paste(c, ((i % args.cols) * (w + 3), (i // args.cols) * (h + 3)))
    sheet.save(args.out, quality=92)
    print(f"{args.out}  {sheet.size}  {len(cells)} frames at {fps:g} fps")


if __name__ == "__main__":
    main()
