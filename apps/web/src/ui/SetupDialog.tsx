import { useEffect, useRef } from 'react'
import { InputPanel } from './InputPanel'
import { useEngineSettings } from './useEngineSettings'

/**
 * Setup, out of the way until asked for.
 *
 * A native `<dialog>` rather than a hand-rolled overlay: `showModal()` brings
 * focus trapping, Escape to close and a backdrop with it, none of which is
 * worth reimplementing badly.
 *
 * It has to survive the task it starts, which rules out a popover that
 * dismisses on an outside click — calibration asks you to tap along to eight
 * clicks and counts them as you go, so the dialog must stay open and keep
 * showing the count. For the same reason closing is refused mid-calibration:
 * a run abandoned halfway leaves a measurement nobody asked for.
 */
export function SetupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const settings = useEngineSettings()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Escape and the backdrop close the dialog without going through React, so
  // the parent has to hear about it or its state drifts out of step.
  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const cancel = (event: Event) => {
      if (settings.calibrating) event.preventDefault()
    }
    dialog.addEventListener('cancel', cancel)
    dialog.addEventListener('close', onClose)
    return () => {
      dialog.removeEventListener('cancel', cancel)
      dialog.removeEventListener('close', onClose)
    }
  }, [onClose, settings.calibrating])

  return (
    <dialog ref={ref} className="setup-dialog">
      <div className="setup-head">
        <h2>Setup</h2>
        <button
          type="button"
          className="ghost"
          onClick={onClose}
          disabled={settings.calibrating}
          title={settings.calibrating ? 'Finish calibrating first' : undefined}
        >
          Done
        </button>
      </div>

      <InputPanel
        input={settings.input}
        micStatus={settings.micStatus}
        micError={settings.micError}
        sensitivity={settings.sensitivity}
        getMeter={settings.getMeter}
        onUseKeyboard={settings.useKeyboard}
        onUseMicrophone={settings.useMicrophone}
        onSensitivity={settings.setSensitivity}
        metronome={settings.metronome}
        onMetronome={settings.setMetronome}
        calibrating={settings.calibrating}
        calibrationTaps={settings.calibrationTaps}
        onCalibrate={settings.calibrate}
        latencyMs={settings.latencyMs}
        onClearLatency={settings.clearLatency}
      />
    </dialog>
  )
}
