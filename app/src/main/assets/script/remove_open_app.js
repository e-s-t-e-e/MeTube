(function () {
    function removeOpenAppElements() {
        const selectors = [
            'ytm-open-app-button-renderer',
            '.open-in-app',
            '.open-app-button',
            '[aria-label*="Open App"]',
            '[aria-label*="Open app"]',
            'a[href*="intent://"]',
            'a[href*="app-open"]'
        ];

        selectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.style.setProperty('display', 'none', 'important');
                el.remove();
            });
        });

        // Search for any button/link/element containing text "Open App" or "Open app"
        const elements = document.querySelectorAll('button, a, c3-icon-button, ytm-button-renderer, div.header-button, span');
        elements.forEach(el => {
            const text = (el.textContent || '').trim();
            if (text === 'Open App' || text === 'Open app') {
                const target = el.closest('ytm-open-app-button-renderer, c3-icon-button, button, a') || el;
                target.style.setProperty('display', 'none', 'important');
                target.remove();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', removeOpenAppElements);
    } else {
        removeOpenAppElements();
    }

    try {
        const observer = new MutationObserver(() => {
            removeOpenAppElements();
        });

        const root = document.documentElement || document.body;
        if (root) {
            observer.observe(root, { childList: true, subtree: true });
        }
    } catch (e) {}

    setInterval(removeOpenAppElements, 1000);
})();
