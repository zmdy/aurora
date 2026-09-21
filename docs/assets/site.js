/**
 * Site behavior: copy buttons and the schema-driven playground.
 * The playground uses only the public API, exactly like any page would.
 */
(function () {
    'use strict';

    // ── Copy buttons ─────────────────────────────────────────────────────
    document.addEventListener('click', function (event) {
        var button = event.target.closest('button.copy');
        if (!button) return;
        var pre = button.parentNode.querySelector('pre');
        var text = pre.textContent;
        var done = function () {
            button.textContent = 'Copied';
            setTimeout(function () { button.textContent = 'Copy'; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, function () {});
        }
    });

    // ── Playground ───────────────────────────────────────────────────────
    var schemaNode = document.getElementById('schema');
    var demo = document.getElementById('demo');
    var panel = document.getElementById('controls');
    if (!schemaNode || !demo || !panel) return;

    var moduleName = document.body.getAttribute('data-module');
    var schema = JSON.parse(schemaNode.textContent);
    var HIDDEN = ['target', 'selector', 'root', 'states', 'labels'];
    var state = {};

    function camel(slug) {
        return slug.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    }
    function kebab(name) {
        return name.replace(/([A-Z])/g, '-$1').toLowerCase();
    }
    function labelOf(spec, name) { return spec.label || name; }

    function differs(name, spec) {
        return name === schema.primary || state[name] !== spec.default;
    }

    function options() {
        var out = {};
        Object.keys(schema.options).forEach(function (name) {
            if (HIDDEN.indexOf(name) >= 0) return;
            if (differs(name, schema.options[name])) out[name] = state[name];
        });
        return out;
    }

    function attributes() {
        var opts = options();
        var lines = [];
        var base = 'data-aurora-' + moduleName;
        if (schema.primary) {
            lines.push(base + '="' + opts[schema.primary] + '"');
            delete opts[schema.primary];
        } else {
            lines.push(base);
        }
        Object.keys(opts).forEach(function (name) {
            lines.push(base + '-' + kebab(name) + '="' + opts[name] + '"');
        });
        return lines;
    }

    function mount() {
        var api = window.Aurora && window.Aurora[camel(moduleName)];
        if (!api) return;
        api(demo, options());
        var out = document.getElementById('live-attrs');
        if (out) out.textContent = '<div\n  ' + attributes().join('\n  ') + '>';
    }

    var timer = null;
    function schedule() {
        clearTimeout(timer);
        timer = setTimeout(mount, 120);
    }

    var lastGroup = null;
    Object.keys(schema.options).forEach(function (name) {
        var spec = schema.options[name];
        if (HIDDEN.indexOf(name) >= 0 || spec.type === 'json') return;
        state[name] = spec.default;

        if (spec.group !== lastGroup) {
            var h = document.createElement('h4');
            h.textContent = spec.group || 'Options';
            panel.appendChild(h);
            lastGroup = spec.group;
        }

        var label = document.createElement('label');
        label.textContent = labelOf(spec, name);
        var field;
        var row = document.createElement('div');
        row.className = 'row';

        if (spec.type === 'enum') {
            field = document.createElement('select');
            spec.values.forEach(function (v) {
                var option = document.createElement('option');
                option.value = typeof v === 'object' ? v.value : v;
                option.textContent = typeof v === 'object' ? v.label : v;
                field.appendChild(option);
            });
            field.value = spec.default;
            field.addEventListener('change', function () { state[name] = field.value; schedule(); });
            label.appendChild(field);
            panel.appendChild(label);
            return;
        }

        if (spec.type === 'boolean') {
            field = document.createElement('input');
            field.type = 'checkbox';
            field.checked = !!spec.default;
            field.addEventListener('change', function () { state[name] = field.checked; schedule(); });
            label.textContent = '';
            label.appendChild(field);
            label.appendChild(document.createTextNode(' ' + labelOf(spec, name)));
            panel.appendChild(label);
            return;
        }

        if (spec.type === 'number') {
            field = document.createElement('input');
            field.type = 'range';
            field.min = spec.min != null ? spec.min : 0;
            field.max = spec.max != null ? spec.max : Math.max(100, spec.default * 3);
            field.step = spec.step || (spec.default % 1 ? 0.01 : 1);
            field.value = spec.default;
            var out = document.createElement('output');
            out.textContent = spec.default;
            field.addEventListener('input', function () {
                state[name] = Number(field.value);
                out.textContent = field.value;
                schedule();
            });
            row.appendChild(field);
            row.appendChild(out);
            panel.appendChild(label);
            panel.appendChild(row);
            return;
        }

        field = document.createElement('input');
        field.type = spec.type === 'color' ? 'color' : 'text';
        field.value = spec.default;
        field.addEventListener('input', function () { state[name] = field.value; schedule(); });
        if (spec.type === 'color') {
            row.appendChild(field);
            panel.appendChild(label);
            panel.appendChild(row);
        } else {
            label.appendChild(field);
            panel.appendChild(label);
        }
    });

    var replay = document.getElementById('replay');
    if (replay) {
        replay.addEventListener('click', function () {
            var instance = window.Aurora.get(demo, moduleName);
            if (instance && instance.replay) instance.replay();
        });
    }

    if (window.Aurora) mount();
    else window.addEventListener('load', mount);
})();
