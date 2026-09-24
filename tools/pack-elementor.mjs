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

// Quiet: used only for zip-tool fallbacks, where a missing tool (or the
// Windows Store `python3` alias printing its install notice) should not leak
// noise — only the tool that actually works matters.
function tryRun(cmd, args, cwd) {
    try {
        execFileSync(cmd, args, { cwd: cwd || root, stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Builds `zipPath` from `folder` inside `cwd`, cross-platform and with no
 * hard dependency on any single tool:
 *   - Unix `zip`, then Python's zipfile (python3 OR python) — all three write
 *     RFC-correct forward-slash entry names.
 *   - As a last resort on Windows, .NET's ZipArchive, writing each entry name
 *     with forward slashes. Compress-Archive / CreateFromDirectory emit
 *     backslashes, which WordPress's PclZip then reads as one flat filename
 *     ("Plugin file does not exist" on install) — so the entries are created
 *     by hand here instead.
 */
function makeZip(zipPath, cwd, folder) {
    if (existsSync(zipPath)) rmSync(zipPath);

    if (tryRun('zip', ['-rq', zipPath, folder], cwd)) return;
    if (tryRun('python3', ['-m', 'zipfile', '-c', zipPath, folder], cwd)) return;
    if (tryRun('python', ['-m', 'zipfile', '-c', zipPath, folder], cwd)) return;

    if (process.platform === 'win32') {
        var src = resolve(cwd, folder);
        var ps = [
            "$ErrorActionPreference='Stop';",
            "Add-Type -AssemblyName 'System.IO.Compression';",
            "Add-Type -AssemblyName 'System.IO.Compression.FileSystem';",
            "$src='" + src.replace(/'/g, "''") + "';",
            "$dst='" + zipPath.replace(/'/g, "''") + "';",
            '$base = Split-Path $src -Parent;',
            '$zip = [System.IO.Compression.ZipFile]::Open($dst, [System.IO.Compression.ZipArchiveMode]::Create);',
            'try {',
            '  Get-ChildItem -Path $src -Recurse -File | ForEach-Object {',
            "    $rel = $_.FullName.Substring($base.Length + 1).Replace('\\','/');",
            '    $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal);',
            '    $s = $entry.Open();',
            '    try { $bytes = [System.IO.File]::ReadAllBytes($_.FullName); $s.Write($bytes, 0, $bytes.Length); }',
            '    finally { $s.Dispose(); }',
            '  }',
            '} finally { $zip.Dispose(); }',
        ].join(' ');
        if (tryRun('powershell', ['-NoProfile', '-Command', ps], cwd)) return;
    }

    throw new Error('pack: could not create the zip. Install `zip` or Python, or run on Windows PowerShell.');
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

makeZip(zip, staging, 'aurora-for-elementor');

function size(dir) {
    return readdirSync(dir).reduce(function (sum, name) {
        var p = join(dir, name);
        return sum + (statSync(p).isDirectory() ? size(p) : statSync(p).size);
    }, 0);
}
console.log('Packed ' + zip + ' (' + Math.round(size(target) / 1024) + ' KB unpacked)');
