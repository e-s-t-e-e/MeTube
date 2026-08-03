(function() {
    function injectHeaderUI() {
        try {
            const header = document.querySelector('ytm-header-bar, #header-bar, .mobile-topbar-header, ytm-mobile-topbar-renderer');
            if (!header) return;

            // Hide original action buttons and containers using safe standard selectors
            const originalActions = Array.from(header.querySelectorAll('.mobile-topbar-header-actions, .header-bar-actions, .ytm-header-actions, .header-buttons, .header-search-button, .header-profile-button, [aria-label*="Search"], .search-icon, ytm-avatar-button, .menu-button, .header-menu-button, [aria-label*="menu"], [aria-label*="More"], [aria-label*="Account"], [aria-label*="Sign in"]'));
            
            // Safe fallback search icon button detection
            header.querySelectorAll('button').forEach(btn => {
                if (btn.querySelector('c3-icon[type="search"]') || btn.querySelector('svg')) {
                    const label = btn.getAttribute('aria-label') || '';
                    if (/search/i.test(label) || /menu/i.test(label) || /more/i.test(label) || /account/i.test(label)) {
                        originalActions.push(btn);
                    }
                }
            });

            originalActions.forEach(el => {
                el.classList.add('metube-hidden');
            });

            // Locate logo's top-level parent under the header
            const logo = header.querySelector('.header-logo, #logo, a#logo, ytm-home-logo');
            let leftElement = null;
            if (logo) {
                leftElement = logo;
                while (leftElement.parentNode && leftElement.parentNode !== header && leftElement.parentNode.tagName.toLowerCase() !== 'body') {
                    leftElement = leftElement.parentNode;
                }
            } else {
                // Fallback to back navigation button if logo is not present (e.g. on watch page)
                const backBtn = header.querySelector('.header-back-button, .back-button, button:first-child');
                if (backBtn) {
                    leftElement = backBtn;
                }
            }

            // Injected Search Container
            let searchContainer = document.getElementById('metube-header-search-container');
            if (!searchContainer) {
                searchContainer = document.createElement('div');
                searchContainer.id = 'metube-header-search-container';
                searchContainer.innerHTML = `
                    <div class="search-input-wrapper">
                        <svg class="search-icon-svg" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                        <input id="metube-header-search-bar" type="text" placeholder="Search MeTube..." readonly />
                    </div>
                `;
                
                // Insert after left element if found, otherwise prepend
                if (leftElement) {
                    header.insertBefore(searchContainer, leftElement.nextSibling);
                } else {
                    header.insertBefore(searchContainer, header.firstChild);
                }

                // Trigger click on original search button
                const input = searchContainer.querySelector('#metube-header-search-bar');
                if (input) {
                    const triggerSearch = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const searchBtn = document.querySelector('.header-search-button, [aria-label*="Search"], .search-icon') || 
                                          Array.from(header.querySelectorAll('button')).find(btn => btn.querySelector('c3-icon[type="search"]'));
                        if (searchBtn) {
                            searchBtn.click();
                        }
                    };
                    input.addEventListener('click', triggerSearch);
                    searchContainer.addEventListener('click', triggerSearch);
                }
            }

            // Injected Settings Button
            let settingsBtn = document.getElementById('metube-header-settings-btn');
            if (!settingsBtn) {
                settingsBtn = document.createElement('button');
                settingsBtn.id = 'metube-header-settings-btn';
                settingsBtn.setAttribute('aria-label', 'MeTube Settings');
                settingsBtn.innerHTML = `
                    <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                `;
                
                // Insert it after search container to guarantee it is on the right
                header.insertBefore(settingsBtn, searchContainer.nextSibling);

                settingsBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    try {
                        lite.extension();
                    } catch (err) {
                        console.error("Failed to open settings:", err);
                    }
                });
            }
        } catch (globalErr) {
            console.error("MeTube Header Injector Error:", globalErr);
        }
    }

    setInterval(injectHeaderUI, 500);
})();
