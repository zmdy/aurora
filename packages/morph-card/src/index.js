import { defineModule } from '@aurora/core';
import { schema } from './schema.js';
import { STYLESHEET } from './styles.js';
import { MorphCard } from './card.js';

export { schema } from './schema.js';
export { MorphCard, DEFAULT_TIMING } from './card.js';
export { TEMPLATES, DEFAULT_LABELS } from './templates.js';

function buildDom(el) {
    var card = document.createElement('div');
    card.className = 'amc-card';
    card.innerHTML = '<div class="amc-header"></div><div class="amc-image"></div><div class="amc-footer"></div>';
    el.textContent = '';
    el.appendChild(card);
    return card;
}

/**
 * Morph Card: builds a card from JSON states and morphs between them.
 *
 * The module replaces the content of its element and restores it on destroy.
 * Manual control lives on `instance.api`: `next()` and `goTo(index)`.
 */
export var morphCard = defineModule({
    name: 'morph-card',
    schema: schema,

    init: function (el, options, ctx) {
        var states = Array.isArray(options.states) ? options.states.filter(function (s) { return s && typeof s === 'object'; }) : [];
        if (!states.length) {
            ctx.warn('No states: pass `states` (a JSON array) to render the card.');
            return {};
        }

        ctx.style('morph-card', STYLESHEET);

        var originalNodes = Array.prototype.slice.call(el.childNodes);
        var hadClass = el.classList.contains('aurora-morph-card');
        el.classList.add('aurora-morph-card');
        el.classList.toggle('no-float', !options.float);

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
            return card.morphTo(next, { captionEffect: options.captionEffect }).then(function () {
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
            goTo(target).then(function () { schedule(states[index].durationMs || 3000); });
        }

        function start() {
            card.renderState(states[0]);
            index = 0;
            if (ctx.reducedMotion) return;

            if (typeof card.card.animate === 'function') {
                card.card.animate(
                    [{ opacity: 0, transform: 'translateY(30px) scale(0.92)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }],
                    { duration: 900, delay: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
                );
            }
            if (options.autoplay && states.length > 1) {
                schedule((states[0].durationMs || 3000) + options.initialDelay);
            }
        }

        start();

        ctx.onDestroy(function () {
            clearTimeout(timer);
            card.destroy();
            el.classList.remove('no-float');
            if (!hadClass) el.classList.remove('aurora-morph-card');
            el.textContent = '';
            originalNodes.forEach(function (node) { el.appendChild(node); });
        });

        return {
            replay: function () {
                clearTimeout(timer);
                busy = false;
                start();
            },
            api: {
                next: function () { return goTo((index + 1) % states.length); },
                goTo: goTo,
            },
        };
    },
});
