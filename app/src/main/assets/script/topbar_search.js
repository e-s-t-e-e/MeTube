(function() {
    function injectSearchBar() {
        const header = document.querySelector('ytm-header-bar, #header-bar, .mobile-topbar-header, ytm-mobile-topbar-renderer');
        if (!header) return;

        // Find the logo element in the header
        const logo = header.querySelector('.header-logo, #logo, a#logo, ytm-home-logo');
        if (!logo) return;

        // Hide original search/profile buttons safely without breaking layout.
        const originalSearch = header.querySelector('.header-search-button, [aria-label*="Search"], button:has(c3-icon[type="search"]), .search-icon');
        if (originalSearch) originalSearch.style.setProperty('display', 'none', 'important');

        const originalProfile = header.querySelector('.header-profile-button, ytm-avatar-button, a[href="/feed/library"], a[href*="/signin"]');
        if (originalProfile) originalProfile.style.setProperty('display', 'none', 'important');

        // Locate the logo's direct parent that is a child of the header
        let logoWrapper = logo;
        while (logoWrapper.parentNode && logoWrapper.parentNode !== header && logoWrapper.parentNode.tagName.toLowerCase() !== 'body') {
            logoWrapper = logoWrapper.parentNode;
        }

        // If search container is not injected yet, inject it directly into the header
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
            
            // Insert search bar directly under header, right after the logo wrapper
            header.insertBefore(searchContainer, logoWrapper.nextSibling);

            // Click behavior
            const input = searchContainer.querySelector('#metube-header-search-bar');
            if (input) {
                const triggerSearch = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const searchBtn = document.querySelector('.header-search-button, [aria-label*="Search"], button:has(c3-icon[type="search"]), .search-icon') 
                                      || originalSearch;
                    if (searchBtn) {
                        searchBtn.click();
                    }
                };
                input.addEventListener('click', triggerSearch);
                searchContainer.addEventListener('click', triggerSearch);
            }
        }

        // If settings button is not injected yet, inject it directly into the header at the end
        let settingsBtn = document.getElementById('metube-header-settings-btn');
        if (!settingsBtn) {
            settingsBtn = document.createElement('button');
            settingsBtn.id = 'metube-header-settings-btn';
            settingsBtn.setAttribute('aria-label', 'MeTube Settings');
            settingsBtn.innerHTML = `
                <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            `;
            header.appendChild(settingsBtn);

            settingsBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (window.lite && typeof window.lite.extension === 'function') {
                    window.lite.extension();
                }
            });
        }
    }

    // Run periodically to handle dynamic page changes
    setInterval(injectSearchBar, 800);
})();
