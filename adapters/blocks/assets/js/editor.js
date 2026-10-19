/**
 * Aurora for Blocks: the "Aurora" panel in the block inspector.
 *
 * Controls are generated from the module schemas (window.AuroraBlocks, printed
 * by Plugin::enqueue_editor), the same way the Elementor adapter generates its
 * controls. Options are stored in one block attribute:
 *
 *   attributes.aurora = { text: { effect: 'blur-reveal', duration: 1200 }, ... }
 *
 * A module is on when its key exists. Options equal to their default are not
 * stored. Animations do not run in the editor canvas (splitting text inside an
 * editable heading would break editing); they play on the page and in Preview.
 */
(function (wp, config) {
    if (!wp || !config) return;

    var el = wp.element.createElement;
    var Fragment = wp.element.Fragment;
    var __ = wp.i18n.__;
    var addFilter = wp.hooks.addFilter;
    var createHigherOrderComponent = wp.compose.createHigherOrderComponent;
    var InspectorControls = wp.blockEditor.InspectorControls;
    var ColorPalette = wp.blockEditor.ColorPalette || wp.components.ColorPalette;
    var C = wp.components;

    var ATTR = config.attribute;
    var MODULES = config.modules;
    var SCHEMAS = config.schemas;
    var TARGETS = config.targets;

    var TITLES = {
        text: __('Text animation', 'aurora-for-blocks'),
        children: __('Animate inner blocks', 'aurora-for-blocks'),
        gradient: __('Gradient', 'aurora-for-blocks'),
        cursor: __('Custom cursor', 'aurora-for-blocks'),
    };
    var HELP = {
        text: __('Splits the text into characters, words or lines and animates them.', 'aurora-for-blocks'),
        children: __('Staggered entrance, hover and proximity effects for the blocks inside this one.', 'aurora-for-blocks'),
        gradient: __('Animated multi-stop gradient for the background or the text.', 'aurora-for-blocks'),
        cursor: __('A dot-and-ring cursor that follows the pointer inside this block (mouse and trackpad only).', 'aurora-for-blocks'),
    };

    function offered(blockName) {
        return MODULES.filter(function (m) {
            return SCHEMAS[m] && TARGETS[m] && Object.prototype.hasOwnProperty.call(TARGETS[m], blockName);
        });
    }

    function blockDefaults(module, blockName) {
        return (TARGETS[module] && TARGETS[module][blockName]) || {};
    }

    function enumOptions(option) {
        return (option.values || []).map(function (v) {
            if (v && typeof v === 'object') return { value: String(v.value), label: v.label || String(v.value) };
            return { value: String(v), label: prettify(String(v)) };
        });
    }

    function prettify(s) {
        s = s.replace(/[-_]/g, ' ');
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    /** Saved value, else the block default, else the schema default. */
    function resolve(schema, saved, defaults) {
        var out = {};
        Object.keys(schema.options).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(saved, key)) out[key] = saved[key];
            else if (Object.prototype.hasOwnProperty.call(defaults, key)) out[key] = defaults[key];
            else out[key] = schema.options[key].default;
        });
        return out;
    }

    function visible(option, resolved) {
        if (!option.when) return true;
        return Object.keys(option.when).every(function (key) {
            var expected = option.when[key];
            return Array.isArray(expected) ? expected.indexOf(resolved[key]) !== -1 : resolved[key] === expected;
        });
    }

    function step(option) {
        if (typeof option.step === 'number') return option.step;
        var range = (option.max !== undefined ? option.max : 100) - (option.min !== undefined ? option.min : 0);
        if (range <= 1) return 0.01;
        if (range <= 10 || Math.floor(option.default) !== option.default) return 0.05;
        if (option.unit === 'ms') return 10;
        return 1;
    }

    function label(option, key) {
        var text = option.label || prettify(key);
        return option.unit ? text + ' (' + option.unit + ')' : text;
    }

    function control(key, option, value, defaults, onChange) {
        var common = { key: key, label: label(option, key), help: option.description || undefined, __nextHasNoMarginBottom: true };

        switch (option.type) {
            case 'enum':
                return el(C.SelectControl, Object.assign(common, {
                    value: String(value),
                    options: enumOptions(option),
                    onChange: onChange,
                    __next40pxDefaultSize: true,
                }));
            case 'number':
                return el(C.RangeControl, Object.assign(common, {
                    value: Number(value),
                    min: option.min,
                    max: option.max,
                    step: step(option),
                    allowReset: true,
                    resetFallbackValue: option.default,
                    onChange: function (v) { onChange(v === undefined || v === null || isNaN(v) ? option.default : v); },
                    __next40pxDefaultSize: true,
                }));
            case 'boolean':
                return el(C.ToggleControl, Object.assign(common, { checked: !!value, onChange: onChange }));
            case 'color':
                return el(C.BaseControl, { key: key, label: label(option, key), help: option.description || undefined, __nextHasNoMarginBottom: true },
                    el(ColorPalette, {
                        value: value,
                        onChange: function (v) { onChange(v || option.default); },
                        clearable: true,
                    })
                );
            default: // string, selector
                return el(C.TextControl, Object.assign(common, {
                    value: value === undefined || value === null ? '' : String(value),
                    placeholder: Object.prototype.hasOwnProperty.call(defaults, key) ? String(defaults[key]) : undefined,
                    onChange: onChange,
                    __next40pxDefaultSize: true,
                }));
        }
    }

    /** A collapsible group of controls; the first group of a module starts open. */
    function Group(props) {
        var state = wp.element.useState(props.initialOpen);
        var open = state[0];
        return el('div', { className: 'aurora-blocks__group' + (open ? ' is-open' : '') },
            el(C.Button, {
                className: 'aurora-blocks__group-toggle',
                'aria-expanded': open,
                icon: open ? 'arrow-up-alt2' : 'arrow-down-alt2',
                iconPosition: 'right',
                onClick: function () { state[1](!open); },
            }, props.title),
            open && el(C.__experimentalVStack || 'div', { spacing: 4, className: 'aurora-blocks__controls' }, props.children)
        );
    }

    function ModuleSection(props) {
        var module = props.module;
        var schema = SCHEMAS[module];
        var all = props.value || {};
        var saved = all[module];
        var on = !!saved && typeof saved === 'object';
        var defaults = blockDefaults(module, props.blockName);

        function store(next) {
            var copy = Object.assign({}, all);
            if (next) copy[module] = next; else delete copy[module];
            props.onChange(Object.keys(copy).length ? copy : undefined);
        }

        function toggle(checked) {
            if (!checked) return store(null);
            var first = {};
            // Modules without a primary option (cursor) are switched on by an empty object.
            if (schema.primary) {
                first[schema.primary] = Object.prototype.hasOwnProperty.call(defaults, schema.primary)
                    ? defaults[schema.primary]
                    : schema.options[schema.primary].default;
            }
            store(first);
        }

        function setOption(key, v) {
            var next = Object.assign({}, saved);
            var option = schema.options[key];
            var fallback = Object.prototype.hasOwnProperty.call(defaults, key) ? defaults[key] : option.default;
            if ((!schema.primary || key !== schema.primary) && v === fallback) delete next[key];
            else next[key] = v;
            store(next);
        }

        var children = [
            el(C.ToggleControl, {
                key: 'on',
                label: TITLES[module] || prettify(module),
                help: HELP[module],
                checked: on,
                onChange: toggle,
                __nextHasNoMarginBottom: true,
            }),
        ];

        if (on) {
            var resolved = resolve(schema, saved, defaults);
            var groups = [];
            var byGroup = {};
            Object.keys(schema.options).forEach(function (key) {
                var option = schema.options[key];
                if (!visible(option, resolved)) return;
                var g = option.group || __('Options', 'aurora-for-blocks');
                if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
                byGroup[g].push(control(key, option, resolved[key], defaults, function (v) { setOption(key, v); }));
            });
            groups.forEach(function (g, i) {
                children.push(el(Group, { key: 'g-' + g, title: g, initialOpen: i === 0 }, byGroup[g]));
            });
        }

        return el('div', { className: 'aurora-blocks__module' + (on ? ' is-on' : '') }, children);
    }

    // Declare the attribute in the editor too, so it survives saving.
    addFilter('blocks.registerBlockType', 'aurora/blocks/attribute', function (settings) {
        if (!settings || !settings.attributes || settings.attributes[ATTR]) return settings;
        var attributes = Object.assign({}, settings.attributes);
        attributes[ATTR] = { type: 'object' };
        return Object.assign({}, settings, { attributes: attributes });
    });

    var withAuroraPanel = createHigherOrderComponent(function (BlockEdit) {
        return function (props) {
            var modules = offered(props.name);
            if (!modules.length || !props.isSelected) return el(BlockEdit, props);

            var value = props.attributes[ATTR];
            var active = modules.filter(function (m) { return value && value[m]; }).length;

            return el(Fragment, null,
                el(BlockEdit, props),
                el(InspectorControls, null,
                    el(C.PanelBody, {
                        title: active ? __('Aurora', 'aurora-for-blocks') + ' (' + active + ')' : __('Aurora', 'aurora-for-blocks'),
                        initialOpen: !!active,
                        className: 'aurora-blocks',
                    },
                        modules.map(function (m) {
                            return el(ModuleSection, {
                                key: m,
                                module: m,
                                blockName: props.name,
                                value: value,
                                onChange: function (next) {
                                    var update = {};
                                    update[ATTR] = next;
                                    props.setAttributes(update);
                                },
                            });
                        }),
                        el('p', { className: 'aurora-blocks__note' },
                            __('Animations play on the published page and in Preview, not in the editor. All of them respect the visitor’s “reduce motion” setting.', 'aurora-for-blocks'))
                    )
                )
            );
        };
    }, 'withAuroraPanel');

    addFilter('editor.BlockEdit', 'aurora/blocks/inspector', withAuroraPanel);
})(window.wp, window.AuroraBlocks);
