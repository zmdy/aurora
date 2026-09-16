/**
 * Aurora for Elementor — "main branch" assembler
 *
 * The dev branch holds the full source, tooling, and the site under docs/.
 * The main branch is the clean, published layout. This script builds that
 * layout into a top-level `main/` folder (git-ignored on dev) so it can be
 * reviewed and copied/pushed to the main branch:
 *
 *   main/
 *   ├── index.html      ← the site home (moved out of docs/), paths fixed
 *   ├── assets/         ← the shared assets the site references
 *   ├── docs/           ← the rest of the site's pages (e.g. text-effects/)
 *   └── build/          ← distribution ZIPs, FINAL (non-dev) build
 *
 * Path rewrites (so the site is self-contained at the main root):
 *   - home (main/index.html): `../assets/` → `./assets/`, and links to the
 *     text-effects page `text-effects/` → `./docs/text-effects/`.
 *   - sub-pages (main/docs/<page>): assets stay `../../assets/` (that still
 *     resolves to main/assets from main/docs/<page>/), while links back to the
 *     home `../` become `../../` (the home moved up one level).
 *
 * Run with: npm run build:main
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(__dirname, '../..');

const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const ASSETS_DIR = path.join(REPO_ROOT, 'assets');
const MAIN_DIR = path.join(REPO_ROOT, 'main');
const MAIN_ASSETS = path.join(MAIN_DIR, 'assets');
const MAIN_DOCS = path.join(MAIN_DIR, 'docs');
const MAIN_BUILD = path.join(MAIN_DIR, 'build');

// Excluded when copying assets/ into main/assets/ (dev-only, not needed to
// serve the published site).
const ASSETS_EXCLUDES = [ 'js/src', '.DS_Store' ];

function rmrf(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

function copyRecursive(src, dest, excludeRoot, excludes) {
    const rel = path.relative(excludeRoot, src).replace(/\\/g, '/');
    if (rel && excludes.some(ex => rel === ex || rel.startsWith(ex + '/'))) {
        return;
    }
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
            copyRecursive(path.join(src, entry), path.join(dest, entry), excludeRoot, excludes);
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}

/**
 * Rewrites the site home's internal paths for its new location at the main
 * root (assets sit next to it in ./assets/, the text-effects page moves under
 * ./docs/).
 */
function transformHome(html) {
    return html
        // `../assets/...` (src / href / url()) → `./assets/...`
        .replace(/\.\.\/assets\//g, './assets/')
        // links to the text-effects sub-page now live under docs/
        .replace(/href="text-effects\//g, 'href="./docs/text-effects/');
}

/**
 * Rewrites a sub-page's internal paths for its new location at
 * main/docs/<page>/. Assets are left as `../../assets/` (still correct from
 * that depth); only links back up to the home (`../`) gain one extra level,
 * without disturbing the `../../assets/` references.
 */
function transformSubPage(html) {
    // `href="../"` or `href="../#anchor"` → one level deeper. The negative
    // lookahead leaves `href="../../assets/..."` (and any other `../../`)
    // untouched.
    return html.replace(/href="\.\.\/(?!\.\.\/)/g, 'href="../../');
}

function writeTransformed(srcFile, destFile, transform) {
    const dir = path.dirname(destFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const isHtml = srcFile.toLowerCase().endsWith('.html');
    if (isHtml) {
        fs.writeFileSync(destFile, transform(fs.readFileSync(srcFile, 'utf8')));
    } else {
        fs.copyFileSync(srcFile, destFile);
    }
}

/**
 * Walks docs/, sending index.html to main/index.html (home transform) and
 * every other page to main/docs/<relpath> (sub-page transform).
 */
function assembleSite(srcDir, relBase = '') {
    for (const entry of fs.readdirSync(srcDir)) {
        const srcPath = path.join(srcDir, entry);
        const rel = relBase ? `${relBase}/${entry}` : entry;
        if (fs.statSync(srcPath).isDirectory()) {
            assembleSite(srcPath, rel);
        } else if (rel === 'index.html') {
            writeTransformed(srcPath, path.join(MAIN_DIR, 'index.html'), transformHome);
        } else {
            writeTransformed(srcPath, path.join(MAIN_DOCS, rel), transformSubPage);
        }
    }
}

function main() {
    console.log('=== Assembling the main/ branch layout ===');

    if (!fs.existsSync(DOCS_DIR)) {
        throw new Error(`prepare-main: no docs/ folder found at ${DOCS_DIR} — nothing to assemble.`);
    }

    // 1. Clean and scaffold main/
    console.log('-> Cleaning previous main/ ...');
    rmrf(MAIN_DIR);
    fs.mkdirSync(MAIN_DIR, { recursive: true });
    fs.mkdirSync(MAIN_BUILD, { recursive: true });
    fs.mkdirSync(MAIN_DOCS, { recursive: true });

    // 2. Copy assets/ → main/assets/
    console.log('-> Copying assets/ → main/assets/ ...');
    copyRecursive(ASSETS_DIR, MAIN_ASSETS, ASSETS_DIR, ASSETS_EXCLUDES);

    // 3. Assemble the site: docs/index.html → main/index.html (home),
    //    every other docs/ page → main/docs/ (sub-pages), paths rewritten.
    console.log('-> Assembling site pages (home → main/index.html, rest → main/docs/) ...');
    assembleSite(DOCS_DIR);

    // 4. Build the FINAL (non-dev) distribution ZIPs and drop them in build/.
    console.log('-> Building FINAL distribution ZIPs ...');
    execSync(`node "${path.join(__dirname, 'pack-plugin.mjs')}"`, { stdio: 'inherit' });
    for (const zip of [ 'aurora-for-elementor-full.zip', 'aurora-for-elementor-light.zip' ]) {
        const from = path.join(PLUGIN_ROOT, zip);
        if (!fs.existsSync(from)) {
            throw new Error(`prepare-main: expected ${zip} in plugin/ after packing, but it wasn't found.`);
        }
        fs.copyFileSync(from, path.join(MAIN_BUILD, zip));
    }

    console.log('=== main/ assembled successfully ===');
    console.log('Contents:');
    console.log(' - main/index.html');
    console.log(' - main/assets/');
    console.log(' - main/docs/');
    console.log(' - main/build/aurora-for-elementor-full.zip');
    console.log(' - main/build/aurora-for-elementor-light.zip');
}

try {
    main();
} catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
}
