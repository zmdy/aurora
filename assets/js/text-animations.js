/**
 * Aurora for Elementor — Frontend: Text Animations
 *
 * Supports 24 animations (10 GSAP + 14 Anime.js) with split by
 * characters, words, or lines, triggered by IntersectionObserver or
 * on page load.
 *
 * @package Aurora
 * @version 1.0.0
 */

/* global gsap, anime, elementorFrontend, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns the first meaningful text element inside the wrapper
     * (respects Elementor's native selectors).
     *
     * @param {HTMLElement} wrapper
     * @returns {HTMLElement}
     */
    function getTextTarget(wrapper) {
        var selectors = [
            '.elementor-heading-title',
            '.elementor-text-editor > *:first-child',
            '.elementor-button-text',
            '.elementor-counter-number',
            '.elementor-price-table__heading',
            '.elementor-widget-container > h1',
            '.elementor-widget-container > h2',
            '.elementor-widget-container > h3',
            '.elementor-widget-container > h4',
            '.elementor-widget-container > h5',
            '.elementor-widget-container > h6',
            '.elementor-widget-container > p',
        ];

        for (var i = 0; i < selectors.length; i++) {
            var el = wrapper.querySelector(selectors[i]);
            if (el && el.innerText && el.innerText.trim()) return el;
        }
        return wrapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEXT SPLITTER
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Splits the element into spans by character.
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement[]}
     */
    function splitIntoChars(el) {
        var text = el.innerText || el.textContent;
        el.setAttribute('aria-label', text);

        var words  = text.split(' ');
        var chars  = [];
        el.innerHTML = '';

        words.forEach(function (word, wi) {
            var wordWrap       = document.createElement('span');
            wordWrap.style.cssText = 'display:inline-block;white-space:nowrap;';
            wordWrap.setAttribute('aria-hidden', 'true');

            Array.from(word).forEach(function (char) {
                var span           = document.createElement('span');
                span.className     = 'aurora-char';
                span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
                span.textContent   = char;
                wordWrap.appendChild(span);
                chars.push(span);
            });

            el.appendChild(wordWrap);

            if (wi < words.length - 1) {
                // non-breaking space between words to preserve spacing
                var space = document.createElement('span');
                space.style.display = 'inline-block';
                space.innerHTML = '&nbsp;';
                el.appendChild(space);
            }
        });

        return chars;
    }

    /**
     * Splits the element into spans by word.
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement[]}
     */
    function splitIntoWords(el) {
        var text = el.innerText || el.textContent;
        el.setAttribute('aria-label', text);
        el.innerHTML = '';

        return text.split(/\s+/).filter(Boolean).map(function (word, i, arr) {
            var span           = document.createElement('span');
            span.className     = 'aurora-word';
            span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
            span.setAttribute('aria-hidden', 'true');
            span.textContent   = word + (i < arr.length - 1 ? ' ' : '');
            el.appendChild(span);
            return span;
        });
    }

    /**
     * Splits the element into spans by line (measures offsetTop to group them).
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement[]}
     */
    function splitIntoLines(el) {
        var text = el.innerText || el.textContent;
        el.setAttribute('aria-label', text);

        // Step 1: create temporary word spans to measure line breaks.
        var words = text.split(/\s+/).filter(Boolean);
        el.innerHTML = '';

        var wordSpans = words.map(function (word, i, arr) {
            var span       = document.createElement('span');
            span.style.cssText = 'display:inline-block;';
            span.textContent = word + (i < arr.length - 1 ? ' ' : '');
            el.appendChild(span);
            return span;
        });

        // Step 2: group by offsetTop.
        var lineMap = {};
        wordSpans.forEach(function (span) {
            var top = Math.round(span.getBoundingClientRect().top);
            if (!lineMap[top]) lineMap[top] = [];
            lineMap[top].push(span);
        });

        // Step 3: rebuild with line wrappers.
        el.innerHTML = '';
        var lines = [];

        Object.keys(lineMap).sort(function (a, b) { return a - b; }).forEach(function (top) {
            var lineWrap       = document.createElement('div');
            lineWrap.style.cssText = 'overflow:hidden;display:block;';
            lineWrap.className = 'aurora-line-wrap';

            var lineInner       = document.createElement('div');
            lineInner.style.cssText = 'display:inline-block;will-change:transform,opacity;';
            lineInner.className = 'aurora-line';
            lineInner.setAttribute('aria-hidden', 'true');

            lineMap[top].forEach(function (s) { lineInner.appendChild(s); });
            lineWrap.appendChild(lineInner);
            el.appendChild(lineWrap);
            lines.push(lineInner);
        });

        return lines;
    }

    /**
     * Dispatches the correct split according to `by`.
     *
     * @param {HTMLElement} el
     * @param {string} by  'chars' | 'words' | 'lines'
     * @returns {HTMLElement[]}
     */
    function splitText(el, by) {
        switch (by) {
            case 'words': return splitIntoWords(el);
            case 'lines': return splitIntoLines(el);
            default:      return splitIntoChars(el);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SCRAMBLE EFFECT (open-source implementation)
    // ─────────────────────────────────────────────────────────────────────────

    var SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&';

    /**
     * Animates an element's text with a scramble/hacker effect.
     *
     * @param {HTMLElement} el
     * @param {string}      finalText
     * @param {number}      duration   ms
     * @param {number}      delay      ms
     */
    function scrambleTextEffect(el, finalText, duration, delay) {
        el.style.opacity = '1';
        el.style.fontVariantNumeric = 'tabular-nums';

        setTimeout(function () {
            var steps   = Math.max(10, Math.floor(duration / 40));
            var step    = 0;
            var handle  = setInterval(function () {
                var progress = step / steps;
                var output   = '';
                for (var i = 0; i < finalText.length; i++) {
                    if (finalText[i] === ' ') {
                        output += ' ';
                    } else if (i / finalText.length < progress) {
                        output += finalText[i];
                    } else {
                        output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                    }
                }
                el.textContent = output;
                step++;
                if (step > steps) {
                    clearInterval(handle);
                    el.textContent = finalText;
                }
            }, 40);
        }, delay);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GSAP ANIMATIONS  (gs-1 … gs-10)
    // ─────────────────────────────────────────────────────────────────────────

    var gsapAnimations = {

        // gs-1 — Fade Up
        'gs-1': function (units, opts) {
            gsap.fromTo(units,
                { y: 60, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : 0,
                    opacity  : 1,
                    ease     : 'power3.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-2 — Clip Reveal (rises from below, masked)
        'gs-2': function (units, opts) {
            units.forEach(function (u) {
                u.parentElement.style.overflow = 'hidden';
                u.style.display = 'inline-block';
            });
            gsap.fromTo(units,
                { y: '110%', opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : '0%',
                    opacity  : 1,
                    ease     : 'power4.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-3 — Scramble Text  (operates on the parent element, not the units)
        'gs-3': function (units, opts, textEl) {
            var original = textEl._auroraOriginal || textEl.innerText;
            textEl.style.opacity = '0';
            // Restore the element (removes split)
            textEl.innerHTML = '';
            textEl.textContent = original;
            scrambleTextEffect(textEl, original, opts.duration, opts.delay);
        },

        // gs-4 — Elastic Bounce
        'gs-4': function (units, opts) {
            gsap.fromTo(units,
                { y: 60, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : 0,
                    opacity  : 1,
                    ease     : 'elastic.out(1, 0.4)',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-5 — 3D Flip Y
        'gs-5': function (units, opts) {
            gsap.set(units, { transformPerspective: 600 });
            gsap.fromTo(units,
                { rotationY: 90, opacity: 0 },
                {
                    duration  : opts.duration / 1000,
                    delay     : opts.delay / 1000,
                    rotationY : 0,
                    opacity   : 1,
                    ease      : 'power3.out',
                    stagger   : opts.stagger / 1000,
                }
            );
        },

        // gs-6 — Slide In (from left)
        'gs-6': function (units, opts) {
            gsap.fromTo(units,
                { x: -80, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    x        : 0,
                    opacity  : 1,
                    ease     : 'power3.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-7 — Scale Up
        'gs-7': function (units, opts) {
            gsap.fromTo(units,
                { scale: 0, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    scale    : 1,
                    opacity  : 1,
                    ease     : 'back.out(1.7)',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-8 — Wave (sinusoidal Y offset per index)
        'gs-8': function (units, opts) {
            gsap.fromTo(units,
                { y: function (i) { return Math.sin(i * 0.9) * 45; }, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : 0,
                    opacity  : 1,
                    ease     : 'power2.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-9 — Bounce Drop (drops from above with bounce)
        'gs-9': function (units, opts) {
            gsap.fromTo(units,
                { y: -80, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : 0,
                    opacity  : 1,
                    ease     : 'bounce.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-10 — Glitch (fast jitters then settles)
        'gs-10': function (units, opts) {
            var tl = gsap.timeline({ delay: opts.delay / 1000 });

            tl.set(units, { opacity: 0 })
              .to(units, {
                  duration : 0.04,
                  opacity  : 1,
                  x        : function () { return (Math.random() - 0.5) * 30; },
                  stagger  : opts.stagger / 1000,
              })
              .to(units, {
                  duration : 0.04,
                  x        : function () { return (Math.random() - 0.5) * 15; },
              })
              .to(units, {
                  duration : 0.04,
                  x        : function () { return (Math.random() - 0.5) * 8; },
              })
              .to(units, {
                  duration : opts.duration / 1000 * 0.6,
                  x        : 0,
                  ease     : 'power2.out',
              });
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ANIME.JS v4 ANIMATIONS  (ml-1 … ml-14)
    // ─────────────────────────────────────────────────────────────────────────
    //
    // v3 → v4: `anime({targets, ...})` became `anime.animate(targets, {...})`,
    // `easing` was renamed to `ease`, and easing names dropped the "ease"
    // prefix (easeOutExpo → outExpo). Delay callbacks in the
    // function(el, i) format remain compatible without changes.
    //
    // ml-11 … ml-14 use Anime.js v4's new native text APIs
    // (anime.splitText() and anime.scrambleText()) and are therefore
    // "self-managed" (see SELF_MANAGED_ANIMATIONS): they do their own
    // split/scramble on textEl instead of using the generic `units`
    // pre-split by this file's splitText().

    /**
     * (Re)runs Anime.js v4's native split, reverting any previous split
     * of the same element before splitting again. Needed to support
     * "Replay on re-entering viewport" without splitting a DOM that's
     * already been split (which would duplicate/corrupt the content).
     *
     * @param {HTMLElement} textEl
     * @param {Object}      settings  anime.splitText() settings
     * @returns {Object} TextSplitter
     */
    function resplitNative(textEl, settings) {
        if (textEl._auroraSplitInstance && typeof textEl._auroraSplitInstance.revert === 'function') {
            textEl._auroraSplitInstance.revert();
            textEl._auroraSplitInstance = null;
        } else if (typeof textEl._auroraPristineHTML !== 'undefined') {
            textEl.innerHTML = textEl._auroraPristineHTML;
        }
        var split = anime.splitText(textEl, settings);
        textEl._auroraSplitInstance = split;
        return split;
    }

    var animeAnimations = {

        // ml-1 — Float Up
        'ml-1': function (units, opts) {
            anime.animate(units, {
                translateY: [60, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-2 — Scale In
        'ml-2': function (units, opts) {
            anime.animate(units, {
                scale    : [0.2, 1],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                ease     : 'outBack',
            });
        },

        // ml-3 — Drop Down
        'ml-3': function (units, opts) {
            anime.animate(units, {
                translateY: [-60, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-4 — Slide From Right
        'ml-4': function (units, opts) {
            anime.animate(units, {
                translateX: [80, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-5 — Wave (sinusoidal translateY per index)
        'ml-5': function (units, opts) {
            anime.animate(units, {
                translateY: function (el, i) { return [Math.sin(i * 0.85) * 40, 0]; },
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outSine',
            });
        },

        // ml-6 — Flip X (rotateX with perspective)
        'ml-6': function (units, opts) {
            units.forEach(function (u) {
                u.style.transformOrigin  = 'center bottom';
                u.style.transformStyle   = 'preserve-3d';
                u.style.backfaceVisibility = 'hidden';
            });
            anime.animate(units, {
                rotateX : [90, 0],
                opacity : [0, 1],
                duration: opts.duration,
                delay   : function (el, i) { return opts.delay + i * opts.stagger; },
                ease    : 'outExpo',
            });
        },

        // ml-7 — Typewriter (appears letter by letter, no transition)
        'ml-7': function (units, opts) {
            anime.animate(units, {
                opacity : [0, 1],
                duration: 1,
                delay   : function (el, i) {
                    // larger stagger to simulate typing
                    return opts.delay + i * Math.max(opts.stagger, 60);
                },
                ease    : 'linear',
            });
        },

        // ml-8 — Blur Reveal
        'ml-8': function (units, opts) {
            // Starts blurred
            units.forEach(function (u) { u.style.filter = 'blur(14px)'; });
            anime.animate(units, {
                filter  : ['blur(14px)', 'blur(0px)'],
                opacity : [0, 1],
                duration: opts.duration,
                delay   : function (el, i) { return opts.delay + i * opts.stagger; },
                ease    : 'outQuart',
            });
        },

        // ml-9 — Skew In
        'ml-9': function (units, opts) {
            anime.animate(units, {
                skewX    : [-35, 0],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                ease     : 'outExpo',
            });
        },

        // ml-10 — Explosion (large scale → normal)
        'ml-10': function (units, opts) {
            anime.animate(units, {
                scale    : [4, 1],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                ease     : 'outExpo',
            });
        },

        // ml-11 — Native Split (letters split via anime.splitText())
        'ml-11': function (units, opts, textEl) {
            textEl.style.opacity = '1';
            var split = resplitNative(textEl, { chars: true });
            anime.animate(split.chars, {
                translateY: [40, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-12 — Clip Wrap (words masked via the wrap:'clip' parameter)
        'ml-12': function (units, opts, textEl) {
            textEl.style.opacity = '1';
            var split = resplitNative(textEl, { words: { wrap: 'clip' } });
            anime.animate(split.words, {
                translateY: ['100%', '0%'],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-13 — Echo Clone (each letter cloned via the clone parameter, an echo/depth effect)
        'ml-13': function (units, opts, textEl) {
            textEl.style.opacity = '1';
            var split = resplitNative(textEl, { chars: { wrap: 'clip', clone: 'bottom' } });
            anime.animate(split.chars, {
                translateY: ['-100%', '0%'],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-14 — Native Scramble (anime.scrambleText(), reveals with a hacker effect)
        'ml-14': function (units, opts, textEl) {
            textEl.style.opacity = '1';
            anime.animate(textEl, {
                innerHTML: anime.scrambleText({ duration: opts.duration }),
                delay    : opts.delay,
            });
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CORE LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Normalizes an Elementor slider value ({size, unit}, number, or string).
     *
     * @param {*}      val
     * @param {number} fallback
     * @returns {number}
     */
    function sizeOf(val, fallback) {
        if (val && typeof val === 'object' && typeof val.size !== 'undefined') {
            var fromObj = parseFloat(val.size);
            return isNaN(fromObj) ? fallback : fromObj;
        }
        var num = parseFloat(val);
        return isNaN(num) ? fallback : num;
    }

    /**
     * Reads the animation options from the data-aurora-* attributes
     * (rendered by PHP). Used only as a last resort, when the Elementor
     * Frontend Handlers system isn't available (e.g. very old versions).
     *
     * @param {HTMLElement} wrapper
     * @returns {Object}
     */
    function parseOptsFromDataset(wrapper) {
        var ds = wrapper.dataset;
        return {
            library   : ds.auroraLibrary   || 'gsap',
            animation : ds.auroraAnimation || 'gs-1',
            splitBy   : ds.auroraSplitBy   || 'chars',
            duration  : parseInt(ds.auroraDuration,  10) || 800,
            delay     : parseInt(ds.auroraDelay,     10) || 0,
            stagger   : parseInt(ds.auroraStagger,   10) || 30,
            trigger   : ds.auroraTrigger   || 'scroll',
            threshold : parseFloat(ds.auroraThreshold)  || 0.2,
            replay    : ds.auroraReplay    === '1',
        };
    }

    /**
     * Visually resets the units to their initial state (before the animation).
     *
     * @param {HTMLElement[]} units
     * @param {Object}        opts
     */
    function resetUnits(units, opts) {
        if (typeof gsap !== 'undefined') {
            gsap.set(units, { clearProps: 'all', opacity: 0 });
        } else {
            units.forEach(function (u) { u.style.opacity = '0'; });
        }

        // Clear the blur reveal filters.
        if (opts.animation === 'ml-8') {
            units.forEach(function (u) { u.style.filter = 'blur(14px)'; });
        }
    }

    /**
     * Animations that manage their own DOM/split (they don't use the
     * generic `units` pre-split by this file's splitText()). Each one
     * is responsible for restoring/hiding textEl and revealing its own
     * content inside the corresponding animation function.
     */
    var SELF_MANAGED_ANIMATIONS = ['gs-3', 'ml-11', 'ml-12', 'ml-13', 'ml-14'];

    function isSelfManaged(animation) {
        return SELF_MANAGED_ANIMATIONS.indexOf(animation) !== -1;
    }

    /**
     * Runs the animation according to library and type.
     *
     * @param {HTMLElement[]} units
     * @param {Object}        opts
     * @param {HTMLElement}   textEl
     */
    function playAnimation(units, opts, textEl) {
        var lib  = opts.library;
        var anim = opts.animation;

        if (lib === 'gsap' && typeof gsap !== 'undefined') {
            var fn = gsapAnimations[anim];
            if (fn) fn(units, opts, textEl);
        } else if (lib === 'animejs' && typeof anime !== 'undefined') {
            var fn2 = animeAnimations[anim];
            if (fn2) fn2(units, opts, textEl);
        }
    }

    /**
     * Initializes (or reinitializes) the text animation for a wrapper.
     * Can be called multiple times for the same wrapper — for instance,
     * when the user changes a control in the Elementor panel. Every call
     * restores the target's original HTML before splitting again (the
     * split is destructive) and replaces any observer from a previous run.
     *
     * @param {HTMLElement} wrapper
     * @param {Object}      opts
     */
    function initTextAnimation(wrapper, opts) {
        console.log('[Aurora:text] initTextAnimation()', { wrapper: wrapper, opts: opts });
        var textEl = getTextTarget(wrapper);
        console.log('[Aurora:text] textEl found ->', textEl, 'text:', (textEl.innerText || textEl.textContent || '').slice(0, 40));

        // Store (only once) the target's original HTML, so it can be
        // restored before each reinitialization.
        if (typeof textEl._auroraPristineHTML === 'undefined') {
            textEl._auroraPristineHTML = textEl.innerHTML;
        } else {
            textEl.innerHTML = textEl._auroraPristineHTML;
        }

        // Cancel any observer from a previous initialization.
        if (wrapper._auroraObserver) {
            wrapper._auroraObserver.disconnect();
            wrapper._auroraObserver = null;
        }

        // Store the original text (needed for scramble).
        textEl._auroraOriginal = textEl.innerText || textEl.textContent;

        // Text splitting (doesn't apply to self-managed animations, which
        // do their own split/scramble — see SELF_MANAGED_ANIMATIONS).
        var units = [];
        if (!isSelfManaged(opts.animation)) {
            units = splitText(textEl, opts.splitBy);
            // Initial state: invisible.
            units.forEach(function (u) { u.style.opacity = '0'; });
        } else {
            // Self-managed: keeps the text but hides the element; the
            // animation function itself (ml-11..14, gs-3) reveals it when it runs.
            textEl.style.opacity = '0';
        }

        // Announce the DOM change so peer Aurora modules that painted the
        // element BEFORE the split (Gradient's background-clip:text, most
        // notably) can re-apply themselves to the freshly-created spans.
        // Coupling the two via a custom event keeps the modules independent
        // — text-animations doesn't need to know Gradient exists.
        try {
            wrapper.dispatchEvent(new CustomEvent('aurora:text-split', {
                bubbles: true,
                detail: { textEl: textEl, units: units }
            }));
        } catch (e) {}

        var played = false;

        function trigger() {
            if (played && !opts.replay) return;
            played = true;
            if (!isSelfManaged(opts.animation)) {
                units.forEach(function (u) { u.style.opacity = '0'; }); // Reset before re-animating.
            }
            playAnimation(units, opts, textEl);
        }

        function reset() {
            played = false;
            if (isSelfManaged(opts.animation)) {
                textEl.style.opacity = '0';
            } else {
                resetUnits(units, opts);
            }
        }

        if (opts.trigger === 'scroll') {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        trigger();
                        if (!opts.replay) observer.unobserve(entry.target);
                    } else if (opts.replay) {
                        reset();
                    }
                });
            }, { threshold: opts.threshold });

            observer.observe(wrapper);
            wrapper._auroraObserver = observer;
        } else {
            // Fires immediately on load.
            trigger();
        }
    }

    /**
     * Reverts the text animation of a wrapper, restoring the original HTML
     * (used when the "Enable Text Animation" control is dynamically turned
     * off in the editor).
     *
     * @param {HTMLElement} wrapper
     */
    function teardownTextAnimation(wrapper) {
        if (wrapper._auroraObserver) {
            wrapper._auroraObserver.disconnect();
            wrapper._auroraObserver = null;
        }
        var textEl = getTextTarget(wrapper);
        if (textEl && typeof textEl._auroraPristineHTML !== 'undefined') {
            textEl.innerHTML = textEl._auroraPristineHTML;
            textEl.style.opacity = '';
            textEl._auroraSplitInstance = null;
        }
    }

    function waitForLibs(callback) {
        var waited  = 0;
        var maxWait = 6000;
        var step    = 80;
        var timer   = setInterval(function () {
            waited += step;
            var gsapOk  = typeof gsap  !== 'undefined';
            var animeOk = typeof anime !== 'undefined';
            if (gsapOk || animeOk || waited >= maxWait) {
                clearInterval(timer);
                callback();
            }
        }, step);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ELEMENTOR INTEGRATION — FRONTEND HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    //
    // `frontend/element_ready` only fires ONCE per element, on its first
    // render — it doesn't fire again when a control is changed in the editor
    // panel. To reflect changes instantly in the preview (without reloading
    // the iframe), we use Elementor's official Frontend Handlers API:
    // onElementChange() is called on every change of a control marked
    // `frontend_available`.
    // See: https://developers.elementor.com/docs/editor-controls/frontend-available/

    /**
     * Registers the AuroraTextAnimationHandler with Elementor.
     * Returns `false` if the Frontend Handlers API isn't available
     * (e.g. very old Elementor versions).
     *
     * @returns {boolean}
     */
    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            console.log('[Aurora:text] elementorModules.frontend.handlers not yet available.');
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            // elementorFrontend already exists, but .hooks hasn't been
            // attached yet (happens in the editor, where the init order
            // differs from the real frontend). Without this check,
            // addAction() below would throw an uncaught TypeError that
            // would abort the rest of the script — including the polling
            // fallback and bootstrap().
            console.log('[Aurora:text] elementorFrontend.hooks not yet available.');
            return false;
        }

        function AuroraTextAnimationHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraTextAnimationHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraTextAnimationHandler.prototype.constructor = AuroraTextAnimationHandler;

        AuroraTextAnimationHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_text_enable') === 'yes';
        };

        AuroraTextAnimationHandler.prototype.getOpts = function () {
            var library = this.getElementSettings('aurora_text_library') || 'gsap';
            return {
                library   : library,
                animation : library === 'gsap'
                    ? (this.getElementSettings('aurora_text_animation_gsap') || 'gs-1')
                    : (this.getElementSettings('aurora_text_animation_anime') || 'ml-1'),
                splitBy   : this.getElementSettings('aurora_text_split_by') || 'chars',
                duration  : sizeOf(this.getElementSettings('aurora_text_duration'), 800),
                delay     : sizeOf(this.getElementSettings('aurora_text_delay'), 0),
                stagger   : sizeOf(this.getElementSettings('aurora_text_stagger'), 30),
                trigger   : this.getElementSettings('aurora_text_trigger') || 'scroll',
                threshold : sizeOf(this.getElementSettings('aurora_text_threshold'), 20) / 100,
                replay    : this.getElementSettings('aurora_text_replay') === 'yes',
            };
        };

        AuroraTextAnimationHandler.prototype.runAnimation = function () {
            var wrapper = this.$element[0];
            var enabled = this.isEnabled();
            console.log('[Aurora:text] runAnimation()', { wrapper: wrapper, enabled: enabled });
            if (!enabled) {
                teardownTextAnimation(wrapper);
                return;
            }
            var opts = this.getOpts();
            console.log('[Aurora:text] opts ->', opts);
            setTimeout(function () { initTextAnimation(wrapper, opts); }, 80);
        };

        AuroraTextAnimationHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            console.log('[Aurora:text] onInit()', this.$element[0]);
            this.runAnimation();
        };

        AuroraTextAnimationHandler.prototype.onElementChange = function (propertyName) {
            console.log('[Aurora:text] onElementChange()', propertyName);
            if (propertyName.indexOf('aurora_text_') === 0) {
                this.runAnimation();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            console.log('[Aurora:text] frontend/element_ready/global ->', $element);
            elementorFrontend.elementsHandler.addHandler(AuroraTextAnimationHandler, { $element: $element });
        });

        console.log('[Aurora:text] Handler registered successfully.');
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HOOK REGISTRATION — as EARLY as possible, synchronously
    // ─────────────────────────────────────────────────────────────────────────
    //
    // `elementorFrontend.hooks.addAction()` doesn't depend on gsap/anime
    // being loaded, nor on `isInit`/DOM ready — it only needs the
    // `elementorModules`/`elementorFrontend` object to already exist,
    // which is guaranteed by this script's 'elementor-frontend' dependency
    // (it runs BEFORE this line). On the real frontend (outside the editor)
    // Elementor can fire `frontend/element_ready` for each widget very
    // quickly after the page loads — and that event only fires ONCE per
    // element. The old code only tried to register the hook after
    // `waitForLibs()` (polling at a minimum of 80ms), which was enough
    // time for Elementor to fire the event BEFORE our hook existed —
    // losing it forever. That's why the registration attempt now runs
    // synchronously, outside of any wait, the exact moment this file is
    // evaluated by the browser.
    var auroraHandlerRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraHandlerRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks) {
            return false;
        }
        auroraHandlerRegistered = registerHandler();
        return auroraHandlerRegistered;
    }

    if (!tryRegisterHandlerNow() && typeof elementorFrontend !== 'undefined') {
        console.log('[Aurora:text] Not registered yet — waiting for the elementor/frontend/init event and polling as a fallback...');
        $(window).on('elementor/frontend/init', function () {
            console.log('[Aurora:text] elementor/frontend/init event fired.');
            tryRegisterHandlerNow();
        });
        (function poll() {
            var tries = 0;
            var timer = setInterval(function () {
                tries++;
                if (tryRegisterHandlerNow() || tries > 50) {
                    clearInterval(timer);
                }
            }, 100);
        })();
    }

    function bootstrap() {
        console.log('[Aurora:text] bootstrap() started.');
        waitForLibs(function () {
            console.log('[Aurora:text] waitForLibs resolved. gsap?', typeof gsap !== 'undefined', 'anime?', typeof anime !== 'undefined');

            // Fallback: no Elementor JS available — scan the page using the
            // data-aurora-* attributes rendered by PHP on the real frontend.
            if (typeof elementorFrontend === 'undefined') {
                console.log('[Aurora:text] Elementor JS unavailable — using data-aurora-* fallback.');
                document.querySelectorAll('[data-aurora-enable="1"]').forEach(function (el) {
                    setTimeout(function () { initTextAnimation(el, parseOptsFromDataset(el)); }, 80);
                });
            }
        });
    }

    // Initialize once the DOM is ready.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
