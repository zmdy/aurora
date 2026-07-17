/**
 * Builds the Text Animation module's JS from assets/js/src/ into the flat,
 * dependency-free files the plugin actually enqueues (assets/js/dist/).
 *
 * Why not a single Vite/Rollup multi-entry build? Rollup's `iife` output
 * format explicitly does not support multi-entry "code-splitting" builds
 * (it throws if you give it >1 input while format is iife/umd) — and we
 * WANT flat, fully self-contained files (no shared/vendor chunk), since
 * PHP enqueues each one individually and expects a plain <script> that
 * runs standalone. So instead we invoke Vite's JS build() API once PER
 * entry, each producing exactly one output file:
 *
 *   - dist/aurora-text-editor.js   (core + ALL 25 effects, for the
 *                                   Elementor editor/preview context)
 *   - dist/aurora-text-core.js     (core runtime only, for the real
 *                                   frontend — no effects baked in)
 *   - dist/effects/{id}.js         (one tiny file per effect, each
 *                                   self-registering into
 *                                   window.AuroraTextEffects on load —
 *                                   this is what PHP conditionally
 *                                   enqueues per-widget on the real
 *                                   frontend)
 *
 * Run with: npm run build
 */

import { build } from 'vite';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets/js/src');
const DIST = path.join(ROOT, 'assets/js/dist');

/**
 * Discovers every effect file under src/effects/{gsap,anime}/ and derives
 * its effect id from the filename convention `{id}-{slug}.js`
 * (e.g. `gs-1-fade-up.js` -> `gs-1`, `ml-15-continuous-wave.js` -> `ml-15`).
 */
function discoverEffects() {
    const effects = [];
    for (const lib of ['gsap', 'anime']) {
        const dir = path.join(SRC, 'effects', lib);
        for (const file of readdirSync(dir).sort()) {
            if (!file.endsWith('.js')) continue;
            const match = file.match(/^((?:gs|ml)-\d+)-/);
            if (!match) {
                console.warn(`[build] Skipping ${file} — doesn't match the "{id}-{slug}.js" naming convention.`);
                continue;
            }
            effects.push({ id: match[1], file: path.join(dir, file) });
        }
    }
    return effects;
}

/**
 * Runs one isolated Vite build producing a single flat IIFE file.
 *
 * @param {string} entry     Absolute path to the JS entry file.
 * @param {string} outDir    Absolute output directory.
 * @param {string} fileName  Exact output filename (with .js extension).
 * @param {string} globalName  Unused in practice (our entries have no
 *                              meaningful default export consumed as a
 *                              global), but iife/umd formats require SOME
 *                              name to be configured.
 */
async function buildOne(entry, outDir, fileName, globalName) {
    await build({
        root: ROOT,
        logLevel: 'warn',
        build: {
            outDir,
            emptyOutDir: false,
            minify: 'esbuild',
            sourcemap: false,
            lib: {
                entry,
                formats: ['iife'],
                name: globalName,
                fileName: () => fileName,
            },
        },
    });
    console.log(`[build] ${path.relative(ROOT, entry)} -> ${path.relative(ROOT, path.join(outDir, fileName))}`);
}

async function main() {
    const effects = discoverEffects();

    await buildOne(
        path.join(SRC, 'entries/editor.js'),
        DIST,
        'aurora-text-editor.js',
        'AuroraTextEditorBundle'
    );

    await buildOne(
        path.join(SRC, 'entries/frontend-core.js'),
        DIST,
        'aurora-text-core.js',
        'AuroraTextCoreBundle'
    );

    for (const effect of effects) {
        await buildOne(
            effect.file,
            path.join(DIST, 'effects'),
            `${effect.id}.js`,
            `AuroraEffect_${effect.id.replace('-', '_')}`
        );
    }

    console.log(`[build] Done. ${effects.length} effect chunks + 2 bundles written to assets/js/dist/.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
