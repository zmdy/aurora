import * as core from '@aurora/core';

/**
 * Marks the page as initialized: `html.aurora-ready` plus an `aurora:ready`
 * event on the document. Pages can use it to hide animated content until the
 * scripts have run, without a flash of unanimated content:
 *
 *     .aurora-js:not(.aurora-ready) [data-aurora-text] { visibility: hidden; }
 */
export function markReady() {
    var root = document.documentElement;
    if (root.classList.contains('aurora-ready')) return;
    root.classList.add('aurora-ready');
    document.dispatchEvent(new CustomEvent('aurora:ready'));
}

/**
 * Returns the page-wide Aurora instance, creating it on first use.
 *
 * Every Aurora script calls this, so several scripts (the runtime, one or
 * more modules, or the all-in-one bundle) share a single `window.Aurora`
 * regardless of the order they load in.
 *
 * Page settings live in `window.AuroraConfig`, defined before the scripts:
 *
 *     window.AuroraConfig = { autoInit: true, observe: true, nonce: '...' };
 */
export function getAurora() {
    if (window.Aurora && typeof window.Aurora.register === 'function') return window.Aurora;

    var config = window.AuroraConfig || {};
    var aurora = core.createAurora({ nonce: config.nonce, debug: !!config.debug });
    window.Aurora = aurora;
    window.AuroraCore = window.AuroraCore || core;

    if (config.autoInit !== false) {
        var start = function () {
            aurora.init();
            if (config.observe !== false) aurora.observe();
            markReady();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
        else start();
    }
    return aurora;
}

/**
 * Registers a module and initializes its elements right away when the page
 * is already parsed (module scripts are often loaded after DOMContentLoaded).
 */
export function registerModule(definition) {
    var aurora = getAurora();
    aurora.register(definition);
    var config = window.AuroraConfig || {};
    if (config.autoInit !== false && document.readyState !== 'loading') {
        aurora.init();
        markReady();
    }
    return aurora;
}
