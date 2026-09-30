const VERSION = "1.0.0";
const isBrowser$1 = typeof window !== "undefined" && typeof document !== "undefined";
function camelToKebab(value) {
  return String(value).replace(/[A-Z]/g, function(char) {
    return "-" + char.toLowerCase();
  });
}
function kebabToCamel(value) {
  return String(value).replace(/-([a-z0-9])/g, function(_, char) {
    return char.toUpperCase();
  });
}
function clamp$2(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function resolveTargets(target, root) {
  if (!target) return [];
  if (typeof target === "string") {
    var scope2 = isBrowser$1 ? document : null;
    return scope2 ? Array.prototype.slice.call(scope2.querySelectorAll(target)) : [];
  }
  if (typeof target.nodeType === "number") return target.nodeType === 1 ? [target] : [];
  if (typeof target.length === "number") return Array.prototype.slice.call(target).filter(function(n) {
    return n && n.nodeType === 1;
  });
  return [];
}
var TRUE_WORDS = ["true", "1", "yes", "on", ""];
var FALSE_WORDS = ["false", "0", "no", "off"];
var TYPES = ["string", "selector", "number", "boolean", "enum", "color", "json", "list"];
function defineSchema(schema2) {
  if (!schema2 || !isPlainObject(schema2.options)) {
    throw new Error("[Aurora] A schema needs an `options` object.");
  }
  var options = {};
  Object.keys(schema2.options).forEach(function(key2) {
    var spec = schema2.options[key2];
    if (!spec || TYPES.indexOf(spec.type) === -1) {
      throw new Error('[Aurora] Option "' + key2 + '" has an invalid type: ' + (spec && spec.type));
    }
    var copy = Object.assign({}, spec);
    if (spec.type === "enum") {
      if (!Array.isArray(spec.values) || spec.values.length === 0) {
        throw new Error('[Aurora] Enum option "' + key2 + '" needs a non-empty `values` array.');
      }
      copy.values = spec.values.map(function(entry) {
        return typeof entry === "string" ? { value: entry, label: entry } : { value: entry.value, label: entry.label || entry.value };
      });
    }
    options[key2] = copy;
  });
  if (schema2.primary && !options[schema2.primary]) {
    throw new Error("[Aurora] `primary` points at an unknown option: " + schema2.primary);
  }
  return { primary: schema2.primary || null, options };
}
function getDefaults(schema2) {
  var out = {};
  Object.keys(schema2.options).forEach(function(key2) {
    var value = schema2.options[key2].default;
    out[key2] = value !== null && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
  });
  return out;
}
function coerceValue(spec, raw) {
  switch (spec.type) {
    case "string":
    case "color": {
      if (raw === null || raw === void 0) return fail("empty value");
      var text2 = String(raw).trim();
      if (spec.type === "color" && text2 === "") return fail("empty color");
      return ok(text2);
    }
    case "selector": {
      var selector = String(raw === null || raw === void 0 ? "" : raw).trim();
      if (selector === "") return ok("");
      try {
        document.createDocumentFragment().querySelector(selector);
      } catch (error) {
        return fail('invalid CSS selector "' + selector + '"');
      }
      return ok(selector);
    }
    case "number": {
      var number2 = typeof raw === "number" ? raw : parseFloat(raw);
      if (!isFinite(number2)) return fail('"' + raw + '" is not a number');
      var min = typeof spec.min === "number" ? spec.min : -Infinity;
      var max = typeof spec.max === "number" ? spec.max : Infinity;
      return ok(clamp$2(number2, min, max));
    }
    case "boolean": {
      if (typeof raw === "boolean") return ok(raw);
      var word = String(raw === null || raw === void 0 ? "" : raw).trim().toLowerCase();
      if (TRUE_WORDS.indexOf(word) !== -1) return ok(true);
      if (FALSE_WORDS.indexOf(word) !== -1) return ok(false);
      return fail('"' + raw + '" is not a boolean');
    }
    case "enum": {
      var candidate = String(raw).trim();
      var match = spec.values.some(function(entry) {
        return entry.value === candidate;
      });
      return match ? ok(candidate) : fail('"' + candidate + '" is not one of: ' + spec.values.map(function(e) {
        return e.value;
      }).join(", "));
    }
    case "json": {
      if (raw !== null && typeof raw === "object") return ok(raw);
      try {
        return ok(JSON.parse(String(raw)));
      } catch (error) {
        return fail("invalid JSON");
      }
    }
    case "list": {
      if (Array.isArray(raw)) return ok(raw);
      var separator = spec.separator || ",";
      var items = String(raw === null || raw === void 0 ? "" : raw).split(separator).map(function(item) {
        return item.trim();
      }).filter(Boolean);
      return ok(items);
    }
    default:
      return fail("unsupported type");
  }
}
function ok(value) {
  return { ok: true, value };
}
function fail(reason) {
  return { ok: false, reason };
}
function normalizeOptions(schema2, input, warn) {
  var out = {};
  if (!isPlainObject(input)) return out;
  Object.keys(input).forEach(function(key2) {
    var spec = schema2.options[key2];
    if (!spec) {
      if (warn) warn('Unknown option "' + key2 + '" ignored.');
      return;
    }
    if (input[key2] === void 0) return;
    var result = coerceValue(spec, input[key2]);
    if (result.ok) {
      out[key2] = result.value;
    } else if (warn) {
      warn('Option "' + key2 + '": ' + result.reason + ". Using the previous or default value.");
    }
  });
  return out;
}
function readAttributes(el, name, schema2, warn) {
  var raw = {};
  var prefix = "data-aurora-" + name;
  var json = el.getAttribute(prefix + "-options");
  if (json) {
    try {
      var parsed = JSON.parse(json);
      if (isPlainObject(parsed)) {
        Object.assign(raw, parsed);
      } else if (warn) {
        warn("`" + prefix + "-options` must be a JSON object.");
      }
    } catch (error) {
      if (warn) warn("`" + prefix + "-options` is not valid JSON.");
    }
  }
  Object.keys(schema2.options).forEach(function(key2) {
    var attr = prefix + "-" + camelToKebab(key2);
    if (el.hasAttribute(attr)) raw[key2] = el.getAttribute(attr);
  });
  if (schema2.primary && el.hasAttribute(prefix)) {
    var primary = el.getAttribute(prefix);
    if (primary !== null && primary.trim() !== "") raw[schema2.primary] = primary;
  }
  return normalizeOptions(schema2, raw, warn);
}
function resolveOptions(el, name, schema2, explicit, warn) {
  return Object.assign(
    getDefaults(schema2),
    readAttributes(el, name, schema2, warn),
    normalizeOptions(schema2, explicit || {}, warn)
  );
}
var pool = /* @__PURE__ */ new Map();
function observe(el, options) {
  var opts = options || {};
  var threshold = typeof opts.threshold === "number" ? opts.threshold : 0;
  var rootMargin = opts.rootMargin || "0px";
  if (typeof IntersectionObserver === "undefined") {
    var timer = setTimeout(function() {
      if (opts.onEnter) opts.onEnter({ isIntersecting: true, target: el });
    }, 0);
    return function() {
      clearTimeout(timer);
    };
  }
  var key2 = threshold + "|" + rootMargin;
  var bucket = pool.get(key2);
  if (!bucket) {
    bucket = { records: /* @__PURE__ */ new Map() };
    bucket.io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var list2 = bucket.records.get(entry.target);
        if (!list2) return;
        list2.slice().forEach(function(record2) {
          dispatch(record2, entry, bucket);
        });
      });
    }, { threshold, rootMargin });
    pool.set(key2, bucket);
  }
  var record = { el, options: opts, inside: false, removed: false };
  var records = bucket.records.get(el);
  if (!records) {
    records = [];
    bucket.records.set(el, records);
    bucket.io.observe(el);
  }
  records.push(record);
  return function() {
    remove$1(bucket, record);
  };
}
function dispatch(record, entry, bucket) {
  if (record.removed) return;
  if (entry.isIntersecting) {
    if (record.inside) return;
    record.inside = true;
    if (record.options.onEnter) record.options.onEnter(entry);
    if (record.options.once) remove$1(bucket, record);
  } else if (record.inside) {
    record.inside = false;
    if (record.options.onLeave) record.options.onLeave(entry);
  }
}
function remove$1(bucket, record) {
  if (record.removed) return;
  record.removed = true;
  var records = bucket.records.get(record.el);
  if (!records) return;
  var index = records.indexOf(record);
  if (index !== -1) records.splice(index, 1);
  if (records.length === 0) {
    bucket.records.delete(record.el);
    bucket.io.unobserve(record.el);
  }
}
function injectStyle(id, css2, options) {
  if (!isBrowser$1) return null;
  var selector = 'style[data-aurora-style="' + id + '"]';
  var existing = document.head.querySelector(selector);
  if (existing) return existing;
  var style = document.createElement("style");
  style.setAttribute("data-aurora-style", id);
  if (options && options.nonce) style.setAttribute("nonce", options.nonce);
  style.textContent = css2;
  document.head.appendChild(style);
  return style;
}
function emit(el, moduleName, type, detail) {
  var event = new CustomEvent("aurora:" + moduleName + ":" + type, {
    bubbles: true,
    cancelable: true,
    detail
  });
  return el.dispatchEvent(event);
}
function listen$1(target, moduleName, type, handler) {
  var name = "aurora:" + moduleName + ":" + type;
  target.addEventListener(name, handler);
  return function() {
    target.removeEventListener(name, handler);
  };
}
function createTicker() {
  var tasks = /* @__PURE__ */ new Set();
  var frameId = null;
  var last = 0;
  function frame(now2) {
    frameId = null;
    var delta = last ? now2 - last : 16;
    last = now2;
    tasks.forEach(function(task) {
      try {
        task(now2, delta);
      } catch (error) {
        console.error("[Aurora] A ticker task threw:", error);
      }
    });
    if (tasks.size > 0) frameId = requestAnimationFrame(frame);
    else last = 0;
  }
  return {
    add: function(task) {
      tasks.add(task);
      if (frameId === null) frameId = requestAnimationFrame(frame);
      return function() {
        tasks.delete(task);
        if (tasks.size === 0 && frameId !== null) {
          cancelAnimationFrame(frameId);
          frameId = null;
          last = 0;
        }
      };
    },
    get size() {
      return tasks.size;
    }
  };
}
var ticker = createTicker();
var queries = {};
function getQuery(text2) {
  if (!isBrowser$1 || typeof window.matchMedia !== "function") return null;
  if (!queries[text2]) queries[text2] = window.matchMedia(text2);
  return queries[text2];
}
function subscribe(query, callback) {
  if (!query) return function() {
  };
  var handler = function() {
    callback(query.matches);
  };
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", handler);
    return function() {
      query.removeEventListener("change", handler);
    };
  }
  query.addListener(handler);
  return function() {
    query.removeListener(handler);
  };
}
function prefersReducedMotion() {
  var query = getQuery("(prefers-reduced-motion: reduce)");
  return query ? query.matches : false;
}
function onReducedMotionChange(callback) {
  return subscribe(getQuery("(prefers-reduced-motion: reduce)"), callback);
}
var NAME_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
function defineModule(definition) {
  if (!definition || !NAME_PATTERN.test(definition.name || "")) {
    throw new Error("[Aurora] A module needs a kebab-case `name`.");
  }
  if (typeof definition.init !== "function") {
    throw new Error('[Aurora] Module "' + definition.name + '" needs an `init` function.');
  }
  return {
    name: definition.name,
    schema: defineSchema(definition.schema || { options: {} }),
    init: definition.init
  };
}
function createAurora(initialConfig) {
  var config = Object.assign({ nonce: void 0, debug: false }, initialConfig);
  var modules = /* @__PURE__ */ new Map();
  var perElement = /* @__PURE__ */ new WeakMap();
  var live = /* @__PURE__ */ new Set();
  var domObserver = null;
  var warned = /* @__PURE__ */ new Set();
  var api = { version: VERSION, config };
  function warn(message, moduleName) {
    var text2 = "[Aurora" + (moduleName ? ":" + moduleName : "") + "] " + message;
    if (warned.has(text2)) return;
    warned.add(text2);
    console.warn(text2);
  }
  function instancesOf(el) {
    var map = perElement.get(el);
    if (!map) {
      map = /* @__PURE__ */ new Map();
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
      el,
      name,
      get reducedMotion() {
        return prefersReducedMotion();
      },
      onReducedMotionChange: function(callback) {
        return track(onReducedMotionChange(callback));
      },
      observe: function(target, options) {
        return track(observe(target, options));
      },
      ticker: {
        add: function(task) {
          return track(ticker.add(task));
        }
      },
      on: function(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        return track(function() {
          target.removeEventListener(type, handler, options);
        });
      },
      emit: function(type, detail) {
        return emit(el, name, type, detail);
      },
      listen: function(type, handler, options) {
        var opts = options || {};
        return track(listen$1(opts.target || el, opts.module || name, type, handler));
      },
      style: function(id, css2) {
        return injectStyle(id, css2, { nonce: config.nonce });
      },
      onDestroy: function(fn) {
        track(fn);
      },
      warn: function(message) {
        warn(message, name);
      }
    };
  }
  function runCleanups(cleanups) {
    while (cleanups.length) {
      var fn = cleanups.pop();
      try {
        fn();
      } catch (error) {
        console.error("[Aurora] A cleanup function threw:", error);
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
    var current = resolveOptions(el, name, mod.schema, explicit, function(m) {
      warn(m, name);
    });
    var cleanups = [];
    var handle = null;
    var destroyed = false;
    function build() {
      cleanups = [];
      var ctx = createContext(name, el, cleanups);
      handle = mod.def.init(el, current, ctx) || {};
    }
    function teardown() {
      if (handle && typeof handle.destroy === "function") {
        try {
          handle.destroy();
        } catch (error) {
          console.error("[Aurora:" + name + "] destroy() threw:", error);
        }
      }
      handle = null;
      runCleanups(cleanups);
    }
    var instance = {
      el,
      name,
      get options() {
        return Object.assign({}, current);
      },
      /** Module-specific methods returned by `init` as `api` (for example the morph card's `next()`). */
      get api() {
        return handle && handle.api ? handle.api : null;
      },
      update: function(partial) {
        if (destroyed) return instance;
        var changes = normalizeOptions(mod.schema, partial, function(m) {
          warn(m, name);
        });
        var next = Object.assign({}, current, changes);
        var previous = current;
        current = next;
        if (handle && typeof handle.update === "function") {
          handle.update(next, previous);
        } else {
          teardown();
          build();
        }
        return instance;
      },
      refresh: function() {
        return instance.update(readAttributes(el, name, mod.schema, function(m) {
          warn(m, name);
        }));
      },
      replay: function() {
        if (!destroyed && handle && typeof handle.replay === "function") handle.replay();
        return instance;
      },
      destroy: function() {
        if (destroyed) return;
        destroyed = true;
        teardown();
        live.delete(instance);
        var map = perElement.get(el);
        if (map) map.delete(name);
      }
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
  api.register = function(definition) {
    var def = defineModule(definition);
    if (modules.has(def.name)) return api;
    modules.set(def.name, { def, schema: def.schema });
    api[kebabToCamel(def.name)] = function(target, explicit) {
      var elements = resolveTargets(target);
      var results = elements.map(function(el) {
        return mount(def.name, el, explicit);
      });
      var single = target && typeof target === "object" && typeof target.nodeType === "number";
      return single ? results[0] || null : results;
    };
    if (config.debug) console.info('[Aurora] Registered module "' + def.name + '".');
    return api;
  };
  api.modules = function() {
    return Array.from(modules.values()).map(function(entry) {
      return { name: entry.def.name, schema: entry.schema };
    });
  };
  api.get = function(el, name) {
    var map = perElement.get(el);
    return map && map.get(name) || null;
  };
  function scan(root) {
    var created = [];
    modules.forEach(function(entry, name) {
      var selector = "[data-aurora-" + name + "]";
      var elements = [];
      if (root.nodeType === 1 && root.matches(selector)) elements.push(root);
      if (typeof root.querySelectorAll === "function") {
        elements.push.apply(elements, root.querySelectorAll(selector));
      }
      elements.forEach(function(el) {
        if (instancesOf(el).has(name)) return;
        try {
          created.push(mount(name, el));
        } catch (error) {
          console.error("[Aurora:" + name + "] Failed to initialize an element:", error, el);
        }
      });
    });
    return created;
  }
  api.init = function(root) {
    if (!isBrowser$1) return [];
    return scan(root || document);
  };
  api.destroy = function(root) {
    Array.from(live).forEach(function(instance) {
      if (!root || root === document || root === instance.el || root.contains && root.contains(instance.el)) {
        instance.destroy();
      }
    });
  };
  api.observe = function(root) {
    if (!isBrowser$1 || typeof MutationObserver === "undefined") return function() {
    };
    api.disconnect();
    var target = root || document;
    domObserver = new MutationObserver(function(records) {
      records.forEach(function(record) {
        record.removedNodes.forEach(function(node) {
          if (node.nodeType !== 1 || node.isConnected) return;
          Array.from(live).forEach(function(instance) {
            if (instance.el === node || node.contains(instance.el)) instance.destroy();
          });
        });
        record.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) scan(node);
        });
      });
    });
    domObserver.observe(target, { childList: true, subtree: true });
    return api.disconnect;
  };
  api.disconnect = function() {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
  };
  return api;
}
var ROW_COUNT = 5;
var REPEAT_COUNT = 5;
var ROW_GAP = 16;
var WORD_GAP = 24;
var HORIZONTAL_SHIFT = 80;
var ZOOM_SCALE = 1.15;
var HOME_FACTOR = 0.4;
var EASE$1 = "inOutQuad";
var VISIBLE = "inset(0% 0% 0% 0%)";
var effect$Q = {
  id: "appear-text",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    if (!original) return;
    var reducedMotion = fx.reducedMotion;
    var color = getComputedStyle(textEl).color || "inherit";
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    if (reducedMotion) {
      textEl.textContent = original;
      return;
    }
    textEl.style.overflow = "hidden";
    textEl.style.display = "flex";
    textEl.style.alignItems = "center";
    textEl.style.justifyContent = "center";
    var centerRowIndex = Math.floor(ROW_COUNT / 2);
    var centerWordIndex = Math.floor(REPEAT_COUNT / 2);
    var gridWrap = document.createElement("div");
    gridWrap.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:" + ROW_GAP + "px;position:relative;will-change:transform;";
    textEl.appendChild(gridWrap);
    var rows = [];
    for (var ri = 0; ri < ROW_COUNT; ri++) {
      var isCenterRow = ri === centerRowIndex;
      var direction = ri % 2 === 0 ? 1 : -1;
      var speedMultiplier = 0.7 + Math.abs(ri - centerRowIndex) % 3 * 0.45;
      var driftFull = direction * HORIZONTAL_SHIFT * speedMultiplier;
      var driftHome = driftFull * HOME_FACTOR;
      var wipeLTR = ri % 2 === 0;
      var rowEl = document.createElement("div");
      rowEl.style.cssText = "display:flex;align-items:center;justify-content:center;gap:" + WORD_GAP + "px;white-space:nowrap;will-change:transform;";
      gridWrap.appendChild(rowEl);
      var wordEls = [];
      for (var wi = 0; wi < REPEAT_COUNT; wi++) {
        var span2 = document.createElement("span");
        span2.textContent = original;
        span2.style.cssText = "display:inline-block;line-height:1;color:" + color + ";clip-path:" + VISIBLE + ";";
        rowEl.appendChild(span2);
        wordEls.push(span2);
      }
      rows.push({
        el: rowEl,
        words: wordEls,
        isCenterRow,
        driftHome,
        driftFull,
        wipeLTR
      });
    }
    var motionMs = Math.max(200, opts.duration);
    var holdMs = 1e3;
    var tIn = motionMs;
    var tWipe = tIn + motionMs;
    var tWord = tWipe + holdMs;
    var tReset = tWord + 400;
    var tReveal = tReset + motionMs * 0.7;
    var total = tReveal + Math.max(200, holdMs * 0.4);
    fx.set(gridWrap, { scale: 1 });
    var tl = fx.createTimeline({ loop: true, delay: opts.delay });
    tl.add(gridWrap, { scale: ZOOM_SCALE, duration: tIn, ease: EASE$1 }, 0);
    tl.add(gridWrap, { scale: 1, duration: tWipe - tIn, ease: EASE$1 }, tIn);
    var denom = Math.max(1, REPEAT_COUNT - 1);
    var wipeWindow = tWipe - tIn;
    var perWipe = wipeWindow * 0.5;
    var revealWindow = tReveal - tReset;
    var perReveal = revealWindow * 0.5;
    rows.forEach(function(row) {
      fx.set(row.el, { translateX: row.driftHome });
      if (row.isCenterRow) {
        tl.add(row.el, { translateX: row.driftFull, duration: tIn, ease: EASE$1 }, 0);
        tl.add(row.el, { translateX: 0, duration: tWipe - tIn, ease: EASE$1 }, tIn);
        tl.add(row.el, { translateX: row.driftHome, duration: tReveal - tReset, ease: EASE$1 }, tReset);
      } else {
        tl.add(row.el, { translateX: row.driftFull, duration: tIn, ease: EASE$1 }, 0);
        tl.add(row.el, { translateX: row.driftHome, duration: tReset - tWord, ease: EASE$1 }, tWord);
      }
      var hidden = row.wipeLTR ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)";
      row.words.forEach(function(wordEl, wi2) {
        if (row.isCenterRow && wi2 === centerWordIndex) return;
        var sweepT = row.wipeLTR ? wi2 / denom : (REPEAT_COUNT - 1 - wi2) / denom;
        var wStartOut = tIn + sweepT * (wipeWindow - perWipe);
        var wEndOut = wStartOut + perWipe;
        var wStartIn = tReset + sweepT * (revealWindow - perReveal);
        var wEndIn = wStartIn + perReveal;
        tl.add(wordEl, { clipPath: hidden, duration: wEndOut - wStartOut, ease: EASE$1 }, wStartOut);
        tl.add(wordEl, { clipPath: VISIBLE, duration: wEndIn - wStartIn, ease: EASE$1 }, wStartIn);
      });
    });
    tl.add(gridWrap, { scale: 1, duration: 0 }, total);
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          if (typeof tl.play === "function") tl.play();
        } else if (typeof tl.pause === "function") tl.pause();
      });
    }, { threshold: 0.01 });
    io.observe(textEl);
    fx.onCleanup(function() {
      io.disconnect();
      if (typeof tl.pause === "function") tl.pause();
      if (typeof tl.revert === "function") tl.revert();
      textEl.style.overflow = "";
    });
  }
};
var effect$P = {
  id: "blur-reveal",
  run: function(units, opts, textEl, fx) {
    units.forEach(function(u) {
      u.style.filter = "blur(14px)";
    });
    fx.animate(units, {
      filter: ["blur(14px)", "blur(0px)"],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outQuart"
    });
  }
};
var effect$O = {
  id: "cinema-title",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original;
    textEl.innerHTML = "";
    textEl.textContent = original;
    fx.animate(textEl, {
      letterSpacing: ["2em", "normal"],
      opacity: [0, 1],
      duration: Math.max(1e3, opts.duration * 1.5),
      delay: opts.delay,
      ease: "inOutQuad"
    });
  }
};
var CONFIG$3 = {
  down: { prop: "translateY", from: "100%" },
  up: { prop: "translateY", from: "-100%" },
  left: { prop: "translateX", from: "-100%" },
  right: { prop: "translateX", from: "100%" }
};
var effect$N = {
  id: "clip-wrap",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    textEl.style.opacity = "1";
    var direction = opts.direction || "down";
    var cfg = CONFIG$3[direction] || CONFIG$3.down;
    var split = fx.resplit(textEl, { words: { wrap: "clip" } });
    var props = {
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    };
    props[cfg.prop] = [cfg.from, "0%"];
    fx.animate(split.words, props);
  }
};
var effect$M = {
  id: "continuous-wave",
  // Unlike the other effects this one never settles: each unit bobs up and
  // down forever, staggered by index so the motion ripples across the text.
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      opacity: [0, 1],
      duration: Math.max(400, opts.duration),
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outSine"
    });
    fx.animate(units, {
      translateY: [0, -14],
      duration: Math.max(400, opts.duration / 2),
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      loop: true,
      alternate: true,
      ease: "inOutSine"
    });
  }
};
var effect$L = {
  id: "crt-boot",
  run: function(units, opts, textEl, fx) {
    textEl.style.transformOrigin = "center center";
    fx.animate(textEl, {
      scaleY: [5e-3, 1],
      opacity: [0.6, 1],
      duration: 400,
      delay: opts.delay,
      ease: "outQuad"
    });
    fx.setTimeout(function() {
      fx.animate(units, {
        opacity: [0, 1],
        filter: ["blur(10px)", "blur(0px)"],
        duration: Math.max(300, opts.duration),
        delay: function(el, i) {
          return i * opts.stagger;
        },
        ease: "outQuad"
      });
    }, opts.delay + 300);
    fx.setTimeout(function() {
      fx.animate(units, {
        textShadow: "0 0 10px currentColor",
        duration: 300
      });
    }, opts.delay + 300 + Math.max(300, opts.duration) + units.length * opts.stagger);
  }
};
var HIDDEN_CLIP = "polygon(0% 0%, 0% 0%, -20% 100%, -20% 100%)";
var VISIBLE_CLIP = "polygon(0% 0%, 120% 0%, 100% 100%, -20% 100%)";
var effect$K = {
  id: "dia-text-reveal",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var wrap2 = document.createElement("span");
    wrap2.style.cssText = "display:inline-block;";
    wrap2.textContent = original;
    textEl.appendChild(wrap2);
    if (fx.reducedMotion) {
      fx.set(wrap2, { clipPath: "none" });
      return;
    }
    fx.set(wrap2, { clipPath: HIDDEN_CLIP });
    fx.animate(wrap2, {
      clipPath: VISIBLE_CLIP,
      duration: Math.max(500, opts.duration),
      delay: opts.delay,
      ease: "inOutQuad",
      onComplete: function() {
        wrap2.style.clipPath = "none";
      }
    });
    fx.onCleanup(function() {
      wrap2.style.clipPath = "";
    });
  }
};
var effect$J = {
  id: "echo-clone",
  // Each letter is cloned through splitText()'s clone option for an
  // echo/depth effect; splits the DOM itself.
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    textEl.style.opacity = "1";
    var split = fx.resplit(textEl, { chars: { wrap: "clip", clone: "bottom" } });
    fx.animate(split.chars, {
      translateY: ["-100%", "0%"],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    });
  }
};
var CHROMA_COLORS = ["#ff5ea8", "#5ec8ff", "#c9ff5e"];
var effect$I = {
  id: "elastic-text",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original;
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var inner = document.createElement("span");
    inner.textContent = original;
    inner.style.cssText = "display:inline-block;will-change:transform,text-shadow;";
    textEl.appendChild(inner);
    fx.animate(inner, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: Math.max(300, opts.duration),
      delay: opts.delay,
      ease: "outCubic"
    });
    var dispX = 0, dispY = 0, velX = 0, velY = 0, targetX = 0, targetY = 0;
    var DAMPING = 0.82;
    var STIFFNESS = 0.12;
    var MAX_OFFSET = 46;
    var MAX_DIST = 260;
    var rafId = null;
    function onMove(e) {
      var rect = inner.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = e.clientX - cx;
      var dy = e.clientY - cy;
      var dist = Math.hypot(dx, dy);
      var influence = Math.max(0, 1 - dist / MAX_DIST);
      targetX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dx * influence * 0.5));
      targetY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, dy * influence * 0.5));
    }
    function tick2() {
      velX += (targetX - dispX) * STIFFNESS;
      velY += (targetY - dispY) * STIFFNESS;
      velX *= DAMPING;
      velY *= DAMPING;
      dispX += velX;
      dispY += velY;
      var mag = Math.hypot(dispX, dispY);
      inner.style.transform = mag < 0.1 ? "" : "translate3d(" + dispX.toFixed(1) + "px," + dispY.toFixed(1) + "px,0)";
      var speed = Math.hypot(velX, velY);
      if (speed < 0.05) {
        inner.style.textShadow = "";
      } else {
        var dirX = velX / speed;
        var dirY = velY / speed;
        var ramp = Math.min(1, speed / 2);
        var shadows = [];
        for (var i = 0; i < CHROMA_COLORS.length; i++) {
          var g = (i + 1) * 6 * ramp;
          shadows.push((-dirX * g).toFixed(1) + "px " + (-dirY * g).toFixed(1) + "px 0 " + CHROMA_COLORS[i]);
        }
        inner.style.textShadow = shadows.join(",");
      }
      rafId = requestAnimationFrame(tick2);
    }
    fx.on(window, "mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(tick2);
    fx.onCleanup(function() {
      if (rafId) cancelAnimationFrame(rafId);
    });
  }
};
var effect$H = {
  id: "explosion",
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      scale: [4, 1],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    });
  }
};
var effect$G = {
  id: "flip-board",
  // Airport split-flap display: each unit flips down from the top,
  // faster and tighter than the Flip X effect (which flips from the center
  // with a slower, wider stagger).
  run: function(units, opts, textEl, fx) {
    units.forEach(function(u) {
      u.style.transformOrigin = "top center";
      u.style.transformStyle = "preserve-3d";
    });
    fx.animate(units, {
      rotateX: [-90, 0],
      opacity: [0, 1],
      duration: Math.max(250, opts.duration * 0.4),
      delay: function(el, i) {
        return opts.delay + i * Math.max(opts.stagger, 40);
      },
      ease: "outQuad"
    });
  }
};
var CONFIG$2 = {
  up: { prop: "rotateX", from: -90, origin: "center top" },
  down: { prop: "rotateX", from: 90, origin: "center bottom" },
  left: { prop: "rotateY", from: -90, origin: "left center" },
  right: { prop: "rotateY", from: 90, origin: "right center" }
};
var effect$F = {
  id: "flip-in",
  run: function(units, opts, textEl, fx) {
    var direction = opts.direction || "up";
    var cfg = CONFIG$2[direction] || CONFIG$2.up;
    units.forEach(function(u) {
      u.style.transformOrigin = cfg.origin;
      u.style.transformStyle = "preserve-3d";
      u.style.backfaceVisibility = "hidden";
    });
    var props = {
      opacity: [0, 1],
      duration: opts.duration,
      ease: "outExpo",
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      }
    };
    props[cfg.prop] = [cfg.from, 0];
    fx.animate(units, props);
  }
};
var effect$E = {
  id: "glitch",
  run: function(units, opts, textEl, fx) {
    var settleAt = opts.delay + units.length * opts.stagger + 40;
    fx.animate(units, {
      opacity: [0, 1],
      translateX: function() {
        return (Math.random() - 0.5) * 30;
      },
      duration: 40,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "linear"
    });
    fx.setTimeout(function() {
      fx.animate(units, {
        translateX: function() {
          return (Math.random() - 0.5) * 15;
        },
        duration: 40,
        ease: "linear"
      });
    }, settleAt);
    fx.setTimeout(function() {
      fx.animate(units, {
        translateX: function() {
          return (Math.random() - 0.5) * 8;
        },
        duration: 40,
        ease: "linear"
      });
    }, settleAt + 40);
    fx.setTimeout(function() {
      fx.animate(units, {
        translateX: 0,
        duration: Math.max(150, opts.duration * 0.6),
        ease: "outQuad"
      });
    }, settleAt + 80);
  }
};
var effect$D = {
  id: "gradient-flow-text",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    var base = getComputedStyle(textEl).color || "#ffffff";
    var color1 = opts.gradientColor || "#7dd3fc";
    var color2 = opts.gradientColor2 || "#f0abfc";
    textEl.innerHTML = "";
    textEl.textContent = original;
    textEl.style.opacity = "0";
    textEl.style.backgroundImage = "linear-gradient(90deg, " + base + ", color-mix(in srgb, " + base + " 25%, " + color1 + "), color-mix(in srgb, " + base + " 25%, " + color2 + "), " + base + ")";
    textEl.style.backgroundSize = "300% 100%";
    textEl.style.webkitBackgroundClip = "text";
    textEl.style.backgroundClip = "text";
    textEl.style.webkitTextFillColor = "transparent";
    textEl.style.color = "transparent";
    fx.animate(textEl, {
      opacity: [0, 1],
      duration: Math.max(300, opts.duration),
      delay: opts.delay,
      ease: "outQuad"
    });
    if (fx.reducedMotion) {
      fx.set(textEl, { backgroundPositionX: "0%" });
      return;
    }
    fx.animate(textEl, {
      backgroundPositionX: ["0%", "300%"],
      duration: Math.max(1800, opts.duration * 3),
      delay: opts.delay,
      loop: true,
      ease: "linear"
    });
    fx.onCleanup(function() {
      textEl.style.backgroundImage = "";
      textEl.style.backgroundSize = "";
      textEl.style.webkitBackgroundClip = "";
      textEl.style.backgroundClip = "";
      textEl.style.webkitTextFillColor = "";
    });
  }
};
var effect$C = {
  id: "heartbeat",
  run: function(units, opts, textEl, fx) {
    var fadeIn = Math.max(200, opts.duration * 0.3);
    fx.animate(units, {
      opacity: [0, 1],
      duration: fadeIn,
      delay: opts.delay,
      ease: "outQuad"
    });
    var t = opts.delay + fadeIn;
    fx.setTimeout(function() {
      fx.animate(units, { scale: 1.15, duration: 100, ease: "inQuad" });
    }, t);
    fx.setTimeout(function() {
      fx.animate(units, { scale: 1, duration: 100, ease: "linear" });
    }, t + 100);
    fx.setTimeout(function() {
      fx.animate(units, { scale: 1.25, duration: 120, ease: "linear" });
    }, t + 200);
    fx.setTimeout(function() {
      fx.animate(units, { scale: 1, duration: 300, ease: "outQuad" });
    }, t + 320);
  }
};
var effect$B = {
  id: "letter-roll",
  run: function(units, opts, textEl, fx) {
    units.forEach(function(u) {
      u.style.transformOrigin = "50% 100%";
    });
    fx.animate(units, {
      translateY: ["100%", "0%"],
      rotateX: [-70, 0],
      opacity: [0, 1],
      duration: Math.max(300, opts.duration),
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outQuart"
    });
    if (!textEl || !opts.hoverReplay) return;
    var busy = false;
    function onEnter() {
      if (busy || !units.length) return;
      busy = true;
      var order = units.map(function(u, i) {
        return i;
      });
      order.sort(function() {
        return Math.random() - 0.5;
      });
      order.forEach(function(idx, i) {
        var start = i * 35;
        fx.animate(units[idx], {
          translateY: ["0%", "-100%"],
          rotateX: [0, 70],
          duration: 180,
          delay: start,
          ease: "inQuad"
        });
        fx.animate(units[idx], {
          translateY: ["-100%", "0%"],
          rotateX: [70, 0],
          duration: 300,
          delay: start + 180,
          ease: "outBack"
        });
      });
      fx.setTimeout(function() {
        busy = false;
      }, order.length * 35 + 480);
    }
    fx.on(textEl, "mouseenter", onEnter);
  }
};
var effect$A = {
  id: "letter-swap",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    textEl.innerHTML = "";
    var pairs = [];
    var words = original.split(" ");
    words.forEach(function(word, wi) {
      Array.from(word).forEach(function(ch) {
        var slot = document.createElement("span");
        slot.className = "aurora-swap-slot";
        slot.style.cssText = "display:inline-block;position:relative;overflow:hidden;vertical-align:top;";
        var main = document.createElement("span");
        main.textContent = ch;
        main.style.cssText = "display:inline-block;";
        var dup = document.createElement("span");
        dup.textContent = ch;
        dup.setAttribute("aria-hidden", "true");
        dup.style.cssText = "display:inline-block;position:absolute;left:0;top:0;transform:translateY(100%);";
        slot.appendChild(main);
        slot.appendChild(dup);
        textEl.appendChild(slot);
        pairs.push({ slot, main, dup });
      });
      if (wi < words.length - 1) {
        var space = document.createElement("span");
        space.style.display = "inline-block";
        space.innerHTML = "&nbsp;";
        textEl.appendChild(space);
      }
    });
    textEl.style.opacity = "1";
    if (!pairs.length) return;
    var mains = pairs.map(function(p) {
      return p.main;
    });
    var dups = pairs.map(function(p) {
      return p.dup;
    });
    var entranceDuration = Math.max(300, opts.duration);
    fx.animate(pairs.map(function(p) {
      return p.slot;
    }), {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: entranceDuration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outQuad"
    });
    var activeInstances = [];
    fx.onCleanup(function() {
      activeInstances.forEach(function(inst) {
        if (inst && typeof inst.pause === "function") inst.pause();
      });
    });
    function swap(toDup) {
      activeInstances.forEach(function(inst) {
        if (inst && typeof inst.pause === "function") inst.pause();
      });
      var order = pairs.map(function(_, i) {
        return i;
      });
      order.sort(function() {
        return Math.random() - 0.5;
      });
      var rank = new Array(pairs.length);
      order.forEach(function(idx, pos) {
        rank[idx] = pos;
      });
      function delayFn(el, i) {
        return rank[i] * 30;
      }
      activeInstances = [
        fx.animate(mains, { translateY: toDup ? "-100%" : "0%", duration: 320, delay: delayFn, ease: "inOutCubic" }),
        fx.animate(dups, { translateY: toDup ? "0%" : "100%", duration: 320, delay: delayFn, ease: "inOutCubic" })
      ];
    }
    var entranceEndMs = opts.delay + (pairs.length - 1) * opts.stagger + entranceDuration;
    fx.setTimeout(function() {
      swap(true);
    }, entranceEndMs + 250);
    fx.setTimeout(function() {
      swap(false);
    }, entranceEndMs + 250 + 900);
    if (!opts.hoverReplay) return;
    var onEnter = function() {
      swap(true);
    };
    var onLeave = function() {
      swap(false);
    };
    fx.on(textEl, "mouseenter", onEnter);
    fx.on(textEl, "mouseleave", onLeave);
  }
};
var effect$z = {
  id: "line-shadow-text",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    var accent = getComputedStyle(textEl).color || "#ffffff";
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var wrap2 = document.createElement("span");
    wrap2.style.cssText = "position:relative;display:inline-block;";
    var shadow = document.createElement("span");
    shadow.textContent = original;
    shadow.setAttribute("aria-hidden", "true");
    shadow.style.cssText = "position:absolute;top:0;left:0;z-index:0;color:transparent;-webkit-text-stroke:1.5px " + accent + ";text-stroke:1.5px " + accent + ";opacity:.55;will-change:transform;";
    var main = document.createElement("span");
    main.textContent = original;
    main.style.cssText = "position:relative;z-index:1;";
    wrap2.appendChild(shadow);
    wrap2.appendChild(main);
    textEl.appendChild(wrap2);
    fx.animate(wrap2, {
      opacity: [0, 1],
      duration: Math.max(300, opts.duration),
      delay: opts.delay,
      ease: "outQuad"
    });
    if (fx.reducedMotion) {
      fx.set(shadow, { translateX: 6, translateY: 6 });
      return;
    }
    fx.animate(shadow, {
      translateX: [7, -7],
      translateY: [7, -7],
      duration: Math.max(1200, opts.duration * 2),
      delay: opts.delay,
      loop: true,
      alternate: true,
      ease: "inOutSine"
    });
  }
};
var effect$y = {
  id: "liquid-fill",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original;
    textEl.innerHTML = "";
    var span2 = document.createElement("span");
    span2.textContent = original;
    span2.style.display = "block";
    textEl.appendChild(span2);
    textEl.style.opacity = "1";
    fx.animate(span2, {
      clipPath: ["inset(100% 0 0 0)", "inset(0% 0 0 0)"],
      duration: opts.duration,
      delay: opts.delay,
      ease: "outQuad"
    });
  }
};
var effect$x = {
  id: "matrix-rain",
  // Units fall into place in RANDOM order (rather than left-to-right
  // sequential stagger) for a "digital rain" feel.
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      translateY: [-100, 0],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function() {
        return opts.delay + Math.random() * opts.stagger * units.length * 0.5;
      },
      ease: "outQuad"
    });
  }
};
var effect$w = {
  id: "mesh-text",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    var rect = textEl.getBoundingClientRect();
    var boxWidth = Math.max(20, rect.width || textEl.offsetWidth || 300);
    var boxHeight = Math.max(20, rect.height || textEl.offsetHeight || 80);
    var cs = getComputedStyle(textEl);
    var color = cs.color || "#ffffff";
    var fontStyle = cs.fontStyle || "normal";
    var fontWeight = cs.fontWeight || "400";
    var fontFamily = cs.fontFamily || "sans-serif";
    var fontSize = parseFloat(cs.fontSize) || 32;
    textEl.style.height = boxHeight + "px";
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", original);
    canvas.style.cssText = "display:block;width:100%;height:100%;";
    textEl.appendChild(canvas);
    var reducedMotion = fx.reducedMotion;
    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      canvas.remove();
      textEl.textContent = original;
      textEl.style.height = "";
      return;
    }
    function compileShader(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    }
    var VERT = "attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }";
    var FRAG = [
      "precision mediump float;",
      "varying vec2 vUv;",
      "uniform sampler2D uTex;",
      "uniform vec2 uMouse;",
      "uniform vec2 uVel;",
      "uniform float uAspect;",
      "void main() {",
      "    vec2 d = vUv - uMouse;",
      "    d.x *= uAspect;",
      "    float dist = length(d);",
      "    float falloff = smoothstep(0.35, 0.0, dist);",
      "    vec2 warped = vUv - uVel * falloff;",
      "    float mag = clamp(length(uVel) * 6.0, 0.0, 1.0) * falloff;",
      "    vec4 base = texture2D(uTex, warped);",
      "    if (mag > 0.001) {",
      "        vec2 off = vec2(uVel.y, -uVel.x) * 0.02 * mag;",
      "        float rA = texture2D(uTex, warped + off).a;",
      "        float bA = texture2D(uTex, warped - off).a;",
      "        vec3 col = base.rgb * base.a;",
      "        col += vec3(1.0, 0.15, 0.35) * max(0.0, rA - base.a);",
      "        col += vec3(0.15, 0.55, 1.0) * max(0.0, bA - base.a);",
      "        gl_FragColor = vec4(col, max(base.a, max(rA, bA)));",
      "    } else {",
      "        gl_FragColor = base;",
      "    }",
      "}"
    ].join("\n");
    var vs = compileShader(gl.VERTEX_SHADER, VERT);
    var fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.remove();
      textEl.textContent = original;
      textEl.style.height = "";
      return;
    }
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.remove();
      textEl.textContent = original;
      textEl.style.height = "";
      return;
    }
    gl.useProgram(program);
    var quadBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    var uMouse = gl.getUniformLocation(program, "uMouse");
    var uVel = gl.getUniformLocation(program, "uVel");
    var uAspect = gl.getUniformLocation(program, "uAspect");
    var uTex = gl.getUniformLocation(program, "uTex");
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    function renderTextTexture(w, h, dpr2) {
      var off = document.createElement("canvas");
      off.width = Math.max(2, Math.round(w * dpr2));
      off.height = Math.max(2, Math.round(h * dpr2));
      var ctx2d = off.getContext("2d");
      ctx2d.clearRect(0, 0, off.width, off.height);
      ctx2d.fillStyle = color;
      ctx2d.textAlign = "center";
      ctx2d.textBaseline = "middle";
      ctx2d.font = fontStyle + " " + fontWeight + " " + Math.round(fontSize * dpr2) + "px " + fontFamily;
      ctx2d.fillText(original, off.width / 2, off.height / 2);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
    }
    var dpr = window.devicePixelRatio || 1;
    var resizeTimer = null;
    function doResize() {
      var r = textEl.getBoundingClientRect();
      var w = Math.max(20, r.width || boxWidth);
      var h = Math.max(20, r.height || boxHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.uniform1f(uAspect, h / w);
      renderTextTexture(w, h, dpr);
    }
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = fx.setTimeout(doResize, 150);
    }
    doResize();
    var mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0 };
    function onPointerMove2(e) {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = (e.clientY - r.top) / r.height;
    }
    function onPointerLeave() {
    }
    canvas.addEventListener("pointermove", onPointerMove2, { passive: true });
    canvas.addEventListener("pointerleave", onPointerLeave, { passive: true });
    var state2 = { rafId: null, running: false };
    function tick2() {
      mouse.vx = (mouse.x - mouse.px) * 0.4 + mouse.vx * 0.6;
      mouse.vy = (mouse.y - mouse.py) * 0.4 + mouse.vy * 0.6;
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.vx *= 0.9;
      mouse.vy *= 0.9;
      gl.useProgram(program);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform2f(uVel, mouse.vx, mouse.vy);
      gl.uniform1i(uTex, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      state2.rafId = requestAnimationFrame(tick2);
    }
    gl.uniform2f(uMouse, 0.5, 0.5);
    gl.uniform2f(uVel, 0, 0);
    gl.uniform1i(uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    var io = null;
    if (!reducedMotion) {
      io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting && !state2.running) {
            state2.running = true;
            state2.rafId = requestAnimationFrame(tick2);
          } else if (!entry.isIntersecting && state2.running) {
            state2.running = false;
            if (state2.rafId) cancelAnimationFrame(state2.rafId);
            state2.rafId = null;
          }
        });
      }, { threshold: 0.01 });
      io.observe(textEl);
    }
    window.addEventListener("resize", onResize);
    fx.animate(canvas, {
      opacity: [0, 1],
      duration: Math.max(300, opts.duration),
      delay: opts.delay,
      ease: "outQuad"
    });
    fx.onCleanup(function() {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onPointerMove2);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      if (io) io.disconnect();
      if (state2.rafId) cancelAnimationFrame(state2.rafId);
      state2.running = false;
      gl.deleteBuffer(quadBuf);
      gl.deleteTexture(tex);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      textEl.style.height = "";
    });
  }
};
var effect$v = {
  id: "neon-flicker",
  run: function(units, opts, textEl, fx) {
    var t = opts.delay;
    units.forEach(function(u) {
      u.style.opacity = "0";
    });
    fx.animate(units, {
      opacity: [0, 1],
      duration: 80,
      delay: function(el, i) {
        return t + i * opts.stagger;
      },
      ease: "linear"
    });
    var afterStagger = t + units.length * opts.stagger + 80;
    fx.setTimeout(function() {
      fx.animate(units, { opacity: 0.2, duration: 50, ease: "linear" });
    }, afterStagger);
    fx.setTimeout(function() {
      fx.animate(units, { opacity: 1, duration: 80, ease: "linear" });
    }, afterStagger + 50);
    fx.setTimeout(function() {
      fx.animate(units, { opacity: 0, duration: 50, ease: "linear" });
    }, afterStagger + 130);
    fx.setTimeout(function() {
      fx.animate(units, {
        opacity: 1,
        textShadow: "0 0 20px currentColor",
        duration: Math.max(200, opts.duration * 0.4),
        ease: "linear"
      });
    }, afterStagger + 180);
  }
};
var effect$u = {
  id: "pendulum-swing",
  run: function(units, opts, textEl, fx) {
    units.forEach(function(u) {
      u.style.transformOrigin = "top center";
    });
    fx.animate(units, {
      rotate: [90, 0],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outElastic(1, 0.5)"
    });
  }
};
var effect$t = {
  id: "perspective-fly",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original;
    textEl.innerHTML = "";
    textEl.textContent = original;
    textEl.style.opacity = "0";
    if (textEl.parentElement) {
      textEl.parentElement.style.perspective = "500px";
    }
    fx.animate(textEl, {
      translateZ: [-2e3, 0],
      opacity: [0, 1],
      duration: Math.max(600, opts.duration),
      delay: opts.delay,
      ease: "outExpo"
    });
  }
};
var effect$s = {
  id: "rgb-split",
  // Chromatic-aberration converge: red & cyan channels start wide apart
  // and slide together onto the base text.
  // Uses text-shadow instead of absolute-positioned spans so the effect
  // works correctly inside overflow:hidden containers (card stages,
  // Elementor widget wrappers, etc.).
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original;
    textEl.innerHTML = "";
    textEl.textContent = original;
    textEl.style.opacity = "0";
    var startOffset = 14;
    var obj = { t: 0, o: 0 };
    fx.animate(obj, {
      t: [startOffset, 0],
      o: [0, 1],
      duration: opts.duration,
      delay: opts.delay,
      ease: "outExpo",
      onUpdate: function() {
        var v = obj.t;
        var o = obj.o;
        textEl.style.opacity = o;
        textEl.style.textShadow = (-v).toFixed(2) + "px 0 0 rgba(255,43,77," + (o * 0.85).toFixed(3) + ")," + v.toFixed(2) + "px 0 0 rgba(0,200,255," + (o * 0.85).toFixed(3) + ")";
      },
      onComplete: function() {
        textEl.style.textShadow = "-1.5px 0 0 rgba(255,43,77,0.55), 1.5px 0 0 rgba(0,200,255,0.55)";
      }
    });
  }
};
var CONFIG$1 = {
  left: { origin: "left bottom", from: -90 },
  right: { origin: "right bottom", from: 90 },
  up: { origin: "left bottom", from: 90 },
  down: { origin: "left top", from: -90 }
};
var effect$r = {
  id: "rotate-in",
  run: function(units, opts, textEl, fx) {
    var direction = opts.direction || "left";
    var cfg = CONFIG$1[direction] || CONFIG$1.left;
    units.forEach(function(u) {
      u.style.transformOrigin = cfg.origin;
    });
    fx.animate(units, {
      rotate: [cfg.from, 0],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    });
  }
};
var effect$q = {
  id: "rotating-dial",
  // Arranges each character around a circle via trigonometry, then spins
  // the whole dial forever — recreates the "Rotating Character Dial"
  // pattern (ogblocks.dev's Framer Motion guide) with Anime.js. Builds
  // its own circular DOM layout, so it bypasses the generic per-unit
  // split entirely.
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original;
    var chars = Array.from(original);
    var radius = Math.max(40, Math.min(120, chars.length * 8));
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var dial = document.createElement("div");
    dial.style.cssText = "position:relative;display:inline-block;width:" + radius * 2 + "px;height:" + radius * 2 + "px;";
    chars.forEach(function(ch, i) {
      var span2 = document.createElement("span");
      span2.textContent = ch === " " ? " " : ch;
      var deg = 360 / chars.length * i;
      span2.style.cssText = "position:absolute;left:50%;top:0;transform:rotate(" + deg + "deg) translateY(-" + radius + "px);transform-origin:0 " + radius + "px;margin-left:-0.5ch;";
      dial.appendChild(span2);
    });
    textEl.appendChild(dial);
    fx.animate(dial, {
      rotate: 360,
      duration: Math.max(2e3, opts.duration * 4),
      loop: true,
      ease: "linear"
    });
  }
};
var effect$p = {
  id: "rubber-stamp",
  run: function(units, opts, textEl, fx) {
    var slamDuration = 250;
    fx.animate(units, {
      scale: [4, 1.15],
      rotate: [-15, 0],
      opacity: [0, 1],
      duration: slamDuration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "inQuad"
    });
    fx.setTimeout(function() {
      fx.animate(units, {
        scale: 1,
        duration: Math.max(250, opts.duration * 0.6),
        ease: "outElastic(1, 0.4)"
      });
    }, opts.delay + units.length * opts.stagger + slamDuration);
  }
};
var effect$o = {
  id: "scale-in",
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      scale: [0.2, 1],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outBack"
    });
  }
};
var effect$n = {
  id: "scatter-converge",
  // Each unit starts scattered at a random offset/rotation and converges
  // into place — the entrance-side counterpart to the hover scatter
  // option, which does the same random-jump trick
  // on hover instead of on entrance.
  run: function(units, opts, textEl, fx) {
    function rand(min, max) {
      if (fx.utils && typeof fx.utils.random === "function") {
        return fx.utils.random(min, max);
      }
      return Math.random() * (max - min) + min;
    }
    units.forEach(function(u) {
      fx.animate(u, {
        translateX: [rand(-160, 160), 0],
        translateY: [rand(-120, 120), 0],
        rotate: [rand(-90, 90), 0],
        opacity: [0, 1],
        duration: opts.duration,
        delay: opts.delay + Math.random() * opts.stagger * units.length * 0.4,
        ease: "outExpo"
      });
    });
  }
};
var effect$m = {
  id: "scramble",
  // Uses Anime.js scrambleText(); works on the whole element.
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    textEl.style.opacity = "1";
    fx.animate(textEl, {
      innerHTML: fx.scrambleText({ duration: opts.duration }),
      delay: opts.delay
    });
  }
};
var effect$l = {
  id: "scroll-highlight",
  run: function(units, opts, textEl, fx) {
    if (!units.length) return;
    var litColor = getComputedStyle(textEl).color || "rgb(255, 255, 255)";
    var m = litColor.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    var r = m ? m[1] : 255, g = m ? m[2] : 255, b = m ? m[3] : 255;
    var dimColor = "rgba(" + r + ", " + g + ", " + b + ", 0.15)";
    fx.animate(units, { opacity: 1, color: dimColor, duration: 0 });
    var dur = Math.max(0.05, opts.duration / 1e3);
    var stagger2 = Math.max(0, opts.stagger / 1e3);
    var totalDuration = dur + (units.length - 1) * stagger2;
    function easeOut(t) {
      return 1 - Math.pow(1 - t, 1.8);
    }
    var ticking = false;
    function measure() {
      ticking = false;
      var rect = textEl.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var viewportCenter = vh / 2;
      var progress = rect.height > 0 ? Math.max(0, Math.min(1, (viewportCenter - rect.top) / rect.height)) : 0;
      var playhead = progress * totalDuration;
      units.forEach(function(u, i) {
        var local = dur > 0 ? (playhead - i * stagger2) / dur : playhead >= i * stagger2 ? 1 : 0;
        local = Math.max(0, Math.min(1, local));
        var t = easeOut(local);
        u.style.color = "rgba(" + r + ", " + g + ", " + b + ", " + (0.15 + 0.85 * t).toFixed(3) + ")";
      });
    }
    function onScrollOrResize() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    }
    measure();
    fx.on(window, "scroll", onScrollOrResize, { passive: true });
    fx.on(window, "resize", onScrollOrResize);
  }
};
var effect$k = {
  id: "scroll-velocity-marquee",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    if (!original) return;
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    textEl.style.overflow = "hidden";
    textEl.style.display = "block";
    if (fx.reducedMotion) {
      textEl.textContent = original;
      textEl.style.overflow = "";
      textEl.style.display = "";
      return;
    }
    var track = document.createElement("div");
    track.style.cssText = "display:flex;white-space:nowrap;will-change:transform;";
    var seg1 = document.createElement("span");
    seg1.textContent = " • " + original;
    seg1.style.cssText = "display:inline-block;";
    var seg2 = seg1.cloneNode(true);
    seg2.setAttribute("aria-hidden", "true");
    track.appendChild(seg1);
    track.appendChild(seg2);
    textEl.appendChild(track);
    var BASE_SPEED = 0.028;
    var FRICTION = 0.06;
    var state2 = { pos: 0, boost: 0, lastTs: null, rafId: null, running: false, lastScrollY: window.scrollY || 0 };
    var loopDistance = 0;
    function measure() {
      loopDistance = seg1.getBoundingClientRect().width || seg1.offsetWidth || 1;
    }
    measure();
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = fx.setTimeout(measure, 150);
    }
    function onScroll() {
      var y = window.scrollY || 0;
      var dy = y - state2.lastScrollY;
      state2.lastScrollY = y;
      state2.boost += dy * 0.9;
      var MAX_BOOST = 4;
      if (state2.boost > MAX_BOOST) state2.boost = MAX_BOOST;
      if (state2.boost < -MAX_BOOST) state2.boost = -MAX_BOOST;
    }
    function tick2(ts) {
      if (state2.lastTs == null) state2.lastTs = ts;
      var dt = Math.min(48, ts - state2.lastTs);
      state2.lastTs = ts;
      state2.boost *= 1 - FRICTION;
      var speed = BASE_SPEED + state2.boost;
      state2.pos += speed * dt;
      if (loopDistance > 0) {
        state2.pos = (state2.pos % loopDistance + loopDistance) % loopDistance;
      }
      fx.set(track, { translateX: -state2.pos });
      state2.rafId = requestAnimationFrame(tick2);
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && !state2.running) {
          state2.running = true;
          state2.lastTs = null;
          state2.rafId = requestAnimationFrame(tick2);
        } else if (!entry.isIntersecting && state2.running) {
          state2.running = false;
          if (state2.rafId) cancelAnimationFrame(state2.rafId);
          state2.rafId = null;
        }
      });
    }, { threshold: 0.01 });
    io.observe(textEl);
    fx.on(window, "scroll", onScroll, { passive: true });
    fx.on(window, "resize", onResize);
    fx.onCleanup(function() {
      io.disconnect();
      clearTimeout(resizeTimer);
      if (state2.rafId) cancelAnimationFrame(state2.rafId);
      state2.running = false;
      textEl.style.overflow = "";
      textEl.style.display = "";
    });
  }
};
var effect$j = {
  id: "shiny-sweep-text",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    var base = getComputedStyle(textEl).color || "#ffffff";
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var wrap2 = document.createElement("span");
    wrap2.style.cssText = "position:relative;display:inline-block;color:" + base + ";";
    var main = document.createElement("span");
    main.textContent = original;
    main.style.cssText = "position:relative;";
    var shine = document.createElement("span");
    shine.textContent = original;
    shine.setAttribute("aria-hidden", "true");
    shine.style.cssText = "position:absolute;top:0;left:0;background-image:linear-gradient(100deg, transparent 40%, rgba(255,255,255,.9) 50%, transparent 60%);background-size:220% 100%;background-position:150% 0;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;";
    wrap2.appendChild(main);
    wrap2.appendChild(shine);
    textEl.appendChild(wrap2);
    fx.animate(wrap2, {
      opacity: [0, 1],
      duration: Math.max(300, opts.duration),
      delay: opts.delay,
      ease: "outQuad"
    });
    if (fx.reducedMotion) return;
    fx.animate(shine, {
      backgroundPositionX: ["150%", "-80%"],
      duration: Math.max(1600, opts.duration * 2.5),
      delay: opts.delay,
      loop: true,
      ease: "inOutSine"
    });
  }
};
var CONFIG = {
  left: { prop: "skewX", from: -35 },
  right: { prop: "skewX", from: 35 },
  up: { prop: "skewY", from: -20 },
  down: { prop: "skewY", from: 20 }
};
var effect$i = {
  id: "skew-in",
  run: function(units, opts, textEl, fx) {
    var direction = opts.direction || "left";
    var cfg = CONFIG[direction] || CONFIG.left;
    var props = {
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    };
    props[cfg.prop] = [cfg.from, 0];
    fx.animate(units, props);
  }
};
var AXIS = { up: "Y", down: "Y", left: "X", right: "X" };
var SIGN = { up: -1, down: 1, left: -1, right: 1 };
var DISTANCE = {
  smooth: { Y: 60, X: 80 },
  bounce: { Y: 80, X: 80 },
  elastic: { Y: 100, X: 300 }
};
var EASE = { smooth: "outExpo", bounce: "outBounce", elastic: "outElastic(1, 0.4)" };
var effect$h = {
  id: "slide-in",
  run: function(units, opts, textEl, fx) {
    var direction = opts.direction || "down";
    var style = opts.style || "smooth";
    var axis = AXIS[direction] || "Y";
    var sign2 = SIGN[direction] || 1;
    var table = DISTANCE[style] || DISTANCE.smooth;
    var distance = table[axis] * sign2;
    var duration = style === "elastic" ? Math.max(600, opts.duration * 1.5) : opts.duration;
    var props = {
      opacity: [0, 1],
      duration,
      ease: EASE[style] || EASE.smooth,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      }
    };
    props["translate" + axis] = [distance, 0];
    fx.animate(units, props);
  }
};
var effect$g = {
  id: "slot-machine",
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      translateY: ["-500%", "0%"],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    });
  }
};
var SPARKLE_COUNT = 10;
var SPARKLE_PATH = "M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z";
var SVG_NS$1 = "http://www.w3.org/2000/svg";
function sparkleSvg(fx, wrap2, color1, color2) {
  var size = fx.utils.random(12, 22);
  var svg = document.createElementNS(SVG_NS$1, "svg");
  svg.setAttribute("viewBox", "0 0 21 21");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;pointer-events:none;width:" + size + "px;height:" + size + "px;left:" + fx.utils.random(-6, 100) + "%;top:" + fx.utils.random(-25, 100) + "%;transform:translate(-50%,-50%) scale(0);opacity:0;will-change:transform,opacity;";
  var path = document.createElementNS(SVG_NS$1, "path");
  path.setAttribute("d", SPARKLE_PATH);
  path.setAttribute("fill", Math.random() < 0.5 ? color1 : color2);
  svg.appendChild(path);
  wrap2.appendChild(svg);
  return svg;
}
var effect$f = {
  id: "sparkles-text",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var color1 = opts.sparkleColor || "#9E7AFF";
    var color2 = opts.sparkleColor2 || "#FE8BBB";
    var wrap2 = document.createElement("span");
    wrap2.style.cssText = "position:relative;display:inline-block;";
    var label = document.createElement("span");
    label.textContent = original;
    label.style.cssText = "position:relative;";
    wrap2.appendChild(label);
    textEl.appendChild(wrap2);
    fx.animate(label, {
      opacity: [0, 1],
      duration: Math.max(300, opts.duration),
      delay: opts.delay,
      ease: "outQuad"
    });
    if (fx.reducedMotion) return;
    for (var i = 0; i < SPARKLE_COUNT; i++) {
      var sparkle = sparkleSvg(fx, wrap2, color1, color2);
      fx.animate(sparkle, {
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
        rotate: [0, fx.utils.random(-40, 40)],
        duration: fx.utils.random(900, 1700),
        delay: opts.delay + fx.utils.random(0, 1800),
        loop: true,
        ease: "inOutSine"
      });
    }
  }
};
var effect$e = {
  id: "spin-in",
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      rotate: [720, 0],
      scale: [0, 1],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    });
  }
};
var effect$d = {
  id: "spinning-circular-text",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    if (!original) return;
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var fontSize = parseFloat(getComputedStyle(textEl).fontSize) || 24;
    var radius = Math.max(26, fontSize * 1.3);
    var size = radius * 2 + fontSize;
    var wrap2 = document.createElement("span");
    wrap2.style.cssText = "position:relative;display:inline-block;width:" + size + "px;height:" + size + "px;vertical-align:middle;";
    var ring2 = document.createElement("span");
    ring2.style.cssText = "position:absolute;inset:0;will-change:transform;";
    wrap2.appendChild(ring2);
    textEl.appendChild(wrap2);
    if (fx.reducedMotion) {
      textEl.innerHTML = "";
      textEl.textContent = original;
      return;
    }
    var unit = (original + " • ").split(" ").join(" ");
    var circumference = 2 * Math.PI * radius;
    var avgCharWidth = fontSize * 0.78;
    var slotCount = Math.max(unit.length, Math.round(circumference / avgCharWidth));
    var repeated = "";
    while (repeated.length < slotCount) repeated += unit;
    var chars = repeated.slice(0, slotCount).split("");
    var step = 360 / chars.length;
    chars.forEach(function(ch, i) {
      var slot = document.createElement("span");
      var angle = i * step;
      slot.style.cssText = "position:absolute;left:50%;top:50%;transform-origin:0 0;transform:rotate(" + angle + "deg) translateY(-" + radius + "px);";
      var glyph = document.createElement("span");
      glyph.textContent = ch;
      glyph.style.cssText = "position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;";
      slot.appendChild(glyph);
      ring2.appendChild(slot);
    });
    fx.set(wrap2, { opacity: 0 });
    fx.animate(wrap2, {
      opacity: [0, 1],
      duration: Math.max(300, opts.duration),
      delay: opts.delay,
      ease: "outQuad"
    });
    fx.animate(ring2, {
      rotate: [0, 360],
      duration: Math.max(4e3, opts.duration * 6),
      delay: opts.delay,
      loop: true,
      ease: "linear"
    });
  }
};
var effect$c = {
  id: "spiral-in",
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      translateX: function(el, i) {
        return [Math.cos(i) * 100, 0];
      },
      translateY: function(el, i) {
        return [Math.sin(i) * 100, 0];
      },
      rotate: [360, 0],
      scale: [0, 1],
      opacity: [0, 1],
      duration: Math.max(500, opts.duration),
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outCubic"
    });
  }
};
var effect$b = {
  id: "split-chars",
  // Uses Anime.js splitText() instead of the generic pre-split units.
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    textEl.style.opacity = "1";
    var split = fx.resplit(textEl, { chars: true });
    fx.animate(split.chars, {
      translateY: [40, 0],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    });
  }
};
var effect$a = {
  id: "stagger-flip-3d",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original;
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    var half = Math.max(6, parseFloat(getComputedStyle(textEl).fontSize) * 0.55);
    var cubes = [];
    var words = original.split(" ");
    words.forEach(function(word, wi) {
      var wordWrap = document.createElement("span");
      wordWrap.style.cssText = "display:inline-block;white-space:nowrap;perspective:800px;";
      Array.from(word).forEach(function(ch) {
        var pivot = document.createElement("span");
        pivot.style.cssText = "display:inline-block;position:relative;transform-style:preserve-3d;transform:translateZ(" + -half + "px);-webkit-transform:translateZ(" + -half + "px);";
        var cube = document.createElement("span");
        cube.className = "aurora-flip-cube";
        cube.style.cssText = "display:inline-block;position:relative;transform-style:preserve-3d;";
        var front = document.createElement("span");
        front.textContent = ch;
        front.style.cssText = "display:inline-block;position:relative;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:translateZ(" + half + "px);-webkit-transform:translateZ(" + half + "px);";
        var second = document.createElement("span");
        second.textContent = ch;
        second.style.cssText = "display:inline-block;position:absolute;left:0;top:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateX(-90deg) translateZ(" + half + "px);-webkit-transform:rotateX(-90deg) translateZ(" + half + "px);";
        cube.appendChild(front);
        cube.appendChild(second);
        pivot.appendChild(cube);
        wordWrap.appendChild(pivot);
        cubes.push(cube);
      });
      textEl.appendChild(wordWrap);
      if (wi < words.length - 1) {
        var space = document.createElement("span");
        space.style.display = "inline-block";
        space.innerHTML = "&nbsp;";
        textEl.appendChild(space);
      }
    });
    if (!cubes.length) return;
    var busy = false;
    function play2(withInitialDelay) {
      if (busy) return;
      busy = true;
      var base = withInitialDelay ? opts.delay : 0;
      var duration = Math.max(200, opts.duration);
      var stagger2 = Math.max(0, opts.stagger);
      var tl = fx.createTimeline({ onComplete: function() {
        busy = false;
      } });
      cubes.forEach(function(cube, i) {
        var at = base + i * stagger2;
        tl.add(cube, { rotateX: 90, duration, ease: "inQuad" }, at);
        tl.set(cube, { rotateX: 0 });
      });
    }
    play2(true);
    if (!opts.hoverReplay) return;
    function onEnter() {
      play2(false);
    }
    fx.on(textEl, "mouseenter", onEnter);
  }
};
var effect$9 = {
  id: "stretch-warp",
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      scaleX: [4, 1],
      scaleY: [0.2, 1],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outElastic(1, 0.4)"
    });
  }
};
var effect$8 = {
  id: "text-emerge",
  run: function(units, opts, textEl, fx) {
    var center2 = (units.length - 1) / 2;
    units.forEach(function(u, i) {
      var distance = Math.abs(i - center2);
      fx.animate(u, {
        opacity: [0, 1],
        scale: [0, 1],
        filter: ["blur(6px)", "blur(0px)"],
        duration: Math.max(300, opts.duration),
        delay: opts.delay + distance * opts.stagger,
        ease: "outBack"
      });
    });
  }
};
function createHighlighter(textEl, original, color) {
  textEl.textContent = "";
  var wrap2 = document.createElement("span");
  wrap2.style.cssText = "position:relative;display:inline-block;padding:0 .1em;";
  var mark = document.createElement("span");
  mark.setAttribute("aria-hidden", "true");
  mark.style.cssText = "position:absolute;left:-2%;right:-2%;top:12%;bottom:8%;z-index:0;background:color-mix(in srgb, " + (color || "#facc15") + " 55%, transparent);border-radius:2px 9px 3px 8px;transform:scaleX(0) rotate(-1deg);transform-origin:0% 50%;";
  var label = document.createElement("span");
  label.textContent = original;
  label.style.cssText = "position:relative;z-index:1;";
  wrap2.appendChild(mark);
  wrap2.appendChild(label);
  textEl.appendChild(wrap2);
  return mark;
}
var effect$7 = {
  id: "text-highlighter",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original || textEl.textContent || "";
    textEl.style.opacity = "1";
    var mark = createHighlighter(textEl, original, opts.highlightColor);
    if (fx.reducedMotion) {
      fx.set(mark, { scaleX: 1, rotate: "-1deg" });
      return;
    }
    fx.animate(mark, {
      scaleX: [0, 1],
      duration: Math.max(400, opts.duration),
      delay: opts.delay,
      ease: "inOutQuad"
    });
  }
};
var ALL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
var EMPTY_LINES_PERCENT = 4;
var HOLD_DURATION = 1e3;
function mapValue(value, inMin, inMax, outMin, outMax) {
  if (value <= inMin) return outMin;
  if (value >= inMax) return outMax;
  return (value - inMin) / (inMax - inMin) * (outMax - outMin) + outMin;
}
function escapeHtml$1(text2) {
  return String(text2).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function measureCharWidth(cs) {
  var probe = document.createElement("span");
  probe.textContent = ALL_CHARS;
  probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;line-height:1;padding:0;margin:0;top:-9999px;left:-9999px;";
  probe.style.fontFamily = cs.fontFamily;
  probe.style.fontSize = cs.fontSize;
  probe.style.fontWeight = cs.fontWeight;
  probe.style.fontStyle = cs.fontStyle;
  probe.style.letterSpacing = cs.letterSpacing;
  document.body.appendChild(probe);
  var w = probe.getBoundingClientRect().width;
  document.body.removeChild(probe);
  return w / ALL_CHARS.length || parseFloat(cs.fontSize) * 0.6 || 10;
}
function distributeWordsAcrossLines(words, numLines) {
  var emptyLineCount = Math.floor(EMPTY_LINES_PERCENT / 100 * numLines);
  var startLine = emptyLineCount;
  var endLine = numLines - emptyLineCount;
  var availableLines = Math.max(0, endLine - startLine);
  var wordsPerLine = [];
  for (var i = 0; i < numLines; i++) wordsPerLine.push([]);
  if (availableLines <= 0) return wordsPerLine;
  var numWords = words.length;
  words.forEach(function(word, wordIndex) {
    var targetLine;
    if (numWords === 1) {
      targetLine = startLine + Math.floor(availableLines / 2);
    } else {
      targetLine = startLine + Math.floor(wordIndex * (availableLines - 1) / (numWords - 1));
    }
    var clamped = Math.max(startLine, Math.min(endLine - 1, targetLine));
    wordsPerLine[clamped].push(word);
  });
  return wordsPerLine;
}
function generateLineDataForWords(wordsForLine, totalChars) {
  if (!wordsForLine.length) return [];
  var lengths = wordsForLine.map(function(w) {
    return w.length;
  });
  var blockLen = lengths.reduce(function(sum, l) {
    return sum + l;
  }, 0) + (wordsForLine.length - 1);
  if (blockLen > totalChars) blockLen = totalChars;
  var cursor2 = Math.max(0, Math.floor((totalChars - blockLen) / 2));
  var wordPositions = [];
  wordsForLine.forEach(function(word) {
    if (cursor2 + word.length > totalChars) return;
    wordPositions.push({ word, start: cursor2, end: cursor2 + word.length });
    cursor2 += word.length + 1;
  });
  return wordPositions;
}
function wordAt(wordPositions, i) {
  for (var w = 0; w < wordPositions.length; w++) {
    if (i >= wordPositions[w].start && i < wordPositions[w].end) return wordPositions[w];
  }
  return null;
}
function buildLineContent(wordPositions, totalChars, revealProgress, settleProgress, reverseLine, cellWidth, wordsColor, textColor) {
  var numChars = Math.floor(mapValue(revealProgress, 0, 1, 0, totalChars));
  var settledChars = Math.floor(mapValue(settleProgress, 0, 1, 0, totalChars));
  var cellStyle = "display:inline-block;width:" + cellWidth + "px;text-align:center;";
  function isVisible(i2) {
    return i2 >= totalChars - numChars;
  }
  function isSettled(i2) {
    return i2 >= totalChars - settledChars;
  }
  var html = "";
  var i = 0;
  while (i < totalChars) {
    var word = wordAt(wordPositions, i);
    if (word && isVisible(i)) {
      var end = i, text2 = "";
      while (end < word.end && isVisible(end)) {
        text2 += word.word[end - word.start];
        end++;
      }
      var width = (end - i) * cellWidth;
      html += '<span style="display:inline-block;width:' + width + "px;white-space:pre;text-align:right;color:" + wordsColor + ';">' + escapeHtml$1(text2) + "</span>";
      i = end;
      continue;
    }
    if (!isVisible(i)) {
      html += '<span style="' + cellStyle + '">&nbsp;</span>';
      i++;
      continue;
    }
    var ch = isSettled(i) ? " " : ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
    html += '<span style="' + cellStyle + "color:" + textColor + ';">' + escapeHtml$1(ch) + "</span>";
    i++;
  }
  return html;
}
var effect$6 = {
  id: "text-reveal-wall",
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = (fx.original || "").trim();
    var words = original.split(/\s+/).filter(Boolean);
    if (!words.length) return;
    var reducedMotion = fx.reducedMotion;
    var reverseLine = true;
    var loop = opts.wallLoop !== false;
    var wordsColor = getComputedStyle(textEl).color || "rgb(255, 255, 255)";
    var cm = wordsColor.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    var textColor = cm ? "rgba(" + cm[1] + ", " + cm[2] + ", " + cm[3] + ", 0.55)" : "rgba(255,255,255,0.55)";
    var resizeTimer = null;
    var anims = [];
    var loopTimeout = null;
    var startTimer = null;
    var paused = false;
    var rowEls = [];
    function teardown() {
      clearTimeout(loopTimeout);
      clearTimeout(startTimer);
      loopTimeout = null;
      startTimer = null;
      anims.forEach(function(a) {
        if (typeof a.pause === "function") a.pause();
      });
      anims = [];
      rowEls = [];
    }
    function build() {
      teardown();
      var rect = textEl.getBoundingClientRect();
      var containerWidth = Math.max(40, rect.width || textEl.offsetWidth || 300);
      var cs = getComputedStyle(textEl);
      var charWidth = measureCharWidth(cs);
      var COLS = Math.max(20, Math.min(160, Math.floor(containerWidth / charWidth)));
      var cellWidth = containerWidth / COLS;
      var ROWS = opts.wallLines ? Math.max(4, Math.min(40, Math.round(opts.wallLines))) : Math.max(8, Math.min(28, words.length + 8));
      textEl.innerHTML = "";
      textEl.style.opacity = "1";
      textEl.style.fontVariantNumeric = "tabular-nums";
      var wordsPerLine = distributeWordsAcrossLines(words, ROWS);
      var linesData = wordsPerLine.map(function(lineWords) {
        return generateLineDataForWords(lineWords, COLS);
      });
      for (var ri = 0; ri < ROWS; ri++) {
        var rowEl = document.createElement("div");
        rowEl.style.cssText = "white-space:pre;";
        textEl.appendChild(rowEl);
        rowEls.push(rowEl);
      }
      var lineStates = linesData.map(function() {
        return { revealProgress: 0, settleProgress: 0 };
      });
      function updateLine(index) {
        rowEls[index].innerHTML = buildLineContent(
          linesData[index],
          COLS,
          lineStates[index].revealProgress,
          lineStates[index].settleProgress,
          reverseLine,
          cellWidth,
          wordsColor,
          textColor
        );
      }
      if (reducedMotion) {
        linesData.forEach(function(_, index) {
          lineStates[index].revealProgress = 1;
          lineStates[index].settleProgress = 1;
          updateLine(index);
        });
        return;
      }
      linesData.forEach(function(_, index) {
        updateLine(index);
      });
      var duration = Math.max(300, opts.duration);
      var stagger2 = Math.max(20, opts.stagger);
      var ease = "inOutQuad";
      function runAnimationCycle() {
        var phaseOffset = duration * 0.5;
        var lastLineDelay = (ROWS - 1) * stagger2;
        var totalPhaseTime = lastLineDelay + phaseOffset + duration;
        var reverseStartDelay = totalPhaseTime + HOLD_DURATION;
        var tl = fx.createTimeline();
        linesData.forEach(function(_, index) {
          var lineDelay = index * stagger2;
          tl.add(lineStates[index], {
            revealProgress: 1,
            duration,
            ease,
            onUpdate: function() {
              updateLine(index);
            }
          }, lineDelay);
          tl.add(lineStates[index], {
            settleProgress: 1,
            duration,
            ease,
            onUpdate: function() {
              updateLine(index);
            }
          }, lineDelay + phaseOffset);
        });
        if (!loop) {
          anims.push(tl);
          return;
        }
        linesData.forEach(function(_, index) {
          var lineDelay = index * stagger2;
          tl.add(lineStates[index], {
            settleProgress: 0,
            duration,
            ease,
            onUpdate: function() {
              updateLine(index);
            }
          }, reverseStartDelay + lineDelay);
          tl.add(lineStates[index], {
            revealProgress: 0,
            duration,
            ease,
            onUpdate: function() {
              updateLine(index);
            }
          }, reverseStartDelay + lineDelay + phaseOffset);
        });
        anims.push(tl);
        var totalCycleTime = (totalPhaseTime + HOLD_DURATION) * 2;
        scheduleRestart(totalCycleTime);
      }
      function scheduleRestart(ms) {
        loopTimeout = fx.setTimeout(function restart() {
          if (paused) {
            loopTimeout = fx.setTimeout(restart, 300);
            return;
          }
          lineStates.forEach(function(s) {
            s.revealProgress = 0;
            s.settleProgress = 0;
          });
          anims.forEach(function(a) {
            if (typeof a.pause === "function") a.pause();
          });
          anims = [];
          runAnimationCycle();
        }, ms);
      }
      startTimer = fx.setTimeout(runAnimationCycle, opts.delay);
    }
    build();
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = fx.setTimeout(build, 150);
    }
    window.addEventListener("resize", onResize);
    var io = null;
    if (!reducedMotion) {
      io = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          paused = !entry.isIntersecting;
          anims.forEach(function(a) {
            if (paused && typeof a.pause === "function") a.pause();
            else if (!paused && typeof a.play === "function") a.play();
          });
        });
      }, { threshold: 0.01 });
      io.observe(textEl);
    }
    fx.onCleanup(function() {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      if (io) io.disconnect();
      teardown();
    });
  }
};
var effect$5 = {
  id: "typewriter",
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      opacity: [0, 1],
      duration: 1,
      delay: function(el, i) {
        return opts.delay + i * Math.max(opts.stagger, 60);
      },
      ease: "linear"
    });
  }
};
var effect$4 = {
  id: "typewriter-delete",
  // Types the full text out, pauses, deletes it back down to nothing,
  // then retypes it — the classic "hero tagline" flourish. One-shot,
  // hand-rolled with timers since it rebuilds the string character by
  // character.
  selfManaged: true,
  run: function(units, opts, textEl, fx) {
    var original = fx.original;
    textEl.innerHTML = "";
    textEl.style.opacity = "1";
    textEl.textContent = "";
    var typeSpeed = Math.max(20, Math.min(90, opts.duration / Math.max(1, original.length)));
    var deleteSpeed = typeSpeed * 0.6;
    var pauseAfterType = 900;
    var safeTimeout = fx.setTimeout;
    var safeInterval = fx.setInterval;
    safeTimeout(function() {
      var i = 0;
      var typeHandle = safeInterval(function() {
        i++;
        textEl.textContent = original.slice(0, i);
        if (i >= original.length) {
          fx.clearInterval(typeHandle);
          safeTimeout(function() {
            var j = original.length;
            var deleteHandle = safeInterval(function() {
              j--;
              textEl.textContent = original.slice(0, j);
              if (j <= 0) {
                fx.clearInterval(deleteHandle);
                safeTimeout(function() {
                  var k = 0;
                  var retypeHandle = safeInterval(function() {
                    k++;
                    textEl.textContent = original.slice(0, k);
                    if (k >= original.length) fx.clearInterval(retypeHandle);
                  }, typeSpeed);
                }, 250);
              }
            }, deleteSpeed);
          }, pauseAfterType);
        }
      }, typeSpeed);
    }, opts.delay);
  }
};
var effect$3 = {
  id: "unfold-3d",
  run: function(units, opts, textEl, fx) {
    units.forEach(function(u) {
      u.style.transformOrigin = "left center";
      u.style.transformStyle = "preserve-3d";
    });
    fx.animate(units, {
      rotateY: [-90, 0],
      rotateX: [45, 0],
      scale: [0.5, 1],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outExpo"
    });
  }
};
var effect$2 = {
  id: "vertical-blinds",
  run: function(units, opts, textEl, fx) {
    var n = units.length;
    fx.animate(units, {
      scaleX: [0, 1],
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        var distFromEdge = Math.min(i, n - 1 - i);
        return opts.delay + distFromEdge * opts.stagger;
      },
      ease: "outQuad"
    });
  }
};
var effect$1 = {
  id: "vhs-tracking",
  run: function(units, opts, textEl, fx) {
    units.forEach(function(u) {
      u.style.opacity = "0.7";
      u.style.transform = "skewX(5deg)";
    });
    fx.animate(units, {
      opacity: [0.7, 1],
      duration: 10,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "linear"
    });
    var jitterAt = opts.delay + units.length * opts.stagger + 10;
    fx.animate(units, {
      translateX: [0, -10, 0],
      skewX: [5, -8, 0],
      duration: 60 * 5,
      delay: jitterAt,
      loop: 5,
      alternate: true,
      ease: "linear"
    });
    fx.setTimeout(function() {
      fx.animate(units, { translateX: 0, skewX: 0, opacity: 1, duration: 300 });
      fx.setTimeout(function() {
        fx.animate(units, { translateX: [0, 5, 0], opacity: [1, 0.6, 1], duration: 240, ease: "linear" });
      }, 500);
    }, jitterAt + 60 * 5);
  }
};
var effect = {
  id: "wave",
  run: function(units, opts, textEl, fx) {
    fx.animate(units, {
      translateY: function(el, i) {
        return [Math.sin(i * 0.85) * 40, 0];
      },
      opacity: [0, 1],
      duration: opts.duration,
      delay: function(el, i) {
        return opts.delay + i * opts.stagger;
      },
      ease: "outSine"
    });
  }
};
var list = [
  effect$Q,
  effect$P,
  effect$O,
  effect$N,
  effect$M,
  effect$L,
  effect$K,
  effect$J,
  effect$I,
  effect$H,
  effect$G,
  effect$F,
  effect$E,
  effect$D,
  effect$C,
  effect$B,
  effect$A,
  effect$z,
  effect$y,
  effect$x,
  effect$w,
  effect$v,
  effect$u,
  effect$t,
  effect$s,
  effect$r,
  effect$q,
  effect$p,
  effect$o,
  effect$n,
  effect$m,
  effect$l,
  effect$k,
  effect$j,
  effect$i,
  effect$h,
  effect$g,
  effect$f,
  effect$e,
  effect$d,
  effect$c,
  effect$b,
  effect$a,
  effect$9,
  effect$8,
  effect$7,
  effect$6,
  effect$5,
  effect$4,
  effect$3,
  effect$2,
  effect$1,
  effect
];
var effects = {};
list.forEach(function(effect2) {
  effects[effect2.id] = effect2;
});
var EFFECT_IDS = list.map(function(effect2) {
  return effect2.id;
});
function labelFor(id) {
  var text2 = id.replace(/-/g, " ");
  return text2.charAt(0).toUpperCase() + text2.slice(1);
}
var headlineOptions = {
  mode: { type: "enum", default: "effects", values: ["effects", "headline"], label: "Text mode", group: "Mode" },
  beforeText: { type: "string", default: "", label: "Before text", group: "Headline", when: { mode: "headline" } },
  highlightedText: { type: "string", default: "", label: "Highlighted text", description: "Empty uses the original element text.", group: "Headline", when: { mode: "headline" } },
  afterText: { type: "string", default: "", label: "After text", group: "Headline", when: { mode: "headline" } },
  animationStyle: { type: "enum", default: "highlighted", values: ["highlighted", "rotating"], label: "Animation style", group: "Headline", when: { mode: "headline" } },
  animationShape: { type: "enum", default: "aurora-orbit", values: ["underline", "double-underline", "circle", "aurora-orbit", "aurora-wave", "aurora-spark", "text-highlighter"], label: "Animation shape", group: "Headline", when: { mode: "headline", animationStyle: "highlighted" } },
  rotatingText: { type: "string", default: "", ui: "textarea", label: "Rotating text", description: "One phrase per line. The highlighted text is the first phrase.", group: "Headline", when: { mode: "headline", animationStyle: "rotating" } },
  rotationEffect: { type: "enum", default: "prism-rise", values: ["prism-rise", "comet-slide", "split-flap", "soft-focus", "airport-flip", "scramble", "sparkles-text", "text-reveal-wall", "letter-swap", "echo-clone"], label: "Rotation effect", group: "Headline", when: { mode: "headline", animationStyle: "rotating" } },
  letterStagger: { type: "number", default: 28, min: 0, max: 150, unit: "ms", label: "Letter stagger", group: "Headline", when: { mode: "headline", animationStyle: "rotating" } },
  rotationColor: { type: "color", default: "#facc15", label: "Rotation accent", group: "Headline", when: { mode: "headline", animationStyle: "rotating" } },
  rotationColor2: { type: "color", default: "#a78bfa", label: "Rotation accent 2", group: "Headline", when: { mode: "headline", animationStyle: "rotating" } },
  headlineColor: { type: "color", default: "#05b172", label: "Shape color", group: "Headline", when: { mode: "headline", animationStyle: "highlighted" } },
  headlineColor2: { type: "color", default: "#7c5cff", label: "Shape accent", group: "Headline", when: { mode: "headline", animationStyle: "highlighted" } },
  strokeWidth: { type: "number", default: 2.5, min: 1, max: 12, step: 0.5, unit: "px", label: "Stroke width", group: "Headline", when: { mode: "headline", animationStyle: "highlighted" } },
  holdDuration: { type: "number", default: 1800, min: 300, max: 3e4, unit: "ms", label: "Hold duration", group: "Headline playback", when: { mode: "headline" } },
  headlineLoop: { type: "boolean", default: true, label: "Loop headline", group: "Headline playback", when: { mode: "headline" } },
  headlineAutoplay: { type: "boolean", default: true, label: "Autoplay headline", group: "Headline playback", when: { mode: "headline" } },
  pauseOnHover: { type: "boolean", default: true, label: "Pause on hover / focus", group: "Headline playback", when: { mode: "headline" } }
};
var schema$4 = {
  primary: "effect",
  options: {
    ...headlineOptions,
    effect: {
      type: "enum",
      default: "slide-in",
      values: EFFECT_IDS.map(function(id) {
        return { value: id, label: labelFor(id) };
      }),
      label: "Effect",
      group: "Effect",
      when: { mode: "effects" }
    },
    split: {
      type: "enum",
      default: "chars",
      values: ["chars", "words", "lines"],
      label: "Split by",
      description: "Unit the effect animates. Effects that build their own markup ignore it.",
      group: "Effect"
    },
    duration: { type: "number", default: 800, min: 50, max: 1e4, unit: "ms", label: "Duration", group: "Timing" },
    delay: { type: "number", default: 0, min: 0, max: 1e4, unit: "ms", label: "Delay", group: "Timing" },
    stagger: { type: "number", default: 30, min: 0, max: 1e3, unit: "ms", label: "Stagger", group: "Timing" },
    trigger: {
      type: "enum",
      default: "scroll",
      values: ["scroll", "load"],
      label: "Trigger",
      group: "Trigger"
    },
    threshold: {
      type: "number",
      default: 0.2,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Visible ratio",
      description: "Capped at 5% internally so headings above the fold always start.",
      group: "Trigger",
      when: { trigger: "scroll" }
    },
    replay: { type: "boolean", default: false, label: "Replay on every scroll", group: "Trigger", when: { trigger: "scroll" } },
    target: {
      type: "selector",
      default: "",
      label: "Text element",
      description: "CSS selector, relative to the element, of the node holding the text. Empty uses the element itself.",
      group: "Advanced"
    },
    direction: {
      type: "enum",
      default: "down",
      values: ["up", "down", "left", "right"],
      label: "Direction",
      description: "Side the effect enters from. Used by slide-in, flip-in, rotate-in, skew-in and clip-wrap.",
      group: "Effect"
    },
    style: {
      type: "enum",
      default: "smooth",
      values: ["smooth", "bounce", "elastic"],
      label: "Style",
      description: "Easing character of the slide-in effect.",
      group: "Effect",
      when: { effect: "slide-in" }
    },
    sparkleColor: {
      type: "color",
      default: "#9E7AFF",
      label: "Sparkle color",
      description: 'First of the two colors "sparkles-text" alternates between.',
      group: "Effect",
      when: { effect: "sparkles-text" }
    },
    sparkleColor2: {
      type: "color",
      default: "#FE8BBB",
      label: "Sparkle color 2",
      description: 'Second of the two colors "sparkles-text" alternates between. Set it equal to Sparkle color for a single solid color.',
      group: "Effect",
      when: { effect: "sparkles-text" }
    },
    gradientColor: {
      type: "color",
      default: "#7dd3fc",
      label: "Gradient color",
      description: 'First accent color "gradient-flow-text" blends into the base text color as it sweeps.',
      group: "Effect",
      when: { effect: "gradient-flow-text" }
    },
    gradientColor2: {
      type: "color",
      default: "#f0abfc",
      label: "Gradient color 2",
      description: 'Second accent color "gradient-flow-text" blends into the base text color as it sweeps.',
      group: "Effect",
      when: { effect: "gradient-flow-text" }
    },
    highlightColor: {
      type: "color",
      default: "#facc15",
      label: "Highlight color",
      description: 'Color of the marker stroke "text-highlighter" draws behind the text.',
      group: "Effect",
      when: { effect: "text-highlighter" }
    },
    wallLoop: {
      type: "boolean",
      default: true,
      label: "Loop the wall",
      description: 'Repeat the reveal continuously. Turn off to play "text-reveal-wall" once and hold.',
      group: "Effect",
      when: { effect: "text-reveal-wall" }
    },
    wallLines: {
      type: "number",
      default: 14,
      min: 4,
      max: 40,
      label: "Wall lines",
      description: 'Number of repeated rows in the "text-reveal-wall".',
      group: "Effect",
      when: { effect: "text-reveal-wall" }
    },
    hoverScatter: {
      type: "boolean",
      default: false,
      label: "Hover scatter",
      description: "Units jump to random offsets on hover and settle back with an elastic ease.",
      group: "Hover"
    },
    hoverIntensity: { type: "number", default: 24, min: 1, max: 200, unit: "px", label: "Scatter intensity", group: "Hover", when: { hoverScatter: true } },
    hoverDuration: { type: "number", default: 350, min: 50, max: 3e3, unit: "ms", label: "Scatter duration", group: "Hover", when: { hoverScatter: true } },
    hoverReplay: {
      type: "boolean",
      default: false,
      label: "Replay on hover",
      description: "Effects with a built-in hover gesture (letter roll, letter swap, stagger flip 3d) only replay it when this is on. Off by default so hover is never a hidden requirement to see the effect.",
      group: "Hover"
    }
  }
};
Object.keys(schema$4.options).forEach(function(key2) {
  if (key2 in headlineOptions || ["duration", "delay", "trigger", "threshold", "replay", "target"].indexOf(key2) >= 0) return;
  schema$4.options[key2].when = Object.assign({}, schema$4.options[key2].when, { mode: "effects" });
});
var CHAR_STYLE = "display:inline-block;will-change:transform,opacity;text-transform:none;";
function applyTransform(text2, transform) {
  if (transform === "capitalize") return text2.replace(/\b\w/g, function(c) {
    return c.toUpperCase();
  });
  if (transform === "uppercase") return text2.toUpperCase();
  if (transform === "lowercase") return text2.toLowerCase();
  return text2;
}
function splitIntoChars(el) {
  var raw = el.textContent;
  el.setAttribute("aria-label", raw);
  var transform = "none";
  try {
    transform = window.getComputedStyle(el).textTransform || "none";
  } catch (error) {
  }
  var words = applyTransform(raw, transform).split(" ");
  var chars = [];
  el.textContent = "";
  words.forEach(function(word, index) {
    var wrap2 = document.createElement("span");
    wrap2.style.cssText = "display:inline-block;white-space:nowrap;text-transform:none;";
    wrap2.setAttribute("aria-hidden", "true");
    Array.from(word).forEach(function(char) {
      var span2 = document.createElement("span");
      span2.className = "aurora-char";
      span2.style.cssText = CHAR_STYLE;
      span2.textContent = char;
      wrap2.appendChild(span2);
      chars.push(span2);
    });
    el.appendChild(wrap2);
    if (index < words.length - 1) {
      var space = document.createElement("span");
      space.style.cssText = "display:inline-block;text-transform:none;";
      space.textContent = " ";
      el.appendChild(space);
    }
  });
  return chars;
}
function splitIntoWords(el) {
  var text2 = el.textContent;
  el.setAttribute("aria-label", text2);
  el.textContent = "";
  return text2.split(/\s+/).filter(Boolean).map(function(word, i, all) {
    var span2 = document.createElement("span");
    span2.className = "aurora-word";
    span2.style.cssText = "display:inline-block;will-change:transform,opacity;";
    span2.setAttribute("aria-hidden", "true");
    span2.textContent = word + (i < all.length - 1 ? " " : "");
    el.appendChild(span2);
    return span2;
  });
}
function splitIntoLines(el) {
  var text2 = el.textContent;
  el.setAttribute("aria-label", text2);
  el.textContent = "";
  var spans = text2.split(/\s+/).filter(Boolean).map(function(word, i, all) {
    var span2 = document.createElement("span");
    span2.style.cssText = "display:inline-block;";
    span2.textContent = word + (i < all.length - 1 ? " " : "");
    el.appendChild(span2);
    return span2;
  });
  var order = [];
  var rows = {};
  spans.forEach(function(span2) {
    var top2 = span2.offsetTop;
    if (!rows[top2]) {
      rows[top2] = [];
      order.push(top2);
    }
    rows[top2].push(span2);
  });
  order.sort(function(a, b) {
    return a - b;
  });
  el.textContent = "";
  return order.map(function(top2) {
    var wrap2 = document.createElement("div");
    wrap2.className = "aurora-line-wrap";
    wrap2.style.cssText = "overflow:hidden;display:block;";
    var line = document.createElement("div");
    line.className = "aurora-line";
    line.style.cssText = "display:inline-block;will-change:transform,opacity;";
    line.setAttribute("aria-hidden", "true");
    rows[top2].forEach(function(span2) {
      line.appendChild(span2);
    });
    wrap2.appendChild(line);
    el.appendChild(wrap2);
    return line;
  });
}
function splitText$1(el, by) {
  if (by === "words") return splitIntoWords(el);
  if (by === "lines") return splitIntoLines(el);
  return splitIntoChars(el);
}
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const isBrowser = typeof window !== "undefined";
const win = isBrowser ? (
  /** @type {AnimeJSWindow} */
  /** @type {unknown} */
  window
) : null;
const doc = isBrowser ? document : null;
const tweenTypes = {
  OBJECT: 0,
  ATTRIBUTE: 1,
  CSS: 2,
  TRANSFORM: 3,
  CSS_VAR: 4
};
const valueTypes = {
  NUMBER: 0,
  UNIT: 1,
  COLOR: 2,
  COMPLEX: 3
};
const tickModes = {
  NONE: 0,
  AUTO: 1,
  FORCE: 2
};
const compositionTypes = {
  replace: 0,
  none: 1,
  blend: 2
};
const isRegisteredTargetSymbol = Symbol();
const isDomSymbol = Symbol();
const isSvgSymbol = Symbol();
const transformsSymbol = Symbol();
const proxyTargetSymbol = Symbol();
const minValue = 1e-11;
const maxValue = 1e12;
const K = 1e3;
const maxFps = 240;
const emptyString = "";
const cssVarPrefix = "var(";
const emptyArray = [];
const shortTransforms = /* @__PURE__ */ (() => {
  const map = /* @__PURE__ */ new Map();
  map.set("x", "translateX");
  map.set("y", "translateY");
  map.set("z", "translateZ");
  return map;
})();
const validTransforms = [
  "perspective",
  "translateX",
  "translateY",
  "translateZ",
  "rotate",
  "rotateX",
  "rotateY",
  "rotateZ",
  "scale",
  "scaleX",
  "scaleY",
  "scaleZ",
  "skew",
  "skewX",
  "skewY"
];
const transformsFragmentStrings = /* @__PURE__ */ validTransforms.reduce((a, v) => ({ ...a, [v]: v + "(" }), {});
const noop = () => {
};
const noopModifier = (v) => v;
const validRgbHslRgx = /\)\s*[-.\d]/;
const hexTestRgx = /(^#([\da-f]{3}){1,2}$)|(^#([\da-f]{4}){1,2}$)/i;
const rgbExecRgx = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i;
const rgbaExecRgx = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(-?\d+|-?\d*.\d+)\s*\)/i;
const hslExecRgx = /hsl\(\s*(-?\d+|-?\d*.\d+)\s*,\s*(-?\d+|-?\d*.\d+)%\s*,\s*(-?\d+|-?\d*.\d+)%\s*\)/i;
const hslaExecRgx = /hsla\(\s*(-?\d+|-?\d*.\d+)\s*,\s*(-?\d+|-?\d*.\d+)%\s*,\s*(-?\d+|-?\d*.\d+)%\s*,\s*(-?\d+|-?\d*.\d+)\s*\)/i;
const digitWithExponentRgx = /[-+]?\d*\.?\d+(?:e[-+]?\d)?/gi;
const unitsExecRgx = /^([-+]?\d*\.?\d+(?:e[-+]?\d+)?)([a-z]+|%)$/i;
const lowerCaseRgx = /([a-z])([A-Z])/g;
const relativeValuesExecRgx = /(\*=|\+=|-=)/;
const cssVariableMatchRgx = /var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/;
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const defaults = {
  id: null,
  keyframes: null,
  playbackEase: null,
  playbackRate: 1,
  frameRate: maxFps,
  loop: 0,
  reversed: false,
  alternate: false,
  autoplay: true,
  persist: false,
  duration: K,
  delay: 0,
  loopDelay: 0,
  ease: "out(2)",
  composition: compositionTypes.replace,
  modifier: noopModifier,
  onBegin: noop,
  onBeforeUpdate: noop,
  onUpdate: noop,
  onLoop: noop,
  onPause: noop,
  onComplete: noop,
  onRender: noop
};
const scope = {
  /** @type {Document|DOMTarget} */
  root: doc
};
const globals = {
  /** @type {DefaultsParams} */
  defaults,
  /** @type {Number} */
  precision: 4,
  /** @type {Number} equals 1 in ms mode, 0.001 in s mode */
  timeScale: 1,
  /** @type {Number} */
  tickThreshold: 200,
  /** @type {EditorGlobals|null} */
  editor: null
};
const globalVersions = { version: "4.5.0", engine: null };
if (isBrowser) {
  if (!win.AnimeJS) win.AnimeJS = [];
  win.AnimeJS.push(globalVersions);
}
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const toLowerCase = (str) => str.replace(lowerCaseRgx, "$1-$2").toLowerCase();
const stringStartsWith = (str, sub) => str.indexOf(sub) === 0;
const now = Date.now;
const isArr = Array.isArray;
const isObj = (a) => a && a.constructor === Object;
const isNum = (a) => typeof a === "number" && !isNaN(a);
const isStr = (a) => typeof a === "string";
const isFnc = (a) => typeof a === "function";
const isUnd = (a) => typeof a === "undefined";
const isNil = (a) => isUnd(a) || a === null;
const isSvg = (a) => isBrowser && a instanceof SVGElement;
const isHex = (a) => hexTestRgx.test(a);
const isRgb = (a) => stringStartsWith(a, "rgb");
const isHsl = (a) => stringStartsWith(a, "hsl");
const isCol = (a) => isHex(a) || (isRgb(a) || isHsl(a)) && (a[a.length - 1] === ")" || !validRgbHslRgx.test(a));
const isKey = (a) => !globals.defaults.hasOwnProperty(a);
const svgCssReservedProperties = ["opacity", "rotate", "overflow", "color"];
const isValidSVGAttribute = (el, propertyName) => {
  if (svgCssReservedProperties.includes(propertyName)) return false;
  if (el.getAttribute(propertyName) || propertyName in el) {
    if (propertyName === "scale") {
      const elParentNode = (
        /** @type {SVGGeometryElement} */
        /** @type {DOMTarget} */
        el.parentNode
      );
      return elParentNode && elParentNode.tagName === "filter";
    }
    return true;
  }
};
const parseNumber = (str) => isStr(str) ? parseFloat(
  /** @type {String} */
  str
) : (
  /** @type {Number} */
  str
);
const pow = Math.pow;
const sqrt = Math.sqrt;
const sin = Math.sin;
const cos = Math.cos;
const abs = Math.abs;
const floor = Math.floor;
const asin = Math.asin;
const PI = Math.PI;
const _round = Math.round;
const clamp$1 = (v, min, max) => v < min ? min : v > max ? max : v;
const round$1 = (v, decimalLength) => {
  if (decimalLength < 0) return v;
  if (!decimalLength) return _round(v);
  const p = 10 ** decimalLength;
  return _round(v * p) / p;
};
const snap$1 = (v, increment) => isArr(increment) ? increment.reduce((closest, cv) => abs(cv - v) < abs(closest - v) ? cv : closest) : increment ? _round(v / increment) * increment : v;
const lerp$1 = (start, end, factor) => factor === 1 ? end : factor === 0 ? start : start + (end - start) * factor;
const clampInfinity = (v) => v === Infinity ? maxValue : v === -Infinity ? -maxValue : v;
const normalizeTime = (v) => v <= minValue ? minValue : clampInfinity(round$1(v, 11));
const cloneArray = (a) => isArr(a) ? [...a] : a;
const mergeObjects = (o1, o2) => {
  const merged = (
    /** @type {T & U} */
    { ...o1 }
  );
  for (let p in o2) {
    const o1p = (
      /** @type {T & U} */
      o1[p]
    );
    merged[p] = isUnd(o1p) ? (
      /** @type {T & U} */
      o2[p]
    ) : o1p;
  }
  return merged;
};
const forEachChildren = (parent, callback, reverse, prevProp = "_prev", nextProp = "_next") => {
  let next = parent._head;
  let adjustedNextProp = nextProp;
  if (reverse) {
    next = parent._tail;
    adjustedNextProp = prevProp;
  }
  while (next) {
    const currentNext = next[adjustedNextProp];
    callback(next);
    next = currentNext;
  }
};
const removeChild = (parent, child, prevProp = "_prev", nextProp = "_next") => {
  const prev = child[prevProp];
  const next = child[nextProp];
  prev ? prev[nextProp] = next : parent._head = next;
  next ? next[prevProp] = prev : parent._tail = prev;
  child[prevProp] = null;
  child[nextProp] = null;
};
const addChild = (parent, child, sortMethod, prevProp = "_prev", nextProp = "_next") => {
  let prev = parent._tail;
  while (prev && sortMethod && sortMethod(prev, child)) prev = prev[prevProp];
  const next = prev ? prev[nextProp] : parent._head;
  prev ? prev[nextProp] = child : parent._head = child;
  next ? next[prevProp] = child : parent._tail = child;
  child[prevProp] = prev;
  child[nextProp] = next;
};
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const parseInlineTransforms = (target, propName, animationInlineStyles) => {
  const inlineTransforms = target.style.transform;
  if (inlineTransforms) {
    const cachedTransforms = target[transformsSymbol];
    let pos = 0;
    const len = inlineTransforms.length;
    let fullTranslateValue;
    while (pos < len) {
      while (pos < len && inlineTransforms.charCodeAt(pos) === 32) pos++;
      if (pos >= len) break;
      const nameStart = pos;
      while (pos < len && inlineTransforms.charCodeAt(pos) !== 40) pos++;
      if (pos >= len) break;
      const name = inlineTransforms.substring(nameStart, pos);
      let depth = 1;
      const valueStart = pos + 1;
      let c1 = -1, c2 = -1;
      pos++;
      while (pos < len && depth > 0) {
        const c = inlineTransforms.charCodeAt(pos);
        if (c === 40) depth++;
        else if (c === 41) depth--;
        else if (c === 44 && depth === 1) {
          if (c1 === -1) c1 = pos;
          else if (c2 === -1) c2 = pos;
        }
        pos++;
      }
      const valueEnd = pos - 1;
      if (name === "translate" || name === "translate3d") {
        if (c1 === -1) {
          cachedTransforms.translateX = inlineTransforms.substring(valueStart, valueEnd).trim();
        } else {
          cachedTransforms.translateX = inlineTransforms.substring(valueStart, c1).trim();
          if (c2 === -1) {
            cachedTransforms.translateY = inlineTransforms.substring(c1 + 1, valueEnd).trim();
          } else {
            cachedTransforms.translateY = inlineTransforms.substring(c1 + 1, c2).trim();
            cachedTransforms.translateZ = inlineTransforms.substring(c2 + 1, valueEnd).trim();
          }
        }
        fullTranslateValue = inlineTransforms.substring(valueStart, valueEnd);
      } else if (name === "scale" || name === "scale3d") {
        if (c1 === -1) {
          cachedTransforms.scale = inlineTransforms.substring(valueStart, valueEnd).trim();
        } else {
          cachedTransforms.scaleX = inlineTransforms.substring(valueStart, c1).trim();
          if (c2 === -1) {
            cachedTransforms.scaleY = inlineTransforms.substring(c1 + 1, valueEnd).trim();
          } else {
            cachedTransforms.scaleY = inlineTransforms.substring(c1 + 1, c2).trim();
            cachedTransforms.scaleZ = inlineTransforms.substring(c2 + 1, valueEnd).trim();
          }
        }
      } else {
        cachedTransforms[name] = inlineTransforms.substring(valueStart, valueEnd);
      }
    }
    if (propName === "translate3d" && fullTranslateValue) {
      if (animationInlineStyles) animationInlineStyles[propName] = fullTranslateValue;
      return fullTranslateValue;
    }
    const cached = cachedTransforms[propName];
    if (!isUnd(cached)) {
      if (animationInlineStyles) animationInlineStyles[propName] = cached;
      return cached;
    }
  }
  return propName === "translate3d" ? "0px, 0px, 0px" : propName === "rotate3d" ? "0, 0, 0, 0deg" : stringStartsWith(propName, "scale") ? "1" : stringStartsWith(propName, "rotate") || stringStartsWith(propName, "skew") ? "0deg" : "0px";
};
const buildTransformString = (props) => {
  let str = emptyString;
  for (let i = 0, l = validTransforms.length; i < l; i++) {
    const key2 = validTransforms[i];
    const val = props[key2];
    if (val !== void 0) {
      if (key2 === "translateX") {
        const next = props.translateY;
        if (next !== void 0) {
          const next2 = props.translateZ;
          if (next2 !== void 0) {
            str += `translate3d(${val},${next},${next2}) `;
            i += 2;
          } else {
            str += `translate(${val},${next}) `;
            i += 1;
          }
          continue;
        }
      }
      if (key2 === "scaleX" && props.scale === void 0) {
        const next = props.scaleY;
        if (next !== void 0) {
          const next2 = props.scaleZ;
          if (next2 !== void 0) {
            str += `scale3d(${val},${next},${next2}) `;
            i += 2;
          } else {
            str += `scale(${val},${next}) `;
            i += 1;
          }
          continue;
        }
      }
      str += `${transformsFragmentStrings[key2]}${val}) `;
    }
    if (key2 === "rotateZ") {
      if (props.rotate3d !== void 0) str += `rotate3d(${props.rotate3d}) `;
    }
  }
  if (props.matrix !== void 0) str += `matrix(${props.matrix}) `;
  if (props.matrix3d !== void 0) str += `matrix3d(${props.matrix3d}) `;
  return str;
};
/**
 * Anime.js - adapters - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const adapters = (
  /** @type {Adapter[]} */
  []
);
function resolveAdapterEntry(target, name) {
  if (!target) return null;
  const al = adapters.length;
  outer: for (let i = 0; i < al; i++) {
    const a = adapters[i];
    if (a.detect && !a.detect(target)) continue;
    const tas = a.targetAdapters;
    for (let j = 0, m = tas.length; j < m; j++) {
      const ta = tas[j];
      if (ta.detect(target)) {
        const entry = ta.props[name];
        if (entry && (!entry.gate || entry.gate(target))) return entry;
        break outer;
      }
    }
  }
  for (let i = 0; i < al; i++) {
    const a = adapters[i];
    if (a.detect && !a.detect(target)) continue;
    const rs = a.propertyResolvers;
    for (let j = 0, m = rs.length; j < m; j++) {
      const entry = rs[j](target, name);
      if (entry) return entry;
    }
  }
  return null;
}
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const rgbToRgba = (rgbValue) => {
  const rgba = rgbExecRgx.exec(rgbValue) || rgbaExecRgx.exec(rgbValue);
  const a = !isUnd(rgba[4]) ? +rgba[4] : 1;
  return [
    +rgba[1],
    +rgba[2],
    +rgba[3],
    a
  ];
};
const hexToRgba = (hexValue) => {
  const hexLength = hexValue.length;
  const isShort = hexLength === 4 || hexLength === 5;
  return [
    +("0x" + hexValue[1] + hexValue[isShort ? 1 : 2]),
    +("0x" + hexValue[isShort ? 2 : 3] + hexValue[isShort ? 2 : 4]),
    +("0x" + hexValue[isShort ? 3 : 5] + hexValue[isShort ? 3 : 6]),
    hexLength === 5 || hexLength === 9 ? +(+("0x" + hexValue[isShort ? 4 : 7] + hexValue[isShort ? 4 : 8]) / 255).toFixed(3) : 1
  ];
};
const hue2rgb = (p, q, t) => {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
};
const hslToRgba = (hslValue) => {
  const hsla = hslExecRgx.exec(hslValue) || hslaExecRgx.exec(hslValue);
  const h = +hsla[1] / 360;
  const s = +hsla[2] / 100;
  const l = +hsla[3] / 100;
  const a = !isUnd(hsla[4]) ? +hsla[4] : 1;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = round$1(hue2rgb(p, q, h + 1 / 3) * 255, 0);
    g = round$1(hue2rgb(p, q, h) * 255, 0);
    b = round$1(hue2rgb(p, q, h - 1 / 3) * 255, 0);
  }
  return [r, g, b, a];
};
const convertColorStringValuesToRgbaArray = (colorString) => {
  return isRgb(colorString) ? rgbToRgba(colorString) : isHex(colorString) ? hexToRgba(colorString) : isHsl(colorString) ? hslToRgba(colorString) : [0, 0, 0, 1];
};
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const setValue = (targetValue, defaultValue) => {
  return isUnd(targetValue) ? defaultValue : targetValue;
};
const resolveCssVar = (value, target) => {
  var _a;
  const match = value.match(cssVariableMatchRgx);
  const el = target[isDomSymbol] ? target : document.documentElement;
  let computed = (_a = getComputedStyle(
    /** @type {HTMLElement} */
    el
  )) == null ? void 0 : _a.getPropertyValue(match[1]);
  if ((!computed || computed.trim() === emptyString) && match[2]) computed = match[2].trim();
  return computed || 0;
};
const getFunctionValue = (value, target, index, targets, store, prevTween) => {
  if (isFnc(value)) {
    if (!store) {
      const computed = (
        /** @type {Function} */
        value(target, index, targets, prevTween)
      );
      return !isNaN(+computed) ? +computed : computed || 0;
    }
    const func = () => {
      const computed = (
        /** @type {Function} */
        value(target, index, targets, prevTween)
      );
      return !isNaN(+computed) ? +computed : computed || 0;
    };
    store.func = func;
    return func();
  }
  if (isStr(value) && stringStartsWith(value, cssVarPrefix)) {
    if (!store) return resolveCssVar(
      /** @type {String} */
      value,
      target
    );
    const func = () => resolveCssVar(
      /** @type {String} */
      value,
      target
    );
    store.func = func;
    return func();
  }
  return value;
};
const getTweenType = (target, prop) => {
  return !target[isDomSymbol] ? tweenTypes.OBJECT : (
    // Handle SVG attributes
    target[isSvgSymbol] && isValidSVGAttribute(target, prop) ? tweenTypes.ATTRIBUTE : (
      // Handle CSS Transform properties differently than CSS to allow individual animations
      validTransforms.includes(prop) || shortTransforms.get(prop) ? tweenTypes.TRANSFORM : (
        // CSS variables
        stringStartsWith(prop, "--") ? tweenTypes.CSS_VAR : (
          // All other CSS properties
          prop in /** @type {DOMTarget} */
          target.style ? tweenTypes.CSS : (
            // Handle other DOM Attributes
            prop in target ? tweenTypes.OBJECT : tweenTypes.ATTRIBUTE
          )
        )
      )
    )
  );
};
const getCSSValue = (target, propName, animationInlineStyles) => {
  const inlineStyles = target.style[propName];
  if (inlineStyles && animationInlineStyles) {
    animationInlineStyles[propName] = inlineStyles;
  }
  const value = inlineStyles || getComputedStyle(target[proxyTargetSymbol] || target).getPropertyValue(propName);
  return value === "auto" ? "0" : value;
};
const getOriginalAnimatableValue = (target, propName, tweenType, animationInlineStyles) => {
  const type = !isUnd(tweenType) ? tweenType : getTweenType(target, propName);
  const adapterProp = resolveAdapterEntry(target, propName);
  if (adapterProp) {
    const value = adapterProp.get(target);
    if (value && animationInlineStyles) animationInlineStyles[propName] = value;
    return value == null ? 0 : value;
  }
  if (type === tweenTypes.OBJECT) {
    const value = target[propName];
    if (value && animationInlineStyles) animationInlineStyles[propName] = value;
    return value || 0;
  }
  if (type === tweenTypes.ATTRIBUTE) {
    const value = (
      /** @type {DOMTarget} */
      target.getAttribute(propName)
    );
    if (value && animationInlineStyles) animationInlineStyles[propName] = value;
    return value;
  }
  return type === tweenTypes.TRANSFORM ? parseInlineTransforms(
    /** @type {DOMTarget} */
    target,
    propName,
    animationInlineStyles
  ) : type === tweenTypes.CSS_VAR ? getCSSValue(
    /** @type {DOMTarget} */
    target,
    propName,
    animationInlineStyles
  ).trimStart() : getCSSValue(
    /** @type {DOMTarget} */
    target,
    propName,
    animationInlineStyles
  );
};
const getRelativeValue = (x, y, operator) => {
  return operator === "-" ? x - y : operator === "+" ? x + y : x * y;
};
const createDecomposedValueTargetObject = () => {
  return {
    /** @type {valueTypes} */
    t: valueTypes.NUMBER,
    n: 0,
    u: null,
    o: null,
    d: null,
    s: null
  };
};
const decomposeRawValue = (rawValue, targetObject) => {
  targetObject.t = valueTypes.NUMBER;
  targetObject.n = 0;
  targetObject.u = null;
  targetObject.o = null;
  targetObject.d = null;
  targetObject.s = null;
  if (!rawValue) return targetObject;
  const num = +rawValue;
  if (!isNaN(num)) {
    targetObject.n = num;
    return targetObject;
  }
  let str = (
    /** @type {String} */
    rawValue
  );
  if (str[1] === "=") {
    targetObject.o = str[0];
    str = str.slice(2);
  }
  const unitMatch = str.includes(" ") ? false : unitsExecRgx.exec(str);
  if (unitMatch) {
    targetObject.t = valueTypes.UNIT;
    targetObject.n = +unitMatch[1];
    targetObject.u = unitMatch[2];
    return targetObject;
  } else if (targetObject.o) {
    targetObject.n = +str;
    return targetObject;
  } else if (isCol(str)) {
    targetObject.t = valueTypes.COLOR;
    targetObject.d = convertColorStringValuesToRgbaArray(str);
    return targetObject;
  } else {
    const matchedNumbers = str.match(digitWithExponentRgx);
    targetObject.t = valueTypes.COMPLEX;
    targetObject.d = matchedNumbers ? matchedNumbers.map(Number) : [];
    targetObject.s = str.split(digitWithExponentRgx) || [];
    return targetObject;
  }
};
const decomposeTweenValue = (tween, targetObject) => {
  targetObject.t = tween._valueType;
  targetObject.n = tween._toNumber;
  targetObject.u = tween._unit;
  targetObject.o = null;
  targetObject.d = cloneArray(tween._toNumbers);
  targetObject.s = cloneArray(tween._strings);
  return targetObject;
};
const decomposedOriginalValue = createDecomposedValueTargetObject();
const composeComplexValue = (tween, progress, precision) => {
  const mod = tween._modifier;
  const fn = tween._fromNumbers;
  const tn = tween._toNumbers;
  const ts = tween._strings;
  let v = ts[0];
  for (let j = 0, l = tn.length; j < l; j++) {
    const n = (
      /** @type {Number} */
      mod(round$1(lerp$1(fn[j], tn[j], progress), precision))
    );
    const s = ts[j + 1];
    v += `${s ? n + s : n}`;
    tween._numbers[j] = n;
  }
  return v;
};
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const render$1 = (tickable, time, muteCallbacks, internalRender, tickMode) => {
  const parent = tickable.parent;
  const duration = tickable.duration;
  const completed = tickable.completed;
  const iterationDuration = tickable.iterationDuration;
  const iterationCount = tickable.iterationCount;
  const _currentIteration = tickable._currentIteration;
  const _loopDelay = tickable._loopDelay;
  const _reversed = tickable._reversed;
  const _alternate = tickable._alternate;
  const _hasChildren = tickable._hasChildren;
  const tickableDelay = tickable._delay;
  const tickablePrevAbsoluteTime = tickable._currentTime;
  const tickableEndTime = tickableDelay + iterationDuration;
  const tickableAbsoluteTime = time - tickableDelay;
  const tickablePrevTime = clamp$1(tickablePrevAbsoluteTime, -tickableDelay, duration);
  const tickableCurrentTime = clamp$1(tickableAbsoluteTime, -tickableDelay, duration);
  const deltaTime = tickableAbsoluteTime - tickablePrevAbsoluteTime;
  const isCurrentTimeAboveZero = tickableCurrentTime > 0;
  const isCurrentTimeEqualOrAboveDuration = tickableCurrentTime >= duration;
  const isSetter = duration <= minValue;
  const forcedTick = tickMode === tickModes.FORCE;
  let isOdd = 0;
  let iterationElapsedTime = tickableAbsoluteTime;
  let hasRendered = 0;
  if (iterationCount > 1) {
    const period = iterationDuration + (isCurrentTimeEqualOrAboveDuration ? 0 : _loopDelay);
    const currentIteration = ~~(tickableCurrentTime / period);
    tickable._currentIteration = clamp$1(currentIteration, 0, iterationCount);
    if (isCurrentTimeEqualOrAboveDuration) tickable._currentIteration--;
    isOdd = tickable._currentIteration % 2;
    iterationElapsedTime = tickableCurrentTime - currentIteration * period || 0;
  }
  const isReversed = _reversed ^ (_alternate && isOdd);
  const _ease = (
    /** @type {Renderable} */
    tickable._ease
  );
  let iterationTime = isCurrentTimeEqualOrAboveDuration ? isReversed ? 0 : duration : isReversed ? iterationDuration - iterationElapsedTime : iterationElapsedTime;
  if (_ease) iterationTime = iterationDuration * _ease(iterationTime / iterationDuration) || 0;
  const isRunningBackwards = (parent ? parent.backwards : tickableAbsoluteTime < tickablePrevAbsoluteTime) ? !isReversed : !!isReversed;
  tickable._currentTime = tickableAbsoluteTime;
  tickable._iterationTime = iterationTime;
  tickable.backwards = isRunningBackwards;
  if (isCurrentTimeAboveZero && !tickable.began) {
    tickable.began = true;
    if (!muteCallbacks && !(parent && (isRunningBackwards || !parent.began))) {
      tickable.onBegin(
        /** @type {CallbackArgument} */
        tickable
      );
    }
  } else if (tickableAbsoluteTime <= 0) {
    tickable.began = false;
  }
  if (!muteCallbacks && !_hasChildren && isCurrentTimeAboveZero && tickable._currentIteration !== _currentIteration) {
    tickable.onLoop(
      /** @type {CallbackArgument} */
      tickable
    );
  }
  if (forcedTick || tickMode === tickModes.AUTO && // Timeline children render from their offset instead of their delay so the gap left by a truncated sibling is covered on seek.
  (time >= (parent && tickableDelay > 0 ? 0 : tickableDelay) && time <= tickableEndTime || // Normal render
  time <= tickableDelay && tickablePrevTime > tickableDelay || // Playhead is before the animation start time so make sure the animation is at its initial state
  time >= tickableEndTime && tickablePrevTime !== duration) || iterationTime >= tickableEndTime && tickablePrevTime !== duration || // iterationTime is per-iteration, compared to the delay to catch a backward seek into a looped iteration's delay region. Exclude the final settled end, where iterationTime clamps to duration and would falsely match the delay region when the delay exceeds the duration.
  iterationTime <= tickableDelay && tickablePrevTime > 0 && !isCurrentTimeEqualOrAboveDuration || time <= tickablePrevTime && tickablePrevTime === duration && completed || // Force a render if a seek occurs on an completed animation
  isCurrentTimeEqualOrAboveDuration && !completed && isSetter) {
    if (isCurrentTimeAboveZero) {
      tickable.computeDeltaTime(tickablePrevTime);
      if (!muteCallbacks) tickable.onBeforeUpdate(
        /** @type {CallbackArgument} */
        tickable
      );
    }
    if (!_hasChildren) {
      const forcedRender = forcedTick || (isRunningBackwards ? deltaTime * -1 : deltaTime) >= globals.tickThreshold;
      const absoluteTime = round$1(tickable._offset + (parent ? parent._offset : 0) + tickableDelay + iterationTime, 12);
      let tween = (
        /** @type {Tween} */
        /** @type {JSAnimation} */
        tickable._head
      );
      let tweenTarget;
      let tweenStyle;
      let tweenTargetTransforms;
      let tweenTargetTransformsProperties;
      let tweenTransformsNeedUpdate = 0;
      while (tween) {
        const tweenComposition = tween._composition;
        const tweenCurrentTime = tween._currentTime;
        const tweenChangeDuration = tween._changeDuration;
        const tweenAbsEndTime = tween._absoluteStartTime + tween._changeDuration;
        const tweenNextRep = tween._nextRep;
        const tweenPrevRep = tween._prevRep;
        const tweenHasComposition = tweenComposition !== compositionTypes.none;
        const tweenPrevRepEndTime = tweenPrevRep ? tweenPrevRep._absoluteStartTime + tweenPrevRep._changeDuration : 0;
        const tweenPrevRepIsCrossParent = tweenPrevRep && tweenPrevRep.parent !== tween.parent;
        const tweenNextRepTakeover = !tweenNextRep || tweenNextRep._isOverridden ? tweenAbsEndTime : tweenNextRep.parent === tween.parent ? tweenAbsEndTime + tweenNextRep._delay : tweenNextRep._absoluteStartTime < tweenNextRep._absoluteUpdateStartTime ? tweenNextRep._absoluteStartTime : tweenNextRep._absoluteUpdateStartTime;
        if ((forcedRender || // Tail keyframes always re-evaluate the gate so an earlier keyframe cannot leave the target stale by writing past its own range after a backward seek.
        (tweenCurrentTime !== tweenChangeDuration || absoluteTime <= tweenNextRepTakeover || tweenPrevRep && !tweenPrevRepIsCrossParent && (!tweenNextRep || tweenNextRep.parent !== tween.parent)) && // A cross parent tween re-renders its from value from the previous sibling truncated end so the handoff gap holds.
        // A keyframe re-renders its from revert while the next keyframe time is stale so a backward jump over its range cannot leave the next value in place.
        (tweenCurrentTime !== 0 || absoluteTime >= tween._absoluteStartTime || tweenPrevRepIsCrossParent && !tween._hasFromValue && !tweenPrevRep._isOverridden && absoluteTime >= tweenPrevRepEndTime || tweenNextRep && !tweenNextRep._isOverridden && tweenNextRep.parent === tween.parent && tweenNextRep._currentTime !== 0 && iterationTime < tweenNextRep._startTime)) && // Non-first keyframes wait until the iteration reaches their own start before rendering, so the previous keyframe can handle the from-revert when scrubbed backward past this tween's range.
        (!tweenPrevRep || tweenPrevRepIsCrossParent || iterationTime >= tween._startTime) && (!tweenHasComposition || !tween._isOverridden && (!tween._isOverlapped || absoluteTime <= tweenAbsEndTime) && // The next sibling owns the value past its takeover point, so yielding there keeps writes single owner in both directions.
        (!tweenNextRep || tweenNextRep._isOverridden || absoluteTime <= tweenNextRepTakeover) && // The previous sibling owns the value up to its truncated end.
        // Cross parent tweens take over the hold from that point, explicit from values wait for their own start.
        (!tweenPrevRep || (tweenPrevRep._isOverridden || (!tweenPrevRepIsCrossParent ? absoluteTime >= tweenPrevRepEndTime + tween._delay : absoluteTime >= tween._absoluteStartTime || !tween._hasFromValue && absoluteTime >= tweenPrevRepEndTime))))) {
          const tweenNewTime = tween._currentTime = clamp$1(iterationTime - tween._startTime, 0, tweenChangeDuration);
          const tweenProgress = tween._ease(tweenNewTime / tween._updateDuration);
          const tweenModifier = tween._modifier;
          const tweenValueType = tween._valueType;
          const tweenType = tween._tweenType;
          const tweenIsObject = tweenType === tweenTypes.OBJECT;
          const tweenIsNumber = tweenValueType === valueTypes.NUMBER;
          const tweenPrecision = tweenIsNumber && tweenIsObject || tweenProgress === 0 || tweenProgress === 1 ? -1 : globals.precision;
          let value;
          let number2;
          if (tweenIsNumber) {
            value = number2 = /** @type {Number} */
            tweenModifier(round$1(lerp$1(tween._fromNumber, tween._toNumber, tweenProgress), tweenPrecision));
          } else if (tweenValueType === valueTypes.UNIT) {
            number2 = /** @type {Number} */
            tweenModifier(round$1(lerp$1(tween._fromNumber, tween._toNumber, tweenProgress), tweenPrecision));
            value = `${number2}${tween._unit}`;
          } else if (tweenValueType === valueTypes.COLOR) {
            const ns = tween._numbers;
            const fn = tween._fromNumbers;
            const tn = tween._toNumbers;
            const omt = 1 - tweenProgress;
            const fr = fn[0], fg = fn[1], fb = fn[2];
            const tr = tn[0], tg = tn[1], tb = tn[2];
            ns[0] = /** @type {Number} */
            tweenModifier(Math.sqrt(fr * fr * omt + tr * tr * tweenProgress));
            ns[1] = /** @type {Number} */
            tweenModifier(Math.sqrt(fg * fg * omt + tg * tg * tweenProgress));
            ns[2] = /** @type {Number} */
            tweenModifier(Math.sqrt(fb * fb * omt + tb * tb * tweenProgress));
            ns[3] = /** @type {Number} */
            tweenModifier(lerp$1(fn[3], tn[3], tweenProgress));
            if (!tween._setter || internalRender) {
              value = `rgba(${round$1(ns[0], 0)},${round$1(ns[1], 0)},${round$1(ns[2], 0)},${ns[3]})`;
            }
          } else if (tweenValueType === valueTypes.COMPLEX) {
            value = composeComplexValue(tween, tweenProgress, tweenPrecision);
          }
          if (tweenHasComposition) {
            tween._number = number2;
          }
          if (!internalRender && tweenComposition !== compositionTypes.blend) {
            const tweenProperty = tween.property;
            tweenTarget = tween.target;
            if (tween._setter) {
              tween._setter(tweenTarget, number2, tween);
            } else if (tweenIsObject) {
              tweenTarget[tweenProperty] = value;
            } else if (tweenType === tweenTypes.ATTRIBUTE) {
              tweenTarget.setAttribute(
                tweenProperty,
                /** @type {String} */
                value
              );
            } else {
              tweenStyle = /** @type {DOMTarget} */
              tweenTarget.style;
              if (tweenType === tweenTypes.TRANSFORM) {
                if (tweenTarget !== tweenTargetTransforms) {
                  tweenTargetTransforms = tweenTarget;
                  tweenTargetTransformsProperties = tweenTarget[transformsSymbol];
                }
                tweenTargetTransformsProperties[tweenProperty] = value;
                tweenTransformsNeedUpdate = 1;
              } else if (tweenType === tweenTypes.CSS) {
                tweenStyle[tweenProperty] = value;
              } else if (tweenType === tweenTypes.CSS_VAR) {
                tweenStyle.setProperty(
                  tweenProperty,
                  /** @type {String} */
                  value
                );
              }
            }
            if (isCurrentTimeAboveZero) hasRendered = 1;
          } else {
            tween._value = value;
          }
        } else if (tweenCurrentTime && tweenPrevRep && !tweenPrevRepIsCrossParent && iterationTime < tween._startTime) {
          tween._currentTime = 0;
        }
        if (tweenTransformsNeedUpdate && tween._renderTransforms) {
          tweenStyle.transform = buildTransformString(tweenTargetTransformsProperties);
          tweenTransformsNeedUpdate = 0;
        }
        tween = tween._next;
      }
      if (!muteCallbacks && hasRendered) {
        tickable.onRender(
          /** @type {JSAnimation} */
          tickable
        );
      }
    }
    if (!muteCallbacks && isCurrentTimeAboveZero) {
      tickable.onUpdate(
        /** @type {CallbackArgument} */
        tickable
      );
    }
  }
  if (parent && isSetter) {
    if (!muteCallbacks && // (tickableAbsoluteTime > 0 instead) of (tickableAbsoluteTime >= duration) to prevent floating point precision issues
    // see: https://github.com/juliangarnier/anime/issues/1088
    (parent.began && !isRunningBackwards && tickableAbsoluteTime > 0 && !completed || isRunningBackwards && tickableAbsoluteTime <= minValue && completed)) {
      tickable.onComplete(
        /** @type {CallbackArgument} */
        tickable
      );
      tickable.completed = !isRunningBackwards;
    }
  } else if (isCurrentTimeAboveZero && isCurrentTimeEqualOrAboveDuration) {
    if (iterationCount === Infinity) {
      tickable._startTime += tickable.duration;
    } else if (tickable._currentIteration >= iterationCount - 1) {
      tickable.paused = true;
      if (!completed && !_hasChildren) {
        tickable.completed = true;
        if (!muteCallbacks && !(parent && (isRunningBackwards || !parent.began))) {
          tickable.onComplete(
            /** @type {CallbackArgument} */
            tickable
          );
          tickable._resolve(
            /** @type {CallbackArgument} */
            tickable
          );
        }
      }
    }
  } else {
    tickable.completed = false;
  }
  return hasRendered;
};
const tick = (tickable, time, muteCallbacks, internalRender, tickMode) => {
  const _currentIteration = tickable._currentIteration;
  render$1(tickable, time, muteCallbacks, internalRender, tickMode);
  if (tickable._hasChildren) {
    const tl = (
      /** @type {Timeline} */
      tickable
    );
    const tlIsRunningBackwards = tl.backwards;
    const tlChildrenTime = internalRender ? time : tl._iterationTime;
    const tlCildrenTickTime = now();
    let tlChildrenHasRendered = 0;
    let tlChildrenHaveCompleted = true;
    if (!internalRender && tl._currentIteration !== _currentIteration) {
      const tlIterationDuration = tl.iterationDuration;
      forEachChildren(tl, (child) => {
        if (!tlIsRunningBackwards) {
          if (!child.completed && !child.backwards && child._currentTime < child.iterationDuration) {
            render$1(child, tlIterationDuration, muteCallbacks, 1, tickModes.FORCE);
          }
          child.began = false;
          child.completed = false;
        } else {
          const childDuration = child.duration;
          const childStartTime = child._offset + child._delay;
          const childEndTime = childStartTime + childDuration;
          if (!muteCallbacks && childDuration <= minValue && (!childStartTime || childEndTime === tlIterationDuration)) {
            child.onComplete(child);
          }
        }
      });
      if (!muteCallbacks) tl.onLoop(
        /** @type {CallbackArgument} */
        tl
      );
    }
    forEachChildren(tl, (child) => {
      const childTime = round$1((tlChildrenTime - child._offset) * child._speed, 12);
      if (tlIsRunningBackwards && childTime > child._delay + child.duration) return;
      const childTickMode = child._fps < tl._fps ? child.requestTick(tlCildrenTickTime) : tickMode;
      tlChildrenHasRendered += render$1(child, childTime, muteCallbacks, internalRender, childTickMode);
      if (!child.completed && tlChildrenHaveCompleted) tlChildrenHaveCompleted = false;
    }, tlIsRunningBackwards);
    if (!muteCallbacks && tlChildrenHasRendered) tl.onRender(
      /** @type {CallbackArgument} */
      tl
    );
    if ((tlChildrenHaveCompleted || tlIsRunningBackwards) && tl._currentTime >= tl.duration) {
      tl.paused = true;
      if (!tl.completed) {
        tl.completed = true;
        if (!muteCallbacks) {
          tl.onComplete(
            /** @type {CallbackArgument} */
            tl
          );
          tl._resolve(
            /** @type {CallbackArgument} */
            tl
          );
        }
      }
    }
  }
};
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const propertyNamesCache = {};
const sanitizePropertyName = (propertyName, target, tweenType) => {
  if (tweenType === tweenTypes.TRANSFORM) {
    const t = shortTransforms.get(propertyName);
    return t ? t : propertyName;
  } else if (tweenType === tweenTypes.CSS || // Handle special cases where properties like "strokeDashoffset" needs to be set as "stroke-dashoffset"
  // but properties like "baseFrequency" should stay in lowerCamelCase
  tweenType === tweenTypes.ATTRIBUTE && (isSvg(target) && propertyName in /** @type {DOMTarget} */
  target.style)) {
    const cachedPropertyName = propertyNamesCache[propertyName];
    if (cachedPropertyName) {
      return cachedPropertyName;
    } else {
      const lowerCaseName = propertyName ? toLowerCase(propertyName) : propertyName;
      propertyNamesCache[propertyName] = lowerCaseName;
      return lowerCaseName;
    }
  } else {
    return propertyName;
  }
};
const revertValues = (renderable, inlineStylesOnly = false) => {
  if (renderable._hasChildren) {
    forEachChildren(renderable, (child) => revertValues(child, inlineStylesOnly), true);
  } else {
    const animation = (
      /** @type {JSAnimation} */
      renderable
    );
    animation.pause();
    forEachChildren(animation, (tween) => {
      const tweenProperty = tween.property;
      const tweenTarget = tween.target;
      const tweenType = tween._tweenType;
      const originalInlinedValue = tween._inlineValue;
      const tweenHadNoInlineValue = isNil(originalInlinedValue) || originalInlinedValue === emptyString;
      if (tween._setter) {
        if (!inlineStylesOnly && !tweenHadNoInlineValue) {
          decomposeRawValue(originalInlinedValue, decomposedOriginalValue);
          if (decomposedOriginalValue.d) {
            const src = decomposedOriginalValue.d;
            const dst = tween._numbers;
            for (let i = 0, l = src.length; i < l; i++) dst[i] = src[i];
          } else {
            tween._number = decomposedOriginalValue.n;
          }
          tween._setter(tween.target, tween._number, tween);
        }
      } else if (tweenType === tweenTypes.OBJECT) {
        if (!inlineStylesOnly && !tweenHadNoInlineValue) {
          tweenTarget[tweenProperty] = originalInlinedValue;
        }
      } else if (tweenTarget[isDomSymbol]) {
        if (tweenType === tweenTypes.ATTRIBUTE) {
          if (!inlineStylesOnly) {
            if (tweenHadNoInlineValue) {
              tweenTarget.removeAttribute(tweenProperty);
            } else {
              tweenTarget.setAttribute(
                tweenProperty,
                /** @type {String} */
                originalInlinedValue
              );
            }
          }
        } else {
          const targetStyle = (
            /** @type {DOMTarget} */
            tweenTarget.style
          );
          if (tweenType === tweenTypes.TRANSFORM) {
            const cachedTransforms = tweenTarget[transformsSymbol];
            if (tweenHadNoInlineValue) {
              delete cachedTransforms[tweenProperty];
            } else {
              cachedTransforms[tweenProperty] = originalInlinedValue;
            }
            if (tween._renderTransforms) {
              if (!Object.keys(cachedTransforms).length) {
                targetStyle.removeProperty("transform");
              } else {
                targetStyle.transform = buildTransformString(cachedTransforms);
              }
            }
          } else {
            if (tweenHadNoInlineValue) {
              targetStyle.removeProperty(toLowerCase(tweenProperty));
            } else {
              targetStyle[tweenProperty] = originalInlinedValue;
            }
          }
        }
      }
      if (tweenTarget[isDomSymbol] && animation._tail === tween) {
        animation.targets.forEach((t) => {
          if (t.getAttribute && t.getAttribute("style") === emptyString) {
            t.removeAttribute("style");
          }
        });
      }
    });
  }
  return renderable;
};
const cleanInlineStyles = (renderable) => revertValues(renderable, true);
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
class Clock {
  /** @param {Number} [initTime] */
  constructor(initTime = 0) {
    this.deltaTime = 0;
    this._currentTime = initTime;
    this._lastTickTime = initTime;
    this._startTime = initTime;
    this._lastTime = initTime;
    this._frameDuration = K / maxFps;
    this._fps = maxFps;
    this._speed = 1;
    this._hasChildren = false;
    this._head = null;
    this._tail = null;
  }
  get fps() {
    return this._fps;
  }
  set fps(frameRate) {
    const fr = +frameRate;
    const fps = fr < minValue ? minValue : fr;
    const frameDuration = K / fps;
    if (fps > defaults.frameRate) defaults.frameRate = fps;
    this._fps = fps;
    this._frameDuration = frameDuration;
  }
  get speed() {
    return this._speed;
  }
  set speed(playbackRate) {
    const pbr = +playbackRate;
    this._speed = pbr < minValue ? minValue : pbr;
  }
  /**
   * @param  {Number} time
   * @return {tickModes}
   */
  requestTick(time) {
    const frameDuration = this._frameDuration;
    const elapsed = time - this._lastTickTime;
    const scaled = frameDuration * 0.25;
    const tolerance = scaled < 4 ? scaled : 4;
    if (elapsed + tolerance < frameDuration) return tickModes.NONE;
    this._lastTickTime = elapsed >= frameDuration ? time - elapsed % frameDuration : time;
    return tickModes.AUTO;
  }
  /**
   * @param  {Number} time
   * @return {Number}
   */
  computeDeltaTime(time) {
    const delta = time - this._lastTime;
    this.deltaTime = delta;
    this._lastTime = time;
    return delta;
  }
}
/**
 * Anime.js - animation - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const additive = {
  animation: null,
  update: noop
};
const addAdditiveAnimation = (lookups2) => {
  let animation = additive.animation;
  if (!animation) {
    animation = {
      duration: minValue,
      computeDeltaTime: noop,
      _offset: 0,
      _delay: 0,
      _head: null,
      _tail: null
    };
    additive.animation = animation;
    additive.update = () => {
      lookups2.forEach((propertyAnimation) => {
        for (let propertyName in propertyAnimation) {
          const tweens = propertyAnimation[propertyName];
          const lookupTween = tweens._head;
          if (lookupTween) {
            const valueType = lookupTween._valueType;
            const additiveValues = valueType === valueTypes.COMPLEX || valueType === valueTypes.COLOR ? cloneArray(lookupTween._fromNumbers) : null;
            let additiveValue = lookupTween._fromNumber;
            let tween = tweens._tail;
            while (tween && tween !== lookupTween) {
              if (additiveValues) {
                for (let i = 0, l = tween._numbers.length; i < l; i++) additiveValues[i] += tween._numbers[i];
              } else {
                additiveValue += tween._number;
              }
              tween = tween._prevAdd;
            }
            lookupTween._toNumber = additiveValue;
            lookupTween._toNumbers = additiveValues;
          }
        }
      });
      render$1(animation, 1, 1, 0, tickModes.FORCE);
    };
  }
  return animation;
};
/**
 * Anime.js - engine - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const engineTickMethod = /* @__PURE__ */ (() => isBrowser ? requestAnimationFrame : setImmediate)();
const engineCancelMethod = /* @__PURE__ */ (() => isBrowser ? cancelAnimationFrame : clearImmediate)();
class Engine extends Clock {
  /** @param {Number} [initTime] */
  constructor(initTime) {
    super(initTime);
    this.useDefaultMainLoop = true;
    this.pauseOnDocumentHidden = true;
    this.defaults = defaults;
    this.paused = true;
    this.reqId = 0;
  }
  update() {
    const time = this._currentTime = now();
    if (this.requestTick(time)) {
      this.computeDeltaTime(time);
      const engineSpeed = this._speed;
      const engineFps = this._fps;
      let activeTickable = (
        /** @type {Tickable} */
        this._head
      );
      while (activeTickable) {
        const nextTickable = activeTickable._next;
        if (!activeTickable.paused) {
          tick(
            activeTickable,
            (time - activeTickable._startTime) * activeTickable._speed * engineSpeed,
            0,
            // !muteCallbacks
            0,
            // !internalRender
            activeTickable._fps < engineFps ? activeTickable.requestTick(time) : tickModes.AUTO
          );
        } else {
          removeChild(this, activeTickable);
          this._hasChildren = !!this._tail;
          activeTickable._running = false;
          if (activeTickable.completed && !activeTickable._cancelled) {
            activeTickable.cancel();
          }
        }
        activeTickable = nextTickable;
      }
      additive.update();
    }
  }
  wake() {
    if (this.useDefaultMainLoop && !this.reqId) {
      this.requestTick(now());
      this.reqId = engineTickMethod(tickEngine);
    }
    return this;
  }
  pause() {
    if (!this.reqId) return;
    this.paused = true;
    return killEngine();
  }
  resume() {
    if (!this.paused) return;
    this.paused = false;
    forEachChildren(this, (child) => child.resetTime());
    return this.wake();
  }
  // Getter and setter for speed
  get speed() {
    return this._speed * (globals.timeScale === 1 ? 1 : K);
  }
  set speed(playbackRate) {
    const speed = playbackRate * globals.timeScale;
    if (this._speed === speed) return;
    this._speed = speed;
    forEachChildren(this, (child) => child.speed = child._speed);
  }
  // Getter and setter for timeUnit
  get timeUnit() {
    return globals.timeScale === 1 ? "ms" : "s";
  }
  set timeUnit(unit) {
    const secondsScale = 1e-3;
    const isSecond = unit === "s";
    const newScale = isSecond ? secondsScale : 1;
    if (globals.timeScale !== newScale) {
      globals.timeScale = newScale;
      globals.tickThreshold = 200 * newScale;
      const scaleFactor = isSecond ? secondsScale : K;
      this.defaults.duration *= scaleFactor;
      this._speed *= scaleFactor;
    }
  }
  // Getter and setter for precision
  get precision() {
    return globals.precision;
  }
  set precision(precision) {
    globals.precision = precision;
  }
}
const engine = /* @__PURE__ */ (() => {
  const engine2 = new Engine(now());
  if (isBrowser) {
    globalVersions.engine = engine2;
    doc.addEventListener("visibilitychange", () => {
      if (!engine2.pauseOnDocumentHidden) return;
      doc.hidden ? engine2.pause() : engine2.resume();
    });
  }
  return engine2;
})();
const tickEngine = () => {
  if (engine._head) {
    engine.reqId = engineTickMethod(tickEngine);
    engine.update();
  } else {
    engine.reqId = 0;
  }
};
const killEngine = () => {
  engineCancelMethod(
    /** @type {NodeJS.Immediate & Number} */
    engine.reqId
  );
  engine.reqId = 0;
  return engine;
};
/**
 * Anime.js - animation - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const lookups = {
  /** @type {TweenReplaceLookups} */
  _rep: /* @__PURE__ */ new WeakMap(),
  /** @type {TweenAdditiveLookups} */
  _add: /* @__PURE__ */ new Map()
};
const getTweenSiblings = (target, property, lookup = "_rep") => {
  const lookupMap = lookups[lookup];
  let targetLookup = lookupMap.get(target);
  if (!targetLookup) {
    targetLookup = {};
    lookupMap.set(target, targetLookup);
  }
  return targetLookup[property] ? targetLookup[property] : targetLookup[property] = {
    _head: null,
    _tail: null
  };
};
const addTweenSortMethod = (p, c) => {
  return p._isOverridden || p._absoluteStartTime > c._absoluteStartTime;
};
const overrideTween = (tween) => {
  tween._isOverlapped = 1;
  tween._isOverridden = 1;
  tween._changeDuration = minValue;
  tween._currentTime = minValue;
};
const composeTween = (tween, siblings) => {
  const tweenCompositionType = tween._composition;
  if (tweenCompositionType === compositionTypes.replace) {
    const tweenAbsStartTime = tween._absoluteStartTime;
    addChild(siblings, tween, addTweenSortMethod, "_prevRep", "_nextRep");
    const prevSibling = tween._prevRep;
    if (prevSibling) {
      const prevParent = prevSibling.parent;
      const prevAbsEndTime = prevSibling._absoluteEndTime;
      if (
        // Check if the previous tween is from a different animation
        tween.parent.id !== prevParent.id && // Check if the animation has loops
        prevParent.iterationCount > 1 && // Check if _absoluteChangeEndTime of last loop overlaps the current tween
        prevAbsEndTime + (prevParent.duration - prevParent.iterationDuration) > tweenAbsStartTime
      ) {
        overrideTween(prevSibling);
        let prevPrevSibling = prevSibling._prevRep;
        while (prevPrevSibling && prevPrevSibling.parent.id === prevParent.id) {
          overrideTween(prevPrevSibling);
          prevPrevSibling = prevPrevSibling._prevRep;
        }
      }
      const absoluteUpdateStartTime = tween._absoluteUpdateStartTime;
      if (prevAbsEndTime > absoluteUpdateStartTime) {
        const prevChangeStartTime = prevSibling._startTime;
        const prevTLOffset = prevAbsEndTime - (prevChangeStartTime + prevSibling._updateDuration);
        const updatedPrevChangeDuration = round$1(absoluteUpdateStartTime - prevTLOffset - prevChangeStartTime, 12);
        prevSibling._changeDuration = updatedPrevChangeDuration;
        prevSibling._currentTime = updatedPrevChangeDuration;
        prevSibling._isOverlapped = 1;
        if (updatedPrevChangeDuration < minValue) {
          overrideTween(prevSibling);
        }
      }
      const tweenParentTL = tween.parent.parent;
      if (!tweenParentTL || tweenParentTL !== prevParent.parent) {
        let pausePrevParentAnimation = true;
        forEachChildren(prevParent, (t) => {
          if (!t._isOverlapped) pausePrevParentAnimation = false;
        });
        if (pausePrevParentAnimation) {
          const prevParentTL = prevParent.parent;
          if (prevParentTL) {
            let pausePrevParentTL = true;
            forEachChildren(prevParentTL, (a) => {
              if (a !== prevParent) {
                forEachChildren(a, (t) => {
                  if (!t._isOverlapped) pausePrevParentTL = false;
                });
              }
            });
            if (pausePrevParentTL) {
              prevParentTL.cancel();
            }
          } else {
            prevParent.cancel();
          }
        }
      }
    }
  } else if (tweenCompositionType === compositionTypes.blend) {
    const additiveTweenSiblings = getTweenSiblings(tween.target, tween.property, "_add");
    const additiveAnimation = addAdditiveAnimation(lookups._add);
    let lookupTween = additiveTweenSiblings._head;
    if (!lookupTween) {
      lookupTween = { ...tween };
      lookupTween._composition = compositionTypes.replace;
      lookupTween._updateDuration = minValue;
      lookupTween._startTime = 0;
      lookupTween._numbers = cloneArray(tween._fromNumbers);
      lookupTween._number = 0;
      lookupTween._next = null;
      lookupTween._prev = null;
      addChild(additiveTweenSiblings, lookupTween);
      addChild(additiveAnimation, lookupTween);
    }
    const toNumber = tween._toNumber;
    tween._fromNumber = lookupTween._fromNumber - toNumber;
    tween._toNumber = 0;
    tween._numbers = cloneArray(tween._fromNumbers);
    tween._number = 0;
    lookupTween._fromNumber = toNumber;
    if (tween._toNumbers.length) {
      const toNumbers = cloneArray(tween._toNumbers);
      toNumbers.forEach((value, i) => {
        tween._fromNumbers[i] = lookupTween._fromNumbers[i] - value;
        tween._toNumbers[i] = 0;
      });
      lookupTween._fromNumbers = toNumbers;
    }
    addChild(additiveTweenSiblings, tween, null, "_prevAdd", "_nextAdd");
  }
  return tween;
};
const removeTweenSliblings = (tween) => {
  const tweenComposition = tween._composition;
  if (tweenComposition !== compositionTypes.none) {
    const tweenTarget = tween.target;
    const tweenProperty = tween.property;
    const replaceTweensLookup = lookups._rep;
    const replaceTargetProps = replaceTweensLookup.get(tweenTarget);
    const tweenReplaceSiblings = replaceTargetProps[tweenProperty];
    removeChild(tweenReplaceSiblings, tween, "_prevRep", "_nextRep");
    if (tweenComposition === compositionTypes.blend) {
      const addTweensLookup = lookups._add;
      const addTargetProps = addTweensLookup.get(tweenTarget);
      if (!addTargetProps) return;
      const additiveTweenSiblings = addTargetProps[tweenProperty];
      const additiveAnimation = additive.animation;
      removeChild(additiveTweenSiblings, tween, "_prevAdd", "_nextAdd");
      const lookupTween = additiveTweenSiblings._head;
      if (lookupTween && lookupTween === additiveTweenSiblings._tail) {
        removeChild(additiveTweenSiblings, lookupTween, "_prevAdd", "_nextAdd");
        removeChild(additiveAnimation, lookupTween);
        let shouldClean = true;
        for (let prop in addTargetProps) {
          if (addTargetProps[prop]._head) {
            shouldClean = false;
            break;
          }
        }
        if (shouldClean) {
          addTweensLookup.delete(tweenTarget);
        }
      }
    }
  }
  return tween;
};
const removeTargetsFromJSAnimation = (targetsArray, animation, propertyName) => {
  let tweensMatchesTargets = false;
  forEachChildren(animation, (tween) => {
    const tweenTarget = tween.target;
    if (targetsArray.includes(tweenTarget)) {
      const tweenName = tween.property;
      const tweenType = tween._tweenType;
      const normalizePropName = sanitizePropertyName(propertyName, tweenTarget, tweenType);
      if (!normalizePropName || normalizePropName && normalizePropName === tweenName) {
        if (tween.parent._tail === tween && tween._tweenType === tweenTypes.TRANSFORM && tween._prev && tween._prev._tweenType === tweenTypes.TRANSFORM) {
          tween._prev._renderTransforms = 1;
        }
        removeChild(animation, tween);
        removeTweenSliblings(tween);
        tweensMatchesTargets = true;
      }
    }
  }, true);
  return tweensMatchesTargets;
};
const removeTargetsFromRenderable = (targetsArray, renderable, propertyName) => {
  const parent = (
    /** @type {Renderable|typeof engine} **/
    renderable ? renderable : engine
  );
  let removeMatches;
  if (parent._hasChildren) {
    let iterationDuration = 0;
    forEachChildren(parent, (child) => {
      if (!child._hasChildren) {
        removeMatches = removeTargetsFromJSAnimation(
          targetsArray,
          /** @type {JSAnimation} */
          child,
          propertyName
        );
        if (removeMatches && !child._head) {
          child.cancel();
          removeChild(parent, child);
        } else {
          const childTLOffset = child._offset + child._delay;
          const childDur = childTLOffset + child.duration;
          if (childDur > iterationDuration) {
            iterationDuration = childDur;
          }
        }
      }
      if (child._head) {
        removeTargetsFromRenderable(targetsArray, child, propertyName);
      } else {
        child._hasChildren = false;
      }
    }, true);
    if (!isUnd(
      /** @type {Renderable} */
      parent.iterationDuration
    )) {
      parent.iterationDuration = iterationDuration;
    }
  } else {
    removeMatches = removeTargetsFromJSAnimation(
      targetsArray,
      /** @type {JSAnimation} */
      parent,
      propertyName
    );
  }
  if (removeMatches && !parent._head) {
    parent._hasChildren = false;
    if (
      /** @type {Renderable} */
      parent.cancel
    ) parent.cancel();
  }
};
/**
 * Anime.js - timer - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const resetTimerProperties = (timer) => {
  timer.paused = true;
  timer.began = false;
  timer.completed = false;
  return timer;
};
const reviveTimer = (timer) => {
  if (!timer._cancelled) return timer;
  if (timer._hasChildren) {
    forEachChildren(timer, reviveTimer);
  } else {
    forEachChildren(timer, (tween) => {
      if (tween._composition !== compositionTypes.none) {
        composeTween(tween, getTweenSiblings(tween.target, tween.property));
      }
    });
  }
  timer._cancelled = 0;
  return timer;
};
let timerId = 0;
const sortByPriority = (prev, child) => prev._priority > child._priority;
class Timer extends Clock {
  /**
   * @param {TimerParams} [parameters]
   * @param {Timeline} [parent]
   * @param {Number} [parentPosition]
   */
  constructor(parameters = {}, parent = null, parentPosition = 0) {
    super(0);
    ++timerId;
    const {
      id,
      delay,
      duration,
      reversed,
      alternate,
      loop,
      loopDelay,
      autoplay,
      frameRate,
      playbackRate,
      priority,
      onComplete,
      onLoop,
      onPause,
      onBegin,
      onBeforeUpdate,
      onUpdate
    } = parameters;
    const timerInitTime = parent ? 0 : engine._lastTickTime;
    const timerDefaults = parent ? parent.defaults : globals.defaults;
    const timerDelay = (
      /** @type {Number} */
      isFnc(delay) || isUnd(delay) ? timerDefaults.delay : +delay
    );
    const timerDuration = isFnc(duration) || isUnd(duration) ? Infinity : +duration;
    const timerLoop = setValue(loop, timerDefaults.loop);
    const timerLoopDelay = setValue(loopDelay, timerDefaults.loopDelay);
    let timerIterationCount = timerLoop === true || timerLoop === Infinity || /** @type {Number} */
    timerLoop < 0 ? Infinity : (
      /** @type {Number} */
      timerLoop + 1
    );
    let offsetPosition = 0;
    if (parent) {
      offsetPosition = parentPosition;
    } else {
      if (!engine.reqId) engine.requestTick(now());
      offsetPosition = (engine._lastTickTime - engine._startTime) * globals.timeScale;
    }
    this.id = !isUnd(id) ? id : timerId;
    this.parent = parent;
    this.duration = clampInfinity((timerDuration + timerLoopDelay) * timerIterationCount - timerLoopDelay) || minValue;
    this.backwards = false;
    this.paused = true;
    this.began = false;
    this.completed = false;
    this.onBegin = onBegin || timerDefaults.onBegin;
    this.onBeforeUpdate = onBeforeUpdate || timerDefaults.onBeforeUpdate;
    this.onUpdate = onUpdate || timerDefaults.onUpdate;
    this.onLoop = onLoop || timerDefaults.onLoop;
    this.onPause = onPause || timerDefaults.onPause;
    this.onComplete = onComplete || timerDefaults.onComplete;
    this.iterationDuration = timerDuration;
    this.iterationCount = timerIterationCount;
    this._autoplay = parent ? false : setValue(autoplay, timerDefaults.autoplay);
    this._offset = offsetPosition;
    this._delay = timerDelay;
    this._loopDelay = timerLoopDelay;
    this._iterationTime = 0;
    this._currentIteration = 0;
    this._resolve = noop;
    this._running = false;
    this._reversed = +setValue(reversed, timerDefaults.reversed);
    this._reverse = this._reversed;
    this._cancelled = 0;
    this._alternate = setValue(alternate, timerDefaults.alternate);
    this._prev = null;
    this._next = null;
    this._lastTickTime = timerInitTime;
    this._startTime = timerInitTime;
    this._lastTime = timerInitTime;
    this._fps = setValue(frameRate, timerDefaults.frameRate);
    this._speed = setValue(playbackRate, timerDefaults.playbackRate);
    this._priority = +setValue(priority, 1);
  }
  get cancelled() {
    return !!this._cancelled;
  }
  set cancelled(cancelled) {
    cancelled ? this.cancel() : this.reset(true).play();
  }
  get currentTime() {
    return clamp$1(round$1(this._currentTime, globals.precision), -this._delay, this.duration);
  }
  set currentTime(time) {
    const paused = this.paused;
    this.pause().seek(+time);
    if (!paused) this.resume();
  }
  get iterationCurrentTime() {
    return clamp$1(round$1(this._iterationTime, globals.precision), 0, this.iterationDuration);
  }
  set iterationCurrentTime(time) {
    this.currentTime = this.iterationDuration * this._currentIteration + time;
  }
  get progress() {
    return clamp$1(round$1(this._currentTime / this.duration, 10), 0, 1);
  }
  set progress(progress) {
    this.currentTime = this.duration * progress;
  }
  get iterationProgress() {
    return clamp$1(round$1(this._iterationTime / this.iterationDuration, 10), 0, 1);
  }
  set iterationProgress(progress) {
    const iterationDuration = this.iterationDuration;
    this.currentTime = iterationDuration * this._currentIteration + iterationDuration * progress;
  }
  get currentIteration() {
    return this._currentIteration;
  }
  set currentIteration(iterationCount) {
    this.currentTime = this.iterationDuration * clamp$1(+iterationCount, 0, this.iterationCount - 1);
  }
  get reversed() {
    return !!this._reversed;
  }
  set reversed(reverse) {
    reverse ? this.reverse() : this.play();
  }
  get speed() {
    return super.speed;
  }
  set speed(playbackRate) {
    super.speed = playbackRate;
    this.resetTime();
  }
  /**
   * @param  {Boolean} [softReset]
   * @return {this}
   */
  reset(softReset = false) {
    reviveTimer(this);
    if (this._reversed && !this._reverse) this.reversed = false;
    this._iterationTime = this.iterationDuration;
    tick(this, 0, 1, ~~softReset, tickModes.FORCE);
    resetTimerProperties(this);
    if (this._hasChildren) {
      forEachChildren(this, resetTimerProperties);
    }
    return this;
  }
  /**
   * @param  {Boolean} internalRender
   * @return {this}
   */
  init(internalRender = false) {
    this.fps = this._fps;
    this.speed = this._speed;
    if (!internalRender && this._hasChildren) {
      tick(this, this.duration, 1, ~~internalRender, tickModes.FORCE);
    }
    this.reset(internalRender);
    const autoplay = this._autoplay;
    if (autoplay === true) {
      this.resume();
    } else if (autoplay && !isUnd(
      /** @type {ScrollObserver} */
      autoplay.linked
    )) {
      autoplay.link(this);
    }
    return this;
  }
  /** @return {this} */
  resetTime() {
    const timeScale = 1 / (this._speed * engine._speed);
    this._startTime = now() - (this._currentTime + this._delay) * timeScale;
    return this;
  }
  /** @return {this} */
  pause() {
    if (this.paused) return this;
    this.paused = true;
    this.onPause(this);
    return this;
  }
  /** @return {this} */
  resume() {
    if (!this.paused) return this;
    this.paused = false;
    if (this.duration <= minValue && !this._hasChildren) {
      tick(this, minValue, 0, 0, tickModes.FORCE);
    } else {
      if (!this._running) {
        addChild(engine, this, sortByPriority);
        engine._hasChildren = true;
        this._running = true;
      }
      this.resetTime();
      this._startTime -= 12;
      engine.wake();
    }
    return this;
  }
  /** @return {this} */
  restart() {
    return this.reset().resume();
  }
  /**
   * @param  {Number} time
   * @param  {Boolean|Number} [muteCallbacks]
   * @param  {Boolean|Number} [internalRender]
   * @return {this}
   */
  seek(time, muteCallbacks = 0, internalRender = 0) {
    reviveTimer(this);
    this.completed = false;
    const isPaused = this.paused;
    this.paused = true;
    tick(this, time + this._delay, ~~muteCallbacks, ~~internalRender, tickModes.AUTO);
    return isPaused ? this : this.resume();
  }
  /** @return {this} */
  alternate() {
    const reversed = this._reversed;
    const count = this.iterationCount;
    const duration = this.iterationDuration;
    const iterations = count === Infinity ? floor(maxValue / duration) : count;
    this._reversed = +(this._alternate && !(iterations % 2) ? reversed : !reversed);
    if (count === Infinity) {
      this.iterationProgress = this._reversed ? 1 - this.iterationProgress : this.iterationProgress;
    } else {
      this.seek(duration * iterations - this._currentTime);
    }
    this.resetTime();
    return this;
  }
  /** @return {this} */
  play() {
    if (this._reversed) this.alternate();
    return this.resume();
  }
  /** @return {this} */
  reverse() {
    if (!this._reversed) this.alternate();
    return this.resume();
  }
  // TODO: Move all the animation / tweens / children related code to Animation / Timeline
  /** @return {this} */
  cancel() {
    if (this._hasChildren) {
      forEachChildren(this, (child) => child.cancel(), true);
    } else {
      forEachChildren(this, removeTweenSliblings);
    }
    this._cancelled = 1;
    return this.pause();
  }
  /**
   * @param  {Number} newDuration
   * @return {this}
   */
  stretch(newDuration) {
    const currentDuration = this.duration;
    const normlizedDuration = normalizeTime(newDuration);
    if (currentDuration === normlizedDuration) return this;
    const timeScale = newDuration / currentDuration;
    const isSetter = newDuration <= minValue;
    this.duration = isSetter ? minValue : normlizedDuration;
    this.iterationDuration = isSetter ? minValue : normalizeTime(this.iterationDuration * timeScale);
    this._offset *= timeScale;
    this._delay *= timeScale;
    this._loopDelay *= timeScale;
    return this;
  }
  /**
    * Cancels the timer by seeking it back to 0 and reverting the attached scroller if necessary
    * @return {this}
    */
  revert() {
    tick(this, 0, 1, 0, tickModes.AUTO);
    const ap = (
      /** @type {ScrollObserver} */
      this._autoplay
    );
    if (ap && ap.linked && ap.linked === this) ap.revert();
    return this.cancel();
  }
  /**
    * Imediatly completes the timer, cancels it and triggers the onComplete callback
    * @param  {Boolean|Number} [muteCallbacks]
    * @return {this}
    */
  complete(muteCallbacks = 0) {
    return this.seek(this.duration, muteCallbacks).cancel();
  }
  /**
   * @typedef {this & {then: null}} ResolvedTimer
   */
  /**
   * @param  {Callback<ResolvedTimer>} [callback]
   * @return Promise<this>
   */
  then(callback = noop) {
    const then = this.then;
    const onResolve = () => {
      this.then = null;
      callback(
        /** @type {ResolvedTimer} */
        this
      );
      this.then = then;
      this._resolve = noop;
    };
    return new Promise((r) => {
      this._resolve = () => r(onResolve());
      if (this.completed) this._resolve();
      return this;
    });
  }
}
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
function getNodeList(v) {
  const n = isStr(v) ? scope.root.querySelectorAll(v) : v;
  if (n instanceof NodeList || n instanceof HTMLCollection) return n;
}
function parseTargets(targets) {
  if (isNil(targets)) return (
    /** @type {TargetsArray} */
    []
  );
  if (!isBrowser) return (
    /** @type {JSTargetsArray} */
    isArr(targets) && targets.flat(Infinity) || [targets]
  );
  if (isArr(targets)) {
    const flattened = targets.flat(Infinity);
    const parsed = [];
    for (let i = 0, l = flattened.length; i < l; i++) {
      const item = flattened[i];
      if (!isNil(item)) {
        const nodeList2 = getNodeList(item);
        if (nodeList2) {
          for (let j = 0, jl = nodeList2.length; j < jl; j++) {
            const subItem = nodeList2[j];
            if (!isNil(subItem)) {
              let isDuplicate = false;
              for (let k = 0, kl = parsed.length; k < kl; k++) {
                if (parsed[k] === subItem) {
                  isDuplicate = true;
                  break;
                }
              }
              if (!isDuplicate) {
                parsed.push(subItem);
              }
            }
          }
        } else {
          let isDuplicate = false;
          for (let j = 0, jl = parsed.length; j < jl; j++) {
            if (parsed[j] === item) {
              isDuplicate = true;
              break;
            }
          }
          if (!isDuplicate) {
            parsed.push(item);
          }
        }
      }
    }
    return parsed;
  }
  const nodeList = getNodeList(targets);
  if (nodeList) return (
    /** @type {DOMTargetsArray} */
    Array.from(nodeList)
  );
  return (
    /** @type {TargetsArray} */
    [targets]
  );
}
function registerTargets(targets) {
  const parsedTargetsArray = parseTargets(targets);
  const parsedTargetsLength = parsedTargetsArray.length;
  for (let i = 0; i < parsedTargetsLength; i++) {
    const target = parsedTargetsArray[i];
    if (!target[isRegisteredTargetSymbol]) {
      target[isRegisteredTargetSymbol] = true;
      const isSvgType = isSvg(target);
      const isDom = (
        /** @type {DOMTarget} */
        target.nodeType || isSvgType
      );
      if (isDom) {
        target[isDomSymbol] = true;
        target[isSvgSymbol] = isSvgType;
        target[transformsSymbol] = {};
      }
    }
  }
  return parsedTargetsArray;
}
/**
 * Anime.js - core - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const angleUnitsMap = { "deg": 1, "rad": 180 / PI, "turn": 360 };
const convertedValuesCache = {};
const convertValueUnit = (el, decomposedValue, unit, force = false) => {
  const currentUnit = decomposedValue.u;
  const currentNumber = decomposedValue.n;
  if (decomposedValue.t === valueTypes.UNIT && currentUnit === unit) {
    return decomposedValue;
  }
  const cachedKey = currentNumber + currentUnit + unit;
  const cached = convertedValuesCache[cachedKey];
  if (!isUnd(cached) && !force) {
    decomposedValue.n = cached;
  } else {
    let convertedValue;
    if (currentUnit in angleUnitsMap) {
      convertedValue = currentNumber * angleUnitsMap[currentUnit] / angleUnitsMap[unit];
    } else {
      const baseline = 100;
      const tempEl = (
        /** @type {DOMTarget} */
        el.cloneNode()
      );
      const parentNode = el.parentNode;
      const parentEl = parentNode && parentNode !== doc ? parentNode : doc.body;
      parentEl.appendChild(tempEl);
      const elStyle = tempEl.style;
      elStyle.width = baseline + currentUnit;
      const currentUnitWidth = (
        /** @type {HTMLElement} */
        tempEl.offsetWidth || baseline
      );
      elStyle.width = baseline + unit;
      const newUnitWidth = (
        /** @type {HTMLElement} */
        tempEl.offsetWidth || baseline
      );
      const factor = currentUnitWidth / newUnitWidth;
      parentEl.removeChild(tempEl);
      convertedValue = factor * currentNumber;
    }
    decomposedValue.n = convertedValue;
    convertedValuesCache[cachedKey] = convertedValue;
  }
  decomposedValue.t === valueTypes.UNIT;
  decomposedValue.u = unit;
  return decomposedValue;
};
/**
 * Anime.js - easings - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const none = (t) => t;
/**
 * Anime.js - easings - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const easeInPower = (p = 1.68) => (t) => pow(t, +p);
const easeTypes = {
  in: (easeIn) => (t) => easeIn(t),
  out: (easeIn) => (t) => 1 - easeIn(1 - t),
  inOut: (easeIn) => (t) => t < 0.5 ? easeIn(t * 2) / 2 : 1 - easeIn(t * -2 + 2) / 2,
  outIn: (easeIn) => (t) => t < 0.5 ? (1 - easeIn(1 - t * 2)) / 2 : (easeIn(t * 2 - 1) + 1) / 2
};
const halfPI = PI / 2;
const doublePI = PI * 2;
const easeInFunctions = {
  [emptyString]: easeInPower,
  Quad: easeInPower(2),
  Cubic: easeInPower(3),
  Quart: easeInPower(4),
  Quint: easeInPower(5),
  /** @type {EasingFunction} */
  Sine: (t) => 1 - cos(t * halfPI),
  /** @type {EasingFunction} */
  Circ: (t) => 1 - sqrt(1 - t * t),
  /** @type {EasingFunction} */
  Expo: (t) => t ? pow(2, 10 * t - 10) : 0,
  /** @type {EasingFunction} */
  Bounce: (t) => {
    let pow2, b = 4;
    while (t < ((pow2 = pow(2, --b)) - 1) / 11) ;
    return 1 / pow(4, 3 - b) - 7.5625 * pow((pow2 * 3 - 2) / 22 - t, 2);
  },
  /** @type {BackEasing} */
  Back: (overshoot = 1.7) => (t) => (+overshoot + 1) * t * t * t - +overshoot * t * t,
  /** @type {ElasticEasing} */
  Elastic: (amplitude = 1, period = 0.3) => {
    const a = clamp$1(+amplitude, 1, 10);
    const p = clamp$1(+period, minValue, 2);
    const s = p / doublePI * asin(1 / a);
    const e = doublePI / p;
    return (t) => t === 0 || t === 1 ? t : -a * pow(2, -10 * (1 - t)) * sin((1 - t - s) * e);
  }
};
const eases = /* @__PURE__ */ (() => {
  const list2 = { linear: none, none };
  for (let type in easeTypes) {
    for (let name in easeInFunctions) {
      const easeIn = easeInFunctions[name];
      const easeType = easeTypes[type];
      list2[type + name] = /** @type {EasingFunctionWithParams|EasingFunction} */
      name === emptyString || name === "Back" || name === "Elastic" ? (a, b) => easeType(
        /** @type {EasingFunctionWithParams} */
        easeIn(a, b)
      ) : easeType(
        /** @type {EasingFunction} */
        easeIn
      );
    }
  }
  return (
    /** @type {EasesFunctions} */
    list2
  );
})();
const easesLookups = { linear: none, none };
const parseEaseString = (string) => {
  if (easesLookups[string]) return easesLookups[string];
  if (string.indexOf("(") <= -1) {
    const hasParams = easeTypes[string] || string.includes("Back") || string.includes("Elastic");
    const parsedFn = (
      /** @type {EasingFunction} */
      hasParams ? (
        /** @type {EasingFunctionWithParams} */
        eases[string]()
      ) : eases[string]
    );
    return parsedFn ? easesLookups[string] = parsedFn : none;
  } else {
    const split = string.slice(0, -1).split("(");
    const parsedFn = (
      /** @type {EasingFunctionWithParams} */
      eases[split[0]]
    );
    return parsedFn ? easesLookups[string] = parsedFn(...split[1].split(",")) : none;
  }
};
const deprecated = ["steps(", "irregular(", "linear(", "cubicBezier("];
const parseEase = (ease) => {
  if (isStr(ease)) {
    for (let i = 0, l = deprecated.length; i < l; i++) {
      if (stringStartsWith(ease, deprecated[i])) {
        console.warn(`String syntax for \`ease: "${ease}"\` has been removed from the core and replaced by importing and passing the easing function directly: \`ease: ${ease}\``);
        return none;
      }
    }
  }
  const easeFunc = isFnc(ease) ? ease : isStr(ease) ? parseEaseString(
    /** @type {String} */
    ease
  ) : none;
  return easeFunc;
};
/**
 * Anime.js - animation - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const fromTargetObject = createDecomposedValueTargetObject();
const toTargetObject = createDecomposedValueTargetObject();
const inlineStylesStore = {};
const toFunctionStore = { func: null };
const fromFunctionStore = { func: null };
const keyframesTargetArray = [null];
const fastSetValuesArray = [null, null];
const keyObjectTarget = { to: null };
let tweenId = 0;
let JSAnimationId = 0;
let keyframes;
let key;
const generateKeyframes = (keyframes2, parameters) => {
  const properties = {};
  if (isArr(keyframes2)) {
    const propertyNames = [].concat(.../** @type {DurationKeyframes} */
    keyframes2.map((key2) => Object.keys(key2))).filter(isKey);
    for (let i = 0, l = propertyNames.length; i < l; i++) {
      const propName = propertyNames[i];
      const propArray = (
        /** @type {DurationKeyframes} */
        keyframes2.map((key2) => {
          const newKey = {};
          for (let p in key2) {
            const keyValue = (
              /** @type {TweenPropValue} */
              key2[p]
            );
            if (isKey(p)) {
              if (p === propName) {
                newKey.to = keyValue;
              }
            } else {
              newKey[p] = keyValue;
            }
          }
          return newKey;
        })
      );
      properties[propName] = /** @type {ArraySyntaxValue} */
      propArray;
    }
  } else {
    const totalDuration = (
      /** @type {Number} */
      setValue(parameters.duration, globals.defaults.duration)
    );
    const keys = Object.keys(keyframes2).map((key2) => {
      return { o: parseFloat(key2) / 100, p: keyframes2[key2] };
    }).sort((a, b) => a.o - b.o);
    keys.forEach((key2) => {
      const offset = key2.o;
      const prop = key2.p;
      for (let name in prop) {
        if (isKey(name)) {
          let propArray = (
            /** @type {Array} */
            properties[name]
          );
          if (!propArray) propArray = properties[name] = [];
          const duration = offset * totalDuration;
          let length = propArray.length;
          let prevKey = propArray[length - 1];
          const keyObj = { to: prop[name] };
          let durProgress = 0;
          for (let i = 0; i < length; i++) {
            durProgress += propArray[i].duration;
          }
          if (length === 1) {
            keyObj.from = prevKey.to;
          }
          if (prop.ease) {
            keyObj.ease = prop.ease;
          }
          keyObj.duration = duration - (length ? durProgress : 0);
          propArray.push(keyObj);
        }
      }
      return key2;
    });
    for (let name in properties) {
      const propArray = (
        /** @type {Array} */
        properties[name]
      );
      let prevEase;
      for (let i = 0, l = propArray.length; i < l; i++) {
        const prop = propArray[i];
        const currentEase = prop.ease;
        prop.ease = prevEase ? prevEase : void 0;
        prevEase = currentEase;
      }
      if (!propArray[0].duration) {
        propArray.shift();
      }
    }
  }
  return properties;
};
class JSAnimation extends Timer {
  /**
   * @param {TargetsParam} targets
   * @param {AnimationParams} parameters
   * @param {Timeline} [parent]
   * @param {Number} [parentPosition]
   * @param {Boolean} [fastSet=false]
   * @param {Number} [index=0]
   * @param {TargetsArray} [allTargets]
   */
  constructor(targets, parameters, parent, parentPosition, fastSet = false, index = 0, allTargets) {
    super(
      /** @type {TimerParams & AnimationParams} */
      parameters,
      parent,
      parentPosition
    );
    this._head;
    this._tail;
    ++JSAnimationId;
    const parsedTargets = registerTargets(targets);
    const targetsLength = parsedTargets.length;
    const kfParams = (
      /** @type {AnimationParams} */
      parameters.keyframes
    );
    const params = (
      /** @type {AnimationParams} */
      kfParams ? mergeObjects(generateKeyframes(
        /** @type {DurationKeyframes} */
        kfParams,
        parameters
      ), parameters) : parameters
    );
    const {
      id,
      delay,
      duration,
      ease,
      playbackEase,
      modifier,
      composition,
      onRender
    } = params;
    const animDefaults = parent ? parent.defaults : globals.defaults;
    const animEase = setValue(ease, animDefaults.ease);
    const animPlaybackEase = setValue(playbackEase, animDefaults.playbackEase);
    const parsedAnimPlaybackEase = animPlaybackEase ? parseEase(animPlaybackEase) : null;
    const hasSpring = !isUnd(
      /** @type {Spring} */
      animEase.ease
    );
    const tEasing = hasSpring ? (
      /** @type {Spring} */
      animEase.ease
    ) : setValue(ease, parsedAnimPlaybackEase ? "linear" : animDefaults.ease);
    const tDuration = hasSpring ? (
      /** @type {Spring} */
      animEase.settlingDuration
    ) : setValue(duration, animDefaults.duration);
    const tDelay = setValue(delay, animDefaults.delay);
    const tModifier = modifier || animDefaults.modifier;
    const tComposition = isUnd(composition) && targetsLength >= K ? compositionTypes.none : !isUnd(composition) ? composition : animDefaults.composition;
    const absoluteOffsetTime = this._offset + (parent ? parent._offset : 0);
    if (hasSpring) animEase.parent = this;
    let iterationDuration = NaN;
    let iterationDelay = NaN;
    let animationAnimationLength = 0;
    let shouldTriggerRender = 0;
    for (let targetIndex = 0; targetIndex < targetsLength; targetIndex++) {
      const target = parsedTargets[targetIndex];
      const ti = index || targetIndex;
      const tl = allTargets || parsedTargets;
      let lastTransformGroupIndex = NaN;
      let lastTransformGroupLength = NaN;
      for (let p in params) {
        if (isKey(p)) {
          const tweenType = getTweenType(target, p);
          const adapterProp = resolveAdapterEntry(target, p);
          const propName = sanitizePropertyName(p, target, tweenType);
          let propValue = params[p];
          const isPropValueArray = isArr(propValue);
          if (fastSet && !isPropValueArray) {
            fastSetValuesArray[0] = propValue;
            fastSetValuesArray[1] = propValue;
            propValue = fastSetValuesArray;
          }
          if (isPropValueArray) {
            const arrayLength = (
              /** @type {Array} */
              propValue.length
            );
            const isNotObjectValue = !isObj(propValue[0]);
            if (arrayLength === 2 && isNotObjectValue) {
              keyObjectTarget.to = /** @type {TweenParamValue} */
              /** @type {unknown} */
              propValue;
              keyframesTargetArray[0] = keyObjectTarget;
              keyframes = keyframesTargetArray;
            } else if (arrayLength > 2 && isNotObjectValue) {
              keyframes = [];
              propValue.forEach((v, i) => {
                if (!i) {
                  fastSetValuesArray[0] = v;
                } else if (i === 1) {
                  fastSetValuesArray[1] = v;
                  keyframes.push(fastSetValuesArray);
                } else {
                  keyframes.push(v);
                }
              });
            } else {
              keyframes = /** @type {Array.<TweenKeyValue>} */
              propValue;
            }
          } else {
            keyframesTargetArray[0] = propValue;
            keyframes = keyframesTargetArray;
          }
          let siblings = null;
          let prevTween = null;
          let firstTweenChangeStartTime = NaN;
          let lastTweenChangeEndTime = 0;
          let tweenIndex = 0;
          for (let l = keyframes.length; tweenIndex < l; tweenIndex++) {
            const keyframe = keyframes[tweenIndex];
            if (isObj(keyframe)) {
              key = keyframe;
            } else {
              keyObjectTarget.to = /** @type {TweenParamValue} */
              keyframe;
              key = keyObjectTarget;
            }
            toFunctionStore.func = null;
            fromFunctionStore.func = null;
            const computedComposition = getFunctionValue(setValue(key.composition, tComposition), target, ti, tl, null, null);
            const tweenComposition = isNum(computedComposition) ? computedComposition : compositionTypes[computedComposition];
            if (!siblings && tweenComposition !== compositionTypes.none) siblings = getTweenSiblings(target, propName);
            const tailTween = siblings ? siblings._tail : null;
            const prevSiblingTween = parent && tailTween && tailTween.parent.parent === parent ? tailTween : prevTween;
            const computedToValue = getFunctionValue(key.to, target, ti, tl, toFunctionStore, prevSiblingTween);
            let tweenToValue;
            if (isObj(computedToValue) && !isUnd(computedToValue.to)) {
              key = computedToValue;
              tweenToValue = computedToValue.to;
            } else {
              tweenToValue = computedToValue;
            }
            const tweenFromValue = getFunctionValue(key.from, target, ti, tl, fromFunctionStore, prevSiblingTween);
            const easeToParse = key.ease || tEasing;
            const easeFunctionResult = getFunctionValue(easeToParse, target, ti, tl, null, prevSiblingTween);
            const keyEasing = isFnc(easeFunctionResult) || isStr(easeFunctionResult) ? easeFunctionResult : easeToParse;
            const hasSpring2 = !isUnd(keyEasing) && !isUnd(
              /** @type {Spring} */
              keyEasing.ease
            );
            const tweenEasing = hasSpring2 ? (
              /** @type {Spring} */
              keyEasing.ease
            ) : keyEasing;
            const tweenDuration = hasSpring2 ? (
              /** @type {Spring} */
              keyEasing.settlingDuration
            ) : getFunctionValue(setValue(key.duration, l > 1 ? getFunctionValue(tDuration, target, ti, tl, null, prevSiblingTween) / l : tDuration), target, ti, tl, null, prevSiblingTween);
            const tweenDelay = getFunctionValue(setValue(key.delay, !tweenIndex ? tDelay : 0), target, ti, tl, null, prevSiblingTween);
            const tweenModifier = key.modifier || tModifier;
            const hasFromvalue = !isUnd(tweenFromValue);
            const hasToValue = !isUnd(tweenToValue);
            const isFromToArray = isArr(tweenToValue);
            const isFromToValue = isFromToArray || hasFromvalue && hasToValue;
            const tweenUpdateStartLocal = prevTween ? lastTweenChangeEndTime : 0;
            const tweenStartTime = prevTween ? lastTweenChangeEndTime + tweenDelay : tweenDelay;
            const absoluteStartTime = round$1(absoluteOffsetTime + tweenStartTime, 12);
            const absoluteUpdateStartTime = round$1(absoluteOffsetTime + tweenUpdateStartLocal, 12);
            if (!shouldTriggerRender && (hasFromvalue || isFromToArray)) shouldTriggerRender = 1;
            let prevSibling = prevTween;
            if (tweenComposition !== compositionTypes.none) {
              let nextSibling = siblings._head;
              while (nextSibling && nextSibling._absoluteStartTime <= absoluteStartTime) {
                if (!nextSibling._isOverridden) prevSibling = nextSibling;
                nextSibling = nextSibling._nextRep;
                if (nextSibling && nextSibling._absoluteStartTime >= absoluteStartTime) {
                  while (nextSibling) {
                    overrideTween(nextSibling);
                    nextSibling = nextSibling._nextRep;
                  }
                }
              }
            }
            if (isFromToValue) {
              decomposeRawValue(isFromToArray ? getFunctionValue(tweenToValue[0], target, ti, tl, fromFunctionStore, prevSiblingTween) : tweenFromValue, fromTargetObject);
              decomposeRawValue(isFromToArray ? getFunctionValue(tweenToValue[1], target, ti, tl, toFunctionStore, prevSiblingTween) : tweenToValue, toTargetObject);
              const originalValue = getOriginalAnimatableValue(target, propName, tweenType, inlineStylesStore);
              if (fromTargetObject.t === valueTypes.NUMBER) {
                if (prevSibling) {
                  if (prevSibling._valueType === valueTypes.UNIT) {
                    fromTargetObject.t = valueTypes.UNIT;
                    fromTargetObject.u = prevSibling._unit;
                  }
                } else {
                  decomposeRawValue(
                    originalValue,
                    decomposedOriginalValue
                  );
                  if (decomposedOriginalValue.t === valueTypes.UNIT) {
                    fromTargetObject.t = valueTypes.UNIT;
                    fromTargetObject.u = decomposedOriginalValue.u;
                  }
                }
              }
            } else {
              if (hasToValue) {
                decomposeRawValue(tweenToValue, toTargetObject);
              } else {
                if (prevTween) {
                  decomposeTweenValue(prevTween, toTargetObject);
                } else {
                  decomposeRawValue(parent && prevSibling && prevSibling.parent.parent === parent ? prevSibling._value : getOriginalAnimatableValue(target, propName, tweenType, inlineStylesStore), toTargetObject);
                }
              }
              if (hasFromvalue) {
                decomposeRawValue(tweenFromValue, fromTargetObject);
              } else {
                if (prevTween) {
                  decomposeTweenValue(prevTween, fromTargetObject);
                } else {
                  decomposeRawValue(parent && prevSibling && prevSibling.parent.parent === parent ? prevSibling._value : getOriginalAnimatableValue(target, propName, tweenType, inlineStylesStore), fromTargetObject);
                }
              }
            }
            if (fromTargetObject.o) {
              fromTargetObject.n = getRelativeValue(
                !prevSibling ? decomposeRawValue(
                  getOriginalAnimatableValue(target, propName, tweenType, inlineStylesStore),
                  decomposedOriginalValue
                ).n : prevSibling._toNumber,
                fromTargetObject.n,
                fromTargetObject.o
              );
            }
            if (toTargetObject.o) {
              toTargetObject.n = getRelativeValue(fromTargetObject.n, toTargetObject.n, toTargetObject.o);
            }
            if (fromTargetObject.t !== toTargetObject.t) {
              if (fromTargetObject.t === valueTypes.COMPLEX || toTargetObject.t === valueTypes.COMPLEX) {
                const complexValue = fromTargetObject.t === valueTypes.COMPLEX ? fromTargetObject : toTargetObject;
                const notComplexValue = fromTargetObject.t === valueTypes.COMPLEX ? toTargetObject : fromTargetObject;
                notComplexValue.t = valueTypes.COMPLEX;
                notComplexValue.s = cloneArray(complexValue.s);
                notComplexValue.d = complexValue.d.map(() => notComplexValue.n);
              } else if (fromTargetObject.t === valueTypes.UNIT || toTargetObject.t === valueTypes.UNIT) {
                const unitValue = fromTargetObject.t === valueTypes.UNIT ? fromTargetObject : toTargetObject;
                const notUnitValue = fromTargetObject.t === valueTypes.UNIT ? toTargetObject : fromTargetObject;
                notUnitValue.t = valueTypes.UNIT;
                notUnitValue.u = unitValue.u;
              } else if (fromTargetObject.t === valueTypes.COLOR || toTargetObject.t === valueTypes.COLOR) {
                const colorValue = fromTargetObject.t === valueTypes.COLOR ? fromTargetObject : toTargetObject;
                const notColorValue = fromTargetObject.t === valueTypes.COLOR ? toTargetObject : fromTargetObject;
                notColorValue.t = valueTypes.COLOR;
                notColorValue.d = colorValue.d.map(() => 0);
              }
            }
            if (fromTargetObject.u !== toTargetObject.u) {
              let valueToConvert = toTargetObject.u ? fromTargetObject : toTargetObject;
              valueToConvert = convertValueUnit(
                /** @type {DOMTarget} */
                target,
                valueToConvert,
                toTargetObject.u ? toTargetObject.u : fromTargetObject.u,
                false
              );
            }
            if (toTargetObject.d && fromTargetObject.d && toTargetObject.d.length !== fromTargetObject.d.length) {
              const longestValue = fromTargetObject.d.length > toTargetObject.d.length ? fromTargetObject : toTargetObject;
              const shortestValue = longestValue === fromTargetObject ? toTargetObject : fromTargetObject;
              shortestValue.d = longestValue.d.map((_, i) => isUnd(shortestValue.d[i]) ? 0 : shortestValue.d[i]);
              shortestValue.s = cloneArray(longestValue.s);
            }
            const tweenUpdateDuration = round$1(+tweenDuration || minValue, 12);
            let inlineValue = inlineStylesStore[propName];
            if (!isNil(inlineValue)) inlineStylesStore[propName] = null;
            const tweenSetter = adapterProp ? adapterProp.set : null;
            lastTweenChangeEndTime = round$1(tweenStartTime + tweenUpdateDuration, 12);
            const fromD = fromTargetObject.d;
            const toD = toTargetObject.d;
            const toS = toTargetObject.s;
            const tween = {
              parent: this,
              id: tweenId++,
              property: propName,
              target,
              _value: null,
              _toFunc: toFunctionStore.func,
              _fromFunc: fromFunctionStore.func,
              _ease: parseEase(tweenEasing),
              _fromNumbers: fromD ? cloneArray(fromD) : emptyArray,
              _toNumbers: toD ? cloneArray(toD) : emptyArray,
              _strings: toS ? cloneArray(toS) : emptyArray,
              _fromNumber: fromTargetObject.n,
              _toNumber: toTargetObject.n,
              _numbers: fromD ? cloneArray(fromD) : emptyArray,
              // For additive tween and animatables
              _number: fromTargetObject.n,
              // For additive tween and animatables
              _unit: toTargetObject.u,
              _modifier: tweenModifier,
              _currentTime: 0,
              _startTime: tweenStartTime,
              _delay: +tweenDelay,
              _updateDuration: tweenUpdateDuration,
              _changeDuration: tweenUpdateDuration,
              _absoluteStartTime: absoluteStartTime,
              _absoluteUpdateStartTime: absoluteUpdateStartTime,
              _absoluteEndTime: round$1(absoluteOffsetTime + lastTweenChangeEndTime, 12),
              _hasFromValue: hasFromvalue || isFromToArray ? 1 : 0,
              // NOTE: Investigate bit packing to stores ENUM / BOOL
              _tweenType: tweenType,
              _setter: tweenSetter,
              _valueType: toTargetObject.t,
              _composition: tweenComposition,
              _isOverlapped: 0,
              _isOverridden: 0,
              _renderTransforms: 0,
              _inlineValue: inlineValue,
              _prevRep: null,
              // For replaced tween
              _nextRep: null,
              // For replaced tween
              _prevAdd: null,
              // For additive tween
              _nextAdd: null,
              // For additive tween
              _prev: null,
              _next: null
            };
            if (tweenComposition !== compositionTypes.none) {
              composeTween(tween, siblings);
            }
            const vt = tween._valueType;
            if (vt === valueTypes.COMPLEX) {
              tween._value = composeComplexValue(tween, 1, -1);
            } else if (vt === valueTypes.UNIT) {
              tween._value = `${tweenModifier(tween._toNumber)}${tween._unit}`;
            } else if (vt === valueTypes.COLOR) {
              const d = toTargetObject.d;
              tween._value = `rgba(${round$1(d[0], 0)},${round$1(d[1], 0)},${round$1(d[2], 0)},${d[3]})`;
            } else {
              tween._value = tweenModifier(tween._toNumber);
            }
            if (isNaN(firstTweenChangeStartTime)) {
              firstTweenChangeStartTime = tween._startTime;
            }
            prevTween = tween;
            animationAnimationLength++;
            addChild(this, tween);
          }
          if (isNaN(iterationDelay) || firstTweenChangeStartTime < iterationDelay) {
            iterationDelay = firstTweenChangeStartTime;
          }
          if (isNaN(iterationDuration) || lastTweenChangeEndTime > iterationDuration) {
            iterationDuration = lastTweenChangeEndTime;
          }
          if (tweenType === tweenTypes.TRANSFORM) {
            lastTransformGroupIndex = animationAnimationLength - tweenIndex;
            lastTransformGroupLength = animationAnimationLength;
          }
        }
      }
      if (!isNaN(lastTransformGroupIndex)) {
        let i = 0;
        forEachChildren(this, (tween) => {
          if (i >= lastTransformGroupIndex && i < lastTransformGroupLength) {
            tween._renderTransforms = 1;
            if (tween._composition === compositionTypes.blend) {
              forEachChildren(additive.animation, (additiveTween) => {
                if (additiveTween.id === tween.id) {
                  additiveTween._renderTransforms = 1;
                }
              });
            }
          }
          i++;
        });
      }
    }
    if (!targetsLength) {
      console.warn(`No target found. Make sure the element you're trying to animate is accessible before creating your animation.`);
    }
    if (iterationDelay) {
      forEachChildren(this, (tween) => {
        if (!(tween._startTime - tween._delay)) {
          tween._delay -= iterationDelay;
        }
        tween._startTime -= iterationDelay;
      });
      iterationDuration -= iterationDelay;
    } else {
      iterationDelay = 0;
    }
    if (!iterationDuration) {
      iterationDuration = minValue;
      this.iterationCount = 0;
    }
    this.targets = parsedTargets;
    this.id = !isUnd(id) ? id : JSAnimationId;
    this.duration = iterationDuration === minValue ? minValue : clampInfinity((iterationDuration + this._loopDelay) * this.iterationCount - this._loopDelay) || minValue;
    this.onRender = onRender || animDefaults.onRender;
    this._ease = parsedAnimPlaybackEase;
    this._delay = iterationDelay;
    this.iterationDuration = iterationDuration;
    if (!this._autoplay && shouldTriggerRender) this.onRender(this);
  }
  /**
   * @param  {Number} newDuration
   * @return {this}
   */
  stretch(newDuration) {
    const currentDuration = this.duration;
    if (currentDuration === normalizeTime(newDuration)) return this;
    const timeScale = newDuration / currentDuration;
    forEachChildren(this, (tween) => {
      tween._updateDuration = normalizeTime(tween._updateDuration * timeScale);
      tween._changeDuration = normalizeTime(tween._changeDuration * timeScale);
      tween._currentTime *= timeScale;
      tween._delay *= timeScale;
      tween._startTime *= timeScale;
      tween._absoluteStartTime *= timeScale;
      tween._absoluteUpdateStartTime *= timeScale;
      tween._absoluteEndTime *= timeScale;
    });
    return super.stretch(newDuration);
  }
  /**
   * @return {this}
   */
  refresh() {
    forEachChildren(this, (tween) => {
      const toFunc = tween._toFunc;
      const fromFunc = tween._fromFunc;
      if (toFunc || fromFunc) {
        if (fromFunc) {
          decomposeRawValue(fromFunc(), fromTargetObject);
          if (fromTargetObject.u !== tween._unit && tween.target[isDomSymbol]) {
            convertValueUnit(
              /** @type {DOMTarget} */
              tween.target,
              fromTargetObject,
              tween._unit,
              true
            );
          }
          tween._fromNumbers = cloneArray(fromTargetObject.d);
          tween._fromNumber = fromTargetObject.n;
        } else if (toFunc) {
          decomposeRawValue(getOriginalAnimatableValue(tween.target, tween.property, tween._tweenType), decomposedOriginalValue);
          tween._fromNumbers = cloneArray(decomposedOriginalValue.d);
          tween._fromNumber = decomposedOriginalValue.n;
        }
        if (toFunc) {
          decomposeRawValue(toFunc(), toTargetObject);
          tween._toNumbers = cloneArray(toTargetObject.d);
          tween._strings = cloneArray(toTargetObject.s);
          tween._toNumber = toTargetObject.o ? getRelativeValue(tween._fromNumber, toTargetObject.n, toTargetObject.o) : toTargetObject.n;
        }
      }
    });
    if (this.duration === minValue) this.restart();
    return this;
  }
  /**
   * Cancel the animation and revert all the values affected by this animation to their original state
   * @return {this}
   */
  revert() {
    super.revert();
    return revertValues(this);
  }
  /**
   * @typedef {this & {then: null}} ResolvedJSAnimation
   */
  /**
   * @param  {Callback<ResolvedJSAnimation>} [callback]
   * @return Promise<this>
   */
  then(callback) {
    return super.then(callback);
  }
}
const animate = (targets, parameters) => {
  {
    return new JSAnimation(targets, parameters, null, 0, false).init();
  }
};
/**
 * Anime.js - timeline - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const getPrevChildOffset = (timeline, timePosition) => {
  if (stringStartsWith(timePosition, "<")) {
    const goToPrevAnimationOffset = timePosition[1] === "<";
    const prevAnimation = (
      /** @type {Tickable} */
      timeline._tail
    );
    const prevOffset = prevAnimation ? prevAnimation._offset + prevAnimation._delay : 0;
    return goToPrevAnimationOffset ? prevOffset : prevOffset + prevAnimation.duration;
  }
};
const parseTimelinePosition = (timeline, timePosition) => {
  let tlDuration = timeline.iterationDuration;
  if (tlDuration === minValue) tlDuration = 0;
  if (isUnd(timePosition)) return tlDuration;
  if (isNum(+timePosition)) return +timePosition;
  const timePosStr = (
    /** @type {String} */
    timePosition
  );
  const tlLabels = timeline ? timeline.labels : null;
  const hasLabels = !isNil(tlLabels);
  const prevOffset = getPrevChildOffset(timeline, timePosStr);
  const hasSibling = !isUnd(prevOffset);
  const matchedRelativeOperator = relativeValuesExecRgx.exec(timePosStr);
  if (matchedRelativeOperator) {
    const fullOperator = matchedRelativeOperator[0];
    const split = timePosStr.split(fullOperator);
    const labelOffset = hasLabels && split[0] ? tlLabels[split[0]] : tlDuration;
    const parsedOffset = hasSibling ? prevOffset : hasLabels ? labelOffset : tlDuration;
    const parsedNumericalOffset = +split[1];
    return getRelativeValue(parsedOffset, parsedNumericalOffset, fullOperator[0]);
  } else {
    return hasSibling ? prevOffset : hasLabels ? !isUnd(tlLabels[timePosStr]) ? tlLabels[timePosStr] : tlDuration : tlDuration;
  }
};
/**
 * Anime.js - timeline - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
function getTimelineTotalDuration(tl) {
  return clampInfinity((tl.iterationDuration + tl._loopDelay) * tl.iterationCount - tl._loopDelay) || minValue;
}
function addTlChild(childParams, tl, timePosition, targets, index, allTargets) {
  const isSetter = isNum(childParams.duration) && /** @type {Number} */
  childParams.duration <= minValue;
  const adjustedPosition = isSetter ? timePosition - minValue : timePosition;
  if (tl.composition) tick(tl, adjustedPosition, 1, 1, tickModes.AUTO);
  const tlChild = targets ? new JSAnimation(
    targets,
    /** @type {AnimationParams} */
    childParams,
    tl,
    adjustedPosition,
    false,
    index,
    allTargets
  ) : new Timer(
    /** @type {TimerParams} */
    childParams,
    tl,
    adjustedPosition
  );
  if (tl.composition) tlChild.init(true);
  addChild(tl, tlChild);
  forEachChildren(tl, (child) => {
    const childTLOffset = child._offset + child._delay;
    const childDur = childTLOffset + child.duration;
    if (childDur > tl.iterationDuration) tl.iterationDuration = childDur;
  });
  tl.duration = getTimelineTotalDuration(tl);
  return tl;
}
let TLId = 0;
class Timeline extends Timer {
  /**
   * @param {TimelineParams} [parameters]
   */
  constructor(parameters = {}) {
    super(
      /** @type {TimerParams&TimelineParams} */
      parameters,
      null,
      0
    );
    ++TLId;
    this.id = !isUnd(parameters.id) ? parameters.id : TLId;
    this.duration = 0;
    this.labels = {};
    const defaultsParams = parameters.defaults;
    const globalDefaults = globals.defaults;
    this.defaults = defaultsParams ? mergeObjects(defaultsParams, globalDefaults) : globalDefaults;
    this.composition = setValue(parameters.composition, true);
    this.onRender = parameters.onRender || globalDefaults.onRender;
    const tlPlaybackEase = setValue(parameters.playbackEase, globalDefaults.playbackEase);
    this._ease = tlPlaybackEase ? parseEase(tlPlaybackEase) : null;
    this.iterationDuration = 0;
  }
  /**
   * @overload
   * @param {TargetsParam} a1
   * @param {AnimationParams} a2
   * @param {TimelinePosition|StaggerFunction<Number|String>|TweakRegister} [a3]
   * @return {this}
   *
   * @overload
   * @param {TimerParams} a1
   * @param {TimelinePosition} [a2]
   * @return {this}
   *
   * @param {TargetsParam|TimerParams} a1
   * @param {TimelinePosition|AnimationParams} a2
   * @param {TimelinePosition|StaggerFunction<Number|String>|TweakRegister} [a3]
   */
  add(a1, a2, a3) {
    const isAnim = isObj(a2);
    const isTimer = isObj(a1);
    if (isAnim || isTimer) {
      this._hasChildren = true;
      if (isAnim) {
        const childParams = (
          /** @type {AnimationParams} */
          a2
        );
        const isStaggerType = a3 && /** @type {TweakRegister} */
        a3.type === "Stagger" && globals.editor;
        const staggeredPosition = isFnc(a3) ? a3 : null;
        if (staggeredPosition || isStaggerType) {
          const parsedTargetsArray = parseTargets(
            /** @type {TargetsParam} */
            a1
          );
          const tlDuration = this.duration;
          const tlIterationDuration = this.iterationDuration;
          const id = childParams.id;
          let i = 0;
          parsedTargetsArray.length;
          const staggerFn = staggeredPosition || globals.editor.resolveStagger(
            /** @type {TweakRegister} */
            a3.defaultValue
          );
          parsedTargetsArray.forEach((target) => {
            const staggeredChildParams = { ...childParams };
            this.duration = tlDuration;
            this.iterationDuration = tlIterationDuration;
            if (!isUnd(id)) staggeredChildParams.id = id + "-" + i;
            const staggeredTimePosition = parseTimelinePosition(this, staggerFn(target, i, parsedTargetsArray, null, this));
            addTlChild(
              staggeredChildParams,
              this,
              staggeredTimePosition,
              target,
              i,
              parsedTargetsArray
            );
            i++;
          });
        } else {
          const resolvedChildParams = childParams;
          const resolvedPosition = a3 && /** @type {*} */
          a3.type ? (
            /** @type {*} */
            a3.defaultValue
          ) : a3;
          addTlChild(
            resolvedChildParams,
            this,
            parseTimelinePosition(this, resolvedPosition),
            /** @type {TargetsParam} */
            a1
          );
        }
      } else {
        addTlChild(
          /** @type TimerParams */
          a1,
          this,
          parseTimelinePosition(this, a2)
        );
      }
      if (this.composition) this.init(true);
      return this;
    }
  }
  /**
   * @overload
   * @param {Tickable} [synced]
   * @param {TimelinePosition} [position]
   * @return {this}
   *
   * @overload
   * @param {globalThis.Animation} [synced]
   * @param {TimelinePosition} [position]
   * @return {this}
   *
   * @overload
   * @param {WAAPIAnimation} [synced]
   * @param {TimelinePosition} [position]
   * @return {this}
   *
   * @param {Tickable|WAAPIAnimation|globalThis.Animation} [synced]
   * @param {TimelinePosition} [position]
   */
  sync(synced, position) {
    if (isUnd(synced) || synced && isUnd(synced.pause)) return this;
    synced.pause();
    const duration = +/** @type {globalThis.Animation} */
    (synced.effect ? (
      /** @type {globalThis.Animation} */
      synced.effect.getTiming().duration
    ) : (
      /** @type {Tickable} */
      synced.duration
    ));
    if (!isUnd(synced) && !isUnd(
      /** @type {WAAPIAnimation} */
      synced.persist
    )) {
      synced.persist = true;
    }
    const result = this.add(synced, { currentTime: [0, duration], duration, delay: 0, ease: "linear", playbackEase: "linear" }, position);
    return result;
  }
  /**
   * @param  {TargetsParam} targets
   * @param  {AnimationParams} parameters
   * @param  {TimelinePosition|StaggerFunction<Number|String>|TweakRegister} [position]
   * @return {this}
   */
  set(targets, parameters, position) {
    if (isUnd(parameters)) return this;
    parameters.duration = minValue;
    parameters.composition = compositionTypes.replace;
    return this.add(targets, parameters, position);
  }
  /**
   * @param {Callback<Timer>} callback
   * @param {TimelinePosition} [position]
   * @return {this}
   */
  call(callback, position) {
    if (isUnd(callback) || callback && !isFnc(callback)) return this;
    return this.add({ duration: 0, delay: 0, onComplete: () => callback(this) }, position);
  }
  /**
   * @param {String} labelName
   * @param {TimelinePosition} [position]
   * @return {this}
   *
   */
  label(labelName, position) {
    if (isUnd(labelName) || labelName && !isStr(labelName)) return this;
    this.labels[labelName] = parseTimelinePosition(this, position);
    return this;
  }
  /**
   * @param  {TargetsParam} targets
   * @param  {String} [propertyName]
   * @return {this}
   */
  remove(targets, propertyName) {
    removeTargetsFromRenderable(parseTargets(targets), this, propertyName);
    return this;
  }
  /**
   * @param  {Number} newDuration
   * @return {this}
   */
  stretch(newDuration) {
    const currentDuration = this.duration;
    if (currentDuration === normalizeTime(newDuration)) return this;
    const timeScale = newDuration / currentDuration;
    const labels = this.labels;
    forEachChildren(this, (child) => child.stretch(child.duration * timeScale));
    for (let labelName in labels) labels[labelName] *= timeScale;
    return super.stretch(newDuration);
  }
  /**
   * @return {this}
   */
  refresh() {
    forEachChildren(this, (child) => {
      if (
        /** @type {JSAnimation} */
        child.refresh
      ) child.refresh();
    });
    return this;
  }
  /**
   * @return {this}
   */
  revert() {
    super.revert();
    forEachChildren(this, (child) => child.revert, true);
    return revertValues(this);
  }
  /**
   * @typedef {this & {then: null}} ResolvedTimeline
   */
  /**
   * @param  {Callback<ResolvedTimeline>} [callback]
   * @return Promise<this>
   */
  then(callback) {
    return super.then(callback);
  }
}
const createTimeline = (parameters) => {
  return new Timeline(parameters).init();
};
/**
 * Anime.js - utils - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const roundPad$1 = (v, decimalLength) => (+v).toFixed(decimalLength);
const padStart$1 = (v, totalLength, padString) => `${v}`.padStart(totalLength, padString);
const padEnd$1 = (v, totalLength, padString) => `${v}`.padEnd(totalLength, padString);
const wrap$1 = (v, min, max) => ((v - min) % (max - min) + (max - min)) % (max - min) + min;
const mapRange$1 = (value, inLow, inHigh, outLow, outHigh) => outLow + (value - inLow) / (inHigh - inLow) * (outHigh - outLow);
const degToRad$1 = (degrees) => degrees * Math.PI / 180;
const radToDeg$1 = (radians) => radians * 180 / Math.PI;
const damp$1 = (start, end, deltaTime, factor) => {
  return !factor ? start : factor === 1 ? end : lerp$1(start, end, 1 - Math.exp(-factor * deltaTime * 0.1));
};
const number = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  clamp: clamp$1,
  damp: damp$1,
  degToRad: degToRad$1,
  lerp: lerp$1,
  mapRange: mapRange$1,
  padEnd: padEnd$1,
  padStart: padStart$1,
  radToDeg: radToDeg$1,
  round: round$1,
  roundPad: roundPad$1,
  snap: snap$1,
  wrap: wrap$1
}, Symbol.toStringTag, { value: "Module" }));
/**
 * Anime.js - waapi - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const WAAPIAnimationsLookups = {
  _head: null,
  _tail: null
};
const removeWAAPIAnimation = ($el, property, parent) => {
  let nextLookup = WAAPIAnimationsLookups._head;
  let anim;
  while (nextLookup) {
    const next = nextLookup._next;
    const matchTarget = nextLookup.$el === $el;
    const matchProperty = !property || nextLookup.property === property;
    const matchParent = !parent || nextLookup.parent === parent;
    if (matchTarget && matchProperty && matchParent) {
      anim = nextLookup.animation;
      try {
        anim.commitStyles();
      } catch (e) {
      }
      anim.cancel();
      removeChild(WAAPIAnimationsLookups, nextLookup);
      const lookupParent = nextLookup.parent;
      if (lookupParent) {
        lookupParent._completed++;
        if (lookupParent.animations.length === lookupParent._completed) {
          lookupParent.completed = true;
          lookupParent.paused = true;
          if (!lookupParent.muteCallbacks) {
            lookupParent.onComplete(lookupParent);
            lookupParent._resolve(lookupParent);
          }
        }
      }
    }
    nextLookup = next;
  }
  return anim;
};
/**
 * Anime.js - utils - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
function get(targetSelector, propName, unit) {
  const targets = registerTargets(targetSelector);
  if (!targets.length) return;
  const [target] = targets;
  const tweenType = getTweenType(target, propName);
  const normalizePropName = sanitizePropertyName(propName, target, tweenType);
  let originalValue = getOriginalAnimatableValue(target, normalizePropName);
  if (isUnd(unit)) {
    return originalValue;
  } else {
    decomposeRawValue(originalValue, decomposedOriginalValue);
    if (decomposedOriginalValue.t === valueTypes.NUMBER || decomposedOriginalValue.t === valueTypes.UNIT) {
      if (unit === false) {
        return decomposedOriginalValue.n;
      } else {
        const convertedValue = convertValueUnit(
          /** @type {DOMTarget} */
          target,
          decomposedOriginalValue,
          /** @type {String} */
          unit,
          false
        );
        return `${round$1(convertedValue.n, globals.precision)}${convertedValue.u}`;
      }
    }
  }
}
const set = (targets, parameters) => {
  if (isUnd(parameters)) return;
  parameters.duration = minValue;
  parameters.composition = setValue(parameters.composition, compositionTypes.none);
  return new JSAnimation(targets, parameters, null, 0, true).resume();
};
const remove = (targets, renderable, propertyName) => {
  const targetsArray = parseTargets(targets);
  for (let i = 0, l = targetsArray.length; i < l; i++) {
    removeWAAPIAnimation(
      /** @type {DOMTarget}  */
      targetsArray[i],
      propertyName,
      renderable && /** @type {WAAPIAnimation} */
      renderable.controlAnimation && /** @type {WAAPIAnimation} */
      renderable
    );
  }
  removeTargetsFromRenderable(
    targetsArray,
    /** @type {Renderable} */
    renderable,
    propertyName
  );
  return targetsArray;
};
/**
 * Anime.js - utils - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const sync = (callback = noop) => {
  return new Timer({ duration: 1 * globals.timeScale, onComplete: callback }, null, 0).resume();
};
const keepTime = (constructor) => {
  let tracked;
  return (
    /** @type {(...args: any[]) => T extends void ? () => void : T} */
    /** @type {*} */
    (...args) => {
      let currentIteration, currentIterationProgress, reversed, alternate, startTime;
      if (tracked) {
        currentIteration = tracked.currentIteration;
        currentIterationProgress = tracked.iterationProgress;
        reversed = tracked.reversed;
        alternate = tracked._alternate;
        startTime = tracked._startTime;
        tracked.revert();
      }
      const cleanup = constructor(...args);
      if (cleanup && !isFnc(cleanup) && cleanup.revert) tracked = cleanup;
      if (!isUnd(currentIterationProgress)) {
        tracked.currentIteration = currentIteration;
        tracked.iterationProgress = (alternate ? !(currentIteration % 2) ? reversed : !reversed : reversed) ? 1 - currentIterationProgress : currentIterationProgress;
        tracked._startTime = startTime;
      }
      return cleanup || noop;
    }
  );
};
/**
 * Anime.js - utils - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const numberUtils = number;
const chainables = {};
const curry = (fn, last = 0) => (...args) => last ? (v) => fn(...args, v) : (v) => fn(v, ...args);
const chain = (fn) => {
  return (...args) => {
    const result = fn(...args);
    return new Proxy(noop, {
      apply: (_, __, [v]) => result(v),
      get: (_, prop) => {
        if (!chainables[prop]) return void 0;
        return chain(
          /**@param {...Number|String} nextArgs */
          (...nextArgs) => {
            const nextResult = chainables[prop](...nextArgs);
            return (v) => nextResult(result(v));
          }
        );
      }
    });
  };
};
const makeChainable = (name, fn, right = 0) => {
  const chained = (...args) => (args.length < fn.length ? chain(curry(fn, right)) : fn)(...args);
  if (!chainables[name]) chainables[name] = chained;
  return chained;
};
const roundPad = (
  /** @type {typeof numberUtils.roundPad & ChainedRoundPad} */
  makeChainable("roundPad", numberUtils.roundPad)
);
const padStart = (
  /** @type {typeof numberUtils.padStart & ChainedPadStart} */
  makeChainable("padStart", numberUtils.padStart)
);
const padEnd = (
  /** @type {typeof numberUtils.padEnd & ChainedPadEnd} */
  makeChainable("padEnd", numberUtils.padEnd)
);
const wrap = (
  /** @type {typeof numberUtils.wrap & ChainedWrap} */
  makeChainable("wrap", numberUtils.wrap)
);
const mapRange = (
  /** @type {typeof numberUtils.mapRange & ChainedMapRange} */
  makeChainable("mapRange", numberUtils.mapRange)
);
const degToRad = (
  /** @type {typeof numberUtils.degToRad & ChainedDegToRad} */
  makeChainable("degToRad", numberUtils.degToRad)
);
const radToDeg = (
  /** @type {typeof numberUtils.radToDeg & ChainedRadToDeg} */
  makeChainable("radToDeg", numberUtils.radToDeg)
);
const snap = (
  /** @type {typeof numberUtils.snap & ChainedSnap} */
  makeChainable("snap", numberUtils.snap)
);
const clamp = (
  /** @type {typeof numberUtils.clamp & ChainedClamp} */
  makeChainable("clamp", numberUtils.clamp)
);
const round = (
  /** @type {typeof numberUtils.round & ChainedRound} */
  makeChainable("round", numberUtils.round)
);
const lerp = (
  /** @type {typeof numberUtils.lerp & ChainedLerp} */
  makeChainable("lerp", numberUtils.lerp, 1)
);
const damp = (
  /** @type {typeof numberUtils.damp & ChainedDamp} */
  makeChainable("damp", numberUtils.damp, 1)
);
/**
 * Anime.js - utils - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const random = (min = 0, max = 1, decimalLength = 0) => {
  const m = 10 ** decimalLength;
  return Math.floor((Math.random() * (max - min + 1 / m) + min) * m) / m;
};
let _seed = 0;
const createSeededRandom = (seed, seededMin = 0, seededMax = 1, seededDecimalLength = 0) => {
  let t = seed === void 0 ? _seed++ : seed;
  return (min = seededMin, max = seededMax, decimalLength = seededDecimalLength) => {
    t += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    const m = 10 ** decimalLength;
    return Math.floor((((t ^ t >>> 14) >>> 0) / 4294967296 * (max - min + 1 / m) + min) * m) / m;
  };
};
const randomPick = (items) => items[random(0, items.length - 1)];
const shuffle = (items, rnd = random) => {
  let m = items.length, t, i;
  while (m) {
    i = rnd(0, --m);
    t = items[m];
    items[m] = items[i];
    items[i] = t;
  }
  return items;
};
/**
 * Anime.js - utils - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const stagger = (val, params = {}) => {
  let values = [];
  let maxValue2 = 0;
  let cachedOffset;
  let jitterSamples = null;
  const from = params.from;
  const reversed = params.reversed;
  const ease = params.ease;
  const hasEasing = !isUnd(ease);
  const hasSpring = hasEasing && !isUnd(
    /** @type {Spring} */
    ease.ease
  );
  const staggerEase = hasSpring ? (
    /** @type {Spring} */
    ease.ease
  ) : hasEasing ? parseEase(ease) : null;
  const grid = params.grid;
  const autoGrid = grid === true;
  const axis = params.axis;
  const customTotal = params.total;
  const fromFirst = isUnd(from) || from === 0 || from === "first";
  const fromCenter = from === "center";
  const fromLast = from === "last";
  const fromRandom = from === "random";
  const fromArr = isArr(from);
  const isRange = isArr(val);
  const useProp = params.use;
  const val1 = isRange ? parseNumber(val[0]) : parseNumber(val);
  const val2 = isRange ? parseNumber(val[1]) : 0;
  const unitMatch = unitsExecRgx.exec((isRange ? val[1] : val) + emptyString);
  const start = params.start || 0 + (isRange ? val1 : 0);
  const seed = params.seed;
  const hasSeed = !isUnd(seed) && seed !== false;
  const rng = hasSeed ? createSeededRandom(seed === true ? 0 : (
    /** @type {Number} */
    seed
  )) : random;
  const jitter = params.jitter;
  const hasJitter = !isUnd(jitter);
  const jitterIsArr = isArr(jitter);
  const jitterStart = jitterIsArr ? (
    /** @type {[Number,Number]} */
    jitter[0]
  ) : (
    /** @type {Number} */
    jitter || 0
  );
  const jitterEnd = jitterIsArr ? (
    /** @type {[Number,Number]} */
    jitter[1]
  ) : (
    /** @type {Number} */
    jitter || 0
  );
  let fromIndex = fromFirst ? 0 : isNum(from) ? from : 0;
  return (target, i, t, _, tl) => {
    const [registeredTarget] = registerTargets(target);
    const total = isUnd(customTotal) ? t.length : customTotal;
    const customIndex = !isUnd(useProp) ? isFnc(useProp) ? useProp(registeredTarget, i, total) : getOriginalAnimatableValue(registeredTarget, useProp) : false;
    const customIdx = isNum(customIndex) || isStr(customIndex) && isNum(+customIndex) ? +customIndex : i;
    const staggerIndex = customIdx >= 0 && customIdx < total ? customIdx : i;
    if (fromCenter) fromIndex = (total - 1) / 2;
    if (fromLast) fromIndex = total - 1;
    if (!values.length) {
      if (autoGrid) {
        let hasPositions = true;
        let has3D = false;
        let minPosX = Infinity;
        let minPosY = Infinity;
        let minPosZ = Infinity;
        let maxPosX = -Infinity;
        let maxPosY = -Infinity;
        let maxPosZ = -Infinity;
        const pxArr = [];
        const pyArr = [];
        const pzArr = [];
        for (let index = 0; index < total; index++) {
          const el = t[index];
          let px2 = 0;
          let py = 0;
          let pz = 0;
          let found = false;
          if (el && isFnc(el.getBoundingClientRect)) {
            const rect = el.getBoundingClientRect();
            px2 = rect.left + rect.width / 2;
            py = rect.top + rect.height / 2;
            found = true;
          } else {
            const obj = (
              /** @type {JSTarget} */
              el
            );
            if (obj && isNum(obj.x) && isNum(obj.y)) {
              px2 = obj.x;
              py = obj.y;
              if (isNum(obj.z)) {
                pz = obj.z;
                has3D = true;
              }
              found = true;
            }
          }
          if (!found) {
            hasPositions = false;
            break;
          }
          pxArr.push(px2);
          pyArr.push(py);
          pzArr.push(pz);
          if (px2 < minPosX) minPosX = px2;
          if (py < minPosY) minPosY = py;
          if (pz < minPosZ) minPosZ = pz;
          if (px2 > maxPosX) maxPosX = px2;
          if (py > maxPosY) maxPosY = py;
          if (pz > maxPosZ) maxPosZ = pz;
        }
        if (hasPositions) {
          let fX = pxArr[0];
          let fY = pyArr[0];
          let fZ = pzArr[0];
          if (fromArr) {
            fX = minPosX + from[0] * (maxPosX - minPosX);
            fY = minPosY + from[1] * (maxPosY - minPosY);
            fZ = has3D ? minPosZ + (from.length >= 3 ? from[2] : 0.5) * (maxPosZ - minPosZ) : 0;
          } else if (fromCenter) {
            fX = (minPosX + maxPosX) / 2;
            fY = (minPosY + maxPosY) / 2;
            fZ = (minPosZ + maxPosZ) / 2;
          } else if (fromLast) {
            fX = pxArr[total - 1];
            fY = pyArr[total - 1];
            fZ = pzArr[total - 1];
          } else if (isNum(from)) {
            fX = pxArr[from];
            fY = pyArr[from];
            fZ = pzArr[from];
          }
          for (let index = 0; index < total; index++) {
            const distanceX = fX - pxArr[index];
            const distanceY = fY - pyArr[index];
            const distanceZ = fZ - pzArr[index];
            let value = sqrt(distanceX * distanceX + distanceY * distanceY + (has3D ? distanceZ * distanceZ : 0));
            if (axis === "x") value = -distanceX;
            if (axis === "y") value = -distanceY;
            if (axis === "z") value = -distanceZ;
            values.push(value);
          }
          let minDist = Infinity;
          for (let index = 0; index < total; index++) {
            const absVal = abs(values[index]);
            if (absVal > 0 && absVal < minDist) minDist = absVal;
          }
          if (minDist > 0 && minDist < Infinity) {
            for (let index = 0; index < total; index++) {
              values[index] = values[index] / minDist;
            }
          }
        } else {
          for (let index = 0; index < total; index++) {
            values.push(abs(fromIndex - index));
          }
        }
      } else {
        for (let index = 0; index < total; index++) {
          if (!grid) {
            values.push(abs(fromIndex - index));
          } else {
            const dims = grid.length;
            const wh = grid[0] * grid[1];
            let fromX, fromY, fromZ;
            if (fromArr) {
              fromX = from[0] * (grid[0] - 1);
              fromY = from[1] * (grid[1] - 1);
              fromZ = dims === 3 ? (from.length >= 3 ? from[2] : 0.5) * (grid[2] - 1) : 0;
            } else if (fromCenter) {
              fromX = (grid[0] - 1) / 2;
              fromY = (grid[1] - 1) / 2;
              fromZ = dims === 3 ? (grid[2] - 1) / 2 : 0;
            } else {
              fromX = fromIndex % grid[0];
              fromY = floor(fromIndex / grid[0]) % grid[1];
              fromZ = dims === 3 ? floor(fromIndex / wh) : 0;
            }
            const toX = index % grid[0];
            const toY = floor(index / grid[0]) % grid[1];
            const toZ = dims === 3 ? floor(index / wh) : 0;
            const distanceX = fromX - toX;
            const distanceY = fromY - toY;
            const distanceZ = fromZ - toZ;
            let value = sqrt(distanceX * distanceX + distanceY * distanceY + (dims === 3 ? distanceZ * distanceZ : 0));
            if (axis === "x") value = -distanceX;
            if (axis === "y") value = -distanceY;
            if (axis === "z") value = -distanceZ;
            values.push(value);
          }
        }
      }
      maxValue2 = values[0];
      for (let k = 1; k < total; k++) if (values[k] > maxValue2) maxValue2 = values[k];
      if (staggerEase || reversed) {
        for (let k = 0; k < total; k++) {
          let v = values[k];
          if (staggerEase) v = staggerEase(v / maxValue2) * maxValue2;
          if (reversed) v = axis ? -v : abs(maxValue2 - v);
          values[k] = v;
        }
      }
      if (hasJitter) {
        jitterSamples = new Array(total);
        for (let k = 0; k < total; k++) jitterSamples[k] = rng(-1, 1, 4);
      }
      if (fromRandom) values = shuffle(values, rng);
    }
    const spacing = isRange ? (val2 - val1) / maxValue2 : val1;
    if (isUnd(cachedOffset)) {
      cachedOffset = tl ? parseTimelinePosition(tl, isUnd(params.start) ? tl.iterationDuration : start) : (
        /** @type {Number} */
        start
      );
    }
    let output = cachedOffset + (spacing * round$1(values[staggerIndex], 2) || 0);
    if (hasJitter) {
      const progress = maxValue2 ? values[staggerIndex] / maxValue2 : 0;
      const mag = jitterStart + (jitterEnd - jitterStart) * progress;
      output = /** @type {Number} */
      output + jitterSamples[staggerIndex] * mag;
    }
    if (params.modifier) output = params.modifier(
      /** @type {Number} */
      output
    );
    if (unitMatch) output = `${output}${unitMatch[2]}`;
    return output;
  };
};
/**
 * Anime.js - utils - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  $: registerTargets,
  addChild,
  clamp,
  cleanInlineStyles,
  createSeededRandom,
  damp,
  degToRad,
  forEachChildren,
  get,
  keepTime,
  lerp,
  mapRange,
  padEnd,
  padStart,
  radToDeg,
  random,
  randomPick,
  remove,
  removeChild,
  round,
  roundPad,
  set,
  shuffle,
  snap,
  stagger,
  sync,
  wrap
}, Symbol.toStringTag, { value: "Module" }));
/**
 * Anime.js - text - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const segmenter = typeof Intl !== "undefined" && Intl.Segmenter;
const valueRgx = /\{value\}/g;
const indexRgx = /\{i\}/g;
const whiteSpaceGroupRgx = /(\s+)/;
const whiteSpaceRgx = /^\s+$/;
const lineType = "line";
const wordType = "word";
const charType = "char";
const dataLine = `data-line`;
let wordSegmenter = null;
let graphemeSegmenter = null;
let $splitTemplate = null;
const isSegmentWordLike = (seg) => {
  return seg.isWordLike || seg.segment === " " || // Consider spaces as words first, then handle them diffrently later
  isNum(+seg.segment);
};
const setAriaHidden = ($el) => $el.setAttribute("aria-hidden", "true");
const getAllTopLevelElements = ($el, type) => [.../** @type {*} */
$el.querySelectorAll(`[data-${type}]:not([data-${type}] [data-${type}])`)];
const debugColors = { line: "#00D672", word: "#FF4B4B", char: "#5A87FF" };
const filterEmptyElements = ($el) => {
  if (!$el.childElementCount && !$el.textContent.trim()) {
    const $parent = $el.parentElement;
    $el.remove();
    if ($parent) filterEmptyElements($parent);
  }
};
const filterLineElements = ($el, lineIndex, bin) => {
  const dataLineAttr = $el.getAttribute(dataLine);
  if (dataLineAttr !== null && +dataLineAttr !== lineIndex || $el.tagName === "BR") {
    bin.add($el);
    const prev = $el.previousSibling;
    const next = $el.nextSibling;
    if (prev && prev.nodeType === 3 && whiteSpaceRgx.test(prev.textContent)) {
      bin.add(prev);
    }
    if (next && next.nodeType === 3 && whiteSpaceRgx.test(next.textContent)) {
      bin.add(next);
    }
  }
  let i = $el.childElementCount;
  while (i--) filterLineElements(
    /** @type {HTMLElement} */
    $el.children[i],
    lineIndex,
    bin
  );
  return bin;
};
const generateTemplate = (type, params = {}) => {
  let template = ``;
  if (!params) params = {};
  const classString = isStr(params.class) ? ` class="${params.class}"` : "";
  const cloneType = setValue(params.clone, false);
  const wrapType = setValue(params.wrap, false);
  const overflow = wrapType ? wrapType === true ? "clip" : wrapType : cloneType ? "clip" : false;
  if (wrapType) template += `<span${overflow ? ` style="overflow:${overflow};"` : ""}>`;
  template += `<span${classString}${cloneType ? ` style="position:relative;"` : ""} data-${type}="{i}">`;
  if (cloneType) {
    const left = cloneType === "left" ? "-100%" : cloneType === "right" ? "100%" : "0";
    const top2 = cloneType === "top" ? "-100%" : cloneType === "bottom" ? "100%" : "0";
    template += `<span>{value}</span>`;
    template += `<span inert style="position:absolute;top:${top2};left:${left};white-space:nowrap;">{value}</span>`;
  } else {
    template += `{value}`;
  }
  template += `</span>`;
  if (wrapType) template += `</span>`;
  return template;
};
const processHTMLTemplate = (htmlTemplate, store, node, $parentFragment, type, debug, lineIndex, wordIndex, charIndex) => {
  const isLine = type === lineType;
  const isChar = type === charType;
  const className = `_${type}_`;
  const template = isFnc(htmlTemplate) ? htmlTemplate(node) : htmlTemplate;
  const displayStyle = isLine ? "block" : "inline-block";
  $splitTemplate.innerHTML = template.replace(valueRgx, `<i class="${className}"></i>`).replace(indexRgx, `${isChar ? charIndex : isLine ? lineIndex : wordIndex}`);
  const $content = $splitTemplate.content;
  const $highestParent = (
    /** @type {HTMLElement} */
    $content.firstElementChild
  );
  const $split = (
    /** @type {HTMLElement} */
    $content.querySelector(`[data-${type}]`) || $highestParent
  );
  const $replacables = (
    /** @type {NodeListOf<HTMLElement>} */
    $content.querySelectorAll(`i.${className}`)
  );
  const replacablesLength = $replacables.length;
  if (replacablesLength) {
    $highestParent.style.display = displayStyle;
    $split.style.display = displayStyle;
    $split.setAttribute(dataLine, `${lineIndex}`);
    if (!isLine) {
      $split.setAttribute("data-word", `${wordIndex}`);
      if (isChar) $split.setAttribute("data-char", `${charIndex}`);
    }
    let i = replacablesLength;
    while (i--) {
      const $replace = $replacables[i];
      const $closestParent = $replace.parentElement;
      $closestParent.style.display = displayStyle;
      if (isLine) {
        $closestParent.innerHTML = /** @type {HTMLElement} */
        node.innerHTML;
      } else {
        $closestParent.replaceChild(node.cloneNode(true), $replace);
      }
    }
    store.push($split);
    $parentFragment.appendChild($content);
  } else {
    console.warn(`The expression "{value}" is missing from the provided template.`);
  }
  if (debug) $highestParent.style.outline = `1px dotted ${debugColors[type]}`;
  return $highestParent;
};
class TextSplitter {
  /**
   * @param  {Element|NodeList|String|Array<Element>} target
   * @param  {TextSplitterParams} [parameters]
   */
  constructor(target, parameters = {}) {
    if (!wordSegmenter) wordSegmenter = segmenter ? new segmenter([], { granularity: wordType }) : {
      segment: (text2) => {
        const segments = [];
        const words2 = text2.split(whiteSpaceGroupRgx);
        for (let i = 0, l = words2.length; i < l; i++) {
          const segment = words2[i];
          segments.push({
            segment,
            isWordLike: !whiteSpaceRgx.test(segment)
            // Consider non-whitespace as word-like
          });
        }
        return segments;
      }
    };
    if (!graphemeSegmenter) graphemeSegmenter = segmenter ? new segmenter([], { granularity: "grapheme" }) : {
      segment: (text2) => [...text2].map((char) => ({ segment: char }))
    };
    if (!$splitTemplate && isBrowser) $splitTemplate = doc.createElement("template");
    const { words, chars, lines, accessible, includeSpaces, debug } = parameters;
    const $target = (
      /** @type {HTMLElement} */
      (target = isArr(target) ? target[0] : target) && /** @type {Node} */
      target.nodeType ? target : (getNodeList(target) || [])[0]
    );
    const lineParams = lines === true ? {} : lines;
    const wordParams = words === true || isUnd(words) ? {} : words;
    const charParams = chars === true ? {} : chars;
    this.debug = setValue(debug, false);
    this.includeSpaces = setValue(includeSpaces, false);
    this.accessible = setValue(accessible, true);
    this.linesOnly = lineParams && (!wordParams && !charParams);
    this.lineTemplate = isObj(lineParams) ? generateTemplate(
      lineType,
      /** @type {SplitTemplateParams} */
      lineParams
    ) : lineParams;
    this.wordTemplate = isObj(wordParams) || this.linesOnly ? generateTemplate(
      wordType,
      /** @type {SplitTemplateParams} */
      wordParams
    ) : wordParams;
    this.charTemplate = isObj(charParams) ? generateTemplate(
      charType,
      /** @type {SplitTemplateParams} */
      charParams
    ) : charParams;
    this.$target = $target;
    this.html = $target && $target.innerHTML;
    this.lines = [];
    this.words = [];
    this.chars = [];
    this.effects = [];
    this.effectsCleanups = [];
    this.cache = null;
    this.ready = false;
    this.width = 0;
    this.resizeTimeout = null;
    const handleSplit = () => this.html && (lineParams || wordParams || charParams) && this.split();
    this.resizeObserver = new ResizeObserver(() => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        const currentWidth = (
          /** @type {HTMLElement} */
          $target.offsetWidth
        );
        if (currentWidth === this.width) return;
        this.width = currentWidth;
        handleSplit();
      }, 150);
    });
    if (this.lineTemplate && !this.ready) {
      doc.fonts.ready.then(handleSplit);
    } else {
      handleSplit();
    }
    $target ? this.resizeObserver.observe($target) : console.warn("No Text Splitter target found.");
  }
  /**
   * @param  {(...args: any[]) => Tickable | (() => void) | void} effect
   * @return this
   */
  addEffect(effect2) {
    if (!isFnc(effect2)) {
      console.warn("Effect must return a function.");
      return this;
    }
    const refreshableEffect = keepTime(effect2);
    this.effects.push(refreshableEffect);
    if (this.ready) this.effectsCleanups[this.effects.length - 1] = refreshableEffect(this);
    return this;
  }
  revert() {
    clearTimeout(this.resizeTimeout);
    this.lines.length = this.words.length = this.chars.length = 0;
    this.resizeObserver.disconnect();
    this.effectsCleanups.forEach((cleanup) => isFnc(cleanup) ? cleanup(this) : cleanup.revert && cleanup.revert());
    this.$target.innerHTML = this.html;
    return this;
  }
  /**
   * Recursively processes a node and its children
   * @param {Node} node
   */
  splitNode(node) {
    const wordTemplate = this.wordTemplate;
    const charTemplate = this.charTemplate;
    const includeSpaces = this.includeSpaces;
    const debug = this.debug;
    const nodeType = node.nodeType;
    if (nodeType === 3) {
      const nodeText = node.nodeValue;
      if (nodeText.trim()) {
        const tempWords = [];
        const words = this.words;
        const chars = this.chars;
        const wordSegments = wordSegmenter.segment(nodeText);
        const $wordsFragment = doc.createDocumentFragment();
        let prevSeg = null;
        for (const wordSegment of wordSegments) {
          const segment = wordSegment.segment;
          const isWordLike = isSegmentWordLike(wordSegment);
          if (!prevSeg || isWordLike && (prevSeg && isSegmentWordLike(prevSeg))) {
            tempWords.push(segment);
          } else {
            const lastWordIndex = tempWords.length - 1;
            const lastWord = tempWords[lastWordIndex];
            if (!whiteSpaceGroupRgx.test(lastWord) && !whiteSpaceGroupRgx.test(segment)) {
              tempWords[lastWordIndex] += segment;
            } else {
              tempWords.push(segment);
            }
          }
          prevSeg = wordSegment;
        }
        for (let i = 0, l = tempWords.length; i < l; i++) {
          const word = tempWords[i];
          if (!word.trim()) {
            if (i && includeSpaces) continue;
            $wordsFragment.appendChild(doc.createTextNode(word));
          } else {
            const nextWord = tempWords[i + 1];
            const hasWordFollowingSpace = includeSpaces && nextWord && !nextWord.trim();
            const wordToProcess = word;
            const charSegments = charTemplate ? graphemeSegmenter.segment(wordToProcess) : null;
            const $charsFragment = charTemplate ? doc.createDocumentFragment() : doc.createTextNode(hasWordFollowingSpace ? word + " " : word);
            if (charTemplate) {
              const charSegmentsArray = [...charSegments];
              for (let j = 0, jl = charSegmentsArray.length; j < jl; j++) {
                const charSegment = charSegmentsArray[j];
                const isLastChar = j === jl - 1;
                const charText = isLastChar && hasWordFollowingSpace ? charSegment.segment + " " : charSegment.segment;
                const $charNode = doc.createTextNode(charText);
                processHTMLTemplate(
                  charTemplate,
                  chars,
                  $charNode,
                  /** @type {DocumentFragment} */
                  $charsFragment,
                  charType,
                  debug,
                  -1,
                  words.length,
                  chars.length
                );
              }
            }
            if (wordTemplate) {
              processHTMLTemplate(wordTemplate, words, $charsFragment, $wordsFragment, wordType, debug, -1, words.length, chars.length);
            } else if (charTemplate) {
              $wordsFragment.appendChild($charsFragment);
            } else {
              $wordsFragment.appendChild(doc.createTextNode(word));
            }
            if (hasWordFollowingSpace) i++;
          }
        }
        node.parentNode.replaceChild($wordsFragment, node);
      }
    } else if (nodeType === 1) {
      const childNodes = (
        /** @type {Array<Node>} */
        [.../** @type {*} */
        node.childNodes]
      );
      for (let i = 0, l = childNodes.length; i < l; i++) this.splitNode(childNodes[i]);
    }
  }
  /**
   * @param {Boolean} clearCache
   * @return {this}
   */
  split(clearCache = false) {
    const $el = this.$target;
    const isCached = !!this.cache && !clearCache;
    const lineTemplate = this.lineTemplate;
    const wordTemplate = this.wordTemplate;
    const charTemplate = this.charTemplate;
    const fontsReady = doc.fonts.status !== "loading";
    const canSplitLines = lineTemplate && fontsReady;
    this.ready = !lineTemplate || fontsReady;
    if (canSplitLines || clearCache) {
      this.effectsCleanups.forEach((cleanup) => isFnc(cleanup) && cleanup(this));
    }
    if (!isCached) {
      if (clearCache) {
        $el.innerHTML = this.html;
        this.words.length = this.chars.length = 0;
      }
      this.splitNode($el);
      this.cache = $el.innerHTML;
    }
    if (canSplitLines) {
      if (isCached) $el.innerHTML = this.cache;
      this.lines.length = 0;
      if (wordTemplate) this.words = getAllTopLevelElements($el, wordType);
    }
    if (charTemplate && (canSplitLines || wordTemplate)) {
      this.chars = getAllTopLevelElements($el, charType);
    }
    const elementsArray = this.words.length ? this.words : this.chars;
    let y, linesCount = 0;
    for (let i = 0, l = elementsArray.length; i < l; i++) {
      const $el2 = elementsArray[i];
      const { top: top2, height } = $el2.getBoundingClientRect();
      if (!isUnd(y) && top2 - y > height * 0.5) linesCount++;
      $el2.setAttribute(dataLine, `${linesCount}`);
      const nested = $el2.querySelectorAll(`[${dataLine}]`);
      let c = nested.length;
      while (c--) nested[c].setAttribute(dataLine, `${linesCount}`);
      y = top2;
    }
    if (canSplitLines) {
      const linesFragment = doc.createDocumentFragment();
      const parents = /* @__PURE__ */ new Set();
      const clones = [];
      for (let lineIndex = 0; lineIndex < linesCount + 1; lineIndex++) {
        const $clone = (
          /** @type {HTMLElement} */
          $el.cloneNode(true)
        );
        filterLineElements($clone, lineIndex, /* @__PURE__ */ new Set()).forEach(($el2) => {
          const $parent = $el2.parentNode;
          if ($parent) {
            if ($el2.nodeType === 1) parents.add(
              /** @type {HTMLElement} */
              $parent
            );
            $parent.removeChild($el2);
          }
        });
        clones.push($clone);
      }
      parents.forEach(filterEmptyElements);
      for (let cloneIndex = 0, clonesLength = clones.length; cloneIndex < clonesLength; cloneIndex++) {
        processHTMLTemplate(lineTemplate, this.lines, clones[cloneIndex], linesFragment, lineType, this.debug, cloneIndex);
      }
      $el.innerHTML = "";
      $el.appendChild(linesFragment);
      if (wordTemplate) this.words = getAllTopLevelElements($el, wordType);
      if (charTemplate) this.chars = getAllTopLevelElements($el, charType);
    }
    if (this.linesOnly) {
      const words = this.words;
      let w = words.length;
      while (w--) {
        const $word = words[w];
        $word.replaceWith($word.textContent);
      }
      words.length = 0;
    }
    if (this.accessible && (canSplitLines || !isCached)) {
      const $accessible = doc.createElement("span");
      $accessible.style.cssText = `position:absolute;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);width:1px;height:1px;white-space:nowrap;`;
      $accessible.innerHTML = this.html;
      $el.insertBefore($accessible, $el.firstChild);
      this.lines.forEach(setAriaHidden);
      this.words.forEach(setAriaHidden);
      this.chars.forEach(setAriaHidden);
    }
    this.width = /** @type {HTMLElement} */
    $el.offsetWidth;
    if (canSplitLines || clearCache) {
      this.effects.forEach((effect2, i) => this.effectsCleanups[i] = effect2(this));
    }
    return this;
  }
  refresh() {
    this.split(true);
  }
}
const splitText = (target, parameters) => new TextSplitter(target, parameters);
/**
 * Anime.js - text - ESM
 * @version v4.5.0
 * @license MIT
 * @copyright 2026 - Julian Garnier
 */
const expandCharRanges = (str) => {
  let result = "";
  for (let i = 0, l = str.length; i < l; i++) {
    if (i + 2 < l && str[i + 1] === "-" && str.charCodeAt(i) < str.charCodeAt(i + 2)) {
      const start = str.charCodeAt(i);
      const end = str.charCodeAt(i + 2);
      for (let c = start; c <= end; c++) result += String.fromCharCode(c);
      i += 2;
    } else {
      result += str[i];
    }
  }
  return result;
};
const charSets = {
  lowercase: "a-z",
  uppercase: "A-Z",
  numbers: "0-9",
  symbols: "!%#_|*+=",
  braille: "⠀-⣿",
  blocks: "▀-▟",
  shades: "░-▓"
};
const originalTexts = /* @__PURE__ */ new WeakMap();
const scrambleText = (params = {}) => {
  if (!params) params = {};
  const charsParam = params.chars;
  const easeFn = parseEase(params.ease || "linear");
  const text2 = params.text;
  const fromParam = params.from;
  const reversed = params.reversed || false;
  const perturbation = params.perturbation || 0;
  const cursorParam = params.cursor;
  const cursorChars = cursorParam === true ? "_" : typeof cursorParam === "number" ? String.fromCharCode(cursorParam) : typeof cursorParam === "string" ? cursorParam : "";
  const cursorLen = cursorChars.length;
  const seed = params.seed || 0;
  const override = params.override !== void 0 ? params.override : true;
  const revealRate = params.revealRate || 60;
  const interval = 1e3 * globals.timeScale / revealRate;
  const settleDuration = params.settleDuration || 300 * globals.timeScale;
  const settleRate = params.settleRate || 30;
  const durationParam = params.duration;
  const revealDelayParam = params.revealDelay;
  const delayParam = params.delay;
  const onChange = params.onChange || noop;
  return (target, index, targets, prevTween) => {
    const rawChars = typeof charsParam === "function" ? charsParam(target, index, targets) : charsParam || "a-zA-Z0-9!%#_";
    const characters = expandCharRanges(charSets[rawChars] || rawChars);
    const totalChars = characters.length - 1;
    const duration = typeof durationParam === "function" ? durationParam(target, index, targets) : durationParam;
    const revealDelay = typeof revealDelayParam === "function" ? revealDelayParam(target, index, targets) : revealDelayParam || 0;
    const delay = typeof delayParam === "function" ? delayParam(target, index, targets) : delayParam || 0;
    const rng = seed ? createSeededRandom(seed) : createSeededRandom();
    if (!originalTexts.has(target)) originalTexts.set(target, target.textContent);
    const startingText = prevTween ? prevTween._value : target.textContent;
    const targetText = text2 !== void 0 ? typeof text2 === "function" ? text2(target, index, targets) : text2 : prevTween ? prevTween._value : originalTexts.get(target);
    const settledText = targetText === " " || targetText === "&nbsp;" ? " " : targetText;
    const startLength = startingText === " " ? 0 : startingText.length;
    const endLength = settledText.length;
    const overrideChars = override === true ? characters : typeof override === "string" && override.length > 0 ? expandCharRanges(charSets[
      /** @type {String} */
      override
    ] || /** @type {String} */
    override) : null;
    const totalOverrideChars = overrideChars ? overrideChars.length - 1 : 0;
    const overrideChar = override === " " ? " " : null;
    const animLength = override === "" ? endLength : Math.max(startLength, endLength);
    const animDuration = duration > 0 ? duration : (animLength - 1) * interval + settleDuration;
    const computedDuration = round$1((animDuration + revealDelay) / globals.timeScale, 0) * globals.timeScale;
    const revealDelayRatio = revealDelay > 0 ? round$1(revealDelay / computedDuration, 12) : 0;
    const resolvedFrom = fromParam === void 0 || fromParam === "auto" ? endLength < startLength ? "right" : "left" : fromParam;
    const charOrder = new Int32Array(animLength);
    if (resolvedFrom === "random") {
      for (let i = 0; i < animLength; i++) charOrder[i] = i;
      for (let i = animLength - 1; i > 0; i--) {
        const j = rng(0, i);
        const t = charOrder[i];
        charOrder[i] = charOrder[j];
        charOrder[j] = t;
      }
    } else {
      const ref = resolvedFrom === "right" ? (override === "" || !startLength ? animLength : startLength) - 1 : resolvedFrom === "center" ? ((override === "" || !startLength ? animLength : startLength) - 1) / 2 : typeof resolvedFrom === "number" ? resolvedFrom : 0;
      const abs2 = Math.abs;
      const indices = new Array(animLength);
      for (let i = 0; i < animLength; i++) indices[i] = i;
      indices.sort((a, b) => abs2(a - ref) - abs2(b - ref));
      for (let i = 0; i < animLength; i++) charOrder[indices[i]] = i;
    }
    if (reversed) {
      const last = animLength - 1;
      for (let i = 0; i < animLength; i++) charOrder[i] = last - charOrder[i];
    }
    const settleRatio = round$1(settleDuration / animDuration, 12);
    const settleSpacing = round$1((1 - settleRatio) / animLength, 12);
    const cursorZone = cursorLen * settleSpacing;
    const stepRatio = round$1(1e3 * globals.timeScale / (settleRate * computedDuration), 12);
    const charStarts = new Float32Array(animLength);
    const charEnds = new Float32Array(animLength);
    const scale = perturbation > 0 ? perturbation * settleRatio : 0;
    for (let c = 0; c < animLength; c++) {
      const so = scale > 0 ? (rng(0, 2e3) - 1e3) / 1e3 * scale : 0;
      const eo = scale > 0 ? (rng(0, 2e3) - 1e3) / 1e3 * scale : 0;
      charStarts[c] = charOrder[c] * settleSpacing + so;
      charEnds[c] = Math.ceil((charStarts[c] + settleRatio + eo) / stepRatio) * stepRatio;
    }
    if (endLength < animLength && resolvedFrom !== "left" && resolvedFrom !== "right" && resolvedFrom !== "random") {
      let maxExtraEnd = 0;
      for (let c = endLength; c < animLength; c++) {
        if (charEnds[c] > maxExtraEnd) maxExtraEnd = charEnds[c];
      }
      const targets2 = new Array(endLength);
      for (let c = 0; c < endLength; c++) targets2[c] = c;
      targets2.sort((a, b) => charOrder[a] - charOrder[b]);
      const targetSpacing = (1 - maxExtraEnd) / endLength;
      for (let i = 0; i < endLength; i++) {
        const revealTime = maxExtraEnd + i * targetSpacing;
        if (revealTime > charEnds[targets2[i]]) {
          charEnds[targets2[i]] = revealTime;
        }
      }
    }
    const charCache = new Array(animLength);
    for (let c = 0; c < animLength; c++) {
      charCache[c] = characters[rng(0, totalChars)];
    }
    const overrideCache = overrideChars ? overrideChars === characters ? charCache : new Array(animLength) : null;
    if (overrideCache && overrideCache !== charCache) {
      for (let c = 0; c < animLength; c++) {
        overrideCache[c] = overrideChar || /** @type {String} */
        overrideChars[rng(0, overrideChars.length - 1)];
      }
    }
    let fillStartText = startingText;
    if (!prevTween) {
      if (override === "") {
        fillStartText = "";
      } else if (overrideChars) {
        fillStartText = "";
        for (let c = 0; c < startLength; c++) {
          fillStartText += startingText[c] === " " ? " " : (
            /** @type {Array<String>} */
            overrideCache[c]
          );
        }
      }
    }
    let lastValue = -1;
    let lastStep = -1;
    let scrambled = "";
    const hasOverride = override !== "";
    const hasOverrideChars = !!overrideChars;
    const hasCursor = cursorLen > 0;
    return {
      from: 0,
      to: 1,
      duration: computedDuration,
      delay,
      ease: "linear",
      modifier: (v) => {
        if (v === lastValue) return scrambled;
        lastValue = v;
        if (delay > 0 && v <= 0) {
          scrambled = startingText;
          return startingText;
        }
        if (v <= 0) {
          scrambled = fillStartText;
          return fillStartText;
        }
        if (v >= 1) {
          scrambled = settledText;
          return settledText;
        }
        scrambled = "";
        const currentStep = v / stepRatio | 0;
        const refreshChars = currentStep !== lastStep;
        if (refreshChars) lastStep = currentStep;
        const linear = revealDelayRatio > 0 ? (v - revealDelayRatio) / (1 - revealDelayRatio) : v;
        const t = linear > 0 ? easeFn(linear) : 0;
        for (let c = 0; c < animLength; c++) {
          const charStart = charStarts[c];
          const charEnd = charEnds[c];
          if (t >= charEnd) {
            if (c < endLength) scrambled += settledText[c];
            continue;
          }
          if (t <= 0 || t < charStart) {
            if (hasOverride && c < startLength) {
              if (hasOverrideChars) {
                if (startingText[c] === " ") {
                  scrambled += " ";
                } else {
                  if (refreshChars) overrideCache[c] = overrideChar || /** @type {String} */
                  overrideChars[rng(0, totalOverrideChars)];
                  scrambled += /** @type {Array<String>} */
                  overrideCache[c];
                }
              } else {
                scrambled += startingText[c];
              }
            }
            continue;
          }
          const isSpace = c < endLength && settledText[c] === " " || c < startLength && startingText[c] === " ";
          if (isSpace) {
            scrambled += " ";
          } else if (hasCursor && t - charStart < cursorZone) {
            scrambled += cursorChars[cursorLen - 1 - ((t - charStart) / settleSpacing | 0)];
          } else {
            if (refreshChars) charCache[c] = characters[rng(0, totalChars)];
            scrambled += charCache[c];
          }
        }
        if (refreshChars) onChange(scrambled, t);
        return scrambled;
      }
    };
  };
};
function stop(handle) {
  if (!handle) return;
  if (typeof handle.cancel === "function") handle.cancel();
  else if (typeof handle.pause === "function") handle.pause();
}
function createFx(textEl, original) {
  var handles = [];
  var timeouts = [];
  var intervals = [];
  var cleanups = [];
  var splitter = null;
  function track(handle) {
    handles.push(handle);
    return handle;
  }
  var fx = {
    original,
    reducedMotion: false,
    animate: function(targets, params) {
      return track(animate(targets, params));
    },
    createTimeline: function(params) {
      return track(createTimeline(params));
    },
    set,
    splitText,
    scrambleText,
    utils,
    /**
     * Splits the element with Anime.js, reverting the previous split first.
     */
    resplit: function(target, settings) {
      if (splitter && typeof splitter.revert === "function") splitter.revert();
      splitter = splitText(target, settings);
      return splitter;
    },
    setTimeout: function(callback, delay) {
      var id = setTimeout(callback, delay);
      timeouts.push(id);
      return id;
    },
    setInterval: function(callback, delay) {
      var id = setInterval(callback, delay);
      intervals.push(id);
      return id;
    },
    clearInterval: function(id) {
      clearInterval(id);
    },
    /** Adds an event listener that is removed on cleanup. */
    on: function(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      cleanups.push(function() {
        target.removeEventListener(type, handler, options);
      });
    },
    /** Registers a function to run on cleanup. */
    onCleanup: function(callback) {
      cleanups.push(callback);
    },
    /** Stops everything the effect started. Safe to call more than once. */
    cleanup: function() {
      handles.splice(0).forEach(stop);
      timeouts.splice(0).forEach(clearTimeout);
      intervals.splice(0).forEach(clearInterval);
      while (cleanups.length) {
        try {
          cleanups.pop()();
        } catch (error) {
          console.error("[Aurora] Effect cleanup threw:", error);
        }
      }
      if (splitter && typeof splitter.revert === "function") {
        try {
          splitter.revert();
        } catch (error) {
        }
      }
      splitter = null;
    }
  };
  return fx;
}
var LETTER_EFFECTS = ["airport-flip", "scramble", "sparkles-text", "text-reveal-wall", "letter-swap", "echo-clone"];
var ROTATION_CSS = `
.aurora-headline__char{display:inline-grid;position:relative;vertical-align:baseline;white-space:pre;line-height:inherit}
.aurora-headline__glyph{grid-area:1/1;display:block;line-height:inherit}
.aurora-headline__slot{overflow:hidden}
.aurora-headline__tape{position:absolute;inset:0 0 auto;line-height:inherit;pointer-events:none}
.aurora-headline__tape>span{display:block;line-height:inherit}
.aurora-headline__echo{position:absolute;inset:0;pointer-events:none}
.aurora-headline__spark{position:absolute;width:.28em;height:.28em;right:-.1em;top:0;pointer-events:none;opacity:0}
`;
function span(className, value) {
  var node = document.createElement("span");
  node.className = className;
  if (value !== void 0) node.textContent = value;
  return node;
}
function graphemes(value) {
  return typeof Intl !== "undefined" && Intl.Segmenter ? Array.from(new Intl.Segmenter(void 0, { granularity: "grapheme" }).segment(value), function(s) {
    return s.segment;
  }) : Array.from(value);
}
function rotateLetters(node, value, options, animate2) {
  var effect2 = options.rotationEffect;
  var chars = graphemes(value);
  var stagger2 = Math.min(options.letterStagger, options.duration * 0.65 / Math.max(1, chars.length - 1));
  node.textContent = "";
  chars.forEach(function(char, i) {
    if (/\s/.test(char)) {
      node.appendChild(document.createTextNode(char));
      return;
    }
    var slot = span("aurora-headline__char");
    var glyph = span("aurora-headline__glyph", char);
    slot.appendChild(glyph);
    node.appendChild(slot);
    var delay = i * stagger2;
    if (effect2 === "airport-flip") {
      glyph.style.transformOrigin = "50% 50%";
      animate2(glyph, [
        { transform: "perspective(350px) rotateX(-90deg)", opacity: 0 },
        { transform: "perspective(350px) rotateX(14deg)", opacity: 1, offset: 0.7 },
        { transform: "perspective(350px) rotateX(0)", opacity: 1 }
      ], delay);
    } else if (effect2 === "scramble" || effect2 === "letter-swap") {
      slot.classList.add("aurora-headline__slot");
      var tape = span("aurora-headline__tape");
      var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      var count = effect2 === "scramble" ? 8 : 3;
      for (var j = 0; j < count; j++) {
        tape.appendChild(span("", j === count - 1 || effect2 === "letter-swap" ? char : alphabet[Math.floor(Math.random() * alphabet.length)]));
      }
      glyph.style.visibility = "hidden";
      slot.appendChild(tape);
      animate2(
        tape,
        [{ transform: "translateY(0)" }, { transform: "translateY(-" + 100 * (count - 1) / count + "%)" }],
        delay,
        { easing: effect2 === "scramble" ? "steps(" + (count - 1) + ", end)" : "cubic-bezier(.22,1,.36,1)" },
        function() {
          tape.remove();
          glyph.style.visibility = "";
        }
      );
    } else if (effect2 === "echo-clone") {
      [2, 1].forEach(function(layer) {
        var echo = span("aurora-headline__echo", char);
        echo.style.color = layer === 1 ? options.rotationColor : options.rotationColor2;
        slot.appendChild(echo);
        animate2(echo, [{ transform: "translateY(" + -layer * 0.38 + "em)", opacity: 0.35 / layer }, { transform: "translateY(0)", opacity: 0 }], delay + layer * 35, {}, function() {
          echo.remove();
        });
      });
      animate2(glyph, [{ transform: "translateY(-.7em)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], delay);
    } else if (effect2 === "text-reveal-wall") {
      [-1, 1].forEach(function(row) {
        var echo = span("aurora-headline__echo", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[(i * 7 + (row + 1) * 3) % 26]);
        echo.style.color = options.rotationColor;
        slot.appendChild(echo);
        animate2(echo, [{ opacity: 0, transform: "translateY(" + row * 0.7 + "em) scale(.65)" }, { opacity: 0.45, offset: 0.25 }, { opacity: 0, transform: "translateY(0) scale(.65)" }], (chars.length - 1 - i) * stagger2, {}, function() {
          echo.remove();
        });
      });
      animate2(glyph, [{ opacity: 0, clipPath: "inset(0 100% 0 0)" }, { opacity: 1, clipPath: "inset(0 0% 0 0)" }], (chars.length - 1 - i) * stagger2);
    } else if (effect2 === "sparkles-text") {
      animate2(glyph, [{ opacity: 0, transform: "translateY(.16em)" }, { opacity: 1, transform: "translateY(0)" }], delay);
      var star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      star.setAttribute("class", "aurora-headline__spark");
      star.setAttribute("viewBox", "0 0 20 20");
      star.setAttribute("aria-hidden", "true");
      var path = document.createElementNS(star.namespaceURI, "path");
      path.setAttribute("d", "M10 0Q11 9 20 10Q11 11 10 20Q9 11 0 10Q9 9 10 0Z");
      path.setAttribute("fill", i % 2 ? options.rotationColor : options.rotationColor2);
      star.appendChild(path);
      slot.appendChild(star);
      animate2(star, [{ opacity: 0, transform: "scale(0) rotate(-30deg)" }, { opacity: 1, transform: "scale(1) rotate(0)", offset: 0.45 }, { opacity: 0, transform: "scale(.2) rotate(35deg)" }], delay + options.duration * 0.15, {}, function() {
        star.remove();
      });
    }
  });
}
var nextId = 0;
var NS = "http://www.w3.org/2000/svg";
var SHAPES$1 = {
  underline: ["M8 85 C112 79 258 80 391 84"],
  "double-underline": ["M8 82 C118 77 267 79 392 82", "M26 92 C135 88 260 88 376 90"],
  circle: ["M204 7 C89 2 5 19 6 49 C7 80 105 95 207 93 C322 91 395 76 394 47 C393 22 310 6 204 7"],
  "aurora-orbit": ["M26 73 C-8 52 24 19 153 10 C277 1 380 14 393 42 C403 68 313 91 187 93 C95 94 42 84 26 73", "M61 89 C154 106 296 90 359 66"],
  "aurora-wave": ["M8 85 C38 79 62 79 88 85 S138 91 164 85 S214 79 240 85 S290 91 316 85 S365 79 392 85", "M33 94 C131 90 263 91 368 93"],
  "aurora-spark": ["M8 86 C112 80 259 81 390 85", "M397 7 Q398 16 407 17 Q398 18 397 27 Q396 18 387 17 Q396 16 397 7Z"]
};
var ENTRANCES = {
  "prism-rise": [{ opacity: 0, transform: "translateY(.55em) skewX(-12deg)", filter: "blur(6px)" }, { opacity: 1, transform: "translateY(0) skewX(0)", filter: "blur(0)" }],
  "comet-slide": [{ opacity: 0, transform: "translateX(-.6em) scaleX(1.2)", filter: "blur(5px)" }, { opacity: 1, transform: "translateX(0) scaleX(1)", filter: "blur(0)" }],
  "split-flap": [{ opacity: 0, transform: "perspective(500px) rotateX(-80deg)", transformOrigin: "50% 100%" }, { opacity: 1, transform: "perspective(500px) rotateX(0deg)", transformOrigin: "50% 100%" }],
  "soft-focus": [{ opacity: 0, filter: "blur(12px)", transform: "scale(.94)" }, { opacity: 1, filter: "blur(0)", transform: "scale(1)" }]
};
var CSS = `
.aurora-headline{overflow-wrap:anywhere;white-space:normal}
.aurora-headline__visual{white-space:pre-wrap}
.aurora-headline__center{display:inline-grid;position:relative;max-width:100%;vertical-align:baseline;isolation:isolate;line-height:inherit}
.aurora-headline__word{grid-area:1/1;min-width:0;max-width:100%;overflow-wrap:anywhere;position:relative;z-index:1;line-height:inherit}
.aurora-headline__shape{position:absolute;inset:-.13em -.06em;width:calc(100% + .12em);height:calc(100% + .26em);overflow:visible;pointer-events:none;z-index:0}
.aurora-headline__sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
`;
function headlineWords(options, fallback) {
  var first = options.highlightedText.trim() || fallback.trim() || "Aurora";
  var values = options.animationStyle === "rotating" ? [first].concat(options.rotatingText.split(/\r?\n/)) : [first];
  return values.map(function(s) {
    return s.trim();
  }).filter(function(s, i, all) {
    return s && all.indexOf(s) === i;
  });
}
function initHeadline(el, options, ctx) {
  var target = options.target ? el.querySelector(options.target) || el : el;
  var savedNodes = Array.from(target.childNodes);
  var words = headlineWords(options, target.textContent);
  var index = 0, timer = null, destroyed = false, completed = false;
  var paused = !options.headlineAutoplay, hovering = false, focused = false;
  var rect = el.getBoundingClientRect();
  var inView = options.trigger === "load" && rect.bottom >= 0 && rect.top < (window.innerHeight || 800);
  var animations = /* @__PURE__ */ new Set();
  var paths = [], marker = null;
  ctx.style("text-headline", CSS + ROTATION_CSS);
  function span2(cls, text2) {
    var node = document.createElement("span");
    node.className = cls;
    if (text2 !== void 0) node.textContent = text2;
    return node;
  }
  var root = span2("aurora-headline");
  var visual = span2("aurora-headline__visual");
  visual.setAttribute("aria-hidden", "true");
  var center2 = span2("aurora-headline__center");
  visual.appendChild(span2("aurora-headline__before", options.beforeText.trim() ? options.beforeText.trim() + " " : ""));
  visual.appendChild(center2);
  visual.appendChild(span2("aurora-headline__after", options.afterText.trim() ? " " + options.afterText.trim() : ""));
  var wordNodes = words.map(function(word) {
    var node = span2("aurora-headline__word", word);
    center2.appendChild(node);
    return node;
  });
  var accessible = [options.beforeText.trim(), words.join(", "), options.afterText.trim()].filter(Boolean).join(" ");
  root.appendChild(span2("aurora-headline__sr", accessible));
  root.appendChild(visual);
  while (target.firstChild) target.removeChild(target.firstChild);
  target.appendChild(root);
  function svgNode(tag, attributes) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attributes).forEach(function(key2) {
      node.setAttribute(key2, String(attributes[key2]));
    });
    return node;
  }
  if (options.animationStyle === "highlighted" && options.animationShape === "text-highlighter") {
    marker = createHighlighter(wordNodes[0], words[0], options.headlineColor);
    marker.className = "aurora-headline__marker";
    marker.style.transform = "scaleX(1) rotate(-1deg)";
    marker.style.background = "linear-gradient(100deg, color-mix(in srgb, " + options.headlineColor + " 55%, transparent), color-mix(in srgb, " + options.headlineColor2 + " 55%, transparent))";
    center2.appendChild(marker);
    wordNodes[0].textContent = words[0];
  } else if (options.animationStyle === "highlighted") {
    var id = "aurora-headline-gradient-" + ++nextId;
    var svg = svgNode("svg", { viewBox: "0 0 400 100", preserveAspectRatio: "none", class: "aurora-headline__shape", "aria-hidden": "true", focusable: "false" });
    var defs = svgNode("defs", {}), gradient2 = svgNode("linearGradient", { id, x1: "0%", y1: "0%", x2: "100%", y2: "60%" });
    gradient2.appendChild(svgNode("stop", { offset: "0%", "stop-color": options.headlineColor }));
    gradient2.appendChild(svgNode("stop", { offset: "100%", "stop-color": options.headlineColor2 }));
    defs.appendChild(gradient2);
    svg.appendChild(defs);
    SHAPES$1[options.animationShape].forEach(function(d, i) {
      var path = svgNode("path", { d, fill: "none", stroke: "url(#" + id + ")", "stroke-width": options.strokeWidth, "stroke-linecap": "round", "stroke-linejoin": "round", "vector-effect": "non-scaling-stroke", pathLength: "100" });
      if (i) {
        path.setAttribute("stroke-width", String(options.strokeWidth * 0.7));
        path.setAttribute("opacity", ".65");
      }
      paths.push(path);
      svg.appendChild(path);
    });
    center2.appendChild(svg);
  }
  function show() {
    wordNodes.forEach(function(node, i) {
      node.style.visibility = i === index ? "visible" : "hidden";
      node.style.opacity = i === index ? "1" : "0";
    });
    root.dataset.headlineIndex = String(index);
  }
  function clearTimer() {
    clearTimeout(timer);
    timer = null;
  }
  function stopAnimations() {
    animations.forEach(function(a) {
      a.cancel();
    });
    animations.clear();
    wordNodes.forEach(function(node, i) {
      node.textContent = words[i];
    });
    paths.forEach(function(path) {
      path.style.opacity = "";
    });
    if (marker) marker.style.opacity = "";
  }
  function animate2(node, frames, delay, settings, finish) {
    if (ctx.reducedMotion || typeof node.animate !== "function") {
      if (finish) finish();
      return;
    }
    var a = node.animate(frames, Object.assign({ duration: options.duration, delay: delay || 0, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }, settings));
    animations.add(a);
    a.onfinish = function() {
      if (finish) finish();
      animations.delete(a);
      a.cancel();
    };
  }
  function cycleDuration() {
    if (options.animationStyle === "highlighted") return options.duration * (paths.length > 1 ? 1.35 : 1) + options.holdDuration + (options.headlineLoop ? 220 : 0);
    var extra = LETTER_EFFECTS.indexOf(options.rotationEffect) >= 0 ? options.duration * 0.8 : options.duration * 0.12;
    return options.duration + extra + options.holdDuration;
  }
  function motion() {
    stopAnimations();
    show();
    if (ctx.reducedMotion) return;
    if (marker) {
      var duration = options.headlineLoop ? cycleDuration() : options.duration;
      var drawn = options.duration / duration;
      var frames = [
        { transform: "scaleX(0) rotate(-1deg)", opacity: 1, offset: 0, easing: "cubic-bezier(.455,.03,.515,.955)" },
        { transform: "scaleX(1) rotate(-1deg)", opacity: 1, offset: drawn }
      ];
      if (options.headlineLoop) frames.push(
        { transform: "scaleX(1) rotate(-1deg)", opacity: 1, offset: 1 - 220 / duration },
        { transform: "scaleX(1) rotate(-1deg)", opacity: 0, offset: 1 }
      );
      animate2(marker, frames, 0, { duration, easing: "linear" }, options.headlineLoop ? function() {
        marker.style.opacity = "0";
      } : void 0);
    } else if (options.animationStyle === "highlighted") {
      paths.forEach(function(path, i) {
        var delay = i * options.duration * 0.8;
        var drawDuration = options.duration * (i ? 0.55 : 1);
        var duration2 = options.headlineLoop ? cycleDuration() - delay : drawDuration;
        var drawn2 = options.headlineLoop ? drawDuration / duration2 : 1;
        var alpha = i ? 0.65 : 1;
        var frames2 = [
          { strokeDasharray: "100 100", strokeDashoffset: "100", opacity: 0, offset: 0 },
          { strokeDasharray: "100 100", strokeDashoffset: "98", opacity: alpha, offset: drawn2 * 0.08 },
          { strokeDasharray: "100 100", strokeDashoffset: "0", opacity: alpha, offset: drawn2 }
        ];
        if (options.headlineLoop) frames2.push(
          { strokeDasharray: "100 100", strokeDashoffset: "0", opacity: alpha, offset: 1 - 220 / duration2 },
          { strokeDasharray: "100 100", strokeDashoffset: "0", opacity: 0, offset: 1 }
        );
        animate2(path, frames2, delay, { duration: duration2, easing: "linear" }, options.headlineLoop ? function() {
          path.style.opacity = "0";
        } : void 0);
      });
    } else if (ENTRANCES[options.rotationEffect]) animate2(wordNodes[index], ENTRANCES[options.rotationEffect]);
    else rotateLetters(wordNodes[index], words[index], options, animate2);
    ctx.emit("headline-change", { index, text: words[index], style: options.animationStyle });
  }
  function canPlay() {
    return !destroyed && !paused && !hovering && !focused && !document.hidden && inView && !ctx.reducedMotion;
  }
  function schedule(delay) {
    clearTimer();
    if (!canPlay() || completed) return;
    if (!options.headlineLoop && (options.animationStyle === "highlighted" || index === words.length - 1)) {
      completed = true;
      return;
    }
    if (options.animationStyle === "rotating" && words.length < 2) return;
    timer = setTimeout(function() {
      timer = null;
      if (!canPlay()) return;
      if (options.animationStyle === "rotating") index = (index + 1) % words.length;
      motion();
      schedule();
    }, cycleDuration());
  }
  function sync2() {
    if (!canPlay()) {
      clearTimer();
      animations.forEach(function(a) {
        a.pause();
      });
    } else {
      animations.forEach(function(a) {
        a.play();
      });
      schedule();
    }
  }
  function start() {
    clearTimer();
    if (!canPlay() || completed) return;
    timer = setTimeout(function() {
      timer = null;
      if (canPlay()) {
        motion();
        schedule();
      }
    }, options.delay);
  }
  function replay() {
    if (destroyed) return;
    index = 0;
    completed = false;
    paused = false;
    stopAnimations();
    show();
    start();
  }
  ctx.onDestroy(function() {
    destroyed = true;
    clearTimer();
    stopAnimations();
    while (target.firstChild) target.removeChild(target.firstChild);
    savedNodes.forEach(function(node) {
      target.appendChild(node);
    });
  });
  ctx.on(document, "visibilitychange", sync2);
  if (options.pauseOnHover) {
    ctx.on(el, "pointerenter", function() {
      hovering = true;
      sync2();
    });
    ctx.on(el, "pointerleave", function() {
      hovering = false;
      sync2();
    });
    ctx.on(el, "focusin", function() {
      focused = true;
      sync2();
    });
    ctx.on(el, "focusout", function(e) {
      focused = !!(e.relatedTarget && el.contains(e.relatedTarget));
      sync2();
    });
  }
  ctx.onReducedMotionChange(function() {
    clearTimer();
    stopAnimations();
    show();
    if (!ctx.reducedMotion) start();
  });
  ctx.observe(el, {
    threshold: Math.min(options.threshold, 0.05),
    once: false,
    onEnter: function() {
      var wasVisible = inView;
      inView = true;
      if (!wasVisible) {
        if (animations.size) sync2();
        else start();
      }
    },
    onLeave: function() {
      inView = false;
      sync2();
    }
  });
  show();
  start();
  return {
    replay,
    api: {
      pause: function() {
        paused = true;
        sync2();
      },
      play: function() {
        paused = false;
        if (completed) replay();
        else sync2();
      },
      next: function() {
        if (destroyed || options.animationStyle !== "rotating") return;
        index = (index + 1) % words.length;
        completed = false;
        motion();
        schedule();
      },
      get index() {
        return index;
      }
    }
  };
}
var text = defineModule({
  name: "text",
  schema: schema$4,
  init: function(el, options, ctx) {
    if (options.mode === "headline") return initHeadline(el, options, ctx);
    var effect2 = effects[options.effect];
    if (!effect2) {
      ctx.warn('Unknown effect "' + options.effect + '".');
      return {};
    }
    var textEl = options.target ? el.querySelector(options.target) || el : el;
    var pristineHTML = textEl.innerHTML;
    var pristineStyle = textEl.getAttribute("style");
    var pristineLabel = textEl.getAttribute("aria-label");
    var original = textEl.textContent;
    var fx = null;
    var units = [];
    var played = false;
    function restore() {
      textEl.innerHTML = pristineHTML;
      if (pristineStyle === null) textEl.removeAttribute("style");
      else textEl.setAttribute("style", pristineStyle);
      if (pristineLabel === null) textEl.removeAttribute("aria-label");
      else textEl.setAttribute("aria-label", pristineLabel);
    }
    function prepare() {
      if (fx) fx.cleanup();
      restore();
      fx = createFx(textEl, original);
      played = false;
      if (effect2.selfManaged) {
        units = [];
        textEl.style.opacity = "0";
      } else {
        units = splitText$1(textEl, options.split);
        units.forEach(function(unit) {
          unit.style.opacity = "0";
        });
      }
      ctx.emit("split", { textEl, units });
      bindHover();
    }
    function bindHover() {
      if (!options.hoverScatter || !units.length) return;
      var intensity = options.hoverIntensity;
      var duration = options.hoverDuration;
      var random2 = function(min, max) {
        return fx.utils.random(min, max);
      };
      fx.on(el, "pointerenter", function() {
        units.forEach(function(unit) {
          fx.animate(unit, {
            translateX: random2(-intensity, intensity),
            translateY: random2(-intensity, intensity),
            rotate: random2(-intensity, intensity) / 2,
            duration,
            ease: "outQuart"
          });
        });
      });
      fx.on(el, "pointerleave", function() {
        units.forEach(function(unit) {
          fx.animate(unit, {
            translateX: 0,
            translateY: 0,
            rotate: 0,
            duration,
            ease: "outElastic(1,.6)"
          });
        });
      });
    }
    function run() {
      if (played && !options.replay) return;
      played = true;
      if (effect2.selfManaged) textEl.style.opacity = "0";
      else units.forEach(function(unit) {
        unit.style.opacity = "0";
      });
      effect2.run(units, options, textEl, fx);
      ctx.emit("play", { effect: options.effect });
    }
    if (ctx.reducedMotion) return {};
    prepare();
    if (options.trigger === "load") {
      run();
    } else {
      ctx.observe(el, {
        threshold: Math.min(options.threshold, 0.05),
        once: !options.replay,
        onEnter: run,
        onLeave: options.replay ? prepare : void 0
      });
      var timer = setTimeout(function() {
        if (played) return;
        var rect = el.getBoundingClientRect();
        var viewport = window.innerHeight || document.documentElement.clientHeight;
        if (rect.bottom <= 0 || rect.bottom > 0 && rect.top < viewport) run();
      }, 200);
      ctx.onDestroy(function() {
        clearTimeout(timer);
      });
    }
    ctx.onDestroy(function() {
      if (fx) fx.cleanup();
      fx = null;
      restore();
    });
    return {
      replay: function() {
        prepare();
        requestAnimationFrame(run);
      }
    };
  }
});
var DIRECTIONS = ["up", "down", "left", "right", "none"];
function vec(direction, amount) {
  switch (direction) {
    case "up":
      return [0, amount];
    case "down":
      return [0, -amount];
    case "left":
      return [amount, 0];
    case "right":
      return [-amount, 0];
    default:
      return [0, 0];
  }
}
function move(x, y, unit) {
  var u = unit || "px";
  return "translate3d(" + x + u + "," + y + u + ",0)";
}
function sign(direction) {
  return direction === "down" || direction === "right" ? 1 : -1;
}
var REST = "translate3d(0,0,0)";
var families = {
  fade: function(direction, distance) {
    var v = vec(direction, distance);
    return [
      { opacity: 0, transform: move(v[0], v[1]) },
      { opacity: 1, transform: REST }
    ];
  },
  slide: function(direction) {
    var v = vec(direction, 100);
    return [
      { transform: move(v[0], v[1], "%") },
      { transform: REST }
    ];
  },
  zoom: function(direction, distance) {
    var v = vec(direction, distance);
    return [
      { opacity: 0, transform: move(v[0], v[1]) + " scale(0.3)" },
      { opacity: 1, transform: REST + " scale(1)" }
    ];
  },
  bounce: function(direction, distance) {
    if (direction === "none") {
      return [
        { offset: 0, opacity: 0, transform: "scale(0.3)" },
        { offset: 0.2, transform: "scale(1.1)" },
        { offset: 0.4, transform: "scale(0.9)" },
        { offset: 0.6, opacity: 1, transform: "scale(1.03)" },
        { offset: 0.8, transform: "scale(0.97)" },
        { offset: 1, opacity: 1, transform: "scale(1)" }
      ];
    }
    var base = distance * 4;
    var factors = [1, -0.08, 0.04, -0.02, 0];
    var offsets = [0, 0.6, 0.75, 0.9, 1];
    return factors.map(function(f, i) {
      var v = vec(direction, base * f);
      var frame = { offset: offsets[i], transform: move(v[0], v[1]) };
      frame.opacity = i === 0 ? 0 : 1;
      return frame;
    });
  },
  rotate: function(direction, distance) {
    var v = vec(direction, distance);
    var angle = direction === "none" ? -180 : (direction === "left" || direction === "right" ? 90 : 45) * sign(direction);
    return [
      { opacity: 0, transform: move(v[0], v[1]) + " rotate(" + angle + "deg)" },
      { opacity: 1, transform: REST + " rotate(0deg)" }
    ];
  },
  flip: function(direction) {
    var axis = direction === "left" || direction === "right" ? "rotateY" : "rotateX";
    var s = direction === "none" ? 1 : -sign(direction);
    function frame(angle, extra) {
      return Object.assign({ transform: "perspective(400px) " + axis + "(" + angle + "deg)" }, extra);
    }
    return [
      frame(90 * s, { offset: 0, opacity: 0 }),
      frame(-20 * s, { offset: 0.4 }),
      frame(10 * s, { offset: 0.6, opacity: 1 }),
      frame(-5 * s, { offset: 0.8 }),
      frame(0, { offset: 1, opacity: 1 })
    ];
  },
  blur: function(direction, distance) {
    var v = vec(direction, distance);
    return [
      { opacity: 0, filter: "blur(12px)", transform: move(v[0], v[1]) },
      { opacity: 1, filter: "blur(0px)", transform: REST }
    ];
  },
  focus: function() {
    return [
      { opacity: 0, filter: "blur(20px)", transform: "scale(1.15)" },
      { opacity: 1, filter: "blur(0px)", transform: "scale(1)" }
    ];
  },
  // Emphasis animations: the element is already visible and returns to its
  // natural state. They ignore `direction` and never hide the children first.
  pulse: function() {
    return [
      { transform: "scale(1)" },
      { offset: 0.5, transform: "scale(1.08)" },
      { transform: "scale(1)" }
    ];
  },
  shake: function(direction, distance) {
    var d = Math.max(4, distance / 3);
    return [
      { transform: "translate3d(0,0,0)" },
      { offset: 0.1, transform: move(-d, 0) },
      { offset: 0.3, transform: move(d, 0) },
      { offset: 0.5, transform: move(-d, 0) },
      { offset: 0.7, transform: move(d, 0) },
      { offset: 0.9, transform: move(-d / 2, 0) },
      { transform: "translate3d(0,0,0)" }
    ];
  },
  tada: function() {
    return [
      { transform: "scale(1) rotate(0deg)" },
      { offset: 0.1, transform: "scale(0.9) rotate(-3deg)" },
      { offset: 0.3, transform: "scale(1.1) rotate(3deg)" },
      { offset: 0.5, transform: "scale(1.1) rotate(-3deg)" },
      { offset: 0.7, transform: "scale(1.1) rotate(3deg)" },
      { offset: 0.9, transform: "scale(1.1) rotate(-3deg)" },
      { transform: "scale(1) rotate(0deg)" }
    ];
  },
  "rubber-band": function() {
    return [
      { transform: "scale(1,1)" },
      { offset: 0.3, transform: "scale(1.25,0.75)" },
      { offset: 0.4, transform: "scale(0.75,1.25)" },
      { offset: 0.5, transform: "scale(1.15,0.85)" },
      { offset: 0.65, transform: "scale(0.95,1.05)" },
      { offset: 0.75, transform: "scale(1.05,0.95)" },
      { transform: "scale(1,1)" }
    ];
  },
  wobble: function() {
    return [
      { transform: "translate3d(0,0,0) rotate(0deg)" },
      { offset: 0.15, transform: "translate3d(-25%,0,0) rotate(-5deg)" },
      { offset: 0.3, transform: "translate3d(20%,0,0) rotate(3deg)" },
      { offset: 0.45, transform: "translate3d(-15%,0,0) rotate(-3deg)" },
      { offset: 0.6, transform: "translate3d(10%,0,0) rotate(2deg)" },
      { offset: 0.75, transform: "translate3d(-5%,0,0) rotate(-1deg)" },
      { transform: "translate3d(0,0,0) rotate(0deg)" }
    ];
  }
};
var ENTRANCE_FAMILIES = ["fade", "slide", "zoom", "bounce", "rotate", "flip", "blur", "focus"];
var EMPHASIS_FAMILIES = ["pulse", "shake", "tada", "rubber-band", "wobble"];
function isEmphasis(name) {
  return EMPHASIS_FAMILIES.indexOf(name) !== -1;
}
function buildKeyframes(family, direction, distance) {
  var make = families[family];
  if (!make) return [];
  return make(direction, distance);
}
var schema$3 = {
  primary: "animation",
  options: {
    animation: {
      type: "enum",
      default: "fade",
      values: ["none"].concat(ENTRANCE_FAMILIES, EMPHASIS_FAMILIES),
      label: "Animation",
      description: 'Entrance or emphasis animation. "none" keeps only the hover effect.',
      group: "Entrance"
    },
    direction: {
      type: "enum",
      default: "up",
      values: DIRECTIONS,
      label: "Direction of travel",
      description: '"up" starts below the final position and moves up.',
      group: "Entrance"
    },
    alternate: {
      type: "enum",
      default: "none",
      values: ["none", "horizontal", "vertical"],
      label: "Alternate direction",
      description: "Alternates the direction between even and odd children.",
      group: "Entrance"
    },
    distance: {
      type: "number",
      default: 32,
      min: 0,
      max: 400,
      unit: "px",
      label: "Travel distance",
      group: "Entrance"
    },
    duration: {
      type: "number",
      default: 600,
      min: 50,
      max: 5e3,
      unit: "ms",
      label: "Duration",
      group: "Timing"
    },
    delay: {
      type: "number",
      default: 0,
      min: 0,
      max: 1e4,
      unit: "ms",
      label: "Initial delay",
      group: "Timing"
    },
    stagger: {
      type: "number",
      default: 150,
      min: 0,
      max: 2e3,
      unit: "ms",
      label: "Stagger between children",
      group: "Timing"
    },
    easing: {
      type: "string",
      default: "cubic-bezier(0.22, 1, 0.36, 1)",
      label: "Easing",
      description: "Any CSS easing function.",
      group: "Timing"
    },
    trigger: {
      type: "enum",
      default: "scroll",
      values: ["scroll", "load"],
      label: "Trigger",
      group: "Trigger"
    },
    threshold: {
      type: "number",
      default: 0.15,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Visible ratio",
      description: "How much of the element must be visible before the animation starts.",
      group: "Trigger",
      when: { trigger: "scroll" }
    },
    replay: {
      type: "boolean",
      default: false,
      label: "Replay on every scroll",
      group: "Trigger",
      when: { trigger: "scroll" }
    },
    selector: {
      type: "selector",
      default: "",
      label: "Target selector",
      description: "CSS selector for the elements to animate. Empty animates the direct children.",
      group: "Targets"
    },
    root: {
      type: "selector",
      default: "",
      label: "Root selector",
      description: "CSS selector, relative to the element, of the node whose children are animated. Empty uses the element itself. Builder adapters set this to skip wrapper nodes.",
      group: "Targets"
    },
    depth: {
      type: "number",
      default: 1,
      min: 1,
      max: 10,
      label: "Depth",
      description: "Without a selector: how many levels of descendants to animate.",
      group: "Targets",
      when: { selector: "" }
    },
    hover: {
      type: "boolean",
      default: false,
      label: "Hover effect",
      group: "Hover"
    },
    hoverPreset: {
      type: "enum",
      default: "lift",
      values: ["lift", "slide", "scale", "tilt", "flip-x", "flip-y", "custom"],
      label: "Hover preset",
      group: "Hover",
      when: { hover: true }
    },
    hoverX: { type: "number", default: 0, min: -200, max: 200, unit: "px", label: "Custom: move X", group: "Hover", when: { hover: true, hoverPreset: "custom" } },
    hoverY: { type: "number", default: -10, min: -200, max: 200, unit: "px", label: "Custom: move Y", group: "Hover", when: { hover: true, hoverPreset: "custom" } },
    hoverScale: { type: "number", default: 1.05, min: 0.5, max: 3, step: 0.01, label: "Custom: scale", group: "Hover", when: { hover: true, hoverPreset: "custom" } },
    hoverRotate: { type: "number", default: 0, min: -180, max: 180, unit: "deg", label: "Custom: rotate", group: "Hover", when: { hover: true, hoverPreset: "custom" } },
    hoverSkew: { type: "number", default: 0, min: -60, max: 60, unit: "deg", label: "Custom: skew", group: "Hover", when: { hover: true, hoverPreset: "custom" } },
    hoverDuration: {
      type: "number",
      default: 300,
      min: 0,
      max: 2e3,
      unit: "ms",
      label: "Hover duration",
      group: "Hover",
      when: { hover: true }
    },
    proximity: {
      type: "boolean",
      default: false,
      label: "Proximity wave",
      description: "Neighbours of the hovered child follow the hover effect with a falloff.",
      group: "Hover",
      when: { hover: true }
    },
    proximityIntensity: {
      type: "number",
      default: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Proximity intensity",
      group: "Hover",
      when: { hover: true, proximity: true }
    }
  }
};
function safeMatches(el, selector) {
  try {
    return el.matches(selector);
  } catch (error) {
    return false;
  }
}
function resolveChildren(root, options) {
  var selector = options.selector || "";
  var depth = Math.max(1, Math.floor(options.depth || 1));
  if (selector) {
    var found;
    try {
      found = Array.prototype.slice.call(root.querySelectorAll(selector));
    } catch (error) {
      return [];
    }
    return found.filter(function(el) {
      if (el === root) return false;
      var parent = el.parentElement;
      while (parent && parent !== root) {
        if (safeMatches(parent, selector)) return false;
        parent = parent.parentElement;
      }
      return true;
    });
  }
  var result = [];
  var level = Array.prototype.slice.call(root.children);
  for (var d = 1; d <= depth && level.length; d++) {
    result = result.concat(level);
    if (d === depth) break;
    var next = [];
    level.forEach(function(el) {
      Array.prototype.push.apply(next, Array.prototype.slice.call(el.children));
    });
    level = next;
  }
  return result;
}
function supportsWaapi() {
  return typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
}
function directionFor(options, index) {
  var even = index % 2 === 0;
  if (options.alternate === "horizontal") return even ? "left" : "right";
  if (options.alternate === "vertical") return even ? "up" : "down";
  return options.direction;
}
function hide(el) {
  el.style.opacity = "0";
}
function reveal(el) {
  el.style.opacity = "";
}
function play(el, options, index) {
  reveal(el);
  if (options.animation === "none" || !supportsWaapi()) return null;
  var frames = buildKeyframes(options.animation, directionFor(options, index), options.distance);
  if (!frames.length) return null;
  return el.animate(frames, {
    duration: options.duration,
    delay: options.delay + index * options.stagger,
    easing: options.easing,
    fill: "backwards"
  });
}
function hidesChildren(options) {
  return options.animation !== "none" && !isEmphasis(options.animation);
}
var EASING = "cubic-bezier(0.25, 1, 0.5, 1)";
function presetParams(options) {
  var p = { x: 0, y: 0, scale: 1, rotate: 0, skew: 0, flipX: 0, flipY: 0 };
  switch (options.hoverPreset) {
    case "lift":
      p.y = -10;
      break;
    case "slide":
      p.x = 10;
      break;
    case "scale":
      p.scale = 1.05;
      break;
    case "tilt":
      p.rotate = -4;
      break;
    case "flip-x":
      p.flipX = 180;
      break;
    case "flip-y":
      p.flipY = 180;
      break;
    case "custom":
      p.x = options.hoverX;
      p.y = options.hoverY;
      p.scale = options.hoverScale;
      p.rotate = options.hoverRotate;
      p.skew = options.hoverSkew;
      break;
  }
  return p;
}
function transformFor(p, factor) {
  var parts = [];
  if (p.flipX || p.flipY) parts.push("perspective(600px)");
  parts.push("translate3d(" + p.x * factor + "px," + p.y * factor + "px,0)");
  parts.push("scale(" + (1 + (p.scale - 1) * factor) + ")");
  if (p.rotate) parts.push("rotate(" + p.rotate * factor + "deg)");
  if (p.skew) parts.push("skewX(" + p.skew * factor + "deg)");
  if (p.flipY) parts.push("rotateX(" + p.flipY * factor + "deg)");
  if (p.flipX) parts.push("rotateY(" + p.flipX * factor + "deg)");
  return parts.join(" ");
}
function center(el) {
  var r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function mountHover(root, children2, options, ctx, instant) {
  var params = presetParams(options);
  var duration = instant ? 0 : options.hoverDuration;
  children2.forEach(function(child) {
    child.style.setProperty("transition", "transform " + duration + "ms " + EASING, "important");
    child.style.willChange = "transform";
  });
  function apply(hoveredIndex) {
    if (hoveredIndex === -1) {
      children2.forEach(function(child) {
        child.style.transform = "";
      });
      return;
    }
    var origin = center(children2[hoveredIndex]);
    var centers = children2.map(center);
    var radius = 0;
    if (options.proximity) {
      var nearest = Infinity;
      centers.forEach(function(c, i) {
        if (i === hoveredIndex) return;
        var d = Math.hypot(c.x - origin.x, c.y - origin.y);
        if (d > 0 && d < nearest) nearest = d;
      });
      radius = (nearest === Infinity ? 150 : nearest) * 2.2;
    }
    children2.forEach(function(child, i) {
      var factor = 0;
      if (i === hoveredIndex) {
        factor = 1;
      } else if (options.proximity) {
        var d = Math.hypot(centers[i].x - origin.x, centers[i].y - origin.y);
        if (d < radius) factor = (1 - d / radius) * options.proximityIntensity;
      }
      child.style.transform = factor > 1e-3 ? transformFor(params, factor) : "";
    });
  }
  children2.forEach(function(child, index) {
    ctx.on(child, "pointerenter", function() {
      apply(index);
    });
  });
  ctx.on(root, "pointerleave", function() {
    apply(-1);
  });
  return function unmount() {
    children2.forEach(function(child) {
      child.style.transition = "";
      child.style.willChange = "";
      child.style.transform = "";
    });
  };
}
var children = defineModule({
  name: "children",
  schema: schema$3,
  init: function(el, options, ctx) {
    var root = options.root && el.querySelector(options.root) || el;
    var targets = resolveChildren(root, options);
    var animations = [];
    var unmountHover = null;
    var played = false;
    function cancelAnimations() {
      animations.forEach(function(animation) {
        animation.cancel();
      });
      animations = [];
    }
    function run() {
      cancelAnimations();
      played = true;
      targets.forEach(function(child, index) {
        var animation = play(child, options, index);
        if (animation) animations.push(animation);
      });
      ctx.emit("play", { count: targets.length });
    }
    function rewind() {
      cancelAnimations();
      played = false;
      if (hidesChildren(options)) targets.forEach(hide);
    }
    if (options.hover && targets.length) {
      unmountHover = mountHover(el, targets, options, ctx, ctx.reducedMotion);
    }
    if (options.animation !== "none" && targets.length) {
      if (ctx.reducedMotion) {
        targets.forEach(reveal);
      } else if (options.trigger === "load") {
        run();
      } else {
        if (hidesChildren(options)) targets.forEach(hide);
        ctx.observe(el, {
          threshold: options.threshold,
          rootMargin: "0px 0px -30px 0px",
          once: !options.replay,
          onEnter: function() {
            if (!played || options.replay) run();
          },
          onLeave: options.replay ? rewind : void 0
        });
      }
    }
    ctx.onDestroy(function() {
      cancelAnimations();
      if (unmountHover) unmountHover();
      targets.forEach(reveal);
    });
    return {
      replay: function() {
        if (ctx.reducedMotion || options.animation === "none") return;
        rewind();
        requestAnimationFrame(run);
      }
    };
  }
});
var schema$2 = {
  options: {
    dotColor: {
      type: "color",
      default: "#ff7a2f",
      label: "Dot color",
      group: "Appearance"
    },
    ringColor: {
      type: "color",
      default: "#7c6cff",
      label: "Ring color",
      group: "Appearance"
    },
    dotSize: {
      type: "number",
      default: 8,
      min: 2,
      max: 64,
      unit: "px",
      label: "Dot size",
      group: "Appearance"
    },
    ringSize: {
      type: "number",
      default: 24,
      min: 4,
      max: 200,
      unit: "px",
      label: "Ring size",
      group: "Appearance"
    },
    trailDelay: {
      type: "number",
      default: 150,
      min: 0,
      max: 1e3,
      unit: "ms",
      label: "Ring trail delay",
      description: "Approximate time the ring takes to catch up with the dot. 0 makes it follow instantly.",
      group: "Motion"
    },
    interactiveSelector: {
      type: "selector",
      default: "a, button, .cursor-pointer",
      label: "Interactive elements",
      description: "CSS selector for elements that shrink the dot and scale the ring on hover.",
      group: "Hover states"
    },
    interactiveScale: {
      type: "number",
      default: 1.5,
      min: 0.5,
      max: 5,
      step: 0.01,
      label: "Interactive ring scale",
      group: "Hover states"
    },
    imageSelector: {
      type: "selector",
      default: "img, .zoom-target",
      label: "Image elements",
      description: "CSS selector for elements that grow the ring and tint it with the dot color on hover.",
      group: "Hover states"
    },
    imageScale: {
      type: "number",
      default: 2.33,
      min: 0.5,
      max: 5,
      step: 0.01,
      label: "Image ring scale",
      group: "Hover states"
    },
    hideNative: {
      type: "boolean",
      default: false,
      label: "Hide the native cursor",
      description: "Hides the system cursor inside the zone (except over form fields). Off by default for accessibility.",
      group: "Accessibility"
    }
  }
};
var css = [
  ".aurora-cursor-dot,.aurora-cursor-ring{",
  "position:fixed;top:0;left:0;z-index:var(--aurora-cursor-z,9999);",
  "pointer-events:none;opacity:0;transition:opacity 200ms ease;will-change:transform;",
  "}",
  ".aurora-cursor-dot::before,.aurora-cursor-ring::before{",
  'content:"";position:absolute;inset:0;box-sizing:border-box;border-radius:50%;',
  "transform:scale(var(--aurora-cursor-scale,1));",
  "transition:transform 150ms ease,background-color 150ms ease,border-color 150ms ease;",
  "}",
  ".aurora-cursor-dot::before{background:var(--aurora-cursor-color,#ff7a2f);}",
  ".aurora-cursor-ring::before{",
  "border:1px solid var(--aurora-cursor-color,#7c6cff);",
  "background:color-mix(in srgb,var(--aurora-cursor-color,#7c6cff) 12%,transparent);",
  "}",
  ".aurora-cursor-native-hidden,.aurora-cursor-native-hidden *{cursor:none!important;}",
  '.aurora-cursor-native-hidden :is(input,textarea,select,[contenteditable="true"]){cursor:auto!important;}',
  "@media (prefers-reduced-motion:reduce){",
  ".aurora-cursor-dot,.aurora-cursor-ring{display:none!important;}",
  ".aurora-cursor-native-hidden,.aurora-cursor-native-hidden *{cursor:auto!important;}",
  "}",
  "@media (hover:none){",
  ".aurora-cursor-dot,.aurora-cursor-ring{display:none!important;}",
  ".aurora-cursor-native-hidden,.aurora-cursor-native-hidden *{cursor:auto!important;}",
  "}"
].join("");
var EPSILON = 0.1;
var zones = [];
var registered = [];
var dot = null;
var ring = null;
var listening = false;
var stopTicker = null;
var pointer = { x: -100, y: -100, known: false, target: null };
var ringPos = { x: -100, y: -100 };
var hoverDirty = false;
var state = "default";
function createElements() {
  if (dot && ring) return;
  dot = document.createElement("div");
  dot.className = "aurora-cursor-dot";
  dot.setAttribute("aria-hidden", "true");
  ring = document.createElement("div");
  ring.className = "aurora-cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);
  document.body.appendChild(ring);
}
function removeElements() {
  if (dot) dot.remove();
  if (ring) ring.remove();
  dot = null;
  ring = null;
}
function top() {
  return zones.length ? zones[zones.length - 1] : null;
}
function setVisible(visible) {
  if (!dot || !ring) return;
  var value = visible ? "1" : "0";
  dot.style.opacity = value;
  ring.style.opacity = value;
}
function applyAppearance() {
  var zone = top();
  if (!zone || !dot || !ring) return;
  var o = zone.options;
  dot.style.width = o.dotSize + "px";
  dot.style.height = o.dotSize + "px";
  dot.style.setProperty("--aurora-cursor-color", o.dotColor);
  ring.style.width = o.ringSize + "px";
  ring.style.height = o.ringSize + "px";
  applyState(state);
  setVisible(pointer.known);
}
function applyState(next) {
  var zone = top();
  if (!zone || !dot || !ring) return;
  var o = zone.options;
  state = next;
  var scaled = next !== "default";
  dot.style.setProperty("--aurora-cursor-scale", scaled ? "0.6" : "1");
  ring.style.setProperty("--aurora-cursor-scale", String(next === "image" ? o.imageScale : next === "interactive" ? o.interactiveScale : 1));
  ring.style.setProperty("--aurora-cursor-color", next === "image" ? o.dotColor : o.ringColor);
  ring.style.setProperty("--aurora-cursor-trail", o.trailDelay + "ms");
}
function computeState(target) {
  var zone = top();
  if (!zone || !(target instanceof Element)) return "default";
  var o = zone.options;
  try {
    if (o.imageSelector && target.closest(o.imageSelector)) return "image";
    if (o.interactiveSelector && target.closest(o.interactiveSelector)) return "interactive";
  } catch (error) {
  }
  return "default";
}
function refreshHover(target) {
  var next = computeState(target);
  if (next !== state) applyState(next);
}
function render(now2, delta) {
  var zone = top();
  if (!zone || !dot || !ring) return;
  if (hoverDirty) {
    hoverDirty = false;
    refreshHover(pointer.target);
  }
  dot.style.transform = "translate3d(" + pointer.x + "px," + pointer.y + "px,0) translate(-50%,-50%)";
  var trail = zone.options.trailDelay;
  if (trail <= 0) {
    ringPos.x = pointer.x;
    ringPos.y = pointer.y;
  } else {
    var factor = 1 - Math.exp(-delta / (trail / 3));
    ringPos.x += (pointer.x - ringPos.x) * factor;
    ringPos.y += (pointer.y - ringPos.y) * factor;
  }
  ring.style.transform = "translate3d(" + ringPos.x + "px," + ringPos.y + "px,0) translate(-50%,-50%)";
  var settled = Math.abs(pointer.x - ringPos.x) < EPSILON && Math.abs(pointer.y - ringPos.y) < EPSILON;
  if (settled) {
    ringPos.x = pointer.x;
    ringPos.y = pointer.y;
    stopLoop();
  }
}
function startLoop() {
  if (!stopTicker) stopTicker = ticker.add(render);
}
function stopLoop() {
  if (stopTicker) {
    stopTicker();
    stopTicker = null;
  }
}
function onPointerMove(event) {
  if (event.pointerType === "touch") return;
  var first = !pointer.known;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.target = event.target;
  hoverDirty = true;
  if (first) {
    pointer.known = true;
    ringPos.x = pointer.x;
    ringPos.y = pointer.y;
    if (top()) setVisible(true);
  }
  if (top()) startLoop();
}
function onPointerLeaveDocument(event) {
  if (event.relatedTarget === null) {
    pointer.known = false;
    setVisible(false);
  }
}
function listen() {
  if (listening) return;
  listening = true;
  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerout", onPointerLeaveDocument);
}
function unlisten() {
  if (!listening) return;
  listening = false;
  document.removeEventListener("pointermove", onPointerMove, { passive: true });
  document.removeEventListener("pointerout", onPointerLeaveDocument);
}
function enter(zone) {
  var index = zones.indexOf(zone);
  if (index !== -1) zones.splice(index, 1);
  zones.push(zone);
  refreshFromPoint();
  applyAppearance();
  if (pointer.known) startLoop();
}
function leave(zone) {
  var index = zones.indexOf(zone);
  if (index !== -1) zones.splice(index, 1);
  if (zones.length === 0) {
    setVisible(false);
    stopLoop();
    return;
  }
  refreshFromPoint();
  applyAppearance();
}
function refreshFromPoint() {
  if (!pointer.known || typeof document.elementFromPoint !== "function") return;
  var target = document.elementFromPoint(pointer.x, pointer.y);
  if (target) pointer.target = target;
  hoverDirty = true;
}
function syncNativeCursor(zone) {
  zone.el.classList.toggle("aurora-cursor-native-hidden", !!zone.options.hideNative);
}
function mountZone(el, options) {
  var zone = { el, options };
  registered.push(zone);
  createElements();
  listen();
  syncNativeCursor(zone);
  var onEnter = function() {
    enter(zone);
  };
  var onLeave = function() {
    leave(zone);
  };
  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);
  return {
    update: function(next) {
      zone.options = next;
      syncNativeCursor(zone);
      if (top() === zone) {
        hoverDirty = true;
        applyAppearance();
      }
    },
    destroy: function() {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.classList.remove("aurora-cursor-native-hidden");
      leave(zone);
      var index = registered.indexOf(zone);
      if (index !== -1) registered.splice(index, 1);
      if (registered.length === 0) {
        stopLoop();
        unlisten();
        removeElements();
        pointer.known = false;
        pointer.target = null;
        state = "default";
      }
    }
  };
}
var cursor = defineModule({
  name: "cursor",
  schema: schema$2,
  init: function(el, options, ctx) {
    ctx.style("cursor", css);
    var zone = mountZone(el, options);
    return {
      update: function(next) {
        zone.update(next);
      },
      destroy: function() {
        zone.destroy();
      }
    };
  }
});
var VERTEX_SHADER = [
  "attribute vec2 position;",
  "varying vec2 vUv;",
  "void main() {",
  "    vUv = (position + 1.0) * 0.5;",
  "    gl_Position = vec4(position, 0.0, 1.0);",
  "}"
].join("\n");
var GLSL_COMMON = [
  "precision highp float;",
  "uniform vec2 u_resolution;",
  "uniform float u_time;",
  "uniform vec2 u_mouse;",
  "uniform float u_distortion;",
  "uniform float u_swirl;",
  "uniform float u_scale;",
  "uniform float u_angle;",
  "uniform float u_grain_enable;",
  "uniform float u_grain_intensity;",
  "uniform float u_liquid_cursor;",
  "uniform float u_cursor_radius;",
  "uniform int u_stop_count;",
  "uniform vec3 u_stops[6];",
  "uniform float u_offsets[6];",
  "varying vec2 vUv;",
  "mat2 rotate2D(float angle) {",
  "    float s = sin(angle), c = cos(angle);",
  "    return mat2(c, -s, s, c);",
  "}",
  "float hash(vec2 p) {",
  "    p = fract(p * vec2(234.34, 435.345));",
  "    p += dot(p, p + 34.23);",
  "    return fract(p.x * p.y);",
  "}",
  "float noise(vec2 p) {",
  "    vec2 i = floor(p);",
  "    vec2 f = fract(p);",
  "    f = f * f * (3.0 - 2.0 * f);",
  "    float a = hash(i);",
  "    float b = hash(i + vec2(1.0, 0.0));",
  "    float c = hash(i + vec2(0.0, 1.0));",
  "    float d = hash(i + vec2(1.0, 1.0));",
  "    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);",
  "}",
  "float fbm(vec2 p) {",
  "    float val = 0.0, amp = 0.5;",
  "    mat2 rot = rotate2D(0.45);",
  "    for (int i = 0; i < 5; i++) {",
  "        val += amp * noise(p);",
  "        p = rot * p * 2.02;",
  "        amp *= 0.5;",
  "    }",
  "    return val;",
  "}",
  "vec3 sampleGradient(float t) {",
  "    t = clamp(t, 0.0, 1.0);",
  "    vec3 col = u_stops[0];",
  "    if (t <= u_offsets[0]) return u_stops[0];",
  "    for (int i = 0; i < 5; i++) {",
  "        if (t >= u_offsets[i] && t <= u_offsets[i+1]) {",
  "            float factor = (t - u_offsets[i]) / max(0.0001, u_offsets[i+1] - u_offsets[i]);",
  "            col = mix(u_stops[i], u_stops[i+1], factor);",
  "        }",
  "    }",
  "    return col;",
  "}",
  "vec2 applySwirl(vec2 st, float swirlAmount) {",
  "    vec2 center = vec2(0.5);",
  "    vec2 dir = st - center;",
  "    float dist = length(dir);",
  "    float angle = swirlAmount * (1.0 - dist);",
  "    return center + rotate2D(angle) * dir;",
  "}",
  "vec2 applyLiquidCursor(vec2 st) {",
  "    if (u_liquid_cursor < 0.5) return st;",
  "    vec2 mouseNorm = u_mouse / u_resolution;",
  "    vec2 dir = st - mouseNorm;",
  "    float dist = length(dir * vec2(u_resolution.x / u_resolution.y, 1.0));",
  "    float radiusNorm = u_cursor_radius / max(u_resolution.x, u_resolution.y);",
  "    if (dist < radiusNorm) {",
  "        float factor = 1.0 - smoothstep(0.0, radiusNorm, dist);",
  "        float wave = sin(dist * 25.0 - u_time * 4.0) * 0.08 * factor;",
  "        st += normalize(dir + vec2(0.001)) * wave;",
  "    }",
  "    return st;",
  "}"
].join("\n");
var FS_PAPER = [
  GLSL_COMMON,
  "void main() {",
  "    vec2 st = (vUv - 0.5) * u_scale + 0.5;",
  "    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;",
  "    st = applyLiquidCursor(st);",
  "    if (u_swirl > 0.01) st = applySwirl(st, u_swirl * 3.14);",
  "    float distortion = fbm(st * 3.0 + vec2(u_time * 0.05)) * (u_distortion * 0.5);",
  "    float t = st.x + st.y * 0.5 + distortion;",
  "    vec3 col = sampleGradient(fract(t));",
  "    if (u_grain_enable > 0.5) {",
  "        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.25);",
  "        col += vec3(grain);",
  "    }",
  "    gl_FragColor = vec4(col, 1.0);",
  "}"
].join("\n");
var FS_LIQUID = [
  GLSL_COMMON,
  "void main() {",
  "    vec2 st = (vUv - 0.5) * u_scale + 0.5;",
  "    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;",
  "    st = applyLiquidCursor(st);",
  "    if (u_swirl > 0.01) st = applySwirl(st, u_swirl * 4.0);",
  "    vec2 q = vec2(fbm(st * 2.0 + vec2(0.0, u_time * 0.08)), fbm(st * 2.0 + vec2(1.7, u_time * 0.06)));",
  "    vec2 r = vec2(fbm(st + 2.0 * q + vec2(2.8, 5.1) + 0.1 * u_time), fbm(st + 2.0 * q + vec2(7.1, 2.4) + 0.08 * u_time));",
  "    float f = fbm(st + r * (u_distortion * 1.5));",
  "    vec3 col = sampleGradient(clamp(f, 0.0, 1.0));",
  "    if (u_grain_enable > 0.5) {",
  "        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.20);",
  "        col += vec3(grain);",
  "    }",
  "    gl_FragColor = vec4(col, 1.0);",
  "}"
].join("\n");
var FS_WAVE = [
  GLSL_COMMON,
  "void main() {",
  "    vec2 st = (vUv - 0.5) * u_scale + 0.5;",
  "    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;",
  "    st = applyLiquidCursor(st);",
  "    float wave1 = sin(st.x * (8.0 + u_distortion * 10.0) + u_time * 0.8) * 0.15;",
  "    float wave2 = cos(st.y * (6.0 + u_swirl * 8.0) - u_time * 0.6) * 0.15;",
  "    float t = st.y + wave1 + wave2;",
  "    vec3 col = sampleGradient(fract(t));",
  "    if (u_grain_enable > 0.5) {",
  "        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.20);",
  "        col += vec3(grain);",
  "    }",
  "    gl_FragColor = vec4(col, 1.0);",
  "}"
].join("\n");
var FS_SILK = [
  GLSL_COMMON,
  "void main() {",
  "    vec2 st = (vUv - 0.5) * u_scale + 0.5;",
  "    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;",
  "    st = applyLiquidCursor(st);",
  "    float f = fbm(st * (2.0 + u_distortion * 3.0) + vec2(u_time * 0.1));",
  "    vec3 col = sampleGradient(fract(f));",
  "    float sheen = pow(abs(sin(f * 3.1415 + u_time * 0.5)), 4.0) * 0.35;",
  "    col += vec3(sheen);",
  "    if (u_grain_enable > 0.5) {",
  "        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.18);",
  "        col += vec3(grain);",
  "    }",
  "    gl_FragColor = vec4(col, 1.0);",
  "}"
].join("\n");
var FS_STRIPE = [
  GLSL_COMMON,
  "void main() {",
  "    vec2 st = (vUv - 0.5) * u_scale + 0.5;",
  "    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;",
  "    st = applyLiquidCursor(st);",
  "    float stripe = sin(st.x * (12.0 + u_distortion * 20.0) + sin(st.y * 5.0 + u_time) * (u_swirl * 5.0) + u_time * 0.7) * 0.5 + 0.5;",
  "    vec3 col = sampleGradient(stripe);",
  "    if (u_grain_enable > 0.5) {",
  "        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.20);",
  "        col += vec3(grain);",
  "    }",
  "    gl_FragColor = vec4(col, 1.0);",
  "}"
].join("\n");
var FS_AURORA = [
  GLSL_COMMON,
  "void main() {",
  "    vec2 st = (vUv - 0.5) * u_scale + 0.5;",
  "    vec2 rst = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;",
  "    rst = applyLiquidCursor(rst);",
  "    float freq = 1.5 + u_distortion * 4.0;",
  "    float drift = u_time * (0.04 + u_swirl * 0.12);",
  "    float n = fbm(rst * freq + vec2(drift, -drift * 0.6));",
  "    float n2 = fbm(rst * freq * 1.8 + vec2(-drift * 0.7, drift * 0.3) + 4.2);",
  "    float flare = mix(n, n2, 0.5);",
  "",
  "    // Night sky base: a soft vertical gradient, dark navy near the ground",
  "    // fading to near-black at the very top.",
  "    vec3 sky = mix(vec3(0.008, 0.02, 0.04), vec3(0.0, 0.0, 0.015), pow(vUv.y, 0.6));",
  "",
  "    // Vertical mask: the flare is concentrated near the top of the surface",
  "    // (vUv.y approaching 1.0) and fades toward the bottom, with the noise",
  "    // perturbing the fade edge so it reads as a flowing curtain rather than",
  "    // a hard line.",
  "    float edge = vUv.y * 0.75 + flare * 0.35;",
  "    float mask = smoothstep(0.15, 0.75, edge);",
  "    mask *= 0.55 + 0.45 * smoothstep(0.0, 0.3, flare);",
  "",
  "    float t = fract(flare + drift * 0.5);",
  "    vec3 glow = sampleGradient(t);",
  "",
  "    vec3 col = sky + glow * mask * 1.15;",
  "    col = mix(sky, col, clamp(mask * 1.4, 0.0, 1.0));",
  "",
  "    if (u_grain_enable > 0.5) {",
  "        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.15);",
  "        col += vec3(grain);",
  "    }",
  "    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);",
  "}"
].join("\n");
var FS_AURORA_CURTAINS = [
  GLSL_COMMON,
  "void main() {",
  "    vec2 st = (vUv - 0.5) * u_scale + 0.5;",
  "    vec2 rst = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;",
  "    rst = applyLiquidCursor(rst);",
  "    float speed = 0.05 + u_swirl * 0.15;",
  "    vec2 warp = vec2(",
  "        fbm(rst * 2.2 + vec2(u_time * speed, 0.0)),",
  "        fbm(rst * 2.2 + vec2(5.3, u_time * speed * 0.8))",
  "    );",
  "    float density = 6.0 + u_distortion * 14.0;",
  "    float curtains = sin((rst.x + warp.x * 0.6) * density * 3.14159265);",
  "    curtains = pow(abs(curtains), 1.6) * sign(curtains) * 0.5 + 0.5;",
  "",
  "    vec3 sky = mix(vec3(0.008, 0.02, 0.04), vec3(0.0, 0.0, 0.015), pow(vUv.y, 0.6));",
  "",
  "    float mask = smoothstep(0.1, 0.8, vUv.y * 0.7 + warp.y * 0.4);",
  "    mask *= 0.4 + 0.6 * curtains;",
  "",
  "    float t = fract(curtains * 0.7 + warp.y * 0.3 + u_time * speed * 0.4);",
  "    vec3 glow = sampleGradient(t);",
  "",
  "    vec3 col = mix(sky, sky + glow * 1.2, clamp(mask, 0.0, 1.0));",
  "",
  "    if (u_grain_enable > 0.5) {",
  "        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.15);",
  "        col += vec3(grain);",
  "    }",
  "    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);",
  "}"
].join("\n");
function getFragmentShader(style) {
  switch (style) {
    case "liquid":
      return FS_LIQUID;
    case "wave":
      return FS_WAVE;
    case "silk":
      return FS_SILK;
    case "stripe":
      return FS_STRIPE;
    case "aurora":
      return FS_AURORA;
    case "curtains":
      return FS_AURORA_CURTAINS;
    case "paper":
    default:
      return FS_PAPER;
  }
}
var MESH_STYLES = ["paper", "liquid", "wave", "silk", "stripe", "aurora", "curtains"];
var schema$1 = {
  primary: "type",
  options: {
    type: {
      type: "enum",
      default: "linear",
      values: ["linear", "radial", "conic", "mesh"],
      label: "Type",
      description: '"mesh" renders an animated WebGL gradient and only applies to backgrounds.',
      group: "Gradient"
    },
    target: {
      type: "enum",
      default: "background",
      values: ["background", "text", "icon", "icon-text"],
      label: "Paint",
      description: "Where the gradient is drawn: the element background, the text fill, an icon (font or SVG), or both the icon and the text.",
      group: "Gradient"
    },
    selector: {
      type: "selector",
      default: "",
      label: "Target selector",
      description: 'For text and icon: the elements to paint, relative to this element. Empty paints the element itself (text) or its icons (icon). With "icon-text" it is the icon selector.',
      group: "Gradient"
    },
    textSelector: {
      type: "selector",
      default: "",
      label: "Text selector",
      description: 'Only used by "icon-text": the text elements to paint, relative to this element. The Target selector then paints the icons.',
      group: "Gradient",
      when: { target: "icon-text" }
    },
    stops: {
      type: "string",
      default: "#7c6cff;#ff7a2f;#2af598",
      ui: "stops",
      label: "Color stops",
      description: 'Colors separated by ";", each with an optional position: "#ff0080;#7928ca 60;#2af598". A JSON array of {color, offset} is also accepted.',
      group: "Gradient"
    },
    angle: {
      type: "number",
      default: 135,
      min: 0,
      max: 360,
      unit: "deg",
      label: "Angle",
      group: "Gradient",
      when: { type: ["linear", "conic"] }
    },
    animation: {
      type: "enum",
      default: "none",
      values: ["none", "flow", "hue"],
      label: "Animation",
      description: '"flow" moves color blobs (backgrounds) or pans the gradient (text, icons); "hue" rotates the hue.',
      group: "Animation"
    },
    speed: {
      type: "number",
      default: 8,
      min: 1,
      max: 120,
      unit: "s",
      label: "Cycle duration",
      group: "Animation",
      when: { animation: ["flow", "hue"] }
    },
    followMouse: {
      type: "boolean",
      default: false,
      label: "Cursor spotlight",
      description: "A radial gradient that follows the pointer over the element.",
      group: "Cursor"
    },
    spotlightRadius: {
      type: "number",
      default: 600,
      min: 50,
      max: 2e3,
      unit: "px",
      label: "Spotlight radius",
      group: "Cursor",
      when: { followMouse: true }
    },
    textMode: {
      type: "enum",
      default: "phrase",
      values: ["phrase", "letter"],
      label: "Text gradient mode",
      description: "For text split by the Text module: one gradient across the whole phrase, or a full gradient on every unit.",
      group: "Text"
    },
    meshStyle: {
      type: "enum",
      default: "paper",
      values: MESH_STYLES,
      label: "Mesh style",
      group: "Mesh",
      when: { type: "mesh" }
    },
    distortion: { type: "number", default: 40, min: 0, max: 100, label: "Distortion", group: "Mesh", when: { type: "mesh" } },
    swirl: { type: "number", default: 25, min: 0, max: 100, label: "Swirl", group: "Mesh", when: { type: "mesh" } },
    scale: { type: "number", default: 1.25, min: 0.1, max: 5, step: 0.05, label: "Scale", group: "Mesh", when: { type: "mesh" } },
    grain: { type: "boolean", default: false, label: "Film grain", group: "Mesh", when: { type: "mesh" } },
    grainIntensity: { type: "number", default: 35, min: 0, max: 100, label: "Grain intensity", group: "Mesh", when: { type: "mesh", grain: true } },
    liquidCursor: { type: "boolean", default: false, label: "Liquid cursor", group: "Mesh", when: { type: "mesh" } },
    cursorRadius: { type: "number", default: 250, min: 20, max: 1e3, unit: "px", label: "Cursor radius", group: "Mesh", when: { type: "mesh", liquidCursor: true } }
  }
};
var STOP_WITH_OFFSET = /^(.*?)\s+(-?\d+(?:\.\d+)?)%?$/;
function parseStops(raw) {
  var text2 = String(raw || "").trim();
  var stops = [];
  if (text2.charAt(0) === "[") {
    try {
      var list2 = JSON.parse(text2);
      if (Array.isArray(list2)) {
        list2.forEach(function(item) {
          if (typeof item === "string") stops.push(parseStopText(item));
          else if (item && item.color) {
            var offset = item.offset === void 0 || item.offset === null || item.offset === "" ? null : parseFloat(item.offset);
            stops.push({ color: String(item.color), offset: isNaN(offset) ? null : offset });
          }
        });
      }
    } catch (error) {
      return [];
    }
  } else {
    text2.split(";").forEach(function(part) {
      if (part.trim()) stops.push(parseStopText(part));
    });
  }
  return stops.filter(function(stop2) {
    return stop2.color;
  });
}
function parseStopText(text2) {
  var trimmed = text2.trim();
  var match = STOP_WITH_OFFSET.exec(trimmed);
  if (match && !/[(,]$/.test(match[1])) {
    return { color: match[1].trim(), offset: parseFloat(match[2]) };
  }
  return { color: trimmed, offset: null };
}
function stopsCss(stops) {
  return stops.map(function(stop2) {
    return stop2.offset === null ? stop2.color : stop2.color + " " + stop2.offset + "%";
  }).join(", ");
}
function buildGradientCss(type, angle, stops, spot) {
  var list2 = stopsCss(stops);
  if (type === "radial") {
    if (spot) return "radial-gradient(circle " + spot.radius + "px at " + spot.cx + "% " + spot.cy + "%, " + list2 + ")";
    return "radial-gradient(circle, " + list2 + ")";
  }
  if (type === "conic") return "conic-gradient(from " + angle + "deg, " + list2 + ")";
  return "linear-gradient(" + angle + "deg, " + list2 + ")";
}
function buildMeshLayers(stops) {
  var count = stops.length;
  var positions = [];
  var layers = [];
  for (var i = 0; i < count; i++) {
    var rad = 360 / count * i * Math.PI / 180;
    var x = 50 + 32 * Math.cos(rad);
    var y = 50 + 32 * Math.sin(rad);
    positions.push({ x, y });
    layers.push("radial-gradient(circle at " + x.toFixed(1) + "% " + y.toFixed(1) + "%, " + stops[i].color + " 0%, transparent 65%)");
  }
  return { image: layers.join(", "), positions };
}
function positionString(positions, dx, dy) {
  return positions.map(function(p) {
    return (p.x + dx).toFixed(1) + "% " + (p.y + dy).toFixed(1) + "%";
  }).join(", ");
}
var LEAF_SELECTOR = ".aurora-char, .aurora-word, .aurora-line";
var ANIMATED_TEXT = ["pan", "hue"].map(function(kind) {
  var base = ".aurora-gradient-text-" + kind;
  var selector = [base, base + " .aurora-char", base + " .aurora-word", base + " .aurora-line"].join(",");
  var timing = kind === "pan" ? "ease-in-out" : "linear";
  return selector + "{animation:aurora-gradient-" + kind + " var(--aurora-gradient-speed,8s) " + timing + " infinite}";
}).join("");
var STYLESHEET$1 = '.aurora-gradient-host{position:relative;overflow:hidden;isolation:isolate}.aurora-gradient-bg-hue::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background-image:var(--aurora-gradient-image);background-size:200% 200%;animation:aurora-gradient-hue var(--aurora-gradient-speed,8s) linear infinite}.aurora-gradient-bg-flow::before{content:"";position:absolute;inset:-25%;z-index:-1;pointer-events:none;background-image:var(--aurora-gradient-image);background-repeat:no-repeat;filter:blur(var(--aurora-gradient-blur,40px));animation:aurora-gradient-flow var(--aurora-gradient-speed,8s) ease-in-out infinite}.aurora-gradient-text{background-repeat:no-repeat}.aurora-gradient-text-fill *{-webkit-text-fill-color:transparent}.aurora-gradient-icon{background-repeat:no-repeat;display:inline-block}' + ANIMATED_TEXT + ".aurora-gradient-icon-hue svg,.aurora-gradient-icon-hue i{animation:aurora-gradient-hue var(--aurora-gradient-speed,8s) linear infinite}.aurora-gradient-icon-pan i{animation:aurora-gradient-pan var(--aurora-gradient-speed,8s) ease-in-out infinite}.aurora-gradient-mesh-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none}@keyframes aurora-gradient-hue{from{filter:hue-rotate(0deg)}to{filter:hue-rotate(360deg)}}@keyframes aurora-gradient-flow{0%,100%{background-position:var(--aurora-gradient-pos-a)}50%{background-position:var(--aurora-gradient-pos-b)}}@keyframes aurora-gradient-pan{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}@media (prefers-reduced-motion:reduce){.aurora-gradient-bg-hue::before,.aurora-gradient-bg-flow::before,.aurora-gradient-text-pan,.aurora-gradient-text-pan *,.aurora-gradient-text-hue,.aurora-gradient-text-hue *,.aurora-gradient-icon-hue svg,.aurora-gradient-icon-hue i,.aurora-gradient-icon-pan i{animation:none!important}}";
function createPainter() {
  var undo = [];
  return {
    style: function(el, property, value) {
      var previous = el.style.getPropertyValue(property);
      var priority = el.style.getPropertyPriority(property);
      el.style.setProperty(property, value);
      undo.push(function() {
        if (previous) el.style.setProperty(property, previous, priority);
        else el.style.removeProperty(property);
      });
    },
    addClass: function(el, name) {
      if (el.classList.contains(name)) return;
      el.classList.add(name);
      undo.push(function() {
        el.classList.remove(name);
      });
    },
    on: function(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      undo.push(function() {
        target.removeEventListener(type, handler, options);
      });
    },
    /** Runs `fn` when reverted. */
    onRevert: function(fn) {
      undo.push(fn);
    },
    revert: function() {
      while (undo.length) {
        try {
          undo.pop()();
        } catch (error) {
          console.error("[Aurora] Gradient revert threw:", error);
        }
      }
    }
  };
}
function startFollow(trackEl, paintEl, options, stops, painter) {
  var pos = { x: 50, y: 50 };
  var frame = null;
  function render2() {
    paintEl.style.setProperty("background-image", buildGradientCss("radial", 0, stops, {
      radius: options.spotlightRadius,
      cx: pos.x,
      cy: pos.y
    }));
  }
  painter.style(paintEl, "background-image", "");
  function onMove(event) {
    if (frame !== null) return;
    var clientX = event.clientX;
    var clientY = event.clientY;
    frame = requestAnimationFrame(function() {
      frame = null;
      var rect = trackEl.getBoundingClientRect();
      pos.x = rect.width ? (clientX - rect.left) / rect.width * 100 : 50;
      pos.y = rect.height ? (clientY - rect.top) / rect.height * 100 : 50;
      render2();
    });
  }
  painter.on(trackEl, "pointermove", onMove, { passive: true });
  painter.onRevert(function() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  });
  render2();
}
function paintBackground(el, options, stops, painter, animated) {
  if (options.followMouse) {
    startFollow(el, el, options, stops, painter);
    return;
  }
  var css2 = buildGradientCss(options.type, options.angle, stops);
  if (!animated) {
    painter.style(el, "background-image", css2);
    return;
  }
  painter.addClass(el, "aurora-gradient-host");
  painter.style(el, "--aurora-gradient-speed", options.speed + "s");
  if (options.animation === "hue") {
    painter.addClass(el, "aurora-gradient-bg-hue");
    painter.style(el, "--aurora-gradient-image", css2);
    return;
  }
  var mesh = buildMeshLayers(stops);
  painter.addClass(el, "aurora-gradient-bg-flow");
  painter.style(el, "--aurora-gradient-image", mesh.image);
  painter.style(el, "--aurora-gradient-pos-a", positionString(mesh.positions, 0, 0));
  painter.style(el, "--aurora-gradient-pos-b", positionString(mesh.positions, 8, -10));
  painter.style(el, "--aurora-gradient-blur", Math.max(18, Math.round(70 / mesh.positions.length)) + "px");
}
function paintClip(el, gradient2, painter) {
  painter.style(el, "-webkit-background-clip", "text");
  painter.style(el, "background-clip", "text");
  painter.style(el, "color", "transparent");
  painter.style(el, "-webkit-text-fill-color", "transparent");
  painter.style(el, "background-image", gradient2);
}
function guardGlyphBox(el, painter, padding) {
  if (!el.style.paddingTop) painter.style(el, "padding-top", padding);
  if (!el.style.paddingBottom) painter.style(el, "padding-bottom", padding);
  var computed = getComputedStyle(el);
  if (parseFloat(computed.lineHeight) / parseFloat(computed.fontSize) < 1.2) {
    painter.style(el, "line-height", "1.25");
  }
}
function paintText(textEl, trackEl, options, stops, painter, animated) {
  guardGlyphBox(textEl, painter, "0.1em");
  painter.addClass(textEl, "aurora-gradient-text-fill");
  var leaves = Array.prototype.slice.call(textEl.querySelectorAll(LEAF_SELECTOR));
  if (options.followMouse) {
    painter.style(textEl, "-webkit-background-clip", "text");
    painter.style(textEl, "background-clip", "text");
    painter.style(textEl, "color", "transparent");
    painter.style(textEl, "-webkit-text-fill-color", "transparent");
    startFollow(trackEl, textEl, options, stops, painter);
    return;
  }
  var gradient2 = buildGradientCss(options.type, options.angle, stops);
  var slice = options.textMode === "phrase" && !animated;
  if (!leaves.length) {
    paintClip(textEl, gradient2, painter);
  } else if (!slice) {
    painter.style(textEl, "color", "transparent");
    painter.style(textEl, "-webkit-text-fill-color", "transparent");
    leaves.forEach(function(leaf) {
      paintClip(leaf, gradient2, painter);
    });
  } else {
    var parent = textEl.getBoundingClientRect();
    var width = parent.width || textEl.offsetWidth || 0;
    var height = parent.height || textEl.offsetHeight || 0;
    painter.style(textEl, "color", "transparent");
    painter.style(textEl, "-webkit-text-fill-color", "transparent");
    leaves.forEach(function(leaf) {
      var rect = leaf.getBoundingClientRect();
      paintClip(leaf, gradient2, painter);
      if (width > 0 && height > 0 && rect.width > 0) {
        painter.style(leaf, "background-size", width + "px " + height + "px");
        painter.style(leaf, "background-position", parent.left - rect.left + "px " + (parent.top - rect.top) + "px");
        painter.style(leaf, "background-repeat", "no-repeat");
      } else {
        painter.style(leaf, "background-size", "100% 100%");
        painter.style(leaf, "background-position", "0% 0%");
      }
    });
  }
  if (!animated) return;
  painter.addClass(textEl, "aurora-gradient-text");
  painter.addClass(textEl, "aurora-gradient-text-" + (options.animation === "hue" ? "hue" : "pan"));
  painter.style(textEl, "--aurora-gradient-speed", options.speed + "s");
  if (options.animation !== "hue") {
    painter.style(textEl, "background-size", "300% 300%");
    leaves.forEach(function(leaf) {
      painter.style(leaf, "background-size", "300% 300%");
    });
  }
}
var SVG_NS = "http://www.w3.org/2000/svg";
var SHAPES = "path, circle, rect, polygon, ellipse, line, polyline";
var counter = 0;
function paintIcon(glyph, trackEl, options, stops, painter, animated) {
  if (glyph.tagName.toLowerCase() === "svg") {
    paintSvg(glyph, options, stops, painter, animated);
    return;
  }
  painter.addClass(glyph, "aurora-gradient-icon");
  guardGlyphBox(glyph, painter, "0.12em");
  if (options.followMouse) {
    paintClip(glyph, "none", painter);
    startFollow(trackEl, glyph, options, stops, painter);
    return;
  }
  paintClip(glyph, buildGradientCss(options.type, options.angle, stops), painter);
  if (!animated) return;
  painter.style(glyph, "--aurora-gradient-speed", options.speed + "s");
  painter.addClass(glyph, "aurora-gradient-icon-" + (options.animation === "hue" ? "hue" : "pan"));
  if (options.animation !== "hue") painter.style(glyph, "background-size", "300% 300%");
}
function paintSvg(svg, options, stops, painter, animated) {
  var defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
    painter.onRevert(function() {
      defs.remove();
    });
  }
  var id = "aurora-gradient-" + ++counter;
  var radial = options.type === "radial";
  var gradient2 = document.createElementNS(SVG_NS, radial ? "radialGradient" : "linearGradient");
  gradient2.setAttribute("id", id);
  if (radial) {
    gradient2.setAttribute("cx", "50%");
    gradient2.setAttribute("cy", "50%");
    gradient2.setAttribute("r", "70%");
  } else {
    var rad = (options.angle - 90) * Math.PI / 180;
    var dx = Math.cos(rad) * 0.5;
    var dy = Math.sin(rad) * 0.5;
    gradient2.setAttribute("x1", 50 - dx * 100 + "%");
    gradient2.setAttribute("y1", 50 - dy * 100 + "%");
    gradient2.setAttribute("x2", 50 + dx * 100 + "%");
    gradient2.setAttribute("y2", 50 + dy * 100 + "%");
  }
  stops.forEach(function(stop2, index) {
    var node = document.createElementNS(SVG_NS, "stop");
    var offset = stop2.offset === null ? index / Math.max(1, stops.length - 1) * 100 : stop2.offset;
    node.setAttribute("offset", offset + "%");
    node.setAttribute("stop-color", stop2.color);
    gradient2.appendChild(node);
  });
  defs.appendChild(gradient2);
  painter.onRevert(function() {
    gradient2.remove();
  });
  var fill = "url(#" + id + ")";
  Array.prototype.forEach.call(svg.querySelectorAll(SHAPES), function(shape) {
    painter.style(shape, "fill", fill);
  });
  painter.style(svg, "fill", fill);
  if (animated) {
    painter.style(svg.parentElement || svg, "--aurora-gradient-speed", options.speed + "s");
    painter.addClass(svg.parentElement || svg, "aurora-gradient-icon-hue");
  }
}
var MAX_STOPS = 6;
function hexToVec3(color) {
  var hex = String(color || "").replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(function(c) {
    return c + c;
  }).join("");
  var value = parseInt(hex, 16);
  if (isNaN(value)) return [0, 0, 0];
  return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255];
}
function compile(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}
function mountMesh(el, options, stops, animated) {
  var canvas = document.createElement("canvas");
  canvas.className = "aurora-gradient-mesh-canvas";
  canvas.setAttribute("aria-hidden", "true");
  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return null;
  var vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  var fragment = compile(gl, gl.FRAGMENT_SHADER, getFragmentShader(options.meshStyle));
  if (!vertex || !fragment) return null;
  var program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  var buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  var position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  var names = {
    res: "u_resolution",
    time: "u_time",
    mouse: "u_mouse",
    dist: "u_distortion",
    swirl: "u_swirl",
    scale: "u_scale",
    angle: "u_angle",
    grainOn: "u_grain_enable",
    grain: "u_grain_intensity",
    liquid: "u_liquid_cursor",
    radius: "u_cursor_radius",
    count: "u_stop_count"
  };
  var u = {};
  Object.keys(names).forEach(function(key2) {
    u[key2] = gl.getUniformLocation(program, names[key2]);
  });
  u.stops = [];
  u.offsets = [];
  for (var i = 0; i < MAX_STOPS; i++) {
    u.stops.push(gl.getUniformLocation(program, "u_stops[" + i + "]"));
    u.offsets.push(gl.getUniformLocation(program, "u_offsets[" + i + "]"));
  }
  if (getComputedStyle(el).position === "static") {
    el.style.position = "relative";
    var restorePosition = true;
  }
  el.insertBefore(canvas, el.firstChild);
  var state2 = {
    options,
    stops,
    mouse: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    rect: null,
    listening: false,
    removeTick: null,
    stopObserving: null,
    resizeTimer: null,
    destroyed: false
  };
  var start = performance.now();
  function onMove(event) {
    if (!state2.rect) return;
    state2.target.x = event.clientX - state2.rect.left;
    state2.target.y = state2.rect.height - (event.clientY - state2.rect.top);
  }
  function pushUniforms() {
    var o = state2.options;
    gl.useProgram(program);
    gl.uniform1f(u.dist, o.distortion / 100);
    gl.uniform1f(u.swirl, o.swirl / 100);
    gl.uniform1f(u.scale, o.scale);
    gl.uniform1f(u.angle, o.angle);
    gl.uniform1f(u.grainOn, o.grain ? 1 : 0);
    gl.uniform1f(u.grain, o.grainIntensity / 100);
    gl.uniform1f(u.liquid, o.liquidCursor ? 1 : 0);
    gl.uniform1f(u.radius, o.cursorRadius);
    var list2 = state2.stops.slice(0, MAX_STOPS);
    gl.uniform1i(u.count, list2.length);
    list2.forEach(function(stop2, index) {
      var rgb = hexToVec3(stop2.color);
      gl.uniform3f(u.stops[index], rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(u.offsets[index], stop2.offset === null ? index / Math.max(1, list2.length - 1) : stop2.offset / 100);
    });
    if (o.liquidCursor && !state2.listening) {
      state2.rect = el.getBoundingClientRect();
      el.addEventListener("pointermove", onMove, { passive: true });
      state2.listening = true;
    } else if (!o.liquidCursor && state2.listening) {
      el.removeEventListener("pointermove", onMove);
      state2.listening = false;
    }
  }
  function resize() {
    var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = (el.offsetWidth || 300) * ratio;
    canvas.height = (el.offsetHeight || 300) * ratio;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.uniform2f(u.res, canvas.width, canvas.height);
    if (state2.options.liquidCursor) state2.rect = el.getBoundingClientRect();
    if (!animated) draw(0);
  }
  function onResize() {
    clearTimeout(state2.resizeTimer);
    state2.resizeTimer = setTimeout(resize, 150);
  }
  function draw(elapsed) {
    gl.useProgram(program);
    if (state2.options.liquidCursor) {
      state2.mouse.x += (state2.target.x - state2.mouse.x) * 0.1;
      state2.mouse.y += (state2.target.y - state2.mouse.y) * 0.1;
      gl.uniform2f(
        u.mouse,
        state2.mouse.x * (canvas.width / (el.offsetWidth || 1)),
        state2.mouse.y * (canvas.height / (el.offsetHeight || 1))
      );
    }
    gl.uniform1f(u.time, elapsed);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function tick2() {
    draw((performance.now() - start) * 1e-3 * (state2.options.speed ? 8 / state2.options.speed : 1));
  }
  pushUniforms();
  resize();
  window.addEventListener("resize", onResize);
  if (animated) {
    state2.stopObserving = observe(el, {
      threshold: 0.05,
      onEnter: function() {
        if (!state2.removeTick) state2.removeTick = ticker.add(tick2);
      },
      onLeave: function() {
        if (state2.removeTick) {
          state2.removeTick();
          state2.removeTick = null;
        }
      }
    });
  } else {
    draw(0);
  }
  return {
    meshStyle: options.meshStyle,
    /** False once the GL context is lost; the caller should rebuild. */
    alive: function() {
      return !state2.destroyed && !gl.isContextLost();
    },
    update: function(nextOptions, nextStops) {
      state2.options = nextOptions;
      state2.stops = nextStops;
      pushUniforms();
      if (!animated) draw(0);
    },
    destroy: function() {
      if (state2.destroyed) return;
      state2.destroyed = true;
      clearTimeout(state2.resizeTimer);
      window.removeEventListener("resize", onResize);
      if (state2.listening) el.removeEventListener("pointermove", onMove);
      if (state2.stopObserving) state2.stopObserving();
      if (state2.removeTick) state2.removeTick();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      canvas.remove();
      if (restorePosition) el.style.position = "";
    }
  };
}
var gradient = defineModule({
  name: "gradient",
  schema: schema$1,
  init: function(el, initial, ctx) {
    ctx.style("gradient", STYLESHEET$1);
    var options = initial;
    var painter = createPainter();
    var mesh = null;
    function destroyMesh() {
      if (mesh) mesh.destroy();
      mesh = null;
    }
    function nodesFor(selector, iconFallback) {
      if (selector) return Array.prototype.slice.call(el.querySelectorAll(selector));
      if (iconFallback) return Array.prototype.slice.call(el.querySelectorAll("svg, i"));
      return [el];
    }
    function targets() {
      return nodesFor(options.selector, options.target === "icon" || options.target === "icon-text");
    }
    function paint() {
      painter.revert();
      var stops = parseStops(options.stops);
      if (stops.length < 2) {
        destroyMesh();
        ctx.warn("At least two color stops are needed.");
        return;
      }
      var reduced = ctx.reducedMotion;
      var animated = options.animation !== "none" && !reduced;
      var useMesh = options.type === "mesh" && options.target === "background";
      if (useMesh) {
        if (mesh && mesh.meshStyle === options.meshStyle && mesh.alive()) {
          mesh.update(options, stops);
          return;
        }
        destroyMesh();
        mesh = mountMesh(el, options, stops, !reduced);
        if (mesh) return;
        painter.style(el, "background-image", buildGradientCss("linear", options.angle, stops));
        return;
      }
      destroyMesh();
      var view = options.type === "mesh" ? Object.assign({}, options, { type: "linear" }) : options;
      var follow = view.followMouse && !reduced;
      view = follow === view.followMouse ? view : Object.assign({}, view, { followMouse: false });
      if (options.target === "text") {
        targets().forEach(function(node) {
          paintText(node, el, view, stops, painter, animated);
        });
      } else if (options.target === "icon") {
        targets().forEach(function(node) {
          paintIcon(node, el, view, stops, painter, animated);
        });
      } else if (options.target === "icon-text") {
        nodesFor(options.selector, true).forEach(function(node) {
          paintIcon(node, el, view, stops, painter, animated);
        });
        nodesFor(options.textSelector, false).forEach(function(node) {
          paintText(node, el, view, stops, painter, animated);
        });
      } else {
        paintBackground(el, view, stops, painter, animated);
      }
    }
    paint();
    if (options.target === "text" || options.target === "icon-text") {
      ctx.listen("split", function() {
        requestAnimationFrame(paint);
      }, { module: "text" });
    }
    ctx.onDestroy(function() {
      painter.revert();
      destroyMesh();
    });
    return {
      update: function(next) {
        options = next;
        paint();
      }
    };
  }
});
var PATHS = {
  heart: '<path d="M12 20.5s-7.5-4.7-9.4-9.4A5.2 5.2 0 0 1 12 6.2a5.2 5.2 0 0 1 9.4 4.9c-1.9 4.7-9.4 9.4-9.4 9.4z"/>',
  comment: '<path d="M20.5 12a8.5 8.5 0 0 1-12.3 7.6L3.5 21l1.4-4.5A8.5 8.5 0 1 1 20.5 12z"/>',
  send: '<path d="M21.5 2.5 10.5 13.5"/><path d="M21.5 2.5 14.5 21.5l-4-8-8-4z"/>',
  bookmark: '<path d="M6 3.5h12v17l-6-4.2-6 4.2z"/>',
  ellipsis: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>',
  video: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="m10 9.2 5 2.8-5 2.8z"/>'
};
function icon(name, className, filled) {
  var body = PATHS[name] || "";
  return '<svg class="amc-icon' + (className ? " " + className : "") + '" viewBox="0 0 24 24" width="1em" height="1em" fill="' + (filled ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + "</svg>";
}
var DEFAULT_LABELS = {
  likes: "likes",
  viewComments: "View all comments",
  posts: "Posts",
  followers: "Followers",
  following: "Following",
  follow: "Follow",
  message: "Message",
  email: "Email"
};
var POLAROID_SIZES = {
  normal: { photoRatio: "1 / 1", radius: 3, top: 16, sides: 16, bottom: 56 },
  instax: { photoRatio: "3 / 4", radius: 3, top: 14, sides: 14, bottom: 64 },
  "instax-square": { photoRatio: "1 / 1", radius: 3, top: 14, sides: 14, bottom: 48 },
  horizontal: { photoRatio: "4 / 3", radius: 3, top: 14, sides: 14, bottom: 48 },
  mini: { photoRatio: "3 / 4", radius: 3, top: 10, sides: 10, bottom: 40 }
};
var POLAROID_FRAMES = ["classic", "vintage", "pink", "dark", "floral"];
function escapeHtml(value) {
  return String(value === void 0 || value === null ? "" : value).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function safeUrl(url) {
  var value = String(url || "").trim();
  if (!value) return "";
  if (/^(https?:|\/|\.\/|\.\.\/|data:image\/)/i.test(value) || !/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return "";
}
function px(value, fallback) {
  var n = parseFloat(value);
  return (isNaN(n) ? fallback : n) + "px";
}
function frameFor(state2) {
  switch (state2.template) {
    case "polaroid": {
      var size = POLAROID_SIZES[state2.size] ? state2.size : "normal";
      var cfg = POLAROID_SIZES[size];
      return {
        mode: "polaroid",
        frameClass: POLAROID_FRAMES.indexOf(state2.frame) !== -1 ? "amc-frame-" + state2.frame : null,
        borderRadius: cfg.radius + "px",
        padding: cfg.top + "px " + cfg.sides + "px " + cfg.bottom + "px " + cfg.sides + "px",
        rotate: "0deg",
        maxWidth: "320px",
        aspectRatio: "auto",
        background: "",
        imageAspectRatio: cfg.photoRatio,
        imageBorderRadius: "0px"
      };
    }
    case "profile":
      return {
        mode: "profile",
        frameClass: null,
        borderRadius: "18px",
        padding: "0px 0px 0px 0px",
        rotate: "0deg",
        maxWidth: "380px",
        aspectRatio: "auto",
        background: "",
        imageAspectRatio: "auto",
        imageBorderRadius: "0px"
      };
    case "custom": {
      var pad = state2.padding || {};
      var unit = pad.unit || "px";
      var max = state2.maxWidth || {};
      var ratio = state2.aspectRatio && state2.aspectRatio !== "auto" ? String(state2.aspectRatio).replace("/", " / ") : "auto";
      return {
        mode: "custom",
        frameClass: null,
        borderRadius: px(state2.radius, 0),
        padding: [pad.top, pad.right, pad.bottom, pad.left].map(function(v) {
          return (parseFloat(v) || 0) + unit;
        }).join(" "),
        rotate: (parseFloat(state2.rotate) || 0) + "deg",
        maxWidth: max.size ? max.size + (max.unit || "px") : "none",
        aspectRatio: ratio,
        background: state2.bgColor || "",
        imageAspectRatio: "auto",
        imageBorderRadius: "0px"
      };
    }
    default:
      return {
        mode: "post",
        frameClass: null,
        borderRadius: "22px",
        padding: "14px 14px 18px 14px",
        rotate: "0deg",
        maxWidth: "320px",
        aspectRatio: "auto",
        background: "",
        imageAspectRatio: "1 / 1",
        imageBorderRadius: "14px"
      };
  }
}
function contentFor(state2, labels) {
  var l = Object.assign({}, DEFAULT_LABELS, labels || {});
  var caption = escapeHtml(state2.caption);
  var photo = escapeHtml(safeUrl(state2.photo));
  switch (state2.template) {
    case "polaroid":
      return {
        headerClass: "amc-header",
        showHeader: true,
        header: "",
        showImage: true,
        image: '<img class="amc-image-photo" src="' + photo + '" alt="' + caption + '">',
        showFooter: true,
        footer: '<p class="amc-caption amc-post-caption-as-polaroid"><span class="amc-caption-text">' + caption + "</span></p>"
      };
    case "profile": {
      var grid = Array.isArray(state2.gridPhotos) ? state2.gridPhotos : [];
      var tiles = grid.length ? grid.map(function(src) {
        return '<div class="amc-profile-grid-item"><img src="' + escapeHtml(safeUrl(src)) + '" alt=""></div>';
      }) : Array.from({ length: 9 }, function() {
        return '<div class="amc-profile-grid-item amc-profile-grid-item-empty"></div>';
      });
      return {
        headerClass: "amc-header",
        showHeader: true,
        header: '<div class="amc-profile-top"><span class="amc-profile-avatar-ring"><img class="amc-profile-avatar-img" src="' + escapeHtml(safeUrl(state2.avatar || state2.photo)) + '" alt="' + escapeHtml(state2.username || state2.name) + '"></span><div class="amc-profile-stats"><div class="amc-profile-stat"><strong>' + escapeHtml(state2.posts || 0) + "</strong><span>" + escapeHtml(l.posts) + '</span></div><div class="amc-profile-stat"><strong>' + escapeHtml(state2.followers || 0) + "</strong><span>" + escapeHtml(l.followers) + '</span></div><div class="amc-profile-stat"><strong>' + escapeHtml(state2.following || 0) + "</strong><span>" + escapeHtml(l.following) + '</span></div></div></div><div class="amc-profile-info"><p class="amc-profile-name">' + escapeHtml(state2.name) + '</p><p class="amc-profile-bio">' + escapeHtml(state2.bio) + '</p></div><div class="amc-profile-actions"><button class="amc-profile-btn amc-profile-btn-primary" type="button">' + escapeHtml(l.follow) + '</button><button class="amc-profile-btn amc-profile-btn-secondary" type="button">' + escapeHtml(l.message) + '</button><button class="amc-profile-btn amc-profile-btn-icon" type="button" aria-label="' + escapeHtml(l.email) + '">' + icon("mail") + '</button></div><div class="amc-profile-tabs"><span class="amc-profile-tab active">' + icon("grid") + '</span><span class="amc-profile-tab">' + icon("video") + '</span><span class="amc-profile-tab">' + icon("bookmark") + "</span></div>",
        showImage: true,
        image: '<div class="amc-profile-grid">' + tiles.join("") + "</div>",
        showFooter: false,
        footer: ""
      };
    }
    case "custom":
      return {
        headerClass: "amc-header",
        showHeader: !!state2.headerHtml,
        header: state2.headerHtml || "",
        showImage: !!state2.photo,
        image: state2.photo ? '<img class="amc-image-photo" src="' + photo + '" alt="' + caption + '" style="object-fit:' + escapeHtml(state2.imageFit || "cover") + ";object-position:" + escapeHtml(state2.imagePosition || "center center") + ';">' : "",
        showFooter: !!state2.footerHtml,
        footer: state2.footerHtml || ""
      };
    default: {
      var username = escapeHtml(state2.username);
      return {
        headerClass: "amc-header amc-post-header",
        showHeader: true,
        header: '<span class="amc-post-avatar-ring"><img class="amc-post-avatar-img" src="' + escapeHtml(safeUrl(state2.avatar || state2.photo)) + '" alt="' + username + '"></span><div class="amc-post-header-text"><p class="amc-post-username">' + username + '</p><p class="amc-post-subtext">' + escapeHtml(state2.subtext) + "</p></div>" + icon("ellipsis", "amc-post-more"),
        showImage: true,
        image: '<img class="amc-post-photo-item" src="' + photo + '" alt="' + caption + '"><div class="amc-post-heart-burst">' + icon("heart", "", true) + "</div>",
        showFooter: true,
        footer: '<div class="amc-post-actions">' + icon("heart", "amc-post-icon") + icon("comment", "amc-post-icon") + icon("send", "amc-post-icon") + icon("bookmark", "amc-post-icon amc-post-icon-save") + '</div><div class="amc-post-meta"><p class="amc-post-likes"><span class="amc-post-likes-count">' + escapeHtml(state2.likes || 0) + "</span> " + escapeHtml(l.likes) + '</p><p class="amc-post-caption"><span class="amc-post-caption-user">' + username + '</span> <span class="amc-post-caption-text">' + caption + '</span></p><p class="amc-post-comments">' + escapeHtml(l.viewComments) + "</p></div>"
      };
    }
  }
}
var schema = {
  options: {
    states: {
      type: "json",
      default: [],
      label: "States",
      description: "JSON array of card states. The card shows them in order, morphing from one to the next.",
      group: "Content"
    },
    loop: { type: "boolean", default: true, label: "Loop", group: "Sequence" },
    autoplay: {
      type: "boolean",
      default: true,
      label: "Autoplay",
      description: "Off shows the first state and waits for the API (next / goTo).",
      group: "Sequence"
    },
    initialDelay: { type: "number", default: 0, min: 0, max: 3e4, unit: "ms", label: "Initial delay", group: "Sequence" },
    captionEffect: {
      type: "enum",
      default: "typewriter",
      values: ["typewriter", "letters"],
      label: "Polaroid caption effect",
      group: "Sequence"
    },
    float: { type: "boolean", default: true, label: "Floating motion", group: "Appearance" },
    labels: {
      type: "json",
      default: {},
      label: "Labels",
      description: "Overrides for the texts inside templates: likes, viewComments, posts, followers, following, follow, message, email.",
      group: "Content"
    }
  }
};
var STYLESHEET = `.aurora-morph-card { --amc-bg-light: #ffffff; --amc-bg-card: #f5f4f0; --amc-text-main: #2d3230; --amc-text-muted: #7a7873; --amc-border-color: rgba(0, 0, 0, 0.08); --amc-accent-caramel: #c97c54; --amc-accent-cyan: #0a8fa8; --amc-accent-teal: #128a7c; --amc-shadow-polaroid: 0 10px 30px rgba(28, 28, 26, 0.12); --amc-shadow-lg: 0 15px 35px rgba(28, 28, 26, 0.14); position: relative; width: 100%; display: flex; align-items: center; justify-content: center; min-height: 320px; } .aurora-morph-card .amc-card { position: relative; z-index: 2; width: 100%; max-width: 320px; background: var(--amc-bg-light); box-shadow: var(--amc-shadow-polaroid), 0 30px 60px -20px rgba(38, 40, 42, 0.28); border: 1px solid var(--amc-border-color); display: flex; flex-direction: column; animation: aurora-mc-float 4.2s ease-in-out infinite; } .aurora-morph-card.no-float .amc-card { animation: none; } .aurora-morph-card .amc-card.is-morphing, .aurora-morph-card .amc-card.is-morphing .amc-image { transition-property: border-radius, padding, padding-top, padding-right, padding-bottom, padding-left, rotate, background-color, background, max-width, aspect-ratio, width, height; transition-duration: var(--amc-morph-duration, 1.6s); transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1); } @keyframes aurora-mc-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } } .aurora-morph-card .amc-card.amc-mode-post { border-radius: 22px; padding: 14px 14px 18px; rotate: 0deg; } .aurora-morph-card .amc-card.amc-mode-polaroid { background: #faf9f6; } .aurora-morph-card .amc-card.amc-mode-polaroid.amc-frame-classic { background: #faf9f6; } .aurora-morph-card .amc-card.amc-mode-polaroid.amc-frame-vintage { background: #f2ead2; } .aurora-morph-card .amc-card.amc-mode-polaroid.amc-frame-pink { background: linear-gradient(135deg, #fcebec 0%, #f7d2d6 100%); } .aurora-morph-card .amc-card.amc-mode-polaroid.amc-frame-dark { background: #252523; color: #fcfbf8; } .aurora-morph-card .amc-card.amc-mode-polaroid.amc-frame-dark .amc-caption { color: #fcfbf8; } .aurora-morph-card .amc-card.amc-mode-polaroid.amc-frame-floral { background-color: #fff; background-image: radial-gradient(circle at 100% 150%, #f6e8df 24%, #fffcf8 25%, #fffcf8 28%, #f6e8df 29%, #f6e8df 36%, #fffcf8 36%, #fffcf8 40%, transparent 40%, transparent); background-size: 16px 16px; } .aurora-morph-card .amc-card.amc-mode-polaroid::after { content: ''; position: absolute; inset: 0; background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E"); pointer-events: none; } .aurora-morph-card .amc-card.amc-mode-custom { width: auto; box-sizing: border-box; } .aurora-morph-card .amc-card.amc-mode-custom .amc-header, .aurora-morph-card .amc-card.amc-mode-custom .amc-footer { flex: 0 0 auto; } .aurora-morph-card .amc-card.amc-mode-custom .amc-image { flex: 1 1 auto; min-height: 0; background: transparent; overflow: hidden; } .aurora-morph-card .amc-card.amc-mode-custom .amc-image-photo { width: 100%; height: 100%; display: block; } .aurora-morph-card .amc-card.amc-mode-profile { max-width: 380px; border-radius: 18px; padding: 0; rotate: 0deg; overflow: hidden; } .aurora-morph-card .amc-card.amc-mode-profile .amc-header { display: block; padding: 20px 18px 0; } .aurora-morph-card .amc-card.amc-mode-profile .amc-image { aspect-ratio: auto; border-radius: 0; background: var(--amc-bg-light); } .aurora-morph-card .amc-card.amc-mode-profile .amc-footer { display: none; } .aurora-morph-card .amc-profile-top { display: flex; align-items: center; gap: 18px; } .aurora-morph-card .amc-profile-avatar-ring { width: 68px; height: 68px; border-radius: 50%; padding: 2px; background: linear-gradient(45deg, var(--amc-accent-caramel), var(--amc-accent-cyan), var(--amc-accent-teal)); display: grid; place-items: center; flex-shrink: 0; } .aurora-morph-card .amc-profile-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--amc-bg-light); display: block; } .aurora-morph-card .amc-profile-stats { flex: 1; display: flex; justify-content: space-around; } .aurora-morph-card .amc-profile-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; } .aurora-morph-card .amc-profile-stat strong { font-size: 1rem; font-weight: 700; color: var(--amc-text-main); } .aurora-morph-card .amc-profile-stat span { font-size: 0.72rem; color: var(--amc-text-muted); } .aurora-morph-card .amc-profile-info { margin-top: 12px; } .aurora-morph-card .amc-profile-name { font-size: 0.9rem; font-weight: 700; color: var(--amc-text-main); margin-bottom: 2px; } .aurora-morph-card .amc-profile-bio { font-size: 0.78rem; color: var(--amc-text-muted); line-height: 1.45; } .aurora-morph-card .amc-profile-actions { display: flex; align-items: center; gap: 8px; margin-top: 12px; } .aurora-morph-card .amc-profile-btn { font-size: 0.8rem; font-weight: 600; padding: 7px 0; border-radius: 8px; text-align: center; cursor: pointer; border: none; } .aurora-morph-card .amc-profile-btn-primary { flex: 1; background: var(--amc-text-main); color: var(--amc-bg-light); } .aurora-morph-card .amc-profile-btn-secondary { flex: 1; background: var(--amc-bg-card); color: var(--amc-text-main); } .aurora-morph-card .amc-profile-btn-icon { width: 34px; height: 34px; flex-shrink: 0; background: var(--amc-bg-card); color: var(--amc-text-main); display: grid; place-items: center; font-size: 0.85rem; } .aurora-morph-card .amc-profile-tabs { display: flex; border-top: 1px solid var(--amc-border-color); margin-top: 12px; } .aurora-morph-card .amc-profile-tab { flex: 1; display: grid; place-items: center; padding: 11px 0; color: var(--amc-text-muted); font-size: 0.95rem; border-top: 2px solid transparent; } .aurora-morph-card .amc-profile-tab.active { color: var(--amc-text-main); border-top-color: var(--amc-text-main); } .aurora-morph-card .amc-profile-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; } .aurora-morph-card .amc-profile-grid-item { position: relative; aspect-ratio: 1 / 1; overflow: hidden; background: var(--amc-bg-card); } .aurora-morph-card .amc-profile-grid-item img { width: 100%; height: 100%; object-fit: cover; display: block; } .aurora-morph-card .amc-profile-grid-item-empty { background: repeating-linear-gradient( 45deg, var(--amc-bg-card), var(--amc-bg-card) 8px, #ecebe7 8px, #ecebe7 16px ); } .aurora-morph-card .amc-zone-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 10; box-sizing: border-box; } .aurora-morph-card .amc-header { display: flex; align-items: center; gap: 10px; position: relative; } .aurora-morph-card .amc-footer { position: relative; } .aurora-morph-card .amc-card.amc-mode-post .amc-header { padding: 2px 4px 12px; } .aurora-morph-card .amc-image { position: relative; width: 100%; overflow: hidden; background: var(--amc-bg-card); } .aurora-morph-card .amc-card.amc-mode-post .amc-image { aspect-ratio: 1 / 1; border-radius: 14px; } .aurora-morph-card .amc-card.amc-mode-polaroid .amc-image { background: #1c1c1a; } .aurora-morph-card .amc-image-photo { width: 100%; height: 100%; object-fit: cover; display: block; } .aurora-morph-card .amc-card.amc-mode-post .amc-footer { padding: 0 4px; } .aurora-morph-card .amc-caption { font-family: 'Caveat', cursive; font-weight: 700; font-size: 1.35rem; color: #2d3230; text-align: center; margin-top: 10px; letter-spacing: 0.2px; } .aurora-morph-card .amc-post-caption-as-polaroid { font-family: 'Caveat', cursive; font-weight: 700; font-size: 1.35rem; line-height: 1.22; color: #2d3230; text-align: center; margin-top: 6px; letter-spacing: 0.2px; min-height: 26px; white-space: normal; word-break: break-word; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; text-overflow: ellipsis; } .aurora-morph-card .amc-post-caption-as-polaroid .amc-post-caption-user { display: none; } .aurora-morph-card .amc-post-header { display: flex; align-items: center; gap: 10px; padding: 2px 4px 12px; } .aurora-morph-card .amc-post-avatar-ring { width: 40px; height: 40px; border-radius: 50%; padding: 2px; background: linear-gradient(45deg, var(--amc-accent-caramel), var(--amc-accent-cyan), var(--amc-accent-teal)); display: grid; place-items: center; flex-shrink: 0; } .aurora-morph-card .amc-post-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--amc-bg-light); display: block; } .aurora-morph-card .amc-post-header-text { flex: 1; min-width: 0; line-height: 1.25; } .aurora-morph-card .amc-post-username { font-size: 0.86rem; font-weight: 700; color: var(--amc-text-main); margin: 0; } .aurora-morph-card .amc-post-subtext { font-size: 0.72rem; color: var(--amc-text-muted); margin: 0; } .aurora-morph-card .amc-post-more { color: var(--amc-text-muted); font-size: 1.1rem; flex-shrink: 0; } .aurora-morph-card .amc-post-photo-wrap { position: relative; width: 100%; aspect-ratio: 1 / 1; border-radius: 14px; overflow: hidden; background: var(--amc-bg-card); } .aurora-morph-card .amc-post-photo-item { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; } .aurora-morph-card .amc-post-heart-burst { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; z-index: 4; opacity: 0; } .aurora-morph-card .amc-post-heart-burst svg { font-size: 5rem; color: #fff; filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.25)); } .aurora-morph-card .amc-post-actions { display: flex; align-items: center; gap: 16px; padding: 14px 4px 6px; position: relative; } .aurora-morph-card .amc-post-icon { font-size: 1.35rem; color: var(--amc-text-main); } .aurora-morph-card .amc-post-icon-save { margin-left: auto; } .aurora-morph-card .amc-post-meta { padding: 2px 4px 0; } .aurora-morph-card .amc-post-likes { font-size: 0.85rem; font-weight: 700; color: var(--amc-text-main); margin: 0 0 2px; } .aurora-morph-card .amc-post-caption { font-size: 0.82rem; color: var(--amc-text-main); line-height: 1.4; margin: 0; } .aurora-morph-card .amc-post-caption-user { font-weight: 700; margin-right: 4px; } .aurora-morph-card .amc-post-comments { font-size: 0.74rem; color: var(--amc-text-muted); margin-top: 4px; } .aurora-morph-card .amc-image-shimmer { position: absolute; top: 0; left: 0; width: 60%; height: 100%; background: linear-gradient(105deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0.65) 50%, rgba(255, 255, 255, 0) 70%); transform: translateX(-150%) skewX(-15deg); pointer-events: none; z-index: 3; opacity: 0; transition: opacity 0.3s ease; } .aurora-morph-card .amc-image-shimmer.is-active { opacity: 1; animation: aurora-mc-shimmer 1.1s ease-in-out infinite; } @keyframes aurora-mc-shimmer { 0% { transform: translateX(-150%) skewX(-15deg); } 100% { transform: translateX(250%) skewX(-15deg); } } .aurora-morph-card .amc-word { display: inline-block; white-space: nowrap; } .aurora-morph-card .amc-letter { display: inline-block; opacity: 0; } .aurora-morph-card .amc-icon{display:block;flex-shrink:0} .aurora-morph-card .amc-post-actions .amc-icon{font-size:1.35rem} .aurora-morph-card .amc-profile-btn-icon .amc-icon,.aurora-morph-card .amc-profile-tab .amc-icon{font-size:1.05rem} @media (prefers-reduced-motion: reduce){.aurora-morph-card .amc-card{animation:none}.aurora-morph-card .amc-image-shimmer{display:none}}`;
var DEFAULT_TIMING = {
  frameDuration: 1600,
  frameDelay: 150,
  captionDelay: 1100,
  captionFadeOut: 400,
  captionFadeIn: 500,
  captionEffect: "typewriter",
  typewriterMin: 55,
  typewriterJitter: 40,
  lettersStagger: 20,
  lettersDuration: 1100
};
var MODES = ["amc-mode-post", "amc-mode-polaroid", "amc-mode-profile", "amc-mode-custom"];
var FRAMES = ["amc-frame-classic", "amc-frame-vintage", "amc-frame-pink", "amc-frame-dark", "amc-frame-floral"];
var EXPO_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
function canAnimate(el) {
  return el && typeof el.animate === "function";
}
class MorphCard {
  /**
   * @param {HTMLElement} card   The `.amc-card` element.
   * @param {Object} [labels]    Text labels of the templates.
   */
  constructor(card, labels) {
    this.card = card;
    this.labels = labels || {};
    this.header = card.querySelector(".amc-header");
    this.image = card.querySelector(".amc-image");
    this.footer = card.querySelector(".amc-footer");
    this.mode = "post";
    this.destroyed = false;
    this.timers = /* @__PURE__ */ new Set();
    this.animations = /* @__PURE__ */ new Set();
    this.styleCache = {};
    this.onResize = function() {
      this.styleCache = {};
    }.bind(this);
    window.addEventListener("resize", this.onResize);
  }
  destroy() {
    this.destroyed = true;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.animations.forEach(function(a) {
      try {
        a.cancel();
      } catch (error) {
      }
    });
    this.animations.clear();
    window.removeEventListener("resize", this.onResize);
    this.card.querySelectorAll(".amc-zone-overlay, .amc-image-shimmer").forEach(function(el) {
      el.remove();
    });
  }
  // Timers and animations are tracked so destroy() stops everything.
  wait(ms, callback) {
    var id = setTimeout(function() {
      this.timers.delete(id);
      if (!this.destroyed) callback();
    }.bind(this), ms);
    this.timers.add(id);
    return id;
  }
  animate(el, keyframes2, options) {
    if (!canAnimate(el)) return Promise.resolve();
    var animation = el.animate(keyframes2, options);
    this.animations.add(animation);
    var self = this;
    return animation.finished.then(function() {
      self.animations.delete(animation);
    }, function() {
      self.animations.delete(animation);
    });
  }
  // ── Rendering ───────────────────────────────────────────────────────
  /** Renders a state instantly, without morphing. */
  renderState(state2) {
    var frame = frameFor(state2);
    this.mode = frame.mode;
    this.applyFrame(frame);
    this.applyContent(contentFor(state2, this.labels));
    var caption = this.footer.querySelector(".amc-caption");
    if (caption && frame.mode === "polaroid") {
      caption.style.fontSize = this.captionFontSize().toFixed(1) + "px";
    }
    return this;
  }
  applyFrame(frame) {
    var card = this.card;
    card.classList.remove.apply(card.classList, MODES.concat(FRAMES));
    card.classList.add("amc-mode-" + frame.mode);
    if (frame.frameClass) card.classList.add(frame.frameClass);
    card.style.borderRadius = frame.borderRadius;
    card.style.padding = frame.padding;
    card.style.rotate = frame.rotate;
    card.style.maxWidth = frame.maxWidth;
    card.style.aspectRatio = frame.aspectRatio;
    card.style.backgroundColor = frame.background;
    this.image.style.aspectRatio = frame.imageAspectRatio;
    this.image.style.borderRadius = frame.imageBorderRadius;
  }
  applyContent(content) {
    this.header.className = content.headerClass;
    this.header.innerHTML = content.header;
    this.header.style.display = content.showHeader ? "" : "none";
    this.image.className = "amc-image" + (content.image.indexOf("amc-post-photo-item") !== -1 ? " amc-post-photo-wrap" : "");
    this.image.innerHTML = content.image;
    this.image.style.display = content.showImage ? "" : "none";
    this.footer.className = "amc-footer";
    this.footer.innerHTML = content.footer;
    this.footer.style.display = content.showFooter ? "" : "none";
  }
  // ── Morphing ────────────────────────────────────────────────────────
  /**
   * Morphs into `state`.
   *
   * @param {Object} state
   * @param {Object} [timing] Overrides of DEFAULT_TIMING.
   * @returns {Promise<MorphCard>} Resolves when the morph, including the caption reveal, is done.
   */
  morphTo(state2, timing) {
    if (!canAnimate(this.card)) {
      this.renderState(state2);
      return Promise.resolve(this);
    }
    var t = Object.assign({}, DEFAULT_TIMING, timing);
    if (state2.transitionDurationMs) {
      var scale = state2.transitionDurationMs / DEFAULT_TIMING.frameDuration;
      t.frameDuration = state2.transitionDurationMs;
      t.captionDelay = DEFAULT_TIMING.captionDelay * scale;
      t.captionFadeOut = DEFAULT_TIMING.captionFadeOut * scale;
      t.captionFadeIn = DEFAULT_TIMING.captionFadeIn * scale;
    }
    return state2.template === "polaroid" ? this.morphToPolaroid(state2, t) : this.morphFrame(state2, t);
  }
  armFrameTransition(duration, settle) {
    this.card.style.setProperty("--amc-morph-duration", duration + "ms");
    this.card.classList.add("is-morphing");
    this.wait(duration + settle, function() {
      this.card.classList.remove("is-morphing");
    }.bind(this));
  }
  /**
   * Crossfade morph: the old zone content is cloned into overlays, the new
   * state is rendered underneath, and the overlays fade out while the
   * frame interpolates through CSS transitions.
   */
  morphFrame(state2, t) {
    this.armFrameTransition(t.frameDuration, t.frameDelay + 60);
    var overlays = this.snapshotOverlays();
    this.renderState(state2);
    var done = this.fadeOverlays(overlays, Math.max(t.captionFadeOut, t.captionFadeIn));
    return done.then(function() {
      return this;
    }.bind(this));
  }
  /**
   * Polaroid morph: same crossfade, plus a shimmer over the photo and a
   * caption reveal (typewriter or per-letter) once the frame has settled.
   */
  morphToPolaroid(state2, t) {
    this.armFrameTransition(t.frameDuration, 60);
    var overlays = this.snapshotOverlays();
    this.renderState(state2);
    var textEl = this.footer.querySelector(".amc-caption-text");
    var fullText = state2.caption || "";
    if (textEl) textEl.textContent = "";
    this.fadeOverlays(overlays, Math.max(t.captionFadeOut, t.captionFadeIn));
    this.playShimmer(t.frameDuration + 300);
    var self = this;
    return new Promise(function(resolve) {
      self.wait(t.captionDelay, function() {
        var target = self.footer.querySelector(".amc-caption-text");
        if (!target) return resolve(self);
        var reveal2 = t.captionEffect === "letters" ? self.revealLetters(target, fullText, t) : self.typewrite(target, fullText, t);
        reveal2.then(function() {
          resolve(self);
        });
      });
    });
  }
  snapshotOverlays() {
    var zones2 = [this.header, this.image, this.footer];
    var cache = this.styleCache[this.mode] || (this.styleCache[this.mode] = /* @__PURE__ */ new Map());
    var out = [];
    zones2.forEach(function(zone) {
      if (!zone || !zone.innerHTML.trim()) return;
      var css2 = cache.get(zone);
      if (!css2) {
        var computed = getComputedStyle(zone);
        css2 = {
          display: computed.display,
          flexDirection: computed.flexDirection,
          alignItems: computed.alignItems,
          justifyContent: computed.justifyContent,
          gap: computed.gap,
          padding: computed.padding
        };
        cache.set(zone, css2);
      }
      var overlay = document.createElement("div");
      overlay.className = "amc-zone-overlay";
      Object.assign(overlay.style, css2);
      overlay.innerHTML = zone.innerHTML;
      out.push({ zone, overlay });
    });
    return out;
  }
  fadeOverlays(overlays, duration) {
    var self = this;
    var elements = overlays.map(function(entry) {
      entry.zone.appendChild(entry.overlay);
      return entry.overlay;
    });
    return Promise.all(elements.map(function(el) {
      return self.animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-in-out", fill: "forwards" }).then(function() {
        el.remove();
      });
    }));
  }
  playShimmer(duration) {
    var shimmer = document.createElement("div");
    shimmer.className = "amc-image-shimmer";
    this.image.appendChild(shimmer);
    var self = this;
    requestAnimationFrame(function() {
      shimmer.classList.add("is-active");
    });
    this.wait(duration, function() {
      self.animate(shimmer, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: "ease-out", fill: "forwards" }).then(function() {
        shimmer.remove();
      });
    });
  }
  // ── Caption reveals ─────────────────────────────────────────────────
  typewrite(el, text2, t) {
    var self = this;
    return new Promise(function(resolve) {
      var index = 0;
      el.textContent = "";
      (function step() {
        if (self.destroyed || !el.isConnected) return resolve();
        if (index >= text2.length) return resolve();
        el.textContent += text2.charAt(index++);
        self.wait(t.typewriterMin + Math.random() * t.typewriterJitter, step);
      })();
    });
  }
  revealLetters(el, text2, t) {
    el.textContent = "";
    text2.split(/(\s+)/).forEach(function(part) {
      if (part.trim() === "") {
        el.appendChild(document.createTextNode(part));
        return;
      }
      var word = document.createElement("span");
      word.className = "amc-word";
      Array.from(part).forEach(function(char) {
        var letter = document.createElement("span");
        letter.className = "amc-letter";
        letter.textContent = char;
        word.appendChild(letter);
      });
      el.appendChild(word);
    });
    var letters = Array.prototype.slice.call(el.querySelectorAll(".amc-letter"));
    var self = this;
    if (!letters.length || !canAnimate(letters[0])) {
      el.textContent = text2;
      return Promise.resolve();
    }
    return Promise.all(letters.map(function(letter, index) {
      return self.animate(letter, [
        { opacity: 0, transform: "translateY(35px) rotateX(-45deg)", filter: "blur(12px)" },
        { opacity: 1, transform: "translateY(0) rotateX(0)", filter: "blur(0)" }
      ], { duration: t.lettersDuration, delay: index * t.lettersStagger, easing: EXPO_OUT, fill: "both" });
    }));
  }
  captionFontSize(width) {
    var w = width || this.card.getBoundingClientRect().width || 320;
    return Math.max(11, Math.min(22, w / 320 * 21.6));
  }
}
function buildDom(el) {
  var card = document.createElement("div");
  card.className = "amc-card";
  card.innerHTML = '<div class="amc-header"></div><div class="amc-image"></div><div class="amc-footer"></div>';
  el.textContent = "";
  el.appendChild(card);
  return card;
}
var morphCard = defineModule({
  name: "morph-card",
  schema,
  init: function(el, options, ctx) {
    var states = Array.isArray(options.states) ? options.states.filter(function(s) {
      return s && typeof s === "object";
    }) : [];
    if (!states.length) {
      ctx.warn("No states: pass `states` (a JSON array) to render the card.");
      return {};
    }
    ctx.style("morph-card", STYLESHEET);
    var originalNodes = Array.prototype.slice.call(el.childNodes);
    var hadClass = el.classList.contains("aurora-morph-card");
    el.classList.add("aurora-morph-card");
    el.classList.toggle("no-float", !options.float);
    var card = new MorphCard(buildDom(el), options.labels);
    var index = 0;
    var timer = null;
    var busy = false;
    function schedule(ms) {
      clearTimeout(timer);
      timer = setTimeout(advance, Math.max(0, ms));
    }
    function goTo(target) {
      if (busy) return Promise.resolve();
      busy = true;
      var next = states[target];
      return card.morphTo(next, { captionEffect: options.captionEffect }).then(function() {
        index = target;
        busy = false;
        return index;
      });
    }
    function advance() {
      var target = index + 1;
      if (target >= states.length) {
        if (!options.loop) return;
        target = 0;
      }
      goTo(target).then(function() {
        schedule(states[index].durationMs || 3e3);
      });
    }
    function start() {
      card.renderState(states[0]);
      index = 0;
      if (ctx.reducedMotion) return;
      if (typeof card.card.animate === "function") {
        card.card.animate(
          [{ opacity: 0, transform: "translateY(30px) scale(0.92)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
          { duration: 900, delay: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }
        );
      }
      if (options.autoplay && states.length > 1) {
        schedule((states[0].durationMs || 3e3) + options.initialDelay);
      }
    }
    start();
    ctx.onDestroy(function() {
      clearTimeout(timer);
      card.destroy();
      el.classList.remove("no-float");
      if (!hadClass) el.classList.remove("aurora-morph-card");
      el.textContent = "";
      originalNodes.forEach(function(node) {
        el.appendChild(node);
      });
    });
    return {
      replay: function() {
        clearTimeout(timer);
        busy = false;
        start();
      },
      api: {
        next: function() {
          return goTo((index + 1) % states.length);
        },
        goTo
      }
    };
  }
});
function createFullAurora(config) {
  var aurora = createAurora(config);
  [text, children, cursor, gradient, morphCard].forEach(function(definition) {
    aurora.register(definition);
  });
  return aurora;
}
export {
  VERSION,
  children,
  createAurora,
  createFullAurora,
  cursor,
  defineModule,
  gradient,
  morphCard,
  text
};
//# sourceMappingURL=aurora.esm.js.map
