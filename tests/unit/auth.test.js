import { describe, test, expect, vi, beforeEach } from 'vitest';
import { checkAuth } from '../../js/auth.js';
import { state, API_BASE_URL } from '../../js/config.js';

// Mock the global fetch function
global.fetch = vi.fn();

describe('Auth Module', () => {
    beforeEach(() => {
        // Reset the mock and state before each test
        vi.clearAllMocks();
        state.currentUser = null;
    });

    test('checkAuth() returns true and sets state when authenticated', async () => {
        // Mock a successful API response
        fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ authenticated: true, name: 'CyberKnight' })
        });

        const result = await checkAuth();

        expect(result).toBe(true);
        expect(state.currentUser).toEqual({ authenticated: true, name: 'CyberKnight' });
        expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/auth/me`, { credentials: 'include' });
    });

    test('checkAuth() returns false when unauthenticated', async () => {
        // Mock a failed/unauthorized API response
        fetch.mockResolvedValueOnce({ ok: false });

        const result = await checkAuth();

        expect(result).toBe(false);
        expect(state.currentUser).toBeNull();
    });
});