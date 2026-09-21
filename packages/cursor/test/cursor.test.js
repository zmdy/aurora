import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAurora } from '@aurora/core';
import { cursor } from '../src/index.js';

var frames;
var clock;

function flush(ms) {
    clock += ms || 16;
    var pending = frames;
    frames = [];
    pending.forEach(function (cb) { cb(clock); });
}

function move(x, y, target) {
    (target || document.body).dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
}

function enter(el) { el.dispatchEvent(new MouseEvent('pointerenter')); }
function leave(el) { el.dispatchEvent(new MouseEvent('pointerleave')); }

var aurora;

beforeEach(() => {
    frames = [];
    clock = 1000;
    vi.stubGlobal('requestAnimationFrame', function (cb) { frames.push(cb); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', function () { frames = []; });
    document.body.innerHTML = '<div id="a"><a id="link" href="#">x</a></div><div id="b"></div>';
    aurora = createAurora();
    aurora.register(cursor);
});

afterEach(() => {
    aurora.destroy();
    vi.unstubAllGlobals();
});

describe('cursor module', () => {
    it('registers as Aurora.cursor and mounts one dot and one ring for several zones', () => {
        var a = document.getElementById('a');
        var b = document.getElementById('b');
        aurora.cursor(a);
        aurora.cursor(b);
        expect(document.querySelectorAll('.aurora-cursor-dot')).toHaveLength(1);
        expect(document.querySelectorAll('.aurora-cursor-ring')).toHaveLength(1);
    });

    it('hideNative defaults to off and toggles the class when enabled', () => {
        var a = document.getElementById('a');
        var b = document.getElementById('b');
        aurora.cursor(a);
        aurora.cursor(b, { hideNative: true });
        expect(a.classList.contains('aurora-cursor-native-hidden')).toBe(false);
        expect(b.classList.contains('aurora-cursor-native-hidden')).toBe(true);
    });

    it('the dot follows the pointer and the ring eases towards it', () => {
        var a = document.getElementById('a');
        aurora.cursor(a, { trailDelay: 150 });
        enter(a);
        move(100, 50, a);
        flush();
        var dot = document.querySelector('.aurora-cursor-dot');
        var ring = document.querySelector('.aurora-cursor-ring');
        expect(dot.style.transform).toContain('translate3d(100px,50px');
        // The ring starts at the first known position, so move again to create a gap.
        move(300, 50, a);
        flush(16);
        var ringX = parseFloat(/translate3d\(([\d.]+)px/.exec(ring.style.transform)[1]);
        expect(ringX).toBeGreaterThan(100);
        expect(ringX).toBeLessThan(300);
    });

    it('applies the interactive state over interactive elements', () => {
        var a = document.getElementById('a');
        aurora.cursor(a, { interactiveScale: 2 });
        enter(a);
        move(10, 10, document.getElementById('link'));
        flush();
        var ring = document.querySelector('.aurora-cursor-ring');
        expect(ring.style.getPropertyValue('--aurora-cursor-scale')).toBe('2');
        move(12, 12, a);
        flush();
        expect(ring.style.getPropertyValue('--aurora-cursor-scale')).toBe('1');
    });

    it('nested zones use a stack: leaving the inner zone restores the outer options', () => {
        var a = document.getElementById('a');
        var inner = document.getElementById('link');
        aurora.cursor(a, { dotSize: 8 });
        aurora.cursor(inner, { dotSize: 20 });
        var dot = document.querySelector('.aurora-cursor-dot');
        enter(a);
        expect(dot.style.width).toBe('8px');
        enter(inner);
        expect(dot.style.width).toBe('20px');
        leave(inner);
        expect(dot.style.width).toBe('8px');
    });

    it('update applies new options to the active zone', () => {
        var a = document.getElementById('a');
        var instance = aurora.cursor(a, { dotSize: 8 });
        enter(a);
        instance.update({ dotSize: 14 });
        expect(document.querySelector('.aurora-cursor-dot').style.width).toBe('14px');
    });

    it('destroying the last zone removes elements, listeners and the class', () => {
        var a = document.getElementById('a');
        var b = document.getElementById('b');
        var i1 = aurora.cursor(a, { hideNative: true });
        var i2 = aurora.cursor(b);
        i1.destroy();
        expect(document.querySelector('.aurora-cursor-dot')).not.toBeNull();
        expect(a.classList.contains('aurora-cursor-native-hidden')).toBe(false);
        i2.destroy();
        expect(document.querySelector('.aurora-cursor-dot')).toBeNull();
        expect(document.querySelector('.aurora-cursor-ring')).toBeNull();
        // No listener left: a pointer move must not schedule frames.
        frames = [];
        move(5, 5);
        expect(frames).toHaveLength(0);
    });

    it('stops the ticker once the ring has settled', () => {
        var a = document.getElementById('a');
        aurora.cursor(a);
        enter(a);
        move(40, 40, a);
        for (var i = 0; i < 5; i++) flush();
        expect(frames).toHaveLength(0);
    });
});
