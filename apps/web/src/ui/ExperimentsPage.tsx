import { useMemo, useRef, useState } from "react";
import {
  GROOVE_SECTIONS,
  PAD_GROOVE,
  playedTimes,
  type PadGroove,
} from "@paddrummer/videos";
import { barBeats, meterText } from "@paddrummer/core/phrase";
import { toNumber } from "@paddrummer/core/fraction";
import { usePractice } from "./usePractice";
import { useSpacebarToggle } from "./useSpacebarToggle";
import { useElementWidth } from "./useElementWidth";
import { Score, MIN_SCORE_WIDTH } from "./Score";
import { minimumScoreWidth } from "@paddrummer/notation";
import { useDeclareMusicWidth } from "./MusicWidth";
import { TempoControl } from "./TempoControl";
import { ClipPanel } from "./ClipPanel";
import { ScorePanel } from "./ScorePanel";

/**
 * Work in progress: material the app is still figuring out how to read.
 *
 * The other two pages are settled references — the forty, and a printed book —
 * and this is where everything else goes. Video transcriptions are the first
 * kind to land here and are not meant to be the only one, so the left column
 * is a list of groups from the start rather than a list of clips.
 */
type ExperimentGroup = {
  id: string;
  label: string;
  pieces: readonly PadGroove[];
};

const GROUPS: readonly ExperimentGroup[] = [
  { id: "video", label: "Transcribed from video", pieces: [PAD_GROOVE] },
];

/**
 * The host a link points at, shown on the link itself.
 *
 * An external link should say where it goes before you click it, and this page
 * is otherwise scrupulous about naming its sources. Guarded because a bad URL
 * in the data should cost a vague label, not the page.
 */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the source";
  }
}

const BY_ID = new Map(
  GROUPS.flatMap((group) => group.pieces.map((piece) => [piece.id, piece])),
);

export function ExperimentsPage() {
  const [id, setId] = useState(PAD_GROOVE.id);
  const piece = BY_ID.get(id)!;

  // What the chart cannot be squeezed below, so the shell can stop the panel
  // being dragged over it.
  useDeclareMusicWidth(
    useMemo(() => minimumScoreWidth(piece.phrase), [piece.phrase]),
  );

  const columnRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(columnRef, MIN_SCORE_WIDTH);

  const {
    isPlaying,
    bpm,
    mode,
    input,
    activeStroke,
    report,
    toggle,
    setTempo,
    defaultBpm,
    resetTempo,
  } = usePractice(piece.phrase, piece.bpm);

  const calibrating = mode === "calibrating";
  useSpacebarToggle(toggle, !calibrating);

  return (
    <>
      <aside className="col col-left">
        <div className="panel-stack">
          <p className="eyebrow">Experiments</p>
          <p className="note">
            Transcriptions still being worked out, and the reading that produced
            them. Each one says how much of it was actually seen and how much is
            convention, because on a recording those are not the same thing.
          </p>

          {GROUPS.map((group) => (
            <section key={group.id} className="catalogue-group">
              <p className="eyebrow">{group.label}</p>
              <ul className="catalogue">
                {group.pieces.map((item) => (
                  <li
                    key={item.id}
                    className={item.id === id ? "is-selected" : ""}
                  >
                    <button type="button" onClick={() => setId(item.id)}>
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>

      {/* The chart needs the whole column and runs past the fold, so the
          transport pins to the foot the way the book pages do. */}
      <main className="col col-center col-sheet">
        <div className="worksheet" ref={columnRef}>
          <header className="sheet-header">
            <p className="eyebrow">
              {piece.at.author} · {meterText(piece.phrase.meter!)} at{" "}
              {piece.bpm} bpm
            </p>
            <h2>{piece.name}</h2>
            <p className="note">{piece.note}</p>
            {/* Offered rather than embedded: the clip is someone else's, it
                lives on their site, and watching it is a detour from the page
                rather than part of it. New tab, so the chart you were reading
                is still here when you come back. */}
            {piece.at.url ? (
              <p className="note">
                <a
                  className="source-link"
                  href={piece.at.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={piece.at.url}
                >
                  Watch it on {hostOf(piece.at.url)} ↗
                </a>
              </p>
            ) : null}
          </header>

          <Score
            phrase={piece.phrase}
            activeIndex={isPlaying ? activeStroke : -1}
            width={width}
          />

          {/* What each section is, under the chart rather than beside its bars:
              the marks on the stave name the sections, and this says what was
              seen and what was inferred for each. */}
          <ol className="sheet section-notes">
            {GROOVE_SECTIONS.map((section) => (
              <li key={section.id}>
                <p className="eyebrow">
                  {section.label} · bars {section.bars[0]}–{section.bars[1]} ·{" "}
                  {playedTimes(section)}× ·{" "}
                  {section.reading === "frames"
                    ? "read off the frames"
                    : "rhythm read, sticking conventional"}
                </p>
                <p className="note">{section.note}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="sheet-transport">
          <button
            type="button"
            className="play"
            onClick={toggle}
            disabled={calibrating}
          >
            {isPlaying ? "Stop" : "Play"}
          </button>
          <TempoControl
            bpm={bpm}
            defaultBpm={defaultBpm}
            onTempo={setTempo}
            onReset={resetTempo}
          />
          <p className="step-caption">
            <strong>
              {toNumber(piece.phrase.beats) /
                toNumber(barBeats(piece.phrase.meter!))}
            </strong>{" "}
            bars · {GROOVE_SECTIONS.length} sections
          </p>
          <p className="shortcut-hint">
            <kbd>Space</kbd> to start and stop
          </p>
        </div>
      </main>

      <aside className="col col-right">
        <div className="panel-stack">
          {/* The clip first: it is what you came to compare the chart against,
              and it is the thing you are done with once you start playing. */}
          <ClipPanel
            file={piece.at.file}
            title={piece.at.title}
            from={piece.at.from}
            isPlaying={isPlaying}
          />

          <section className="panel-stack">
            <p className="eyebrow">Your timing</p>
            {input === "microphone" ? (
              <p className="hint">
                A microphone hears one drum, so on a two-line piece it cannot
                tell which hand struck. Timing is still scored; switch to the
                keyboard to have the hands checked.
              </p>
            ) : null}
            <ScorePanel report={report} showSticking={input === "keyboard"} />
          </section>
        </div>
      </aside>
    </>
  );
}
