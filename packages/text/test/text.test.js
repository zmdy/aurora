import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAurora } from '@aurora/core';
import { text, effects, EFFECT_IDS, schema } from '../src/index.js';
import { splitText } from '../src/split.js';
import { createFx } from '../src/fx.js';

var aurora;

beforeEach(() => {
    document.body.innerHTML = '<h1 id="t">Hello brave world</h1>';
    aurora = createAurora();
    aurora.register(text);
});

afterEach(() => {
    aurora.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

var el = () => document.getElementById('t');

describe('effect catalog', () => {
    it('ships 53 unique effects with a run function', () => {
        expect(EFFECT_IDS).toHaveLength(53);
        expect(new Set(EFFECT_IDS).size).toBe(53);
        EFFECT_IDS.forEach((id) => {
            expect(typeof effects[id].run).toBe('function');
            expect(effects[id].id).toBe(id);
        });
    });

    it('lists every effect in the schema enum', () => {
        var values = schema.options.effect.values.map((v) => v.value);
        expect(values).toEqual(EFFECT_IDS);
    });

    it('has no reference to removed libraries or legacy ids', () => {
        EFFECT_IDS.forEach((id) => expect(id).not.toMatch(/^(gs|ml)-/));
    });
});

describe('splitText', () => {
    it('splits into chars and sets aria-label', () => {
        var chars = splitText(el(), 'chars');
        expect(chars).toHaveLength('Hellobravevworld'.length - 1);
        expect(el().getAttribute('aria-label')).toBe('Hello brave world');
        expect(el().querySelectorAll('.aurora-char')).toHaveLength(chars.length);
    });

    it('collapses newlines and HTML indentation before splitting into chars', () => {
        // Authored, indented markup (e.g. a <br>-formatted heading) puts
        // newlines and leading whitespace into textContent — splitIntoChars
        // must not turn that whitespace into its own sliced "word".
        el().innerHTML = `Hello
        brave
        world`;
        var chars = splitText(el(), 'chars');
        chars.forEach((c) => expect(c.textContent.trim().length).toBeGreaterThan(0));
        expect(chars.map((c) => c.textContent).join('')).toBe('Hellobraveworld');
    });

    it('splits into words', () => {
        var words = splitText(el(), 'words');
        expect(words.map((w) => w.textContent.trim())).toEqual(['Hello', 'brave', 'world']);
    });

    it('splits into lines (jsdom has no layout, so everything is one line)', () => {
        var lines = splitText(el(), 'lines');
        expect(lines).toHaveLength(1);
    });

    it('treats <br> as a word boundary instead of gluing the surrounding words', () => {
        // textContent drops <br> entirely (it has no text node of its own), so
        // "um<br>dois" used to read back as "umdois" -- see the bug report this
        // regression-tests: chars and aria-label both have to keep the words apart.
        el().innerHTML = 'Solicite um<br>atendimento<br>personalizado';
        var chars = splitText(el(), 'chars');
        expect(chars.map((c) => c.textContent).join('')).toBe('Solicite' + 'um' + 'atendimento' + 'personalizado');
        expect(el().getAttribute('aria-label')).toBe('Solicite um atendimento personalizado');
    });

    it('collapses consecutive <br><br> into a single word boundary', () => {
        el().innerHTML = 'T\u00edtulo<br><br>Subt\u00edtulo';
        var words = splitText(el(), 'words');
        expect(words.map((w) => w.textContent.trim())).toEqual(['T\u00edtulo', 'Subt\u00edtulo']);
    });

    it('does not insert a space at other inline tag boundaries, matching how the markup renders with JS disabled', () => {
        // Unlike <br>, a <strong>/<span>/... boundary carries no inherent line
        // break: with no space in the source, the browser renders no gap either.
        // Treating every tag boundary as a word break would wrongly split text
        // deliberately styled mid-word, e.g. "Im<strong>port</strong>ant".
        el().innerHTML = 'Im<strong>port</strong>ant';
        var words = splitText(el(), 'words');
        expect(words.map((w) => w.textContent.trim())).toEqual(['Important']);
    });
});

describe('fx', () => {
    it('cleanup clears timers, intervals and listeners', () => {
        vi.useFakeTimers();
        var fx = createFx(el(), 'x');
        var timeout = vi.fn();
        var interval = vi.fn();
        var handler = vi.fn();
        fx.setTimeout(timeout, 100);
        fx.setInterval(interval, 50);
        fx.on(window, 'resize', handler);
        fx.onCleanup(handler);
        fx.cleanup();
        vi.advanceTimersByTime(500);
        window.dispatchEvent(new Event('resize'));
        expect(timeout).not.toHaveBeenCalled();
        expect(interval).not.toHaveBeenCalled();
        expect(handler).toHaveBeenCalledTimes(1); // only the explicit cleanup callback
    });
});

describe('text module', () => {
    function withFakeEffect() {
        var run = vi.fn();
        var original = effects['slide-in'].run;
        effects['slide-in'].run = run;
        return { run: run, restore: function () { effects['slide-in'].run = original; } };
    }

    it('passes a <br>-aware original to self-managed effects, not just to split effects', () => {
        // cinema-title is selfManaged: it skips splitText entirely and reads
        // fx.original directly. That capture used to read el.textContent too,
        // so it had the exact same <br>-swallowing bug as splitText. Spying on
        // .run (like withFakeEffect does for 'slide-in') checks the value the
        // effect actually receives without invoking real Anime.js, which the
        // real cinema-title.run would otherwise kick off here.
        el().innerHTML = 'Solicite um<br>atendimento';
        var original = effects['cinema-title'].run;
        var captured;
        effects['cinema-title'].run = function (units, opts, textEl, fx) { captured = fx.original; };
        var instance = aurora.text(el(), { trigger: 'load', effect: 'cinema-title' });
        effects['cinema-title'].run = original;
        expect(captured).toBe('Solicite um atendimento');
        instance.destroy();
    });

    it('splits, hides the units and plays on load', () => {
        var fake = withFakeEffect();
        aurora.text(el(), { trigger: 'load', effect: 'slide-in' });
        expect(fake.run).toHaveBeenCalledTimes(1);
        var units = fake.run.mock.calls[0][0];
        expect(units.length).toBeGreaterThan(5);
        expect(units[0].style.opacity).toBe('0');
        fake.restore();
    });

    it('waits for the trigger with scroll and plays once', () => {
        vi.useFakeTimers();
        var fake = withFakeEffect();
        aurora.text(el(), { trigger: 'scroll' });
        expect(fake.run).not.toHaveBeenCalled();
        vi.runAllTimers();
        expect(fake.run).toHaveBeenCalledTimes(1);
        fake.restore();
    });

    it('destroy restores the original markup, style and aria-label', () => {
        el().setAttribute('style', 'color: red;');
        var fake = withFakeEffect();
        var instance = aurora.text(el(), { trigger: 'load' });
        expect(el().querySelector('.aurora-char')).not.toBeNull();
        instance.destroy();
        expect(el().innerHTML).toBe('Hello brave world');
        expect(el().getAttribute('style')).toBe('color: red;');
        expect(el().hasAttribute('aria-label')).toBe(false);
        fake.restore();
    });

    it('replay rebuilds a fresh split', () => {
        vi.useFakeTimers();
        var fake = withFakeEffect();
        var instance = aurora.text(el(), { trigger: 'load' });
        var first = fake.run.mock.calls[0][0][0];
        instance.replay();
        vi.advanceTimersByTime(50);
        expect(fake.run).toHaveBeenCalledTimes(2);
        expect(fake.run.mock.calls[1][0][0]).not.toBe(first);
        fake.restore();
    });

    it('uses the target selector for the text node', () => {
        document.body.innerHTML = '<div id="t"><h2 class="title">Nested title</h2><p>Other</p></div>';
        var fake = withFakeEffect();
        aurora.text(el(), { trigger: 'load', target: '.title' });
        expect(el().querySelector('.title .aurora-char')).not.toBeNull();
        expect(el().querySelector('p').textContent).toBe('Other');
        fake.restore();
    });

    it('leaves the text untouched with reduced motion', () => {
        window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
        aurora.text(el(), { trigger: 'load' });
        expect(el().innerHTML).toBe('Hello brave world');
        delete window.matchMedia;
    });

    it('emits aurora:text:split with the units', () => {
        var fake = withFakeEffect();
        var seen = vi.fn();
        document.addEventListener('aurora:text:split', seen);
        aurora.text(el(), { trigger: 'load' });
        document.removeEventListener('aurora:text:split', seen);
        expect(seen).toHaveBeenCalled();
        expect(seen.mock.calls[0][0].detail.units.length).toBeGreaterThan(0);
        fake.restore();
    });
});

describe('every effect runs against the real Anime.js without throwing', () => {
    beforeEach(() => {
        vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });
        vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} });
        vi.stubGlobal('requestAnimationFrame', () => 0);
        vi.stubGlobal('cancelAnimationFrame', () => {});
        Object.defineProperty(document, 'fonts', { configurable: true, value: { status: 'loaded', ready: Promise.resolve() } });
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    });

    EFFECT_IDS.forEach((id) => {
        it(id, () => {
            var instance = aurora.text(el(), { effect: id, trigger: 'load' });
            expect(() => instance.destroy()).not.toThrow();
            expect(el().innerHTML).toBe('Hello brave world');
        });
    });
});
