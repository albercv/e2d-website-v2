/** @jest-environment jsdom */

import { track } from "@/lib/analytics/track"

type AnyFn = jest.Mock<void, unknown[]>

function installGtag(): AnyFn {
  const fn = jest.fn()
  ;(window as unknown as { gtag: AnyFn }).gtag = fn
  return fn
}

function installOaiq(): AnyFn {
  const fn = jest.fn()
  ;(window as unknown as { oaiq: AnyFn }).oaiq = fn
  return fn
}

function clearGlobals(): void {
  const w = window as unknown as Record<string, unknown>
  delete w.gtag
  delete w.oaiq
}

describe("track — GA4 fan-out", () => {
  afterEach(clearGlobals)

  it("sends the event to gtag with the given params", () => {
    const gtag = installGtag()
    track("cta_click", { cta_id: "hero_demo" })
    expect(gtag).toHaveBeenCalledWith("event", "cta_click", { cta_id: "hero_demo" })
  })

  it("stays silent when neither gtag nor oaiq exist", () => {
    expect(() => track("cta_click")).not.toThrow()
  })
})

describe("track — OpenAI pixel fan-out", () => {
  afterEach(clearGlobals)

  // OpenAI only accepts its own event catalogue and rejects unknown fields in
  // `data`, so GA params are never forwarded and internal names are mapped.
  it("mirrors generate_lead as the standard lead_created event without GA params", () => {
    installGtag()
    const oaiq = installOaiq()
    track("generate_lead", { form_location: "chat", locale: "es" })
    expect(oaiq).toHaveBeenCalledTimes(1)
    expect(oaiq).toHaveBeenCalledWith("measure", "lead_created", { type: "customer_action" })
  })

  it("forwards an explicit eventId so browser and server events dedupe", () => {
    const oaiq = installOaiq()
    track("generate_lead", { locale: "es" }, { eventId: "lead_abc" })
    expect(oaiq).toHaveBeenCalledWith(
      "measure", "lead_created", { type: "customer_action" }, { event_id: "lead_abc" },
    )
  })

  it("does not leak the eventId into the gtag params", () => {
    const gtag = installGtag()
    installOaiq()
    track("generate_lead", { locale: "es" }, { eventId: "lead_abc" })
    expect(gtag).toHaveBeenCalledWith("event", "generate_lead", { locale: "es" })
  })

  it("mirrors whatsapp_click and email_click as custom events keeping their names", () => {
    const oaiq = installOaiq()
    track("whatsapp_click", { link_location: "chat_panel" })
    track("email_click", { link_location: "contact_modal" })
    expect(oaiq.mock.calls).toEqual([
      ["measure", "custom", { type: "custom" }, { custom_event_name: "whatsapp_click" }],
      ["measure", "custom", { type: "custom" }, { custom_event_name: "email_click" }],
    ])
  })

  it("combines custom_event_name and event_id for custom events", () => {
    const oaiq = installOaiq()
    track("whatsapp_click", {}, { eventId: "wa_1" })
    expect(oaiq.mock.calls[0][3]).toEqual({ custom_event_name: "whatsapp_click", event_id: "wa_1" })
  })

  it("does NOT mirror non-conversion events (cta_click, contact_open, chat_open)", () => {
    const oaiq = installOaiq()
    track("cta_click", { cta_id: "hero_demo" })
    track("contact_open")
    track("chat_open")
    expect(oaiq).not.toHaveBeenCalled()
  })

  it("still sends to gtag when oaiq is absent", () => {
    const gtag = installGtag()
    track("generate_lead", { locale: "es" })
    expect(gtag).toHaveBeenCalledTimes(1)
  })
})
