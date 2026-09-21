import { frameFor, contentFor, escapeHtml } from './templates.js';

/**
 * Default timings, in milliseconds.
 */
export var DEFAULT_TIMING = {
    frameDuration: 1600,
    frameDelay: 150,
    captionDelay: 1100,
    captionFadeOut: 400,
    captionFadeIn: 500,
    captionEffect: 'typewriter',
    typewriterMin: 55,
    typewriterJitter: 40,
    lettersStagger: 20,
    lettersDuration: 1100,
};

var MODES = ['amc-mode-post', 'amc-mode-polaroid', 'amc-mode-profile', 'amc-mode-custom'];
var FRAMES = ['amc-frame-classic', 'amc-frame-vintage', 'amc-frame-pink', 'amc-frame-dark', 'amc-frame-floral'];
var EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

function canAnimate(el) {
    return el && typeof el.animate === 'function';
}

/**
 * Owns the card element (`.amc-card` with header, image and footer zones) and
 * morphs it between states.
 *
 * Frame values are always written as explicit inline styles, never cleared,
 * so the browser sees `20px -> 40px` and the CSS transitions armed by the
 * `is-morphing` class interpolate cleanly. Zone content crossfades: the old
 * content is cloned into an overlay on top of the new content and faded out,
 * so the card is never blank between states.
 */
export class MorphCard {
    /**
     * @param {HTMLElement} card   The `.amc-card` element.
     * @param {Object} [labels]    Text labels of the templates.
     */
    constructor(card, labels) {
        this.card = card;
        this.labels = labels || {};
        this.header = card.querySelector('.amc-header');
        this.image = card.querySelector('.amc-image');
        this.footer = card.querySelector('.amc-footer');
        this.mode = 'post';
        this.destroyed = false;
        this.timers = new Set();
        this.animations = new Set();
        this.styleCache = {};
        this.onResize = function () { this.styleCache = {}; }.bind(this);
        window.addEventListener('resize', this.onResize);
    }

    destroy() {
        this.destroyed = true;
        this.timers.forEach(clearTimeout);
        this.timers.clear();
        this.animations.forEach(function (a) { try { a.cancel(); } catch (error) { /* already finished */ } });
        this.animations.clear();
        window.removeEventListener('resize', this.onResize);
        this.card.querySelectorAll('.amc-zone-overlay, .amc-image-shimmer').forEach(function (el) { el.remove(); });
    }

    // Timers and animations are tracked so destroy() stops everything.
    wait(ms, callback) {
        var id = setTimeout(function () {
            this.timers.delete(id);
            if (!this.destroyed) callback();
        }.bind(this), ms);
        this.timers.add(id);
        return id;
    }

    animate(el, keyframes, options) {
        if (!canAnimate(el)) return Promise.resolve();
        var animation = el.animate(keyframes, options);
        this.animations.add(animation);
        var self = this;
        return animation.finished.then(function () { self.animations.delete(animation); }, function () { self.animations.delete(animation); });
    }

    // ── Rendering ───────────────────────────────────────────────────────

    /** Renders a state instantly, without morphing. */
    renderState(state) {
        var frame = frameFor(state);
        this.mode = frame.mode;
        this.applyFrame(frame);
        this.applyContent(contentFor(state, this.labels));
        var caption = this.footer.querySelector('.amc-caption');
        if (caption && frame.mode === 'polaroid') {
            caption.style.fontSize = this.captionFontSize().toFixed(1) + 'px';
        }
        return this;
    }

    applyFrame(frame) {
        var card = this.card;
        card.classList.remove.apply(card.classList, MODES.concat(FRAMES));
        card.classList.add('amc-mode-' + frame.mode);
        if (frame.frameClass) card.classList.add(frame.frameClass);

        card.style.borderRadius = frame.borderRadius;
        card.style.padding = frame.padding;
        card.style.rotate = frame.rotate;
        card.style.maxWidth = frame.maxWidth;
        card.style.aspectRatio = frame.aspectRatio;
        // Longhand: the shorthand would wipe background-image and friends.
        card.style.backgroundColor = frame.background;
        this.image.style.aspectRatio = frame.imageAspectRatio;
        this.image.style.borderRadius = frame.imageBorderRadius;
    }

    applyContent(content) {
        this.header.className = content.headerClass;
        this.header.innerHTML = content.header;
        this.header.style.display = content.showHeader ? '' : 'none';

        this.image.className = 'amc-image' + (content.image.indexOf('amc-post-photo-item') !== -1 ? ' amc-post-photo-wrap' : '');
        this.image.innerHTML = content.image;
        this.image.style.display = content.showImage ? '' : 'none';

        this.footer.className = 'amc-footer';
        this.footer.innerHTML = content.footer;
        this.footer.style.display = content.showFooter ? '' : 'none';
    }

    // ── Morphing ────────────────────────────────────────────────────────

    /**
     * Morphs into `state`.
     *
     * @param {Object} state
     * @param {Object} [timing] Overrides of DEFAULT_TIMING.
     * @returns {Promise<MorphCard>} Resolves when the morph, including the caption reveal, is done.
     */
    morphTo(state, timing) {
        if (!canAnimate(this.card)) {
            this.renderState(state);
            return Promise.resolve(this);
        }

        var t = Object.assign({}, DEFAULT_TIMING, timing);
        if (state.transitionDurationMs) {
            // Stretch the related timings so the morph still reads as one motion.
            var scale = state.transitionDurationMs / DEFAULT_TIMING.frameDuration;
            t.frameDuration = state.transitionDurationMs;
            t.captionDelay = DEFAULT_TIMING.captionDelay * scale;
            t.captionFadeOut = DEFAULT_TIMING.captionFadeOut * scale;
            t.captionFadeIn = DEFAULT_TIMING.captionFadeIn * scale;
        }

        return state.template === 'polaroid' ? this.morphToPolaroid(state, t) : this.morphFrame(state, t);
    }

    armFrameTransition(duration, settle) {
        this.card.style.setProperty('--amc-morph-duration', duration + 'ms');
        this.card.classList.add('is-morphing');
        this.wait(duration + settle, function () { this.card.classList.remove('is-morphing'); }.bind(this));
    }

    /**
     * Crossfade morph: the old zone content is cloned into overlays, the new
     * state is rendered underneath, and the overlays fade out while the
     * frame interpolates through CSS transitions.
     */
    morphFrame(state, t) {
        this.armFrameTransition(t.frameDuration, t.frameDelay + 60);
        var overlays = this.snapshotOverlays();
        this.renderState(state);
        var done = this.fadeOverlays(overlays, Math.max(t.captionFadeOut, t.captionFadeIn));
        return done.then(function () { return this; }.bind(this));
    }

    /**
     * Polaroid morph: same crossfade, plus a shimmer over the photo and a
     * caption reveal (typewriter or per-letter) once the frame has settled.
     */
    morphToPolaroid(state, t) {
        this.armFrameTransition(t.frameDuration, 60);
        var overlays = this.snapshotOverlays();
        this.renderState(state);

        // The caption starts empty under the overlay, so the reveal shows it for the first time.
        var textEl = this.footer.querySelector('.amc-caption-text');
        var fullText = state.caption || '';
        if (textEl) textEl.textContent = '';

        this.fadeOverlays(overlays, Math.max(t.captionFadeOut, t.captionFadeIn));
        this.playShimmer(t.frameDuration + 300);

        var self = this;
        return new Promise(function (resolve) {
            self.wait(t.captionDelay, function () {
                var target = self.footer.querySelector('.amc-caption-text');
                if (!target) return resolve(self);
                var reveal = t.captionEffect === 'letters' ? self.revealLetters(target, fullText, t) : self.typewrite(target, fullText, t);
                reveal.then(function () { resolve(self); });
            });
        });
    }

    snapshotOverlays() {
        var zones = [this.header, this.image, this.footer];
        var cache = this.styleCache[this.mode] || (this.styleCache[this.mode] = new Map());
        var out = [];

        zones.forEach(function (zone) {
            if (!zone || !zone.innerHTML.trim()) return;
            var css = cache.get(zone);
            if (!css) {
                var computed = getComputedStyle(zone);
                css = {
                    display: computed.display, flexDirection: computed.flexDirection, alignItems: computed.alignItems,
                    justifyContent: computed.justifyContent, gap: computed.gap, padding: computed.padding,
                };
                cache.set(zone, css);
            }
            var overlay = document.createElement('div');
            overlay.className = 'amc-zone-overlay';
            Object.assign(overlay.style, css);
            overlay.innerHTML = zone.innerHTML;
            out.push({ zone: zone, overlay: overlay });
        });
        return out;
    }

    fadeOverlays(overlays, duration) {
        var self = this;
        var elements = overlays.map(function (entry) {
            entry.zone.appendChild(entry.overlay);
            return entry.overlay;
        });
        return Promise.all(elements.map(function (el) {
            return self.animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration: duration, easing: 'ease-in-out', fill: 'forwards' })
                .then(function () { el.remove(); });
        }));
    }

    playShimmer(duration) {
        var shimmer = document.createElement('div');
        shimmer.className = 'amc-image-shimmer';
        this.image.appendChild(shimmer);
        var self = this;
        requestAnimationFrame(function () { shimmer.classList.add('is-active'); });
        this.wait(duration, function () {
            self.animate(shimmer, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-out', fill: 'forwards' })
                .then(function () { shimmer.remove(); });
        });
    }

    // ── Caption reveals ─────────────────────────────────────────────────

    typewrite(el, text, t) {
        var self = this;
        return new Promise(function (resolve) {
            var index = 0;
            el.textContent = '';
            (function step() {
                if (self.destroyed || !el.isConnected) return resolve();
                if (index >= text.length) return resolve();
                el.textContent += text.charAt(index++);
                self.wait(t.typewriterMin + Math.random() * t.typewriterJitter, step);
            })();
        });
    }

    revealLetters(el, text, t) {
        el.textContent = '';
        text.split(/(\s+)/).forEach(function (part) {
            if (part.trim() === '') {
                el.appendChild(document.createTextNode(part));
                return;
            }
            var word = document.createElement('span');
            word.className = 'amc-word';
            Array.from(part).forEach(function (char) {
                var letter = document.createElement('span');
                letter.className = 'amc-letter';
                letter.textContent = char;
                word.appendChild(letter);
            });
            el.appendChild(word);
        });

        var letters = Array.prototype.slice.call(el.querySelectorAll('.amc-letter'));
        var self = this;
        if (!letters.length || !canAnimate(letters[0])) {
            el.textContent = text;
            return Promise.resolve();
        }

        return Promise.all(letters.map(function (letter, index) {
            return self.animate(letter, [
                { opacity: 0, transform: 'translateY(35px) rotateX(-45deg)', filter: 'blur(12px)' },
                { opacity: 1, transform: 'translateY(0) rotateX(0)', filter: 'blur(0)' },
            ], { duration: t.lettersDuration, delay: index * t.lettersStagger, easing: EXPO_OUT, fill: 'both' });
        }));
    }

    captionFontSize(width) {
        var w = width || this.card.getBoundingClientRect().width || 320;
        return Math.max(11, Math.min(22, (w / 320) * 21.6));
    }
}

export { escapeHtml };
