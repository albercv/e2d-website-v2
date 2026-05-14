/**
 * Server-only in-memory job tracker for manual RAG index rebuilds.
 *
 * The admin UI triggers `npm run rag:index` via a child process; this
 * module keeps the last run's status, exit code and a tailed stdout/stderr
 * log so the page can poll a single GET endpoint instead of streaming the
 * subprocess. Singleton state — fine for the PM2 single-worker deploy;
 * horizontal scaling would require moving this to Redis.
 *
 * No DB writes, no filesystem I/O. Importing from a client component will
 * fail at build time because `child_process` is a Node-only module.
 */

import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"

export type JobStatus = "idle" | "running" | "success" | "failed"

export interface JobState {
  status: JobStatus
  startedAt: Date | null
  finishedAt: Date | null
  pid: number | null
  log: string[]
  exitCode: number | null
  error: string | null
}

export interface StartRebuildOpts {
  full?: boolean
  locales?: string[]
  sources?: string[]
}

export interface StartRebuildResult {
  started: boolean
  reason?: string
}

const MAX_LOG_LINES = 200
const VALID_LOCALES = new Set(["es", "en", "it"])
const VALID_SOURCES = new Set(["blog", "service", "faq", "landing", "ai-answer"])

const state: JobState = {
  status: "idle",
  startedAt: null,
  finishedAt: null,
  pid: null,
  log: [],
  exitCode: null,
  error: null,
}

export function getJobState(): JobState {
  // Return a shallow copy so callers can't mutate internal arrays.
  return { ...state, log: state.log.slice() }
}

function pushLog(line: string): void {
  const lines = line.split(/\r?\n/).filter((l) => l.length > 0)
  for (const l of lines) {
    state.log.push(l)
    if (state.log.length > MAX_LOG_LINES) state.log.shift()
  }
}

function buildArgs(opts: StartRebuildOpts): string[] {
  const args: string[] = ["run", "rag:index", "--"]
  if (opts.full) args.push("--full")
  if (opts.locales && opts.locales.length > 0) {
    const filtered = opts.locales.filter((l) => VALID_LOCALES.has(l))
    if (filtered.length > 0) args.push(`--locale=${filtered.join(",")}`)
  }
  if (opts.sources && opts.sources.length > 0) {
    const filtered = opts.sources.filter((s) => VALID_SOURCES.has(s))
    if (filtered.length > 0) args.push(`--source=${filtered.join(",")}`)
  }
  return args
}

function wireProcess(child: ChildProcessWithoutNullStreams): void {
  child.stdout.setEncoding("utf-8")
  child.stderr.setEncoding("utf-8")
  child.stdout.on("data", (chunk: string) => pushLog(chunk))
  child.stderr.on("data", (chunk: string) => pushLog(chunk))
  child.on("error", (err) => {
    state.error = err instanceof Error ? err.message : String(err)
    pushLog(`[spawn-error] ${state.error}`)
  })
  child.on("close", (code) => {
    state.status = code === 0 ? "success" : "failed"
    state.finishedAt = new Date()
    state.exitCode = code
    state.pid = null
  })
}

export function startRebuild(opts: StartRebuildOpts): StartRebuildResult {
  if (state.status === "running") {
    return { started: false, reason: "already_running" }
  }
  state.status = "running"
  state.startedAt = new Date()
  state.finishedAt = null
  state.exitCode = null
  state.error = null
  state.log = []
  const args = buildArgs(opts)
  try {
    const child = spawn("npm", args, {
      cwd: process.cwd(),
      env: process.env,
      detached: false,
    }) as ChildProcessWithoutNullStreams
    state.pid = child.pid ?? null
    pushLog(`[start] npm ${args.join(" ")}`)
    wireProcess(child)
    return { started: true }
  } catch (err) {
    // Spawn failure synchronously surfaces here — flip state back so the
    // UI doesn't get stuck reporting "running" forever.
    state.status = "failed"
    state.finishedAt = new Date()
    state.error = err instanceof Error ? err.message : String(err)
    state.pid = null
    return { started: false, reason: "spawn_failed" }
  }
}
