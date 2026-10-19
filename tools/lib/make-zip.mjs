/**
 * Shared zip helper for the pack scripts (tools/pack-elementor.mjs,
 * tools/pack-blocks.mjs).
 */

import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Quiet: used only for zip-tool fallbacks, where a missing tool (or the
// Windows Store `python3` alias printing its install notice) should not leak
// noise — only the tool that actually works matters.
function tryRun(cmd, args, cwd) {
    try {
        execFileSync(cmd, args, { cwd: cwd, stdio: 'ignore' });
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
export function makeZip(zipPath, cwd, folder) {
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
