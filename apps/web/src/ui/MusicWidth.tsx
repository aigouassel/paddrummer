import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * How much horizontal room the music on screen cannot give up.
 *
 * The shell owns the columns but has no idea what is in them, and the page
 * knows what it is drawing but not what else is competing for the width. This
 * carries one number between them, so dragging the panel wider can stop at the
 * point where the stave would start to scroll rather than sailing past it.
 *
 * A context rather than a prop because the two ends are the shell and the
 * page, with the route switch in between — the same reason the engine is one.
 */
const MusicWidthContext = createContext<{
  min: number
  declare: (min: number) => void
}>({ min: 0, declare: () => {} })

export function MusicWidthProvider({ children }: { children: ReactNode }) {
  const [min, setMin] = useState(0)
  const value = useMemo(() => ({ min, declare: setMin }), [min])
  return <MusicWidthContext.Provider value={value}>{children}</MusicWidthContext.Provider>
}

/** What the shell reads when deciding how far a column may be dragged. */
export const useMusicWidth = (): number => useContext(MusicWidthContext).min

/**
 * What a page calls to say how wide its narrowest acceptable engraving is.
 *
 * Reset to zero on the way out, so a page that needs a lot of room does not
 * leave the constraint behind for a page that needs none.
 */
export function useDeclareMusicWidth(min: number): void {
  const { declare } = useContext(MusicWidthContext)
  useEffect(() => {
    declare(min)
    return () => declare(0)
  }, [declare, min])
}
