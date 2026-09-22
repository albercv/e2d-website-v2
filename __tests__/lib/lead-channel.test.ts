/** @jest-environment jsdom */

import { openLeadChannelTab } from "@/lib/leads/lead-channel"

type FakeWindow = { location: { href: string }; close: jest.Mock }

function fakeWindow(): FakeWindow {
  return { location: { href: "" }, close: jest.fn() }
}

describe("openLeadChannelTab", () => {
  afterEach(() => jest.restoreAllMocks())

  it("whatsapp: opens a blank tab synchronously, before any href is known", () => {
    const win = fakeWindow()
    const openSpy = jest.spyOn(window, "open").mockReturnValue(win as unknown as Window)
    openLeadChannelTab("whatsapp")
    expect(openSpy).toHaveBeenCalledWith("", "_blank")
  })

  it("whatsapp: deliver() navigates the pre-opened tab to the given href", () => {
    const win = fakeWindow()
    jest.spyOn(window, "open").mockReturnValue(win as unknown as Window)
    const handle = openLeadChannelTab("whatsapp")
    handle.deliver("https://wa.me/1?text=hola")
    expect(win.location.href).toBe("https://wa.me/1?text=hola")
  })

  it("whatsapp: abort() closes the pre-opened tab", () => {
    const win = fakeWindow()
    jest.spyOn(window, "open").mockReturnValue(win as unknown as Window)
    const handle = openLeadChannelTab("whatsapp")
    handle.abort()
    expect(win.close).toHaveBeenCalledTimes(1)
  })

  it("whatsapp: falls back to navigating the current tab when the popup is blocked", () => {
    jest.spyOn(window, "open").mockReturnValue(null)
    const handle = openLeadChannelTab("whatsapp")
    expect(() => handle.deliver("https://wa.me/1")).not.toThrow()
  })

  it("email: never opens a popup", () => {
    const openSpy = jest.spyOn(window, "open").mockReturnValue(null)
    openLeadChannelTab("email")
    expect(openSpy).not.toHaveBeenCalled()
  })

  it("email: deliver() and abort() never throw", () => {
    const handle = openLeadChannelTab("email")
    expect(() => handle.deliver("mailto:hello@evolve2digital.com")).not.toThrow()
    expect(() => handle.abort()).not.toThrow()
  })
})
