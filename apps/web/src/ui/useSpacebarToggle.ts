import { useEffect } from 'react'

/** Elements where a space is a character, not a command. */
const isTextEntry = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLInputElement) {
    // Range and checkbox inputs do not take text, so space is free to use.
    return !['range', 'checkbox', 'radio', 'button'].includes(target.type)
  }
  return false
}

/**
 * Space starts and stops, wherever the focus happens to be.
 *
 * Two native behaviours have to be suppressed for this to work. Space scrolls
 * the page, and space also activates whatever button has focus — which after
 * clicking Play is the Play button itself, so without `preventDefault` the
 * shortcut would toggle twice and appear to do nothing.
 *
 * `event.repeat` is ignored so that holding the key down does not machine-gun
 * the transport.
 */
export function useSpacebarToggle(toggle: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      // `code` rather than `key`: it identifies the physical key regardless of
      // layout, and is unaffected by modifiers.
      if (event.code !== 'Space' || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTextEntry(event.target)) return

      event.preventDefault()
      toggle()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle, enabled])
}
