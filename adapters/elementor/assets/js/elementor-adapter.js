/**
 * Aurora for Elementor — editor adapter.
 *
 * On the frontend the PHP renderer writes `data-aurora-*` attributes and the
 * standalone scripts do the rest. Inside the editor preview some widgets are
 * rendered from JS templates, so those attributes never exist. This script
 * reads the element settings, builds the same options the PHP renderer would
 * and calls the public API (`Aurora.<module>(target, options)`).
 *
 * Localized data: window.AuroraElementor = { schemas, targets }.
 */
(function () {
    'use strict';

    var data = window.AuroraElementor;
    if (!data) return;

    var MODULES = ['text', 'children', 'cursor', 'gradient', 'highlight', 'headline', 'counter'];

    function snake(name) {
        return name.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    function controlId(module, option) {
        return 'aurora_' + module + '_' + snake(option);
    }

    function camel(slug) {
        return slug.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    }

    function readOption(module, name, spec, settings) {
        var raw = settings[controlId(module, name)];
        if (raw === undefined || raw === null) return undefined;
        if (spec.type === 'boolean') return raw === 'yes';
        if (spec.type === 'number') {
            if (raw === '' || isNaN(Number(raw))) return undefined;
            return Number(raw);
        }
        if (spec.type === 'json') {
            if (typeof raw !== 'string') return raw;
            try { return JSON.parse(raw); } catch (e) { return undefined; }
        }
        return String(raw);
    }

    function stopsString(rows) {
        return (rows || []).map(function (row) {
            var color = row.color;
            if (!color) return '';
            var has = row.offset !== '' && row.offset != null && !isNaN(Number(row.offset));
            return has ? color + ' ' + Number(row.offset) : color;
        }).filter(Boolean).join(';');
    }

    /** Options of one module for one element, or null when it is off. */
    function buildOptions(module, elementName, settings) {
        if (settings['aurora_' + module + '_enable'] !== 'yes') return null;

        var schema = data.schemas[module];
        var targets = data.targets;
        var options = {};

        Object.keys(schema.options).forEach(function (name) {
            if (module === 'children' && (name === 'root' || name === 'selector')) return;
            if ((module === 'highlight' || module === 'headline') && name === 'target') return;
            if (module === 'counter' && name === 'selector') return;
            if (module === 'gradient' && (name === 'target' || name === 'selector' || name === 'textSelector' || name === 'stops')) return;
            var spec = schema.options[name];
            var value = readOption(module, name, spec, settings);
            if (value === undefined) return;
            if (name === schema.primary || value !== spec.default) options[name] = value;
        });

        // These modules act on the element's text node, not the widget wrapper
        // Elementor hands over. The counter names it `selector`, because its
        // own `target` is the date a countdown counts down to.
        var text = targets.text[elementName];
        if (text && (module === 'text' || module === 'highlight' || module === 'headline')) {
            options.target = text;
        }
        if (text && module === 'counter') {
            options.selector = text;
        }

        if (module === 'children') {
            var items = (targets.childrenItems || {})[elementName];
            var root = (targets.childrenRoot || {})[elementName] || '';
            var choice = settings[controlId('children', 'choice')] || '';
            if (items) {
                options.selector = items;
            } else {
                options.root = root;
                if (choice === 'custom') options.selector = settings[controlId('children', 'custom_selector')] || '';
                else if (targets.childrenChoices[choice]) options.selector = targets.childrenChoices[choice];
            }
        }

        if (module === 'gradient') {
            var paints = Object.keys(targets.gradient[elementName] || {});
            if (!paints.length) return null;
            var chosen = settings[controlId('gradient', 'paint')];
            var paint = paints.indexOf(chosen) >= 0 ? chosen : paints[0];
            var entry = targets.gradient[elementName][paint];
            options.target = entry[0];
            if (entry[1]) options.selector = entry[1];
            if (entry[2]) options.textSelector = entry[2];
            var stops = stopsString(settings[controlId('gradient', 'stops')]);
            if (stops) options.stops = stops;
        }

        return options;
    }

    function elementNameOf($el) {
        var name = $el.data('element_type') || '';
        var widgetType = $el.data('widget_type');
        if (widgetType) name = String(widgetType).split('.')[0];
        return name;
    }

    /** Applies (or tears down) every module on one element from its settings. */
    function applyAll(node, elementName, settings) {
        var Aurora = window.Aurora;
        if (!Aurora || !node) return;

        MODULES.forEach(function (module) {
            var api = Aurora[camel(module)];
            if (!api) return;
            var options = buildOptions(module, elementName, settings);
            if (options) {
                // mount() already destroys any previous instance, so calling
                // the API again just re-applies with the new options.
                api(node, options);
            } else {
                var existing = Aurora.get && Aurora.get(node, module);
                if (existing && existing.destroy) existing.destroy();
            }
        });
    }

    /**
     * Register a real Elementor frontend handler instead of a one-shot
     * `element_ready` callback. The editor re-renders elements in the browser
     * without going through PHP, so the `data-aurora-*` attributes are never
     * (re)written there — the effect has to be driven from the live control
     * settings. `onInit` shows it on first render and `onElementChange` re-runs
     * it every time an Aurora control changes, which is what makes the preview
     * update live as you edit (the frontend page keeps using the PHP-written
     * attributes and the standalone scripts, untouched).
     */
    function registerHandler() {
        if (!window.elementorModules || !window.elementorModules.frontend || !window.elementorModules.frontend.handlers) {
            return false;
        }
        if (!window.elementorFrontend || !window.elementorFrontend.hooks || !window.elementorFrontend.elementsHandler) {
            return false;
        }

        var Base = window.elementorModules.frontend.handlers.Base;

        function AuroraHandler() { Base.apply(this, arguments); }
        AuroraHandler.prototype = Object.create(Base.prototype);
        AuroraHandler.prototype.constructor = AuroraHandler;

        AuroraHandler.prototype.syncAurora = function () {
            var node = this.$element && this.$element[0];
            if (!node) return;
            applyAll(node, elementNameOf(this.$element), this.getElementSettings());
        };

        AuroraHandler.prototype.onInit = function () {
            Base.prototype.onInit.apply(this, arguments);
            this.syncAurora();
        };

        AuroraHandler.prototype.onElementChange = function (propertyName) {
            if (propertyName && propertyName.indexOf('aurora_') === 0) {
                this.syncAurora();
            }
        };

        window.elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            window.elementorFrontend.elementsHandler.addHandler(AuroraHandler, { $element: $element });
        });

        return true;
    }

    // Register once. In the editor preview `elementorFrontend.hooks` attaches
    // after this script runs, so the first call usually fails — retry on
    // `elementor/frontend/init` and on window load until it succeeds.
    var registered = false;
    function tryRegister() {
        if (registered) return true;
        registered = registerHandler();
        return registered;
    }
    if (!tryRegister()) {
        if (window.jQuery) {
            window.jQuery(window).on('elementor/frontend/init', tryRegister);
        }
        window.addEventListener('load', tryRegister);
    }
})();
