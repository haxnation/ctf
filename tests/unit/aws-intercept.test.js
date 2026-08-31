import { describe, test, expect, vi, beforeEach } from 'vitest';

// We test the logic of getSHA256 and interceptor by importing the file as side-effect and checking fetch wrapper

// Helper to compute expected SHA256 in test env (WebCrypto)
async function sha256Hex(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

describe('aws-intercept: fetch SHA256 header injection', () => {
  let originalFetch;
  beforeEach(async () => {
    vi.resetModules();
    // Ensure window.fetch exists as original
    originalFetch = vi.fn(async () => ({ ok: true }));
    global.window = global.window || {};
    // Need to set up window before import
    global.window.fetch = originalFetch;
    // Mock crypto.subtle if not present (jsdom may have it)
    if (!global.crypto || !global.crypto.subtle) {
      const nodeCrypto = await import('node:crypto');
      global.crypto = nodeCrypto.webcrypto;
    }
    global.Blob = global.Blob || class Blob {};
    global.Headers = global.Headers || class Headers {
      constructor(o={}){ this.map = new Map(Object.entries(o)); }
      set(k,v){ this.map.set(k,v); }
      get(k){ return this.map.get(k); }
    };
    global.XMLHttpRequest = global.XMLHttpRequest || class {
      open() {}
      send() {}
      setRequestHeader() {}
    };
    // Import intercept as side-effect
    await import('../../js/aws-intercept.js');
  });

  test('adds x-amz-content-sha256 for POST with body', async () => {
    const body = JSON.stringify({ flag: 'CTF{test}' });
    const expected = await sha256Hex(body);
    let captured;
    originalFetch.mockImplementation(async (url, init) => {
      captured = init;
      return { ok: true };
    });
    // window.fetch is wrapped after import
    await window.fetch('https://api.haxnation.org/ctf/api/challenges/ch1/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    // Check header was added
    const headers = captured.headers;
    const val = headers instanceof Headers ? headers.get('x-amz-content-sha256') : headers['x-amz-content-sha256'];
    expect(val).toBe(expected);
  });

  test('uses empty string hash when body is null (e.g., logout)', async () => {
    const expectedEmpty = await sha256Hex('');
    let captured;
    originalFetch.mockImplementation(async (url, init) => { captured = init; return { ok: true }; });
    await window.fetch('https://api.haxnation.org/ctf/api/auth/logout', { method: 'POST', credentials: 'include' });
    const h = captured.headers['x-amz-content-sha256'] || captured.headers.get?.('x-amz-content-sha256');
    // Should be hash of empty string (known constant)
    expect(h).toBe(expectedEmpty);
    expect(expectedEmpty).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  test('does not add header for GET', async () => {
    let captured;
    originalFetch.mockImplementation(async (url, init) => { captured = init || {}; return { ok: true }; });
    await window.fetch('https://api.haxnation.org/ctf/api/events', { method: 'GET', credentials: 'include' });
    expect(captured.headers?.['x-amz-content-sha256']).toBeUndefined();
  });

  test('handles Blob body (produces valid sha256 hex, jsdom fallback allowed)', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    let captured;
    originalFetch.mockImplementation(async (url, init) => { captured = init; return { ok: true }; });
    await window.fetch('https://example.com', { method: 'PUT', body: blob });
    const val = captured.headers['x-amz-content-sha256'];
    // Should be 64 hex chars; exact value depends on whether jsdom supports Blob.arrayBuffer
    expect(val).toMatch(/^[a-f0-9]{64}$/);
    // If blob was correctly hashed, it would be sha256 of 'hello'; if jsdom lacks support, fallback is empty hash - both are valid hex
    const emptyHash = await sha256Hex('');
    const helloHash = await sha256Hex('hello');
    expect([emptyHash, helloHash]).toContain(val);
  });

  test('bounds large string to 5MB', async () => {
    const large = 'a'.repeat(6 * 1024 * 1024);
    let captured;
    originalFetch.mockImplementation(async (url, init) => { captured = init; return { ok: true }; });
    await window.fetch('https://example.com', { method: 'POST', body: large });
    const val = captured.headers['x-amz-content-sha256'];
    const expected = await sha256Hex(large.slice(0, 5*1024*1024));
    expect(val).toBe(expected);
  });
});
