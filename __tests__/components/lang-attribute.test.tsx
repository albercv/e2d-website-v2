/** @jest-environment jsdom */
import { render } from "@testing-library/react"
import { LangAttribute } from "@/components/layout/lang-attribute"

describe("LangAttribute", () => {
  it("sets document lang to the active locale", () => {
    render(<LangAttribute locale="it" />)
    expect(document.documentElement.lang).toBe("it")
  })

  it("renders nothing", () => {
    const { container } = render(<LangAttribute locale="en" />)
    expect(container.firstChild).toBeNull()
  })
})
