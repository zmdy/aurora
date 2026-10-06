/**
 * Builds every distributable script into dist/:
 *
 *   aurora.min.js              runtime + every module (one script)
 *   aurora.core.min.js         runtime only
 *   aurora.<module>.min.js     one module; loads after the runtime and shares its window.Aurora
 *   aurora.esm.js              ES module with every export, for bundlers
 *   manifest.json              versions, sizes, SRI hashes and option schemas
 *
 * Module scripts treat `@aurora/core` as the `AuroraCore` global that the
 * runtime script exposes, so the core is not duplicated in each of them.
 */

// No .map files are ever published alongside these bundles (tools/pack-elementor.mjs
// and tools/build-site.mjs both filter them out, and dist/ itself is gitignored), so
// sourcemaps stay off here too -- otherwise every published aurora.*.min.js carries a
// "//# sourceMappingURL=...map" comment that 404s in the browser of anyone who
// vendors these files (e.g. a plain script-tag integration), with nothing to disable it.

import { build } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

var root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
var dist = resolve(root, 'dist');
var pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
var version = pkg.version;
var src = (name) => resolve(root, 'packages/bundle/src', name);

// Gzipped size budgets in bytes. The build fails when a file grows past its budget.
var BUDGETS = JSON.parse(readFileSync(resolve(root, 'tools/budgets.json'), 'utf8'));

var MODULES = ['text', 'children', 'cursor', 'gradient', 'morph-card'];

var targets = [
    { file: 'aurora.min.js', entry: src('entry-all.js'), name: 'Aurora' },
    { file: 'aurora.core.min.js', entry: src('entry-core.js'), name: 'AuroraRuntime' },
].concat(MODULES.map((m) => ({ file: 'aurora.' + m + '.min.js', entry: src('entry-' + m + '.js'), name: 'AuroraModule', external: true })));

async function buildIife(target) {
    await build({
        configFile: false,
        logLevel: 'warn',
        define: { __AURORA_VERSION__: JSON.stringify(version) },
        build: {
            outDir: dist,
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
            // The runtime module must be the same instance across packages.
            dedupe: ['@aurora/core'],
        },
    });
}

async function buildEsm() {
    await build({
        configFile: false,
        logLevel: 'warn',
        define: { __AURORA_VERSION__: JSON.stringify(version) },
        build: {
            outDir: dist,
            emptyOutDir: false,
            sourcemap: false,
            minify: false,
            target: 'es2018',
            lib: { entry: src('index.js'), formats: ['es'], fileName: () => 'aurora.esm.js' },
        },
    });
}

function describeFile(file) {
    var bytes = readFileSync(resolve(dist, file));
    return {
        file: file,
        bytes: bytes.length,
        gzip: gzipSync(bytes, { level: 9 }).length,
        integrity: 'sha384-' + createHash('sha384').update(bytes).digest('base64'),
    };
}

async function collectSchemas() {
    var schemas = {};
    var entries = {
        text: '@aurora/text',
        children: '@aurora/children',
        cursor: '@aurora/cursor',
        gradient: '@aurora/gradient',
        'morph-card': '@aurora/morph-card',
    };
    for (var name of Object.keys(entries)) {
        var mod = await import(entries[name]);
        schemas[name] = mod.schema;
    }
    return schemas;
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (var target of targets) await buildIife(target);
await buildEsm();

var files = targets.map((t) => t.file).concat(['aurora.esm.js']).map(describeFile);

var failures = [];
files.forEach((info) => {
    var budget = BUDGETS[info.file];
    if (budget && info.gzip > budget) failures.push(info.file + ': ' + info.gzip + ' B gzip > budget ' + budget + ' B');
});

writeFileSync(resolve(dist, 'manifest.json'), JSON.stringify({
    name: 'aurora',
    version: version,
    files: files,
    schemas: await collectSchemas(),
}, null, 2) + '\n');

files.forEach((info) => console.log(info.file.padEnd(28) + String(info.bytes).padStart(8) + ' B  ' + String(info.gzip).padStart(7) + ' B gzip'));

if (failures.length) {
    console.error('\nSize budget exceeded:\n  ' + failures.join('\n  '));
    process.exit(1);
}
