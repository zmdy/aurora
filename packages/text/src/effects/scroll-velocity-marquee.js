var effect = {
    id: 'scroll-velocity-marquee',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original || textEl.textContent || '';
        if (!original) return;

        textEl.innerHTML = '';
        textEl.style.opacity = '1';
        textEl.style.overflow = 'hidden';
        textEl.style.display = 'block';

        if (fx.reducedMotion) {
            textEl.textContent = original;
            textEl.style.overflow = '';
            textEl.style.display = '';
            return;
        }

        var track = document.createElement('div');
        track.style.cssText = 'display:flex;white-space:nowrap;will-change:transform;';

        var seg1 = document.createElement('span');
        seg1.textContent = ' • ' + original;
        seg1.style.cssText = 'display:inline-block;';
        var seg2 = seg1.cloneNode(true);
        seg2.setAttribute('aria-hidden', 'true');

        track.appendChild(seg1);
        track.appendChild(seg2);
        textEl.appendChild(track);

        var BASE_SPEED = 0.028; // px/ms constant creep
        var FRICTION = 0.06; // how fast a scroll boost decays back to base, per frame
        var state = { pos: 0, boost: 0, lastTs: null, rafId: null, running: false, lastScrollY: window.scrollY || 0 };
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
            var dy = y - state.lastScrollY;
            state.lastScrollY = y;
            state.boost += dy * 0.9;
            var MAX_BOOST = 4;
            if (state.boost > MAX_BOOST) state.boost = MAX_BOOST;
            if (state.boost < -MAX_BOOST) state.boost = -MAX_BOOST;
        }

        function tick(ts) {
            if (state.lastTs == null) state.lastTs = ts;
            var dt = Math.min(48, ts - state.lastTs);
            state.lastTs = ts;

            state.boost *= (1 - FRICTION);
            var speed = BASE_SPEED + state.boost;
            state.pos += speed * dt;
            if (loopDistance > 0) {
                state.pos = ((state.pos % loopDistance) + loopDistance) % loopDistance;
            }
            fx.set(track, { translateX: -state.pos });
            state.rafId = requestAnimationFrame(tick);
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !state.running) {
                    state.running = true;
                    state.lastTs = null;
                    state.rafId = requestAnimationFrame(tick);
                } else if (!entry.isIntersecting && state.running) {
                    state.running = false;
                    if (state.rafId) cancelAnimationFrame(state.rafId);
                    state.rafId = null;
                }
            });
        }, { threshold: 0.01 });
        io.observe(textEl);

        fx.on(window, 'scroll', onScroll, { passive: true });
        fx.on(window, 'resize', onResize);

        fx.onCleanup(function () {
            io.disconnect();
            clearTimeout(resizeTimer);
            if (state.rafId) cancelAnimationFrame(state.rafId);
            state.running = false;
            textEl.style.overflow = '';
            textEl.style.display = '';
        });
    },
};

export default effect;
