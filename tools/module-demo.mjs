import { textEffectGuide } from './text-effect-guide.mjs';
/** Module pages use the actual Text Effects document, not a parallel demo shell. */
export function moduleDemoPage(reference, { name, title, lead, markup, documentation, schema, config, headlineDemo = '' }) {
    const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
    let page = reference
        .replace('<title>Text Effects — 53 Live Animations | Aurora</title>', '<title>' + escape(title) + ' | Aurora</title>')
        .replace('href="./" aria-current="page"', 'href="../modules/text.html"')
        .replaceAll('href="./"', 'href="../modules/text.html"')
        .replace('href="../modules/' + name + '.html" role="menuitem"', 'href="../modules/' + name + '.html" role="menuitem" aria-current="page"')
        .replace('</head>', '<link rel="stylesheet" href="../assets/module-documentation.css?v=3">\n</head>');

    if (name !== 'text') {
        const section = page.match(/<section id="playground"[\s\S]*?<\/section>/)[0];
        const copyButton = section.match(/<button class="btn-snippet"[\s\S]*?<\/button>/)[0];
        let demo = section
            .replace('Live Text Playground', 'Live ' + escape(title) + ' Playground')
            .replace(/<div class="section-header">([\s\S]*?)<p>[\s\S]*?<\/p>/, '<div class="section-header">$1<p>' + escape(lead) + '</p>')
            .replace('Aurora.text()', 'Aurora.' + name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + '()')
            .replace('<div id="playground-text" aria-label="Animation preview text">AURORA</div>', markup)
            .replace('id="badge-tag">REVEAL', 'id="badge-tag">LIVE')
            .replace('id="badge-split">CHARS', 'id="badge-split">' + escape(name))
            .replace(/<div class="pg-controls">[\s\S]*$/, '<div class="pg-controls" id="controls" aria-label="Demo options">' + copyButton + '</div></div></div></section>');
        page = page.replace(section, demo)
            .replace(/<section id="effects"[\s\S]*?<\/section>/, '')
            .replace('<body>', '<body data-module="' + name + '">')
            .replace(/<meta name="description"\s+content="[^"]*">/, '<meta name="description" content="' + escape(lead) + '">')
            .replace(/<script src="\.\.\/aurora\.core\.min\.js"><\/script>[\s\S]*<\/body>/,
                '<script type="application/json" id="schema">' + json(schema) + '</script>\n' +
                '<script type="application/json" id="demo-config">' + json(config) + '</script>\n' +
                '<script src="../aurora.core.min.js?v=3"></script>\n<script src="../aurora.' + name + '.min.js?v=3"></script>\n' +
                '<script src="../assets/site.js?v=3"></script>\n</body>');
    } else {
        const guide = textEffectGuide(schema);
        page = page.replace('<div class="pg-preview__footer">', guide.panel + '\n<div class="pg-preview__footer">')
            .replace('</head>', '<link rel="stylesheet" href="../assets/effect-guide.css?v=1"><link rel="alternate" type="application/json" href="../data/text-effects.json" title="Text effect selection guide">\n</head>')
            .replace(/<\/body>\s*<\/html>\s*$/, guide.data + '\n<script src="../assets/effect-guide.js?v=1"></script>\n</body>\n</html>');
        documentation = guide.catalog + documentation;
        // Keep the original text demo, catalog, modal and runtime completely intact.
        page = page.replace(/var CORE_SRI = '[^']*';/, 'var CORE_SRI = ' + JSON.stringify(config.scripts[0].integrity) + ';')
            .replace(/var TEXT_SRI = '[^']*';/, 'var TEXT_SRI = ' + JSON.stringify(config.scripts[1].integrity) + ';')
            .replace('<section id="effects"', headlineDemo + '\n<section id="effects"')
            .replace('</head>', '<link rel="stylesheet" href="../assets/headline-demo.css?v=1">\n</head>')
            .replace('<script src="../aurora.text.min.js"></script>', '<script src="../aurora.text.min.js?v=' + config.revision + '"></script>')
            .replace(/<\/body>\s*<\/html>\s*$/, '<script type="application/json" id="headline-schema">' + json(schema) + '</script>\n<script type="application/json" id="headline-config">' + json(config) + '</script>\n<script src="../assets/headline-demo.js?v=2"></script>\n<script src="../assets/site.js?v=3"></script>\n</body>\n</html>');
    }
    page = page.replace('<section class="cta-section', '<div class="module-documentation">' + documentation + '</div>\n<section class="cta-section');
    return page;
}
