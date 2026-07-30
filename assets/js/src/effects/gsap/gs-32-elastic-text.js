import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

var CHROMA_COLORS = ['#ff5ea8', '#5ec8ff', '#c9ff5e'];

// Elastic Text — inspired by the idea of a spring-damped word that's
// magnetically pulled toward the cursor, trailing a chromatic-aberration
// "echo" while it moves, explored via a pasted Originkit React source.
// Reimplemented from scratch as a simple velocity/damping integrator
// driven by requestAnimationFrame (no React refs/ResizeObserver — Aurora
// effects are framework-free), with a hardcoded 3-colour trail instead of
// that component's configurable chromaColors prop.
//
// Self-managed: the spring applies to the whole text block as ONE unit
// (like gs-25 Perspective Fly), not per split unit — many independent
// springs on the same letters would fight each other and look chaotic.
//
// Runs forever once mounted (there's nothing to "finish"), same trade-off
// as ml-15 Continuous Wave: replaying/disabling doesn't retroactively
// clean up mid-flight, just stops feeding it new input. The loop is
// stored on textEl._auroraLoopAnim with a `.pause()` method, so
// core/engine.js's teardownTextAnimation() already knows how to stop it
// when the widget's animation is fully disabled.
var effect = {
    id: 'gs-32',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var inner = document.createElement('span');
        inner.textContent = original;
        inner.style.cssText = 'display:inline-block;will-change:transform,text-shadow;';
        textEl.appendChild(inner);

        gsap.fromTo(inner,
            { opacity: 0, y: 16 },
            {
                opacity: 1,
                y: 0,
                duration: Math.max(0.3, opts.duration / 1000),
                delay: opts.delay / 1000,
                ease: 'power3.out',
            }
        );

        // Stop any previous spring loop from an earlier init before
        // starting a new one.
        if (textEl._auroraLoopAnim && typeof textEl._auroraLoopAnim.pause === 'function') {
            textEl._auroraLoopAnim.pause();
        }

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

        function tick() {
            velX += (targetX - dispX) * STIFFNESS;
            velY += (targetY - dispY) * STIFFNESS;
            velX *= DAMPING;
            velY *= DAMPING;
            dispX += velX;
            dispY += velY;

            var mag = Math.hypot(dispX, dispY);
            inner.style.transform = mag < 0.1 ? '' : 'translate3d(' + dispX.toFixed(1) + 'px,' + dispY.toFixed(1) + 'px,0)';

            var speed = Math.hypot(velX, velY);
            if (speed < 0.05) {
                inner.style.textShadow = '';
            } else {
                var dirX = velX / speed;
                var dirY = velY / speed;
                var ramp = Math.min(1, speed / 2);
                var shadows = [];
                for (var i = 0; i < CHROMA_COLORS.length; i++) {
                    var g = (i + 1) * 6 * ramp;
                    shadows.push((-dirX * g).toFixed(1) + 'px ' + (-dirY * g).toFixed(1) + 'px 0 ' + CHROMA_COLORS[i]);
                }
                inner.style.textShadow = shadows.join(',');
            }

            rafId = requestAnimationFrame(tick);
        }

        window.addEventListener('mousemove', onMove, { passive: true });
        rafId = requestAnimationFrame(tick);

        textEl._auroraLoopAnim = {
            pause: function () {
                if (rafId) cancelAnimationFrame(rafId);
                window.removeEventListener('mousemove', onMove);
                inner.style.transform = '';
                inner.style.textShadow = '';
            },
        };
    },
};

registerEffect(effect);
export default effect;
