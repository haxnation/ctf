export function createRouter(appHandlers) {
    const navigate = (url) => {
        if (window.location.pathname === url) return;
        window.history.pushState(null, null, url);
        handleRoute();
    };

    const handleRoute = async () => {
        const path = window.location.pathname;

        if (path === '/' || path === '/practice') {
            navigate('/practice/challenges');
            return;
        }

        if (path === '/compete') {
            navigate('/compete/events');
            return;
        }

        if (!path.includes('/challenge/')) {
            appHandlers.closeChallengeUI();
        }

        if (path.startsWith('/practice/events')) {
            appHandlers.switchTab('practice');
            appHandlers.switchPracticeView('events');
        } else if (path.startsWith('/practice/challenges')) {
            appHandlers.switchTab('practice');
            appHandlers.switchPracticeView('challenges');
        } else if (path.startsWith('/compete/events')) {
            appHandlers.switchTab('compete');
            appHandlers.switchCompeteView('events');
        } else if (path.startsWith('/compete/challenges')) {
            appHandlers.switchTab('compete');
            appHandlers.switchCompeteView('challenges');
        } else if (path.startsWith('/challenge/')) {
            const parts = path.split('/');
            const segment = parts[2]; // 'practice', 'compete', or 'event'
            
            await appHandlers.ensureDataLoaded(); 

            if (segment === 'practice') {
                const id = parts.slice(3).join('/');
                appHandlers.openChallenge(id, 'practice-challenges');
            } else if (segment === 'compete') {
                const id = parts.slice(3).join('/');
                appHandlers.openChallenge(id, 'compete-independent');
            } else if (segment === 'event') {
                // Route format: /challenge/event/:eventId/:challengeId
                const eventId = parts[3];
                const id = parts.slice(4).join('/');
                appHandlers.setActiveEventId(eventId);
                appHandlers.openChallenge(id, 'compete-event');
            }
        }
    };

    document.body.addEventListener('click', e => {
        const link = e.target.closest('[data-nav]');
        if (link) {
            e.preventDefault();
            navigate(link.getAttribute('href'));
        }
    });

    window.addEventListener('popstate', handleRoute);

    return { navigate, handleRoute };
}