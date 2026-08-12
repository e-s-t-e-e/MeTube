(() => {
    'use strict';

    // Fixed left-to-right order for bottom navigation bar items.
    // Home, Shorts, Incognito, Subscriptions, Notifications, Profile, then any extras.
    function pivotKeyOf(child) {
        const id = child.getAttribute('id') || '';
        if (id === 'metube-incognito-pivot-item') return 2;
        if (id === 'metube-notifications-pivot-item') return 4;

        const tab = child.querySelector('.pivot-bar-item-tab');
        const tabClass = tab ? tab.className || '' : '';
        if (tabClass.includes('pivot-w2w')) return 0;
        if (tabClass.includes('pivot-shorts')) return 1;
        if (tabClass.includes('pivot-subs')) return 3;
        if (tabClass.includes('pivot-you')) return 5;

        const anchor = child.querySelector('a[href]');
        if (anchor) {
            const href = (anchor.getAttribute('href') || '').split('?')[0].replace(/\/+$/, '');
            if (href === '' || href === 'https://m.youtube.com') return 0;
            if (href.startsWith('/shorts')) return 1;
            if (href.startsWith('/feed/subscriptions')) return 3;
            if (href.startsWith('/feed/library') || href.startsWith('/you') || href.startsWith('/user') || href.startsWith('/channel')) return 5;
        }

        const title = child.querySelector('.pivot-bar-item-title');
        const text = title ? (title.textContent || '').trim().toLowerCase() : '';
        if (text === 'home') return 0;
        if (text === 'shorts') return 1;
        if (text === 'subscriptions') return 3;
        if (text === 'you' || text === 'profile' || text === 'library' || text === 'account') return 5;
        return 10;
    }

    function enforcePivotOrder() {
        const pivotBar = document.querySelector('ytm-pivot-bar-renderer');
        if (!pivotBar) return;
        const children = Array.from(pivotBar.children);
        if (children.length < 2) return;
        const sorted = children
            .map((child, index) => ({ child, key: pivotKeyOf(child), index }))
            .sort((a, b) => a.key - b.key || a.index - b.index);
        let moved = false;
        for (let i = 0; i < sorted.length; i++) {
            if (pivotBar.children[i] !== sorted[i].child) {
                moved = true;
                break;
            }
        }
        if (moved) {
            sorted.forEach(({ child }) => pivotBar.appendChild(child));
        }
    }

    try {
        if (window.injected) {
            try { enforcePivotOrder(); } catch (e) {}
            return;
        }

        // Runtime options, element IDs, and icon paths.
        const Config = Object.freeze({
            timerGap: 800,
            mediaHoldMs: 420,
            speedHoldMs: 450,
            wrapOffset: 200,
            wrapMinH: 60,
            retryMs: [128, 256, 512, 1024, 2048],
            moveCancelPx: 12,
            mediaContextBlockMs: 1200,
            tapPx: 10,
            ids: Object.freeze({
                downloadBtn: 'downloadButton',
                queueBtn: 'queueButton',
                openWithBtn: 'openWithButton',
                chatBtn: 'chatButton',
                chatBox: 'live_chat_container',
                chatFrame: 'chatIframe',
                aboutBtn: 'aboutButton',
                extensionBtn: 'extensionButton'
            }),
            icons: Object.freeze({
                download: 'M480-336 288-528l51-51 105 105v-246h72v246l105-105 51 51-192 192ZM264-192q-30 0-51-21t-21-51v-72h72v72h432v-72h72v72q0 30-21 51t-51 21H264Z',
                queue: 'M120-320v-80h280v80H120Zm0-160v-80h440v80H120Zm0-160v-80h440v80H120Zm520 480v-160H480v-80h160v-160h80v160h160v80H720v160h-80Z',
                chat: 'M240-384h336v-72H240v72Zm0-132h480v-72H240v72Zm0-132h480v-72H240v72ZM96-96v-696q0-29.7 21.15-50.85Q138.3-864 168-864h624q29.7 0 50.85 21.15Q864-821.7 864-792v480q0 29.7-21.15 50.85Q821.7-240 792-240H240L96-96Zm114-216h582v-480H168v522l42-42Zm-42 0v-480 480Z',
                openWith: 'M648-96q-50 0-85-35t-35-85q0-9 4-29L295-390q-16 14-36.05 22-20.04 8-42.95 8-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 43 8t36 22l237-145q-2-7-3-13.81-1-6.81-1-15.19 0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-43-8t-36-22L332-509q2 7 3 13.81 1 6.81 1 15.19 0 8.38-1 15.19-1 6.81-3 13.81l237 145q16-14 36.05-22 20.04-8 42.95-8 50 0 85 35t35 85q0 50-35 85t-85 35Zm0-72q20.4 0 34.2-13.8Q696-195.6 696-216q0-20.4-13.8-34.2Q668.4-264 648-264q-20.4 0-34.2 13.8Q600-236.4 600-216q0 20.4 13.8 34.2Q627.6-168 648-168ZM216-432q20.4 0 34.2-14 13.8-14 13.8-34t-13.8-34q-13.8-14-34.2-14-20.4 0-34.2 14-13.8 14-13.8 34t13.8 34q13.8 14 34.2 14Zm466-277.8q14-13.8 14-34.2 0-20.4-13.8-34.2Q668.4-792 648-792q-20.4 0-34.2 13.8Q600-764.4 600-744q0 20.4 14 34.2 14 13.8 34 13.8t34-13.8ZM648-216ZM216-480Zm432-264Z',
                about: 'M444-288h72v-240h-72v240Zm35.79-312q15.21 0 25.71-10.29t10.5-25.5q0-15.21-10.29-25.71t-25.5-10.5q-15.21 0-25.71 10.29t-10.5 25.5q0 15.21 10.29 25.71t25.5 10.5Zm.49 504Q401-96 331-126t-122.5-82.5Q156-261 126-330.96t-30-149.5Q96-560 126-629.5q30-69.5 82.5-122T330.96-834q69.96-30 149.5-30t149.04 30q69.5 30 122 82.5T834-629.28q30 69.73 30 149Q864-401 834-331t-82.5 122.5Q699-156 629.28-126q-69.73 30-149 30Zm-.28-72q130 0 221-91t91-221q0-130-91-221t-221-91q-130 0-221 91t-91 221q0 130 91 221t221 91Zm0-312Z',
                extension: 'M384-144H216q-29.7 0-50.85-21.15Q144-186.3 144-216v-168q40-2 68-29.5t28-66.5q0-39-28-66.5T144-576v-168q0-29.7 21.15-50.85Q186.3-816 216-816h168q0-40 27.77-68 27.78-28 68-28Q520-912 548-884.16q28 27.84 28 68.16h168q29.7 0 50.85 21.15Q816-773.7 816-744v168q40 0 68 27.77 28 27.78 28 68Q912-440 884.16-412q-27.84 28-68.16 28v168q0 29.7-21.15 50.85Q773.7-144 744-144H576q-2-40-29.38-68t-66.5-28q-39.12 0-66.62 28-27.5 28-29.5 68Zm-168-72h112q20-45 61.5-70.5T480-312q49 0 90.5 25.5T632-216h112v-240h72q9.6 0 16.8-7.2 7.2-7.2 7.2-16.8 0-9.6-7.2-16.8-7.2-7.2-16.8-7.2h-72v-240H504v-72q0-9.6-7.2-16.8-7.2-7.2-16.8-7.2-9.6 0-16.8 7.2-7.2 7.2-7.2 16.8v72H216v112q45 20 70.5 61.5T312-480q0 50.21-25.5 91.6Q261-347 216-328v112Zm264-264Z',
                close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
            })
        });

        // Shared runtime state used across callbacks.
        const State = {
            active: window.__liteActive !== false,
            menuItem: null,
            mediaHold: null,
            mediaContextUntil: 0,
            speedHold: null,
            playerSeen: null,
            ro: null,
            retryRun: null,
            frameP: null,
            frameToken: 0,
            timerMap: new Map(),
            baseTimers: null
        };

        // DOM selectors shared by media, queue, and sheet modules.
        const Selectors = Object.freeze({
            mediaRoot: 'ytm-media-item, yt-lockup-view-model, ytm-rich-item-renderer, .ytLockupViewModelHost',
            mediaMenu: '.media-item-menu',
            lockupMenu: '.ytLockupMetadataViewModelMenuButton',
            menuTrigger: '.media-item-menu, .ytLockupMetadataViewModelMenuButton',
            mediaInfo: '.media-item-info',
            sheetItem: 'ytm-menu-service-item-renderer, yt-list-item-view-model, toggleable-list-item-view-model',
            sheetButtons: Object.freeze([
                'button.menu-item-button',
                'button.yt-list-item-view-model__button-or-anchor',
                'button'
            ]),
            text: '.yt-core-attributed-string',
            menuLink: '.media-item-metadata a[href]',
            mediaLinks: Object.freeze([
                '.media-item-metadata a[href]',
                'a.ytLockupViewModelContentImage[href]',
                'a.ytmVideoPreviewNavigationEndpoint[href]',
                'a[href*="/watch"][href*="v="]',
                'a[href^="/shorts/"]',
                'a[href*="/shorts/"]'
            ]),
            menuTitle: Object.freeze([
                '.media-item-headline .yt-core-attributed-string',
                '.media-item-headline',
                '.media-item-title .yt-core-attributed-string',
                '.media-item-title',
                'h3 .yt-core-attributed-string',
                'h3',
                'a[title]',
                '.yt-core-attributed-string'
            ]),
            menuAuthor: Object.freeze([
                '.media-item-byline .yt-core-attributed-string',
                '.media-item-byline',
                '.secondary-text .yt-core-attributed-string',
                '.secondary-text',
                '.ytm-badge-and-byline-item-byline',
                '.media-item-metadata'
            ]),
            mediaTitle: Object.freeze([
                '.media-item-headline .yt-core-attributed-string',
                '.media-item-headline',
                '.ytLockupViewModelTitle .yt-core-attributed-string',
                '.ytLockupViewModelTitle',
                '.yt-lockup-metadata-view-model-wiz__title',
                'h3 .yt-core-attributed-string',
                'h3',
                'a[title]',
                '.yt-core-attributed-string'
            ]),
            mediaAuthor: Object.freeze([
                'ytm-badge-and-byline-renderer span[dir="auto"]',
                '.media-item-byline .yt-core-attributed-string',
                '.media-item-byline',
                '.ytLockupViewModelMetadata .yt-core-attributed-string',
                '.yt-lockup-metadata-view-model-wiz__metadata',
                '.secondary-text .yt-core-attributed-string',
                '.secondary-text'
            ]),
            shortsSurface: '#player-shorts-container, shorts-video',
            englishMenuAria: Object.freeze(['more actions', 'action menu'])
        });

        // Returns button labels for the current page language.
        const Lang = {
            texts: Object.freeze({
                zh: { download: '下载', addToQueue: '加入队列', openWith: '打开方式', extension: '扩展', chat: '聊天室', about: '关于' },
                zt: { download: '下載', addToQueue: '加入佇列', openWith: '開啟方式', extension: '擴充功能', chat: '聊天室', about: '關於' },
                en: { download: 'Download', addToQueue: 'Add to queue', openWith: 'Open with', extension: 'MeTube Addons', chat: 'Chat', about: 'About' },
                ja: { download: 'ダウンロード', addToQueue: 'キューに追加', openWith: 'アプリで開く', extension: '拡張機能', chat: 'チャット', about: 'このアプリについて' },
                ko: { download: '다운로드', addToQueue: '대기열에 추가', openWith: '다른 앱으로 열기', extension: '플러그인', chat: '채팅', about: '정보' },
                fr: { download: 'Télécharger', addToQueue: 'Ajouter à la file', openWith: 'Ouvrir avec', extension: 'Extension', chat: 'Chat', about: 'À propos' },
                ru: { download: 'Скачать', addToQueue: 'Добавить в очередь', openWith: 'Открыть с помощью', extension: 'Расширение', chat: 'Чат', about: 'О программе' },
                tr: { download: 'İndir', addToQueue: 'Kuyruğa ekle', openWith: 'Birlikte aç', extension: 'Uzantı', chat: 'Sohbet', about: 'Hakkında' }
            }),

            get(key) {
                const lang = (document.documentElement.lang || 'en').toLowerCase();
                let keyLang = lang.substring(0, 2);
                if (lang.includes('tw') || lang.includes('hk') || lang.includes('mo') || lang.includes('hant')) {
                    keyLang = 'zt';
                }
                return Lang.texts[keyLang]?.[key] ?? Lang.texts.en[key] ?? key;
            }
        };

        // DOM helpers and event binding utilities.
        const DOM = {
            bind(target, type, handler, options) {
                if (!target?.addEventListener || !target?.removeEventListener || typeof handler !== 'function') return;
                const capture = typeof options === 'boolean' ? options : !!options?.capture;
                target.removeEventListener(type, handler, capture);
                target.addEventListener(type, handler, options);
            },

            text(root, selectors) {
                if (!(root instanceof Element)) return null;
                for (const selector of selectors) {
                    const element = root.querySelector(selector);
                    const text = element?.textContent?.replace(/\s+/g, ' ').trim();
                    if (text) return text;
                }
                return null;
            },

            fitIcon(root, size = 24) {
                if (!(root instanceof Element)) return;
                const px = `${size}px`;
                const icon = root.querySelector('c3-icon');
                const host = root.querySelector('.yt-icon-shape');
                const svg = root.querySelector('svg');
                if (icon instanceof Element) {
                    icon.style.width = px;
                    icon.style.height = px;
                }
                if (host instanceof Element) {
                    host.style.width = px;
                    host.style.height = px;
                }
                if (svg instanceof SVGElement) {
                    svg.setAttribute('width', `${size}`);
                    svg.setAttribute('height', `${size}`);
                    svg.style.width = px;
                    svg.style.height = px;
                }
            },

            setPath(root, pathData, viewBox = '0 -960 960 960') {
                const svg = root?.querySelector?.('svg');
                if (!(svg instanceof SVGElement)) return false;
                svg.setAttribute('viewBox', viewBox);
                const path = svg.querySelector('path');
                if (path instanceof SVGElement) {
                    path.setAttribute('d', pathData);
                }
                return true;
            },

            svgIcon(pathData, viewBox = '0 -960 960 960', size = 24) {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', viewBox);
                svg.setAttribute('width', `${size}`);
                svg.setAttribute('height', `${size}`);
                svg.setAttribute('aria-hidden', 'true');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', pathData);
                svg.appendChild(path);
                return svg;
            },

            stripNav(button) {
                if (!(button instanceof Element)) return;
                button.removeAttribute('href');
                button.removeAttribute('target');
                button.querySelectorAll('a[href]').forEach(anchor => {
                    anchor.removeAttribute('href');
                    anchor.removeAttribute('target');
                });
            },

            point(event) {
                return event?.touches?.[0] || event?.changedTouches?.[0] || event;
            },

            closest(event, selector) {
                const path = typeof event?.composedPath === 'function' ? event.composedPath() : null;
                if (Array.isArray(path)) {
                    for (const node of path) {
                        if (node instanceof Element && node.matches?.(selector)) return node;
                    }
                }
                return event?.target instanceof Element ? event.target.closest?.(selector) ?? null : null;
            }
        };

        // Page classification, video ID extraction, and timestamp parsing.
        const Page = {
            type(url = location.href) {
                try {
                    const u = new URL(String(url).toLowerCase(), location.href);
                    if (!u.hostname.includes('youtube.com')) return 'unknown';
                    const segments = u.pathname.split('/').filter(Boolean);
                    if (segments.length === 0) return 'home';

                    const first = segments[0];
                    if (first === 'shorts') return 'shorts';
                    if (first === 'watch') return 'watch';
                    if (first === 'channel') return 'channel';
                    if (first === 'gaming') return 'gaming';
                    if (first === 'feed' && segments.length > 1) return segments[1];
                    if (first === 'select_site') return 'select_site';
                    if (first.startsWith('@')) return '@';
                    return segments.join('/');
                } catch (error) {
                    return 'unknown';
                }
            },

            videoId(url = location.href) {
                try {
                    const u = new URL(url, location.href);
                    const queryVideoId = u.searchParams.get('v');
                    if (queryVideoId) return queryVideoId;

                    const segments = u.pathname.split('/').filter(Boolean);
                    if (u.hostname.includes('youtu.be') && segments.length > 0) return segments[0];

                    const shortsIndex = segments.indexOf('shorts');
                    if (shortsIndex >= 0 && segments.length > shortsIndex + 1) return segments[shortsIndex + 1];

                    const embedIndex = segments.indexOf('embed');
                    if (embedIndex >= 0 && segments.length > embedIndex + 1) return segments[embedIndex + 1];
                    return null;
                } catch (error) {
                    console.error('Error extracting video ID:', error);
                    return null;
                }
            },


            cleanWatch(url) {
                if (!url || !lite.isQueueEnabled?.()) return url;
                try {
                    const u = new URL(url, location.href);
                    if (Page.type(u.toString()) !== 'watch' || !u.searchParams.has('list')) return url;
                    u.searchParams.delete('list');
                    return u.toString();
                } catch (error) {
                    return url;
                }
            },

            parseTime(rawValue) {
                if (rawValue == null) return null;
                const normalized = `${rawValue}`.trim().toLowerCase();
                if (!normalized) return null;
                if (/^\d+$/.test(normalized)) return Number(normalized);
                if (/^\d+s$/.test(normalized)) return Number(normalized.slice(0, -1));

                let totalSeconds = 0;
                let matched = false;
                for (const part of normalized.matchAll(/(\d+)(h|m|s)/g)) {
                    const amount = Number(part[1]);
                    matched = true;
                    if (part[2] === 'h') totalSeconds += amount * 3600;
                    if (part[2] === 'm') totalSeconds += amount * 60;
                    if (part[2] === 's') totalSeconds += amount;
                }
                if (!matched) return null;
                const consumed = Array.from(normalized.matchAll(/(\d+)(h|m|s)/g), part => part[0]).join('');
                return consumed === normalized ? totalSeconds : null;
            }
        };

        // Timer throttling and DOM mount retry helpers.
        const Loop = {
            init() {
                if (State.baseTimers) return;
                State.baseTimers = {
                    setTimeout: window.setTimeout.bind(window),
                    setInterval: window.setInterval.bind(window),
                    clearTimeout: window.clearTimeout.bind(window),
                    clearInterval: window.clearInterval.bind(window)
                };
                window.setTimeout = Loop.wrap(State.baseTimers.setTimeout);
                window.setInterval = Loop.wrap(State.baseTimers.setInterval);
                window.clearTimeout = Loop.wrapClear(State.baseTimers.clearTimeout);
                window.clearInterval = Loop.wrapClear(State.baseTimers.clearInterval);
                State.retryRun = Loop.backoff();
            },

            frame() {
                if (!State.frameP) {
                    State.frameP = new Promise(resolve => {
                        requestAnimationFrame(() => {
                            State.frameP = null;
                            resolve(++State.frameToken);
                        });
                    });
                }
                return State.frameP;
            },

            wrap(setTimer) {
                return (handler, delay, ...args) => {
                    if (typeof handler !== 'function') return setTimer(handler, delay, ...args);
                    const timerState = { active: true, lastRunAt: 0, frameToken: 0 };
                    const run = async () => {
                        if (!timerState.active) return;
                        if (timerState.lastRunAt && Date.now() - timerState.lastRunAt < Config.timerGap) {
                            const frameToken = await Loop.frame();
                            if (!timerState.active || timerState.frameToken === frameToken) return;
                            timerState.frameToken = frameToken;
                        }
                        timerState.lastRunAt = Date.now();
                        handler(...args);
                    };
                    const id = setTimer(run, delay);
                    State.timerMap.set(id, timerState);
                    return id;
                };
            },

            wrapClear(clear) {
                return (id) => {
                    const timerState = State.timerMap.get(id);
                    if (timerState) {
                        timerState.active = false;
                        State.timerMap.delete(id);
                    }
                    clear(id);
                };
            },

            backoff() {
                let timerId = null;
                let version = 0;
                return (handler) => {
                    clearTimeout(timerId);
                    const currentVersion = ++version;
                    let delayIndex = 0;
                    const run = () => {
                        if (currentVersion !== version) return;
                        const done = handler() === true;
                        if (done) return;
                        timerId = setTimeout(run, Config.retryMs[delayIndex] ?? Config.retryMs.at(-1));
                        delayIndex += 1;
                    };
                    run();
                };
            },

            runSoon() {
                if (!App.isActive()) return;
                const runWithBackoff = State.retryRun ?? Loop.backoff();
                runWithBackoff(() => {
                    if (!App.isActive()) return true;
                    // DOM nodes can mount asynchronously; retry until the page settles.
                    return App.run() !== false;
                });
            }
        };

        // Main scheduling entry.
        const App = {
            isActive() {
                return State.active !== false && window.__liteActive !== false;
            },

            setActive(active) {
                State.active = active !== false;
                window.__liteActive = State.active;
                if (State.active) Loop.runSoon();
            },

            ctx() {
                const pageClass = Page.type(location.href);
                const moviePlayer = document.querySelector('#movie_player');
                const isWatch = pageClass === 'watch';
                return {
                    pageClass,
                    isWatch,
                    isShorts: pageClass === 'shorts',
                    isSettings: pageClass === 'select_site',
                    isHomeLike: ['home', 'subscriptions', 'library', '@'].includes(pageClass),
                    moviePlayer,
                    videoId: Page.videoId(location.href),
                    isLive: !!moviePlayer?.getPlayerResponse?.()?.playabilityStatus?.liveStreamability
                        && location.href.toLowerCase().startsWith('https://m.youtube.com/watch')
                };
            },

            init() {
                Loop.init();
                Player.init();
                Nav.init();
                Sheet.init();
                Gesture.init();
                Post.init();
                window.__liteActive = State.active;
                window.__liteSetActive = App.setActive;

                Loop.runSoon();
                window.injected = true;
            },

            run() {
                if (!App.isActive()) return true;
                const ctx = App.ctx();

                lite.setRefreshLayoutEnabled(ctx.isHomeLike);
                const results = [
                    Search.run(ctx),
                    Player.run(ctx),
                    Gesture.run(ctx),
                    Chat.run(ctx),
                    Watch.run(ctx),
                    Settings.run(ctx),
                    IncognitoPivot.run(ctx),
                    NotificationsPivot.run(ctx),
                    NotificationsFeed.run(ctx),
                    PivotBarOrder.run(ctx)
                ];
                return !results.some(result => result === false);
            }
        };

        // Handles the search suggestion layer on watch pages.
        const Search = {
            run(ctx) {
                document.querySelectorAll('.yt-searchbox-suggestions-container').forEach(container => {
                    if (!(container instanceof HTMLElement)) return;
                    if (ctx.isWatch) {
                        container.style.display = 'none';
                    } else {
                        container.style.removeProperty('display');
                    }
                });
            }
        };

        // Android/WebView bridge calls.
        const Native = {
            openTab(nextUrl, nextPageClass) {
                if (!App.isActive()) return;
                lite.openTab(nextUrl, nextPageClass);
            },

            goBack() {
                if (!App.isActive()) return;
                lite.goBack?.();
            }
        };

        // Queue item extraction and normalization.
        const Queue = {
            normalize(item) {
                if (!item?.videoId || !item?.title || !item?.url) return null;
                const videoId = String(item.videoId).trim();
                const title = String(item.title).trim();
                const url = String(item.url).trim();
                if (!videoId || !title || !url) return null;

                const author = item.author ? String(item.author).trim() : null;
                const thumbnailUrl = item.thumbnailUrl
                    ? String(item.thumbnailUrl).trim()
                    : `https://img.youtube.com/vi/${videoId}/default.jpg`;
                return { videoId, url, title, author, thumbnailUrl };
            },

            toPayload(item) {
                const normalized = Queue.normalize(item);
                return normalized ? JSON.stringify(normalized) : null;
            },

            current() {
                const videoData = document.querySelector('#movie_player')?.getVideoData?.();
                let author = videoData?.author;
                if (!author) {
                    const selectors = [
                        '#owner-sub-count',
                        'ytm-slim-owner-renderer .slim-owner-subtitle',
                        'ytm-video-owner-renderer .video-owner-title',
                        '.slim-video-metadata .yt-core-attributed-string'
                    ];
                    for (const selector of selectors) {
                        const text = document.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();
                        if (text) {
                            author = text;
                            break;
                        }
                    }
                }

                const item = Queue.normalize({
                    videoId: videoData?.video_id,
                    url: location.href,
                    title: videoData?.title,
                    author,
                    thumbnailUrl: videoData?.video_id ? `https://img.youtube.com/vi/${videoData.video_id}/default.jpg` : null
                });
                if (!item) {
                    lite.showQueueItemUnavailable?.();
                    return null;
                }
                return item;
            },

            fromMenu(info) {
                const metadataLink = info?.querySelector(Selectors.menuLink);
                const href = metadataLink?.getAttribute('href');
                const videoId = Page.videoId(href);
                if (!href || !videoId) return null;

                let resolvedUrl;
                try {
                    resolvedUrl = new URL(href, location.origin).toString();
                } catch (error) {
                    return null;
                }

                const title = DOM.text(info, Selectors.menuTitle) || videoId;

                const author = DOM.text(info, Selectors.menuAuthor) || 'Unknown author';

                return Queue.normalize({
                    videoId,
                    url: resolvedUrl,
                    title,
                    author,
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/default.jpg`
                });
            },

            mediaRoot(origin) {
                if (!(origin instanceof Element)) return null;
                if (origin.closest?.(Selectors.mediaMenu)) return null;
                if (origin.matches?.(Selectors.mediaRoot)) return origin;
                return origin.closest?.(Selectors.mediaRoot) ?? null;
            },

            mediaLink(root) {
                if (!(root instanceof Element)) return null;
                for (const selector of Selectors.mediaLinks) {
                    const link = root.matches?.(selector) ? root : root.querySelector(selector);
                    if (link instanceof HTMLAnchorElement || link instanceof Element) {
                        const href = link.getAttribute('href') || link.href;
                        if (Page.videoId(href)) return link;
                    }
                }
                return null;
            },

            fromMedia(origin) {
                const mediaItem = Queue.mediaRoot(origin);
                if (!(mediaItem instanceof Element)) return null;

                const metadataLink = Queue.mediaLink(mediaItem);
                const href = metadataLink?.getAttribute('href') || metadataLink?.href;
                const videoId = Page.videoId(href);
                if (!href || !videoId) return null;

                const normalizedUrl = new URL(href, 'https://m.youtube.com');
                normalizedUrl.searchParams.delete('list');
                normalizedUrl.searchParams.delete('index');
                normalizedUrl.searchParams.delete('pp');

                return {
                    videoId,
                    url: normalizedUrl.toString(),
                    title: DOM.text(mediaItem, Selectors.mediaTitle) || metadataLink?.getAttribute?.('title') || videoId,
                    author: DOM.text(mediaItem, Selectors.mediaAuthor),
                    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                };
            }
        };

        // Extracts playlist data from ytInitialData.
        const Playlist = {
            textRuns(value) {
                if (!value) return '';
                if (typeof value.simpleText === 'string') return value.simpleText;
                if (Array.isArray(value.runs)) return value.runs.map(run => run?.text ?? '').join('');
                return '';
            },

            fromRenderer(renderer, index) {
                if (!renderer?.videoId) return null;
                const relativeUrl = renderer.navigationEndpoint?.commandMetadata?.webCommandMetadata?.url
                    || renderer.navigationEndpoint?.watchEndpoint?.url
                    || renderer.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl
                    || '';
                let resolvedUrl = `https://www.youtube.com/watch?v=${renderer.videoId}`;
                if (typeof relativeUrl === 'string' && relativeUrl.length > 0) {
                    try {
                        resolvedUrl = new URL(relativeUrl, location.origin).toString();
                    } catch (error) {
                        resolvedUrl = `https://www.youtube.com/watch?v=${renderer.videoId}`;
                    }
                }

                const durationText = Playlist.textRuns(renderer.lengthText);
                let durationSeconds = 0;
                if (durationText) {
                    durationSeconds = 0;
                    for (const part of durationText.trim().split(':')) {
                        const parsed = Number.parseInt(part.trim(), 10);
                        if (!Number.isFinite(parsed)) {
                            durationSeconds = 0;
                            break;
                        }
                        durationSeconds = durationSeconds * 60 + parsed;
                    }
                }

                return {
                    playlistIndex: index,
                    videoId: renderer.videoId,
                    url: resolvedUrl,
                    title: Playlist.textRuns(renderer.title) || renderer.videoId,
                    author: Playlist.textRuns(renderer.shortBylineText || renderer.longBylineText),
                    thumbnailUrl: Array.isArray(renderer.thumbnail?.thumbnails) && renderer.thumbnail.thumbnails.length > 0
                        ? renderer.thumbnail.thumbnails[renderer.thumbnail.thumbnails.length - 1].url
                        : `https://img.youtube.com/vi/${renderer.videoId}/default.jpg`,
                    durationSeconds,
                    durationText,
                    selected: renderer.selected === true
                };
            },

            fromEntries(entries) {
                if (!Array.isArray(entries)) return [];
                return entries.map((entry, index) => {
                    const renderer = entry?.playlistPanelVideoRenderer || entry?.playlistVideoRenderer;
                    return Playlist.fromRenderer(renderer, index);
                }).filter(Boolean);
            },

            buildPayload() {
                const playlistRoot = globalThis.ytInitialData?.contents?.singleColumnWatchNextResults?.playlist?.playlist;
                const playlistId = playlistRoot?.playlistId || (() => {
                    try {
                        return new URL(location.href, location.origin).searchParams.get('list') || '';
                    } catch (error) {
                        return '';
                    }
                })();

                let playlistTitle = Playlist.textRuns(playlistRoot?.title);
                let items = Playlist.fromEntries(playlistRoot?.contents);

                if (items.length === 0) {
                    const queue = [globalThis.ytInitialData];
                    const visited = new WeakSet();
                    while (queue.length > 0) {
                        const node = queue.shift();
                        if (!node || typeof node !== 'object' || visited.has(node)) continue;
                        visited.add(node);

                        if (Array.isArray(node)) {
                            const normalized = Playlist.fromEntries(node);
                            if (normalized.length > 0) {
                                items = normalized;
                                break;
                            }
                            for (const child of node) {
                                if (child && typeof child === 'object') queue.push(child);
                            }
                            continue;
                        }

                        if (Array.isArray(node.contents)) {
                            const normalized = Playlist.fromEntries(node.contents);
                            if (normalized.length > 0) {
                                playlistTitle = playlistTitle || Playlist.textRuns(node.title);
                                items = normalized;
                                break;
                            }
                        }

                        for (const child of Object.values(node)) {
                            if (child && typeof child === 'object') queue.push(child);
                        }
                    }
                }

                if (items.length === 0) return null;
                return JSON.stringify({
                    ok: true,
                    playlistId,
                    title: playlistTitle || document.title || '',
                    items
                });
            }
        };

        // Player visibility, sizing, ad skip, and timestamp handling.
        const Player = {
            init() {
                State.ro = typeof ResizeObserver === 'function'
                    ? new ResizeObserver(() => {
                        const ctx = App.ctx();
                        if (!ctx.isWatch || !ctx.moviePlayer) return;
                        lite.setPlayerHeight(ctx.moviePlayer.clientHeight);
                    })
                    : null;

                DOM.bind(window, 'onRefresh', () => {
                    const now = Date.now();
                    const lastReload = Number(sessionStorage.getItem('__lite_refresh_reload_at') || '0');
                    if (now - lastReload < 8000) {
                        lite.finishRefresh?.();
                        return;
                    }
                    sessionStorage.setItem('__lite_refresh_reload_at', String(now));
                    window.location.reload();
                });

                DOM.bind(document, 'visibilitychange', () => {
                    if (!App.isActive()) return;
                    Loop.runSoon();
                });

                DOM.bind(window, 'onProgressChangeFinish', () => {
                    lite.finishRefresh();
                });

                DOM.bind(document, 'animationstart', Player.onNodeInsert, true);
                DOM.bind(document, 'click', Player.seekTimestamp, true);
            },

            run(ctx) {
                Player.observeSize(ctx.moviePlayer);
                Player.skipAds(ctx);
            },

            syncVisibility() {
                const pageClass = Page.type(location.href);
                if (pageClass === 'watch') {
                    lite.play(location.href);
                } else {
                    lite.hidePlayer();
                }
            },

            observeSize(player) {
                if (!State.ro || player === State.playerSeen) return;
                State.ro.disconnect();
                if (player) {
                    State.ro.observe(player);
                    State.playerSeen = player;
                } else {
                    State.playerSeen = null;
                }
            },

            fitContent(pageClass = Page.type(location.href), player = document.querySelector('#movie_player'), menuItemHeight = 0) {
                const wrapper = document.querySelector('#content-wrapper');
                if (!wrapper) return;

                const extraHeight = Number.isFinite(menuItemHeight) ? Math.max(0, menuItemHeight) : 0;
                const shouldCompensate = extraHeight > 0;
                if (!player) {
                    if (wrapper.dataset.maxheight === 'true') {
                        wrapper.style.maxHeight = '';
                        delete wrapper.dataset.maxheight;
                    }
                    return;
                }

                if (pageClass !== 'watch' && !shouldCompensate) {
                    if (wrapper.dataset.maxheight === 'true') {
                        wrapper.style.maxHeight = '';
                        delete wrapper.dataset.maxheight;
                    }
                    return;
                }

                const viewportHeight = window.visualViewport?.height
                    || window.innerHeight
                    || document.documentElement.clientHeight
                    || 0;
                const playerHeight = player.clientHeight || 0;
                const baseHeight = Math.floor(viewportHeight - playerHeight - Config.wrapOffset);
                const nextHeight = Math.max(Config.wrapMinH, baseHeight + extraHeight);
                const nextMaxHeight = `${nextHeight}px`;
                if (wrapper.style.maxHeight !== nextMaxHeight) {
                    wrapper.style.maxHeight = nextMaxHeight;
                }
                wrapper.dataset.maxheight = 'true';
            },

            skipAds(ctx) {
                if (!ctx.isWatch) return;
                const video = document.querySelector('.ad-showing video');
                if (video) video.currentTime = video.duration;
            },

            seekTimestamp(event) {
                if (Page.type(location.href) !== 'watch') return;
                const link = event.target.closest('a');
                if (!link) return;
                const href = link.getAttribute('href') || link.href;
                if (!href || !href.includes('t=')) return;

                let targetUrl;
                try {
                    targetUrl = new URL(link.href, location.href);
                } catch (error) {
                    return;
                }
                if (Page.type(targetUrl.toString()) !== 'watch') return;

                const videoId = Page.videoId(location.href);
                const targetVideoId = Page.videoId(targetUrl.toString());
                if (!videoId || videoId !== targetVideoId) return;

                const timestampSeconds = Page.parseTime(targetUrl.searchParams.get('t') ?? targetUrl.searchParams.get('start'));
                if (timestampSeconds == null) return;
                if (!lite.seekLoadedVideo?.(targetUrl.toString(), timestampSeconds * 1000)) return;

                event.preventDefault();
                event.stopImmediatePropagation();
            },

            onNodeInsert(event) {
                const target = event.target;
                if (event.animationName !== 'nodeInserted' || !(target instanceof Element)) return;
                if (!target.matches?.('ytm-watch, #content-wrapper, #movie_player, #player-container-id, .watch-below-the-player')) return;

                const ctx = App.ctx();
                const player = ctx.moviePlayer;

                if (player) {
                    if (ctx.isWatch) {
                        player.mute?.();
                        player.seekTo?.(lite.getResumePosition(Page.videoId(location.href)));
                        DOM.bind(player, 'onStateChange', (state) => {
                            if (state === 1) player.pauseVideo?.();
                        });
                    } else if (ctx.isShorts) {
                        player.unMute?.();
                    }
                }

                Player.observeSize(player);
                if (!ctx.isWatch) return;

                document.getElementById('player-container-id')?.style.setProperty('background-color', 'black');
                document.getElementById('player')?.style.setProperty('visibility', 'hidden');

                if (document.querySelector('#content-wrapper')) {
                    Player.fitContent();
                    Loop.backoff()(() => {
                        const path = document.querySelector('bottom-sheet-layout path[d*="M12 2a1 1"]');
                        const item = path?.closest?.('yt-list-item-view-model');
                        if (!(item instanceof Element)) return false;
                        return Sheet.enableMixDownload(item);
                    });
                }

                document.querySelectorAll('.watch-below-the-player').forEach(node => {
                    if (node.dataset.captured === 'true') return;
                    ['touchmove', 'touchend'].forEach(type => {
                        DOM.bind(node, type, (e) => {
                            e.stopPropagation();
                        }, { passive: false, capture: true });
                    });
                    node.dataset.captured = 'true';
                });
            }
        };

        // YouTube SPA navigation interception.
        const Nav = {
            init() {
                Nav.patchHistory();
                DOM.bind(window, 'popstate', () => {
                    if (!App.isActive()) return;
                    Player.syncVisibility();
                    Loop.runSoon();
                });
                DOM.bind(window, 'doUpdateVisitedHistory', () => {
                    if (!App.isActive()) return;
                    Loop.runSoon();
                });
                DOM.bind(document, 'click', Nav.onClick, true);
            },

            target(url) {
                if (typeof url !== 'string') return null;
                const historyUrl = Page.cleanWatch(url);
                try {
                    const nextUrl = new URL(historyUrl, location.href).toString();
                    const nextPageClass = Page.type(nextUrl);
                    return { historyUrl, nextUrl, nextPageClass };
                } catch (error) {
                    return { historyUrl, nextUrl: historyUrl, nextPageClass: null };
                }
            },

            patchHistory() {
                const originalPushState = history.pushState;
                history.pushState = function (data, title, url) {
                    const pageClass = Page.type(location.href);
                    const target = Nav.target(url);
                    if (target?.nextPageClass && target.nextPageClass !== pageClass) {
                        Native.openTab(target.nextUrl, target.nextPageClass);
                        return;
                    }
                    originalPushState.call(this, data, title, target ? target.historyUrl : url);
                    if (!App.isActive()) return;
                    Player.syncVisibility();
                    Loop.runSoon();
                };

                const originalReplaceState = history.replaceState;
                history.replaceState = function (data, title, url) {
                    const pageClass = Page.type(location.href);
                    const target = Nav.target(url);
                    if (target?.nextPageClass && target.nextPageClass !== pageClass) {
                        Native.openTab(target.nextUrl, target.nextPageClass);
                        return;
                    }
                    originalReplaceState.call(this, data, title, target ? target.historyUrl : url);
                    if (!App.isActive()) return;
                    Player.syncVisibility();
                    Loop.runSoon();
                };
            },

            onClick(event) {
                const incognito = event.target.closest('#metube-incognito-pivot-item');
                if (incognito) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    if (typeof lite !== 'undefined' && lite.toggleIncognito) {
                        lite.toggleIncognito();
                    }
                    return;
                }

                const anchor = event.target.closest('a');
                const logo = event.target.closest('ytm-home-logo');
                const nav = event.target.closest('ytm-pivot-bar-item-renderer');

                let href;
                if (nav?.data?.navigationEndpoint) {
                    href = nav.data.navigationEndpoint.commandMetadata?.webCommandMetadata?.url;
                } else if (anchor?.href) {
                    href = anchor.getAttribute('href');
                } else if (logo) {
                    href = '/';
                }
                if (!href) return;

                const url = href.startsWith('http') ? href : `https://m.youtube.com${href}`;
                const nextUrl = Page.cleanWatch(url);
                const nextPageClass = Page.type(nextUrl);
                const pageClass = Page.type(location.href);

                if (nextUrl !== url && nextPageClass === pageClass && nextPageClass === 'watch') {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    location.href = nextUrl;
                    return;
                }

                if (nextPageClass !== pageClass) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    Native.openTab(nextUrl, nextPageClass);
                }
            }
        };

        // Bottom sheet menu injection.
        const Sheet = {
            init() {
                DOM.bind(document, 'click', Sheet.capture, true);
            },

            isItem(element) {
                if (!(element instanceof Element)) return false;
                if (element.matches?.(Selectors.sheetItem)) return true;
                const button = Selectors.sheetButtons.map(selector => element.querySelector(selector)).find(node => node instanceof Element);
                const text = element.querySelector(Selectors.text);
                return button instanceof Element && text instanceof Element;
            },

            menuBox(origin) {
                if (!(origin instanceof Element)) return null;
                const queue = [origin];
                while (queue.length > 0) {
                    const node = queue.shift();
                    if (!(node instanceof Element)) continue;
                    const directMenuItems = Array.from(node.children).filter(Sheet.isItem);
                    if (directMenuItems.length > 0) return node;
                    queue.push(...Array.from(node.children));
                }
                return null;
            },

            trigger(event) {
                const path = typeof event?.composedPath === 'function' ? event.composedPath() : null;
                if (Array.isArray(path)) {
                    for (const node of path) {
                        if (!(node instanceof Element)) continue;
                        if (node.matches?.(Selectors.mediaMenu)) return node;
                        const lockupMenu = node.closest?.(Selectors.lockupMenu);
                        if (lockupMenu instanceof Element) return lockupMenu;
                        const aria = (node.getAttribute?.('aria-label') || '').toLowerCase();
                        if (node.matches?.('button') && Selectors.englishMenuAria.includes(aria)) return node;
                    }
                }

                const target = event?.target instanceof Element ? event.target : null;
                if (!target) return null;
                return target.closest?.(Selectors.menuTrigger) ?? null;
            },

            nearInfo(origin) {
                if (!(origin instanceof Element)) return null;
                const mediaInfo = origin.closest?.(Selectors.mediaInfo) ?? origin.querySelector?.(Selectors.mediaInfo);
                if (mediaInfo instanceof Element) return mediaInfo;

                const card = origin.closest?.(Selectors.mediaRoot);
                if (card instanceof Element) return card;

                let node = origin;
                while (node && node !== document.body) {
                    const parent = node.parentElement;
                    if (!parent) return null;
                    const siblings = Array.from(parent.children);
                    const originIndex = siblings.indexOf(node);
                    let nearest = null;
                    let nearestDistance = Number.POSITIVE_INFINITY;
                    siblings.forEach((sibling, index) => {
                        const match = sibling.matches?.(Selectors.mediaInfo)
                            ? sibling
                            : sibling.querySelector?.(Selectors.mediaInfo);
                        if (!match) return;
                        const distance = Math.abs(index - originIndex);
                        if (distance < nearestDistance) {
                            nearest = match;
                            nearestDistance = distance;
                        }
                    });
                    if (nearest) return nearest;
                    node = parent;
                }
                return null;
            },

            ensureQueueItem(queueMenuItem) {
                if (!(queueMenuItem instanceof Element)) return false;
                const menuButton = queueMenuItem.querySelector('button.menu-item-button') || queueMenuItem.querySelector('button');
                if (!(menuButton instanceof Element)) return false;

                let menuText = queueMenuItem.querySelector('.yt-core-attributed-string')
                    || queueMenuItem.querySelector('[role="text"]')
                    || queueMenuItem.querySelector('.menu-item-text')
                    || queueMenuItem.querySelector('.button-text');
                if (!(menuText instanceof Element)) {
                    menuText = document.createElement('span');
                    menuText.className = 'yt-core-attributed-string';
                    menuText.setAttribute('role', 'text');
                    menuButton.appendChild(menuText);
                }

                const menuSvg = queueMenuItem.querySelector('svg');
                const menuPath = menuSvg?.querySelector('path');
                if (menuSvg instanceof SVGElement) {
                    menuSvg.setAttribute('viewBox', '0 -960 960 960');
                    DOM.fitIcon(queueMenuItem);
                    if (menuPath instanceof SVGElement) {
                        menuPath.setAttribute('d', Config.icons.queue);
                    }
                } else {
                    const iconHost = queueMenuItem.querySelector('.yt-spec-button-shape-next__icon');
                    if (iconHost instanceof Element && !iconHost.querySelector('svg')) {
                        iconHost.appendChild(DOM.svgIcon(Config.icons.queue));
                    } else if (!queueMenuItem.querySelector('svg')) {
                        menuButton.prepend(DOM.svgIcon(Config.icons.queue));
                    }
                }

                menuText.textContent = Lang.get('addToQueue');
                menuButton.setAttribute('aria-label', Lang.get('addToQueue'));
                DOM.bind(menuButton, 'click', () => {
                    const payload = queueMenuItem.dataset.liteQueuePayload;
                    if (payload) {
                        lite.addToQueue(payload);
                    } else {
                        lite.showQueueItemUnavailable?.();
                    }
                }, true);
                return true;
            },

            capture(event) {
                const trigger = Sheet.trigger(event);
                if (!trigger) return;
                const info = Sheet.nearInfo(trigger);
                State.menuItem = Queue.fromMenu(info) || Queue.fromMedia(info) || Queue.fromMedia(trigger);

                Loop.backoff()(() => {
                    const bottomSheetLayout = document.querySelector('.bottom-sheet-media-menu-item')
                        || document.querySelector('bottom-sheet-layout');
                    if (!(bottomSheetLayout instanceof Element)) return false;

                    const menuContainer = Sheet.menuBox(bottomSheetLayout);
                    if (!(menuContainer instanceof Element)) return false;

                    const existingItems = Array.from(menuContainer.children)
                        .filter(child => child instanceof Element && child.matches?.('[data-lite-queue-menu-item="true"]'));
                    existingItems.forEach((node, index) => {
                        if (index > 0) node.remove();
                    });

                    if (!State.menuItem?.videoId) {
                        existingItems.forEach(node => node.remove());
                        return true;
                    }

                    let queueMenuElement = existingItems[0];
                    if (!(queueMenuElement instanceof Element)) {
                        queueMenuElement = menuContainer.lastElementChild?.cloneNode(true);
                        if (!(queueMenuElement instanceof Element)) return false;
                        queueMenuElement.dataset.liteQueueMenuItem = 'true';
                    }

                    const payload = Queue.toPayload(State.menuItem);
                    if (!payload) {
                        existingItems.forEach(node => node.remove());
                        return true;
                    }
                    queueMenuElement.dataset.liteQueuePayload = payload;

                    if (!Sheet.ensureQueueItem(queueMenuElement)) return false;
                    if (queueMenuElement.parentElement !== menuContainer || queueMenuElement !== menuContainer.firstElementChild) {
                        menuContainer.insertBefore(queueMenuElement, menuContainer.firstElementChild);
                    }

                    const item = queueMenuElement.querySelector?.('ytm-menu-item') || queueMenuElement;
                    const itemRect = item?.getBoundingClientRect?.();
                    const menuItemHeight = Number.isFinite(itemRect?.height) ? itemRect.height : 0;
                    if (!(Number.isFinite(menuItemHeight) && menuItemHeight > 0)) return undefined;
                    Player.fitContent(Page.type(location.href), document.querySelector('#movie_player'), menuItemHeight);
                    return true;
                });
            },

            enableMixDownload(item) {
                if (!(item instanceof Element)) return false;
                if (item.dataset.liteMixDownloadReady === 'true') return true;

                const menuItemContainer = item.querySelector('.ytListItemViewModelContainer') || item;
                const textWrapper = item.querySelector('.ytListItemViewModelTextWrapper');
                const menuButton = item.querySelector('.ytListItemViewModelMainContainer');
                const label = Lang.get('download');

                if (menuItemContainer instanceof Element) menuItemContainer.classList.remove('ytListItemViewModelDisabled');
                if (textWrapper instanceof Element) {
                    const menuText = textWrapper.querySelector('.ytListItemViewModelTitle');
                    if (menuText instanceof Element) menuText.textContent = label;
                }
                item.setAttribute('aria-disabled', 'false');
                item.setAttribute('tabindex', '0');
                item.setAttribute('role', 'listitem');
                item.setAttribute('aria-pressed', 'false');

                if (item.dataset.liteMixDownloadBound !== 'true') {
                    DOM.bind(item, 'click', (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        const payload = Playlist.buildPayload();
                        if (payload) lite.downloadPlaylist?.(payload);
                    }, true);
                    if (menuButton instanceof Element && menuButton !== item) {
                        DOM.bind(menuButton, 'click', (event) => {
                            event.preventDefault();
                            event.stopImmediatePropagation();
                        }, true);
                    }
                    item.dataset.liteMixDownloadBound = 'true';
                }

                item.dataset.liteMixDownloadReady = 'true';
                return true;
            }
        };

        // Mobile touch handling for media item long press and Shorts press-to-speed.
        const Gesture = {
            init() {
                DOM.bind(document, 'touchstart', Gesture.mediaStart, { passive: true, capture: true });
                DOM.bind(document, 'touchmove', Gesture.mediaMove, { passive: true, capture: true });
                DOM.bind(document, 'touchend', Gesture.mediaEnd, { passive: true, capture: true });
                DOM.bind(document, 'touchcancel', Gesture.mediaCancel, { passive: true, capture: true });
                DOM.bind(document, 'contextmenu', Gesture.mediaContext, true);
                DOM.bind(window, 'blur', Gesture.mediaCancel, true);
                DOM.bind(window, 'pagehide', Gesture.mediaCancel, true);
                DOM.bind(document, 'visibilitychange', Gesture.mediaCancel, true);
            },

            run(ctx) {
                if (ctx.isShorts) {
                    if (!(ctx.moviePlayer instanceof Element)) return false;
                    if (ctx.moviePlayer.dataset.liteShortsSpeedGestureBound !== 'true') {
                        Gesture.bindSpeed(ctx.moviePlayer);
                    }
                    return true;
                }
                if (State.speedHold) Gesture.speedClear();
                return true;
            },

            speedSurface(event) {
                const path = typeof event?.composedPath === 'function' ? event.composedPath() : null;
                if (Array.isArray(path)) {
                    for (const node of path) {
                        if (node instanceof Element && (node.id === 'player-shorts-container' || node.tagName === 'SHORTS-VIDEO')) return node;
                    }
                }
                const target = event?.target;
                if (target instanceof Element) return target.closest?.(Selectors.shortsSurface) ?? null;
                return null;
            },

            speedEvent(event) {
                return !!State.speedHold || !!Gesture.speedSurface(event);
            },

            mediaItem(event) {
                const path = typeof event?.composedPath === 'function' ? event.composedPath() : null;
                if (Array.isArray(path)) {
                    for (const node of path) {
                        if (node instanceof Element && node.matches?.(Selectors.mediaMenu)) return null;
                        const mediaItem = Queue.mediaRoot(node);
                        if (mediaItem instanceof Element) return mediaItem;
                    }
                }

                if (event?.target instanceof Element) {
                    const mediaItem = Queue.mediaRoot(event.target);
                    if (mediaItem instanceof Element) return mediaItem;
                }

                const point = DOM.point(event);
                if (Number.isFinite(point?.clientX) && Number.isFinite(point?.clientY) && typeof document.elementsFromPoint === 'function') {
                    const hitElements = document.elementsFromPoint(point.clientX, point.clientY);
                    for (const node of hitElements) {
                        if (!(node instanceof Element)) continue;
                        if (node.matches?.(Selectors.mediaMenu) || node.closest?.(Selectors.mediaMenu)) return null;
                        const mediaItem = Queue.mediaRoot(node);
                        if (mediaItem instanceof Element) return mediaItem;
                    }
                }
                return null;
            },

            clearMedia() {
                if (State.mediaHold?.timerId) clearTimeout(State.mediaHold.timerId);
                State.mediaHold = null;
            },

            blockMediaContext() {
                State.mediaContextUntil = Date.now() + Config.mediaContextBlockMs;
            },

            shouldBlockMediaContext() {
                return Date.now() < State.mediaContextUntil;
            },

            emitMedia() {
                const hold = State.mediaHold;
                if (!hold || hold.triggered) return;
                const payload = hold.payload;
                if (!payload) {
                    Gesture.clearMedia();
                    return;
                }

                hold.triggered = true;
                Gesture.clearMedia();
                Gesture.blockMediaContext();
                lite.showMediaItemMenu?.(JSON.stringify(payload));
            },

            mediaStart(event) {
                const mediaItem = Gesture.mediaItem(event);
                if (!(mediaItem instanceof Element)) {
                    Gesture.clearMedia();
                    return;
                }
                if (State.mediaHold) return;

                const payload = Queue.fromMedia(mediaItem);
                if (!payload) {
                    Gesture.clearMedia();
                    return;
                }

                Gesture.clearMedia();
                const point = DOM.point(event);
                if (!Number.isFinite(point?.clientX) || !Number.isFinite(point?.clientY)) return;
                State.mediaHold = {
                    mediaItem,
                    payload,
                    startX: point.clientX,
                    startY: point.clientY,
                    startAt: Date.now(),
                    triggered: false,
                    timerId: setTimeout(Gesture.emitMedia, Config.mediaHoldMs)
                };
            },

            mediaMove(event) {
                if (!State.mediaHold) return;
                const point = DOM.point(event);
                if (!Number.isFinite(point?.clientX) || !Number.isFinite(point?.clientY)) return;
                const dx = point.clientX - State.mediaHold.startX;
                const dy = point.clientY - State.mediaHold.startY;
                if (Math.abs(dx) > Config.moveCancelPx || Math.abs(dy) > Config.moveCancelPx) {
                    Gesture.clearMedia();
                }
            },

            mediaEnd() {
                const hold = State.mediaHold;
                if (!hold) return;
                const duration = Date.now() - hold.startAt;
                if (!hold.triggered && duration >= Config.mediaHoldMs) {
                    Gesture.emitMedia();
                    return;
                }
                Gesture.clearMedia();
            },

            mediaCancel() {
                Gesture.clearMedia();
            },

            mediaContext(event) {
                const mediaItem = Gesture.mediaItem(event);
                if (!State.mediaHold && !Gesture.shouldBlockMediaContext() && !(mediaItem instanceof Element)) return;

                event.preventDefault();
                event.stopPropagation();

                // The native media menu is emitted by the touch timer only.
                // Contextmenu is blocked for video cards to avoid Android WebView long-click state issues.
            },

            bindSpeed(moviePlayer) {
                moviePlayer.dataset.liteShortsSpeedGestureBound = 'true';

                const start = (event) => {
                    const surface = Gesture.speedSurface(event);
                    const player = document.querySelector('#movie_player');
                    if (!(surface instanceof Element) || !(player instanceof Element)) return;
                    Gesture.speedStart(player, event);
                };
                const move = (event) => {
                    if (!State.speedHold) return;
                    Gesture.speedMove(event);
                };
                const clear = () => {
                    if (!State.speedHold) return;
                    Gesture.speedClear();
                };

                DOM.bind(document, 'touchstart', start, { passive: true, capture: true });
                DOM.bind(document, 'touchmove', move, { passive: true, capture: true });
                DOM.bind(document, 'touchend', clear, { passive: true, capture: true });
                DOM.bind(document, 'touchcancel', clear, { passive: true, capture: true });

                DOM.bind(document, 'contextmenu', (event) => {
                    const surface = Gesture.speedSurface(event);
                    const player = document.querySelector('#movie_player');
                    if (!(surface instanceof Element) && !State.speedHold) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    if (player instanceof Element && !State.speedHold) Gesture.speedStart(player, event);
                }, { passive: false, capture: true });

                DOM.bind(document, 'selectstart', (event) => {
                    if (!Gesture.speedEvent(event)) return;
                    event.preventDefault();
                    event.stopImmediatePropagation();
                }, { passive: false, capture: true });
            },

            speedStart(player, event) {
                if (!(player instanceof Element) || State.speedHold) return;
                const point = DOM.point(event);
                State.speedHold = {
                    player,
                    previousStyles: {
                        userSelect: player.style.userSelect,
                        webkitUserSelect: player.style.webkitUserSelect,
                        webkitTouchCallout: player.style.webkitTouchCallout
                    },
                    startX: point.clientX,
                    startY: point.clientY,
                    activated: false,
                    timerId: setTimeout(() => {
                        if (!State.speedHold) return;
                        State.speedHold.activated = true;
                        player?.setPlaybackRate?.(2);
                        lite.showHint?.('2x', -1);
                    }, Config.speedHoldMs)
                };

                player.style.userSelect = 'none';
                player.style.webkitUserSelect = 'none';
                player.style.webkitTouchCallout = 'none';
            },

            speedMove(event) {
                if (!State.speedHold) return;
                const point = DOM.point(event);
                const dx = Math.abs(point.clientX - State.speedHold.startX);
                const dy = Math.abs(point.clientY - State.speedHold.startY);
                if (dx > Config.moveCancelPx || dy > Config.moveCancelPx) Gesture.speedClear();
            },

            speedClear() {
                if (State.speedHold?.timerId) clearTimeout(State.speedHold.timerId);
                const player = State.speedHold?.player;
                const previousStyles = State.speedHold?.previousStyles;
                const activated = !!State.speedHold?.activated;

                if (player instanceof Element && previousStyles) {
                    player.style.userSelect = previousStyles.userSelect ?? '';
                    player.style.webkitUserSelect = previousStyles.webkitUserSelect ?? '';
                    player.style.webkitTouchCallout = previousStyles.webkitTouchCallout ?? '';
                }
                State.speedHold = null;

                if (activated) {
                    player?.setPlaybackRate?.(1);
                    lite.hideHint?.();
                }
            }
        };

        // Action button injection for watch pages.
        const Watch = {
            run(ctx) {
                const oldDownloadButton = document.getElementById(Config.ids.downloadBtn);
                const oldQueueButton = document.getElementById(Config.ids.queueBtn);
                const oldOpenWithButton = document.getElementById(Config.ids.openWithBtn);

                if (ctx.isLive || !ctx.isWatch) {
                    oldDownloadButton?.remove();
                    oldQueueButton?.remove();
                    oldOpenWithButton?.remove();
                    return true;
                }

                const saveButton = document.querySelector('.ytSpecButtonViewModelHost.slim_video_action_bar_renderer_button');
                if (!(saveButton instanceof Element) || !saveButton.parentElement) return false;

                const actionBar = saveButton.parentElement;
                Watch.removeDetached(oldDownloadButton, actionBar);
                Watch.removeDetached(oldQueueButton, actionBar);
                Watch.removeDetached(oldOpenWithButton, actionBar);

                return [
                    Watch.ensureDownload(actionBar, saveButton),
                    Watch.ensureQueue(actionBar, saveButton),
                    Watch.ensureOpenWith(actionBar, saveButton)
                ].every(Boolean);
            },

            removeDetached(button, expectedParent) {
                if (button && (button.parentElement !== expectedParent || !button.isConnected)) button.remove();
            },

            cloneAction(templateButton, id, labelKey, iconPath) {
                const button = templateButton.cloneNode(true);
                button.id = id;
                DOM.stripNav(button);
                const text = button.querySelector('.ytSpecButtonShapeNextButtonTextContent');
                if (text) text.innerText = Lang.get(labelKey);
                if (!DOM.setPath(button, iconPath)) return null;
                DOM.fitIcon(button);
                return button;
            },

            ensureDownload(actionBar, saveButton) {
                if (actionBar.querySelector(`#${Config.ids.downloadBtn}`)) return true;
                const button = Watch.cloneAction(saveButton, Config.ids.downloadBtn, 'download', Config.icons.download);
                if (!button) return false;
                DOM.bind(button, 'click', (event) => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    lite.download(location.href);
                }, true);
                actionBar.insertBefore(button, saveButton);
                return true;
            },

            ensureQueue(actionBar, saveButton) {
                if (actionBar.querySelector(`#${Config.ids.queueBtn}`)) return true;
                const button = Watch.cloneAction(saveButton, Config.ids.queueBtn, 'addToQueue', Config.icons.queue);
                if (!button) return false;
                DOM.bind(button, 'click', (event) => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    const payload = Queue.toPayload(Queue.current());
                    if (payload) lite.addToQueue(payload);
                }, true);
                actionBar.insertBefore(button, saveButton);
                return true;
            },

            ensureOpenWith(actionBar, saveButton) {
                if (actionBar.querySelector(`#${Config.ids.openWithBtn}`)) return true;
                const button = Watch.cloneAction(saveButton, Config.ids.openWithBtn, 'openWith', Config.icons.openWith);
                if (!button) return false;
                DOM.bind(button, 'click', (event) => {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                    lite.openWith?.(location.href);
                }, true);
                actionBar.insertBefore(button, saveButton);
                return true;
            }
        };

        // Live chat panel.
        const Chat = {
            run(ctx) {
                if (!ctx.isLive) {
                    Chat.removeChat();
                    return true;
                }
                if (document.getElementById(Config.ids.chatBtn)) return true;

                const saveButton = document.querySelector('.ytSpecButtonViewModelHost.slim_video_action_bar_renderer_button');
                if (!(saveButton instanceof Element) || !saveButton.parentElement) return false;

                const chatBtn = saveButton.cloneNode(true);
                chatBtn.id = Config.ids.chatBtn;
                const textContent = chatBtn.querySelector('.ytSpecButtonShapeNextButtonTextContent');
                if (textContent) textContent.innerText = Lang.get('chat');

                if (!DOM.setPath(chatBtn, Config.icons.chat)) return false;
                DOM.bind(chatBtn, 'click', Chat.toggleChat, true);
                saveButton.parentElement.insertBefore(chatBtn, saveButton);
                return true;
            },

            removeChat() {
                const chatBox = document.getElementById(Config.ids.chatBox);
                if (chatBox) {
                    chatBox.remove();
                    document.body.style.overflow = '';
                    document.documentElement.style.overflow = '';
                }
                document.getElementById(Config.ids.chatBtn)?.remove();
            },

            toggleChat(event) {
                event?.preventDefault?.();
                event?.stopImmediatePropagation?.();

                let chatBox = document.getElementById(Config.ids.chatBox);
                if (chatBox) {
                    if (chatBox.style.display === 'none') {
                        chatBox.style.display = 'flex';
                        document.body.style.overflow = 'hidden';
                        document.documentElement.style.overflow = 'hidden';
                        history.pushState({ chatOpen: true }, '', `${location.href}#chat`);
                    } else {
                        Chat.hide(chatBox);
                    }
                    return;
                }

                const panelContainer = document.querySelector('#panel-container') || document.querySelector('.watch-below-the-player');
                if (!panelContainer) return;

                chatBox = Chat.createBox();
                const videoId = Page.videoId(location.href);
                if (!videoId) return;

                const iframe = Chat.createFrame(videoId);
                chatBox.appendChild(iframe);
                panelContainer.insertBefore(chatBox, panelContainer.firstChild);

                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';
                history.pushState({ chatOpen: true }, '', `${location.href}#chat`);

                DOM.bind(window, 'popstate', () => {
                    if (chatBox && chatBox.style.display !== 'none' && !location.hash.includes('chat')) {
                        Chat.hide(chatBox, false);
                    }
                });
            },

            createBox() {
                const chatBox = document.createElement('div');
                chatBox.id = Config.ids.chatBox;
                chatBox.style.cssText = `
                    position: fixed;
                    top: calc(56.25vw + 48px);
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 4;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                    overflow: hidden;
                `;

                const isDarkMode = document.documentElement.getAttribute('dark') === 'true'
                    || window.matchMedia('(prefers-color-scheme: dark)').matches;
                chatBox.style.backgroundColor = isDarkMode ? '#0f0f0f' : '#ffffff';
                chatBox.appendChild(Chat.createHeader(chatBox));
                return chatBox;
            },

            createHeader(chatBox) {
                const header = document.createElement('div');
                header.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--yt-spec-10-percent-layer);
                    background-color: inherit;
                    border-top-left-radius: 12px;
                    border-top-right-radius: 12px;
                `;

                const title = document.createElement('h2');
                title.className = 'engagement-panel-section-list-header-title';
                title.innerText = Lang.get('chat');
                title.style.cssText = `
                    font-family: "YouTube Sans", "Roboto", sans-serif;
                    font-size: 1.8rem;
                    font-weight: 600;
                    color: var(--yt-spec-text-primary);
                    margin: 0;
                `;

                const closeButton = document.createElement('div');
                closeButton.style.cssText = 'cursor: pointer; color: var(--yt-spec-text-primary); padding: 4px;';
                closeButton.appendChild(DOM.svgIcon(Config.icons.close, '0 0 24 24'));
                closeButton.onclick = (e) => {
                    e.stopPropagation();
                    Chat.hide(chatBox);
                };

                header.appendChild(title);
                header.appendChild(closeButton);
                return header;
            },

            createFrame(videoId) {
                const iframe = document.createElement('iframe');
                iframe.id = Config.ids.chatFrame;
                const isDarkMode = document.documentElement.getAttribute('dark') === 'true'
                    || window.matchMedia('(prefers-color-scheme: dark)').matches;
                iframe.src = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${location.hostname}${isDarkMode ? '&dark_theme=1' : ''}`;
                iframe.style.cssText = 'width: 100%; height: 100%; border: none; flex: 1; background-color: transparent;';
                return iframe;
            },

            hide(chatBox, shouldGoBack = true) {
                chatBox.style.display = 'none';
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                if (shouldGoBack && location.hash === '#chat') history.back();
            }
        };

        // Settings page entry injection.
        const Settings = {
            run(ctx) {
                const settingsBackArrow = document.querySelector('[data-mode="settings"] > .mobile-topbar-back-arrow');
                if (settingsBackArrow instanceof Element && settingsBackArrow.dataset.liteGoBackBound !== 'true') {
                    DOM.bind(settingsBackArrow, 'click', (event) => {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        Native.goBack();
                    }, true);
                    settingsBackArrow.dataset.liteGoBackBound = 'true';
                }

                if (!ctx.isSettings) return true;

                const settings = document.querySelector('ytm-settings');
                const templateButton = settings?.firstElementChild;
                if (!settings || !templateButton || !templateButton.querySelector('svg')) return false;

                Settings.ensureAbout(settings, templateButton);
                Settings.ensureDownload(settings, templateButton);
                Settings.ensureExtension(settings, templateButton);
                return true;
            },

            cloneAction(templateButton, id, labelKey, iconPath) {
                const button = templateButton.cloneNode(true);
                button.id = id;
                const textElement = button.querySelector('.ytAttributedStringHost');
                if (textElement) textElement.innerText = Lang.get(labelKey);
                DOM.setPath(button, iconPath);
                DOM.fitIcon(button);
                return button;
            },

            ensureAbout(settings, templateButton) {
                if (document.getElementById(Config.ids.aboutBtn)) return;
                const button = Settings.cloneAction(templateButton, Config.ids.aboutBtn, 'about', Config.icons.about);
                DOM.bind(button, 'click', () => lite.about());
                const children = settings.children;
                const index = Math.max(0, children.length - 1);
                settings.insertBefore(button, children[index]);
            },

            ensureDownload(settings, templateButton) {
                if (document.getElementById(Config.ids.downloadBtn)) return;
                const button = Settings.cloneAction(templateButton, Config.ids.downloadBtn, 'download', Config.icons.download);
                DOM.bind(button, 'click', () => lite.download());
                settings.insertBefore(button, templateButton);
            },

            ensureExtension(settings, templateButton) {
                if (document.getElementById(Config.ids.extensionBtn)) return;
                const button = Settings.cloneAction(templateButton, Config.ids.extensionBtn, 'extension', Config.icons.extension);
                DOM.bind(button, 'click', () => lite.extension());
                settings.insertBefore(button, templateButton);
            }
        };

        // Incognito item injection into bottom navigation bar.
        const IncognitoPivot = {
            run(ctx) {
                const pivotBar = document.querySelector('ytm-pivot-bar-renderer');
                if (!pivotBar) return true;

                let enabled = true;
                if (typeof lite !== 'undefined' && lite.getPreferences) {
                    try {
                        const prefs = JSON.parse(lite.getPreferences());
                        if (prefs && prefs.enable_incognito_button === false) {
                            enabled = false;
                        }
                    } catch (e) {}
                }

                let item = document.getElementById('metube-incognito-pivot-item');

                if (!enabled) {
                    if (item) item.remove();
                    return true;
                }

                const isIncognito = typeof lite !== 'undefined' && lite.isIncognitoEnabled ? lite.isIncognitoEnabled() : false;

                if (!item) {
                    item = document.createElement('ytm-pivot-bar-item-renderer');
                    item.id = 'metube-incognito-pivot-item';
                    item.className = 'pivot-bar-item-tab';
                    item.setAttribute('role', 'tab');
                    item.setAttribute('tabindex', '0');

                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'pivot-bar-item-tab-content';

                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'pivot-bar-icon';

                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 24 24');
                    svg.style.width = '24px';
                    svg.style.height = '24px';
                    svg.style.display = 'block';
                    svg.style.margin = 'auto';

                    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path1.setAttribute('d', 'M17.06,13c-1.86,0 -3.42,1.33 -3.82,3.1 -0.95,-0.41 -1.82,-0.3 -2.48,-0.01C10.35,14.31 8.79,13 6.94,13 4.77,13 3,14.79 3,17s1.77,4 3.94,4c2.06,0 3.74,-1.62 3.9,-3.68 0.34,-0.24 1.23,-0.61 2.32,0.02 0.19,2.05 1.85,3.66 3.9,3.66 2.17,0 3.94,-1.79 3.94,-4s-1.77,-4 -3.94,-4zM6.94,19.86c-1.56,0 -2.81,-1.28 -2.81,-2.86s1.26,-2.86 2.81,-2.86c1.56,0 2.81,1.28 2.81,2.86s-1.25,2.86 -2.81,2.86zM17.06,19.86c-1.56,0 -2.81,-1.28 -2.81,-2.86s1.26,-2.86 2.81,-2.86c1.56,0 2.81,1.28 2.81,2.86s-1.25,2.86 -2.81,2.86z');

                    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path2.setAttribute('d', 'M22,10.5L2,10.5c-0.55,0 -1,0.45 -1,1s0.45,1 1,1h20c0.55,0 1,-0.45 1,-1s-0.45,-1 -1,-1zM15.53,2.63c-0.17,-0.36 -0.57,-0.55 -0.96,-0.44L12,2.9l-2.58,-0.7c-0.39,-0.11 -0.79,0.08 -0.96,0.44L5.16,9.5h13.68l-3.31,-6.87z');

                    svg.appendChild(path1);
                    svg.appendChild(path2);
                    iconDiv.appendChild(svg);

                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'pivot-bar-item-title';
                    titleDiv.textContent = 'Incognito';

                    contentDiv.appendChild(iconDiv);
                    contentDiv.appendChild(titleDiv);
                    item.appendChild(contentDiv);

                    DOM.bind(item, 'click', (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if (typeof lite !== 'undefined' && lite.toggleIncognito) {
                            lite.toggleIncognito();
                        }
                    }, true);
                }

                const svg = item.querySelector('svg');
                const title = item.querySelector('.pivot-bar-item-title');

                if (isIncognito) {
                    if (svg) svg.style.setProperty('fill', '#ff0000', 'important');
                    if (title) {
                        title.style.setProperty('color', '#ff0000', 'important');
                        title.style.setProperty('font-weight', 'bold', 'important');
                    }
                } else {
                    if (svg) svg.style.setProperty('fill', '#ffffff', 'important');
                    if (title) {
                        title.style.setProperty('color', '#aaaaaa', 'important');
                        title.style.setProperty('font-weight', 'normal', 'important');
                    }
                }

                if (item.parentNode !== pivotBar) {
                    pivotBar.appendChild(item);
                }
                return true;
            }
        };

        // Notifications item injection into bottom navigation bar.
        const NotificationsPivot = {
            unreadCount: null,
            unreadFetching: false,
            unreadRetries: 0,
            readKeys: null,
            readStorageKey: 'metube.notifications.read.v2',
            run(ctx) {
                const pivotBar = document.querySelector('ytm-pivot-bar-renderer');
                if (!pivotBar) return true;

                let enabled = true;
                if (typeof lite !== 'undefined' && lite.getPreferences) {
                    try {
                        const prefs = JSON.parse(lite.getPreferences());
                        if (prefs && prefs.enable_notifications_button === false) {
                            enabled = false;
                        }
                    } catch (e) {}
                }

                let item = document.getElementById('metube-notifications-pivot-item');

                if (!enabled) {
                    if (item) item.remove();
                    return true;
                }

                if (!item) {
                    item = document.createElement('ytm-pivot-bar-item-renderer');
                    item.id = 'metube-notifications-pivot-item';
                    item.className = 'pivot-bar-item-tab';
                    item.setAttribute('role', 'tab');
                    item.setAttribute('tabindex', '0');

                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'pivot-bar-item-tab-content';

                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'pivot-bar-icon';
                    iconDiv.style.position = 'relative';

                    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    svg.setAttribute('viewBox', '0 0 24 24');
                    svg.style.width = '24px';
                    svg.style.height = '24px';
                    svg.style.display = 'block';
                    svg.style.margin = 'auto';
                    svg.style.setProperty('fill', '#ffffff', 'important');

                    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', 'M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.89,2 2,2zM18,16v-5c0,-3.07 -1.63,-5.64 -4.5,-6.32L13.5,4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5l0,0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z');
                    path.setAttribute('fill', '#ffffff');
                    svg.appendChild(path);
                    iconDiv.appendChild(svg);

                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'pivot-bar-item-title';
                    titleDiv.textContent = 'Notifications';

                    contentDiv.appendChild(iconDiv);
                    contentDiv.appendChild(titleDiv);
                    item.appendChild(contentDiv);

                    DOM.bind(item, 'click', (e) => {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        if (typeof lite !== 'undefined' && lite.openTab) {
                            lite.openTab('https://m.youtube.com/feed/notifications', 'notifications');
                        }
                    }, true);
                }

                if (item.parentNode !== pivotBar) {
                    pivotBar.appendChild(item);
                }

                NotificationsPivot.fetchUnreadOnce();
                if (NotificationsPivot.unreadCount !== null) {
                    NotificationsPivot.setBadge(NotificationsPivot.unreadCount);
                }
                return true;
            },

            setBadge(count) {
                const item = document.getElementById('metube-notifications-pivot-item');
                if (!item) return;
                const iconDiv = item.querySelector('.pivot-bar-icon');
                if (!iconDiv) return;
                let badge = document.getElementById('metube-notifications-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.id = 'metube-notifications-badge';
                    badge.style.cssText = 'position: absolute; top: -6px; right: -10px; min-width: 16px; height: 16px; border-radius: 8px; background: #f00; color: #fff; font-size: 10px; font-weight: 600; line-height: 16px; text-align: center; padding: 0 4px; box-sizing: border-box; pointer-events: none;';
                    iconDiv.appendChild(badge);
                }
                badge.textContent = count > 99 ? '99+' : String(count);
                badge.style.display = count > 0 && NotificationsPivot.badgeAllowed() ? 'block' : 'none';
            },

            badgeAllowed() {
                try {
                    const prefs = JSON.parse(lite.getPreferences() || '{}');
                    return prefs.enable_notifications_badge !== false;
                } catch (e) {
                    return true;
                }
            },

            getReadKeys() {
                if (NotificationsPivot.readKeys) return NotificationsPivot.readKeys;
                NotificationsPivot.readKeys = new Set();
                try {
                    const raw = localStorage.getItem(NotificationsPivot.readStorageKey);
                    if (raw) {
                        JSON.parse(raw).forEach(k => NotificationsPivot.readKeys.add(k));
                    }
                } catch (e) {}
                return NotificationsPivot.readKeys;
            },

            saveReadKeys() {
                try {
                    localStorage.setItem(NotificationsPivot.readStorageKey, JSON.stringify(Array.from(NotificationsPivot.getReadKeys())));
                } catch (e) {}
            },

            urlOf(nr) {
                try {
                    if (nr.navigationEndpoint && nr.navigationEndpoint.commandMetadata && nr.navigationEndpoint.commandMetadata.webCommandMetadata) {
                        return nr.navigationEndpoint.commandMetadata.webCommandMetadata.url || '';
                    }
                } catch (e) {}
                return '';
            },

            urlKey(url) {
                if (!url) return '';
                let m = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
                if (m) return 'v:' + m[1];
                m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
                if (m) return 'v:' + m[1];
                return url.split('?')[0];
            },

            isEffectivelyUnread(nr) {
                if (!nr || nr.read !== false) return false;
                const url = NotificationsPivot.urlOf(nr);
                return !(url && NotificationsPivot.getReadKeys().has(NotificationsPivot.urlKey(url)));
            },

            markRead(nr) {
                const url = NotificationsPivot.urlOf(nr);
                if (!url) return;
                NotificationsPivot.getReadKeys().add(NotificationsPivot.urlKey(url));
                NotificationsPivot.saveReadKeys();
            },

            markAllRead(items) {
                let changed = false;
                for (const item of items || []) {
                    if (!item.notificationRenderer) continue;
                    const url = NotificationsPivot.urlOf(item.notificationRenderer);
                    if (!url) continue;
                    const key = NotificationsPivot.urlKey(url);
                    if (!NotificationsPivot.getReadKeys().has(key)) {
                        NotificationsPivot.getReadKeys().add(key);
                        changed = true;
                    }
                }
                if (changed) {
                    NotificationsPivot.saveReadKeys();
                }
            },

            fetchUnreadOnce() {
                if (NotificationsPivot.unreadCount !== null || NotificationsPivot.unreadFetching) return;
                if (typeof lite === 'undefined' || !lite.fetchNotificationsInbox) {
                    NotificationsPivot.unreadCount = 0;
                    return;
                }
                NotificationsPivot.unreadFetching = true;
                let valid = false;
                try {
                    const payload = lite.fetchNotificationsInbox();
                    if (payload) {
                        try {
                            const data = JSON.parse(payload);
                            const items = NotificationsPivot.collectItems(data);
                            if (items) {
                                NotificationsPivot.unreadCount = NotificationsPivot.countUnread(data);
                                valid = true;
                            }
                        } catch (e) {}
                    }
                } catch (e) {}
                NotificationsPivot.unreadFetching = false;
                if (!valid) {
                    NotificationsPivot.unreadRetries += 1;
                    if (NotificationsPivot.unreadRetries <= 4) {
                        setTimeout(NotificationsPivot.fetchUnreadOnce, 4000);
                    } else {
                        NotificationsPivot.unreadCount = 0;
                    }
                    return;
                }
                NotificationsPivot.unreadRetries = 0;
                NotificationsPivot.setBadge(NotificationsPivot.unreadCount || 0);
            },

            collectItems(data) {
                const found = [];
                const walk = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (obj.multiPageMenuNotificationSectionRenderer && Array.isArray(obj.multiPageMenuNotificationSectionRenderer.items)) {
                        found.push(obj.multiPageMenuNotificationSectionRenderer.items);
                        return;
                    }
                    if (Array.isArray(obj)) {
                        for (const entry of obj) walk(entry);
                    } else {
                        for (const key of Object.keys(obj)) walk(obj[key]);
                    }
                };
                walk(data);
                return found.length > 0 ? found[0] : null;
            },

            countUnread(data) {
                let count = 0;
                const walk = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    if (obj.multiPageMenuNotificationSectionRenderer && Array.isArray(obj.multiPageMenuNotificationSectionRenderer.items)) {
                        for (const it of obj.multiPageMenuNotificationSectionRenderer.items) {
                            if (it.notificationRenderer && NotificationsPivot.isEffectivelyUnread(it.notificationRenderer)) count++;
                        }
                        return;
                    }
                    if (Array.isArray(obj)) {
                        for (const entry of obj) walk(entry);
                    } else {
                        for (const key of Object.keys(obj)) walk(obj[key]);
                    }
                };
                walk(data);
                return count;
            }
        };

        // Fixed left-to-right order for bottom navigation bar items.
        // Home, Shorts, Incognito, Subscriptions, Notifications, Profile, then any extras.
        const PivotBarOrder = {
            bodyObserver: null,

            needsFix(pivotBar) {
                if (!pivotBar) return false;
                const children = Array.from(pivotBar.children);
                if (children.length < 2) return false;
                const sorted = children
                    .map((child, index) => ({ child, key: pivotKeyOf(child), index }))
                    .sort((a, b) => a.key - b.key || a.index - b.index);
                for (let i = 0; i < sorted.length; i++) {
                    if (pivotBar.children[i] !== sorted[i].child) return true;
                }
                return false;
            },

            run(ctx) {
                if (!PivotBarOrder.bodyObserver && typeof MutationObserver === 'function' && document.body) {
                    PivotBarOrder.bodyObserver = new MutationObserver(() => {
                        if (PivotBarOrder.needsFix(document.querySelector('ytm-pivot-bar-renderer')) && App.isActive()) {
                            Loop.runSoon();
                        }
                    });
                    PivotBarOrder.bodyObserver.observe(document.body, { childList: true, subtree: true });
                }

                enforcePivotOrder();
                return true;
            }
        };

        // Empty-state and actual feed rendering for the notifications tab.
        const NotificationsFeed = {
            rendered: null,
            observer: null,
            run(ctx) {
                if (ctx.pageClass !== 'notifications') {
                    NotificationsFeed.rendered = null;
                    NotificationsFeed.removeFeed();
                    NotificationsFeed.disarmGuard();
                    return true;
                }
                if (NotificationsFeed.rendered === location.href) {
                    if (document.getElementById('metube-notifications-feed')) return true;
                    NotificationsFeed.rendered = null;
                }
                NotificationsFeed.rendered = location.href;

                if (document.querySelector('ytm-section-list-renderer, ytm-rich-grid-renderer')) {
                    return true;
                }

                const container = document.querySelector('ytm-app');
                if (!container) {
                    return false;
                }

                let payload = null;
                if (typeof lite !== 'undefined' && lite.fetchNotificationsInbox) {
                    try {
                        payload = lite.fetchNotificationsInbox();
                    } catch (e) {
                        console.log("Exception fetching notifications payload: " + e);
                    }
                }
                if (payload) {
                    NotificationsFeed.renderFeed(container, payload);
                    NotificationsFeed.armGuard(container);
                }
                return true;
            },

            armGuard(container) {
                if (NotificationsFeed.observer) return;
                NotificationsFeed.observer = new MutationObserver(() => {
                    if (Page.type(location.href) !== 'notifications') return;
                    if (!document.getElementById('metube-notifications-feed')) {
                        NotificationsFeed.rendered = null;
                        Loop.runSoon();
                    }
                });
                NotificationsFeed.observer.observe(container, { childList: true, subtree: true });
            },

            disarmGuard() {
                if (!NotificationsFeed.observer) return;
                NotificationsFeed.observer.disconnect();
                NotificationsFeed.observer = null;
            },

            renderFeed(container, payload) {
                NotificationsFeed.removeFeed();
                const box = document.createElement('div');
                box.id = 'metube-notifications-feed';
                box.style.padding = '20px';
                box.style.color = '#fff';

                let data = null;
                try {
                    data = JSON.parse(payload);
                } catch (e) {
                    box.textContent = "Error parsing JSON: " + e.message + "\n\nPayload: " + (payload ? payload.substring(0, 200) : 'null');
                    container.appendChild(box);
                    return;
                }
                
                if (!data) {
                    box.textContent = "Payload is null or empty.";
                    container.appendChild(box);
                    return;
                }
                
                if (data.error_debug) {
                    box.textContent = "Backend Error: " + data.error_debug;
                    container.appendChild(box);
                    return;
                }

                // Deep search for notifications or empty state
                let promo = null;
                let notificationItems = null;
                
                const searchTree = (obj) => {
                    if (!obj || typeof obj !== 'object') return;
                    
                    if (obj.backgroundPromoRenderer) {
                        promo = obj.backgroundPromoRenderer;
                    }
                    if (obj.multiPageMenuNotificationSectionRenderer && obj.multiPageMenuNotificationSectionRenderer.items) {
                        notificationItems = obj.multiPageMenuNotificationSectionRenderer.items;
                    }
                    
                    if (promo || notificationItems) return;
                    
                    if (Array.isArray(obj)) {
                        for (const item of obj) searchTree(item);
                    } else {
                        for (const key of Object.keys(obj)) searchTree(obj[key]);
                    }
                };
                
                searchTree(data);
                
                if (!promo && (!notificationItems || notificationItems.length === 0)) {
                    // Debug output if nothing was found
                    let rootKeys = Object.keys(data).join(', ');
                    let endpoints = data.onResponseReceivedEndpoints ? 'has endpoints' : 'no endpoints';
                    let contents = data.contents ? 'has contents' : 'no contents';
                    box.innerHTML = `<h3>Debug: No notifications found in JSON</h3>
                                     <p>Root keys: ${rootKeys}</p>
                                     <p>Endpoints: ${endpoints}</p>
                                     <p>Contents: ${contents}</p>
                                     <p>Payload preview: ${payload.substring(0, 300)}</p>`;
                    container.appendChild(box);
                    return;
                }
                
                // Clear debug styles
                box.style.padding = '';
                box.style.color = '';
                
                if (promo) {
                    box.appendChild(NotificationsFeed.createEmptyState(promo));
                } else if (notificationItems) {
                    const list = NotificationsFeed.createNotificationsList(notificationItems);
                    const unread = notificationItems.filter(it => it.notificationRenderer && NotificationsPivot.isEffectivelyUnread(it.notificationRenderer)).length;
                    if (unread > 0) {
                        const markAllBtn = document.createElement('button');
                        markAllBtn.id = 'metube-notifications-mark-all';
                        markAllBtn.textContent = 'Mark all as read';
                        markAllBtn.style.cssText = `
                            align-self: flex-start;
                            margin: 8px 16px;
                            padding: 10px 16px;
                            border: none;
                            border-radius: 18px;
                            background: rgba(255, 255, 255, 0.1);
                            color: var(--yt-spec-text-primary, #ffffff);
                            font-size: 1.4rem;
                            font-weight: 500;
                            cursor: pointer;
                        `;
                        DOM.bind(markAllBtn, 'click', () => {
                            NotificationsPivot.markAllRead(notificationItems);
                            document.querySelectorAll('#metube-notifications-feed .metube-notifications-list > div').forEach(d => {
                                d.style.backgroundColor = '';
                            });
                            markAllBtn.remove();
                            NotificationsPivot.unreadCount = 0;
                            NotificationsPivot.setBadge(0);
                        });
                        box.appendChild(markAllBtn);
                    }
                    box.appendChild(list);
                    NotificationsPivot.unreadCount = unread;
                    NotificationsPivot.setBadge(unread);
                }

                const spinner = container.querySelector('.spinner');
                const refNode = spinner instanceof Element ? spinner : container.firstElementChild;
                if (refNode instanceof Element) {
                    container.insertBefore(box, refNode);
                } else {
                    container.appendChild(box);
                }
            },
            
            createEmptyState(data) {
                const box = document.createElement('div');
                box.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 64px 32px;
                    gap: 12px;
                `;

                const iconDiv = document.createElement('div');
                iconDiv.style.cssText = 'opacity: 0.6; margin-bottom: 8px;';
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 24 24');
                svg.style.cssText = 'width: 56px; height: 56px; display: block; fill: currentColor;';
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', 'M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.89,2 2,2zM18,16v-5c0,-3.07 -1.63,-5.64 -4.5,-6.32L13.5,4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5l0,0.68C7.63,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z');
                svg.appendChild(path);
                iconDiv.appendChild(svg);
                box.appendChild(iconDiv);

                let titleText = data.title;
                if (titleText && typeof titleText === 'object') {
                    titleText = titleText.runs ? titleText.runs.map(r => r.text).join('') : titleText.simpleText;
                }
                if (titleText) {
                    const title = document.createElement('h2');
                    title.textContent = titleText;
                    title.style.cssText = `
                        font-family: "YouTube Sans", "Roboto", sans-serif;
                        font-size: 1.8rem;
                        font-weight: 600;
                        color: var(--yt-spec-text-primary, #ffffff);
                        margin: 0;
                    `;
                    box.appendChild(title);
                }
                
                let bodyText = data.bodyText || data.body;
                if (bodyText && typeof bodyText === 'object') {
                    bodyText = bodyText.runs ? bodyText.runs.map(r => r.text).join('') : bodyText.simpleText;
                }
                if (bodyText) {
                    const body = document.createElement('p');
                    body.textContent = bodyText;
                    body.style.cssText = `
                        font-size: 1.4rem;
                        line-height: 1.5;
                        color: var(--yt-spec-text-secondary, #aaaaaa);
                        margin: 0;
                        max-width: 32rem;
                    `;
                    box.appendChild(body);
                }
                
                return box;
            },
            
            createNotificationsList(items) {
                const list = document.createElement('div');
                list.className = 'metube-notifications-list';
                list.style.cssText = `
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                `;
                
                for (const item of items) {
                    if (!item.notificationRenderer) continue;
                    const nr = item.notificationRenderer;
                    
                    const el = document.createElement('div');
                    el.style.cssText = `
                        display: flex;
                        flex-direction: row;
                        align-items: center;
                        padding: 16px;
                        border-bottom: 1px solid var(--yt-spec-10-percent-layer, rgba(255, 255, 255, 0.1));
                        cursor: pointer;
                    `;
                    
                    if (NotificationsPivot.isEffectivelyUnread(nr)) {
                        el.style.backgroundColor = 'var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1))';
                    }
                    
                    // Thumbnail
                    const thumbDiv = document.createElement('div');
                    thumbDiv.style.cssText = `
                        width: 56px;
                        height: 56px;
                        flex-shrink: 0;
                        border-radius: 50%;
                        overflow: hidden;
                        margin-right: 16px;
                        background: var(--yt-spec-10-percent-layer, rgba(255,255,255,0.1));
                    `;
                    if (nr.thumbnail && nr.thumbnail.thumbnails && nr.thumbnail.thumbnails.length > 0) {
                        const img = document.createElement('img');
                        img.src = nr.thumbnail.thumbnails[0].url;
                        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                        thumbDiv.appendChild(img);
                    }
                    el.appendChild(thumbDiv);
                    
                    // Text Content
                    const textDiv = document.createElement('div');
                    textDiv.style.cssText = `
                        display: flex;
                        flex-direction: column;
                        flex-grow: 1;
                        justify-content: center;
                    `;
                    
                    const message = document.createElement('div');
                    message.style.cssText = `
                        font-size: 1.4rem;
                        color: var(--yt-spec-text-primary, #ffffff);
                        margin-bottom: 4px;
                        line-height: 1.4;
                        display: -webkit-box;
                        -webkit-line-clamp: 3;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    `;
                    
                    if (nr.shortMessage) {
                        if (nr.shortMessage.runs) {
                            nr.shortMessage.runs.forEach(r => {
                                const span = document.createElement('span');
                                span.textContent = r.text;
                                if (r.bold) span.style.fontWeight = '500';
                                message.appendChild(span);
                            });
                        } else if (nr.shortMessage.simpleText) {
                            message.textContent = nr.shortMessage.simpleText;
                        }
                    }
                    textDiv.appendChild(message);
                    
                    const time = document.createElement('div');
                    time.style.cssText = `
                        font-size: 1.2rem;
                        color: var(--yt-spec-text-secondary, #aaaaaa);
                    `;
                    if (nr.sentTimeText) {
                        time.textContent = nr.sentTimeText.runs ? nr.sentTimeText.runs.map(r => r.text).join('') : nr.sentTimeText.simpleText;
                    }
                    textDiv.appendChild(time);
                    el.appendChild(textDiv);
                    
                    // Click handler
                    if (nr.navigationEndpoint && nr.navigationEndpoint.commandMetadata && nr.navigationEndpoint.commandMetadata.webCommandMetadata) {
                        const url = nr.navigationEndpoint.commandMetadata.webCommandMetadata.url;
                        if (url) {
                            DOM.bind(el, 'click', () => {
                                if (NotificationsPivot.isEffectivelyUnread(nr)) {
                                    nr.read = true;
                                    el.style.backgroundColor = '';
                                    NotificationsPivot.markRead(nr);
                                    NotificationsFeed.markRead();
                                }
                                if (typeof lite !== 'undefined' && lite.openTab) {
                                    lite.openTab('https://m.youtube.com' + url, 'watch');
                                } else {
                                    window.location.href = url;
                                }
                            });
                        }
                    }
                    
                    list.appendChild(el);
                }
                
                return list;
            },

            markRead() {
                if (NotificationsPivot.unreadCount !== null && NotificationsPivot.unreadCount > 0) {
                    NotificationsPivot.unreadCount -= 1;
                }
                NotificationsPivot.setBadge(NotificationsPivot.unreadCount || 0);
            },

            removeFeed() {
                const existing = document.getElementById('metube-notifications-feed');
                if (existing) existing.remove();
                const oldEmpty = document.getElementById('metube-notifications-empty-state');
                if (oldEmpty) oldEmpty.remove();
            }
        };

        // Community multi-image callback.
        const Post = {
            init() {
                Post.tap(document, (event) => {
                    const renderer = event.target.closest('ytm-post-multi-image-renderer');
                    if (!renderer) return;
                    const imageUrls = [...renderer.querySelectorAll('ytm-backstage-image-renderer')]
                        .map(el => el?.data?.image?.thumbnails?.at(-1)?.url);
                    lite.onPosterLongPress(JSON.stringify(imageUrls));
                });
            },

            tap(element, handler) {
                let startX;
                let startY;
                DOM.bind(element, 'touchstart', (event) => {
                    const point = DOM.point(event);
                    startX = point?.clientX;
                    startY = point?.clientY;
                }, { passive: true, capture: true });
                DOM.bind(element, 'touchend', (event) => {
                    const point = DOM.point(event);
                    if (!Number.isFinite(point?.clientX) || !Number.isFinite(point?.clientY)) return;
                    const dx = Math.abs(point.clientX - startX);
                    const dy = Math.abs(point.clientY - startY);
                    if (dx < Config.tapPx && dy < Config.tapPx) handler(event);
                }, { passive: true, capture: true });
            }
        };

        const syncAccountAndInjectHeader = () => {
            try {
                // Auto-save the currently logged-in account silently by reading the account name from the page.
                const header = document.querySelector('ytm-active-account-header-renderer') 
                    || document.querySelector('.ytm-active-account-header-renderer');
                if (header) {
                    const nameEl = header.querySelector('[class*="name"]') || header.querySelector('h1');
                    if (nameEl && nameEl.textContent) {
                        const name = nameEl.textContent.trim();
                        if (name && name.length > 0 && !name.includes('\n') && typeof lite !== 'undefined' && lite.syncAccount) {
                            lite.syncAccount(name);
                        }
                    }
                }
            } catch (e) {}
        };
        setInterval(syncAccountAndInjectHeader, 600);

        // Custom Seek Bar for Shorts
        const ShortsSeekBar = {
            init() {
                if (document.getElementById('metube-custom-shorts-seek')) return;

                const container = document.createElement('div');
                container.id = 'metube-custom-shorts-seek';
                container.style.cssText = `
                    position: fixed;
                    bottom: 52px;
                    left: 0;
                    right: 0;
                    height: 16px;
                    background: rgba(0,0,0,0.4);
                    z-index: 99999;
                    display: none; /* managed by observer */
                    align-items: center;
                    padding: 0;
                `;

                const input = document.createElement('input');
                input.type = 'range';
                input.min = '0';
                input.max = '100';
                input.step = '0.1';
                input.value = '0';
                input.style.cssText = `
                    width: 100%;
                    height: 4px;
                    margin: 0;
                    -webkit-appearance: none;
                    background: rgba(255, 255, 255, 0.3);
                    outline: none;
                `;
                
                const style = document.createElement('style');
                style.textContent = `
                    #metube-custom-shorts-seek input[type=range]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        background: #e50914;
                        cursor: pointer;
                    }
                    #metube-custom-shorts-seek input[type=range]::-moz-range-thumb {
                        width: 14px;
                        height: 14px;
                        border-radius: 50%;
                        background: #e50914;
                        cursor: pointer;
                        border: none;
                    }
                `;
                document.head.appendChild(style);

                container.appendChild(input);
                document.body.appendChild(container);

                let isDragging = false;
                let activeVideo = null;

                const findVideo = () => {
                    const videos = Array.from(document.querySelectorAll('video'));
                    return videos.find(v => !v.paused) || videos[0];
                };

                setInterval(() => {
                    if (isDragging || container.style.display === 'none') return;
                    activeVideo = findVideo();
                    if (activeVideo && activeVideo.duration) {
                        const percent = (activeVideo.currentTime / activeVideo.duration) * 100;
                        input.value = percent;
                        input.style.background = \`linear-gradient(to right, #e50914 \${percent}%, rgba(255,255,255,0.3) \${percent}%)\`;
                    }
                }, 100);

                input.addEventListener('input', (e) => {
                    isDragging = true;
                    const percent = parseFloat(e.target.value);
                    input.style.background = \`linear-gradient(to right, #e50914 \${percent}%, rgba(255,255,255,0.3) \${percent}%)\`;
                });

                input.addEventListener('change', (e) => {
                    if (activeVideo && activeVideo.duration) {
                        const percent = parseFloat(e.target.value);
                        activeVideo.currentTime = (percent / 100) * activeVideo.duration;
                    }
                    isDragging = false;
                });
                
                input.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
                input.addEventListener('touchend', () => { isDragging = false; }, { passive: true });
            },
            
            observe() {
                ShortsSeekBar.init();
                setInterval(() => {
                    const seekbar = document.getElementById('metube-custom-shorts-seek');
                    if (!seekbar) return;
                    if (window.location.pathname.startsWith('/shorts')) {
                        seekbar.style.display = 'flex';
                    } else {
                        seekbar.style.display = 'none';
                    }
                }, 500);
            }
        };

        ShortsSeekBar.observe();
        App.init();
    } catch (error) {
        console.error('Error in injected script:', error);
        throw error;
    }
})();
