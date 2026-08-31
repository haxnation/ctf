// We only need the CTF API base URL now
import { API_BASE_URL, state } from './config.js';

export function sanitizeReturnTo(p) {
    if (!p || typeof p !== 'string') return '/';
    if (!p.startsWith('/') || p.startsWith('//')) return '/';
    // allow hash-based SPA paths only; strip any protocol tricks
    if (p.includes(':') || p.includes('\\')) return '/';
    return p.slice(0, 512);
}

export async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, { credentials: 'include', headers: { 'Accept': 'application/json' } });
        if (response.ok) {
            let data;
            try { data = await response.json(); } catch { return false; }
            if (data && data.authenticated) {
                state.currentUser = data;
                return true;
            }
        } else if (response.status === 429) {
            console.warn('Auth check rate-limited');
        }
    } catch (error) {
        console.log('Not logged in or network error');
    }
    state.currentUser = null;
    return false;
}

export function updateAuthUI() {
    const loginBtn     = document.getElementById('login-btn');
    const userInfo     = document.getElementById('user-info');
    const userName     = document.getElementById('user-name');
    const userInitials = document.getElementById('user-avatar-initials');

    const show = (el) => el && el.classList.remove('hidden');
    const hide = (el) => el && el.classList.add('hidden');

    if (state.currentUser) {
        hide(loginBtn);
        show(userInfo);

        if (userName) userName.textContent = state.currentUser.name || '';

        if (userInitials && state.currentUser.name) {
            const parts    = state.currentUser.name.trim().split(/\s+/);
            const initials = parts.length >= 2
                ? parts[0][0] + parts[parts.length - 1][0]
                : parts[0].substring(0, 2);
            userInitials.textContent = initials.toUpperCase();
        }
    } else {
        show(loginBtn);
        hide(userInfo);
    }
}

export function login() {
    const raw = window.location.hash || '#/';
    const currentPath = sanitizeReturnTo(raw.startsWith('#') ? raw.slice(1) : raw);
    // encode hash path as returnTo but keep leading /
    const hashPath = currentPath.startsWith('/') ? '#' + currentPath : '#/';
    window.location.href = `${API_BASE_URL}/auth/login?returnTo=${encodeURIComponent(hashPath)}`;
}

export async function logout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', credentials: 'include', headers: { 'x-amz-content-sha256': '' } });
    } catch {}
    try { localStorage.removeItem('practice_solves_data'); } catch {}
    window.location.reload();
}