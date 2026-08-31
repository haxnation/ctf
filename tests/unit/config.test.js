import { describe, test, expect } from 'vitest';
import { isSafeUrl, escapeHtml } from '../../js/config.js';

describe('config: isSafeUrl', () => {
  test('allows http and https', () => {
    expect(isSafeUrl('https://example.com/page')).toBe(true);
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('https://api.haxnation.org/ctf/api/auth/me')).toBe(true);
    expect(isSafeUrl('https://raw.githubusercontent.com/path/file.txt')).toBe(true);
  });

  test('blocks javascript: and data: schemes', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('ftp://example.com/file')).toBe(false);
    expect(isSafeUrl('vbscript:msgbox(1)')).toBe(false);
  });

  test('resolves relative urls against origin as http/https -> safe', () => {
    // relative url like /ctf/api returns http://localhost/... so should be safe
    expect(isSafeUrl('/ctf/api/events')).toBe(true);
    expect(isSafeUrl('/')).toBe(true);
  });

  test('rejects malformed urls', () => {
    expect(isSafeUrl('')).toBe(false);
    expect(isSafeUrl('http://')).toBe(false); // URL constructor may throw, catch returns false
    expect(isSafeUrl(null)).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
  });

  test('target=_blank safety: isSafeUrl must be used before href assignment', () => {
    // Simulate usage pattern from app.js safeHref: attacker tries to inject javascript:
    const attacker = 'javascript:alert(document.cookie)';
    expect(isSafeUrl(attacker)).toBe(false);
  });
});

describe('config: escapeHtml', () => {
  test('escapes &, <, >, \", \'', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  test('handles non-string coercion', () => {
    expect(escapeHtml(123)).toBe('123');
    expect(escapeHtml(null)).toBe('null');
  });

  test('prevents XSS in leaderboard name', () => {
    const xss = '<script>alert(1)</script>';
    expect(escapeHtml(xss)).not.toContain('<script>');
  });
});
