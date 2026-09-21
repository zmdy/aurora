import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAurora, defineModule } from '../src/aurora.js';

function makeModule(overrides) {
    var calls = { init: [], update: [], replay: 0, destroy: 0 };
    var def = defineModule(Object.assign({
        name: 'demo',
        schema: {
            primary: 'mode',
            options: {
                mode: { type: 'enum', values: ['a', 'b'], default: 'a' },
                speed: { type: 'number', default: 1, min: 0, max: 10 },
            },
        },
        init: function (el, options, ctx) {
            calls.init.push({ el: el, options: options, ctx: ctx });
            return {
                update: function (next, prev) { calls.update.push({ next: next, prev: prev }); },
                replay: function () { calls.replay += 1; },
                destroy: function () { calls.destroy += 1; },
            };
        },
    }, overrides));
    return { def: def, calls: calls };
}

var aurora;

beforeEach(() => {
    document.body.innerHTML = '';
    aurora = createAurora();
});

afterEach(() => {
    aurora.destroy();
    aurora.disconnect();
});

describe('defineModule', () => {
    it('requires a kebab-case name and an init function', () => {
        expect(() => defineModule({ name: 'Bad Name', init() {} })).toThrow();
        expect(() => defineModule({ name: 'ok' })).toThrow();
        expect(defineModule({ name: 'morph-card', init() {} }).name).toBe('morph-card');
    });
});

describe('register', () => {
    it('exposes the module as a camelCase method', () => {
        aurora.register(makeModule({ name: 'morph-card' }).def);
        expect(typeof aurora.morphCard).toBe('function');
    });

    it('ignores a second registration of the same module', () => {
        var first = makeModule();
        var second = makeModule();
        aurora.register(first.def).register(second.def);
        var el = document.createElement('div');
        aurora.demo(el);
        expect(first.calls.init).toHaveLength(1);
        expect(second.calls.init).toHaveLength(0);
    });
});

describe('mounting', () => {
    it('returns one instance for an element and an array for selectors', () => {
        aurora.register(makeModule().def);
        document.body.innerHTML = '<p class="x"></p><p class="x"></p>';
        var one = aurora.demo(document.querySelector('.x'));
        var many = aurora.demo('.x');
        expect(one.name).toBe('demo');
        expect(Array.isArray(many)).toBe(true);
        expect(many).toHaveLength(2);
    });

    it('merges defaults, attributes and explicit options', () => {
        var m = makeModule();
        aurora.register(m.def);
        var el = document.createElement('div');
        el.setAttribute('data-aurora-demo', 'b');
        el.setAttribute('data-aurora-demo-speed', '4');
        aurora.demo(el, { speed: 7 });
        expect(m.calls.init[0].options).toEqual({ mode: 'b', speed: 7 });
    });

    it('re-initializes when the API is called again on the same element', () => {
        var m = makeModule();
        aurora.register(m.def);
        var el = document.createElement('div');
        aurora.demo(el);
        aurora.demo(el);
        expect(m.calls.init).toHaveLength(2);
        expect(m.calls.destroy).toBe(1);
    });

    it('tracks instances per element and module', () => {
        aurora.register(makeModule().def);
        var el = document.createElement('div');
        var instance = aurora.demo(el);
        expect(aurora.get(el, 'demo')).toBe(instance);
        instance.destroy();
        expect(aurora.get(el, 'demo')).toBeNull();
    });
});

describe('instance lifecycle', () => {
    it('update() coerces changes and passes next and previous options', () => {
        var m = makeModule();
        aurora.register(m.def);
        var instance = aurora.demo(document.createElement('div'));
        instance.update({ speed: '5', mode: 'nope', bogus: 1 });
        expect(m.calls.update).toHaveLength(1);
        expect(m.calls.update[0].next).toEqual({ mode: 'a', speed: 5 });
        expect(m.calls.update[0].prev).toEqual({ mode: 'a', speed: 1 });
        expect(instance.options.speed).toBe(5);
    });

    it('falls back to destroy + init when the module has no update()', () => {
        var inits = 0;
        var destroys = 0;
        aurora.register(defineModule({
            name: 'plain',
            schema: { options: { n: { type: 'number', default: 1 } } },
            init: function () { inits += 1; return { destroy: function () { destroys += 1; } }; },
        }));
        var instance = aurora.plain(document.createElement('div'));
        instance.update({ n: 2 });
        expect(inits).toBe(2);
        expect(destroys).toBe(1);
    });

    it('replay() forwards to the module', () => {
        var m = makeModule();
        aurora.register(m.def);
        aurora.demo(document.createElement('div')).replay();
        expect(m.calls.replay).toBe(1);
    });

    it('refresh() re-reads attributes', () => {
        var m = makeModule();
        aurora.register(m.def);
        var el = document.createElement('div');
        var instance = aurora.demo(el);
        el.setAttribute('data-aurora-demo-speed', '9');
        instance.refresh();
        expect(instance.options.speed).toBe(9);
    });

    it('destroy() is idempotent and ignores later calls', () => {
        var m = makeModule();
        aurora.register(m.def);
        var instance = aurora.demo(document.createElement('div'));
        instance.destroy();
        instance.destroy();
        instance.update({ speed: 3 });
        expect(m.calls.destroy).toBe(1);
        expect(m.calls.update).toHaveLength(0);
    });
});

describe('context helpers clean up on destroy', () => {
    it('removes listeners registered with ctx.on and runs onDestroy callbacks in reverse order', () => {
        var order = [];
        var handler = vi.fn();
        aurora.register(defineModule({
            name: 'ctx',
            init: function (el, options, ctx) {
                ctx.on(window, 'resize', handler);
                ctx.onDestroy(function () { order.push('first'); });
                ctx.onDestroy(function () { order.push('second'); });
            },
        }));
        var instance = aurora.ctx(document.createElement('div'));
        window.dispatchEvent(new Event('resize'));
        expect(handler).toHaveBeenCalledTimes(1);
        instance.destroy();
        window.dispatchEvent(new Event('resize'));
        expect(handler).toHaveBeenCalledTimes(1);
        expect(order).toEqual(['second', 'first']);
    });

    it('emits namespaced bubbling events that other modules can listen to', () => {
        var received = [];
        aurora.register(defineModule({
            name: 'talker',
            init: function (el, options, ctx) { ctx.emit('spoke', { word: 'hi' }); },
        }));
        var parent = document.createElement('section');
        var child = document.createElement('p');
        parent.appendChild(child);
        parent.addEventListener('aurora:talker:spoke', function (e) { received.push(e.detail.word); });
        aurora.talker(child);
        expect(received).toEqual(['hi']);
    });

    it('cleans up when init throws', () => {
        var handler = vi.fn();
        aurora.register(defineModule({
            name: 'broken',
            init: function (el, options, ctx) {
                ctx.on(window, 'resize', handler);
                throw new Error('boom');
            },
        }));
        var el = document.createElement('div');
        expect(() => aurora.broken(el)).toThrow('boom');
        window.dispatchEvent(new Event('resize'));
        expect(handler).not.toHaveBeenCalled();
        expect(aurora.get(el, 'broken')).toBeNull();
    });
});

describe('init() and observe()', () => {
    it('initializes every element carrying the attribute, once', () => {
        var m = makeModule();
        aurora.register(m.def);
        document.body.innerHTML = '<div data-aurora-demo></div><div data-aurora-demo="b"></div><div></div>';
        expect(aurora.init()).toHaveLength(2);
        expect(aurora.init()).toHaveLength(0);
        expect(m.calls.init).toHaveLength(2);
    });

    it('does not confuse option attributes with the activation attribute', () => {
        var m = makeModule();
        aurora.register(m.def);
        document.body.innerHTML = '<div data-aurora-demo-speed="3"></div>';
        expect(aurora.init()).toHaveLength(0);
    });

    it('keeps going when one element fails to initialize', () => {
        var errors = vi.spyOn(console, 'error').mockImplementation(() => {});
        var count = 0;
        aurora.register(defineModule({
            name: 'flaky',
            init: function () {
                count += 1;
                if (count === 1) throw new Error('first fails');
            },
        }));
        document.body.innerHTML = '<div data-aurora-flaky></div><div data-aurora-flaky></div>';
        expect(aurora.init()).toHaveLength(1);
        expect(errors).toHaveBeenCalled();
    });

    it('destroy(root) only touches instances inside root', () => {
        var m = makeModule();
        aurora.register(m.def);
        document.body.innerHTML = '<div id="a"><i data-aurora-demo></i></div><div id="b"><i data-aurora-demo></i></div>';
        aurora.init();
        aurora.destroy(document.getElementById('a'));
        expect(m.calls.destroy).toBe(1);
    });

    it('observe() initializes added nodes and destroys removed ones', async () => {
        var m = makeModule();
        aurora.register(m.def);
        aurora.observe();

        var host = document.createElement('div');
        host.innerHTML = '<p data-aurora-demo></p>';
        document.body.appendChild(host);
        await new Promise((r) => setTimeout(r, 0));
        expect(m.calls.init).toHaveLength(1);

        host.remove();
        await new Promise((r) => setTimeout(r, 0));
        expect(m.calls.destroy).toBe(1);
    });
});

describe('warnings', () => {
    it('warns once for repeated identical invalid attribute values', () => {
        var spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        aurora.register(makeModule().def);
        var el = document.createElement('div');
        el.setAttribute('data-aurora-demo-speed', 'fast');
        aurora.demo(el);
        aurora.demo(el);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toContain('[Aurora:demo]');
    });
});
