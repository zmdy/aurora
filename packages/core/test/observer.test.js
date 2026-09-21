import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

var instances;

class FakeIntersectionObserver {
    constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observed = new Set();
        instances.push(this);
    }
    observe(el) { this.observed.add(el); }
    unobserve(el) { this.observed.delete(el); }
    trigger(el, isIntersecting) {
        this.callback([{ target: el, isIntersecting: isIntersecting }]);
    }
}

async function load() {
    vi.resetModules();
    return import('../src/observer.js');
}

beforeEach(() => {
    instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('observe', () => {
    it('shares one observer per threshold and rootMargin', async () => {
        var { observe } = await load();
        var a = document.createElement('div');
        var b = document.createElement('div');
        observe(a, { threshold: 0.2 });
        observe(b, { threshold: 0.2 });
        observe(b, { threshold: 0.5 });
        expect(instances).toHaveLength(2);
    });

    it('fires onEnter once per entry and onLeave on exit', async () => {
        var { observe } = await load();
        var el = document.createElement('div');
        var onEnter = vi.fn();
        var onLeave = vi.fn();
        observe(el, { onEnter: onEnter, onLeave: onLeave });
        var io = instances[0];
        io.trigger(el, false);
        expect(onEnter).not.toHaveBeenCalled();
        expect(onLeave).not.toHaveBeenCalled();
        io.trigger(el, true);
        io.trigger(el, true);
        expect(onEnter).toHaveBeenCalledTimes(1);
        io.trigger(el, false);
        expect(onLeave).toHaveBeenCalledTimes(1);
        io.trigger(el, true);
        expect(onEnter).toHaveBeenCalledTimes(2);
    });

    it('stops after the first enter with once', async () => {
        var { observe } = await load();
        var el = document.createElement('div');
        var onEnter = vi.fn();
        observe(el, { once: true, onEnter: onEnter });
        var io = instances[0];
        io.trigger(el, true);
        expect(io.observed.has(el)).toBe(false);
        io.trigger(el, false);
        io.trigger(el, true);
        expect(onEnter).toHaveBeenCalledTimes(1);
    });

    it('unobserves the element once the last subscriber leaves', async () => {
        var { observe } = await load();
        var el = document.createElement('div');
        var stopA = observe(el, {});
        var stopB = observe(el, {});
        stopA();
        expect(instances[0].observed.has(el)).toBe(true);
        stopB();
        expect(instances[0].observed.has(el)).toBe(false);
    });

    it('does not call handlers after being stopped', async () => {
        var { observe } = await load();
        var el = document.createElement('div');
        var onEnter = vi.fn();
        var stop = observe(el, { onEnter: onEnter });
        stop();
        instances[0].trigger(el, true);
        expect(onEnter).not.toHaveBeenCalled();
    });

    it('treats the element as visible when IntersectionObserver is missing', async () => {
        vi.unstubAllGlobals();
        vi.stubGlobal('IntersectionObserver', undefined);
        vi.useFakeTimers();
        var { observe } = await load();
        var onEnter = vi.fn();
        observe(document.createElement('div'), { onEnter: onEnter });
        vi.runAllTimers();
        expect(onEnter).toHaveBeenCalledTimes(1);
        vi.useRealTimers();
    });
});
