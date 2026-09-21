import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAurora } from '@aurora/core';
import { children } from '../src/index.js';
import { buildKeyframes, families } from '../src/catalog.js';
import { resolveChildren } from '../src/targets.js';

var aurora;
var calls;

beforeEach(() => {
    calls = [];
    Element.prototype.animate = vi.fn(function (frames, timing) {
        var animation = { frames: frames, timing: timing, cancelled: false, cancel: function () { this.cancelled = true; } };
        calls.push({ el: this, animation: animation });
        return animation;
    });
    document.body.innerHTML =
        '<div id="root">' +
        '<div class="card" id="c1"><p class="card">nested</p></div>' +
        '<div class="card" id="c2"></div>' +
        '<div class="card" id="c3"></div>' +
        '</div>';
    aurora = createAurora();
    aurora.register(children);
});

afterEach(() => {
    aurora.destroy();
    delete Element.prototype.animate;
    vi.useRealTimers();
});

var root = () => document.getElementById('root');

describe('resolveChildren', () => {
    it('returns direct children by default', () => {
        expect(resolveChildren(root(), {}).map((e) => e.id)).toEqual(['c1', 'c2', 'c3']);
    });

    it('includes deeper levels with depth', () => {
        var all = resolveChildren(root(), { depth: 2 });
        expect(all).toHaveLength(4);
    });

    it('selector returns outermost matches only', () => {
        var found = resolveChildren(root(), { selector: '.card' });
        expect(found.map((e) => e.id)).toEqual(['c1', 'c2', 'c3']);
    });

    it('ignores an invalid selector', () => {
        expect(resolveChildren(root(), { selector: '<<<' })).toEqual([]);
    });
});

describe('catalog', () => {
    it('every entrance family ends at the natural state', () => {
        ['fade', 'slide', 'zoom', 'bounce', 'rotate', 'flip', 'blur', 'focus'].forEach((name) => {
            ['up', 'down', 'left', 'right', 'none'].forEach((dir) => {
                var frames = buildKeyframes(name, dir, 32);
                expect(frames.length).toBeGreaterThan(1);
                var last = frames[frames.length - 1];
                expect(last.opacity === undefined || last.opacity === 1).toBe(true);
            });
        });
    });

    it('direction of travel sets the start position', () => {
        expect(buildKeyframes('fade', 'up', 30)[0].transform).toContain('0px,30px');
        expect(buildKeyframes('fade', 'left', 30)[0].transform).toContain('30px,0px');
    });

    it('returns no keyframes for unknown families', () => {
        expect(buildKeyframes('nope', 'up', 1)).toEqual([]);
        expect(Object.keys(families)).toContain('pulse');
    });
});

describe('children module', () => {
    it('staggers the entrance with WAAPI', () => {
        aurora.children(root(), { trigger: 'load', stagger: 100, delay: 50, duration: 400 });
        expect(calls).toHaveLength(3);
        expect(calls.map((c) => c.animation.timing.delay)).toEqual([50, 150, 250]);
        expect(calls[0].animation.timing.duration).toBe(400);
        expect(calls[0].animation.timing.fill).toBe('backwards');
    });

    it('alternates the direction between children', () => {
        aurora.children(root(), { trigger: 'load', animation: 'slide', alternate: 'horizontal' });
        var first = calls[0].animation.frames[0].transform;
        var second = calls[1].animation.frames[0].transform;
        expect(first).toContain('100%,0%');
        expect(second).toContain('-100%,0%');
    });

    it('hides children until the scroll trigger fires', () => {
        vi.useFakeTimers(); // No IntersectionObserver in jsdom: the pool fires on a timer.
        aurora.children(root(), { trigger: 'scroll' });
        var c1 = document.getElementById('c1');
        expect(c1.style.opacity).toBe('0');
        expect(calls).toHaveLength(0);
        vi.runAllTimers();
        expect(calls).toHaveLength(3);
        expect(c1.style.opacity).toBe('');
    });

    it('shows children immediately with reduced motion', () => {
        window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
        aurora.children(root(), { trigger: 'scroll' });
        expect(document.getElementById('c1').style.opacity).toBe('');
        expect(calls).toHaveLength(0);
        delete window.matchMedia;
    });

    it('emphasis animations do not hide children', () => {
        vi.useFakeTimers();
        aurora.children(root(), { animation: 'pulse' });
        expect(document.getElementById('c1').style.opacity).toBe('');
    });

    it('destroy cancels animations and restores the elements', () => {
        var instance = aurora.children(root(), { trigger: 'load', hover: true });
        instance.destroy();
        expect(calls.every((c) => c.animation.cancelled)).toBe(true);
        expect(document.getElementById('c1').style.transition).toBe('');
    });

    it('hover applies a transform and pointerleave clears it', () => {
        aurora.children(root(), { animation: 'none', hover: true, hoverPreset: 'lift' });
        var c1 = document.getElementById('c1');
        c1.dispatchEvent(new MouseEvent('pointerenter'));
        expect(c1.style.transform).toContain('translate3d(0px,-10px,0)');
        root().dispatchEvent(new MouseEvent('pointerleave'));
        expect(c1.style.transform).toBe('');
    });

    it('proximity gives neighbours a smaller share', () => {
        var els = ['c1', 'c2', 'c3'].map((id) => document.getElementById(id));
        els.forEach((el, i) => {
            el.getBoundingClientRect = () => ({ left: i * 100, top: 0, width: 100, height: 100 });
        });
        aurora.children(root(), { animation: 'none', hover: true, hoverPreset: 'lift', proximity: true, proximityIntensity: 0.5 });
        els[1].dispatchEvent(new MouseEvent('pointerenter'));
        var y = (el) => parseFloat(/,(-?[\d.]+)px,0\)/.exec(el.style.transform)[1]);
        expect(y(els[1])).toBe(-10);
        expect(Math.abs(y(els[0]))).toBeGreaterThan(0);
        expect(Math.abs(y(els[0]))).toBeLessThan(10);
    });

    it('reads options from data attributes', () => {
        root().setAttribute('data-aurora-children', 'zoom');
        root().setAttribute('data-aurora-children-trigger', 'load');
        root().setAttribute('data-aurora-children-stagger', '40');
        aurora.init();
        expect(calls).toHaveLength(3);
        expect(calls[1].animation.timing.delay).toBe(40);
    });

    it('animates the children of the root selector instead of the element', () => {
        document.body.innerHTML = '<div id="root"><div class="inner"><i id="a"></i><i id="b"></i></div><p id="other"></p></div>';
        aurora.children(document.getElementById('root'), { trigger: 'load', root: '.inner' });
        expect(calls.map((c) => c.el.id)).toEqual(['a', 'b']);
    });
});
