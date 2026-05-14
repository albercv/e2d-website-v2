/**
 * Side-effect module: load .env into process.env before any module that
 * reads env vars at import time (e.g. lib/db/client.ts).
 * Import this FIRST in CLI entry-point scripts.
 */
import { loadEnvFile } from "node:process";

try {
  loadEnvFile(".env");
} catch {
  // .env optional; fall back to ambient process.env
}
