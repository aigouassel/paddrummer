import { useEffect, useRef, useState } from 'react'

/**
 * The clip a transcription was read from, beside the notation that claims to
 * describe it.
 *
 * Beside, not over: the whole worth of showing it here is watching his hands
 * and reading the bar at the same time, which a modal would take away.
 *
 * Collapsed until asked for. A vertical Short is about twice as tall as it is
 * wide, so left open it would push the timing read-out out of the column for
 * the sake of something you look at once.
 */

/**
 * The clips, resolved at build time.
 *
 * `VideoRef.file` is data — a string naming a file under
 * `packages/videos/sources/` — and data cannot be turned into a bundled asset
 * URL by a plain import. `import.meta.glob` maps every clip's path to the URL
 * it will be served at, so a lookup by suffix bridges the two.
 *
 * Only committed clips resolve, and that is the honest behaviour: a source
 * folder whose video was never fetched shows no player rather than a broken
 * one.
 *
 * One level deep on purpose. A `**` here also swept up `slow/quarter-speed.mp4`,
 * and because the glob is eager every match becomes a bundled asset — 16.7MB
 * of a file this panel never plays, since slow motion comes from
 * `playbackRate` instead.
 */
const CLIPS = import.meta.glob('../../../../packages/videos/sources/*/*.mp4', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

function clipUrl(file: string): string | undefined {
  const match = Object.keys(CLIPS).find((path) => path.endsWith(`/sources/${file}`))
  return match ? CLIPS[match] : undefined
}

/**
 * Slow motion comes from the player, not from a second file.
 *
 * A quarter-speed re-encode exists beside the clip, but `playbackRate` gets
 * the same result from the video already loaded — no second download, and no
 * risk of the two drifting apart. Browsers preserve pitch by default, so the
 * click still sounds like a stick rather than a drone.
 */
const SPEEDS = [1, 0.5, 0.25] as const

export function ClipPanel({
  file,
  title,
  from,
  isPlaying,
}: {
  file: string
  title: string
  /** Seconds into the clip where the transcribed passage starts. */
  from: number
  /** Whether the app's own transport is running. */
  isPlaying: boolean
}) {
  const [open, setOpen] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const videoRef = useRef<HTMLVideoElement>(null)
  const url = clipUrl(file)

  // Two things making sound at once is two things you cannot hear. The
  // transport wins, because you pressed Play on it more recently than you
  // pressed play on the clip.
  useEffect(() => {
    if (isPlaying) videoRef.current?.pause()
  }, [isPlaying])

  useEffect(() => {
    const video = videoRef.current
    if (video) video.playbackRate = speed
  }, [speed, open])

  if (!url) return null

  if (!open) {
    return (
      <section className="panel-stack">
        <p className="eyebrow">The clip</p>
        <button type="button" className="ghost wide" onClick={() => setOpen(true)}>
          Watch it here
        </button>
      </section>
    )
  }

  return (
    <section className="panel-stack clip">
      <div className="clip-head">
        <p className="eyebrow">The clip</p>
        <button type="button" className="clip-close" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>

      <video
        ref={videoRef}
        className="clip-video"
        src={url}
        title={title}
        controls
        preload="metadata"
        // Opens where the transcription starts rather than on the talking head
        // before it, so the first thing you see is the first bar written down.
        onLoadedMetadata={(event) => {
          event.currentTarget.currentTime = from
          event.currentTarget.playbackRate = speed
        }}
      />

      <div className="segmented clip-speed" role="group" aria-label="Playback speed">
        {SPEEDS.map((option) => (
          <button
            key={option}
            type="button"
            className={option === speed ? 'is-selected' : ''}
            onClick={() => setSpeed(option)}
          >
            {option}×
          </button>
        ))}
      </div>

      <p className="note">
        At {SPEEDS[2]}× the strokes separate. At full speed a sixteenth is three frames, which
        is why most of the sticking below is marked as convention rather than as read.
      </p>
    </section>
  )
}
