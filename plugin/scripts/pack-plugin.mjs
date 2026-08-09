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
        fs.copyFileSync(src, dest);
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
                fs.unlinkSync(path.join(effectsDir, file));
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
