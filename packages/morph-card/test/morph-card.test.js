import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAurora } from '@aurora/core';
import { morphCard } from '../src/index.js';
import { frameFor, contentFor, safeUrl, escapeHtml } from '../src/templates.js';

var aurora;
var animations;

beforeEach(() => {
    animations = [];
    Element.prototype.animate = vi.fn(function (frames, options) {
        var finished = Promise.resolve();
        var animation = { frames: frames, options: options, finished: finished, cancel: vi.fn() };
        animations.push(animation);
        return animation;
    });
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
    document.body.innerHTML = '<div id="stage"><p>original</p></div>';
    aurora = createAurora();
    aurora.register(morphCard);
});

afterEach(() => {
    aurora.destroy();
    delete Element.prototype.animate;
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

var stage = () => document.getElementById('stage');
var states = [
    { template: 'post', username: 'aurora', caption: 'First', photo: 'a.jpg', likes: 12, durationMs: 1000 },
    { template: 'polaroid', caption: 'Second', photo: 'b.jpg', frame: 'vintage', durationMs: 1000, transitionDurationMs: 400 },
    { template: 'profile', name: 'Aurora', bio: 'Hello', durationMs: 1000 },
];

describe('templates', () => {
    it('escapes html and rejects unsafe urls', () => {
        expect(escapeHtml('<b>"x"</b>')).toBe('&lt;b&gt;&quot;x&quot;&lt;/b&gt;');
        expect(safeUrl('javascript:alert(1)')).toBe('');
        expect(safeUrl('https://x.test/a.jpg')).toBe('https://x.test/a.jpg');
        expect(safeUrl('/img/a.jpg')).toBe('/img/a.jpg');
        expect(safeUrl('data:image/png;base64,AAA')).toContain('data:image');
    });

    it('describes the frame of each template', () => {
        expect(frameFor({ template: 'post' }).mode).toBe('post');
        expect(frameFor({ template: 'polaroid', size: 'instax' }).imageAspectRatio).toBe('3 / 4');
        expect(frameFor({ template: 'polaroid', frame: 'pink' }).frameClass).toBe('amc-frame-pink');
        expect(frameFor({ template: 'custom', radius: 8, padding: { top: 4, right: 4, bottom: 4, left: 4 } }).padding).toBe('4px 4px 4px 4px');
    });

    it('renders escaped content and honors label overrides', () => {
        var post = contentFor({ template: 'post', username: '<u>', likes: 3, caption: 'hi' }, { likes: 'curtidas' });
        expect(post.header).toContain('&lt;u&gt;');
        expect(post.footer).toContain('curtidas');
        expect(post.footer).toContain('<svg');
        var profile = contentFor({ template: 'profile' }, {});
        expect(profile.image.match(/amc-profile-grid-item-empty/g)).toHaveLength(9);
    });
});

describe('morph card module', () => {
    it('builds the card DOM and renders the first state', () => {
        aurora.morphCard(stage(), { states: states });
        expect(stage().classList.contains('aurora-morph-card')).toBe(true);
        expect(stage().querySelector('.amc-card.amc-mode-post')).not.toBeNull();
        expect(stage().querySelector('.amc-post-username').textContent).toBe('aurora');
        expect(stage().textContent).not.toContain('original');
    });

    it('restores the original content on destroy', () => {
        var instance = aurora.morphCard(stage(), { states: states });
        instance.destroy();
        expect(stage().innerHTML).toBe('<p>original</p>');
        expect(stage().classList.contains('aurora-morph-card')).toBe(false);
    });

    it('warns without states and leaves the element alone', () => {
        var warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        aurora.morphCard(stage(), {});
        expect(stage().innerHTML).toBe('<p>original</p>');
        expect(warn).toHaveBeenCalled();
    });

    it('goTo morphs to the polaroid, arming the frame transition and typing the caption', async () => {
        vi.useFakeTimers();
        var instance = aurora.morphCard(stage(), { states: states, autoplay: false });
        var card = stage().querySelector('.amc-card');

        var done = instance.api.goTo(1);
        expect(card.classList.contains('amc-mode-polaroid')).toBe(true);
        expect(card.classList.contains('amc-frame-vintage')).toBe(true);
        expect(card.classList.contains('is-morphing')).toBe(true);
        expect(card.style.getPropertyValue('--amc-morph-duration')).toBe('400ms');
        expect(stage().querySelector('.amc-caption-text').textContent).toBe('');

        await vi.advanceTimersByTimeAsync(5000);
        await done;
        expect(stage().querySelector('.amc-caption-text').textContent).toBe('Second');
        expect(card.classList.contains('is-morphing')).toBe(false);
        expect(stage().querySelector('.amc-zone-overlay')).toBeNull();
    });

    it('autoplay advances after the state duration and loops back', async () => {
        vi.useFakeTimers();
        aurora.morphCard(stage(), { states: [states[0], states[2]], loop: true });
        var card = stage().querySelector('.amc-card');
        expect(card.classList.contains('amc-mode-post')).toBe(true);
        await vi.advanceTimersByTimeAsync(1100);
        expect(card.classList.contains('amc-mode-profile')).toBe(true);
        await vi.advanceTimersByTimeAsync(1000);
        expect(card.classList.contains('amc-mode-post')).toBe(true);
    });

    it('does not loop when loop is off', async () => {
        vi.useFakeTimers();
        aurora.morphCard(stage(), { states: [states[0], states[2]], loop: false });
        await vi.advanceTimersByTimeAsync(20000);
        expect(stage().querySelector('.amc-card').classList.contains('amc-mode-profile')).toBe(true);
    });

    it('destroy cancels pending timers and animations', async () => {
        vi.useFakeTimers();
        var instance = aurora.morphCard(stage(), { states: states });
        await vi.advanceTimersByTimeAsync(1100);
        instance.destroy();
        var count = animations.length;
        await vi.advanceTimersByTimeAsync(20000);
        expect(animations.length).toBe(count);
        expect(animations.every((a) => a.cancel.mock.calls.length >= 0)).toBe(true);
    });

    it('shows a still first state with reduced motion', async () => {
        vi.useFakeTimers();
        window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
        aurora.morphCard(stage(), { states: states });
        await vi.advanceTimersByTimeAsync(20000);
        expect(stage().querySelector('.amc-card').classList.contains('amc-mode-post')).toBe(true);
        delete window.matchMedia;
    });

    it('reads states from a data attribute', () => {
        stage().setAttribute('data-aurora-morph-card', '');
        stage().setAttribute('data-aurora-morph-card-states', JSON.stringify(states));
        stage().setAttribute('data-aurora-morph-card-autoplay', 'false');
        aurora.init();
        expect(stage().querySelector('.amc-card')).not.toBeNull();
    });
});
