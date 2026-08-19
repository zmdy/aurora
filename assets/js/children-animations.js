/**
 * Aurora for Elementor — Frontend: Children Stagger Animation
 *
 * Applies staggered entrance animations to the child elements of any
 * Elementor container/section.
 *
 * @package Aurora
 * @version 1.0.0
 */

/* global elementorFrontend, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    function getGsapRef() {
        if (typeof window !== 'undefined') {
            return window.AuroraGSAP || window.gsap || null;
        }
        return null;
    }

    var gsap = new Proxy({}, {
        get: function (target, prop) {
            var ref = getGsapRef();
            if (!ref) {
                console.warn('[Aurora] GSAP library is not available for Children Animations.');
                return function () {};
            }
            var val = ref[prop];
            return typeof val === 'function' ? val.bind(ref) : val;
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // OPTION PARSING
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
     * Sanitizes a CSS selector (same whitelist used in PHP), since the
     * value read from the Elementor settings comes straight from the
     * model, without the sanitization that before_render applies on
     * the frontend.
     *
     * @param {string} raw
     * @returns {string}
     */
    function sanitizeSelector(raw) {
        var selector = (raw || '').replace(/[^a-zA-Z0-9_\-.\s,:#>+~[\]=^$*|()]/g, '');
        return selector || '.elementor-widget';
    }

    /**
     * Reads the children animation options from the data-aurora-children-*
     * attributes (rendered by PHP). Used only as a last resort, when the
     * Elementor Frontend Handlers system isn't available.
     *
     * @param {HTMLElement} wrapper
     * @returns {Object}
     */
    function parseOptsFromDataset(wrapper) {
        var ds = wrapper.dataset;
        return {
            animation  : ds.auroraChildrenAnimation  || 'fade-up',
            targetType : ds.auroraChildrenTargetType || 'child_containers',
            depth      : ds.auroraChildrenDepth      || '1',
            selector   : ds.auroraChildrenSelector   || '.elementor-widget',
            duration   : parseInt(ds.auroraChildrenDuration,  10) || 600,
            delay      : parseInt(ds.auroraChildrenDelay,     10) || 0,
            stagger    : parseInt(ds.auroraChildrenStagger,   10) || 150,
            trigger    : ds.auroraChildrenTrigger    || 'scroll',
            threshold  : parseFloat(ds.auroraChildrenThreshold) || 0.15,
            replay     : ds.auroraChildrenReplay     === '1',
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHILDREN SELECTION
    // ─────────────────────────────────────────────────────────────────────────

    function getContentRoot(wrapper) {
        if (!wrapper) return wrapper;
        var inner = wrapper.querySelector(':scope > .e-con-inner') || 
                    wrapper.querySelector(':scope > .elementor-container') || 
                    wrapper.querySelector(':scope > .elementor-widget-wrap');
        return inner || wrapper;
    }

    function getElementsByDepth(root, targetCss, maxDepth) {
        var isUnlimited = maxDepth === 'all' || isNaN(parseInt(maxDepth, 10));
        var maxDepthNum = isUnlimited ? 999 : parseInt(maxDepth, 10);
        var results = [];

        function collect(element, currentDepth) {
            if (currentDepth > maxDepthNum) return;
            var children = Array.from(element.children);

            children.forEach(function (child) {
                var isMatch = false;
                try {
                    if (targetCss === ':scope > *' || targetCss === '*') {
                        isMatch = true;
                    } else if (child.matches && child.matches(targetCss)) {
                        isMatch = true;
                    }
                } catch (e) {
                    isMatch = false;
                }

                if (isMatch) {
                    results.push(child);
                }

                if (currentDepth < maxDepthNum) {
                    if (!isMatch || targetCss === '.elementor-widget') {
                        var childRoot = getContentRoot(child);
                        collect(childRoot, currentDepth + 1);
                    }
                }
            });
        }

        collect(root, 1);
        return results;
    }

    /**
     * Returns the child elements to animate according to targetType, depth, and selector.
     *
     * @param {HTMLElement} wrapper
     * @param {Object|string} opts Options object or legacy selector string.
     * @returns {HTMLElement[]}
     */
    function getChildren(wrapper, opts) {
        if (typeof opts === 'string') {
            opts = { selector: opts, targetType: 'custom', depth: 'all' };
        }
        opts = opts || {};
        var targetType = opts.targetType || 'child_containers';
        var depth = opts.depth || '1';
        var selector = opts.selector || '.elementor-widget';

        var contentRoot = getContentRoot(wrapper);
        var children = [];
        var containerCss = '.e-con, .elementor-column, .elementor-grid-item, .elementor-icon-list-item';

        if (targetType === 'child_containers') {
            children = getElementsByDepth(contentRoot, containerCss, depth);
        } else if (targetType === 'direct_children') {
            children = getElementsByDepth(contentRoot, ':scope > *', depth);
        } else if (targetType === 'all_widgets') {
            children = Array.from(contentRoot.querySelectorAll('.elementor-widget'));
        } else if (targetType === 'custom') {
            children = getElementsByDepth(contentRoot, selector, depth);
        }

        // Progressive fallbacks if nothing matched
        if (children.length === 0) {
            var fallbacks = [
                '.e-con',
                '.elementor-column',
                '.elementor-widget',
                ':scope > *',
            ];
            for (var i = 0; i < fallbacks.length; i++) {
                try {
                    children = Array.from(contentRoot.querySelectorAll(fallbacks[i]));
                    if (children.length > 0) break;
                } catch (e) { /* invalid selector */ }
            }
        }

        if (children.length === 0) {
            children = Array.from(contentRoot.children);
        }

        return children.filter(function (child) {
            return child !== wrapper && child !== contentRoot;
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHILDREN ANIMATIONS (GSAP)
    // ─────────────────────────────────────────────────────────────────────────

    function prepareElements(children) {
        for (var i = 0; i < children.length; i++) {
            children[i].style.transition = 'none';
        }
    }

    function createCommonProps(opts) {
        return {
            duration   : opts.duration / 1000,
            delay      : opts.delay / 1000,
            stagger    : opts.stagger / 1000,
            force3D    : true,
            overwrite  : 'auto',
            clearProps : 'transition',
        };
    }

    var childrenAnimations = {

        // Fade Up
        'fade-up': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { y: 0, opacity: 1, ease: 'power3.out' });
            gsap.fromTo(children, { y: 50, opacity: 0, force3D: true }, props);
        },

        // Fade Down
        'fade-down': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { y: 0, opacity: 1, ease: 'power3.out' });
            gsap.fromTo(children, { y: -50, opacity: 0, force3D: true }, props);
        },

        // Fade In (opacity only)
        'fade-in': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { opacity: 1, ease: 'power2.out' });
            gsap.fromTo(children, { opacity: 0, force3D: true }, props);
        },

        // Slide from the left
        'slide-left': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { x: 0, opacity: 1, ease: 'power3.out' });
            gsap.fromTo(children, { x: -80, opacity: 0, force3D: true }, props);
        },

        // Slide from the right
        'slide-right': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { x: 0, opacity: 1, ease: 'power3.out' });
            gsap.fromTo(children, { x: 80, opacity: 0, force3D: true }, props);
        },

        // Zoom In
        'zoom-in': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { scale: 1, opacity: 1, ease: 'back.out(1.7)' });
            gsap.fromTo(children, { scale: 0.65, opacity: 0, force3D: true }, props);
        },

        // Zoom Out (starts big and shrinks)
        'zoom-out': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { scale: 1, opacity: 1, ease: 'power3.out' });
            gsap.fromTo(children, { scale: 1.35, opacity: 0, force3D: true }, props);
        },

        // Flip Up (3D rotation on the X axis)
        'flip-up': function (children, opts) {
            prepareElements(children);
            gsap.set(children, { transformPerspective: 800, transformOrigin: 'center bottom', force3D: true });
            var props = Object.assign(createCommonProps(opts), { rotationX: 0, opacity: 1, ease: 'power3.out' });
            gsap.fromTo(children, { rotationX: 80, opacity: 0, force3D: true }, props);
        },

        // Rotate In (Z rotation + fade)
        'rotate-in': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { rotation: 0, scale: 1, opacity: 1, ease: 'back.out(1.4)' });
            gsap.fromTo(children, { rotation: -20, scale: 0.8, opacity: 0, force3D: true }, props);
        },

        // Bounce In (rises with bounce)
        'bounce-in': function (children, opts) {
            prepareElements(children);
            var props = Object.assign(createCommonProps(opts), { y: 0, opacity: 1, ease: 'elastic.out(1, 0.5)' });
            gsap.fromTo(children, { y: 70, opacity: 0, force3D: true }, props);
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CORE LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Initializes (or reinitializes) the children stagger animation for a
     * wrapper. Can be called multiple times for the same wrapper — for
     * instance, when the user changes a control in the Elementor panel —
     * since it replaces any observer/state from a previous initialization.
     *
     * @param {HTMLElement} wrapper
     * @param {Object}      opts
     */
    function initChildrenAnimation(wrapper, opts) {
        if (typeof gsap === 'undefined') {
            return;
        }

        var children = getChildren(wrapper, opts);

        // Cancel any observer from a previous initialization.
        if (wrapper._auroraChildrenObserver) {
            wrapper._auroraChildrenObserver.disconnect();
            wrapper._auroraChildrenObserver = null;
        }

        if (children.length === 0) return;

        var played = false;

        function trigger() {
            if (played && !opts.replay) return;
            played = true;
            prepareElements(children);
            gsap.set(children, { opacity: 0, force3D: true });

            var fn = childrenAnimations[opts.animation];
            if (fn) fn(children, opts);
        }

        function reset() {
            played = false;
            prepareElements(children);
            gsap.set(children, { clearProps: 'all', opacity: 0 });
        }

        if (opts.trigger === 'scroll') {
            var effectiveThreshold = Math.min(opts.threshold || 0.15, 0.05);
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        trigger();
                        if (!opts.replay) observer.unobserve(entry.target);
                    } else if (opts.replay) {
                        reset();
                    }
                });
            }, { threshold: effectiveThreshold, rootMargin: '0px 0px -30px 0px' });

            observer.observe(wrapper);
            wrapper._auroraChildrenObserver = observer;
        } else {
            trigger();
        }
    }

    /**
     * Reverts the children animation of a wrapper (used when the
     * "Animate Children Elements" control is dynamically turned off
     * in the editor).
     *
     * @param {HTMLElement} wrapper
     */
    function teardownChildrenAnimation(wrapper) {
        if (wrapper._auroraChildrenObserver) {
            wrapper._auroraChildrenObserver.disconnect();
            wrapper._auroraChildrenObserver = null;
        }
        var children = Array.from(wrapper.children);
        if (typeof gsap !== 'undefined' && children.length) {
            gsap.set(children, { clearProps: 'all' });
        }
    }

    function waitForGsap(callback) {
        var waited  = 0;
        var maxWait = 6000;
        var step    = 80;
        var timer   = setInterval(function () {
            waited += step;
            if (typeof gsap !== 'undefined' || waited >= maxWait) {
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
     * Registers the AuroraChildrenAnimationHandler with Elementor.
     * Returns `false` if the Frontend Handlers API isn't available
     * (e.g. very old Elementor versions).
     *
     * @returns {boolean}
     */
    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            // Same check as text-animations.js: elementorFrontend can exist
            // before .hooks is attached (happens in the editor), and without
            // this guard the addAction() call below would throw an
            // uncaught TypeError, aborting the whole script (fallback/polling/bootstrap).
            return false;
        }

        function AuroraChildrenAnimationHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraChildrenAnimationHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraChildrenAnimationHandler.prototype.constructor = AuroraChildrenAnimationHandler;

        AuroraChildrenAnimationHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_children_enable') === 'yes';
        };

        AuroraChildrenAnimationHandler.prototype.getOpts = function () {
            return {
                animation  : this.getElementSettings('aurora_children_animation') || 'fade-up',
                targetType : this.getElementSettings('aurora_children_target_type') || 'child_containers',
                depth      : this.getElementSettings('aurora_children_depth') || '1',
                selector   : sanitizeSelector(this.getElementSettings('aurora_children_selector')),
                duration   : sizeOf(this.getElementSettings('aurora_children_duration'), 600),
                delay      : sizeOf(this.getElementSettings('aurora_children_delay'), 0),
                stagger    : sizeOf(this.getElementSettings('aurora_children_stagger'), 150),
                trigger    : this.getElementSettings('aurora_children_trigger') || 'scroll',
                threshold  : sizeOf(this.getElementSettings('aurora_children_threshold'), 15) / 100,
                replay     : this.getElementSettings('aurora_children_replay') === 'yes',
            };
        };

        AuroraChildrenAnimationHandler.prototype.runAnimation = function () {
            var wrapper = this.$element[0];
            var enabled = this.isEnabled();
            if (!enabled) {
                teardownChildrenAnimation(wrapper);
                return;
            }
            var opts = this.getOpts();
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    initChildrenAnimation(wrapper, opts);
                });
            });
        };

        AuroraChildrenAnimationHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            this.runAnimation();
        };

        AuroraChildrenAnimationHandler.prototype.onElementChange = function (propertyName) {
            if (propertyName.indexOf('aurora_children_') === 0) {
                this.runAnimation();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            elementorFrontend.elementsHandler.addHandler(AuroraChildrenAnimationHandler, { $element: $element });
        });

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HOOK REGISTRATION — as EARLY as possible, synchronously
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Same logic and reason as text-animations.js: `hooks.addAction()`
    // doesn't depend on GSAP being loaded or on `isInit`. On the real
    // frontend (outside the editor) `frontend/element_ready` only fires
    // ONCE per element, shortly after the page loads — waiting for
    // `waitForGsap()` (polling at a minimum of 80ms) before registering
    // the hook meant we'd miss that firing forever. That's why registration
    // now happens synchronously, the moment this file is evaluated.
    var auroraChildrenHandlerRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraChildrenHandlerRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined') {
            return false;
        }
        auroraChildrenHandlerRegistered = registerHandler();
        return auroraChildrenHandlerRegistered;
    }

    if (!tryRegisterHandlerNow() && typeof elementorFrontend !== 'undefined') {
        $(window).on('elementor/frontend/init', function () {
            tryRegisterHandlerNow();
        });
    }

    function bootstrap() {
        waitForGsap(function () {

            // Fallback: no Elementor JS available — scan the page using the
            // data-aurora-children-* attributes rendered by PHP on the real frontend.
            if (typeof elementorFrontend === 'undefined') {
                document.querySelectorAll('[data-aurora-children-enable="1"]').forEach(function (el) {
                    requestAnimationFrame(function () {
                        requestAnimationFrame(function () {
                            initChildrenAnimation(el, parseOptsFromDataset(el));
                        });
                    });
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
