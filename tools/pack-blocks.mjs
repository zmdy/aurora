/**
 * Builds the installable WordPress zip of the block adapter:
 *
 *   npm run pack:blocks  ->  build/aurora-for-blocks.zip
 *
 * Runs tools/build-blocks.mjs first, then copies only the files the plugin
 * needs at runtime (no tests, no source maps).
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeZip } from './lib/make-zip.mjs';

var root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
var source = resolve(root, 'adapters/blocks');
var staging = resolve(root, 'build/pack-blocks');
var target = resolve(staging, 'aurora-for-blocks');
var zip = resolve(root, 'build/aurora-for-blocks.zip');

execFileSync('node', ['tools/build-blocks.mjs'], { cwd: root, stdio: 'inherit' });

rmSync(staging, { recursive: true, force: true });
mkdirSync(target, { recursive: true });

cpSync(source, target, {
    recursive: true,
    filter: function (path) {
        return !/[\\/]test([\\/]|$)/.test(path.slice(source.length)) && !/\.map$/.test(path);
    },
});

cpSync(resolve(root, 'LICENSE'), resolve(target, 'LICENSE'));

makeZip(zip, staging, 'aurora-for-blocks');

function size(dir) {
    return readdirSync(dir).reduce(function (sum, name) {
        var p = join(dir, name);
        return sum + (statSync(p).isDirectory() ? size(p) : statSync(p).size);
    }, 0);
}
console.log('Packed ' + zip + ' (' + Math.round(size(target) / 1024) + ' KB unpacked)');
