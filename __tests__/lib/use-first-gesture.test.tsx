/** @jest-environment jsdom */
import { renderHook } from "@testing-library/react"
import { FIRST_GESTURE_EVENTS, useFirstGesture } from "@/lib/perf/use-first-gesture"

function fire(type: string): void {
  window.dispatchEvent(new Event(type))
}

describe("useFirstGesture", () => {
  it("covers pointer, touch, wheel and keyboard gestures", () => {
    expect(FIRST_GESTURE_EVENTS).toEqual(["pointermove", "pointerdown", "touchstart", "wheel", "keydown"])
    for (const type of FIRST_GESTURE_EVENTS) {
      const onGesture = jest.fn(() => true)
      const { unmount } = renderHook(() => useFirstGesture(onGesture, true))
      fire(type)
      expect(onGesture).toHaveBeenCalledTimes(1)
      unmount()
    }
  })

  it("stops listening once the callback consumes a gesture", () => {
    const onGesture = jest.fn(() => true)
    renderHook(() => useFirstGesture(onGesture, true))
    fire("pointermove")
    fire("keydown")
    expect(onGesture).toHaveBeenCalledTimes(1)
  })

  it("keeps listening while the callback declines the gesture", () => {
    const onGesture = jest.fn<boolean, []>().mockReturnValueOnce(false).mockReturnValueOnce(true)
    renderHook(() => useFirstGesture(onGesture, true))
    fire("wheel")
    fire("wheel")
    fire("wheel")
    expect(onGesture).toHaveBeenCalledTimes(2)
  })

  it("does nothing while disabled", () => {
    const onGesture = jest.fn(() => true)
    renderHook(() => useFirstGesture(onGesture, false))
    fire("pointerdown")
    expect(onGesture).not.toHaveBeenCalled()
  })

  it("removes its listeners on unmount", () => {
    const onGesture = jest.fn(() => true)
    const { unmount } = renderHook(() => useFirstGesture(onGesture, true))
    unmount()
    fire("touchstart")
    expect(onGesture).not.toHaveBeenCalled()
  })
})
