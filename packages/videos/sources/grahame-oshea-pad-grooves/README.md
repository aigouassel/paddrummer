# How to play drum grooves on a practice pad — Grahame O'Shea

<https://youtube.com/shorts/d_sp7QIH3Oo> · 720×1280, 30 fps, 34.7s

Transcribed in `packages/videos/src/grahame-oshea-pad-grooves/` — one folder per clip
there too, mirroring this one.

## What is here, and what is not

The clip itself is **not committed** — unlike the photographed book pages,
which are. It is someone else's video, kept for personal practice, and larger
and more regenerable than a set of stills. Neither are the things derived from
it — the frame cache, the slowed-down audio, the yt-dlp
metadata. All of it is regenerable:

```bash
yt-dlp -o 'd_sp7QIH3Oo.%(ext)s' --write-info-json https://youtube.com/shorts/d_sp7QIH3Oo
../../my.video-frames.py d_sp7QIH3Oo.mp4 --crop 0,384,720,1088 --extract
```

`grid.json` **is** committed, and is the point of this folder. It holds the
fitted grid — unit, phase, bpm — and the onset peak at every sixteenth-note
slot across the whole clip. That is the evidence the transcription was read
off, so the claims in the transcription stay checkable by someone holding only
this repository: no video, no librosa, no ear. It is the video equivalent of
the `SourceRef` every Stick Control exercise carries.

Regenerate it, and the map that goes with it, by fitting the grid to the
steadiest passage:

```bash
../../my.video-grid.py d_sp7QIH3Oo.mp4 --fit 8.3 22.0 --shift 14 --json grid.json
```

The fit window matters and is not a detail: 8.3–15.0s gives 149.28 bpm and
misaligns the opening, 8.3–22.0s gives 150.12 bpm and aligns everything. The
`--shift 14` puts the map's beat 1 on the groove downbeat at 1.863s.

## What the map shows

Bars 2–5 the quarter-note groove, 6–9 filled with eighths, 10–15 with
sixteenths, 16–17 the triple stroke roll, 18–21 the sixteenths again with the
hands switched. The silent slot after the beat-3 backbeat, holding across all
six bars of the sixteenths section, is the figure — not a missed stroke.

See [`docs/transcribing-video.md`](../../../../docs/transcribing-video.md) for
how the reading was done and what could not be read.
