/**
 * Schema-driven option handling.
 *
 * Every module declares a schema describing its options. The same schema is
 * used to (1) read `data-aurora-*` attributes, (2) coerce values coming from
 * JavaScript, (3) fill in defaults, and (4) generate documentation and the
 * Elementor controls at build time.
 *
 * Attribute contract for a module named `text` with an option `splitBy`:
 *
 *   data-aurora-text="fade-up"            primary option (see `schema.primary`)
 *   data-aurora-text-split-by="words"     one attribute per option
 *   data-aurora-text-options='{"...":1}'  JSON object with several options
 *
 * Precedence (lowest to highest): defaults < JSON attribute < flat attributes
 * < primary attribute < options passed from JavaScript.
 */

import { camelToKebab, clamp, isPlainObject } from './utils.js';

/** @typedef {'string'|'selector'|'number'|'boolean'|'enum'|'color'|'json'|'list'} OptionType */

/**
 * @typedef {Object} OptionSpec
 * @property {OptionType} type
 * @property {*} [default]
 * @property {string} [label]        Human readable name (docs, builder panels).
 * @property {string} [description]
 * @property {string} [group]        Panel/section the option belongs to.
 * @property {number} [min]          `number` only.
 * @property {number} [max]          `number` only.
 * @property {number} [step]         `number` only (documentation hint).
 * @property {string} [unit]         `number` only (documentation hint, e.g. `ms`).
 * @property {Array<string|{value: string, label?: string}>} [values]  `enum` only.
 * @property {string} [separator]    `list` only. Defaults to `,`.
 * @property {string} [showWhen]     Documentation hint, e.g. `trigger=scroll`.
 */

/**
 * @typedef {Object} Schema
 * @property {string} [primary]   Option filled by the value of `data-aurora-<module>`.
 * @property {Record<string, OptionSpec>} options
 */

var TRUE_WORDS = ['true', '1', 'yes', 'on', ''];
var FALSE_WORDS = ['false', '0', 'no', 'off'];
var TYPES = ['string', 'selector', 'number', 'boolean', 'enum', 'color', 'json', 'list'];

/**
 * Validates and normalizes a schema. Throws on programmer errors so mistakes
 * surface at module definition time, not on the page.
 *
 * @param {Schema} schema
 * @returns {Schema} A normalized copy (enum values are always `{value, label}`).
 */
export function defineSchema(schema) {
    if (!schema || !isPlainObject(schema.options)) {
        throw new Error('[Aurora] A schema needs an `options` object.');
    }

    var options = {};
    Object.keys(schema.options).forEach(function (key) {
        var spec = schema.options[key];
        if (!spec || TYPES.indexOf(spec.type) === -1) {
            throw new Error('[Aurora] Option "' + key + '" has an invalid type: ' + (spec && spec.type));
        }
        var copy = Object.assign({}, spec);
        if (spec.type === 'enum') {
            if (!Array.isArray(spec.values) || spec.values.length === 0) {
                throw new Error('[Aurora] Enum option "' + key + '" needs a non-empty `values` array.');
            }
            copy.values = spec.values.map(function (entry) {
                return typeof entry === 'string' ? { value: entry, label: entry } : { value: entry.value, label: entry.label || entry.value };
            });
        }
        options[key] = copy;
    });

    if (schema.primary && !options[schema.primary]) {
        throw new Error('[Aurora] `primary` points at an unknown option: ' + schema.primary);
    }

    return { primary: schema.primary || null, options: options };
}

/**
 * @param {Schema} schema A schema returned by {@link defineSchema}.
 * @returns {Record<string, *>} Fresh object with every default value.
 */
export function getDefaults(schema) {
    var out = {};
    Object.keys(schema.options).forEach(function (key) {
        var value = schema.options[key].default;
        out[key] = value !== null && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
    });
    return out;
}

/**
 * Coerces one raw value (attribute string or JS value) to the option type.
 *
 * @param {OptionSpec} spec
 * @param {*} raw
 * @returns {{ok: true, value: *} | {ok: false, reason: string}}
 */
export function coerceValue(spec, raw) {
    switch (spec.type) {
        case 'string':
        case 'color': {
            if (raw === null || raw === undefined) return fail('empty value');
            var text = String(raw).trim();
            if (spec.type === 'color' && text === '') return fail('empty color');
            return ok(text);
        }
        case 'selector': {
            var selector = String(raw === null || raw === undefined ? '' : raw).trim();
            if (selector === '') return ok('');
            try {
                document.createDocumentFragment().querySelector(selector);
            } catch (error) {
                return fail('invalid CSS selector "' + selector + '"');
            }
            return ok(selector);
        }
        case 'number': {
            var number = typeof raw === 'number' ? raw : parseFloat(raw);
            if (!isFinite(number)) return fail('"' + raw + '" is not a number');
            var min = typeof spec.min === 'number' ? spec.min : -Infinity;
            var max = typeof spec.max === 'number' ? spec.max : Infinity;
            return ok(clamp(number, min, max));
        }
        case 'boolean': {
            if (typeof raw === 'boolean') return ok(raw);
            var word = String(raw === null || raw === undefined ? '' : raw).trim().toLowerCase();
            if (TRUE_WORDS.indexOf(word) !== -1) return ok(true);
            if (FALSE_WORDS.indexOf(word) !== -1) return ok(false);
            return fail('"' + raw + '" is not a boolean');
        }
        case 'enum': {
            var candidate = String(raw).trim();
            var match = spec.values.some(function (entry) { return entry.value === candidate; });
            return match ? ok(candidate) : fail('"' + candidate + '" is not one of: ' + spec.values.map(function (e) { return e.value; }).join(', '));
        }
        case 'json': {
            if (raw !== null && typeof raw === 'object') return ok(raw);
            try {
                return ok(JSON.parse(String(raw)));
            } catch (error) {
                return fail('invalid JSON');
            }
        }
        case 'list': {
            if (Array.isArray(raw)) return ok(raw);
            var separator = spec.separator || ',';
            var items = String(raw === null || raw === undefined ? '' : raw)
                .split(separator)
                .map(function (item) { return item.trim(); })
                .filter(Boolean);
            return ok(items);
        }
        default:
            return fail('unsupported type');
    }
}

function ok(value) { return { ok: true, value: value }; }
function fail(reason) { return { ok: false, reason: reason }; }

/**
 * Coerces a partial options object, keeping only valid, known keys.
 *
 * @param {Schema} schema
 * @param {Record<string, *>} input
 * @param {(message: string) => void} [warn]
 * @returns {Record<string, *>}
 */
export function normalizeOptions(schema, input, warn) {
    var out = {};
    if (!isPlainObject(input)) return out;

    Object.keys(input).forEach(function (key) {
        var spec = schema.options[key];
        if (!spec) {
            if (warn) warn('Unknown option "' + key + '" ignored.');
            return;
        }
        if (input[key] === undefined) return;
        var result = coerceValue(spec, input[key]);
        if (result.ok) {
            out[key] = result.value;
        } else if (warn) {
            warn('Option "' + key + '": ' + result.reason + '. Using the previous or default value.');
        }
    });
    return out;
}

/**
 * Reads the options declared through attributes on an element.
 *
 * @param {Element} el
 * @param {string} name   Module name (kebab-case), e.g. `morph-card`.
 * @param {Schema} schema
 * @param {(message: string) => void} [warn]
 * @returns {Record<string, *>} Coerced partial options.
 */
export function readAttributes(el, name, schema, warn) {
    var raw = {};
    var prefix = 'data-aurora-' + name;

    var json = el.getAttribute(prefix + '-options');
    if (json) {
        try {
            var parsed = JSON.parse(json);
            if (isPlainObject(parsed)) {
                Object.assign(raw, parsed);
            } else if (warn) {
                warn('`' + prefix + '-options` must be a JSON object.');
            }
        } catch (error) {
            if (warn) warn('`' + prefix + '-options` is not valid JSON.');
        }
    }

    Object.keys(schema.options).forEach(function (key) {
        var attr = prefix + '-' + camelToKebab(key);
        if (el.hasAttribute(attr)) raw[key] = el.getAttribute(attr);
    });

    if (schema.primary && el.hasAttribute(prefix)) {
        var primary = el.getAttribute(prefix);
        if (primary !== null && primary.trim() !== '') raw[schema.primary] = primary;
    }

    return normalizeOptions(schema, raw, warn);
}

/**
 * Builds the complete options for an element.
 *
 * @param {Element} el
 * @param {string} name
 * @param {Schema} schema
 * @param {Record<string, *>} [explicit] Options passed from JavaScript.
 * @param {(message: string) => void} [warn]
 * @returns {Record<string, *>}
 */
export function resolveOptions(el, name, schema, explicit, warn) {
    return Object.assign(
        getDefaults(schema),
        readAttributes(el, name, schema, warn),
        normalizeOptions(schema, explicit || {}, warn)
    );
}
