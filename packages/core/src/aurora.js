/**
 * The Aurora runtime: module registry, lifecycle and auto-initialization.
 *
 * A module is a plain object:
 *
 *   defineModule({
 *       name: 'cursor',                 // kebab-case; also the attribute name
 *       schema: { primary, options },   // see options.js
 *       init(el, options, ctx) {        // build the effect
 *           return { update, replay, destroy };   // every member is optional
 *       },
 *   })
 *
 * `init` receives a context whose helpers (`ctx.on`, `ctx.observe`,
 * `ctx.ticker`, ...) register their own cleanup, so `destroy()` is usually
 * only needed for state the module created by hand.
 */

import { VERSION } from './version.js';
import { isBrowser, kebabToCamel, resolveTargets } from './utils.js';
import { defineSchema, normalizeOptions, readAttributes, resolveOptions } from './options.js';
import { observe as observeVisibility } from './observer.js';
import { injectStyle } from './styles.js';
import { emit, listen } from './events.js';
import { ticker } from './ticker.js';
import { prefersReducedMotion, onReducedMotionChange } from './motion.js';

var NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Validates a module definition and normalizes its schema.
 *
 * @param {{name: string, schema: import('./options.js').Schema, init: Function}} definition
 * @returns {{name: string, schema: import('./options.js').Schema, init: Function}}
 */
export function defineModule(definition) {
    if (!definition || !NAME_PATTERN.test(definition.name || '')) {
        throw new Error('[Aurora] A module needs a kebab-case `name`.');
    }
    if (typeof definition.init !== 'function') {
        throw new Error('[Aurora] Module "' + definition.name + '" needs an `init` function.');
    }
    return {
        name: definition.name,
        schema: defineSchema(definition.schema || { options: {} }),
        init: definition.init,
    };
}

/**
 * Creates an isolated Aurora runtime. The browser bundles create one and
 * expose it as `window.Aurora`; tests create as many as they need.
 *
 * @param {{nonce?: string, debug?: boolean}} [initialConfig]
 */
export function createAurora(initialConfig) {
    var config = Object.assign({ nonce: undefined, debug: false }, initialConfig);
    var modules = new Map();
    var perElement = new WeakMap();
    var live = new Set();
    var domObserver = null;
    var warned = new Set();

    var api = { version: VERSION, config: config };

    function warn(message, moduleName) {
        var text = '[Aurora' + (moduleName ? ':' + moduleName : '') + '] ' + message;
        if (warned.has(text)) return;
        warned.add(text);
        console.warn(text);
    }

    function instancesOf(el) {
        var map = perElement.get(el);
        if (!map) {
            map = new Map();
            perElement.set(el, map);
        }
        return map;
    }

    function createContext(name, el, cleanups) {
        function track(fn) {
            cleanups.push(fn);
            return fn;
        }

        return {
            core: api,
            el: el,
            name: name,
            get reducedMotion() { return prefersReducedMotion(); },
            onReducedMotionChange: function (callback) { return track(onReducedMotionChange(callback)); },
            observe: function (target, options) { return track(observeVisibility(target, options)); },
            ticker: {
                add: function (task) { return track(ticker.add(task)); },
            },
            on: function (target, type, handler, options) {
                target.addEventListener(type, handler, options);
                return track(function () { target.removeEventListener(type, handler, options); });
            },
            emit: function (type, detail) { return emit(el, name, type, detail); },
            listen: function (type, handler, options) {
                var opts = options || {};
                return track(listen(opts.target || el, opts.module || name, type, handler));
            },
            style: function (id, css) { return injectStyle(id, css, { nonce: config.nonce }); },
            onDestroy: function (fn) { track(fn); },
            warn: function (message) { warn(message, name); },
        };
    }

    function runCleanups(cleanups) {
        while (cleanups.length) {
            var fn = cleanups.pop();
            try {
                fn();
            } catch (error) {
                console.error('[Aurora] A cleanup function threw:', error);
            }
        }
    }

    function mount(name, el, explicit) {
        var mod = modules.get(name);
        if (!mod) {
            throw new Error('[Aurora] Unknown module "' + name + '". Load the script that provides it first.');
        }

        var existing = instancesOf(el).get(name);
        if (existing) existing.destroy();

        var current = resolveOptions(el, name, mod.schema, explicit, function (m) { warn(m, name); });
        var cleanups = [];
        var handle = null;
        var destroyed = false;

        function build() {
            cleanups = [];
            var ctx = createContext(name, el, cleanups);
            handle = mod.def.init(el, current, ctx) || {};
        }

        function teardown() {
            if (handle && typeof handle.destroy === 'function') {
                try {
                    handle.destroy();
                } catch (error) {
                    console.error('[Aurora:' + name + '] destroy() threw:', error);
                }
            }
            handle = null;
            runCleanups(cleanups);
        }

        var instance = {
            el: el,
            name: name,
            get options() { return Object.assign({}, current); },
            update: function (partial) {
                if (destroyed) return instance;
                var changes = normalizeOptions(mod.schema, partial, function (m) { warn(m, name); });
                var next = Object.assign({}, current, changes);
                var previous = current;
                current = next;
                if (handle && typeof handle.update === 'function') {
                    handle.update(next, previous);
                } else {
                    teardown();
                    build();
                }
                return instance;
            },
            refresh: function () {
                return instance.update(readAttributes(el, name, mod.schema, function (m) { warn(m, name); }));
            },
            replay: function () {
                if (!destroyed && handle && typeof handle.replay === 'function') handle.replay();
                return instance;
            },
            destroy: function () {
                if (destroyed) return;
                destroyed = true;
                teardown();
                live.delete(instance);
                var map = perElement.get(el);
                if (map) map.delete(name);
            },
        };

        instancesOf(el).set(name, instance);
        live.add(instance);
        try {
            build();
        } catch (error) {
            destroyed = true;
            runCleanups(cleanups);
            live.delete(instance);
            instancesOf(el).delete(name);
            throw error;
        }
        return instance;
    }

    /**
     * Registers a module and exposes it as `Aurora.<camelCaseName>(target, options)`.
     * Registering the same module twice (two scripts on one page) is a no-op.
     *
     * @param {ReturnType<typeof defineModule>} definition
     */
    api.register = function (definition) {
        var def = defineModule(definition);
        if (modules.has(def.name)) return api;

        modules.set(def.name, { def: def, schema: def.schema });

        api[kebabToCamel(def.name)] = function (target, explicit) {
            var elements = resolveTargets(target);
            var results = elements.map(function (el) { return mount(def.name, el, explicit); });
            var single = target && typeof target === 'object' && typeof target.nodeType === 'number';
            return single ? (results[0] || null) : results;
        };

        if (config.debug) console.info('[Aurora] Registered module "' + def.name + '".');
        return api;
    };

    /** @returns {Array<{name: string, schema: object}>} */
    api.modules = function () {
        return Array.from(modules.values()).map(function (entry) { return { name: entry.def.name, schema: entry.schema }; });
    };

    /**
     * @param {Element} el
     * @param {string} name
     * @returns {object|null} The live instance of a module on an element.
     */
    api.get = function (el, name) {
        var map = perElement.get(el);
        return (map && map.get(name)) || null;
    };

    function scan(root) {
        var created = [];
        modules.forEach(function (entry, name) {
            var selector = '[data-aurora-' + name + ']';
            var elements = [];
            if (root.nodeType === 1 && root.matches(selector)) elements.push(root);
            if (typeof root.querySelectorAll === 'function') {
                elements.push.apply(elements, root.querySelectorAll(selector));
            }
            elements.forEach(function (el) {
                if (instancesOf(el).has(name)) return;
                try {
                    created.push(mount(name, el));
                } catch (error) {
                    console.error('[Aurora:' + name + '] Failed to initialize an element:', error, el);
                }
            });
        });
        return created;
    }

    /**
     * Initializes every element under `root` that carries a `data-aurora-<module>`
     * attribute. Safe to call repeatedly; already initialized elements are skipped.
     *
     * @param {ParentNode} [root=document]
     * @returns {object[]} Newly created instances.
     */
    api.init = function (root) {
        if (!isBrowser) return [];
        return scan(root || document);
    };

    /**
     * Destroys instances under `root`, or every instance when omitted.
     *
     * @param {Element|Document} [root]
     */
    api.destroy = function (root) {
        Array.from(live).forEach(function (instance) {
            if (!root || root === document || root === instance.el || (root.contains && root.contains(instance.el))) {
                instance.destroy();
            }
        });
    };

    /**
     * Watches the DOM: new `data-aurora-*` elements are initialized and
     * removed ones are destroyed. Useful for CMS lists, client-side routing
     * and builders that render content after load.
     *
     * @param {ParentNode} [root=document]
     * @returns {() => void} Stops watching.
     */
    api.observe = function (root) {
        if (!isBrowser || typeof MutationObserver === 'undefined') return function () {};
        api.disconnect();

        var target = root || document;
        domObserver = new MutationObserver(function (records) {
            records.forEach(function (record) {
                record.removedNodes.forEach(function (node) {
                    if (node.nodeType !== 1 || node.isConnected) return;
                    Array.from(live).forEach(function (instance) {
                        if (instance.el === node || node.contains(instance.el)) instance.destroy();
                    });
                });
                record.addedNodes.forEach(function (node) {
                    if (node.nodeType === 1) scan(node);
                });
            });
        });
        domObserver.observe(target, { childList: true, subtree: true });
        return api.disconnect;
    };

    api.disconnect = function () {
        if (domObserver) {
            domObserver.disconnect();
            domObserver = null;
        }
    };

    return api;
}
