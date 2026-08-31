import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock DOMPurify globally before importing app helpers - mimic real sanitization: strip tags, remove javascript:
global.DOMPurify = { sanitize: (s) => String(s).replace(/<[^>]*>/g, '').replace(/javascript:/gi, '').trim() };

// Import after mocking
import { safeHref, isHexAddress, renderCompeteCard, renderPracticeCard } from '../../js/app.js';
import { isSafeUrl } from '../../js/config.js';

describe('security: safeHref', () => {
  test('returns safe url for https links', () => {
    expect(safeHref('https://example.com/page')).toBe('https://example.com/page');
  });
  test('returns fallback for javascript: scheme', () => {
    expect(safeHref('javascript:alert(1)', '#')).toBe('#');
    expect(safeHref('javascript:alert(1)', '/')).toBe('/');
  });
  test('returns fallback for empty/null', () => {
    expect(safeHref('', '#')).toBe('#');
    expect(safeHref(null, '/fallback')).toBe('/fallback');
    expect(safeHref(undefined)).toBe('#');
  });
  test('blocks data: urls', () => {
    expect(safeHref('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('#');
  });
});

describe('security: isHexAddress (web3 validation)', () => {
  test('accepts valid 0x + 40 hex', () => {
    expect(isHexAddress('0x1234567890123456789012345678901234567890')).toBe(true);
    expect(isHexAddress('0xabcdefABCDEF0123456789abcdefABCDEF012345')).toBe(true);
  });
  test('rejects missing 0x, wrong length, non-hex', () => {
    expect(isHexAddress('1234567890123456789012345678901234567890')).toBe(false);
    expect(isHexAddress('0x123')).toBe(false);
    expect(isHexAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(false);
    expect(isHexAddress('')).toBe(false);
    expect(isHexAddress(null)).toBe(false);
  });
  test('matches backend isHexAddress logic (42 chars, 0x prefix)', () => {
    // backend ctf.go:878 checks len 42 and 0x prefix + hex chars
    const valid = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(isHexAddress(valid)).toBe(true);
    expect(valid.length).toBe(42);
  });
});

describe('security: rendering helpers escape XSS and accommodate backend features', () => {
  beforeEach(() => {
    // Ensure window.activeEventId exists for compete-event href
    global.window = global.window || {};
    window.activeEventId = 'event-123';
  });

  test('renderCompeteCard shows maxAttempts badge when present (backend maxAttempts feature)', () => {
    const chal = { id: 'ch1', name: 'XSS <script>', category: 'Web', difficulty: 'Easy', points: 100, state: 'active', maxAttempts: 3, flagType: 'static' };
    const html = renderCompeteCard(chal, [], 'compete-independent');
    expect(html).toContain('MAX 3');
    expect(html).not.toContain('<script>');
  });

  test('renderCompeteCard shows flagType badge for non-static (regex, static_case_insensitive)', () => {
    const chal = { id: 'ch2', name: 'Regex', category: 'Crypto', difficulty: 'Hard', points: 500, state: 'active', flagType: 'regex' };
    const html = renderCompeteCard(chal, [], 'compete-independent');
    expect(html).toContain('REGEX');
  });

  test('renderCompeteCard encodes href to prevent injection (encodeURIComponent)', () => {
    const chal = { id: 'ch/with/slash', name: 'Test', category: 'Web', difficulty: 'Easy', points: 10, state: 'active' };
    const html = renderCompeteCard(chal, [], 'compete-independent');
    // href should contain encoded id, not raw slash injection
    expect(html).toContain('/ctf/challenge/compete/ch%2Fwith%2Fslash');
  });

  test('renderCompeteCard handles archived/upcoming states with opacity', () => {
    const archived = { id: 'ch3', name: 'Old', category: 'Web', difficulty: 'Easy', points: 100, state: 'archived' };
    expect(renderCompeteCard(archived, [], 'compete-independent')).toContain('EXPIRED');
    const upcoming = { id: 'ch4', name: 'Soon', category: 'Web', difficulty: 'Easy', points: 100, state: 'upcoming' };
    expect(renderCompeteCard(upcoming, [], 'compete-independent')).toContain('opacity-60');
  });

  test('renderPracticeCard escapes XSS in name and shows SOLVED badge', () => {
    const chal = { id: '1', name: '<img src=x onerror=alert(1)>', category: 'Web', difficulty: 'Easy', authors: ['<script>'] };
    const html = renderPracticeCard(chal, ['1']);
    expect(html).toContain('SOLVED');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
  });

  test('safeHref + renderCompeteCard prevents javascript: registrationLink XSS (backend registrationLink)', () => {
    // This mimics loadLiveEvents where registrationLink is sanitized via safeHref
    const malicious = 'javascript:alert(1)';
    expect(isSafeUrl(malicious)).toBe(false);
    expect(safeHref(malicious, '')).toBe('');
  });
});

describe('security: CSP-relevant invariants', () => {
  test('event-card data attributes should be used not inline onclick', () => {
    // Verify app.js no longer uses onclick with event id in innerHTML generation for events
    // We check that renderCompeteCard uses data-nav not onclick
    const chal = { id: 'ch5', name: 'Safe', category: 'Web', difficulty: 'Easy', points: 10, state: 'active' };
    const html = renderCompeteCard(chal, [], 'compete-independent');
    expect(html).not.toContain('onclick=');
    expect(html).toContain('data-nav');
  });
});
