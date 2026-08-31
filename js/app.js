import { API_BASE_URL, state, isSafeUrl } from './config.js';
import { checkAuth, login, logout, updateAuthUI } from './auth.js';
import { createRouter } from './router.js';

window.allChallenges = [];
window.currentChallengeData = null;
window.currentTab = 'practice'; 
window.currentMode = 'practice-challenges'; 
window.activeEventId = null;
window.miniSearch = null;
window.currentChallengesList = null; 
let dataLoaded = false;

const CTF_STATIC_API = 'https://a-y-u-s-h-y-a.github.io/project-haxnation/api'; 

export function safeHref(url, fallback = '#') {
    if (!url || typeof url !== 'string') return fallback;
    return isSafeUrl(url) ? url : fallback;
}
export function isHexAddress(s) {
    return typeof s === 'string' && /^0x[a-fA-F0-9]{40}$/.test(s);
}
export async function fetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    return { res, data };
}
export function showRateLimitError(statusEl, res) {
    const retry = res.headers.get('Retry-After') || '60';
    if (statusEl) {
        statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
        statusEl.innerText = `> ERR: RATE LIMITED. RETRY AFTER ${retry}S`;
    }
    window.showToast('error', `Too many requests. Retry after ${retry}s`);
}

const appHandlers = {
    switchTab,
    switchPracticeView,
    switchCompeteView,
    openChallenge,
    setActiveEventId: (id) => { window.activeEventId = id; },
    closeChallengeUI: () => document.getElementById('detail-view').classList.add('hidden'),
    ensureDataLoaded: async () => {
        if (!dataLoaded) await fetchStaticData();
    },
    show404: () => {
        document.getElementById('section-landing')?.classList.add('hidden');
        document.getElementById('section-practice')?.classList.add('hidden');
        document.getElementById('section-compete')?.classList.add('hidden');
        document.getElementById('section-404')?.classList.remove('hidden');
    }
};

window.router = createRouter(appHandlers);

// ==========================================
// UX UI HANDLERS
// ==========================================
window.showToast = function(type, message) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-success text-ink' : 'bg-danger text-white';
    toast.className = `font-mono text-sm font-bold uppercase tracking-widest ${bgClass} px-4 py-3 border-2 border-ink shadow-[4px_4px_0_0_#0b0b0b] transition-all duration-300 opacity-0 translate-y-4`;
    toast.innerHTML = type === 'success' ? `> ✓ ${DOMPurify.sanitize(message)}` : `> ! ${DOMPurify.sanitize(message)}`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('opacity-0', 'translate-y-4'));
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.showModal = function(type, title, message, btnText, onConfirm) {
    const container = document.getElementById('modal-container');
    const content = document.getElementById('modal-content');
    if(!container || !content) return;
    const bgClass = type === 'success' ? 'bg-success text-ink' : 'bg-danger text-white';
    content.innerHTML = `
        <h3 class="text-3xl font-black uppercase mb-4">${DOMPurify.sanitize(title)}</h3>
        <p class="font-mono text-sm mb-8">${DOMPurify.sanitize(message)}</p>
        <button id="modal-action-btn" class="font-mono uppercase tracking-widest font-bold ${bgClass} border-2 border-ink px-8 py-3 shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-75 w-full">
            ${DOMPurify.sanitize(btnText)}
        </button>
    `;
    container.classList.remove('hidden'); container.classList.add('flex');
    requestAnimationFrame(() => content.classList.remove('scale-95', 'opacity-0'));
    document.getElementById('modal-action-btn').addEventListener('click', () => {
        content.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            container.classList.add('hidden'); container.classList.remove('flex');
            if(onConfirm) onConfirm();
        }, 200);
    });
};

// ==========================================
// SKELETON LOADER
// ==========================================

function injectSkeletonCards(count = 9) {
    const loadingEl = document.getElementById('loading-practice');
    if (!loadingEl) return;
    loadingEl.innerHTML = Array.from({ length: count }).map(() => `
        <div class="border-2 border-ink bg-white p-5 shadow-[4px_4px_0_0_#0b0b0b] flex flex-col gap-3 pointer-events-none">
            <div class="flex justify-between items-start pb-2 border-b-2 border-ink gap-3">
                <div class="animate-pulse bg-gray-200 h-6 rounded-none flex-1 border border-gray-300"></div>
                <div class="animate-pulse bg-gray-200 h-6 w-16 rounded-none border border-gray-300 flex-shrink-0"></div>
            </div>
            <div class="flex gap-2 mt-1">
                <div class="animate-pulse bg-gray-200 h-5 w-20 rounded-none border border-gray-300"></div>
                <div class="animate-pulse bg-gray-200 h-5 w-16 rounded-none border border-gray-300"></div>
            </div>
            <div class="mt-auto pt-3 border-t-2 border-ink">
                <div class="animate-pulse bg-gray-200 h-4 w-32 rounded-none border border-gray-300"></div>
            </div>
        </div>
    `).join('');
    loadingEl.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', async () => {
    window.login = login;
    window.toggleHint = toggleHint;
    window.showEventsList = showEventsList;
    window.openEvent = openEvent;
    window.showLeaderboard = showLeaderboard;
    window.hideLeaderboard = hideLeaderboard;
    window.selectSuggestion = selectSuggestion;

    // Inject skeleton cards immediately so the UI feels instant
    injectSkeletonCards(9);

    setupListeners();
    await checkAuth();
    updateAuthUI();

    await fetchStaticData();
    window.router.handleRoute(); 
});

async function fetchStaticData() {
    if (dataLoaded) return;
    try {
        const response = await fetch(`${CTF_STATIC_API}/challenges-lite.json`);
        if (!response.ok) throw new Error("Could not load static challenges.");
        
        window.allChallenges = await response.json();
        
        const categories = new Set();
        window.allChallenges.forEach(c => {
            if (Array.isArray(c.category)) {
                c.category.forEach(cat => categories.add(cat));
            } else if (c.category) {
                categories.add(c.category);
            }
        });
        
        const catSelect = document.getElementById('filterCategory');
        if (catSelect) {
            Array.from(categories).sort().forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.toLowerCase();
                opt.textContent = cat.toUpperCase();
                catSelect.appendChild(opt);
            });
        }

        window.miniSearch = new MiniSearch({
            fields: ['name', 'category', 'difficulty', 'authors'],
            storeFields: ['id', 'name', 'category', 'difficulty', 'authors'],
            searchOptions: { fuzzy: 0.2, prefix: true }
        });
        window.miniSearch.addAll(window.allChallenges);
        dataLoaded = true;
    } catch (error) {
        console.error("Database boot failure.", error);
    }
}

// ==========================================
// PRACTICE CACHE & SYNC SYSTEM
// ==========================================
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function syncPracticeSolvesFromServer() {
    if (!state.currentUser) return [];
    try {
        const res = await fetch(`${API_BASE_URL}/practice/solves`, { credentials: 'include' });
        const data = await res.json();
        const solves = data.solvedChallenges || [];
        
        localStorage.setItem('practice_solves_data', JSON.stringify({
            solves: solves,
            expiresAt: Date.now() + CACHE_TTL
        }));
        return solves;
    } catch (err) {
        window.showToast('error', 'CACHE SYNC FAILED. NETWORK ISSUE. SOLVES MAY BE OUTDATED.');
        const oldCacheRaw = localStorage.getItem('practice_solves_data');
        return oldCacheRaw ? JSON.parse(oldCacheRaw).solves : [];
    }
}

async function getPracticeSolves() {
    if (!state.currentUser) return [];
    const cachedDataRaw = localStorage.getItem('practice_solves_data');
    
    if (cachedDataRaw) {
        const cachedData = JSON.parse(cachedDataRaw);
        if (Date.now() < cachedData.expiresAt) {
            return cachedData.solves; 
        }
    }
    return await syncPracticeSolvesFromServer();
}


// ==========================================
// SEARCH & FILTER SYSTEM
// ==========================================

async function applyFilters() {
    const query = document.getElementById('searchBar')?.value.toLowerCase() || '';
    const diff = document.getElementById('filterDifficulty')?.value || 'all';
    const cat = document.getElementById('filterCategory')?.value || 'all';

    let results = window.allChallenges;

    if (query.length > 0) {
        results = results.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(query);
            const diffMatch = (c.difficulty || '').toLowerCase().includes(query);
            const catMatch = Array.isArray(c.category) 
                ? c.category.some(catItem => catItem.toLowerCase().includes(query))
                : (c.category || '').toLowerCase().includes(query);
            const authorMatch = c.authors && c.authors.some(a => a.toLowerCase().includes(query));
            
            return nameMatch || diffMatch || catMatch || authorMatch;
        });
    }

    if (diff !== 'all') {
        results = results.filter(c => (c.difficulty || '').toLowerCase() === diff);
    }

    if (cat !== 'all') {
        results = results.filter(c => {
            if (Array.isArray(c.category)) {
                return c.category.some(catItem => catItem.toLowerCase() === cat);
            }
            return (c.category || '').toLowerCase() === cat;
        });
    }

    await renderPracticeGrid(results);
}

let searchTimeout;
function handleSearchInput(e) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
    const query = e.target.value;
    applyFilters(); 

    const suggestionsBox = document.getElementById('searchSuggestions');
    if (query.length > 1 && window.miniSearch) {
        const searchResults = window.miniSearch.search(query, { fuzzy: 0.2, prefix: true }).slice(0, 5);
        
        if (searchResults.length > 0) {
            suggestionsBox.innerHTML = searchResults.map(res => {
                const chal = window.allChallenges.find(c => c.id === res.id);
                if(!chal) return '';
                const safeName = DOMPurify.sanitize(chal.name);
                const safeIdAttr = DOMPurify.sanitize(String(chal.id));
                return `<button data-suggest-id="${safeIdAttr}" class="suggest-btn w-full text-left font-mono text-xs font-bold uppercase tracking-widest p-3 border-b-2 border-transparent hover:border-ink hover:bg-ink hover:text-white transition-colors duration-0 truncate">> ${safeName}</button>`;
            }).join('');
            suggestionsBox.classList.remove('hidden');
        } else {
            suggestionsBox.innerHTML = `
                <div class="p-4 bg-canvas text-center border-b-2 border-ink">
                    <p class="font-mono text-xs font-bold uppercase text-danger mb-2">> 0 MATCHES FOUND</p>
                    <p class="font-sans text-sm text-ink mb-2">Try related terms to find targets:</p>
                    <div class="flex gap-2 justify-center">
                        <button data-quick-search="Web" class="quick-search-btn font-mono text-[10px] uppercase font-bold bg-white text-ink border-2 border-ink px-2 py-1 shadow-[2px_2px_0_0_#0b0b0b] hover:bg-cyan">Web</button>
                        <button data-quick-search="Crypto" class="quick-search-btn font-mono text-[10px] uppercase font-bold bg-white text-ink border-2 border-ink px-2 py-1 shadow-[2px_2px_0_0_#0b0b0b] hover:bg-cyan">Crypto</button>
                        <button data-quick-search="Pwn" class="quick-search-btn font-mono text-[10px] uppercase font-bold bg-white text-ink border-2 border-ink px-2 py-1 shadow-[2px_2px_0_0_#0b0b0b] hover:bg-cyan">Pwn</button>
                    </div>
                </div>
            `;
            suggestionsBox.classList.remove('hidden');
        }
    } else {
        suggestionsBox.classList.add('hidden');
    }
    }, 300);
}

function selectSuggestion(id) {
    const chal = window.allChallenges.find(c => c.id === id);
    if (chal) {
        const searchBar = document.getElementById('searchBar');
        searchBar.value = chal.name;
        document.getElementById('searchSuggestions').classList.add('hidden');
        applyFilters();
    }
}

function setupListeners() {
    document.getElementById('login-btn')?.addEventListener('click', login);
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    
    document.getElementById('searchBar')?.addEventListener('input', handleSearchInput);
    document.getElementById('filterDifficulty')?.addEventListener('change', applyFilters);
    document.getElementById('filterCategory')?.addEventListener('change', applyFilters);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#searchBar') && !e.target.closest('#searchSuggestions')) {
            document.getElementById('searchSuggestions')?.classList.add('hidden');
        }
        // delegated: suggestion pick
        const suggestBtn = e.target.closest('[data-suggest-id]');
        if (suggestBtn) { e.preventDefault(); selectSuggestion(suggestBtn.getAttribute('data-suggest-id')); }
        const quickBtn = e.target.closest('[data-quick-search]');
        if (quickBtn) { const q = quickBtn.getAttribute('data-quick-search'); const sb = document.getElementById('searchBar'); if (sb) { sb.value = q; applyFilters(); } }
        const loginBtn = e.target.closest('[data-action="login"]');
        if (loginBtn) { e.preventDefault(); login(); }
        const retryEvents = e.target.closest('[data-retry="events"]');
        if (retryEvents) { e.preventDefault(); loadLiveEvents(); }
        const retryInd = e.target.closest('[data-retry="independent"]');
        if (retryInd) { e.preventDefault(); loadIndependentChallenges(); }
        const retryEvent = e.target.closest('[data-retry-event]');
        if (retryEvent) { e.preventDefault(); openEvent(retryEvent.getAttribute('data-retry-event'), retryEvent.getAttribute('data-event-name')||''); }
        const eventCard = e.target.closest('.event-card[data-event-id]');
        if (eventCard && !e.target.closest('a')) { e.preventDefault(); openEvent(eventCard.getAttribute('data-event-id'), eventCard.getAttribute('data-event-name')); }
        const hintBtn = e.target.closest('[data-hint-idx]');
        if (hintBtn) { e.preventDefault(); toggleHint(hintBtn.getAttribute('data-hint-idx')); }
        const retryBtn2 = e.target.closest('.retry-btn');
        if (retryBtn2 && !retryBtn2.hasAttribute('data-retry')) {
            // fallback for any retry that maps to events
            if (retryBtn2.textContent.includes('Connection')) loadLiveEvents();
        }
        const switchPrac = e.target.closest('[data-action="switch-practice-challenges"]');
        if (switchPrac) { e.preventDefault(); if (window.router) window.router.navigate('/ctf/practice/challenges'); else { switchTab('practice'); switchPracticeView('challenges'); } }
        const showEvents = e.target.closest('[data-action="show-events-list"]');
        if (showEvents) { e.preventDefault(); showEventsList(); }
        const showLb = e.target.closest('[data-action="show-leaderboard"]');
        if (showLb) { e.preventDefault(); showLeaderboard(); }
        const hideLb = e.target.closest('[data-action="hide-leaderboard"]');
        if (hideLb) { e.preventDefault(); hideLeaderboard(); }
        const histBack = e.target.closest('[data-action="history-back"]');
        if (histBack) { e.preventDefault(); window.history.back(); }
    });

    const flagInput = document.getElementById('flagInput');
    const submitBtn = document.getElementById('submitFlagBtn');
    const charCount = document.getElementById('flagCharCount');
    
    if (flagInput && submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        
        flagInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length > 2048) e.target.value = val.slice(0,2048);
            const curLen = e.target.value.length;
            if (charCount) {
                if (curLen >= 50) {
                    charCount.classList.remove('hidden');
                    charCount.innerText = `${curLen}/2048`;
                } else {
                    charCount.classList.add('hidden');
                }
            }
            if (val.trim().length > 0) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                submitBtn.disabled = true;
                submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        });
        
        flagInput.addEventListener('blur', (e) => {
            const val = e.target.value.trim();
            if (val.length === 0 && e.target.classList.contains('interacted')) {
                e.target.classList.add('border-danger');
                e.target.classList.remove('border-ink');
            } else {
                e.target.classList.remove('border-danger');
                e.target.classList.add('border-ink');
            }
        });
        
        flagInput.addEventListener('focus', (e) => {
            e.target.classList.add('interacted');
        });
    }

    // ==========================================
    // STANDARD CTF FLAG SUBMISSION (with rate-limit & maxAttempts awareness)
    // ==========================================
    document.getElementById('submitFlagBtn')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        const origTxt = btn.innerText;
        btn.innerText = 'EXECUTING...';
        btn.disabled = true;
        if (!window.currentChallengeData) { btn.innerText = origTxt; btn.disabled = false; return; }
        
        let userInput = document.getElementById('flagInput').value.trim();
        const statusEl = document.getElementById('flagStatus');
        if (!userInput) { btn.innerText = origTxt; btn.disabled = false; return; }
        if (userInput.length > 2048) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: FLAG TOO LONG (MAX 2048)";
            btn.innerText = origTxt; btn.disabled = false; return;
        }

        if (window.currentMode === 'practice-challenges') {
             if (window.currentChallengeData.flags && window.currentChallengeData.flags.includes(userInput)) {
                
                statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-cyan inline-block px-2 border-2 border-ink animate-pulse';
                statusEl.innerText = "> VERIFYING_RECORD...";

                if (state.currentUser) {
                    try {
                        const { res, data } = await fetchJson(`${API_BASE_URL}/practice/${window.currentChallengeData.id}/record-solve`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({})
                        });
                        if (res.status === 429) { showRateLimitError(statusEl, res); btn.innerText = origTxt; btn.disabled = false; return; }
                        if (data && (data.success || data.alreadySolved)) {
                            if (data.alreadySolved) {
                                await syncPracticeSolvesFromServer();
                            } else {
                                const cachedDataRaw = localStorage.getItem('practice_solves_data');
                                if (cachedDataRaw) {
                                    try {
                                        const cachedData = JSON.parse(cachedDataRaw);
                                        if (!cachedData.solves.includes(window.currentChallengeData.id)) {
                                            cachedData.solves.push(window.currentChallengeData.id);
                                            localStorage.setItem('practice_solves_data', JSON.stringify(cachedData));
                                        }
                                    } catch {}
                                }
                            }
                            statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-success inline-block px-2 border-2 border-ink';
                            statusEl.innerText = "> ✓ VERIFIED & RECORDED";
                            applyFilters(); 
                        } else {
                            const msg = data && (data.message || data.error) ? DOMPurify.sanitize(String(data.message || data.error)) : 'SYSTEM FAULT';
                            statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                            statusEl.innerText = `> ERR: ${msg.toUpperCase()}`;
                        }
                    } catch (err) {
                        statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                        statusEl.innerText = "> ERR: NETWORK FAULT. CHECK CONNECTION. RETRY LATER.";
                    }
                } else {
                    statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-success inline-block px-2 border-2 border-ink';
                    statusEl.innerText = "> ✓ VERIFIED (LOGIN REQ TO RECORD)";
                }
            } else {
                statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                statusEl.innerText = "> ERR: CLIENT FAULT. HASH MISMATCH.";
            }
            btn.innerText = origTxt;
            btn.disabled = false;
        } else {
            try {
                statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-canvas border-2 border-ink inline-block px-2 animate-pulse';
                statusEl.innerText = "> VERIFYING_SIGNATURE...";

                const endpointUrl = window.currentMode === 'compete-event' 
                    ? `${API_BASE_URL}/events/${encodeURIComponent(window.activeEventId)}/challenges/${encodeURIComponent(window.currentChallengeData.id)}/submit`
                    : `${API_BASE_URL}/challenges/${encodeURIComponent(window.currentChallengeData.id)}/submit`;

                const { res, data } = await fetchJson(endpointUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ flag: userInput })
                });

                if (res.status === 429) { showRateLimitError(statusEl, res); btn.innerText = origTxt; btn.disabled = false; return; }
                if (res.status === 403 && data && data.error && String(data.error).toLowerCase().includes('maximum attempts')) {
                    statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                    statusEl.innerText = `> ERR: MAX ATTEMPTS EXCEEDED${data.maxAttempts ? ' ('+data.maxAttempts+')' : ''}`;
                    btn.innerText = origTxt; btn.disabled = false; return;
                }
                if (data && data.success) {
                    statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-ink bg-success inline-block px-2 border-2 border-ink';
                    statusEl.innerText = `> ✓ SUCCESS: +${DOMPurify.sanitize(String(data.points))} PTS`;
                } else {
                    const msg = data && (data.message || data.error) ? String(data.message || data.error) : 'VERIFICATION FAILED';
                    const sanitized = DOMPurify.sanitize(msg);
                    statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                    statusEl.innerText = `> ERR: ${sanitized.toUpperCase().slice(0,120)}`;
                }
                btn.innerText = origTxt;
                btn.disabled = false;
            } catch (err) {
                statusEl.className = 'mt-4 font-mono text-sm font-bold h-6 uppercase tracking-widest text-white bg-danger inline-block px-2 border-2 border-ink';
                statusEl.innerText = "> ERR: NETWORK FAULT. CHECK CONNECTION. RETRY LATER.";
                btn.innerText = origTxt;
                btn.disabled = false;
            }
        }
    });

    // ==========================================
    // WEB3: METAMASK CONNECTION & VALIDATION
    // ==========================================
    let userWallet = null;

    document.getElementById('connectWalletBtn')?.addEventListener('click', async () => {
        const statusEl = document.getElementById('flagStatus');
        
        if (!window.ethereum) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: METAMASK NOT DETECTED";
            return;
        }

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            
            // Force Sepolia network
            const network = await provider.getNetwork();
            if (network.chainId !== 11155111n) {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
                });
            }

            const accounts = await provider.send("eth_requestAccounts", []);
            userWallet = accounts[0];
            
            document.getElementById('connectWalletBtn').classList.add('hidden');
            document.getElementById('validateWeb3Btn').classList.remove('hidden');
            
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-ink bg-success inline-block px-2 border-2 border-ink';
            statusEl.innerText = `> ✓ CONNECTED: ${userWallet.substring(0,6)}...${userWallet.substring(38)}`;
        } catch (err) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: METAMASK REJECTED. WALLET OR NETWORK FAULT. RETRY CONNECTION.";
        }
    });

    document.getElementById('validateWeb3Btn')?.addEventListener('click', async () => {
        const statusEl = document.getElementById('flagStatus');
        
        if (!state.currentUser) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: PLEASE LOGIN TO PLATFORM FIRST";
            return;
        }

        if (!userWallet) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: CONNECT WALLET FIRST";
            return;
        }
        if (!isHexAddress(userWallet)) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: INVALID WALLET ADDRESS";
            return;
        }

        try {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-ink bg-canvas border-2 border-ink inline-block px-2 animate-pulse';
            statusEl.innerText = "> SIGNING_PAYLOAD...";

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            // Must match backend: HaxNation_Auth_<userID> (case sensitive)
            const uid = state.currentUser.user_id || state.currentUser.userId || state.currentUser.sub || '';
            const message = `HaxNation_Auth_${uid}`;
            const signature = await signer.signMessage(message);

            statusEl.innerText = "> QUERYING_BLOCKCHAIN...";

            const endpointUrl = window.currentMode === 'compete-event' 
                ? `${API_BASE_URL}/events/${encodeURIComponent(window.activeEventId)}/challenges/${encodeURIComponent(window.currentChallengeData.id)}/submit-web3`
                : `${API_BASE_URL}/challenges/${encodeURIComponent(window.currentChallengeData.id)}/submit-web3`;

            const { res, data } = await fetchJson(endpointUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ 
                    walletAddress: userWallet,
                    signature: signature 
                })
            });

            if (res.status === 429) { showRateLimitError(statusEl, res); return; }
            if (data && data.success) {
                statusEl.className = 'mt-4 font-mono text-sm font-bold text-ink bg-success inline-block px-2 border-2 border-ink';
                statusEl.innerText = `> ✓ SUCCESS: +${DOMPurify.sanitize(String(data.points))} PTS`;
            } else {
                const msg = data && (data.message || data.error) ? String(data.message || data.error) : 'VERIFICATION FAILED';
                statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
                statusEl.innerText = `> ERR: ${DOMPurify.sanitize(msg).toUpperCase().slice(0,140)}`;
            }
        } catch (err) {
            statusEl.className = 'mt-4 font-mono text-sm font-bold text-white bg-danger inline-block px-2 border-2 border-ink';
            statusEl.innerText = "> ERR: WALLET/NETWORK FAULT. RETRY.";
        }
    });

    // ==========================================
    // ADMIN: AWARDS & EXPORT/IMPORT helpers (accommodates new backend)
    // ==========================================
    async function loadAwards() {
        if (!window.activeEventId) return;
        const list = document.getElementById('admin-awards-list');
        if (!list) return;
        try {
            const { data } = await fetchJson(`${API_BASE_URL}/events/${encodeURIComponent(window.activeEventId)}/awards`, { credentials: 'include' });
            if (data && data.success && Array.isArray(data.awards)) {
                if (data.awards.length === 0) { list.innerHTML = '<p class="text-gray-500">> NO AWARDS</p>'; return; }
                list.innerHTML = data.awards.map(a => {
                    const saId = DOMPurify.sanitize(String(a.id || a.ID || ''));
                    const saUser = DOMPurify.sanitize(String(a.userId || a.UserID || ''));
                    const saPts = DOMPurify.sanitize(String(a.points || 0));
                    const saReason = DOMPurify.sanitize(String(a.reason || a.Reason || ''));
                    return `<div class="flex justify-between items-center border-2 border-ink bg-canvas px-3 py-2"><span>${saUser} +${saPts} ${saReason}</span><button data-award-del="${saId}" class="award-del bg-danger text-white px-2 py-1 border border-ink">DEL</button></div>`;
                }).join('');
            }
        } catch {}
    }
    async function tryShowAdminPanel() {
        const panel = document.getElementById('admin-panel');
        if (!panel || !state.currentUser || !window.activeEventId) return;
        // Probe: if awards list succeeds without 403, user likely admin; or if /me role=admin
        const isAdminHint = state.currentUser.role === 'admin' || String(state.currentUser.email || '').toLowerCase().includes('admin');
        // try fetch awards; if 403 hidden, keep panel hidden unless role hint
        try {
            const res = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(window.activeEventId)}/awards`, { credentials: 'include' });
            if (res.ok || isAdminHint) {
                panel.classList.remove('hidden');
                await loadAwards();
            }
        } catch { if (isAdminHint) panel.classList.remove('hidden'); }
    }
    document.getElementById('award-create-btn')?.addEventListener('click', async () => {
        const status = document.getElementById('admin-status');
        const uid = document.getElementById('award-userId').value.trim().slice(0,256);
        const pts = parseInt(document.getElementById('award-points').value, 10);
        const reason = document.getElementById('award-reason').value.trim().slice(0,256);
        if (!uid || !pts) { if(status) status.innerText = '> ERR: USERID & POINTS REQUIRED'; return; }
        if (isNaN(pts) || pts === 0) { if(status) status.innerText = '> ERR: NON-ZERO POINTS REQUIRED'; return; }
        try {
            const { res, data } = await fetchJson(`${API_BASE_URL}/events/${encodeURIComponent(window.activeEventId)}/awards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ userId: uid, points: pts, reason }) });
            if (res.status === 403) { if(status) status.innerText = '> ERR: ADMIN ONLY'; return; }
            if (data && data.success) { if(status) status.innerText = '> AWARD GRANTED'; await loadAwards(); }
            else { if(status) status.innerText = `> ERR: ${DOMPurify.sanitize(String(data.error||'FAILED')).slice(0,80)}`; }
        } catch { if(status) status.innerText = '> ERR: NETWORK'; }
    });
    document.getElementById('admin-awards-list')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-award-del]');
        if (!btn) return;
        const awardId = btn.getAttribute('data-award-del');
        try {
            const { res } = await fetchJson(`${API_BASE_URL}/events/${encodeURIComponent(window.activeEventId)}/awards/${encodeURIComponent(awardId)}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) await loadAwards();
        } catch {}
    });
    document.getElementById('admin-export-btn')?.addEventListener('click', async () => {
        const status = document.getElementById('admin-status');
        try {
            const res = await fetch(`${API_BASE_URL}/admin/export`, { credentials: 'include' });
            if (res.status === 403) { if(status) status.innerText = '> ERR: ADMIN ONLY'; return; }
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `ctf-export-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
            if(status) status.innerText = '> EXPORTED';
        } catch { if(status) status.innerText = '> ERR: EXPORT FAILED'; }
    });
    document.getElementById('admin-import-file')?.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const status = document.getElementById('admin-status');
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            if (json.events && !Array.isArray(json.events)) throw new Error('invalid');
            const { res, data } = await fetchJson(`${API_BASE_URL}/admin/import`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(json) });
            if (res.status === 403) { if(status) status.innerText = '> ERR: ADMIN ONLY'; return; }
            if (data && data.success) if(status) status.innerText = `> IMPORTED ${DOMPurify.sanitize(String(data.imported?.events||0))} EVENTS`;
            else if(status) status.innerText = `> ERR: ${DOMPurify.sanitize(String(data.error||'IMPORT FAILED')).slice(0,80)}`;
        } catch { if(status) status.innerText = '> ERR: INVALID JSON'; }
        e.target.value='';
    });
    // expose for openEvent caller
    window.tryShowAdminPanel = tryShowAdminPanel;
    window.loadAwards = loadAwards;
}

// ==========================================
// VIEW SWITCHING
// ==========================================

function updateNavStyles(activeTabId, activeSubnavId) {
    document.getElementById('tab-practice').className = 'text-gray-400 hover:text-ink hover:border-ink border-b-4 border-transparent pb-1 transition-colors duration-0';
    document.getElementById('tab-compete').className = 'text-gray-400 hover:text-ink hover:border-ink border-b-4 border-transparent pb-1 transition-colors duration-0';
    
    if (activeTabId) {
        const tabEl = document.getElementById(activeTabId);
        if (tabEl) tabEl.className = 'text-ink border-b-4 border-ink pb-1 font-bold';
    }

    const subnavs = ['subnav-practice-events', 'subnav-practice-challenges', 'subnav-compete-events', 'subnav-compete-challenges'];
    subnavs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = 'text-gray-400 hover:text-ink hover:border-ink border-b-4 border-transparent pb-3 transition-colors duration-0';
    });
    
    if (activeSubnavId) {
        const activeSub = document.getElementById(activeSubnavId);
        if (activeSub) activeSub.className = 'text-ink border-b-4 border-ink pb-3 font-bold transition-colors duration-0';
    }
}

function switchTab(tab) {
    window.currentTab = tab;
    document.getElementById('section-practice')?.classList.add('hidden');
    document.getElementById('section-compete')?.classList.add('hidden');
    document.getElementById('section-landing')?.classList.add('hidden');

    if (tab === 'landing') {
        updateNavStyles(null, null);
        document.getElementById('section-landing')?.classList.remove('hidden');
    } else {
        document.getElementById(`section-${tab}`)?.classList.remove('hidden');
    }
}

function switchPracticeView(view) {
    updateNavStyles('tab-practice', `subnav-practice-${view}`);
    
    document.getElementById('practice-view-events').classList.add('hidden');
    document.getElementById('practice-view-challenges').classList.add('hidden');
    document.getElementById(`practice-view-${view}`).classList.remove('hidden');

    if (view === 'challenges') {
        applyFilters(); 
    }
}

function switchCompeteView(view) {
    updateNavStyles('tab-compete', `subnav-compete-${view}`);
    
    document.getElementById('compete-view-events').classList.add('hidden');
    document.getElementById('compete-view-challenges').classList.add('hidden');
    document.getElementById(`compete-view-${view}`).classList.remove('hidden');

    if (view === 'events') {
        window.showEventsList(); 
    } else {
        loadIndependentChallenges();
    }
}

// ==========================================
// DATA LOADING & EVENT LOGIC
// ==========================================

async function loadLiveEvents() {
    const eventsList = document.getElementById('compete-events-list');
    
    if (!state.currentUser) {
        eventsList.innerHTML = `
            <div class="bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-16 text-center">
                <p class="font-mono text-xl font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink mb-6 shadow-[4px_4px_0_0_#0b0b0b]">CLEARANCE REQUIRED</p><br/>
                <button data-action="login" class="login-btn font-mono uppercase tracking-widest font-bold bg-ink text-white border-2 border-ink px-8 py-3 shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] transition-all duration-75">Execute Auth</button>
            </div>`;
        return;
    }

    try {
        eventsList.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink animate-pulse">> FETCHING LIVE OPERATIONS...</p></div>`;
        const res = await fetch(`${API_BASE_URL}/events`, { credentials: 'include' });
        const data = await res.json();

        if (data.success && data.events.length > 0) {
            eventsList.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">` + data.events.map(ev => {
                
                // Set structural styles based on true playability
                const badgeColor = ev.isPlayable ? 'bg-cyan text-ink' : 'bg-canvas text-ink';
                const safeEvId = DOMPurify.sanitize(String(ev.id));
                const safeEvName = DOMPurify.sanitize(ev.name || '');
                const safeEvDesc = DOMPurify.sanitize(ev.description || 'Active operational environment.');
                const safeBadgeText = DOMPurify.sanitize(ev.isPlayable ? '● LIVE' : (ev.reason || 'OFFLINE'));
                const safeRegLink = safeHref(ev.registrationLink || '', '');

                // If the user isn't allowed to play, strip the hover effects and interactive behaviors
                const cardStyle = ev.isPlayable 
                    ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#0b0b0b] hover:bg-ink hover:text-white cursor-pointer group' 
                    : 'opacity-70 grayscale';
                
                const dataAttrs = ev.isPlayable ? `data-event-id="${safeEvId}" data-event-name="${safeEvName}"` : '';

                // Generate the aggressive neo-brutalist registration action if they are missing required access
                const regButton = (!ev.isRegistered && safeRegLink) 
                    ? `<a href="${safeRegLink}" target="_blank" rel="noopener noreferrer" class="mt-4 font-mono text-[10px] uppercase tracking-widest font-bold bg-danger text-white border-2 border-ink px-4 py-2 shadow-[2px_2px_0_0_#0b0b0b] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_#0b0b0b] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none inline-block text-center transition-all duration-75">Initiate Registration</a>`
                    : '';

                return `
                <div class="bg-white border-2 border-ink p-6 rounded-none shadow-[6px_6px_0_0_#0b0b0b] transition-all duration-75 flex flex-col ${cardStyle} event-card" ${dataAttrs}>
                    <div class="flex justify-between items-start mb-4 border-b-2 border-ink ${ev.isPlayable ? 'group-hover:border-white' : ''} pb-2 gap-2">
                        <h3 class="font-black text-2xl uppercase tracking-tighter">${safeEvName}</h3>
                        <span class="border-2 border-ink px-2 py-1 font-mono text-[10px] whitespace-nowrap font-bold uppercase shadow-[2px_2px_0_0_#0b0b0b] ${ev.isPlayable ? 'group-hover:shadow-[2px_2px_0_0_#0b0b0b] group-hover:border-white' : ''} ${badgeColor}">${safeBadgeText}</span>
                    </div>
                    <p class="font-sans text-sm flex-1">${safeEvDesc}</p>
                    ${regButton}
                </div>`;
            }).join('') + `</div>`;
        } else {
            eventsList.innerHTML = `<div class="bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-16 text-center"><p class="font-mono text-lg font-bold uppercase tracking-widest text-ink">> NO ACTIVE OPERATIONS</p></div>`;
        }
    } catch (err) {
        eventsList.innerHTML = `<div class="bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-16 text-center">
            <p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink mb-4">> ERROR: COULD NOT LOAD OPERATIONS</p>
            <p class="font-mono text-sm text-ink mb-4">The connection to the command server was interrupted.</p>
            <button data-retry="events" class="retry-btn font-mono text-xs font-bold uppercase bg-cyan text-ink border-2 border-ink px-4 py-2 hover:translate-x-[2px] hover:translate-y-[2px] shadow-[2px_2px_0_0_#0b0b0b] transition-all">Retry Connection</button>
        </div>`;
    }
}

async function loadIndependentChallenges() {
    const grid = document.getElementById('compete-independent-grid');
    
    if (!state.currentUser) {
        grid.innerHTML = `<div class="col-span-full bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-16 text-center"><p class="font-mono text-xl font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink mb-6 shadow-[4px_4px_0_0_#0b0b0b]">CLEARANCE REQUIRED</p><br/><button data-action="login" class="login-btn font-mono uppercase tracking-widest font-bold bg-ink text-white border-2 border-ink px-8 py-3 shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] transition-all duration-75">Execute Auth</button></div>`;
        return;
    }

    grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink animate-pulse">> FETCHING TARGETS...</p></div>`;

    try {
        const { res, data } = await fetchJson(`${API_BASE_URL}/challenges`, { credentials: 'include' });
        if (res.status === 429) { grid.innerHTML = `<div class="col-span-full py-8 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink">> RATE LIMITED. RETRY AFTER ${DOMPurify.sanitize(res.headers.get('Retry-After')||'60')}S</p></div>`; return; }

        if (!data.success) throw new Error(data.error);
        if (data.challenges.length === 0) {
            grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink">> NO TARGETS FOUND</p></div>`;
            return;
        }

        window.currentChallengesList = data.challenges; 
        grid.innerHTML = data.challenges.map(chal => renderCompeteCard(chal, data.solved, 'compete-independent')).join('');
    } catch (err) {
        grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]">
            <p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink mb-4">> ERROR: OPERATION UNAVAILABLE</p>
            <p class="font-mono text-sm text-ink mb-4">A network error prevented the operation data from loading.</p>
            <button data-retry="independent" class="retry-btn font-mono text-xs font-bold uppercase bg-cyan text-ink border-2 border-ink px-4 py-2 hover:translate-x-[2px] hover:translate-y-[2px] shadow-[2px_2px_0_0_#0b0b0b] transition-all">Retry Operation</button>
        </div>`;
    }
}

async function openEvent(eventId, eventName) {
    const sid = String(eventId || '').slice(0,128);
    window.activeEventId = sid;
    document.getElementById('compete-events-list').classList.add('hidden');
    document.getElementById('compete-event-dashboard').classList.remove('hidden');
    document.getElementById('compete-event-title').innerText = DOMPurify.sanitize(eventName || "LIVE OPERATION");
    
    const grid = document.getElementById('compete-event-challenges-grid');
    grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink animate-pulse">> AUTHORIZING ACCESS...</p></div>`;
    // hide admin until proven admin
    document.getElementById('admin-panel')?.classList.add('hidden');

    try {
        const { res, data } = await fetchJson(`${API_BASE_URL}/events/${encodeURIComponent(sid)}/challenges`, { credentials: 'include' });
        if (res.status === 429) { grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink">> RATE LIMITED. RETRY AFTER ${DOMPurify.sanitize(res.headers.get('Retry-After')||'60')}S</p></div>`; return; }

        if (!res.ok || !data.success) {
            if (data && data.notAuthorized) {
                const safeError = DOMPurify.sanitize(data.error || '');
                const safeRegLink = safeHref(data.registrationLink || '', '');
                const regBtn = safeRegLink ? `<a href="${safeRegLink}" target="_blank" rel="noopener noreferrer" class="font-mono uppercase tracking-widest font-bold bg-danger text-white border-2 border-ink px-8 py-3 shadow-[4px_4px_0_0_#0b0b0b] inline-block hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] transition-all duration-75">Initiate Override Protocol</a>` : '';
                grid.innerHTML = `<div class="col-span-full bg-white border-4 border-ink shadow-[8px_8px_0_0_#0b0b0b] p-10 text-center"><h3 class="font-black text-3xl uppercase tracking-tighter text-danger mb-4">ACCESS DENIED</h3><p class="font-mono text-sm mb-6">${safeError}</p>${regBtn}</div>`;
            } else {
                const safeErrorMsg = DOMPurify.sanitize((data && (data.error||data.message)) || 'FAILED TO LOAD');
                grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink">> ${safeErrorMsg}</p></div>`;
            }
            return;
        }

        if (data.challenges.length === 0) {
            grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink">> NO TARGETS FOUND IN OPERATION</p></div>`;
            return;
        }

        window.currentChallengesList = data.challenges; 
        grid.innerHTML = data.challenges.map(chal => renderCompeteCard(chal, data.solved, 'compete-event')).join('');
        // surface admin panel if applicable
        if (window.tryShowAdminPanel) window.tryShowAdminPanel();
    } catch (err) {
        const safeId = DOMPurify.sanitize(sid);
        const safeName = DOMPurify.sanitize(eventName || '');
        grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]">
            <p class="font-mono text-sm font-bold uppercase tracking-widest text-white bg-danger inline-block px-4 py-2 border-2 border-ink mb-4">> ERROR: OPERATION UNAVAILABLE</p>
            <p class="font-mono text-sm text-ink mb-4">A network error prevented the operation data from loading.</p>
            <button data-retry-event="${safeId}" data-event-name="${safeName}" class="retry-event-btn font-mono text-xs font-bold uppercase bg-cyan text-ink border-2 border-ink px-4 py-2 hover:translate-x-[2px] hover:translate-y-[2px] shadow-[2px_2px_0_0_#0b0b0b] transition-all">Retry Operation</button>
        </div>`;
    }
}

// ==========================================
// RENDER HELPERS
// ==========================================

async function renderPracticeGrid(data) {
    const grid = document.getElementById('practice-challenges-grid');
    const loadingEl = document.getElementById('loading-practice');

    if (data.length === 0) {
        if (loadingEl) loadingEl.classList.add('hidden');
        grid.innerHTML = `<div class="col-span-full py-16 text-center border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b]"><p class="font-mono text-sm font-bold uppercase tracking-widest text-ink">> NO TARGETS FOUND</p></div>`;
        return;
    }

    // --- PASS 1: Render cards instantly using only cached solve data (no network) ---
    const cachedRaw = localStorage.getItem('practice_solves_data');
    const cachedSolves = (cachedRaw ? JSON.parse(cachedRaw).solves : null) || [];

    grid.innerHTML = data.map(chal => renderPracticeCard(chal, cachedSolves)).join('');
    if (loadingEl) loadingEl.classList.add('hidden');

    // --- PASS 2: If user is logged in, silently reconcile solve status in the background ---
    if (state.currentUser) {
        getPracticeSolves().then(freshSolves => {
            // Only re-render if the solved set actually changed
            const cachedSet = new Set(cachedSolves);
            const freshSet = new Set(freshSolves);
            const changed = freshSolves.some(id => !cachedSet.has(id)) || cachedSolves.some(id => !freshSet.has(id));
            if (changed) {
                grid.innerHTML = data.map(chal => renderPracticeCard(chal, freshSolves)).join('');
            }
        });
    }
}

export function renderPracticeCard(chal, solvedIds) {
    const isSolved = solvedIds.includes(chal.id);

    let diffColorClass = 'bg-canvas text-ink';
    if(chal.difficulty === 'Easy') diffColorClass = 'bg-cyan text-ink';
    if(chal.difficulty === 'Medium') diffColorClass = 'bg-ink text-white';
    if(chal.difficulty === 'Hard') diffColorClass = 'bg-danger text-white';

    const safeName = DOMPurify.sanitize(chal.name || '');
    const safeDiff = DOMPurify.sanitize(chal.difficulty || '');
    const safeCat = DOMPurify.sanitize(Array.isArray(chal.category) ? chal.category.join(', ') : (chal.category || ''));
    const safeAuthors = DOMPurify.sanitize(chal.authors && chal.authors.length > 0 ? chal.authors.join(', ') : 'UNKNOWN_AUTHOR');

    let cardBgClass = isSolved ? 'bg-cyan' : 'bg-white';
    let solvedBadge = isSolved
        ? `<span class="font-mono text-[12px] font-bold uppercase border-2 border-ink bg-white text-ink px-2 py-1 shadow-[2px_2px_0_0_#0b0b0b]">SOLVED</span>`
        : '';

    return `
    <a href="/challenge/practice/${chal.id}" data-nav class="border-2 border-ink ${cardBgClass} p-5 rounded-none shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] hover:bg-ink hover:text-white transition-all duration-75 flex flex-col cursor-pointer group block text-left">
        <div class="flex justify-between items-start mb-4 border-b-2 border-ink group-hover:border-white pb-2">
            <h3 class="font-black text-xl uppercase tracking-tighter truncate">${safeName}</h3>
            ${solvedBadge}
        </div>
        <div class="flex flex-wrap gap-2 mb-6">
            <span class="border-2 border-ink px-2 py-1 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0_0_#0b0b0b] group-hover:border-white ${diffColorClass}">${safeDiff}</span>
            <span class="border-2 border-ink bg-white text-ink px-2 py-1 font-mono text-[10px] font-bold uppercase group-hover:border-white shadow-[2px_2px_0_0_#0b0b0b]">${safeCat}</span>
        </div>
        <div class="mt-auto pt-4 border-t-2 border-ink group-hover:border-white">
            <p class="font-mono text-[10px] font-bold uppercase truncate">> ${safeAuthors}</p>
        </div>
    </a>`;
}

export function renderCompeteCard(chal, solvedList, mode) {
    const isSolved = solvedList.includes(chal.id);
    const isArchived = chal.state === 'archived'; 
    
    let statusStyle = 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] hover:bg-ink hover:text-white'; 
    let badgeStyle = 'bg-ink text-white';
    
    if (isSolved) {
        statusStyle = 'bg-cyan text-ink hover:bg-cyan';
        badgeStyle = 'bg-white text-ink';
    } else if (chal.state === 'upcoming' || isArchived) {
        statusStyle = 'opacity-60 bg-canvas grayscale pointer-events-none hover:shadow-[4px_4px_0_0_#0b0b0b]'; 
    }
    
    let pointsDisplay = chal.points + ' PTS';
    if (isSolved) pointsDisplay = 'SOLVED';
    else if (isArchived) pointsDisplay = 'EXPIRED';

    let href = `/ctf/challenge/compete/${encodeURIComponent(chal.id)}`;
    if (mode === 'compete-event') {
        href = `/ctf/challenge/event/${encodeURIComponent(window.activeEventId)}/${encodeURIComponent(chal.id)}`;
    }

    const safeName = DOMPurify.sanitize(chal.name || '');
    const safeCat = DOMPurify.sanitize(Array.isArray(chal.category) ? chal.category.join(', ') : (chal.category || 'General'));
    const safeDiff = DOMPurify.sanitize(chal.difficulty || 'Unknown');
    const safePointsDisplay = DOMPurify.sanitize(pointsDisplay);
    const attemptsBadge = chal.maxAttempts ? `<span class="border-2 border-ink bg-warning text-ink px-2 py-1 font-mono text-[10px] font-bold uppercase group-hover:border-white shadow-[2px_2px_0_0_#0b0b0b]">MAX ${DOMPurify.sanitize(String(chal.maxAttempts))}</span>` : '';
    const flagTypeBadge = chal.flagType && chal.flagType !== 'static' ? `<span class="border-2 border-ink bg-canvas text-ink px-2 py-1 font-mono text-[10px] font-bold uppercase group-hover:border-white shadow-[2px_2px_0_0_#0b0b0b]">${DOMPurify.sanitize(String(chal.flagType).toUpperCase())}</span>` : '';

    return `
    <a href="${href}" data-nav class="border-2 border-ink bg-white p-5 rounded-none shadow-[4px_4px_0_0_#0b0b0b] transition-all duration-75 flex flex-col cursor-pointer group block text-left ${statusStyle}">
        <div class="flex justify-between items-start mb-4 border-b-2 border-ink group-hover:border-white pb-2">
            <h3 class="font-black text-xl uppercase tracking-tighter truncate">${safeName}</h3>
            <span class="font-mono text-[12px] font-bold uppercase border-2 border-ink px-2 py-1 shadow-[2px_2px_0_0_#0b0b0b] group-hover:border-white ${badgeStyle}">${safePointsDisplay}</span>
        </div>
        <div class="flex flex-wrap gap-2 mb-2">
            <span class="border-2 border-ink bg-white text-ink px-2 py-1 font-mono text-[10px] font-bold uppercase group-hover:border-white shadow-[2px_2px_0_0_#0b0b0b]">${safeCat}</span>
            <span class="border-2 border-ink bg-canvas text-ink px-2 py-1 font-mono text-[10px] font-bold uppercase group-hover:border-white shadow-[2px_2px_0_0_#0b0b0b]">${safeDiff}</span>
            ${attemptsBadge}${flagTypeBadge}
        </div>
    </a>`;
}

// ==========================================
// GLOBAL DETAIL VIEW & WEB3 INJECTION
// ==========================================

async function openChallenge(id, mode) {
    window.currentMode = mode;
    document.getElementById('section-landing')?.classList.add('hidden');
    document.getElementById('section-practice')?.classList.add('hidden');
    document.getElementById('section-compete')?.classList.add('hidden');
    document.getElementById('detail-view').classList.remove('hidden');

    // 1. GET THE STAT ELEMENTS AND RESET THEM
    const solvesEl = document.getElementById('det-solves');
    const fbEl = document.getElementById('det-firstblood');
    
    if (solvesEl) {
        solvesEl.classList.add('hidden');
        solvesEl.innerText = '';
    }
    if (fbEl) {
        fbEl.classList.add('hidden');
        fbEl.innerText = '';
    }

    document.getElementById('det-title').innerText = "FETCHING DATA...";
    document.getElementById('flagInput').value = '';
    document.getElementById('flagStatus').className = '';
    document.getElementById('flagStatus').innerText = '';
    window.currentChallengeData = null;

    try {
        let chal;
        
        if (mode === 'practice-challenges') {
            try {
                const response = await fetch(`${CTF_STATIC_API}/challenges/${id}.json`);
                if (!response.ok) throw new Error("File missing");
                chal = await response.json();
            } catch (error) {
                console.warn(`Could not load full JSON for ${id}. Falling back to lite data.`);
                chal = window.allChallenges.find(c => c.id === id);
                if (!chal) throw new Error("Challenge completely missing");
            }
        } else {
            if (window.currentChallengesList) {
                chal = window.currentChallengesList.find(c => c.id === id);
            }
            
            if (!chal) {
                if (mode === 'compete-independent') {
                    const res = await fetch(`${API_BASE_URL}/challenges`, { credentials: 'include' });
                    const data = await res.json();
                    if(data.success) chal = data.challenges.find(c => c.id === id);
                } else if (mode === 'compete-event') {
                    if (!window.activeEventId) throw new Error("Missing Event ID Context.");
                    const res = await fetch(`${API_BASE_URL}/events/${window.activeEventId}/challenges`, { credentials: 'include' });
                    const data = await res.json();
                    if(data.success) chal = data.challenges.find(c => c.id === id);
                }
            }
            
            if (!chal) throw new Error("Target missing from API list.");
        }

        window.currentChallengeData = chal;
        const categories = Array.isArray(chal.category) ? chal.category.join(', ') : chal.category;

        document.getElementById('det-title').innerText = chal.name;
        document.getElementById('det-cat').innerText = `CAT: ${categories || 'N/A'}`;
        document.getElementById('det-diff').innerText = `DIFF: ${chal.difficulty || 'N/A'}`;
        
        // 2. POPULATE STATS IF IN INDEPENDENT COMPETE MODE
        if (mode === 'compete-independent') {
            if (solvesEl && chal.solveCount !== undefined) {
                solvesEl.innerText = `SOLVES: ${chal.solveCount}`;
                solvesEl.classList.remove('hidden');
            }
            if (fbEl && chal.firstBlood) {
                fbEl.innerText = `FIRST BLOOD: ${chal.firstBlood}`;
                fbEl.classList.remove('hidden');
            }
        }

        // Always show author (validate URLs to prevent javascript: XSS)
        const authors = chal.authors ? chal.authors.map(a => {
            const name = DOMPurify.sanitize(String(a.name || a));
            const url = a.url ? safeHref(String(a.url), '') : '';
            return url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="hover:underline hover:text-cyan">${name}</a>` : name;
        }).join(', ') : 'UNKNOWN';
        // authors already sanitized fragments; sanitize wrapper
        const authorsSanitized = DOMPurify.sanitize(`AUTH: ${authors}`, { ADD_ATTR: ['target','rel'] });
        document.getElementById('det-author').innerHTML = authorsSanitized;
        
        // Always show points + maxAttempts if present
        const ptsText = `PTS: ${chal.points || 0}` + (chal.maxAttempts ? ` | MAX ${chal.maxAttempts}` : '');
        document.getElementById('det-points').innerText = ptsText;

        // Web3 Check & UI Override
        const isWeb3 = chal.category && (Array.isArray(chal.category) ? chal.category.some(c => String(c).toLowerCase() === 'web3') : String(chal.category).toLowerCase() === 'web3');
        const flagInput = document.getElementById('flagInput');
        const submitFlagBtn = document.getElementById('submitFlagBtn');
        const connectWalletBtn = document.getElementById('connectWalletBtn');
        const validateWeb3Btn = document.getElementById('validateWeb3Btn');

        let rawDescription = chal.description 
            ? chal.description.replace(/\[REDACTED\]/g, '<span class="bg-ink text-ink hover:text-cyan selection:bg-danger cursor-crosshair transition-none select-none">CLASSIFIED</span>')
            : "> NO_DESCRIPTION_PROVIDED";

        if (isWeb3) {
            flagInput.classList.add('hidden');
            submitFlagBtn.classList.add('hidden');
            connectWalletBtn.classList.remove('hidden');
            validateWeb3Btn.classList.add('hidden'); // Remains hidden until wallet connects

            // Inject Contract Address into description
            document.getElementById('det-desc').innerHTML = `
                <div class="mb-4 bg-canvas border-2 border-ink p-4">
                    <span class="font-bold text-xs uppercase block mb-1">> Target Contract (Sepolia)</span>
                    <code class="text-cyan bg-ink px-2 py-1 select-all">${DOMPurify.sanitize(chal.contractAddress || 'ADDRESS_MISSING')}</code>
                </div>
                ${DOMPurify.sanitize(rawDescription)}
            `;
        } else {
            flagInput.classList.remove('hidden');
            submitFlagBtn.classList.remove('hidden');
            connectWalletBtn.classList.add('hidden');
            validateWeb3Btn.classList.add('hidden');
            
            document.getElementById('det-desc').innerHTML = DOMPurify.sanitize(rawDescription);
        }

        const assetsDiv = document.getElementById('det-assets');
        if (chal.assets && chal.assets.length > 0) {
            assetsDiv.innerHTML = chal.assets.map(asset => {
                let downloadUrl = String(asset);
                if (mode === 'practice-challenges') {
                    const cleanAsset = downloadUrl.replace('./', '').replace(/[^a-zA-Z0-9._\-\/]/g,'');
                    const folderPath = chal.repo_path || `${Array.isArray(chal.category) ? chal.category[0] : chal.category}/${chal.name}`;
                    const safeFolder = String(folderPath).replace(/[^a-zA-Z0-9._\-\/ ]/g,'');
                    downloadUrl = `https://raw.githubusercontent.com/A-Y-U-S-H-Y-A/project-haxnation/main/${safeFolder}/${cleanAsset}`;
                }
                const safeDownloadUrl = safeHref(downloadUrl, '#');
                return `<a href="${safeDownloadUrl}" target="_blank" rel="noopener noreferrer" class="font-mono text-xs uppercase tracking-widest font-bold bg-white text-ink border-2 border-ink px-4 py-2 shadow-[4px_4px_0_0_#0b0b0b] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#0b0b0b] hover:bg-cyan transition-all duration-75">[↓] ACQUIRE_ASSET</a>`;
            }).join('');
        } else {
            assetsDiv.innerHTML = '';
        }

        const hintsDiv = document.getElementById('det-hints');
        if (chal.hints && chal.hints.length > 0) {
            hintsDiv.innerHTML = chal.hints.map((hint, index) => {
                const safeHint = DOMPurify.sanitize(String(hint));
                return `<div class="border-2 border-ink bg-white shadow-[4px_4px_0_0_#0b0b0b] rounded-none overflow-hidden">
                    <button data-hint-idx="${index}" class="hint-toggle w-full text-left px-4 py-3 bg-white hover:bg-ink hover:text-white font-mono text-xs font-bold uppercase tracking-widest transition-colors duration-0 border-b-2 border-transparent">> DECRYPT HINT ${index + 1}</button>
                    <div class="hidden p-4 bg-canvas border-t-2 border-ink text-sm text-ink font-mono" id="hint-${index}">${safeHint}</div>
                </div>`;
            }).join('');
        } else {
            hintsDiv.innerHTML = '';
        }
    } catch (error) {
        document.getElementById('det-title').innerText = "ERROR LOADING TARGET";
        document.getElementById('det-desc').innerHTML = `<p class="font-mono text-sm font-bold text-danger">The target data could not be retrieved due to a system fault.</p><p class="font-mono text-sm mt-4">Please return to the main arena and try again.</p>`;
    }
}

function toggleHint(index) {
    document.getElementById(`hint-${index}`).classList.toggle('hidden');
}

// ==========================================
// LEADERBOARD & EVENT HELPERS
// ==========================================

function showEventsList() {
    window.activeEventId = null;
    document.getElementById('compete-event-dashboard').classList.add('hidden');
    document.getElementById('compete-events-list').classList.remove('hidden');
    loadLiveEvents();
}

async function showLeaderboard() {
    if (!window.activeEventId) return;
    document.getElementById('compete-event-dashboard').classList.add('hidden');
    document.getElementById('compete-leaderboard').classList.remove('hidden');
    
    const tbody = document.getElementById('leaderboard-content');
    tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-ink font-mono font-bold animate-pulse">> FETCHING_RANKS...</td></tr>`;

    try {
        const { res, data } = await fetchJson(`${API_BASE_URL}/events/${encodeURIComponent(window.activeEventId)}/leaderboard`, { credentials: 'include' });
        if (res.status === 429) { tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-white bg-danger font-mono font-bold">> RATE LIMITED. RETRY AFTER ${DOMPurify.sanitize(res.headers.get('Retry-After')||'60')}S</td></tr>`; return; }
        if (data.hidden) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-ink font-mono font-bold bg-warning border-2 border-ink">> ${DOMPurify.sanitize(data.message || 'Scoreboard is hidden.')}</td></tr>`;
            return;
        }
        if (data.success && data.leaderboard && data.leaderboard.length > 0) {
            tbody.innerHTML = data.leaderboard.map((user, index) => {
                const safeName = DOMPurify.sanitize(user.name || '');
                const safePoints = DOMPurify.sanitize(String(user.points));
                return `
                <tr class="border-b-2 border-ink hover:bg-ink hover:text-white transition-colors duration-0">
                    <td class="p-4 border-r-2 border-ink font-bold ${index < 3 ? 'bg-cyan text-ink' : ''}">#${index + 1}</td>
                    <td class="p-4 border-r-2 border-ink font-bold">${safeName}</td>
                    <td class="p-4 text-right font-bold">${safePoints}</td>
                </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-ink font-mono font-bold">> NO_FLAGS_CAPTURED</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center p-8 text-white bg-danger font-mono font-bold">> ERROR: LEADERBOARD UNAVAILABLE. NETWORK FAULT. RETRY LATER.</td></tr>`;
    }
}

function hideLeaderboard() {
    document.getElementById('compete-leaderboard').classList.add('hidden');
    document.getElementById('compete-event-dashboard').classList.remove('hidden');
}
