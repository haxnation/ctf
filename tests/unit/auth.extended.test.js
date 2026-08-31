import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeReturnTo, checkAuth, login, logout, updateAuthUI } from '../../js/auth.js';
import { state, API_BASE_URL } from '../../js/config.js';

global.fetch = vi.fn();

// Mock DOMPurify for app imports if needed
global.DOMPurify = { sanitize: (s) => String(s) };

describe('auth: sanitizeReturnTo (open-redirect prevention)', () => {
  test('allows normal SPA paths', () => {
    expect(sanitizeReturnTo('/ctf/practice/challenges')).toBe('/ctf/practice/challenges');
    expect(sanitizeReturnTo('/')).toBe('/');
    expect(sanitizeReturnTo('/ctf/challenge/event/ev1/ch1')).toBe('/ctf/challenge/event/ev1/ch1');
  });
  test('blocks protocol tricks', () => {
    expect(sanitizeReturnTo('https://evil.com')).toBe('/');
    expect(sanitizeReturnTo('//evil.com')).toBe('/');
    expect(sanitizeReturnTo('/\\evil')).toBe('/');
    expect(sanitizeReturnTo('/test:colon')).toBe('/');
    expect(sanitizeReturnTo('/test\\backslash')).toBe('/');
  });
  test('blocks empty/non-string and truncates long', () => {
    expect(sanitizeReturnTo('')).toBe('/');
    expect(sanitizeReturnTo(null)).toBe('/');
    expect(sanitizeReturnTo(undefined)).toBe('/');
    expect(sanitizeReturnTo(123)).toBe('/');
    const long = '/' + 'a'.repeat(600);
    expect(sanitizeReturnTo(long).length).toBe(512);
  });
});

describe('auth: checkAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.currentUser = null;
  });
  test('returns true and sets state when authenticated', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ authenticated: true, name: 'Alice', user_id: 'u1' }) });
    expect(await checkAuth()).toBe(true);
    expect(state.currentUser.name).toBe('Alice');
  });
  test('handles 429 rate-limit without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetch.mockResolvedValueOnce({ ok: false, status: 429 });
    expect(await checkAuth()).toBe(false);
    expect(state.currentUser).toBeNull();
    warn.mockRestore();
  });
  test('handles invalid JSON gracefully', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('bad json'); } });
    expect(await checkAuth()).toBe(false);
  });
  test('handles network error', async () => {
    fetch.mockRejectedValueOnce(new Error('network'));
    expect(await checkAuth()).toBe(false);
    expect(state.currentUser).toBeNull();
  });
  test('returns false when not authenticated field missing', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    expect(await checkAuth()).toBe(false);
  });
});

describe('auth: login (open-redirect safe)', () => {
  let origHref;
  beforeEach(() => {
    origHref = window.location.href;
    // jsdom window.location href is configurable via defineProperty
    delete window.location;
    window.location = { hash: '#/ctf/practice/challenges', href: 'http://localhost/' };
  });
  afterEach(() => {
    window.location.href = origHref;
  });

  test('encodes returnTo and uses sanitize', () => {
    window.location.hash = '#/ctf/compete/events';
    login();
    expect(window.location.href).toContain(`${API_BASE_URL}/auth/login?returnTo=`);
    expect(window.location.href).toContain(encodeURIComponent('#/ctf/compete/events'));
  });

  test('blocks malicious hash like //evil or javascript:', () => {
    window.location.hash = '#//evil.com';
    login();
    // should fallback to #/
    expect(window.location.href).toContain(encodeURIComponent('#/'));
    expect(window.location.href).not.toContain('evil.com');
  });

  test('blocks colon trick', () => {
    window.location.hash = '#/test:evil';
    login();
    expect(window.location.href).not.toContain(':evil');
  });
});

describe('auth: logout', () => {
  test('clears practice_solves_data and calls reload', async () => {
    localStorage.setItem('practice_solves_data', JSON.stringify({ solves: ['1'], expiresAt: Date.now() + 10000 }));
    fetch.mockResolvedValueOnce({ ok: true });
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload }, writable: true, configurable: true });
    await logout();
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/logout`, expect.objectContaining({ method: 'POST', credentials: 'include' }));
    expect(localStorage.getItem('practice_solves_data')).toBeNull();
    expect(reload).toHaveBeenCalled();
  });

  test('succeeds even if fetch fails', async () => {
    fetch.mockRejectedValueOnce(new Error('network'));
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload }, writable: true, configurable: true });
    await logout();
    expect(reload).toHaveBeenCalled();
  });
});

describe('auth: updateAuthUI', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="login-btn"></button>
      <div id="user-info" class="hidden"><span id="user-name"></span><span id="user-avatar-initials"></span></div>
    `;
  });
  test('shows user info when authenticated and sets initials', () => {
    state.currentUser = { name: 'Ada Lovelace' };
    updateAuthUI();
    expect(document.getElementById('login-btn').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('user-info').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('user-name').textContent).toBe('Ada Lovelace');
    expect(document.getElementById('user-avatar-initials').textContent).toBe('AL');
  });
  test('handles single name', () => {
    state.currentUser = { name: 'Plato' };
    updateAuthUI();
    expect(document.getElementById('user-avatar-initials').textContent).toBe('PL');
  });
  test('shows login when not authenticated', () => {
    state.currentUser = null;
    updateAuthUI();
    expect(document.getElementById('login-btn').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('user-info').classList.contains('hidden')).toBe(true);
  });
});
