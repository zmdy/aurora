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

import { build } from 'esbuild';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets/js/src');
const DIST = path.join(ROOT, 'assets/js/dist');

/**
 * Discovers every effect file under src/effects/{gsap,anime}/ and derives
 * its effect id from the filename convention `{id}-{slug}.js`.
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

async function main() {
    const startTime = Date.now();
    const effects = discoverEffects();

    // Compile bundles and all effect chunks concurrently via esbuild
    const tasks = [
        build({
            entryPoints: [path.join(SRC, 'entries/editor.js')],
            outfile: path.join(DIST, 'aurora-text-editor.js'),
            bundle: true,
            minify: true,
            format: 'iife',
            globalName: 'AuroraTextEditorBundle',
        }),
        build({
            entryPoints: [path.join(SRC, 'entries/frontend-core.js')],
            outfile: path.join(DIST, 'aurora-text-core.js'),
            bundle: true,
            minify: true,
            format: 'iife',
            globalName: 'AuroraTextCoreBundle',
        }),
        ...effects.map((effect) =>
            build({
                entryPoints: [effect.file],
                outfile: path.join(DIST, 'effects', `${effect.id}.js`),
                bundle: true,
                minify: true,
                format: 'iife',
                globalName: `AuroraEffect_${effect.id.replace('-', '_')}`,
            })
        ),
    ];

    await Promise.all(tasks);

    const elapsed = Date.now() - startTime;
    console.log(`[build] Done in ${elapsed}ms. ${effects.length} effect chunks + 2 bundles written to assets/js/dist/.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
