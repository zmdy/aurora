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
const ROOT = path.resolve(__dirname, '..');
const TEMP_DIR = path.join(ROOT, '_dist_temp');
const PLUGIN_SLUG = 'aurora-for-elementor';
const TEMP_PLUGIN_PATH = path.join(TEMP_DIR, PLUGIN_SLUG);

// Files and folders to exclude from final production packages (relative to ROOT)
const EXCLUDES = [
    '.git',
    '.github',
    'node_modules',
    '_tests',
    'scripts',
    '.agents',
    '.gemini',
    'package.json',
    'package-lock.json',
    '.gitignore',
    '.DS_Store',
    '_dist_temp',
    'README.md',
    'readme.txt',
    'LICENSE',
    'index.html',
    'showcase',
    'assets/js/src'
];

/**
 * Recursively copies a directory while excluding specified files/folders.
 */
function copyRecursive(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    
    const items = fs.readdirSync(src);
    for (const item of items) {
        const fullSrc = path.join(src, item);
        const relativePath = path.relative(ROOT, fullSrc).replace(/\\/g, '/');
        
        if (item.endsWith('.zip')) continue;
        if (EXCLUDES.some(ex => relativePath === ex || relativePath.startsWith(ex + '/'))) {
            continue;
        }

        fs.cpSync(fullSrc, path.join(dest, item), {
            recursive: true,
            force: true,
            filter: (source) => {
                const innerRelative = path.relative(ROOT, source).replace(/\\/g, '/');
                return !EXCLUDES.some(ex => innerRelative === ex || innerRelative.startsWith(ex + '/'));
            }
        });
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
        // Use Windows PowerShell Compress-Archive (native, no third-party zip tool required)
        const cmd = `powershell -Command "Compress-Archive -Path '${TEMP_PLUGIN_PATH}' -DestinationPath '${destZipPath}' -Force"`;
        execSync(cmd, { stdio: 'inherit' });
    } else {
        // Use standard Unix zip utility
        const cmd = `zip -q -r "${destZipPath}" "${PLUGIN_SLUG}"`;
        execSync(cmd, { cwd: TEMP_DIR, stdio: 'inherit' });
    }
}

function main() {
    console.log('=== Starting Cross-Platform Packaging Process ===');

    // 1. Clean up old build temp folders
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }

    // 2. Copy files to temp directory
    console.log('-> Isolating production files...');
    copyRecursive(ROOT, TEMP_PLUGIN_PATH);

    // 3. Package Full Version
    console.log('-> Building Full Version ZIP (aurora-for-elementor-full.zip)...');
    const fullZipPath = path.join(ROOT, 'aurora-for-elementor-full.zip');
    zipFolder(fullZipPath);
    console.log('✅ Full version package built successfully.');

    // 4. Exclude GSAP for Light Version
    console.log('-> Removing GSAP vendor files for the Light Version...');
    const gsapPath = path.join(TEMP_PLUGIN_PATH, 'assets/js/vendor/gsap.min.js');
    if (fs.existsSync(gsapPath)) {
        fs.unlinkSync(gsapPath);
    }

    // 5. Package Light Version
    console.log('-> Building Light Version ZIP (aurora-for-elementor-light.zip)...');
    const lightZipPath = path.join(ROOT, 'aurora-for-elementor-light.zip');
    zipFolder(lightZipPath);
    console.log('✅ Light version package built successfully.');

    // 6. Final Clean up
    console.log('-> Cleaning up temporary files...');
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });

    console.log('=== Packaging completed! ===');
    console.log(`Generated in root:\n - ${path.relative(ROOT, fullZipPath)}\n - ${path.relative(ROOT, lightZipPath)}`);
}

main();
