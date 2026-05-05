// __tests__/lib/posts-write-cover.test.ts
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { createPost } from "@/lib/blog/posts-write"
import { clearPostsRuntimeCache } from "@/lib/blog/posts-runtime"

describe("createPost — cover and translationKey", () => {
  let tmp: string
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cp-"))
    fs.mkdirSync(path.join(tmp, "content", "posts"), { recursive: true })
    process.env.CONTENT_ROOT = tmp
    clearPostsRuntimeCache()
  })
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
    delete process.env.CONTENT_ROOT
  })

  it("writes cover and translationKey into the frontmatter when provided", async () => {
    await createPost({
      title: "Caso Ferdy",
      description: "Reportaje del caso Ferdy",
      content: "Un párrafo bastante largo para pasar la validación de contenido mínimo. [image:fachada]",
      locale: "es",
      tags: [],
      cover: "fachada",
      translationKey: "ferdy-2026",
    })
    const files = fs.readdirSync(path.join(tmp, "content", "posts"))
    expect(files.length).toBe(1)
    const raw = fs.readFileSync(path.join(tmp, "content", "posts", files[0]), "utf-8")
    expect(raw).toMatch(/cover:\s*fachada/)
    expect(raw).toMatch(/translationKey:\s*ferdy-2026/)
  })

  it("omits cover and uses slug as translationKey when not provided", async () => {
    await createPost({
      title: "Solo",
      description: "post sin media",
      content: "Texto suficientemente largo para pasar la validación mínima de cincuenta caracteres.",
      locale: "es",
      tags: [],
    })
    const files = fs.readdirSync(path.join(tmp, "content", "posts"))
    const raw = fs.readFileSync(path.join(tmp, "content", "posts", files[0]), "utf-8")
    expect(raw).not.toMatch(/^cover:/m)
  })
})
