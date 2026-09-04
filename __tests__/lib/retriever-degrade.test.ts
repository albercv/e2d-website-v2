/**
 * @jest-environment node
 */

const embedQueryMock = jest.fn()
const executeMock = jest.fn()

jest.mock("@/lib/rag/embeddings", () => ({ embedQuery: (...a: unknown[]) => embedQueryMock(...a) }))
jest.mock("@/lib/db/client", () => ({ db: { execute: (...a: unknown[]) => executeMock(...a) } }))

import { retrieveContext } from "@/lib/chat/retriever"

describe("retrieveContext degrades instead of failing the chat", () => {
  const savedKey = process.env.OPENAI_API_KEY
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "k"
    embedQueryMock.mockReset()
    executeMock.mockReset()
    jest.spyOn(console, "error").mockImplementation(() => undefined)
  })
  afterEach(() => {
    if (savedKey === undefined) delete process.env.OPENAI_API_KEY
    else process.env.OPENAI_API_KEY = savedKey
    jest.restoreAllMocks()
  })

  it("returns no context when the embeddings provider rejects (401/429/timeout)", async () => {
    embedQueryMock.mockRejectedValue(new Error("OpenAI embeddings failed: 429 Too Many Requests"))
    await expect(retrieveContext("hola", "es")).resolves.toEqual([])
    expect(executeMock).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[retriever]"),
      expect.stringContaining("429"),
    )
  })

  it("returns no context when the vector query fails", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2])
    executeMock.mockRejectedValue(new Error("connection refused"))
    await expect(retrieveContext("hola", "es")).resolves.toEqual([])
  })

  it("still propagates a client abort so the route can stop early", async () => {
    const controller = new AbortController()
    embedQueryMock.mockImplementation(async () => {
      controller.abort()
      throw new DOMException("aborted", "AbortError")
    })
    await expect(retrieveContext("hola", "es", { signal: controller.signal })).rejects.toThrow()
  })

  it("returns mapped rows on success", async () => {
    embedQueryMock.mockResolvedValue([0.1, 0.2])
    executeMock.mockResolvedValue([
      { id: "c1", document_id: "d1", content: "texto", token_count: 3, source: "blog", source_ref: "p", title: "T", url: "/u", similarity: 0.9 },
    ])
    const rows = await retrieveContext("hola", "es")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ content: "texto", similarity: 0.9 })
  })
})
