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
    if (!data || !window.elementorFrontend) return;

    var MODULES = ['text', 'children', 'cursor', 'gradient'];

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
            if (module === 'gradient' && (name === 'target' || name === 'selector' || name === 'stops')) return;
            var spec = schema.options[name];
            var value = readOption(module, name, spec, settings);
            if (value === undefined) return;
            if (name === schema.primary || value !== spec.default) options[name] = value;
        });

        if (module === 'text') {
            var text = targets.text[elementName];
            if (text) options.target = text;
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
            var stops = stopsString(settings[controlId('gradient', 'stops')]);
            if (stops) options.stops = stops;
        }

        return options;
    }

    function settingsOf($scope) {
        var id = $scope.data('model-cid');
        var models = window.elementorFrontend.config.elements && window.elementorFrontend.config.elements.data;
        var model = models && models[id];
        return model && model.attributes ? model.attributes : {};
    }

    function sync($scope) {
        var Aurora = window.Aurora;
        if (!Aurora) return;

        var settings = settingsOf($scope);
        var elementName = $scope.data('element_type') || '';
        var widgetType = $scope.data('widget_type');
        if (widgetType) elementName = String(widgetType).split('.')[0];

        MODULES.forEach(function (module) {
            var options = buildOptions(module, elementName, settings);
            var api = Aurora[camel(module)];
            if (!api) return;
            var node = $scope[0];
            if (options) {
                api(node, options);
            } else {
                var existing = Aurora.get && Aurora.get(node, module);
                if (existing && existing.destroy) existing.destroy();
            }
        });
    }

    window.elementorFrontend.hooks.addAction('frontend/element_ready/global', sync);
})();
