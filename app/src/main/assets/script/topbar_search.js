(function() {
    function injectSettingsButton() {
        try {
            const header = document.querySelector('ytm-header-bar, #header-bar, .mobile-topbar-header, ytm-mobile-topbar-renderer');
            if (!header) return;

            // If settings button is already injected, do nothing
            let settingsBtn = document.getElementById('metube-header-settings-btn');
            if (!settingsBtn) {
                settingsBtn = document.createElement('button');
                settingsBtn.id = 'metube-header-settings-btn';
                settingsBtn.setAttribute('aria-label', 'MeTube Settings');
                
                // Gear icon svg styled exactly like other header icons
                settingsBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: #ffffff; display: block;"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                `;

                // Bind click listener directly on the settings button
                settingsBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        const extService = window.lite || (typeof lite !== 'undefined' ? lite : null);
                        if (extService && typeof extService.extension === 'function') {
                            extService.extension();
                        } else {
                            const originalExtBtn = document.getElementById('extensionButton');
                            if (originalExtBtn) {
                                originalExtBtn.click();
                            }
                        }
                    } catch (err) {
                        console.error("Failed to open extension settings:", err);
                    }
                });

                // Append directly to header so it is present on all screens regardless of inner actions wrappers
                header.appendChild(settingsBtn);
            }

            // Hide settings button on library/settings/profile views to avoid duplicates
            const path = window.location.pathname || '';
            const href = window.location.href || '';
            if (href.includes('/feed/library') || href.includes('/settings') || path.includes('/feed/library') || path.includes('/settings')) {
                settingsBtn.style.setProperty('display', 'none', 'important');
            } else {
                settingsBtn.style.setProperty('display', 'inline-flex', 'important');
            }

        } catch (globalErr) {
            console.error("MeTube Header Injector Error:", globalErr);
        }
    }

    setInterval(injectSettingsButton, 600);
})();
