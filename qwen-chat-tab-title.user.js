// ==UserScript==
// @name         Qwen Chat - Prepend Chat Title to Tab Title
// @namespace    https://github.com/endolith/Qwen-Chat-Tab-Title
// @version      1.0.0
// @description  Prepends the active chat title to the browser tab title on chat.qwen.ai (e.g. "Chat Title - Qwen Studio")
// @author       Arena.AI/endolith
// @match        https://chat.qwen.ai/*
// @match        https://chat.qwenlm.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=chat.qwen.ai
// @license      MIT
// @homepageURL  https://github.com/endolith/Qwen-Chat-Tab-Title
// @supportURL   https://github.com/endolith/Qwen-Chat-Tab-Title/issues
// @downloadURL  https://raw.githubusercontent.com/endolith/Qwen-Chat-Tab-Title/main/qwen-chat-tab-title.user.js
// @updateURL    https://raw.githubusercontent.com/endolith/Qwen-Chat-Tab-Title/main/qwen-chat-tab-title.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    /**
     * Configuration options
     */
    const CONFIG = {
        // Fallback base title if none is detected from the page
        defaultBaseTitle: 'Qwen Studio',
        // Separator between the chat title and the base title
        separator: ' - ',
        // Debounce delay (in ms) to avoid thrashing during rapid DOM updates
        debounceMs: 50,
        // Polling fallback interval (in ms) as a safety net
        pollIntervalMs: 1500,
    };

    let baseTitle = CONFIG.defaultBaseTitle;
    let lastAppliedTitle = '';
    let debounceTimer = null;
    const titleCache = new Map();

    /**
     * Extracts the chat ID from the current URL if available (e.g., /c/[chat-id])
     */
    function getChatIdFromUrl() {
        const match = window.location.pathname.match(/\/c\/([^/?#]+)/);
        return match ? match[1] : null;
    }

    /**
     * Cleans up whitespace and newlines from extracted text
     */
    function cleanText(text) {
        if (!text) return '';
        return text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Extracts the active chat title from the Qwen sidebar DOM
     */
    function extractChatTitle() {
        const chatId = getChatIdFromUrl();

        // 1. Check the active sidebar item
        const activeSelectors = [
            '.chat-item-drag-active .chat-item-title-text',
            '.chat-item-drag-link.chat-item-drag-active .chat-item-title-text',
            'a[aria-label="chat-item"].chat-item-drag-active .chat-item-title-text',
            '.chat-item-drag-active .chat-item-drag-link-content-tip-text',
            '.chat-item-drag-active [class*="title-text"]',
            '.chat-item-drag-active [class*="title"]',
            '.session-list .chat-item-drag-active .chat-item-title-text',
            '.sidebar .chat-item-drag-active .chat-item-title-text'
        ];

        for (const selector of activeSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                const text = cleanText(el.textContent);
                if (text) {
                    if (chatId) titleCache.set(chatId, text);
                    return text;
                }
            }
        }

        // 2. If chat ID is in URL, try finding a sidebar link referencing this chat ID
        if (chatId) {
            const idSelectors = [
                `a[href*="/c/${chatId}"] .chat-item-title-text`,
                `a[href*="${chatId}"] .chat-item-title-text`,
                `[data-chat-id="${chatId}"] .chat-item-title-text`,
                `[data-id="${chatId}"] .chat-item-title-text`,
                `a[href*="/c/${chatId}"]`
            ];

            for (const selector of idSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                    const text = cleanText(el.textContent);
                    if (text) {
                        titleCache.set(chatId, text);
                        return text;
                    }
                }
            }

            // Fallback to cached title for this chat ID if already known
            if (titleCache.has(chatId)) {
                return titleCache.get(chatId);
            }
        }

        // 3. Fallback: inspect any active conversation container element directly
        const activeContainer = document.querySelector('.chat-item-drag-active');
        if (activeContainer) {
            const clone = activeContainer.cloneNode(true);
            // Remove menu buttons, SVGs, and dropdowns to avoid noisy button text
            const ignoreElements = clone.querySelectorAll('button, svg, .anticon, .chat-item-drag-web, [role="button"]');
            ignoreElements.forEach(el => el.remove());

            const text = cleanText(clone.textContent);
            if (text) {
                if (chatId) titleCache.set(chatId, text);
                return text;
            }
        }

        return null;
    }

    /**
     * Determines the desired tab title and updates document.title
     */
    function updateTabTitle() {
        const chatId = getChatIdFromUrl();
        const chatTitle = extractChatTitle();

        // Update baseTitle dynamically if the current page has a clean base title
        if (document.title && !document.title.includes(CONFIG.separator)) {
            const trimmed = document.title.trim();
            if (trimmed && trimmed !== lastAppliedTitle) {
                baseTitle = trimmed;
            }
        }

        let desiredTitle;
        if (chatTitle) {
            desiredTitle = `${chatTitle}${CONFIG.separator}${baseTitle}`;
        } else if (chatId && titleCache.has(chatId)) {
            desiredTitle = `${titleCache.get(chatId)}${CONFIG.separator}${baseTitle}`;
        } else {
            desiredTitle = baseTitle;
        }

        if (document.title !== desiredTitle) {
            lastAppliedTitle = desiredTitle;
            document.title = desiredTitle;
        }
    }

    /**
     * Debounced wrapper for updateTabTitle
     */
    function debouncedUpdate() {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateTabTitle, CONFIG.debounceMs);
    }

    /**
     * Observes changes to <title> to prevent SPA routing resets
     */
    function initTitleObserver() {
        const target = document.querySelector('title') || document.head;
        if (!target) return;

        const titleObserver = new MutationObserver(() => {
            if (document.title !== lastAppliedTitle) {
                updateTabTitle();
            }
        });

        titleObserver.observe(target, {
            subtree: true,
            characterData: true,
            childList: true
        });
    }

    /**
     * Observes DOM mutations in the sidebar and document body
     */
    function initDomObserver() {
        const root = document.body || document.documentElement;
        if (!root) return;

        const bodyObserver = new MutationObserver((mutations) => {
            let relevant = false;
            for (const m of mutations) {
                if (m.target && m.target.nodeType === 1) {
                    const el = m.target;
                    // Check if mutation relates to sidebar, title text, or chat items
                    if (
                        el.classList?.contains('chat-item-title-text') ||
                        el.classList?.contains('chat-item-drag-active') ||
                        el.classList?.contains('chat-item-drag') ||
                        el.classList?.contains('session-list') ||
                        el.classList?.contains('sidebar') ||
                        el.closest?.('.sidebar') ||
                        el.closest?.('.session-list')
                    ) {
                        relevant = true;
                        break;
                    }
                }
            }

            if (relevant || mutations.length > 5) {
                debouncedUpdate();
            }
        });

        bodyObserver.observe(root, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    /**
     * Intercepts SPA history navigation (pushState, replaceState, popstate)
     */
    function setupUrlListeners() {
        const patchHistory = (type) => {
            const original = history[type];
            return function(...args) {
                const result = original.apply(this, args);
                debouncedUpdate();
                return result;
            };
        };

        history.pushState = patchHistory('pushState');
        history.replaceState = patchHistory('replaceState');
        window.addEventListener('popstate', debouncedUpdate);
    }

    /**
     * Main initialization function
     */
    function init() {
        setupUrlListeners();
        initTitleObserver();
        initDomObserver();
        updateTabTitle();
        setInterval(updateTabTitle, CONFIG.pollIntervalMs);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
