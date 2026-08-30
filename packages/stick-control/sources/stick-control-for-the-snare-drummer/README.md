# Stick Control for the Snare Drummer — George Lawrence Stone

Twenty-one photographed pages, transcribed in `packages/stick-control/src/pages/`.

## What is here

Hand-held photographs of the printed pages, `page-<n>.HEIC`, named for the page
number printed on the sheet. **They are committed**, unlike the video clips —
about 36MB — so that a clone can put an exercise beside the page it was read
from without first obtaining the book. They are photographs of a copyrighted
work, kept for personal practice; do not redistribute them.

The book being in print is also why there is no committed evidence file here,
where a video source folder needs `grid.json`: anyone with a copy can
re-photograph page 24 and check the reading themselves.

## Reading a page

The images are HEIC, which most tools will not open. macOS ships `sips`:

```bash
sips -s format png page-14.HEIC --out /tmp/page-14.png
```

They are hand-held landscape, so rotate 90° clockwise. A whole page downscaled
is enough to read structure — how many blocks, where the numbering restarts —
but **not** enough to trust individual letters; crop one column at full
resolution for that.

`../../my.show-source.py` does the crop from an exercise's own reference, which
the app prints under whichever exercise is selected:

```bash
./my.show-source.py 12 right 1        # page 12, right column, line 1
./my.show-source.py 34 left 8 --single
```

Page geometry is not uniform — some pages rule a line across the middle that
takes a slot without holding a staff, page 34 gives its four-bar lines the full
width, and a page with a footnote ends its last staff higher. Those are
recorded in the script's `LINES`, `EXTENT` and `COLUMN_X` tables, read off the
photographs by eye. Detecting them automatically from pixel darkness does not
work: the pages are curved and shadowed, and a page shadow reads darker than
the music.

See [`docs/transcribing-stick-control.md`](../../../../docs/transcribing-stick-control.md)
for how the reading was done and what each kind of mistake costs.
