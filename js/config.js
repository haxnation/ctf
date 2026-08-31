// Points to the newly created CTF backend
export const API_BASE_URL = 'https://api.haxnation.org/ctf/api';

// Points to the existing Events backend for triggering the OAuth flow
export const AUTH_API_URL = 'https://api.haxnation.org/events/api'; 

export const state = {
    currentUser: null,
};

export function isSafeUrl(url) {
    if (typeof url !== 'string' || url.trim() === '') return false;
    try {
        const u = new URL(url, window.location.origin);
        if (!(u.protocol === 'http:' || u.protocol === 'https:')) return false;
        if (!u.hostname) return false;
        return true;
    } catch { return false; }
}

export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}