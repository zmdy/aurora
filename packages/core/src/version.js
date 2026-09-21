/**
 * Core version. Replaced at build time by Vite's `define`
 * (`__AURORA_VERSION__`); falls back to a dev marker when running from source.
 */
/* global __AURORA_VERSION__ */
export const VERSION = typeof __AURORA_VERSION__ !== 'undefined' ? __AURORA_VERSION__ : '0.0.0-dev';
