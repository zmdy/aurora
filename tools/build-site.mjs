/**
 * Builds the Aurora website into docs/ (the GitHub Pages source).
 *
 *   npm run build:site
 *
 * Pages are generated from the module schemas in dist/manifest.json, so the
 * option tables and the playground controls can never drift from the code.
 * Every module also gets a real standalone example (examples/<module>.html):
 * a plain HTML file that only loads the built scripts, the way a visitor of
 * a site without any framework would use them.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { moduleDemoPage } from './module-demo.mjs';

var root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
var dist = resolve(root, 'dist');
var out = resolve(root, 'docs');

if (!existsSync(resolve(dist, 'manifest.json'))) {
    console.error('dist/manifest.json not found. Run `npm run build` first.');
    process.exit(1);
}

var manifest = JSON.parse(readFileSync(resolve(dist, 'manifest.json'), 'utf8'));
var VERSION = manifest.version;
var REPO = 'https://github.com/zmdy/aurora';
var CDN = 'https://cdn.jsdelivr.net/gh/zmdy/aurora@v' + VERSION + '/dist/';
var sri = {};
manifest.files.forEach(function (f) { sri[f.file] = f; });

// ── Helpers ─────────────────────────────────────────────────────────────

function esc(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function camel(slug) { return slug.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
function kebab(name) { return name.replace(/([A-Z])/g, '-$1').toLowerCase(); }
function write(path, content) {
    var file = resolve(out, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
}
function kb(bytes) { return (bytes / 1024).toFixed(1) + ' KB'; }

/** Small self-authored SVG used as a photo in the Morph Card demo. */
function photo(a, b) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>' +
        '<rect width="400" height="400" fill="url(#g)"/><circle cx="130" cy="140" r="70" fill="#fff" fill-opacity=".25"/>' +
        '<circle cx="290" cy="270" r="110" fill="#fff" fill-opacity=".18"/></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ── What each module demonstrates ───────────────────────────────────────

/**
 * A date for the countdown in the demo. The counter the page opens on does not
 * use it, but switching to the countdown in the playground should show one
 * counting rather than an empty box, so it is written into the markup and
 * stays a year ahead of whenever the site was built.
 */
var NEW_YEAR = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 1)).toISOString().slice(0, 16);

var CARD_STATES = [
    { template: 'post', username: 'aurora', likes: 128, caption: 'Cards that morph between layouts.', photo: photo('#7c6cff', '#ff7a2f'), durationMs: 2600 },
    { template: 'profile', username: 'aurora', name: 'Aurora', bio: 'Animation toolkit for any builder.', posts: '24', followers: '1.2k', following: '80', photo: photo('#2af598', '#7c6cff'), durationMs: 2600 },
    { template: 'polaroid', caption: 'Hello, standalone!', photo: photo('#ff7a2f', '#2af598'), durationMs: 2600 },
];

var MODULES = {
    text: {
        title: 'Text',
        nav: ['✨', 'green', 'Text', '53 scroll &amp; load effects'],
        summary: manifest.schemas.text.options.effect.values.length + ' effects that split text into characters, words or lines.',
        lead: 'Split any text into characters, words or lines and animate it on scroll or on load. Built on Anime.js v4.',
        markup: function (id) {
            return '<h2' + id + ' data-aurora-text="slide-in">Motion, unleashed.</h2>';
        },
        css: '',
        stage: '',
        replay: true,
    },
    children: {
        title: 'Animate Children',
        nav: ['🎬', 'teal', 'Animate Children', 'Stagger, hover, proximity'],
        summary: 'Staggered entrances, hover and proximity effects for the children of any element.',
        lead: 'Animate the children of an element one after another. Uses the Web Animations API: no library needed.',
        markup: function (id) {
            var tiles = [1, 2, 3, 4, 5, 6].map(function (n) { return '  <div class="tile">' + n + '</div>'; }).join('\n');
            return '<div' + id + ' class="tiles" data-aurora-children="slide" data-aurora-children-direction="up">\n' + tiles + '\n</div>';
        },
        css: '.tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; max-width: 520px; }\n' +
            '.tile { background: #1b1b29; border: 1px solid #2a2a3d; border-radius: 12px; aspect-ratio: 1.3; display: grid; place-items: center; font-weight: 700; }',
        stage: '',
        replay: true,
    },
    gradient: {
        title: 'Gradient',
        nav: ['🌈', 'violet', 'Gradient', 'Multi-stop, mesh, follow mouse'],
        summary: 'Multi-stop gradients for backgrounds, text and icons, plus WebGL mesh styles.',
        lead: 'Paint backgrounds, text or icons with animated gradients, a cursor spotlight or a WebGL mesh (with a CSS fallback).',
        markup: function (id) {
            return '<div' + id + ' class="demo-box" data-aurora-gradient="linear" data-aurora-gradient-animation="flow">Gradients that move</div>';
        },
        css: '.demo-box { width: 100%; min-height: 200px; display: grid; place-items: center; text-align: center; padding: 28px; border-radius: 12px; font-size: 1.6rem; font-weight: 700; color: #fff; }',
        stage: '',
        replay: false,
    },
    cursor: {
        title: 'Cursor Follow',
        nav: ['🖱️', 'green', 'Cursor Follow', 'Dot + ring zones'],
        summary: 'A dot-and-ring cursor inside an element, with hover states.',
        lead: 'A custom cursor scoped to an element: a dot that follows instantly and a ring that trails behind. The native cursor stays visible unless you turn it off.',
        markup: function (id) {
            return '<section' + id + ' class="demo-box" data-aurora-cursor>\n  <p>Move the mouse here and <a href="#">hover this link</a></p>\n</section>';
        },
        css: '.demo-box { width: 100%; min-height: 200px; display: grid; place-items: center; text-align: center; padding: 28px; border-radius: 12px; background: #1b1b29; color: #fff; }\n.demo-box a { color: #ff7a2f; }',
        stage: '',
        replay: false,
    },
    'morph-card': {
        title: 'Morph Card',
        nav: ['🪪', 'teal', 'Morph Card', 'Post, profile, polaroid'],
        summary: 'A card that morphs between post, profile and polaroid layouts.',
        lead: 'A card that morphs between layouts on its own. Pass the states as JSON, or drive it from code with next() and goTo().',
        markup: function (id) {
            var json = JSON.stringify({ states: CARD_STATES.map(function (s, i) { return i === 0 ? s : s; }) });
            return '<div' + id + " data-aurora-morph-card data-aurora-morph-card-options='" + json.replace(/'/g, '&#39;') + "'></div>";
        },
        css: '',
        stage: '',
        replay: false,
    },
    highlight: {
        title: 'Highlight Shapes',
        nav: ['✏️', 'violet', 'Highlight Shapes', '16 hand-drawn markers'],
        summary: 'A hand-drawn marker — underline, circle, scribble, marker pen and twelve more — drawn over a phrase.',
        lead: 'Draws a marker over a phrase without ever rewriting it: the shape is an SVG overlay, so any markup already inside survives, and the Text module can split the same words at the same time.',
        markup: function (id) {
            return '<h2' + id + ' data-aurora-highlight="circle" data-aurora-highlight-trigger="load">Ship <em>beautiful</em> motion.</h2>';
        },
        css: '',
        stage: '',
        replay: true,
    },
    headline: {
        title: 'Animated Headline',
        nav: ['🔄', 'green', 'Animated Headline', '27 rotating animations'],
        summary: 'Phrases that rotate through one of 27 animations.',
        lead: 'Rotates a headline through a list of phrases. Flips, slides, a typewriter that backspaces, a split-flap board - 27 animations, each with its own timing controls.',
        engine: true,
        markup: function (id) {
            return '<h2' + id + ' data-aurora-headline="rotate-1"\n    data-aurora-headline-phrases="beautiful&#10;effortless&#10;yours">\n  Make it beautiful\n</h2>';
        },
        css: '',
        stage: '',
        replay: true,
    },
    counter: {
        title: 'Counter',
        nav: ['⏱️', 'teal', 'Counter', 'Clock, countdown, numbers'],
        summary: 'A clock, a countdown, a timecode or a counting number.',
        lead: 'Numbers that roll. Only the digits that actually changed move, so a clock ticks one character at a time rather than redrawing itself every second.',
        engine: true,
        markup: function (id) {
            return '<h2' + id + ' data-aurora-counter="progress"\n    data-aurora-counter-to="1250" data-aurora-counter-suffix="+"\n    data-aurora-counter-target="' + NEW_YEAR + '"></h2>';
        },
        css: '',
        stage: '',
        replay: true,
    },
};

var ORDER = ['text', 'children', 'gradient', 'cursor', 'morph-card', 'highlight', 'headline', 'counter'];

/**
 * The Modules dropdown, built from ORDER so a new module appears in the menu of
 * every page by being listed there - it used to be copied into each template by
 * hand, and three modules were missing from it.
 *
 * @param {string} current Module whose page this is, marked as the current item.
 */
function navMenu(current) {
    return ORDER.map(function (name) {
        var nav = MODULES[name].nav;
        return '<a href="../modules/' + name + '.html" role="menuitem"' + (name === current ? ' aria-current="page"' : '') + '>' +
            '<span class="nav__dropdown-icon nav__dropdown-icon--' + nav[1] + '">' + nav[0] + '</span>' +
            '<span><span class="nav__dropdown-title">' + esc(nav[2]) + '</span>' +
            '<span class="nav__dropdown-desc">' + nav[3] + '</span></span></a>';
    }).join('\n              ');
}

/** Where the shared animated-headlines engine is loaded from, per script source. */
function engineTags(scripts) {
    var base = scripts === 'cdn' ? CDN + 'vendor/' : '../vendor/';
    return {
        style: '<link rel="stylesheet" href="' + base + 'animated-headline.css">',
        script: '<script type="module" src="' + base + 'animated-headline.js"></script>',
    };
}

// ── Standalone documents ────────────────────────────────────────────────

var BASE_CSS = 'body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #0b0b12; color: #ecebf5; font: 16px/1.5 system-ui, sans-serif; }\nh2 { font-size: clamp(2rem, 6vw, 3.4rem); margin: 0; text-align: center; }';

/**
 * A complete HTML file for one module.
 * @param {string} name   Module key.
 * @param {'local'|'cdn'} scripts Where the scripts come from.
 * @param {boolean} forDisplay Shorten inline images for reading.
 */
function standalone(name, scripts, forDisplay) {
    var mod = MODULES[name];
    var files = ['aurora.core.min.js', 'aurora.' + name + '.min.js'];
    var tags = files.map(function (file) {
        if (scripts === 'cdn') {
            return '<script src="' + CDN + file + '"\n        integrity="' + sri[file].integrity + '"\n        crossorigin="anonymous"></script>';
        }
        return '<script src="../' + file + '"></script>';
    }).join('\n');

    var markup = mod.markup('');
    if (forDisplay) {
        var n = 0;
        markup = markup.replace(/data:image\/svg\+xml,[^"'\s,}]+/g, function () { n += 1; return 'photo-' + n + '.jpg'; });
    }
    var css = BASE_CSS + (mod.css ? '\n' + mod.css : '');

    // The headline and counter modules mount the animated-headlines component,
    // so the page needs that library as well as the Aurora scripts.
    var engine = mod.engine ? engineTags(scripts) : null;

    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '<title>Aurora ' + mod.title + ' (standalone)</title>\n' + (engine ? engine.style + '\n' : '') + '<style>\n' + css + '\n</style>\n</head>\n<body>\n\n' +
        markup + '\n\n' + (engine ? engine.script + '\n' : '') + tags + '\n</body>\n</html>\n';
}

// ── Page shell ──────────────────────────────────────────────────────────

var NAV = [
    ['modules/text.html', 'Text'],
    ['modules/children.html', 'Children'],
    ['modules/gradient.html', 'Gradient'],
    ['modules/cursor.html', 'Cursor'],
    ['modules/morph-card.html', 'Morph Card'],
    ['modules/highlight.html', 'Highlight Shapes'],
    ['modules/headline.html', 'Animated Headline'],
    ['modules/counter.html', 'Counter'],
    ['index.html#install', 'Install'],
    ['webflow.html', 'Webflow'],
    ['elementor.html', 'Elementor'],
];

/**
 * @param {object} page
 * @param {string} page.file   Output path, e.g. "modules/text.html".
 * @param {string} page.title
 * @param {string} page.description
 * @param {string} page.body
 * @param {string[]} [page.scripts] Aurora scripts to load, by file name.
 * @param {string} [page.module] Module key, for the playground.
 */
function shell(page) {
    var depth = page.file.split('/').length - 1;
    var base = depth ? '../'.repeat(depth) : './';
    var nav = NAV.map(function (item) {
        var current = item[0] === page.file ? ' aria-current="page"' : '';
        return '<a href="' + base + item[0] + '"' + current + '>' + item[1] + '</a>';
    }).join('');
    var scripts = (page.scripts || []).map(function (file) { return '<script src="' + base + file + '"></script>'; }).join('\n');
    var moduleAttr = page.module ? ' data-module="' + page.module + '"' : '';
    var schemaTag = page.module
        ? '<script type="application/json" id="schema">' + JSON.stringify(manifest.schemas[page.module]).replace(/</g, '\\u003c') + '</script>\n'
        : '';

    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
        '<title>' + esc(page.title) + '</title>\n<meta name="description" content="' + esc(page.description) + '">\n' +
        '<link rel="icon" href="' + base + 'assets/favicon.svg">\n<meta name="theme-color" content="#03040c">\n' +
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@500;600;700&family=Syne:wght@700;800&display=swap">\n' +
        '<link rel="stylesheet" href="' + base + 'assets/site.css">\n' +
        '<script>document.documentElement.classList.add("aurora-js");setTimeout(function(){document.documentElement.classList.add("aurora-ready")},4000)</script>\n' +
        '</head>\n<body' + moduleAttr + '>\n<header class="site"><div class="wrap">' +
        '<a class="brand" href="' + base + 'index.html"><img src="' + base + 'assets/favicon.svg" alt="">Aurora</a>' +
        '<nav>' + nav + '<a href="' + REPO + '">GitHub</a></nav></div></header>\n<main>\n' + page.body + '\n</main>\n' +
        '<footer class="site"><div class="wrap"><span>Aurora ' + VERSION + ' · MIT License</span>' +
        '<span><a href="' + REPO + '">Source</a> · <a href="' + base + 'index.html#install">Install</a></span></div></footer>\n' +
        schemaTag + scripts + '\n' + (page.module ? '<script src="' + base + 'assets/site.js"></script>\n' : '') + '</body>\n</html>\n';
}

function codebox(text, lang) {
    return '<div class="codebox"><button class="copy" type="button">Copy</button><pre><code' + (lang ? ' class="language-' + lang + '"' : '') + '>' + esc(text) + '</code></pre></div>';
}

// ── Option tables ───────────────────────────────────────────────────────

function optionRows(name) {
    var schema = manifest.schemas[name];
    var prefix = 'data-aurora-' + name;
    return Object.keys(schema.options).map(function (key) {
        var spec = schema.options[key];
        var attr = key === schema.primary ? prefix : prefix + '-' + kebab(key);
        var values = '';
        if (spec.type === 'enum' && spec.values.length <= 16) {
            values = '<br><small>' + spec.values.map(function (v) { return '<code>' + esc(typeof v === 'object' ? v.value : v) + '</code>'; }).join(' ') + '</small>';
        } else if (spec.type === 'enum') {
            values = '<br><small>' + spec.values.length + ' values</small>';
        }
        var def = typeof spec.default === 'object' ? JSON.stringify(spec.default) : String(spec.default);
        var desc = spec.description ? esc(spec.description) : esc(spec.label || key);
        return '<tr><td><code>' + key + '</code></td><td><code>' + attr + '</code></td><td>' + spec.type + (spec.unit ? ' (' + spec.unit + ')' : '') +
            '</td><td><code>' + esc(def) + '</code></td><td>' + desc + values + '</td></tr>';
    }).join('\n');
}

function optionsTable(name) {
    return '<div class="table-scroll"><table class="options"><thead><tr><th>Option</th><th>Attribute</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody>\n' +
        optionRows(name) + '\n</tbody></table></div>';
}

// ── Module pages ────────────────────────────────────────────────────────

var API_SNIPPETS = {
    text: "var fx = Aurora.text(document.querySelector('h2'), { effect: 'blur-reveal', split: 'words' });\nfx.replay();               // play again\nfx.update({ duration: 1200 }); // change options\nfx.destroy();              // restore the original markup",
    children: "var fx = Aurora.children(document.querySelector('.grid'), { animation: 'zoom', stagger: 90 });\nfx.replay();\nfx.destroy();",
    gradient: "var fx = Aurora.gradient(document.querySelector('.hero'), {\n  type: 'radial',\n  stops: '#7c6cff;#ff7a2f;#2af598',\n  followMouse: true\n});\nfx.destroy();          // removes every style it added",
    cursor: "var fx = Aurora.cursor(document.querySelector('.area'), { dotColor: '#ff7a2f', hideNative: false });\nfx.destroy();",
    'morph-card': "var fx = Aurora.morphCard(document.querySelector('#card'), { states: [/* see the options table */] });\nfx.api.next();         // go to the next state\nfx.api.goTo(2);        // jump to a state\nfx.destroy();",
    highlight: "var fx = Aurora.highlight(document.querySelector('h2'), { shape: 'circle', highlightColor: '#ff7a2f', trigger: 'load' });\nfx.update({ shape: 'zigzag' }); // change options, including the shape\nfx.replay();           // draw it again\nfx.destroy();          // removes only the overlay it added",
    headline: "var fx = Aurora.headline(document.querySelector('h2'), {\n  effect: 'rotate-1',\n  phrases: 'beautiful\n\nneffortless\n\nnyours'\n});\nfx.update({ effect: 'flipboard' }); // swap the animation\nfx.destroy();          // puts the original heading back",
    counter: "var fx = Aurora.counter(document.querySelector('h2'), { kind: 'countdown', target: '2026-12-31T23:59' });\nfx.update({ kind: 'clock', format: '24h' });\nfx.destroy();",
};

function modulePage(name) {
    var mod = MODULES[name];
    var schema = manifest.schemas[name];
    var file = 'aurora.' + name + '.min.js';
    var info = sri[file];
    var body =
        '<section class="block"><div class="wrap"><h2>Copy and paste</h2>' +
        '<p class="sub">This is a complete HTML file. It needs no build step and no framework. The two scripts weigh ' + kb(sri['aurora.core.min.js'].gzip) + ' + ' + kb(info.gzip) + ' gzipped.</p>' +
        codebox(standalone(name, 'cdn', true), 'html') + '</div></section>\n' +
        '<section class="block"><div class="wrap"><h2>JavaScript API</h2>' + codebox(API_SNIPPETS[name], 'js') + '</div></section>\n' +
        '<section class="block"><div class="wrap"><h2 id="module-options">Options</h2><p class="sub">Set them as <code>data-aurora-' + name + '-&lt;option&gt;</code> attributes, as one JSON attribute (<code>data-aurora-' + name + '-options</code>) or as an object in JavaScript.</p>' +
        optionsTable(name) + '</div></section>\n';

    return moduleDemoPage(readFileSync(resolve(root, 'site/templates/module.html'), 'utf8'), {
        name, title: mod.title, lead: mod.lead, markup: mod.markup(' id="demo"'),
        documentation: '<div class="wrap"><div class="module-links"><a href="../examples/' + name + '.html">Standalone example ↗</a><a href="#module-options">All options ↓</a></div></div>' + body,
        schema,
        nav: navMenu(name),
        engine: mod.engine ? engineTags('local') : null,
        config: {
            css: mod.css,
            revision: info.bytes + '-' + info.gzip,
            styles: mod.engine ? [CDN + 'vendor/animated-headline.css'] : [],
            scripts: (mod.engine ? [{ src: CDN + 'vendor/animated-headline.js', type: 'module' }] : [])
                .concat(['aurora.core.min.js', file].map(function (f) { return { src: CDN + f, integrity: sri[f].integrity }; })),
        }
    });
}

// ── Home ────────────────────────────────────────────────────────────────

function homePage() {
    var cards = ORDER.map(function (name) {
        return '<a class="card" href="modules/' + name + '.html"><span class="tag">' + kb(sri['aurora.' + name + '.min.js'].gzip) + ' gzip</span><h3>' + MODULES[name].title + '</h3><p>' + esc(MODULES[name].summary) + '</p></a>';
    }).join('\n');

    var body =
        '<section class="hero hero-image"><div class="wrap">' +
        '<h1 data-aurora-text="blur-reveal" data-aurora-text-split="words">Animated web design, for any builder.</h1>' +
        '<p class="lead">Aurora is an open-source toolkit of animation modules. Paste a script into plain HTML, drop it into Webflow, or install the Elementor plugin. Same modules, same attributes.</p>' +
        '<div class="cta"><a class="btn primary" href="index.html#install">Get started</a><a class="btn" href="' + REPO + '">View on GitHub</a></div></div></section>\n' +
        '<section class="block"><div class="wrap"><h2>' + ORDER.length + ' modules</h2><p class="sub">Use one or all of them. Each is a separate script that loads after the small core.</p><div class="grid">\n' + cards + '\n</div></div></section>\n' +
        '<section class="block"><div class="wrap"><h2>Three ways to use it</h2><div class="grid">' +
        '<a class="card" href="index.html#install"><h3>Standalone</h3><p>Copy two script tags into any HTML page. No build step.</p></a>' +
        '<a class="card" href="webflow.html"><h3>Webflow</h3><p>Add the script in Custom Code, then use Custom Attributes in the Designer.</p></a>' +
        '<a class="card" href="elementor.html"><h3>Elementor</h3><p>A plugin with a control for every option, generated from the same schemas.</p></a>' +
        '</div></div></section>\n' +
        '<section class="block"><div class="wrap"><h2>Built to stay light</h2><p class="sub">No GSAP. Only Anime.js v4 (for text), native CSS and the Web Animations API. Everything respects <code>prefers-reduced-motion</code>.</p>' +
        '<div class="table-scroll"><table class="options"><thead><tr><th>Script</th><th>Size</th><th>Gzipped</th></tr></thead><tbody>' +
        manifest.files.filter(function (f) { return /min\.js$/.test(f.file); }).map(function (f) {
            return '<tr><td><code>' + f.file + '</code></td><td>' + kb(f.bytes) + '</td><td>' + kb(f.gzip) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="cta-band"><h2>Ready to animate?</h2><p class="sub">Two script tags and one attribute.</p><div class="cta"><a class="btn primary" href="index.html#install">Install</a><a class="btn" href="modules/text.html">Browse the text effects</a></div></div></div></section>';

    return shell({
        file: 'index.html',
        title: 'Aurora: animated web design toolkit',
        description: 'The open-source Swiss Army knife for animated web design. Standalone scripts, a Webflow snippet and an Elementor plugin.',
        body: body,
        scripts: ['aurora.min.js'],
    });
}

// ── Install, Webflow, Elementor ─────────────────────────────────────────

function installSection() {
    var all = sri['aurora.min.js'];
    var allTag = '<script src="' + CDN + 'aurora.min.js"\n        integrity="' + all.integrity + '"\n        crossorigin="anonymous"></script>';
    var modularTags = ['aurora.core.min.js', 'aurora.text.min.js', 'aurora.gradient.min.js'].map(function (f) {
        return '<script src="' + CDN + f + '"\n        integrity="' + sri[f].integrity + '"\n        crossorigin="anonymous"></script>';
    }).join('\n');

    var body =
        '<section class="hero" style="padding-bottom:24px"><div class="wrap"><h1>Install</h1><p class="lead">Aurora is plain JavaScript. Pick the setup that fits your site.</p></div></section>\n' +
        '<section class="block"><div class="wrap"><h2>Standalone</h2>' +
        '<p class="sub">Paste the scripts before <code>&lt;/body&gt;</code>. The core must come first; modules can follow in any order.</p>' +
        '<h3>Only the modules you use</h3>' + codebox(modularTags, 'html') +
        '<h3>Everything in one script (' + kb(all.gzip) + ' gzipped)</h3>' + codebox(allTag, 'html') +
        '<p>Then mark elements with attributes:</p>' + codebox('<h2 data-aurora-text="slide-in">Hello</h2>\n<div data-aurora-gradient="linear" data-aurora-gradient-animation="flow">...</div>', 'html') +
        '<div class="note">The CDN links point to the tag <code>v' + VERSION + '</code> of the repository. You can also download the files from the <code>dist/</code> folder of a release and host them yourself: they have no other dependencies.</div></div></section>\n' +
        '<section class="block"><div class="wrap"><h2>Configuration</h2><p class="sub">Define <code>window.AuroraConfig</code> before the scripts.</p>' +
        codebox("<script>\n  window.AuroraConfig = {\n    autoInit: true,  // scan the page for data-aurora-* on load\n    observe: true,   // also watch the DOM for elements added later (CMS lists, routers)\n    nonce: '',       // CSP nonce for the style tag Aurora injects\n    debug: false\n  };\n</script>", 'html') + '</div></section>\n' +
        '<section class="block"><div class="wrap"><h2>Options, three ways</h2>' +
        codebox('<!-- 1. Individual attributes -->\n<h2 data-aurora-text="blur-reveal" data-aurora-text-duration="1200"></h2>\n\n<!-- 2. One JSON attribute -->\n<h2 data-aurora-text="blur-reveal" data-aurora-text-options=\'{"duration":1200,"split":"words"}\'></h2>\n\n<!-- 3. JavaScript -->\n<script>\n  Aurora.text(document.querySelector("h2"), { effect: "blur-reveal", duration: 1200 });\n</script>', 'html') + '</div></section>\n' +
        '<section class="block"><div class="wrap"><h2>Bundlers</h2><p class="sub"><code>dist/aurora.esm.js</code> is an ES module with every export.</p>' +
        codebox("import { createFullAurora } from './aurora.esm.js';\n\nvar aurora = createFullAurora();\naurora.init();\nwindow.Aurora = aurora;", 'js') + '</div></section>\n' +
        '<section class="block"><div class="wrap"><h2>Builders</h2><div class="grid">' +
        '<a class="card" href="webflow.html"><h3>Webflow</h3><p>Custom Code plus Custom Attributes.</p></a>' +
        '<a class="card" href="elementor.html"><h3>Elementor</h3><p>Install the plugin zip.</p></a></div></div></section>';

    body = body.replace(/<section class="hero"[\s\S]*?<\/section>/, '')
        .replaceAll('<h3>', '<h4>').replaceAll('</h3>', '</h4>')
        .replaceAll('<h2>', '<h3>').replaceAll('</h2>', '</h3>');
    return '<section id="install" class="module-documentation installation-section section-gap-lg" aria-labelledby="install-title">' +
        '<div class="container"><div class="section-header"><div class="eyebrow">Get started</div><h2 id="install-title" class="display-2">Install Aurora</h2><p>Aurora is plain JavaScript. Pick the setup that fits your site.</p></div></div>' + body + '</section>';
}

function webflowPage() {
    var head = '<script>document.documentElement.classList.add("aurora-js");setTimeout(function(){document.documentElement.classList.add("aurora-ready")},4000)</script>\n' +
        '<style>\n  .aurora-js:not(.aurora-ready) [data-aurora-text] { visibility: hidden; }\n</style>';
    var footer = ['aurora.core.min.js', 'aurora.text.min.js', 'aurora.children.min.js'].map(function (f) {
        return '<script src="' + CDN + f + '"\n        integrity="' + sri[f].integrity + '"\n        crossorigin="anonymous"></script>';
    }).join('\n') + '\n<script>\n  // Re-scan after Webflow finishes its own setup.\n  window.Webflow = window.Webflow || [];\n  window.Webflow.push(function () { Aurora.init(); });\n</script>';

    var body =
        '<section class="hero" style="padding-bottom:24px"><div class="wrap"><h1>Aurora in Webflow</h1><p class="lead">No plugin and no build step. Add one snippet in Custom Code, then use Custom Attributes on any element.</p></div></section>\n' +
        '<section class="block"><div class="wrap"><ol class="steps">' +
        '<li><strong>Custom code, head.</strong> In <em>Site settings, Custom code, Head code</em> add this. It hides animated text until Aurora runs, so there is no flash.' + codebox(head, 'html') + '</li>' +
        '<li><strong>Custom code, footer.</strong> In <em>Footer code</em> add the scripts of the modules you use.' + codebox(footer, 'html') + '</li>' +
        '<li><strong>Custom attributes.</strong> Select an element in the Designer, open <em>Settings, Custom attributes</em> and add a name and a value.' +
        '<div class="table-scroll" style="margin-top:8px"><table class="options"><thead><tr><th>Name</th><th>Value</th><th>Effect</th></tr></thead><tbody>' +
        '<tr><td><code>data-aurora-text</code></td><td><code>blur-reveal</code></td><td>Animates the text of a Heading or Paragraph.</td></tr>' +
        '<tr><td><code>data-aurora-text-split</code></td><td><code>words</code></td><td>Splits by words instead of characters.</td></tr>' +
        '<tr><td><code>data-aurora-children</code></td><td><code>slide</code></td><td>Animates the direct children of a Div Block or Grid.</td></tr>' +
        '<tr><td><code>data-aurora-children-stagger</code></td><td><code>120</code></td><td>Delay between children, in ms.</td></tr>' +
        '</tbody></table></div></li>' +
        '<li><strong>Publish.</strong> Custom code only runs on the published site, not in the Designer canvas.</li></ol>' +
        '<h2 style="margin-top:32px">Tips</h2>' +
        '<div class="note"><strong>Collection lists.</strong> Put <code>data-aurora-children</code> on the Collection List Wrapper\'s list (the element that contains the items). Aurora animates the items, including ones that load later, because <code>observe</code> is on by default.</div>' +
        '<div class="note"><strong>Rich text.</strong> Put <code>data-aurora-text</code> on the element that holds the text. For nested markup, add <code>data-aurora-text-target</code> with a CSS selector.</div>' +
        '<div class="note"><strong>Designer Extension.</strong> A Designer app with a visual panel is a possible later step. Today the attributes are the interface.</div>' +
        '</div></section>';

    return shell({ file: 'webflow.html', title: 'Aurora for Webflow', description: 'Use Aurora in Webflow with Custom Code and Custom Attributes.', body: body });
}

function elementorPage() {
    var download = '<a class="btn primary" href="' + REPO + '/releases/latest">Download the plugin zip</a>';
    var body =
        '<section class="hero" style="padding-bottom:24px"><div class="wrap"><h1>Aurora for Elementor</h1><p class="lead">The same modules, with a control for every option in the Advanced tab of your elements.</p><div class="cta">' + download + '</div></div></section>\n' +
        '<section class="block"><div class="wrap"><ol class="steps">' +
        '<li>In WordPress, open <em>Plugins, Add New, Upload Plugin</em> and pick the zip. Activate it (Elementor must be active).</li>' +
        '<li>Open any Heading, container, icon list or image in Elementor and find the <strong>Aurora</strong> sections in the <em>Advanced</em> tab.</li>' +
        '<li>Add the <strong>Aurora Morph Card</strong> widget from the panel for the card module.</li></ol>' +
        '<div class="note">The plugin loads local files only: no CDN and no external requests. Modules you turn off in the Aurora settings page load nothing. The controls are generated from the module schemas, so they always match the standalone scripts.</div></div></section>';
    return shell({ file: 'elementor.html', title: 'Aurora for Elementor', description: 'Install the Aurora plugin for Elementor.', body: body });
}

// ── Build ───────────────────────────────────────────────────────────────

// The home is hand-maintained except its marked installation section.
// Module pages use site/templates/module.html. Only generated files are removed.
['modules', 'examples', 'assets', 'vendor', 'install.html', 'webflow.html', 'elementor.html'].concat(
    manifest.files.map(function (f) { return f.file; })
).forEach(function (name) { rmSync(resolve(out, name), { recursive: true, force: true }); });
mkdirSync(out, { recursive: true });

manifest.files.forEach(function (f) { copyFileSync(resolve(dist, f.file), resolve(out, f.file)); });
mkdirSync(resolve(out, 'assets'), { recursive: true });
copyFileSync(resolve(root, 'site/assets/site.css'), resolve(out, 'assets/site.css'));
copyFileSync(resolve(root, 'site/assets/site.js'), resolve(out, 'assets/site.js'));
['modules.css', 'interactive-demo.css', 'module-documentation.css', 'effect-guide.css', 'effect-guide.js'].forEach(function (file) { copyFileSync(resolve(root, 'site/assets', file), resolve(out, 'assets', file)); });

// The animated-headlines engine, beside the bundles, exactly as the CDN serves it.
mkdirSync(resolve(out, 'vendor'), { recursive: true });
['animated-headline.js', 'animated-headline.css'].forEach(function (file) {
    copyFileSync(resolve(dist, 'vendor', file), resolve(out, 'vendor', file));
});
write('data/text-effects.json', readFileSync(resolve(root, 'site/data/text-effects.json'), 'utf8'));
copyFileSync(resolve(root, 'assets/branding/aurora_favicon.svg'), resolve(out, 'assets/favicon.svg'));

['aurora-hero.webp', 'aurora-cta.webp', 'logo_aurora_animated.svg'].forEach(function (name) {
    copyFileSync(resolve(root, 'assets/branding', name), resolve(out, 'assets', name));
});
writeFileSync(resolve(out, '.nojekyll'), '');

var home = readFileSync(resolve(out, 'index.html'), 'utf8');
var installStart = '<!-- INSTALLATION:START -->';
var installEnd = '<!-- INSTALLATION:END -->';
if (!home.includes(installStart) || !home.includes(installEnd)) throw new Error('Home installation markers are missing');
home = home.slice(0, home.indexOf(installStart) + installStart.length) + '\n' + installSection() + '\n' + home.slice(home.indexOf(installEnd));
write('index.html', home);
write('webflow.html', webflowPage());
write('elementor.html', elementorPage());
ORDER.forEach(function (name) {
    write('modules/' + name + '.html', modulePage(name));
    write('examples/' + name + '.html', standalone(name, 'local', false));
});

console.log('Site built in docs/ (home installation section, ' + ORDER.length + ' module pages, ' + ORDER.length + ' examples and 2 adapter guides).');
