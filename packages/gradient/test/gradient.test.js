import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createAurora } from '@aurora/core';
import { gradient, parseStops, buildGradientCss } from '../src/index.js';
import { buildMeshLayers } from '../src/css.js';

var aurora;
var frames;

function flushFrames() {
    var pending = frames;
    frames = [];
    pending.forEach((cb) => cb(performance.now()));
}

beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb) => { frames.push(cb); return frames.length; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    document.body.innerHTML = '<section id="box"><h1 id="title">Hello world</h1></section>';
    aurora = createAurora();
    aurora.register(gradient);
});

afterEach(() => {
    aurora.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.head.innerHTML = '';
});

var box = () => document.getElementById('box');
var title = () => document.getElementById('title');

describe('parseStops', () => {
    it('parses ";" separated colors with optional positions', () => {
        expect(parseStops('#ff0080;#7928ca 60;#2af598')).toEqual([
            { color: '#ff0080', offset: null },
            { color: '#7928ca', offset: 60 },
            { color: '#2af598', offset: null },
        ]);
    });

    it('keeps functional colors intact', () => {
        var stops = parseStops('rgb(255, 0, 128);hsl(200 50% 50%) 40%');
        expect(stops[0]).toEqual({ color: 'rgb(255, 0, 128)', offset: null });
        expect(stops[1]).toEqual({ color: 'hsl(200 50% 50%)', offset: 40 });
    });

    it('accepts a JSON array', () => {
        expect(parseStops('[{"color":"#111","offset":10},"#222 90"]')).toEqual([
            { color: '#111', offset: 10 },
            { color: '#222', offset: 90 },
        ]);
    });

    it('returns an empty list for invalid JSON', () => {
        expect(parseStops('[oops')).toEqual([]);
    });
});

describe('css builders', () => {
    var stops = [{ color: '#a', offset: null }, { color: '#b', offset: 50 }];

    it('builds linear, radial and conic gradients', () => {
        expect(buildGradientCss('linear', 90, stops)).toBe('linear-gradient(90deg, #a, #b 50%)');
        expect(buildGradientCss('radial', 0, stops)).toBe('radial-gradient(circle, #a, #b 50%)');
        expect(buildGradientCss('conic', 45, stops)).toBe('conic-gradient(from 45deg, #a, #b 50%)');
    });

    it('builds one blob layer per stop', () => {
        var mesh = buildMeshLayers(stops);
        expect(mesh.positions).toHaveLength(2);
        expect(mesh.image.split('radial-gradient').length - 1).toBe(2);
    });
});

describe('background', () => {
    it('paints a static background and restores it on destroy', () => {
        box().style.backgroundImage = 'none';
        var instance = aurora.gradient(box(), { type: 'linear', angle: 90, stops: '#111;#222' });
        expect(box().style.backgroundImage).toBe('linear-gradient(90deg, #111, #222)');
        instance.destroy();
        expect(box().style.backgroundImage).toBe('none');
    });

    it('animated flow uses classes and CSS variables, not per-instance style tags', () => {
        aurora.gradient(box(), { animation: 'flow', speed: 12 });
        expect(box().classList.contains('aurora-gradient-host')).toBe(true);
        expect(box().classList.contains('aurora-gradient-bg-flow')).toBe(true);
        expect(box().style.getPropertyValue('--aurora-gradient-speed')).toBe('12s');
        expect(box().style.getPropertyValue('--aurora-gradient-image')).toContain('radial-gradient');
        expect(document.querySelectorAll('style')).toHaveLength(1);
    });

    it('animated hue sets the gradient variable', () => {
        aurora.gradient(box(), { animation: 'hue' });
        expect(box().classList.contains('aurora-gradient-bg-hue')).toBe(true);
        expect(box().style.getPropertyValue('--aurora-gradient-image')).toContain('linear-gradient');
    });

    it('update repaints without leaving stale classes', () => {
        var instance = aurora.gradient(box(), { animation: 'flow' });
        instance.update({ animation: 'none' });
        expect(box().classList.contains('aurora-gradient-bg-flow')).toBe(false);
        expect(box().style.backgroundImage).toContain('linear-gradient');
    });

    it('warns and paints nothing with fewer than two stops', () => {
        var warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        aurora.gradient(box(), { stops: '#111' });
        expect(box().style.backgroundImage).toBe('');
        expect(warn).toHaveBeenCalled();
    });

    it('reads options from attributes', () => {
        box().setAttribute('data-aurora-gradient', 'radial');
        box().setAttribute('data-aurora-gradient-stops', '#f00;#00f');
        aurora.init();
        expect(box().style.backgroundImage).toBe('radial-gradient(circle, #f00, #00f)');
    });
});

describe('cursor spotlight', () => {
    it('recenters a radial gradient on the pointer and detaches on destroy', () => {
        box().getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 });
        var instance = aurora.gradient(box(), { followMouse: true, spotlightRadius: 300 });
        box().dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 50 }));
        flushFrames();
        expect(box().style.backgroundImage).toContain('circle 300px at 50% 50%');
        box().dispatchEvent(new MouseEvent('pointermove', { clientX: 50, clientY: 25 }));
        flushFrames();
        expect(box().style.backgroundImage).toContain('at 25% 25%');
        instance.destroy();
        var before = box().style.backgroundImage;
        box().dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }));
        flushFrames();
        expect(box().style.backgroundImage).toBe(before);
    });
});

describe('text', () => {
    it('paints the text fill on the element itself', () => {
        aurora.gradient(title(), { target: 'text', stops: '#111;#222' });
        expect(title().style.color).toBe('transparent');
        expect(title().style.backgroundImage).toContain('linear-gradient');
    });

    it('paints split units and repaints when the text module splits again', () => {
        title().innerHTML = '<span class="aurora-char">H</span><span class="aurora-char">i</span>';
        aurora.gradient(title(), { target: 'text', textMode: 'letter' });
        var first = title().querySelector('.aurora-char');
        expect(first.style.backgroundImage).toContain('linear-gradient');

        title().innerHTML = '<span class="aurora-char">H</span>';
        title().dispatchEvent(new CustomEvent('aurora:text:split', { bubbles: true }));
        flushFrames();
        expect(title().querySelector('.aurora-char').style.backgroundImage).toContain('linear-gradient');
    });

    it('animated text adds the pan class and 300% background size', () => {
        aurora.gradient(title(), { target: 'text', animation: 'flow' });
        expect(title().classList.contains('aurora-gradient-text-pan')).toBe(true);
        expect(title().style.backgroundSize).toBe('300% 300%');
    });

    it('destroy removes every inline paint', () => {
        var instance = aurora.gradient(title(), { target: 'text', animation: 'hue' });
        instance.destroy();
        expect(title().getAttribute('style') || '').toBe('');
        expect(title().className).toBe('');
    });
});

describe('icon', () => {
    it('adds an SVG gradient definition and points fills at it, then removes both', () => {
        document.body.innerHTML = '<div id="box"><svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg></div>';
        var instance = aurora.gradient(box(), { target: 'icon', stops: '#111;#222' });
        var svg = box().querySelector('svg');
        var grad = svg.querySelector('linearGradient');
        expect(grad).not.toBeNull();
        expect(svg.querySelectorAll('stop')).toHaveLength(2);
        expect(svg.querySelector('path').style.fill).toContain('url(#' + grad.id + ')');
        instance.destroy();
        expect(svg.querySelector('linearGradient')).toBeNull();
        expect(svg.querySelector('defs')).toBeNull();
        expect(svg.querySelector('path').style.fill).toBe('');
    });

    it('paints font icons with background-clip text', () => {
        document.body.innerHTML = '<div id="box"><i class="icon"></i></div>';
        aurora.gradient(box(), { target: 'icon' });
        expect(box().querySelector('i').style.backgroundImage).toContain('linear-gradient');
    });
});

describe('mesh', () => {
    function fakeGl() {
        var calls = [];
        var gl = new Proxy({}, {
            get: (target, key) => {
                if (typeof key !== 'string') return undefined;
                if (/^[A-Z_0-9]+$/.test(key)) return 1;
                return (...args) => {
                    calls.push(key);
                    if (key === 'getShaderParameter' || key === 'getProgramParameter') return true;
                    if (key === 'isContextLost') return false;
                    return {};
                };
            },
        });
        return { gl: gl, calls: calls };
    }

    it('falls back to a CSS gradient without WebGL', () => {
        vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
        aurora.gradient(box(), { type: 'mesh' });
        expect(box().querySelector('canvas')).toBeNull();
        expect(box().style.backgroundImage).toContain('linear-gradient');
    });

    it('mounts a canvas, updates uniforms in place and releases GL resources', () => {
        var fake = fakeGl();
        var spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake.gl);
        var instance = aurora.gradient(box(), { type: 'mesh', meshStyle: 'silk' });
        expect(box().querySelector('canvas.aurora-gradient-mesh-canvas')).not.toBeNull();

        instance.update({ swirl: 60 });
        expect(spy).toHaveBeenCalledTimes(1); // same style: no new context

        instance.update({ meshStyle: 'wave' });
        expect(spy).toHaveBeenCalledTimes(2); // new style: new program
        expect(box().querySelectorAll('canvas')).toHaveLength(1);

        instance.destroy();
        expect(box().querySelector('canvas')).toBeNull();
        expect(fake.calls).toContain('deleteProgram');
    });
});
