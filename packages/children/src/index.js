import { defineModule } from '@aurora/core';
import { schema } from './schema.js';
import { resolveChildren } from './targets.js';
import { play, hide, reveal, hidesChildren } from './entrance.js';
import { mountHover } from './hover.js';

export { schema } from './schema.js';
export { families, buildKeyframes } from './catalog.js';

/**
 * Animate Children: staggered entrance, hover and proximity effects for the
 * children of an element.
 */
export var children = defineModule({
    name: 'children',
    schema: schema,

    init: function (el, options, ctx) {
        var targets = resolveChildren(el, options);
        var animations = [];
        var unmountHover = null;
        var played = false;

        function cancelAnimations() {
            animations.forEach(function (animation) { animation.cancel(); });
            animations = [];
        }

        function run() {
            cancelAnimations();
            played = true;
            targets.forEach(function (child, index) {
                var animation = play(child, options, index);
                if (animation) animations.push(animation);
            });
            ctx.emit('play', { count: targets.length });
        }

        function rewind() {
            cancelAnimations();
            played = false;
            if (hidesChildren(options)) targets.forEach(hide);
        }

        if (options.hover && targets.length) {
            unmountHover = mountHover(el, targets, options, ctx, ctx.reducedMotion);
        }

        if (options.animation !== 'none' && targets.length) {
            if (ctx.reducedMotion) {
                // Motion-sensitive users get the final state straight away.
                targets.forEach(reveal);
            } else if (options.trigger === 'load') {
                run();
            } else {
                if (hidesChildren(options)) targets.forEach(hide);
                ctx.observe(el, {
                    threshold: options.threshold,
                    rootMargin: '0px 0px -30px 0px',
                    once: !options.replay,
                    onEnter: function () { if (!played || options.replay) run(); },
                    onLeave: options.replay ? rewind : undefined,
                });
            }
        }

        ctx.onDestroy(function () {
            cancelAnimations();
            if (unmountHover) unmountHover();
            targets.forEach(reveal);
        });

        return {
            replay: function () {
                if (ctx.reducedMotion || options.animation === 'none') return;
                rewind();
                // Let the hidden state paint so the animation is visible.
                requestAnimationFrame(run);
            },
        };
    },
});
