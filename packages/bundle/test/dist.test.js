import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

/**
 * Loads the built scripts into a fresh JSDOM window, the way a page would.
 * Run `npm run build` first; the suite is skipped when dist/ is missing.
 */
var dist = resolve(__dirname, '../../../dist');
var built = existsSync(resolve(dist, 'manifest.json'));
var read = (file) => readFileSync(resolve(dist, file), 'utf8');

function page(scripts, html, beforeScripts) {
    var dom = new JSDOM('<!doctype html><body>' + (html || '') + '</body>', { runScripts: 'outside-only', pretendToBeVisual: true });
    var window = dom.window;
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    if (beforeScripts) beforeScripts(window);
    scripts.forEach((file) => window.eval(read(file)));
    return window;
}

describe.skipIf(!built)('built scripts', () => {
    var MODULES = ['text', 'children', 'cursor', 'gradient', 'morph-card', 'highlight'];

    it('the all-in-one bundle exposes Aurora with every module', () => {
        var window = page(['aurora.min.js']);
        expect(typeof window.Aurora.register).toBe('function');
        ['text', 'children', 'cursor', 'gradient', 'morphCard'].forEach((name) => {
            expect(typeof window.Aurora[name]).toBe('function');
        });
        expect(window.Aurora.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('the runtime plus one module script share window.Aurora', () => {
        MODULES.forEach((name) => {
            var window = page(['aurora.core.min.js', 'aurora.' + name + '.min.js']);
            var camel = name.replace(/-([a-z])/g, (m, c) => c.toUpperCase());
            expect(typeof window.Aurora[camel]).toBe('function');
            expect(window.Aurora.modules().map((m) => m.name)).toEqual([name]);
        });
    });

    it('loading module scripts in any order after the runtime registers all of them', () => {
        var window = page(['aurora.core.min.js'].concat(MODULES.map((m) => 'aurora.' + m + '.min.js')));
        expect(window.Aurora.modules()).toHaveLength(MODULES.length);
    });

    it('loading the all-in-one bundle twice does not create a second runtime', () => {
        var window = page(['aurora.min.js']);
        var first = window.Aurora;
        window.eval(read('aurora.min.js'));
        expect(window.Aurora).toBe(first);
    });

    it('AuroraConfig.autoInit false skips the automatic scan', async () => {
        var window = page(['aurora.min.js'], '<div id="c" data-aurora-cursor></div>', (w) => { w.AuroraConfig = { autoInit: false }; });
        if (window.document.readyState !== 'complete') await new Promise((done) => window.addEventListener('load', done));
        expect(window.Aurora.get(window.document.getElementById('c'), 'cursor')).toBeNull();
    });

    it('auto-initializes elements once the document is parsed', async () => {
        var window = page(['aurora.min.js'], '<div id="c" data-aurora-cursor></div>');
        if (window.document.readyState !== 'complete') await new Promise((done) => window.addEventListener('load', done));
        expect(window.Aurora.get(window.document.getElementById('c'), 'cursor')).not.toBeNull();
    });

    it('marks the page with html.aurora-ready after the first initialization', async () => {
        var window = page(['aurora.min.js'], '<div id="c" data-aurora-cursor></div>');
        var events = 0;
        window.document.addEventListener('aurora:ready', () => events++);
        if (window.document.readyState !== 'complete') await new Promise((done) => window.addEventListener('load', done));
        expect(window.document.documentElement.classList.contains('aurora-ready')).toBe(true);
        expect(events).toBeLessThanOrEqual(1);
    });

    it('the manifest lists every file with integrity hashes and every module schema', () => {
        var manifest = JSON.parse(read('manifest.json'));
        expect(manifest.files.map((f) => f.file)).toContain('aurora.min.js');
        manifest.files.forEach((f) => expect(f.integrity).toMatch(/^sha384-/));
        expect(Object.keys(manifest.schemas).sort()).toEqual(MODULES.slice().sort());
    });
});
