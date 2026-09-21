import * as core from '@aurora/core';

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
    if (config.autoInit !== false && document.readyState !== 'loading') aurora.init();
    return aurora;
}
