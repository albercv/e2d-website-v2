# ChatGPT custom-connector MCP — deploy + verification plan

> Goal: ship the dynamic-client-registration hardening that makes the existing
> OAuth/MCP server accept ChatGPT custom-connector flows alongside the
> already-working Claude.ai flow, without regressing Claude.

---

## 0. Pre-deploy checklist

- [ ] Branch: `worktree-agent-aae14f9f272091024` (worktree at
      `/root/e2dProject/e2d-website-v2/.claude/worktrees/agent-aae14f9f272091024`)
- [ ] All Jest suites green locally: `npx jest --no-coverage`
- [ ] Targeted suites green:
      `npx jest --no-coverage __tests__/lib/oauth-redirect-uri-allowlist.test.ts __tests__/api/register.test.ts`
- [ ] Files changed (review with `git diff develop...HEAD`):
  - `lib/oauth/redirect-uri-allowlist.ts`            *(new helper)*
  - `app/register/route.ts`                          *(use helper, restrict default scopes to readonly)*
  - `__tests__/lib/oauth-redirect-uri-allowlist.test.ts` *(new)*
  - `__tests__/api/register.test.ts`                 *(updated for stricter allowlist + readonly defaults)*
  - `tasks/chatgpt-mcp-test-plan.md`                 *(this file)*
- [ ] No changes to `data/oauth.sqlite`, no env-var additions, no schema migration.
- [ ] Commit hashes recorded for rollback (capture `git log --oneline -n 6`).

---

## 1. Deploy steps (run from `/root/e2dProject/e2d-website-v2`)

```bash
# 1.1 — switch to the feature branch
cd /root/e2dProject/e2d-website-v2
git fetch
git checkout worktree-agent-aae14f9f272091024

# 1.2 — install (only if package-lock changed; this branch did not add deps)
# npm ci   # skip unless you suspect a stale node_modules

# 1.3 — re-verify the test suite on the deploy host
npm test -- --no-coverage --testPathPatterns="oauth|register"

# 1.4 — full build pipeline (pull-content + next build + ai-indexing)
npm run build

# 1.5 — restart PM2 picking up the new bundle and any env changes
pm2 restart e2d --update-env

# 1.6 — confirm clean restart
pm2 logs e2d --lines 30 --nostream
```

Look for:
- `next` boot line ending in `Ready in <ms>` on port `3003`
- No `[OAUTH-AUTHZ]` errors on boot
- No "missing env" warnings for `JWT_SECRET` / `ADMIN_SESSION_SECRET`
- No `Error: better-sqlite3` build/load errors

If anything is red, **stop here** and go to §7 Rollback.

---

## 2. Smoke tests against the live server

Run from any host that can reach `https://evolve2digital.com`. Each block is
copy-pasteable.

### 2.1 — AS metadata advertises registration_endpoint

```bash
curl -fsS https://evolve2digital.com/.well-known/oauth-authorization-server | jq .
```

Expected JSON includes:
```jsonc
{
  "issuer": "https://evolve2digital.com",
  "authorization_endpoint": "https://evolve2digital.com/authorize",
  "token_endpoint": "https://evolve2digital.com/token",
  "registration_endpoint": "https://evolve2digital.com/register",
  "code_challenge_methods_supported": ["S256"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code"],
  "scopes_supported": ["posts:read", "search:read", "fetch:read", "appointments:create", "agent:query", "posts:write", "posts:delete"]
}
```

If `registration_endpoint` is missing → ChatGPT's auto-discovery will fail.
Fix the AS route before continuing.

### 2.2 — Protected-resource document

```bash
curl -fsS https://evolve2digital.com/.well-known/oauth-protected-resource | jq .
```

Expected: `resource`, `authorization_servers`, `bearer_methods_supported`,
`scopes_supported`. No change required by this branch — this is just a
sanity check.

### 2.3 — Dynamic registration: HAPPY PATH (ChatGPT redirect)

```bash
curl -i -X POST https://evolve2digital.com/register \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "ChatGPT smoke test",
    "redirect_uris": ["https://chatgpt.com/connector/oauth/smoke-1"]
  }'
```

Expected: `HTTP/2 201`, body containing `client_id` starting with `e2d_`,
`redirect_uris` echoed back, `token_endpoint_auth_method: "none"`,
`grant_types: ["authorization_code","refresh_token"]`, `response_types: ["code"]`,
`scope` listing all 7 known scopes (note: this is the *advertised* set;
`allowed_scopes` for this client is internally restricted to readonly).

### 2.4 — Dynamic registration: HAPPY PATH (Claude redirect)

```bash
curl -i -X POST https://evolve2digital.com/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["https://claude.ai/api/mcp/auth_callback"]}'
```

Expected: `HTTP/2 201` with the same shape. This is the regression check —
Claude.ai must still register.

### 2.5 — Dynamic registration: SUBDOMAIN ATTACK rejected

```bash
curl -i -X POST https://evolve2digital.com/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["https://claude.ai.attacker.com/api/mcp/auth_callback"]}'
```

Expected: `HTTP/2 400` with body `{"error":"invalid_redirect_uri", ...}`.

### 2.6 — Dynamic registration: HTTP rejected

```bash
curl -i -X POST https://evolve2digital.com/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["http://chatgpt.com/connector/oauth/x"]}'
```

Expected: `HTTP/2 400`.

### 2.7 — Dynamic registration: fragment rejected

```bash
curl -i -X POST https://evolve2digital.com/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["https://claude.ai/cb#fragment"]}'
```

Expected: `HTTP/2 400`.

### 2.8 — Dynamic registration: userinfo rejected

```bash
curl -i -X POST https://evolve2digital.com/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["https://user:pw@claude.ai/cb"]}'
```

Expected: `HTTP/2 400`.

### 2.9 — Dynamic registration: localhost no longer accepted

```bash
curl -i -X POST https://evolve2digital.com/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris": ["http://localhost:3000/oauth/callback"]}'
```

Expected: `HTTP/2 400`. Local dev clients use the static `local-dev` seed
client (see `lib/oauth-db.ts → seedClients`); they do **not** go through
dynamic registration.

---

## 3. End-to-end via the ChatGPT UI

> The user must already be signed in to ChatGPT with a workspace that allows
> custom connectors (Plus/Team/Enterprise as of 2026-05).

1. Open `https://chatgpt.com/` → settings → **Connectors** → *Add custom connector*.
2. Connector type: **Remote MCP server** (the Streamable HTTP option).
3. **Server URL**: `https://evolve2digital.com/mcp`
   - This hits `app/mcp/route.ts`. Origin `https://chatgpt.com` is on the
     allowlist (`enforceOriginAllowlist`), so the CORS preflight returns 200.
4. **Auth**: choose **OAuth 2.0**, leave *automatic discovery* enabled.
   - ChatGPT will fetch `/.well-known/oauth-authorization-server`, see the
     `registration_endpoint`, and POST a `redirect_uris` entry pointing at
     `https://chatgpt.com/connector/oauth/<id>` (or
     `…/connector_platform_oauth_redirect`). Both prefixes are now in the
     server's allowlist.
5. Click **Connect**. ChatGPT opens a popup to
   `https://evolve2digital.com/authorize?…`.
6. Sign in with the admin email/password (the same form that works for Claude).
   The consent UI shows the requested scopes — they should all be readonly
   (`posts:read search:read fetch:read`) because the dynamically-registered
   client only has those allowed_scopes.
7. After approve, the popup redirects back to ChatGPT and closes.
8. ChatGPT reports the connector as **Connected**. The tool list it shows
   should include `search`, `fetch`, `posts_get`, `posts_search`,
   `posts_schema` (read-only set). Write tools are filtered out because
   the dynamic client lacks the scopes; this is intentional.
9. From a new chat: enable the connector → ask
   *"Use the E2D connector to search for posts about WhatsApp."*  ChatGPT
   should call `tools/call` with `name: "search"` and surface results.

If step 5 fails with "redirect_uri not in allowlist": ChatGPT may have
rolled out a new redirect path. Capture the exact URL from the browser
address bar and add its prefix to `ALLOWED_REDIRECT_PREFIXES` in
`lib/oauth/redirect-uri-allowlist.ts`. **Do not** weaken the parser.

---

## 4. Verification of audit trail

While the connector is connected and a tool call is executed, inspect:

### 4.1 — PM2 stdout

```bash
pm2 logs e2d --lines 100 --nostream | grep -E "OAUTH-AUTHZ|/register|/mcp|/sse"
```

Expect:
- One `POST /register` 201
- One `GET /authorize` (with `client_id`, `redirect_uri`, scopes)
- One `POST /authorize` 302
- One `POST /token` 200
- One or more `POST /mcp` (initialize, tools/list, tools/call)

### 4.2 — Posts audit log (if a write tool ever runs)

```bash
tail -n 100 logs/posts-audit.log
```

For this connector, *no entries should appear* for posts_create / posts_delete
because the readonly scope policy blocks them. Emptiness here is the
positive signal.

### 4.3 — Nginx access log

```bash
sudo tail -n 200 /var/log/nginx/access.log | \
  grep -E '/(sse|mcp|oauth|register|authorize|token|\.well-known)' | tail -50
```

Expect 200/201/302 statuses; any 4xx around `/register` indicates ChatGPT
sent something the allowlist rejected — capture the full request line.

---

## 5. Negative-path verification (Claude.ai regression check)

> Run this after the ChatGPT happy path passes, to prove Claude.ai still
> works.

In Claude.ai (`https://claude.ai`) → settings → connectors → *the existing
E2D connector* (already configured) → **Test connection**.

Or, with an existing Claude bearer token saved from a prior session:

```bash
# Replace $CLAUDE_TOKEN with the bearer pulled from `data/oauth.sqlite`
# (oauth_refresh_tokens) or from a recent /token exchange.
curl -fsS -X POST https://evolve2digital.com/sse \
  -H "Authorization: Bearer $CLAUDE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | jq .
```

Expected: 200 with the tools list. If 401, Claude's flow is broken — go to §7.

---

## 6. Known issues / observations (out of scope for this branch)

- `app/mcp/route.ts` still falls back to `Access-Control-Allow-Origin: *`
  when no Origin header is sent (server-to-server callers). This is fine
  for ChatGPT's browser flow but does not satisfy strict CORS requirements
  if a third party ever points a browser there. Out of scope.
- `lib/oauth-db.ts → seedClients()` includes a hard-coded `chatgpt-mcp`
  client_id with **all** scopes including writes. This pre-dates the dynamic
  flow and remains as an escape hatch for confidential server-side use; if
  ChatGPT ever discovers and reuses that client_id, write tools become
  available. Audit periodically and consider rotating the redirect URI to
  an opaque value if write-via-ChatGPT is undesired.
- `app/api/mcp/manifest/route.ts` still advertises `authorization_endpoint:
  ${baseUrl}/authorize` per tool. The well-known AS document is the
  canonical source; the manifest's tool-level auth blocks are decorative
  and aren't consumed by ChatGPT's MCP discovery. No change needed here.
- The `tools/list` response in `lib/mcp/rpc-handler.ts` does not yet emit
  `annotations` (readOnly, destructive, idempotent). ChatGPT can connect
  without annotations; it just shows fewer warnings to the user. Tracked
  separately, not in scope here.

---

## 7. Rollback plan

If the live server misbehaves after `pm2 restart`, roll back to the previous
commit on `feature/mcpblog-images`:

```bash
# From /root/e2dProject/e2d-website-v2
git checkout feature/mcpblog-images
git log -1 --oneline   # confirm c7d41fc or whatever was prior
npm run build
pm2 restart e2d --update-env
pm2 logs e2d --lines 30 --nostream
```

If the build pipeline itself is broken on the new branch:

```bash
git checkout develop      # last known-green main branch
npm ci                    # only if needed
npm run build
pm2 restart e2d --update-env
```

If a malicious or accidentally-permissive client_id was registered between
restart and rollback:

```bash
sqlite3 /root/e2dProject/e2d-website-v2/data/oauth.sqlite \
  "UPDATE oauth_clients SET disabled = 1 WHERE client_id = '<bad_client_id>';"
```

(Disabling, not deleting, preserves the audit trail. `getClientById` filters
by `disabled = 0`.)

---

## 8. Sign-off

- [ ] §2 smoke tests all pass
- [ ] §3 ChatGPT happy-path completes through to a successful `search` tool call
- [ ] §5 Claude.ai still works
- [ ] §4 logs reviewed, no unexpected 5xx
- [ ] No new entries in `oauth_clients` with non-allowlisted redirect URIs
      (`sqlite3 data/oauth.sqlite "SELECT client_id, redirect_uris FROM oauth_clients;"`)
