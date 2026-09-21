/**
 * Builds the installable WordPress zip of the Elementor adapter:
 *
 *   npm run pack        ->  build/aurora-for-elementor.zip
 *
 * Runs the dist build and the schema generation first, then copies only the
 * files the plugin needs at runtime (no tests, no source maps).
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

var root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
var source = resolve(root, 'adapters/elementor');
var staging = resolve(root, 'build/pack');
var target = resolve(staging, 'aurora-for-elementor');
var zip = resolve(root, 'build/aurora-for-elementor.zip');

function run(cmd, args, cwd) {
    execFileSync(cmd, args, { cwd: cwd || root, stdio: 'inherit' });
}

run('node', ['tools/build.mjs']);
run('node', ['tools/generate-elementor.mjs']);

rmSync(staging, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

cpSync(source, target, {
    recursive: true,
    filter: function (path) {
        return !/[\\/]test([\\/]|$)/.test(path.slice(source.length)) && !/\.map$/.test(path) && !/aurora\.min\.js$/.test(path);
    },
});

cpSync(resolve(root, 'LICENSE'), resolve(target, 'LICENSE'));

if (existsSync(zip)) rmSync(zip);
try {
    run('zip', ['-rq', zip, 'aurora-for-elementor'], staging);
} catch (e) {
    run('python3', ['-m', 'zipfile', '-c', zip, 'aurora-for-elementor'], staging);
}

function size(dir) {
    return readdirSync(dir).reduce(function (sum, name) {
        var p = join(dir, name);
        return sum + (statSync(p).isDirectory() ? size(p) : statSync(p).size);
    }, 0);
}
console.log('Packed ' + zip + ' (' + Math.round(size(target) / 1024) + ' KB unpacked)');
