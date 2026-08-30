#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["librosa", "soundfile", "numpy"]
# ///
"""Read the rhythm of a practice video off its audio.

Transcribing a drum video splits in two: *when* the strokes fall, and *which
hand* played them. This does the first half, which is the half a machine is
better at than an ear.

The naive approach -- detect onsets, read off the gaps -- does not survive
contact with a real recording. Onset strength is a continuum, so the number of
strokes you find is whatever your threshold says it is (on the video this was
written for, 211 onsets at delta=0.10 and 26 at delta=0.50, with no plateau in
between to mark the true count). `--sweep` prints that curve so the absence of
a right answer is visible rather than assumed.

What does work is using the prior that the player is on a click. Then the
question stops being "is there a stroke at this instant?" and becomes "is this
grid slot struck?", which is far better posed: fit one period and phase to the
steadiest passage, then read every slot's onset energy. Slots the player leaves
empty come out at zero, and the map below prints as bars of sixteenths you can
compare against what you hear.

    ./my.video-grid.py sources/<clip>/clip.mp4 --fit 8.3 15.0
    ./my.video-grid.py sources/<clip>/clip.mp4 --fit 8.3 15.0 --shift 2 --json grid.json

Personal tooling, like my.show-source.py: a checking aid, not app code.
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import librosa

# 2.9 ms of resolution at 44.1 kHz. Consecutive 16ths at 150 bpm are 100 ms
# apart, so the risk this buys us against is merging a flam, not missing a note.
HOP = 128


def audio_of(path: Path) -> Path:
    """Video in, mono wav out. Audio files pass straight through."""
    if path.suffix.lower() in {".wav", ".m4a", ".mp3", ".flac", ".aac", ".ogg"}:
        return path
    out = Path(tempfile.mkdtemp()) / "audio.wav"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(path),
         "-ac", "1", "-ar", "44100", str(out)],
        check=True,
    )
    return out


def detect(env, sr, delta, wait=6):
    frames = librosa.onset.onset_detect(
        onset_envelope=env, sr=sr, hop_length=HOP, backtrack=False,
        pre_max=8, post_max=8, pre_avg=40, post_avg=40, delta=delta, wait=wait,
    )
    return librosa.frames_to_time(frames, sr=sr, hop_length=HOP)


def fit_grid(onsets, lo, hi, unit_lo, unit_hi):
    """Least-squares period and phase over the steadiest passage.

    Every onset is assigned to its nearest multiple of a candidate period; the
    period whose assignment leaves the smallest residual wins. A high residual
    is worth reading as a warning rather than a result -- it usually means the
    window straddles a passage that is not on the grid at all, such as a roll.
    """
    seg = onsets[(onsets >= lo) & (onsets <= hi)]
    if len(seg) < 8:
        sys.exit(f"only {len(seg)} onsets in {lo}-{hi}s; widen --fit")
    best = None
    for period in np.arange(unit_lo, unit_hi, 0.00002):
        k = np.round((seg - seg[0]) / period)
        phase = float(np.mean(seg - k * period))
        rms = float(np.sqrt(((seg - (k * period + phase)) ** 2).mean()))
        if best is None or rms < best[0]:
            best = (rms, float(period), phase)
    return best, len(seg)


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("media", type=Path, help="video or audio file")
    ap.add_argument("--fit", nargs=2, type=float, metavar=("FROM", "TO"),
                    default=[0.0, 1e9],
                    help="seconds of the steadiest passage to fit the grid to")
    ap.add_argument("--unit", nargs=2, type=float, metavar=("LO", "HI"),
                    default=[0.095, 0.1055],
                    help="range to search for the grid unit, in seconds (default: a 16th near 150bpm)")
    ap.add_argument("--delta", type=float, default=0.25, help="onset threshold")
    ap.add_argument("--shift", type=int, default=0,
                    help="slots to rotate the map by, to put the pulse on beat 1")
    ap.add_argument("--per-bar", type=int, default=16, help="grid slots in a bar")
    ap.add_argument("--sweep", action="store_true",
                    help="print onset count against threshold, and stop")
    ap.add_argument("--json", type=Path, help="also write the slot table here")
    args = ap.parse_args()

    y, sr = librosa.load(str(audio_of(args.media)), sr=44100, mono=True)
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=HOP, aggregate=np.median)
    t_env = librosa.frames_to_time(np.arange(len(env)), sr=sr, hop_length=HOP)
    print(f"{len(y)/sr:.2f}s of audio", file=sys.stderr)

    if args.sweep:
        print("\n threshold  onsets   (a real note count sits on a plateau)")
        for d in (0.10, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50):
            print(f"   {d:5.2f}    {len(detect(env, sr, d)):5d}")
        return

    onsets = detect(env, sr, args.delta)
    (rms, period, phase), used = fit_grid(
        onsets, args.fit[0], args.fit[1], args.unit[0], args.unit[1])
    beat = period * 4
    print(f"grid unit {period*1000:.2f} ms -> beat {beat*1000:.1f} ms = {60/beat:.2f} bpm",
          file=sys.stderr)
    print(f"fit rms {rms*1000:.1f} ms over {used} onsets"
          f"{'   <-- high; is the window on the grid?' if rms > 0.02 else ''}",
          file=sys.stderr)

    slots = []
    n = int(np.floor(-phase / period))
    while n * period + phase <= len(y) / sr:
        t = n * period + phase
        if t >= 0:
            w = (t_env >= t - period * 0.45) & (t_env <= t + period * 0.45)
            slots.append({"n": n, "t": round(t, 4),
                          "peak": round(float(env[w].max()) if w.any() else 0.0, 3)})
        n += 1

    by_n = {s["n"]: s for s in slots}
    ns = sorted(by_n)
    head = " ".join("1e+a2e+a3e+a4e+a"[i] for i in range(args.per_bar))
    print(f"\n  bar   time   | {head}")
    bar = 0
    start = ns[0] - ((ns[0] - args.shift) % args.per_bar)
    for base in range(start, ns[-1] + 1, args.per_bar):
        if base not in by_n:
            continue
        row = "".join(
            (lambda p: "." if p < 0.8 else "o" if p < 2.0 else "O" if p < 4.0 else "#")
            (by_n[base + i]["peak"]) if base + i in by_n else " "
            for i in range(args.per_bar))
        if not row.strip(". "):
            continue
        bar += 1
        print(f"  {bar:3d} {by_n[base]['t']:7.3f}  | " + " ".join(row))
    print("\n  . silent   o soft   O medium   # loud", file=sys.stderr)

    if args.json:
        args.json.write_text(json.dumps(
            {"unit": period, "phase": phase, "bpm": 60 / beat, "fit_rms": rms,
             "shift": args.shift, "per_bar": args.per_bar, "slots": slots}, indent=1))
        print(f"wrote {args.json}", file=sys.stderr)


if __name__ == "__main__":
    main()
