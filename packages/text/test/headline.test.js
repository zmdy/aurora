import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAurora } from '@aurora/core';
import { text } from '../src/index.js';
import { initHeadline } from '../src/headline.js';
import { graphemes } from '../src/headline-rotation.js';

var aurora, el;
beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<h2 id="headline" style="color:red"><em>Original</em> title</h2>';
    el = document.getElementById('headline');
    aurora = createAurora(); aurora.register(text);
});
afterEach(() => { aurora.destroy(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); });
function mount(options = {}) {
    return aurora.text(el, { mode: 'headline', trigger: 'load', highlightedText: 'Build', beforeText: 'We', afterText: 'together.', duration: 100, holdDuration: 300, ...options });
}

describe('headline composition and lifecycle', () => {
    it.each(['text-highlighter', 'airport-flip', 'scramble', 'sparkles-text', 'text-reveal-wall', 'letter-swap', 'echo-clone'])('rotates with %s and cleans up its animations and decorations', effect => {
        const handles = [];
        const originalAnimate = Element.prototype.animate;
        Element.prototype.animate = vi.fn((frames, timing) => {
            const handle = { pause: vi.fn(), play: vi.fn(), cancel: vi.fn(), frames, timing };
            handles.push(handle); return handle;
        });
        try {
            const instance = mount({ animationStyle: 'rotating', rotationEffect: effect, rotatingText: 'Tomorrow', highlightedText: 'Olá 👩‍🚀', headlineLoop: false });
            vi.advanceTimersByTime(0);
            expect(handles.length).toBeGreaterThan(0);
            if (effect !== 'text-highlighter') expect(el.querySelectorAll('.aurora-headline__char')).toHaveLength(4);
            instance.api.pause(); handles.forEach(h => expect(h.pause).toHaveBeenCalled());
            instance.api.play();
            handles.forEach(h => h.onfinish());
            expect(el.querySelectorAll('.aurora-headline__tape, .aurora-headline__echo, .aurora-headline__spark')).toHaveLength(0);
            instance.api.next();
            expect(instance.api.index).toBe(1);
            instance.destroy();
            expect(el.innerHTML).toBe('<em>Original</em> title');
            expect(vi.getTimerCount()).toBe(0);
        } finally { Element.prototype.animate = originalAnimate; }
    });
    it('keeps combining marks and emoji sequences in a single letter slot', () => {
        expect(graphemes('a\u0301👩‍🚀')).toEqual(['a\u0301', '👩‍🚀']);
    });
    it('draws and fades highlights with ordered keyframes and prevents delayed-path flashes', () => {
        const originalAnimate = Element.prototype.animate;
        const timings = [];
        Element.prototype.animate = vi.fn((frames, timing) => {
            expect(frames.map(f => f.offset)).toEqual(frames.map(f => f.offset).sort((a,b) => a-b));
            timings.push(timing); return { pause() {}, play() {}, cancel() {} };
        });
        try {
            mount(); vi.advanceTimersByTime(0);
            expect(timings).toHaveLength(2);
            expect(timings[1].delay).toBeGreaterThan(0);
            expect(timings.every(t => t.fill === 'backwards')).toBe(true);
        } finally { Element.prototype.animate = originalAnimate; }
    });
    it('only animates the center, escapes text and has a stable accessible sentence', () => {
        mount({ highlightedText: '<img src=x onerror=alert(1)>', animationStyle: 'rotating', rotatingText: 'Create\nCreate\n\nGrow' });
        expect(el.querySelector('img')).toBeNull();
        expect(el.querySelector('.aurora-headline__before').textContent).toBe('We ');
        expect(el.querySelector('.aurora-headline__after').textContent).toBe(' together.');
        expect(el.querySelectorAll('.aurora-headline__word')).toHaveLength(3);
        const sr = el.querySelector('.aurora-headline__sr').textContent;
        vi.advanceTimersByTime(500);
        expect(el.querySelector('.aurora-headline__sr').textContent).toBe(sr);
        expect(el.querySelector('.aurora-headline__visual').getAttribute('aria-hidden')).toBe('true');
    });
    it('updates without nesting markup, then restores the exact original nodes and listeners', () => {
        const original = el.firstChild, clicked = vi.fn(); original.addEventListener('click', clicked);
        const instance = mount();
        instance.update({ animationStyle: 'rotating', rotatingText: 'Design\nShip' });
        expect(el.querySelectorAll('.aurora-headline')).toHaveLength(1);
        instance.destroy();
        expect(el.firstChild).toBe(original);
        original.click(); expect(clicked).toHaveBeenCalledOnce();
        expect(el.innerHTML).toBe('<em>Original</em> title');
        expect(el.getAttribute('style')).toBe('color:red');
        expect(vi.getTimerCount()).toBe(0);
    });
    it('uses existing content as the empty highlighted-text fallback', () => {
        mount({ highlightedText: '', rotatingText: '\n\n' });
        expect(el.querySelector('.aurora-headline__word').textContent).toBe('Original title');
    });
    it('does not start before its delay, rotates, pauses and resumes', () => {
        const instance = mount({ animationStyle: 'rotating', rotatingText: 'Create\nGrow', delay: 200 });
        vi.advanceTimersByTime(199); expect(instance.api.index).toBe(0);
        vi.advanceTimersByTime(500); expect(instance.api.index).toBe(1);
        instance.api.pause(); vi.advanceTimersByTime(2000); expect(instance.api.index).toBe(1);
        instance.api.play(); vi.advanceTimersByTime(450); expect(instance.api.index).toBe(2);
        instance.replay(); expect(instance.api.index).toBe(0);
    });
    it('plays each rotating phrase once when looping is off', () => {
        const instance = mount({ animationStyle: 'rotating', rotatingText: 'Create\nGrow', headlineLoop: false });
        vi.advanceTimersByTime(2000); expect(instance.api.index).toBe(2);
        expect(vi.getTimerCount()).toBe(0);
        instance.replay(); expect(instance.api.index).toBe(0);
    });
    it('honors autoplay=false and supports manual next/play', () => {
        const instance = mount({ animationStyle: 'rotating', rotatingText: 'Create', headlineAutoplay: false });
        vi.advanceTimersByTime(2000); expect(instance.api.index).toBe(0);
        instance.api.next(); expect(instance.api.index).toBe(1);
        vi.advanceTimersByTime(2000); expect(instance.api.index).toBe(1);
        instance.api.play(); vi.advanceTimersByTime(450); expect(instance.api.index).toBe(0);
    });
    it('pauses on hover and in background tabs without stacking timers', () => {
        const instance = mount({ animationStyle: 'rotating', rotatingText: 'Create' });
        el.dispatchEvent(new Event('pointerenter')); vi.advanceTimersByTime(2000); expect(instance.api.index).toBe(0);
        el.dispatchEvent(new Event('pointerleave')); vi.advanceTimersByTime(450); expect(instance.api.index).toBe(1);
        const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
        document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(2000); expect(instance.api.index).toBe(1);
        hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); vi.advanceTimersByTime(450); expect(instance.api.index).toBe(0);
    });
    it.each(['underline', 'double-underline', 'circle', 'aurora-orbit', 'aurora-wave', 'aurora-spark'])('renders %s as an original SVG shape', shape => {
        mount({ animationShape: shape });
        expect(el.querySelector('svg')).not.toBeNull(); expect(el.querySelectorAll('path').length).toBeGreaterThan(0);
        expect(el.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    });
    it('allocates independent SVG gradients per instance', () => {
        mount(); const second = document.createElement('h2'); document.body.appendChild(second);
        aurora.text(second, { mode: 'headline' });
        const ids = [...document.querySelectorAll('linearGradient')].map(x => x.id);
        expect(new Set(ids).size).toBe(2);
    });
    it('works through standalone data attributes', () => {
        el.setAttribute('data-aurora-text', ''); el.setAttribute('data-aurora-text-mode', 'headline');
        el.setAttribute('data-aurora-text-options', JSON.stringify({ highlightedText: 'Aurora', animationStyle: 'rotating', rotatingText: 'Motion\nColor' }));
        aurora.init(); expect(el.querySelectorAll('.aurora-headline__word')).toHaveLength(3);
    });
    it('resumes an unfinished one-shot shape after leaving the viewport', () => {
        let observer; const cleanups = [];
        const options = mount({ headlineAutoplay: false }).options; aurora.destroy();
        const animation = { pause: vi.fn(), play: vi.fn(), cancel: vi.fn() };
        const originalAnimate = Element.prototype.animate;
        Element.prototype.animate = vi.fn(() => animation);
        const ctx = { reducedMotion: false, style() {}, emit() {}, on() {}, observe(node, value) { observer = value; }, onDestroy(fn) { cleanups.push(fn); }, onReducedMotionChange() {} };
        try {
            initHeadline(el, { ...options, headlineAutoplay: true, headlineLoop: false }, ctx);
            vi.advanceTimersByTime(0);
            observer.onLeave(); expect(animation.pause).toHaveBeenCalled();
            observer.onEnter(); expect(animation.play).toHaveBeenCalled();
            expect(vi.getTimerCount()).toBe(0);
            cleanups.forEach(fn => fn()); expect(animation.cancel).toHaveBeenCalled();
        } finally { Element.prototype.animate = originalAnimate; }
    });
    it('renders static composed content with reduced motion and cancels when preference changes', () => {
        let reduced = true, change; const cleanups = [];
        const options = mount({ headlineAutoplay: false }).options; aurora.destroy();
        const ctx = { get reducedMotion() { return reduced; }, style() {}, emit() {}, on() {}, observe() {}, onDestroy(fn) { cleanups.push(fn); }, onReducedMotionChange(fn) { change = fn; } };
        initHeadline(el, { ...options, headlineAutoplay: true, animationStyle: 'rotating', rotatingText: 'Motion' }, ctx);
        expect(el.querySelector('.aurora-headline__word').style.opacity).toBe('1'); expect(vi.getTimerCount()).toBe(0);
        reduced = false; change(); expect(vi.getTimerCount()).toBe(1);
        reduced = true; change(); expect(vi.getTimerCount()).toBe(0);
        cleanups.forEach(fn => fn()); expect(el.textContent).toBe('Original title');
    });
});
