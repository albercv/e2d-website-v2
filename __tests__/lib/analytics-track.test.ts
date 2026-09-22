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

  // Every contact conversion sends two OpenAI events: the standard
  // appointment_scheduled (campaign goal) and a named custom event carrying
  // the channel, because standard events reject any extra data field.
  it("mirrors generate_lead as appointment_scheduled + custom lead_form", () => {
    installGtag()
    const oaiq = installOaiq()
    track("generate_lead", { form_location: "chat", locale: "es" })
    expect(oaiq.mock.calls).toEqual([
      ["measure", "appointment_scheduled", { type: "customer_action" }],
      ["measure", "custom", { type: "custom" }, { custom_event_name: "lead_form" }],
    ])
  })

  it("mirrors whatsapp_click and email_click with their channel as custom name", () => {
    const oaiq = installOaiq()
    track("whatsapp_click", { link_location: "chat_panel" })
    track("email_click", { link_location: "contact_modal" })
    expect(oaiq.mock.calls).toEqual([
      ["measure", "appointment_scheduled", { type: "customer_action" }],
      ["measure", "custom", { type: "custom" }, { custom_event_name: "whatsapp_click" }],
      ["measure", "appointment_scheduled", { type: "customer_action" }],
      ["measure", "custom", { type: "custom" }, { custom_event_name: "email_click" }],
    ])
  })

  it("derives distinct event ids for both events from an explicit eventId", () => {
    const oaiq = installOaiq()
    track("generate_lead", { locale: "es" }, { eventId: "lead_abc" })
    expect(oaiq.mock.calls).toEqual([
      ["measure", "appointment_scheduled", { type: "customer_action" }, { event_id: "lead_abc" }],
      ["measure", "custom", { type: "custom" }, { custom_event_name: "lead_form", event_id: "lead_abc_lead_form" }],
    ])
  })

  it("does not leak the eventId into the gtag params", () => {
    const gtag = installGtag()
    installOaiq()
    track("generate_lead", { locale: "es" }, { eventId: "lead_abc" })
    expect(gtag).toHaveBeenCalledWith("event", "generate_lead", { locale: "es" })
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
