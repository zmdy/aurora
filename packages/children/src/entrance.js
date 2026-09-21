import { buildKeyframes, isEmphasis } from './catalog.js';

/**
 * Entrance engine built on the Web Animations API.
 *
 * Animations use `fill: 'backwards'` only: the first keyframe applies during
 * the delay, and once the animation ends nothing keeps owning `transform` or
 * `filter`. That keeps the element free for hover transitions afterwards.
 */

function supportsWaapi() {
    return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
}

/** Direction of child `index` once the alternate mode is applied. */
export function directionFor(options, index) {
    var even = index % 2 === 0;
    if (options.alternate === 'horizontal') return even ? 'left' : 'right';
    if (options.alternate === 'vertical') return even ? 'up' : 'down';
    return options.direction;
}

export function hide(el) {
    el.style.opacity = '0';
}

export function reveal(el) {
    el.style.opacity = '';
}

/**
 * Plays the animation on one child.
 *
 * @returns {Animation|null}
 */
export function play(el, options, index) {
    reveal(el);
    if (options.animation === 'none' || !supportsWaapi()) return null;

    var frames = buildKeyframes(options.animation, directionFor(options, index), options.distance);
    if (!frames.length) return null;

    return el.animate(frames, {
        duration: options.duration,
        delay: options.delay + index * options.stagger,
        easing: options.easing,
        fill: 'backwards',
    });
}

/** True when the animation hides the children until it plays. */
export function hidesChildren(options) {
    return options.animation !== 'none' && !isEmphasis(options.animation);
}
