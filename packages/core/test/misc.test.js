import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { injectStyle, removeStyle } from '../src/styles.js';
import { emit, listen } from '../src/events.js';
import { createTicker } from '../src/ticker.js';
import { camelToKebab, kebabToCamel, clamp, debounce, resolveTargets, isPlainObject } from '../src/utils.js';

describe('styles', () => {
    afterEach(() => { removeStyle('t'); });

    it('injects a stylesheet once per id', () => {
        var a = injectStyle('t', '.x{color:red}');
        var b = injectStyle('t', '.y{color:blue}');
        expect(a).toBe(b);
        expect(document.head.querySelectorAll('style[data-aurora-style="t"]')).toHaveLength(1);
        expect(a.textContent).toBe('.x{color:red}');
    });

    it('applies the nonce when provided', () => {
        var style = injectStyle('t', '', { nonce: 'abc' });
        expect(style.getAttribute('nonce')).toBe('abc');
    });
});

describe('events', () => {
    it('dispatches namespaced events that bubble and can be cancelled', () => {
        var parent = document.createElement('div');
        var child = document.createElement('span');
        parent.appendChild(child);
        var seen = [];
        var off = listen(parent, 'text', 'split', function (e) { seen.push(e.detail); e.preventDefault(); });
        expect(emit(child, 'text', 'split', { n: 3 })).toBe(false);
        expect(seen).toEqual([{ n: 3 }]);
        off();
        expect(emit(child, 'text', 'split', { n: 4 })).toBe(true);
    });
});

describe('ticker', () => {
    var frames;
    beforeEach(() => {
        frames = [];
        vi.stubGlobal('requestAnimationFrame', (cb) => { frames.push(cb); return frames.length; });
        vi.stubGlobal('cancelAnimationFrame', () => { frames.length = 0; });
    });
    afterEach(() => { vi.unstubAllGlobals(); });

    it('runs tasks each frame and stops when the last task is removed', () => {
        var ticker = createTicker();
        var task = vi.fn();
        var stop = ticker.add(task);
        expect(frames).toHaveLength(1);
        frames.shift()(100);
        expect(task).toHaveBeenCalledTimes(1);
        expect(frames).toHaveLength(1);
        stop();
        expect(frames).toHaveLength(0);
        expect(ticker.size).toBe(0);
    });

    it('passes the time delta and survives a throwing task', () => {
        var errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        var ticker = createTicker();
        var seen = [];
        ticker.add(() => { throw new Error('nope'); });
        ticker.add((now, delta) => { seen.push(delta); });
        frames.shift()(1000);
        frames.shift()(1016);
        expect(seen).toEqual([16, 16]);
        expect(errors).toHaveBeenCalled();
    });
});

describe('utils', () => {
    it('converts between camelCase and kebab-case', () => {
        expect(camelToKebab('splitBy')).toBe('split-by');
        expect(kebabToCamel('morph-card')).toBe('morphCard');
        expect(kebabToCamel(camelToKebab('interactiveScale'))).toBe('interactiveScale');
    });

    it('clamps', () => {
        expect(clamp(5, 0, 3)).toBe(3);
        expect(clamp(-1, 0, 3)).toBe(0);
        expect(clamp(2, 0, 3)).toBe(2);
    });

    it('detects plain objects', () => {
        expect(isPlainObject({})).toBe(true);
        expect(isPlainObject([])).toBe(false);
        expect(isPlainObject(null)).toBe(false);
    });

    it('debounces and can cancel', () => {
        vi.useFakeTimers();
        var fn = vi.fn();
        var d = debounce(fn, 50);
        d(); d(); d();
        vi.advanceTimersByTime(60);
        expect(fn).toHaveBeenCalledTimes(1);
        d();
        d.cancel();
        vi.advanceTimersByTime(60);
        expect(fn).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });

    it('resolves selectors, elements and lists', () => {
        document.body.innerHTML = '<i class="a"></i><i class="a"></i>';
        var first = document.querySelector('.a');
        expect(resolveTargets('.a')).toHaveLength(2);
        expect(resolveTargets(first)).toEqual([first]);
        expect(resolveTargets(document.querySelectorAll('.a'))).toHaveLength(2);
        expect(resolveTargets(null)).toEqual([]);
        expect(resolveTargets(document.createTextNode('x'))).toEqual([]);
    });
});
