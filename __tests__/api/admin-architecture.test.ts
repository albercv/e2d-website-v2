/**
 * @jest-environment node
 */
import * as fs from "fs"
import * as path from "path"
import * as os from "os"

let tmp: string | null = null

afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true })
  tmp = null
  delete process.env.CONTENT_ROOT
  jest.resetModules()
})

function loadRoutes() {
  jest.resetModules()
  return {
    html: require("../../app/admin/architecture/route"),
    data: require("../../app/admin/architecture/data/route"),
    view3d: require("../../app/admin/architecture/3d/route"),
  }
}

// El global-setup de jest redirige CONTENT_ROOT a un sandbox (prod guard),
// así que copiamos los entregables reales a un tmp y apuntamos ahí.
function stageDeliverables(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arch-"))
  const dest = path.join(dir, "staging", "architecture")
  fs.mkdirSync(dest, { recursive: true })
  for (const f of ["index.html", "index-3d.html", "architecture.json"]) {
    fs.copyFileSync(path.join(process.cwd(), "staging", "architecture", f), path.join(dest, f))
  }
  process.env.CONTENT_ROOT = dir
  return dir
}

describe("GET /admin/architecture", () => {
  it("serves the generated HTML with embedded architecture data", async () => {
    tmp = stageDeliverables()
    const { html } = loadRoutes()
    const res = await html.GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    const body = await res.text()
    expect(body).toContain('id="architecture-data"')
    expect(body).toContain("Mapa de Arquitectura")
  })

  it("serves architecture.json under /admin/architecture/data", async () => {
    tmp = stageDeliverables()
    const { data } = loadRoutes()
    const res = await data.GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("application/json")
    const body = JSON.parse(await res.text())
    expect(Array.isArray(body.nodes)).toBe(true)
    expect(Array.isArray(body.edges)).toBe(true)
    expect(Array.isArray(body.flows)).toBe(true)
  })

  it("serves the 3D view under /admin/architecture/3d", async () => {
    tmp = stageDeliverables()
    const { view3d } = loadRoutes()
    const res = await view3d.GET()
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/html")
    expect(res.headers.get("x-robots-tag")).toContain("noindex")
    expect(await res.text()).toContain("Mapa de Arquitectura 3D")
  })

  it("returns controlled 404 when the deliverables are missing", async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "arch-empty-"))
    process.env.CONTENT_ROOT = tmp
    const { html, data, view3d } = loadRoutes()
    expect((await html.GET()).status).toBe(404)
    expect((await data.GET()).status).toBe(404)
    expect((await view3d.GET()).status).toBe(404)
  })
})

describe("architecture.json integrity", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "staging/architecture/architecture.json"), "utf-8")
  const arch = JSON.parse(raw)

  it("has unique node and edge ids", () => {
    const nodeIds = arch.nodes.map((n: { id: string }) => n.id)
    const edgeIds = arch.edges.map((e: { id: string }) => e.id)
    expect(new Set(nodeIds).size).toBe(nodeIds.length)
    expect(new Set(edgeIds).size).toBe(edgeIds.length)
  })

  it("edges and flow steps only reference existing nodes", () => {
    const ids = new Set(arch.nodes.map((n: { id: string }) => n.id))
    for (const e of arch.edges) {
      expect(ids.has(e.source)).toBe(true)
      expect(ids.has(e.target)).toBe(true)
    }
    for (const f of arch.flows) {
      f.steps.forEach((s: { order: number; nodeId: string }, i: number) => {
        expect(ids.has(s.nodeId)).toBe(true)
        expect(s.order).toBe(i + 1)
      })
    }
  })

  it("embedded HTML data matches architecture.json", () => {
    const htmlRaw = fs.readFileSync(path.join(process.cwd(), "staging/architecture/index.html"), "utf-8")
    const m = htmlRaw.match(/<script type="application\/json" id="architecture-data">([\s\S]*?)<\/script>/)
    expect(m).not.toBeNull()
    const embedded = JSON.parse((m as RegExpMatchArray)[1].replace(/<\\\//g, "</"))
    expect(embedded).toEqual(arch)
  })
})
