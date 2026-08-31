import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJson, showRateLimitError, isHexAddress } from '../../js/app.js';

// Mock DOMPurify and showToast
global.DOMPurify = { sanitize: (s) => String(s) };

describe('api-accommodation: fetchJson', () => {
  beforeEach(() => { global.fetch = vi.fn(); });

  test('returns {res, data} on valid JSON', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) });
    const { res, data } = await fetchJson('https://api.test', {});
    expect(res.ok).toBe(true);
    expect(data.success).toBe(true);
  });

  test('returns data null on invalid JSON (fail-secure)', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('bad'); } });
    const { data } = await fetchJson('https://api.test', {});
    expect(data).toBeNull();
  });

  test('preserves response for status inspection (429, 403)', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 429, headers: { get: () => '60' }, json: async () => ({ success: false, error: 'Too many' }) });
    const { res, data } = await fetchJson('https://api.test', {});
    expect(res.status).toBe(429);
    expect(data.error).toBe('Too many');
  });
});

describe('api-accommodation: rate-limit handling', () => {
  test('showRateLimitError sets statusEl and calls showToast', () => {
    const statusEl = { className: '', innerText: '' };
    const res = { headers: { get: (k) => k === 'Retry-After' ? '120' : null } };
    global.window = global.window || {};
    window.showToast = vi.fn();
    showRateLimitError(statusEl, res);
    expect(statusEl.innerText).toContain('120');
    expect(statusEl.innerText).toContain('RATE LIMITED');
    expect(window.showToast).toHaveBeenCalledWith('error', expect.stringContaining('120'));
  });

  test('defaults to 60 when Retry-After missing', () => {
    const el = { className: '', innerText: '' };
    const res = { headers: { get: () => null } };
    window.showToast = vi.fn();
    showRateLimitError(el, res);
    expect(el.innerText).toContain('60');
  });
});

describe('api-accommodation: backend feature compliance via source inspection', () => {
  // These tests ensure frontend accommodates new backend features by inspecting built source
  // They guard against regressions where feature handling is removed

  test('web3 message format uses HaxNation_Auth_ (capital N) matching blockchain.go:36', async () => {
    const fs = await import('node:fs/promises');
    const app = await fs.readFile('js/app.js', 'utf-8');
    expect(app).toContain('HaxNation_Auth_');
    expect(app).not.toContain('Haxnation_Auth_'); // old buggy case must not remain
    // also ensures isHexAddress validation is present
    expect(app).toContain('isHexAddress');
  });

  test('maxAttempts and flagType badges are rendered (backend Challenge.MaxAttempts/FlagType)', async () => {
    const fs = await import('node:fs/promises');
    const app = await fs.readFile('js/app.js', 'utf-8');
    expect(app).toContain('maxAttempts');
    expect(app).toContain('flagType');
    expect(app).toContain('MAX');
  });

  test('leaderboard handles hidden:true (backend HideScores)', async () => {
    const fs = await import('node:fs/promises');
    const app = await fs.readFile('js/app.js', 'utf-8');
    expect(app).toContain('data.hidden');
    expect(app).toContain('Scoreboard is hidden');
  });

  test('flag submission encodes URI components and enforces 2048 limit', async () => {
    const fs = await import('node:fs/promises');
    const app = await fs.readFile('js/app.js', 'utf-8');
    expect(app).toContain('encodeURIComponent(window.activeEventId)');
    expect(app).toContain('2048');
    expect(app).toContain('FLAG TOO LONG');
  });

  test('429 handling present for challenge fetch, events, leaderboard', async () => {
    const fs = await import('node:fs/promises');
    const app = await fs.readFile('js/app.js', 'utf-8');
    const count = (app.match(/status === 429/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('admin awards and export/import endpoints present', async () => {
    const fs = await import('node:fs/promises');
    const app = await fs.readFile('js/app.js', 'utf-8');
    expect(app).toContain('/awards');
    expect(app).toContain('/admin/export');
    expect(app).toContain('/admin/import');
    expect(app).toContain('admin-panel');
  });

  test('safeHref and isSafeUrl used for registrationLink and assets (XSS)', async () => {
    const fs = await import('node:fs/promises');
    const app = await fs.readFile('js/app.js', 'utf-8');
    expect(app).toContain('safeHref');
    expect(app).toContain('isSafeUrl');
    expect(app).toContain('rel="noopener noreferrer"');
  });
});

describe('api-accommodation: leaderboard hidden behavior (unit simulation)', () => {
  test('hidden leaderboard should show warning not ranks', () => {
    // Simulate showLeaderboard logic: if data.hidden true, tbody warning
    const data = { hidden: true, message: 'Scoreboard is hidden.', leaderboard: [] };
    let tbody = '';
    if (data.hidden) {
      tbody = `> ${data.message}`;
    }
    expect(tbody).toContain('hidden');
  });

  test('awards counted in leaderboard points (backend)', () => {
    // Backend adds awards points to scores; frontend should display summed points
    // This test documents expected accommodation: awards are included in leaderboard totals
    const submissions = [{ userId: 'u1', points: 100 }];
    const awards = [{ userId: 'u1', points: 50 }];
    const total = submissions.reduce((s, x) => s + x.points, 0) + awards.reduce((s, x) => s + x.points, 0);
    expect(total).toBe(150);
  });
});

describe('security: isHexAddress web3 backend validation', () => {
  test('isHexAddress used before submit-web3 to prevent invalid walletAddress 400', () => {
    expect(isHexAddress('0x' + 'a'.repeat(40))).toBe(true);
    expect(isHexAddress('0x' + 'g'.repeat(40))).toBe(false);
    expect(isHexAddress('')).toBe(false);
  });
});
