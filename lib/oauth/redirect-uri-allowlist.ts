/**
 * Prefix-based allowlist for redirect URIs accepted by the dynamic client
 * registration endpoint (RFC 7591) at POST /register.
 *
 * Why prefixes (and not raw `string.startsWith`):
 *  - Doing `uri.startsWith("https://claude.ai/")` against the raw user input is
 *    NOT safe. Hosts like `https://claude.ai.attacker.com/...` start with the
 *    same characters but parse to a completely different origin.
 *  - We parse the URI with WHATWG URL, normalize to `origin + pathname`, and
 *    only then check the prefix. The browser/Node URL parser handles
 *    user-info, port, fragment, percent-encoding consistently.
 *
 * Constraints enforced:
 *  - Must parse as a valid URL.
 *  - Protocol must be `https:` (RFC 8252 + OAuth 2.1 §2.1.1 forbid plaintext
 *    for non-loopback redirects).
 *  - Fragment component MUST be empty (RFC 6749 §3.1.2).
 *  - userinfo (user/password) MUST be empty.
 *  - The normalized `origin + pathname` MUST start with one of the allowed
 *    prefixes below.
 *
 * The allowlist is intentionally short. Adding a new MCP client (e.g., a
 * future ChatGPT desktop app) means appending its documented redirect prefix
 * here, NOT loosening the parser.
 */
export const ALLOWED_REDIRECT_PREFIXES: readonly string[] = [
  // Claude.ai (web + workspace subdomains use the same host today)
  'https://claude.ai/',
  // ChatGPT custom connectors — production redirect documented by OpenAI
  'https://chatgpt.com/connector/oauth/',
  'https://chatgpt.com/connector_platform_oauth_redirect',
  // Legacy / staging origin still in some OpenAI flows
  'https://chat.openai.com/',
] as const

export function isAllowedRedirectUri(uri: unknown): uri is string {
  if (typeof uri !== 'string' || uri.length === 0) return false

  let parsed: URL
  try {
    parsed = new URL(uri)
  } catch {
    return false
  }

  if (parsed.protocol !== 'https:') return false
  if (parsed.hash !== '') return false
  if (parsed.username !== '' || parsed.password !== '') return false

  // `origin` is host+scheme+port only — no userinfo, no path, no query, no
  // fragment — so concatenating with `pathname` gives us a clean string that
  // cannot be spoofed by attackers playing tricks with `@` or `#` characters.
  const normalized = parsed.origin + parsed.pathname

  return ALLOWED_REDIRECT_PREFIXES.some((prefix) => normalized.startsWith(prefix))
}
