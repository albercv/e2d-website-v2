// Popup-blocker-safe opening of the visitor's chosen follow-up channel.
// Browsers only allow window.open() synchronously inside a click handler —
// by the time the lead POST resolves, an async window.open() would be
// treated as a popup and blocked. So the WhatsApp tab is opened blank up
// front (in the click handler) and only gets its destination once the lead
// is confirmed; email has no such restriction and just navigates in place.

export type LeadChannel = "whatsapp" | "email"

export interface LeadChannelHandle {
  // Sends the visitor to `href` once the lead POST has succeeded.
  deliver: (href: string) => void
  // Cleans up the pre-opened tab if the POST failed.
  abort: () => void
}

// Used both for email (no popup step at all) and as the fallback when
// window.open() returns null (popup blocked): navigate the current tab.
function currentTabHandle(): LeadChannelHandle {
  return {
    deliver: (href) => { window.location.href = href },
    abort: () => undefined,
  }
}

function whatsappTabHandle(): LeadChannelHandle {
  const win = window.open("", "_blank")
  if (!win) return currentTabHandle()
  return {
    deliver: (href) => { win.location.href = href },
    abort: () => win.close(),
  }
}

export function openLeadChannelTab(channel: LeadChannel): LeadChannelHandle {
  return channel === "whatsapp" ? whatsappTabHandle() : currentTabHandle()
}
