import { defineModule } from '@aurora/core';
import { schema } from './schema.js';
import { effects, EFFECT_IDS } from './effects/index.js';
import { splitText, textWithBreaks } from './split.js';
import { createFx } from './fx.js';

export { schema } from './schema.js';
export { effects, EFFECT_IDS } from './effects/index.js';

/**
 * Text: split-text entrance and loop effects.
 *
 * The module owns the lifecycle. Each run splits a fresh copy of the original
 * markup, hides the units, plays the effect and, on rewind or destroy, stops
 * everything the effect started and restores the original markup.
 */
export var text = defineModule({
    name: 'text',
    schema: schema,

    init: function (el, options, ctx) {
        var effect = effects[options.effect];
        if (!effect) {
            ctx.warn('Unknown effect "' + options.effect + '".');
            return {};
        }

        var textEl = options.target ? el.querySelector(options.target) || el : el;
        var pristineHTML = textEl.innerHTML;
        var pristineStyle = textEl.getAttribute('style');
        var pristineLabel = textEl.getAttribute('aria-label');
        // textWithBreaks, not textContent: a bare <br> contributes no
        // character to textContent, so "um<br>dois" would otherwise read back
        // as "umdois" for every self-managed effect that falls back to
        // fx.original (cinema-title, gradient-flow-text, mesh-text, ...).
        var original = textWithBreaks(textEl);

        var fx = null;
        var units = [];
        var played = false;

        function restore() {
            textEl.innerHTML = pristineHTML;
            if (pristineStyle === null) textEl.removeAttribute('style');
            else textEl.setAttribute('style', pristineStyle);
            if (pristineLabel === null) textEl.removeAttribute('aria-label');
            else textEl.setAttribute('aria-label', pristineLabel);
        }

        /** Stops the current run, restores the markup, then splits and hides. */
        function prepare() {
            if (fx) fx.cleanup();
            restore();
            fx = createFx(textEl, original);
            played = false;

            if (effect.selfManaged) {
                units = [];
                textEl.style.opacity = '0';
            } else {
                units = splitText(textEl, options.split);
                units.forEach(function (unit) { unit.style.opacity = '0'; });
            }
            ctx.emit('split', { textEl: textEl, units: units });
            bindHover();
        }

        function bindHover() {
            if (!options.hoverScatter || !units.length) return;
            var intensity = options.hoverIntensity;
            var duration = options.hoverDuration;
            var random = function (min, max) { return fx.utils.random(min, max); };

            fx.on(el, 'pointerenter', function () {
                units.forEach(function (unit) {
                    fx.animate(unit, {
                        translateX: random(-intensity, intensity),
                        translateY: random(-intensity, intensity),
                        rotate: random(-intensity, intensity) / 2,
                        duration: duration,
                        ease: 'outQuart',
                    });
                });
            });
            fx.on(el, 'pointerleave', function () {
                units.forEach(function (unit) {
                    fx.animate(unit, {
                        translateX: 0,
                        translateY: 0,
                        rotate: 0,
                        duration: duration,
                        ease: 'outElastic(1,.6)',
                    });
                });
            });
        }

        function run() {
            if (played && !options.replay) return;
            played = true;
            if (effect.selfManaged) textEl.style.opacity = '0';
            else units.forEach(function (unit) { unit.style.opacity = '0'; });
            effect.run(units, options, textEl, fx);
            ctx.emit('play', { effect: options.effect });
        }

        // Reduced motion: leave the text untouched and visible.
        if (ctx.reducedMotion) return {};

        prepare();

        if (options.trigger === 'load') {
            run();
        } else {
            // Threshold is capped so tall or partially visible headings still start.
            ctx.observe(el, {
                threshold: Math.min(options.threshold, 0.05),
                once: !options.replay,
                onEnter: run,
                onLeave: options.replay ? prepare : undefined,
            });

            // Observers never report elements that are already behind the
            // viewport when the page restores its scroll position on reload.
            var timer = setTimeout(function () {
                if (played) return;
                var rect = el.getBoundingClientRect();
                var viewport = window.innerHeight || document.documentElement.clientHeight;
                if (rect.bottom <= 0 || (rect.bottom > 0 && rect.top < viewport)) run();
            }, 200);
            ctx.onDestroy(function () { clearTimeout(timer); });
        }

        ctx.onDestroy(function () {
            if (fx) fx.cleanup();
            fx = null;
            restore();
        });

        return {
            replay: function () {
                prepare();
                requestAnimationFrame(run);
            },
        };
    },
});

