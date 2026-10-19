/**
 * Prepares the block editor plugin (adapters/blocks):
 *
 *   packages/<module>          ->  adapters/blocks/assets/js/aurora/aurora.<module>.min.js
 *   packages/core              ->  adapters/blocks/assets/js/aurora/aurora.core.min.js
 *   module schemas             ->  adapters/blocks/includes/generated/schemas.json
 *
 * Only the modules the block adapter offers are built, with the same Vite
 * settings as tools/build.mjs, so this works without the animated-headlines
 * engine that the headline, counter and highlight modules need.
 *
 * The plugin builds its inspector controls and sanitizes saved options from
 * schemas.json, so the schemas stay the single source of truth.
 */

import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
var plugin = resolve(root, 'adapters/blocks');
var out = resolve(plugin, 'assets/js/aurora');
var version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
var src = (name) => resolve(root, 'packages/bundle/src', name);

// Modules shipped with the block adapter: the inspector modules
// (Plugin::MODULES) plus the Morph Card block. Keep in sync with Plugin::SCRIPTS.
var MODULES = ['text', 'children', 'gradient', 'cursor', 'morph-card'];

var BUDGETS = JSON.parse(readFileSync(resolve(root, 'tools/budgets.json'), 'utf8'));

var targets = [{ file: 'aurora.core.min.js', entry: src('entry-core.js'), name: 'AuroraRuntime' }].concat(
    MODULES.map((m) => ({ file: 'aurora.' + m + '.min.js', entry: src('entry-' + m + '.js'), name: 'AuroraModule', external: true }))
);

async function buildIife(target) {
    await build({
        configFile: false,
        logLevel: 'warn',
        define: { __AURORA_VERSION__: JSON.stringify(version) },
        build: {
            outDir: out,
            emptyOutDir: false,
            sourcemap: false,
            minify: 'esbuild',
            target: 'es2018',
            lib: { entry: target.entry, name: target.name, formats: ['iife'], fileName: () => target.file },
            rollupOptions: target.external
                ? { external: ['@aurora/core'], output: { globals: { '@aurora/core': 'AuroraCore' } } }
                : {},
        },
        resolve: {
            dedupe: ['@aurora/core'],
        },
    });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (var target of targets) await buildIife(target);

var failures = [];
targets.forEach(function (t) {
    var gzip = gzipSync(readFileSync(resolve(out, t.file)), { level: 9 }).length;
    var budget = BUDGETS[t.file];
    console.log(t.file.padEnd(28) + (gzip / 1024).toFixed(1) + ' KB gzip' + (budget ? ' (budget ' + (budget / 1024).toFixed(1) + ' KB)' : ''));
    if (budget && gzip > budget) failures.push(t.file);
});

var schemas = {};
for (var name of MODULES) {
    schemas[name] = (await import('@aurora/' + name)).schema;
}
mkdirSync(resolve(plugin, 'includes/generated'), { recursive: true });
writeFileSync(
    resolve(plugin, 'includes/generated/schemas.json'),
    JSON.stringify({ version: version, modules: schemas }, null, '\t') + '\n'
);
console.log('includes/generated/schemas.json written');

if (failures.length) {
    console.error('Over budget: ' + failures.join(', '));
    process.exit(1);
}
