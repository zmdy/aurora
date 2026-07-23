/**
 * Aurora Text Animation — effect registry.
 *
 * Every effect file (assets/js/src/effects/**\/*.js) registers itself here
 * as a side effect of being loaded/imported. This is what lets each effect
 * live in its own file and its own frontend script chunk:
 *
 *  - In the EDITOR bundle, every effect file is statically imported by
 *    entries/editor.js, so all of them register immediately and the panel
 *    can preview ANY effect instantly, with no extra network round trip.
 *  - On the real FRONTEND, PHP enqueues only the ONE chunk a given widget
 *    actually uses (see Text_Animation_Controls::get_render_attributes());
 *    that chunk's own top-level code calls registerEffect() the moment its
 *    <script> tag runs, populating the exact same global registry.
 *
 * Either way, core/engine.js only ever talks to `window.AuroraTextEffects`
 * — it never needs to know how many effects exist or how they got there.
 * Adding effect #26 is just: add one file, forget everything else.
 */

/**
 * @typedef {Object} AuroraTextEffect
 * @property {string}   id           e.g. 'gs-1', 'ml-15'
 * @property {boolean}  [selfManaged] True for effects that do their own
 *                                    DOM split/scramble instead of using
 *                                    the generic pre-split `units` array
 *                                    (e.g. native Anime.js splitText/
 *                                    scrambleText, or the hand-rolled
 *                                    scramble effect).
 * @property {function(HTMLElement[], Object, HTMLElement): void} run
 */

/**
 * Registers an effect into the shared global registry.
 *
 * @param {AuroraTextEffect} effect
 */
export function registerEffect(effect) {
    if (typeof window === 'undefined' || !effect || !effect.id) return;
    window.AuroraPlugin = window.AuroraPlugin || {};
    window.AuroraPlugin.TextEffects = window.AuroraPlugin.TextEffects || {};
    window.AuroraPlugin.TextEffects[effect.id] = effect;
}

/**
 * Looks up a previously registered effect by id.
 *
 * @param {string} id
 * @returns {AuroraTextEffect|undefined}
 */
export function getEffect(id) {
    if (typeof window === 'undefined' || !window.AuroraPlugin || !window.AuroraPlugin.TextEffects) return undefined;
    return window.AuroraPlugin.TextEffects[id];
}
