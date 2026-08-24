/** @jest-environment node */
import * as fs from "fs"
import * as path from "path"
import * as os from "os"
import { readImageDimensions } from "@/lib/blog/media-dimensions"

// Minimal valid 1x1 transparent PNG — enough for image-size to parse real
// width/height without needing a fixture asset in the repo.
const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

describe("readImageDimensions — stat throttle", () => {
  let tmp: string
  let file: string

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dims-"))
    file = path.join(tmp, "foto.png")
    fs.writeFileSync(file, Buffer.from(PNG_1X1_BASE64, "base64"))
  })

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true })
  })

  it("keeps returning cached dims within the throttle window even if the file disappears (no re-stat)", async () => {
    const first = await readImageDimensions(file)
    expect(first).toEqual({ width: 1, height: 1 })

    // If the throttle window were not honored, this call would re-stat,
    // hit ENOENT, and fall back to null — deleting the file is what makes
    // "no re-stat happened" observable without mocking fs.
    fs.rmSync(file)
    const second = await readImageDimensions(file)
    expect(second).toEqual({ width: 1, height: 1 })
  })
})
