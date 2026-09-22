"use client"

import { useEffect, useRef } from "react"

export const FIRST_GESTURE_EVENTS = ["pointermove", "pointerdown", "touchstart", "wheel", "keydown"] as const

// Calls `onGesture` on the visitor's first gesture anywhere on the page.
// The callback returns true when it consumed the gesture (listeners are
// removed) or false to keep waiting, e.g. because the hero is scrolled out
// of view. Gestures made before hydration are lost by design: the next one
// fires, and bots/Lighthouse never gesture at all.
export function useFirstGesture(onGesture: () => boolean, enabled: boolean): void {
  const onGestureRef = useRef(onGesture)
  onGestureRef.current = onGesture

  useEffect(() => {
    if (!enabled) return

    function handle(): void {
      if (onGestureRef.current()) remove()
    }
    function remove(): void {
      for (const type of FIRST_GESTURE_EVENTS) window.removeEventListener(type, handle)
    }
    for (const type of FIRST_GESTURE_EVENTS) window.addEventListener(type, handle, { passive: true })
    return remove
  }, [enabled])
}
