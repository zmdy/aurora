/** Shared documentation actions and module-specific bindings for the Text Effects demo. */
(function () {
    'use strict';
    document.addEventListener('click', function (event) {
        var button = event.target.closest('button.copy');
        if (!button) return;
        var text = button.parentNode.querySelector('pre').textContent;
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () {
            button.textContent = 'Copied';
            setTimeout(function () { button.textContent = 'Copy'; }, 1400);
        }).catch(function () { button.textContent = 'Select code to copy'; });
    });

    var schemaNode = document.getElementById('schema');
    var demo = document.getElementById('demo');
    var panel = document.getElementById('controls');
    if (!schemaNode || !demo || !panel) return;
    var name = document.body.dataset.module;
    var schema = JSON.parse(schemaNode.textContent);
    var config = JSON.parse(document.getElementById('demo-config').textContent);
    var original = demo.cloneNode(true);
    var state = {};
    var groups = {};
    var snippet = '';
    var timer;
    var apiName = name.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    var primary = {
        children: ['animation', 'direction', 'distance', 'duration', 'stagger', 'delay', 'hover', 'hoverPreset', 'hoverDuration', 'proximity', 'proximityIntensity'],
        gradient: ['type', 'stops', 'angle', 'animation', 'speed', 'meshStyle', 'distortion', 'swirl', 'scale', 'grain', 'grainIntensity', 'followMouse', 'spotlightRadius', 'liquidCursor', 'cursorRadius'],
        cursor: ['dotColor', 'ringColor', 'dotSize', 'ringSize', 'trailDelay', 'interactiveScale', 'imageScale', 'hideNative'],
        'morph-card': ['captionEffect', 'initialDelay', 'autoplay', 'loop', 'float'],
        accent: ['shape', 'color', 'color2', 'strokeWidth', 'duration', 'easing', 'trigger']
    }[name];
    var hidden = ['selector', 'root', 'states', 'labels'];
    var copyButton = document.getElementById('btn-snippet-2');
    function kebab(key) { return key.replace(/([A-Z])/g, '-$1').toLowerCase(); }
    function attr(key) { return 'data-aurora-' + name + (key === schema.primary ? '' : '-' + kebab(key)); }
    function node(tag, cls, text) {
        var el = document.createElement(tag);
        if (cls) el.className = cls;
        if (text !== undefined) el.textContent = text;
        return el;
    }
    Object.keys(schema.options).forEach(function (key) {
        var spec = schema.options[key];
        if (hidden.indexOf(key) >= 0) return;
        var value = original.getAttribute(attr(key));
        state[key] = value === null ? spec.default : spec.type === 'number' ? Number(value) : spec.type === 'boolean' ? value === 'true' : value;
    });
    // Demo controls replay immediately; scroll triggering remains in Advanced options.
    if ('trigger' in state) state.trigger = 'load';

    function visibility() {
        Object.keys(groups).forEach(function (key) {
            var condition = schema.options[key].when || {};
            groups[key].hidden = !Object.keys(condition).every(function (other) {
                var values = Array.isArray(condition[other]) ? condition[other] : [condition[other]];
                return values.indexOf(state[other]) >= 0;
            });
        });
    }
    function mount() {
        window.Aurora[apiName](demo, state);
        visibility();
        var output = original.cloneNode(true);
        output.removeAttribute('id');
        Object.keys(state).forEach(function (key) { output.setAttribute(attr(key), state[key]); });
        snippet = (config.css ? '<style>\n' + config.css + '\n</style>\n\n' : '') + output.outerHTML;
        config.scripts.forEach(function (script) {
            snippet += '\n\n<script src="' + script.src + '" integrity="' + script.integrity + '" crossorigin="anonymous"><\/script>';
        });
        document.getElementById('badge-tag').textContent = schema.primary ? state[schema.primary] : 'LIVE';
    }
    function schedule() { visibility(); clearTimeout(timer); timer = setTimeout(mount, 100); }
    function render(key, parent) {
        var spec = schema.options[key];
        if (!spec || hidden.indexOf(key) >= 0) return;
        var group = node('div', spec.type === 'boolean' ? 'toggle-row' : 'ctrl-group');
        groups[key] = group;
        var label = node(spec.type === 'boolean' ? 'span' : 'label', spec.type === 'boolean' ? 'toggle-label-text' : 'ctrl-label', spec.label || key);
        var id = 'ctrl-' + key;
        label.htmlFor = id;
        group.appendChild(label);
        var field;
        if (spec.type === 'enum') {
            field = node('select', 'ctrl-select');
            spec.values.forEach(function (entry) {
                var value = typeof entry === 'object' ? entry.value : entry;
                var option = node('option', '', typeof entry === 'object' ? entry.label : value.replace(/-/g, ' '));
                option.value = value;
                field.appendChild(option);
            });
            field.value = state[key];
            group.appendChild(field);
        } else if (spec.type === 'boolean') {
            var toggle = node('label', 'toggle-switch');
            toggle.setAttribute('aria-label', spec.label || key);
            field = node('input'); field.type = 'checkbox'; field.checked = state[key];
            toggle.appendChild(field); toggle.appendChild(node('span', 'toggle-track')); group.appendChild(toggle);
        } else {
            field = node('input', spec.type === 'number' ? 'ctrl-range' : spec.type === 'color' ? 'ctrl-color' : 'ctrl-input');
            field.type = spec.type === 'number' ? 'range' : spec.type === 'color' ? 'color' : 'text';
            field.value = state[key];
            if (spec.type === 'number') {
                field.min = spec.min ?? 0; field.max = spec.max ?? 100;
                field.step = spec.step || (spec.default % 1 ? .01 : 1);
                field.value = state[key];
            }
            if (spec.type === 'number' || spec.type === 'color') {
                var row = node('div', 'range-row');
                var value = node('output', 'range-val', state[key] + (spec.unit || ''));
                value.htmlFor = id;
                row.appendChild(field); row.appendChild(value); group.appendChild(row);
            } else group.appendChild(field);
        }
        field.id = id;
        field.setAttribute('aria-label', spec.label || key);
        field.addEventListener(spec.type === 'enum' || spec.type === 'boolean' ? 'change' : 'input', function () {
            state[key] = spec.type === 'boolean' ? field.checked : spec.type === 'number' ? Number(field.value) : field.value;
            var output = group.querySelector('output');
            if (output) output.textContent = state[key] + (spec.unit || '');
            schedule();
        });
        parent.appendChild(group);
    }
    var fragment = document.createDocumentFragment();
    if (name === 'morph-card') {
        var group = node('div', 'ctrl-group');
        group.appendChild(node('span', 'ctrl-label', 'Starting layout'));
        var tabs = node('div', 'split-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Starting layout');
        var cardOptions = JSON.parse(original.getAttribute('data-aurora-morph-card-options'));
        ['post', 'profile', 'polaroid'].forEach(function (layout, index) {
            var button = node('button', 'split-tab' + (index === 0 ? ' active' : ''), layout);
            button.type = 'button'; button.setAttribute('aria-pressed', String(index === 0));
            button.addEventListener('click', function () {
                var options = Object.assign({}, cardOptions, { states: cardOptions.states.slice(index).concat(cardOptions.states.slice(0, index)) });
                original.setAttribute('data-aurora-morph-card-options', JSON.stringify(options));
                demo.setAttribute('data-aurora-morph-card-options', JSON.stringify(options));
                tabs.querySelectorAll('button').forEach(function (el) { el.classList.toggle('active', el === button); el.setAttribute('aria-pressed', String(el === button)); });
                mount();
            });
            tabs.appendChild(button);
        });
        group.appendChild(tabs); fragment.appendChild(group);
    }
    primary.forEach(function (key) { render(key, fragment); });
    var more = Object.keys(state).filter(function (key) { return primary.indexOf(key) < 0; });
    if (more.length) {
        var details = node('details', 'advanced-controls'); details.appendChild(node('summary', '', 'Advanced options'));
        var fields = node('div', 'advanced-fields'); more.forEach(function (key) { render(key, fields); });
        details.appendChild(fields); fragment.appendChild(details);
    }
    panel.insertBefore(fragment, copyButton);
    document.getElementById('btn-replay').addEventListener('click', function () {
        var instance = window.Aurora.get(demo, name);
        if (instance && instance.replay) instance.replay(); else mount();
    });

    var overlay = document.getElementById('snippet-overlay');
    var previousFocus;
    function close() { overlay.classList.remove('open'); document.body.style.overflow = ''; if (previousFocus) previousFocus.focus(); }
    function open() {
        clearTimeout(timer); mount(); previousFocus = document.activeElement;
        document.getElementById('snippet-raw').textContent = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Aurora ' + name + '</title>\n</head>\n<body>\n' + snippet + '\n</body>\n</html>';
        overlay.classList.add('open'); document.body.style.overflow = 'hidden'; document.getElementById('snippet-close').focus();
    }
    document.getElementById('btn-snippet').addEventListener('click', open);
    copyButton.addEventListener('click', open);
    document.getElementById('snippet-close').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
        if (!overlay.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'Tab') {
            var first = document.getElementById('snippet-close'), last = document.getElementById('btn-copy-final');
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    });
    document.getElementById('btn-copy-final').addEventListener('click', function () {
        var button = this, content = button.innerHTML;
        if (!navigator.clipboard) { button.textContent = 'Select the code above to copy'; return; }
        navigator.clipboard.writeText(snippet).then(function () {
            button.textContent = 'Copied!'; button.classList.add('copied');
            setTimeout(function () { button.innerHTML = content; button.classList.remove('copied'); }, 1800);
        }).catch(function () { button.textContent = 'Select the code above to copy'; });
    });
    document.querySelector('.snippet-info').textContent = 'Preview shows full readable HTML. Copy the element, styles and CDN scripts — ready to paste.';
    var nav = document.getElementById('main-nav');
    window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 60); }, { passive: true });
    var dropdown = document.getElementById('nav-modules-dropdown'), trigger = document.getElementById('nav-modules-trigger');
    function closeMenu() { dropdown.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); }
    trigger.addEventListener('click', function () { var open = dropdown.classList.toggle('open'); trigger.setAttribute('aria-expanded', String(open)); });
    document.addEventListener('click', function (e) { if (!dropdown.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    mount();
})();
