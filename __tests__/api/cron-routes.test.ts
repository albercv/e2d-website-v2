/**
 * @jest-environment node
 *
 * Las rutas /api/cron/* corren dentro del standalone (cwd .next/standalone),
 * donde no existen scripts/ ni docs/. Deben resolver todo desde CONTENT_ROOT.
 */
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { NextRequest } from "next/server"

const execSync = jest.fn()
jest.mock("child_process", () => ({ execSync: (...args: unknown[]) => execSync(...args) }))

let tmp: string | null = null

beforeEach(() => {
  execSync.mockReset()
  process.env.CRON_SECRET = "test-cron-secret"
})

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  tmp = null
  delete process.env.CONTENT_ROOT
  delete process.env.CRON_SECRET
  jest.resetModules()
})

function makeRoot(files: string[] = []): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cron-"))
  for (const rel of files) {
    const full = path.join(dir, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, "x")
  }
  process.env.CONTENT_ROOT = dir
  return dir
}

function req(auth?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/x", {
    headers: auth ? { authorization: auth } : {},
  })
}

function loadRoutes() {
  jest.resetModules()
  return {
    seo: require("../../app/api/cron/regenerate-seo/route"),
    integrity: require("../../app/api/cron/integrity-check/route"),
  }
}

describe("cron auth", () => {
  it.each(["seo", "integrity"] as const)("%s rejects missing or wrong bearer", async (name) => {
    tmp = makeRoot()
    const routes = loadRoutes()
    expect((await routes[name].GET(req())).status).toBe(401)
    expect((await routes[name].GET(req("Bearer nope"))).status).toBe(401)
    expect(execSync).not.toHaveBeenCalled()
  })

  it("rejects everything when CRON_SECRET is unset", async () => {
    tmp = makeRoot()
    delete process.env.CRON_SECRET
    const { seo } = loadRoutes()
    expect((await seo.GET(req("Bearer "))).status).toBe(401)
  })
})

describe("GET /api/cron/regenerate-seo", () => {
  it("runs seo:regenerate with cwd = CONTENT_ROOT, not process.cwd()", async () => {
    tmp = makeRoot()
    const { seo } = loadRoutes()
    const res = await seo.GET(req("Bearer test-cron-secret"))
    expect(res.status).toBe(200)
    expect(execSync).toHaveBeenCalledTimes(1)
    const [cmd, opts] = execSync.mock.calls[0] as [string, { cwd: string }]
    expect(cmd).toBe("npm run seo:regenerate")
    expect(opts.cwd).toBe(tmp)
    expect(opts.cwd).not.toBe(process.cwd())
  })

  it("returns controlled 500 when the script fails", async () => {
    tmp = makeRoot()
    execSync.mockImplementation(() => {
      throw new Error("Command failed: npm run seo:regenerate")
    })
    const { seo } = loadRoutes()
    const res = await seo.GET(req("Bearer test-cron-secret"))
    expect(res.status).toBe(500)
    expect((await res.json()).success).toBe(false)
  })
})

describe("GET /api/cron/integrity-check", () => {
  const MCP_DOCS = ["docs/mcp-usage.md", "docs/mcp-examples.md", "docs/mcp-changelog.md"]

  it("is healthy with only the MCP docs present (sitemap/rss are dynamic routes)", async () => {
    tmp = makeRoot(MCP_DOCS)
    const { integrity } = loadRoutes()
    const res = await integrity.GET(req("Bearer test-cron-secret"))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.healthy).toBe(true)
    expect(Object.keys(body.checks).sort()).toEqual(["mcpChangelog", "mcpExamples", "mcpUsage"])
    expect(execSync).not.toHaveBeenCalled()
  })

  it("regenerates from CONTENT_ROOT when a doc is missing", async () => {
    tmp = makeRoot(MCP_DOCS.slice(0, 2))
    const { integrity } = loadRoutes()
    const body = await (await integrity.GET(req("Bearer test-cron-secret"))).json()
    expect(body.healthy).toBe(false)
    expect(body.checks.mcpChangelog).toBe(false)
    expect(execSync).toHaveBeenCalledTimes(1)
    expect((execSync.mock.calls[0] as [string, { cwd: string }])[1].cwd).toBe(tmp)
  })
})
