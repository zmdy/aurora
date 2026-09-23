/**
 * Directional clip-mask reveal: words masked with splitText()'s wrap:'clip'
 * slide in from the given side as their mask uncovers them.
 */
var CONFIG = {
    down: { prop: 'translateY', from: '100%' },
    up: { prop: 'translateY', from: '-100%' },
    left: { prop: 'translateX', from: '-100%' },
    right: { prop: 'translateX', from: '100%' },
};

var effect = {
    id: 'clip-wrap',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        textEl.style.opacity = '1';
        var direction = opts.direction || 'down';
        var cfg = CONFIG[direction] || CONFIG.down;
        var split = fx.resplit(textEl, { words: { wrap: 'clip' } });
        var props = {
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        };
        props[cfg.prop] = [cfg.from, '0%'];
        fx.animate(split.words, props);
    },
};

export default effect;
