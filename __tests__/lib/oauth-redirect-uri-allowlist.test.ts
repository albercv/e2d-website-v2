/**
 * @jest-environment node
 */

import {
  ALLOWED_REDIRECT_PREFIXES,
  isAllowedRedirectUri,
} from '../../lib/oauth/redirect-uri-allowlist'

describe('isAllowedRedirectUri', () => {
  describe('accepts documented MCP client redirects', () => {
    const accepted: string[] = [
      'https://claude.ai/api/mcp/auth_callback',
      'https://claude.ai/oauth/callback',
      'https://claude.ai/',
      'https://chatgpt.com/connector/oauth/abc123',
      'https://chatgpt.com/connector/oauth/some-deep/path?with=query',
      'https://chatgpt.com/connector_platform_oauth_redirect',
      'https://chat.openai.com/aip/',
      'https://chat.openai.com/aip/connector/cb',
    ]
    it.each(accepted)('accepts %s', (uri) => {
      expect(isAllowedRedirectUri(uri)).toBe(true)
    })
  })

  describe('rejects subdomain spoofing and host confusion', () => {
    const rejected: string[] = [
      // Classic prefix-spoofing: same characters, different origin
      'https://claude.ai.attacker.com/api/mcp/auth_callback',
      'https://chatgpt.com.attacker.com/connector/oauth/x',
      'https://chat.openai.com.attacker.com/aip/',
      // Userinfo confusion — old phishing technique
      'https://claude.ai@attacker.com/cb',
      'https://chatgpt.com@evil.example/connector/oauth/x',
    ]
    it.each(rejected)('rejects %s', (uri) => {
      expect(isAllowedRedirectUri(uri)).toBe(false)
    })
  })

  describe('rejects insecure protocols', () => {
    it('rejects http://', () => {
      expect(isAllowedRedirectUri('http://claude.ai/api/mcp/auth_callback')).toBe(false)
    })
    it('rejects javascript:', () => {
      // eslint-disable-next-line no-script-url
      expect(isAllowedRedirectUri('javascript:alert(1)')).toBe(false)
    })
    it('rejects data:', () => {
      expect(isAllowedRedirectUri('data:text/html,<script>1</script>')).toBe(false)
    })
    it('rejects file:', () => {
      expect(isAllowedRedirectUri('file:///etc/passwd')).toBe(false)
    })
  })

  describe('rejects forbidden URL components', () => {
    it('rejects URI containing a fragment (RFC 6749 §3.1.2)', () => {
      expect(isAllowedRedirectUri('https://claude.ai/cb#fragment')).toBe(false)
    })
    it('rejects URI with embedded credentials', () => {
      expect(isAllowedRedirectUri('https://user:pw@claude.ai/cb')).toBe(false)
    })
    it('rejects URI with username only', () => {
      expect(isAllowedRedirectUri('https://user@claude.ai/cb')).toBe(false)
    })
  })

  describe('rejects malformed and trivial inputs', () => {
    const rejected: unknown[] = [
      'not-a-url',
      '',
      '   ',
      null,
      undefined,
      42,
      [],
      {},
      'https://',
    ]
    it.each(rejected.map((v) => [String(v), v] as [string, unknown]))(
      'rejects %s',
      (_label, uri) => {
        expect(isAllowedRedirectUri(uri)).toBe(false)
      }
    )
  })

  describe('rejects close-but-wrong paths', () => {
    it('rejects chatgpt.com/connector/ without the /oauth/ segment', () => {
      // "/connector/" is NOT an allowed prefix on its own; only
      // "/connector/oauth/" or "/connector_platform_oauth_redirect" are.
      expect(isAllowedRedirectUri('https://chatgpt.com/connector/')).toBe(false)
    })
    it('rejects chatgpt.com/foo/ entirely', () => {
      expect(isAllowedRedirectUri('https://chatgpt.com/foo/')).toBe(false)
    })
    it('rejects bare chatgpt.com root', () => {
      // chatgpt.com prefixes require the /connector/oauth/ or /connector_platform_oauth_redirect segments
      expect(isAllowedRedirectUri('https://chatgpt.com/')).toBe(false)
    })
    it('rejects partial chatgpt prefix collision', () => {
      // "/connector_platform_oauth_redirec" (one char short) must not match
      expect(
        isAllowedRedirectUri('https://chatgpt.com/connector_platform_oauth_redirec')
      ).toBe(false)
    })
  })

  it('exports a non-empty, https-only prefix list', () => {
    expect(ALLOWED_REDIRECT_PREFIXES.length).toBeGreaterThan(0)
    for (const prefix of ALLOWED_REDIRECT_PREFIXES) {
      expect(prefix.startsWith('https://')).toBe(true)
    }
  })
})
