/**
 * Shared IntersectionObserver pool.
 *
 * Observers are keyed by `threshold` + `rootMargin`, so a page with many
 * animated elements creates a handful of observers instead of one per element.
 */

var pool = new Map();

/**
 * @typedef {Object} ObserveOptions
 * @property {number} [threshold=0]      0..1 ratio of the element that must be visible.
 * @property {string} [rootMargin='0px']
 * @property {boolean} [once=false]      Stop observing after the first enter.
 * @property {(entry: IntersectionObserverEntry|{isIntersecting: boolean, target: Element}) => void} [onEnter]
 * @property {(entry: IntersectionObserverEntry) => void} [onLeave]
 */

/**
 * Calls `onEnter` when the element becomes visible and `onLeave` when it stops
 * being visible. Without IntersectionObserver support the element is treated
 * as visible right away.
 *
 * @param {Element} el
 * @param {ObserveOptions} options
 * @returns {() => void} Stops observing.
 */
export function observe(el, options) {
    var opts = options || {};
    var threshold = typeof opts.threshold === 'number' ? opts.threshold : 0;
    var rootMargin = opts.rootMargin || '0px';

    if (typeof IntersectionObserver === 'undefined') {
        var timer = setTimeout(function () {
            if (opts.onEnter) opts.onEnter({ isIntersecting: true, target: el });
        }, 0);
        return function () { clearTimeout(timer); };
    }

    var key = threshold + '|' + rootMargin;
    var bucket = pool.get(key);

    if (!bucket) {
        bucket = { records: new Map() };
        bucket.io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                var list = bucket.records.get(entry.target);
                if (!list) return;
                list.slice().forEach(function (record) { dispatch(record, entry, bucket); });
            });
        }, { threshold: threshold, rootMargin: rootMargin });
        pool.set(key, bucket);
    }

    var record = { el: el, options: opts, inside: false, removed: false };
    var records = bucket.records.get(el);
    if (!records) {
        records = [];
        bucket.records.set(el, records);
        bucket.io.observe(el);
    }
    records.push(record);

    return function () { remove(bucket, record); };
}

function dispatch(record, entry, bucket) {
    if (record.removed) return;
    if (entry.isIntersecting) {
        if (record.inside) return;
        record.inside = true;
        if (record.options.onEnter) record.options.onEnter(entry);
        if (record.options.once) remove(bucket, record);
    } else if (record.inside) {
        record.inside = false;
        if (record.options.onLeave) record.options.onLeave(entry);
    }
}

function remove(bucket, record) {
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
