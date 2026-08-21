/**
 * Aurora for Elementor — Cross-Platform ZIP Packager
 *
 * Compiles the production-ready ZIP archives for the plugin:
 *   1. aurora-for-elementor-full.zip  (Includes GSAP, Anime.js, and Motion One)
 *   2. aurora-for-elementor-light.zip (Excludes GSAP, dynamically falls back to Anime.js)
 *
 * Runs natively on macOS, Linux, and Windows (using PowerShell).
 * Requires NO external NPM dependencies.
 *
 * Run with: npm run pack
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// This file lives at plugin/scripts/. PLUGIN_ROOT (plugin/) holds the PHP,
// includes/, languages/, and readme files; REPO_ROOT (one level up) holds
// assets/, which stays shared with the showcase site and is NOT nested
// under plugin/. The two are merged into the same staging folder below.
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '../..');
const TEMP_DIR = path.join(PLUGIN_ROOT, '_dist_temp');
const PLUGIN_SLUG = 'aurora-for-elementor';
const TEMP_PLUGIN_PATH = path.join(TEMP_DIR, PLUGIN_SLUG);

// Files and folders to exclude when copying from PLUGIN_ROOT (relative to PLUGIN_ROOT)
const PLUGIN_EXCLUDES = [
    'scripts',
    '.DS_Store',
    '_dist_temp',
    'readme-light.txt'
];

// Files and folders to exclude when copying from REPO_ROOT/assets (relative to that assets/ folder)
const ASSETS_EXCLUDES = [
    '.DS_Store',
    'js/src',

    // Development & marketing branding assets (not needed by production plugin)
    'branding/brandguide.html',
    'branding/fonts',
    'branding/aurora_animated_logo.svg',
    'branding/aurora_blob_base_shape.svg',
    'branding/aurora_favicon.svg',
    'branding/aurora_favicon_green.svg',
    'branding/logo_aurora.svg',
    'branding/logo_aurora_tagline.svg',
    'branding/icons/tdesign',
    'branding/icons/aurora_icon_blue_contributing.svg',
    'branding/icons/aurora_icon_blue_features.svg',
    'branding/icons/aurora_icon_blue_install.svg',
    'branding/icons/aurora_icon_blue_specs.svg'
];

/**
 * Reads the canonical plugin version straight from the `Version:` header
 * of aurora-for-elementor.php — that header is the single source of
 * truth for the plugin's version.
 *
 * WordPress.org's SVN uses each readme's `Stable tag:` — NOT the plugin
 * header's `Version:` — to decide which tagged copy gets served to users
 * as the "install/update" download. Whenever the two drift apart,
 * reviewers flag it as a blocker and, worse, users on WP.org can end up
 * downloading a stale build even after a real bump. Every readme's
 * Stable tag is now kept in lockstep with this value at pack time (see
 * syncStableTag() below) so that class of bug can't recur.
 */
function readPluginVersion() {
    const phpPath = path.join(PLUGIN_ROOT, 'aurora-for-elementor.php');
    const phpContent = fs.readFileSync(phpPath, 'utf8');
    const match = phpContent.match(/^\s*\*\s*Version:\s*(\S+)/m);
    if (!match) {
        throw new Error(
            `pack-plugin: could not find a "Version:" header in ${phpPath} — refusing to pack with an unknown version.`
        );
    }
    return match[1];
}

/**
 * Rewrites the `Stable tag:` line of a readme.txt-style file in place so
 * it matches `version`. Throws instead of silently no-op-ing when the
 * file has no Stable tag line at all, so a malformed/renamed readme
 * fails the pack loudly rather than shipping a stale tag unnoticed.
 */
function syncStableTag(readmePath, version) {
    if (!fs.existsSync(readmePath)) return;
    const content = fs.readFileSync(readmePath, 'utf8');
    const stableTagRegex = /^Stable tag:.*$/m;
    if (!stableTagRegex.test(content)) {
        throw new Error(`pack-plugin: could not find a "Stable tag:" line in ${readmePath}`);
    }
    const updated = content.replace(stableTagRegex, `Stable tag: ${version}`);
    if (updated !== content) {
        fs.writeFileSync(readmePath, updated);
        console.log(`   Synced Stable tag -> ${version} in ${path.relative(PLUGIN_ROOT, readmePath)}`);
    }
}

/**
 * Last-line-of-defense check run against the STAGED copy of a readme
 * right before it gets zipped: fails the whole pack if, for any reason,
 * the Stable tag in what's about to ship doesn't match the PHP header's
 * Version. This is deliberately redundant with syncStableTag() above —
 * it exists so that a future edit to this script (e.g. someone
 * reordering steps, or a new code path that copies in a readme after
 * the sync step ran) can never silently regress into shipping a
 * mismatched Stable tag again.
 */
function assertStableTagMatches(readmePath, version, label) {
    const content = fs.readFileSync(readmePath, 'utf8');
    const match = content.match(/^Stable tag:\s*(\S+)/m);
    if (!match || match[1] !== version) {
        throw new Error(
            `pack-plugin: refusing to ship ${label} — Stable tag in ${readmePath} is ` +
            `"${match ? match[1] : '(missing)'}" but aurora-for-elementor.php Version is "${version}".`
        );
    }
}

/**
 * Recursively copies a directory while excluding specified files/folders.
 * `excludeRoot` is the folder `excludes` paths are computed relative to
 * (may differ from `src` itself only on the very first/outer call).
 */
function copyRecursive(src, dest, excludeRoot, excludes) {
    const relativePath = path.relative(excludeRoot, src).replace(/\\/g, '/');

    if (relativePath) {
        if (src.endsWith('.zip') || path.basename(src) === '.DS_Store') return;
        if (excludes.some(ex => relativePath === ex || relativePath.startsWith(ex + '/'))) {
            return;
        }
    }

    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            copyRecursive(path.join(src, entry), path.join(dest, entry), excludeRoot, excludes);
        }
    } else {
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
        }
    }
}

/**
 * Compresses the temp plugin folder into a ZIP archive.
 */
function zipFolder(destZipPath) {
    const isWindows = process.platform === 'win32';
    
    // Clean up zip if it already exists
    if (fs.existsSync(destZipPath)) {
        fs.unlinkSync(destZipPath);
    }

    if (isWindows) {
        // Neither PowerShell 5.1's Compress-Archive nor its bundled
        // .NET Framework ZipFile.CreateFromDirectory writes ZIP entries
        // with the RFC-required forward-slash separators — both emit
        // backslashes, which WordPress's PclZip extractor treats as
        // part of a single flat filename. The extracted folder ends up
        // empty of the plugin file WordPress is looking for, hence
        // "Plugin file does not exist". Sidestep both by opening a
        // ZipArchive by hand and CreateEntry-ing each file with an
        // explicit forward-slash name.
        const src = TEMP_PLUGIN_PATH.replace(/'/g, "''");
        const dst = destZipPath.replace(/'/g, "''");
        const ps = [
            "$ErrorActionPreference='Stop';",
            "Add-Type -AssemblyName 'System.IO.Compression';",
            "Add-Type -AssemblyName 'System.IO.Compression.FileSystem';",
            `$src='${src}'; $dst='${dst}';`,
            "$root = Split-Path $src -Parent;",
            "$zip = [System.IO.Compression.ZipFile]::Open($dst, [System.IO.Compression.ZipArchiveMode]::Create);",
            "try {",
            "  Get-ChildItem -Path $src -Recurse -File | ForEach-Object {",
            "    $rel = $_.FullName.Substring($root.Length + 1).Replace('\\','/');",
            "    $entry = $zip.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal);",
            "    $stream = $entry.Open();",
            "    try {",
            "      $bytes = [System.IO.File]::ReadAllBytes($_.FullName);",
            "      $stream.Write($bytes, 0, $bytes.Length);",
            "    } finally { $stream.Dispose(); }",
            "  }",
            "} finally { $zip.Dispose(); }"
        ].join(' ');
        execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'inherit' });
    } else {
        // Use standard Unix zip utility with level 5 fast compression
        const cmd = `zip -5 -q -r "${destZipPath}" "${PLUGIN_SLUG}"`;
        execSync(cmd, { cwd: TEMP_DIR, stdio: 'inherit' });
    }
}

function main() {
    console.log('=== Starting Cross-Platform Packaging Process ===');

    // 1. Clean up old build temp folders
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    // 1b. Version is read once from the PHP header and used as the
    // single source of truth for every readme's Stable tag from here on.
    const version = readPluginVersion();
    console.log(`-> Plugin version (from aurora-for-elementor.php): ${version}`);
    syncStableTag(path.join(PLUGIN_ROOT, 'readme.txt'), version);
    syncStableTag(path.join(PLUGIN_ROOT, 'readme-light.txt'), version);

    // 2. Copy files to temp directory — merged from two source roots:
    //    plugin/ (PHP, includes/, languages/, readme) and the repo-root
    //    assets/ folder (shared with the showcase site, lives outside plugin/).
    console.log('-> Isolating production files...');
    copyRecursive(PLUGIN_ROOT, TEMP_PLUGIN_PATH, PLUGIN_ROOT, PLUGIN_EXCLUDES);
    copyRecursive(
        path.join(REPO_ROOT, 'assets'),
        path.join(TEMP_PLUGIN_PATH, 'assets'),
        path.join(REPO_ROOT, 'assets'),
        ASSETS_EXCLUDES
    );

    // 3. Package Full Version
    console.log('-> Building Full Version ZIP (aurora-for-elementor-full.zip)...');
    assertStableTagMatches(path.join(TEMP_PLUGIN_PATH, 'readme.txt'), version, 'Full version');
    const fullZipPath = path.join(PLUGIN_ROOT, 'aurora-for-elementor-full.zip');
    zipFolder(fullZipPath);
    console.log('✅ Full version package built successfully.');

    // 4. Exclude GSAP for Light Version
    console.log('-> Removing GSAP vendor files and GSAP effect chunks for the Light Version...');
    const gsapPath = path.join(TEMP_PLUGIN_PATH, 'assets/js/vendor/gsap.min.js');
    if (fs.existsSync(gsapPath)) {
        fs.unlinkSync(gsapPath);
    }
    const effectsDir = path.join(TEMP_PLUGIN_PATH, 'assets/js/dist/effects');
    if (fs.existsSync(effectsDir)) {
        const effectFiles = fs.readdirSync(effectsDir);
        for (const file of effectFiles) {
            if (file.startsWith('gs-') && file.endsWith('.js')) {
                const filePath = path.join(effectsDir, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
        }
    }

    console.log('-> Patching metadata for Light Version...');
    // Rewrite aurora-for-elementor.php description
    const phpPath = path.join(TEMP_PLUGIN_PATH, 'aurora-for-elementor.php');
    if (fs.existsSync(phpPath)) {
        let phpContent = fs.readFileSync(phpPath, 'utf8');
        phpContent = phpContent.replace(
            'Advanced text & children animations (GSAP + Anime.js)',
            'Advanced text & children animations (Anime.js)'
        );
        fs.writeFileSync(phpPath, phpContent);
    }

    // Overwrite readme.txt with readme-light.txt
    const readmeLightRootPath = path.join(PLUGIN_ROOT, 'readme-light.txt');
    const readmeTempPath = path.join(TEMP_PLUGIN_PATH, 'readme.txt');
    if (fs.existsSync(readmeLightRootPath)) {
        fs.copyFileSync(readmeLightRootPath, readmeTempPath);
    }

    // 5. Package Light Version
    console.log('-> Building Light Version ZIP (aurora-for-elementor-light.zip)...');
    assertStableTagMatches(path.join(TEMP_PLUGIN_PATH, 'readme.txt'), version, 'Light version');
    const lightZipPath = path.join(PLUGIN_ROOT, 'aurora-for-elementor-light.zip');
    zipFolder(lightZipPath);
    console.log('✅ Light version package built successfully.');

    // 6. Final Clean up
    console.log('-> Cleaning up temporary files...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log('=== Packaging completed! ===');
    console.log(`Generated in plugin/:\n - ${path.relative(PLUGIN_ROOT, fullZipPath)}\n - ${path.relative(PLUGIN_ROOT, lightZipPath)}`);
}

main();
