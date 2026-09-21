import { describe, it, expect, vi } from 'vitest';
import { defineSchema, getDefaults, coerceValue, normalizeOptions, readAttributes, resolveOptions } from '../src/options.js';

var schema = defineSchema({
    primary: 'effect',
    options: {
        effect: { type: 'enum', values: ['fade-up', 'glitch'], default: 'fade-up' },
        duration: { type: 'number', default: 800, min: 0, max: 5000 },
        replay: { type: 'boolean', default: false },
        splitBy: { type: 'enum', values: [{ value: 'chars', label: 'Characters' }, 'words'], default: 'chars' },
        color: { type: 'color', default: '#fff' },
        target: { type: 'selector', default: '' },
        stops: { type: 'list', separator: ';', default: [] },
        extra: { type: 'json', default: { a: 1 } },
    },
});

function el(html) {
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    return wrap.firstElementChild;
}

describe('defineSchema', () => {
    it('normalizes enum values into {value, label}', () => {
        expect(schema.options.splitBy.values).toEqual([
            { value: 'chars', label: 'Characters' },
            { value: 'words', label: 'words' },
        ]);
    });

    it('rejects invalid definitions', () => {
        expect(() => defineSchema({})).toThrow();
        expect(() => defineSchema({ options: { a: { type: 'nope' } } })).toThrow();
        expect(() => defineSchema({ options: { a: { type: 'enum' } } })).toThrow();
        expect(() => defineSchema({ primary: 'x', options: { a: { type: 'string' } } })).toThrow();
    });
});

describe('getDefaults', () => {
    it('returns defaults and deep-copies objects', () => {
        var a = getDefaults(schema);
        a.extra.a = 2;
        expect(getDefaults(schema).extra.a).toBe(1);
        expect(a.duration).toBe(800);
    });
});

describe('coerceValue', () => {
    it('coerces numbers and clamps to the range', () => {
        expect(coerceValue(schema.options.duration, '1200')).toEqual({ ok: true, value: 1200 });
        expect(coerceValue(schema.options.duration, '99999')).toEqual({ ok: true, value: 5000 });
        expect(coerceValue(schema.options.duration, '-5')).toEqual({ ok: true, value: 0 });
        expect(coerceValue(schema.options.duration, 'abc').ok).toBe(false);
    });

    it('coerces booleans from attribute-style words', () => {
        ['true', '1', 'yes', 'on', '', true].forEach((v) => expect(coerceValue(schema.options.replay, v).value).toBe(true));
        ['false', '0', 'no', 'off', false].forEach((v) => expect(coerceValue(schema.options.replay, v).value).toBe(false));
        expect(coerceValue(schema.options.replay, 'maybe').ok).toBe(false);
    });

    it('validates enums', () => {
        expect(coerceValue(schema.options.effect, 'glitch').value).toBe('glitch');
        expect(coerceValue(schema.options.effect, 'nope').ok).toBe(false);
    });

    it('validates selectors', () => {
        expect(coerceValue(schema.options.target, '.a > b').value).toBe('.a > b');
        expect(coerceValue(schema.options.target, '').value).toBe('');
        expect(coerceValue(schema.options.target, '<<<').ok).toBe(false);
    });

    it('parses lists with a custom separator, keeping commas inside items', () => {
        expect(coerceValue(schema.options.stops, 'rgb(1,2,3); #fff').value).toEqual(['rgb(1,2,3)', '#fff']);
        expect(coerceValue(schema.options.stops, ['a', 'b']).value).toEqual(['a', 'b']);
    });

    it('parses JSON', () => {
        expect(coerceValue(schema.options.extra, '{"b":2}').value).toEqual({ b: 2 });
        expect(coerceValue(schema.options.extra, '{bad').ok).toBe(false);
        expect(coerceValue(schema.options.extra, { c: 3 }).value).toEqual({ c: 3 });
    });

    it('rejects empty colors', () => {
        expect(coerceValue(schema.options.color, '  ').ok).toBe(false);
        expect(coerceValue(schema.options.color, ' red ').value).toBe('red');
    });
});

describe('normalizeOptions', () => {
    it('drops unknown and invalid keys with warnings', () => {
        var warn = vi.fn();
        var out = normalizeOptions(schema, { duration: '10', bogus: 1, effect: 'nope' }, warn);
        expect(out).toEqual({ duration: 10 });
        expect(warn).toHaveBeenCalledTimes(2);
    });
});

describe('readAttributes / resolveOptions', () => {
    it('reads the primary attribute, flat attributes and the JSON attribute', () => {
        var node = el('<h1 data-aurora-text="glitch" data-aurora-text-split-by="words" data-aurora-text-replay data-aurora-text-options=\'{"duration": 300, "color": "red"}\'></h1>');
        expect(readAttributes(node, 'text', schema)).toEqual({
            effect: 'glitch',
            splitBy: 'words',
            replay: true,
            duration: 300,
            color: 'red',
        });
    });

    it('lets flat attributes override the JSON attribute', () => {
        var node = el('<h1 data-aurora-text-options=\'{"duration": 300}\' data-aurora-text-duration="700"></h1>');
        expect(readAttributes(node, 'text', schema).duration).toBe(700);
    });

    it('ignores an empty primary attribute', () => {
        var node = el('<h1 data-aurora-text=""></h1>');
        expect(readAttributes(node, 'text', schema)).toEqual({});
    });

    it('warns about malformed JSON', () => {
        var warn = vi.fn();
        readAttributes(el('<h1 data-aurora-text-options="{oops"></h1>'), 'text', schema, warn);
        expect(warn).toHaveBeenCalled();
    });

    it('applies the full precedence chain', () => {
        var node = el('<h1 data-aurora-text-duration="700" data-aurora-text="glitch"></h1>');
        var out = resolveOptions(node, 'text', schema, { duration: 100 });
        expect(out.duration).toBe(100);      // explicit beats attribute
        expect(out.effect).toBe('glitch');   // attribute beats default
        expect(out.splitBy).toBe('chars');   // default
    });

    it('keeps module namespaces apart on the same element', () => {
        var other = defineSchema({ options: { duration: { type: 'number', default: 5 } } });
        var node = el('<h1 data-aurora-text-duration="700" data-aurora-gradient-duration="9"></h1>');
        expect(resolveOptions(node, 'text', schema).duration).toBe(700);
        expect(resolveOptions(node, 'gradient', other).duration).toBe(9);
    });
});
