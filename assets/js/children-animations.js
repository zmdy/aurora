/**
 * Aurora for Elementor — Frontend: Children Stagger Animation
 *
 * Applies staggered entrance animations to the child elements of any
 * Elementor container/section using Elementor's native animate.css library.
 *
 * @package Aurora
 * @version 1.1.0
 */

/* global elementorFrontend, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    var ALL_ANIMATION_CLASSES = [
        'fadeInUp', 'fadeInDown', 'fadeIn', 'slideInLeft', 'slideInRight',
        'zoomIn', 'flipInX', 'rotateIn', 'bounceIn'
    ];

    var ANIMATION_CLASS_MAP = {
        'fade-up':     'fadeInUp',
        'fade-down':   'fadeInDown',
        'fade-in':     'fadeIn',
        'slide-left':  'slideInLeft',
        'slide-right': 'slideInRight',
        'zoom-in':     'zoomIn',
        'zoom-out':    'zoomIn',
        'flip-up':     'flipInX',
        'rotate-in':   'rotateIn',
        'bounce-in':   'bounceIn',
    };

    // ─────────────────────────────────────────────────────────────────────────
    // OPTION PARSING
    // ─────────────────────────────────────────────────────────────────────────

    function sizeOf(val, fallback) {
        if (val && typeof val === 'object' && typeof val.size !== 'undefined') {
            var fromObj = parseFloat(val.size);
            return isNaN(fromObj) ? fallback : fromObj;
        }
        var num = parseFloat(val);
        return isNaN(num) ? fallback : num;
    }

    function sanitizeSelector(raw) {
        var selector = (raw || '').replace(/[^a-zA-Z0-9_\-.\s,:#>+~[\]=^$*|()]/g, '');
        return selector || '.elementor-widget';
    }

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
            if (children.length === 0) {
                children = getElementsByDepth(contentRoot, ':scope > *', depth);
            }
        } else if (targetType === 'direct_children') {
            children = getElementsByDepth(contentRoot, ':scope > *', depth);
        } else if (targetType === 'all_widgets') {
            children = Array.from(contentRoot.querySelectorAll('.elementor-widget'));
        } else if (targetType === 'custom') {
            children = getElementsByDepth(contentRoot, selector, depth);
        }

        if (children.length === 0) {
            var fallbacks = ['.e-con', '.elementor-column', '.elementor-widget', ':scope > *'];
            for (var i = 0; i < fallbacks.length; i++) {
                try {
                    children = Array.from(contentRoot.querySelectorAll(fallbacks[i]));
                    if (children.length > 0) break;
                } catch (e) {}
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
    // ANIMATE.CSS ENGINE
    // ─────────────────────────────────────────────────────────────────────────

    function animateChild(child, animClass, duration, delay) {
        for (var k = 0; k < ALL_ANIMATION_CLASSES.length; k++) {
            child.classList.remove(ALL_ANIMATION_CLASSES[k]);
        }

        child.style.visibility = 'visible';
        child.style.opacity = '';
        child.style.animationDuration = duration + 'ms';
        child.style.animationDelay = delay + 'ms';
        child.style.animationFillMode = 'both';

        void child.offsetWidth;

        child.classList.add('animated', animClass);
    }

    function resetChild(child, animClass) {
        for (var k = 0; k < ALL_ANIMATION_CLASSES.length; k++) {
            child.classList.remove(ALL_ANIMATION_CLASSES[k]);
        }
        child.classList.remove('animated');
        child.style.animationDuration = '';
        child.style.animationDelay = '';
        child.style.animationFillMode = '';
        child.style.opacity = '0';
        child.style.visibility = 'hidden';
    }

    function refreshCounters(children) {
        if (!children || !children.length) return;

        children.forEach(function (child) {
            var counterNumbers = [];
            if (child.classList && child.classList.contains('elementor-counter-number')) {
                counterNumbers = [child];
            } else if (child.querySelectorAll) {
                counterNumbers = Array.from(child.querySelectorAll('.elementor-counter-number'));
            }

            counterNumbers.forEach(function (counterEl) {
                var $counter = (typeof jQuery !== 'undefined') ? jQuery(counterEl) : null;
                var data = $counter ? $counter.data() : null;

                if ($counter && data && data.toValue !== undefined && typeof $counter.numerator === 'function') {
                    var decimalDigits = data.toValue.toString().match(/\.(.*)/);
                    if (decimalDigits) {
                        data.rounding = decimalDigits[1].length;
                    }
                    try {
                        $counter.numerator('stop');
                    } catch (e) {}
                    counterEl.textContent = data.fromValue || 0;
                    $counter.numerator(data);
                } else if (counterEl) {
                    var toVal = counterEl.getAttribute('data-to-value') || counterEl.getAttribute('data-to') || '0';
                    if (!counterEl.textContent || counterEl.textContent.trim() === '') {
                        counterEl.textContent = toVal;
                    }
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CORE LOGIC
    // ─────────────────────────────────────────────────────────────────────────

    function initChildrenAnimation(wrapper, opts) {
        var children = getChildren(wrapper, opts);

        if (wrapper._auroraChildrenObserver) {
            wrapper._auroraChildrenObserver.disconnect();
            wrapper._auroraChildrenObserver = null;
        }

        if (children.length === 0) return;

        var played = false;

        function trigger() {
            if (played && !opts.replay) return;
            played = true;

            var animClass = ANIMATION_CLASS_MAP[opts.animation] || 'fadeInUp';

            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                var delay = opts.delay + (i * opts.stagger);
                animateChild(child, animClass, opts.duration, delay);
            }

            refreshCounters(children);
        }

        function reset() {
            played = false;
            var animClass = ANIMATION_CLASS_MAP[opts.animation] || 'fadeInUp';

            for (var i = 0; i < children.length; i++) {
                resetChild(children[i], animClass);
            }

            refreshCounters(children);
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

    function teardownChildrenAnimation(wrapper) {
        if (wrapper._auroraChildrenObserver) {
            wrapper._auroraChildrenObserver.disconnect();
            wrapper._auroraChildrenObserver = null;
        }
        var children = getChildren(wrapper, { targetType: 'all_widgets', depth: 'all' });
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            for (var k = 0; k < ALL_ANIMATION_CLASSES.length; k++) {
                child.classList.remove(ALL_ANIMATION_CLASSES[k]);
            }
            child.classList.remove('animated');
            child.style.animationDuration = '';
            child.style.animationDelay = '';
            child.style.animationFillMode = '';
            child.style.opacity = '';
            child.style.visibility = '';
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ELEMENTOR INTEGRATION — FRONTEND HANDLER
    // ─────────────────────────────────────────────────────────────────────────

    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
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
        if (typeof elementorFrontend === 'undefined') {
            document.querySelectorAll('[data-aurora-children-enable="1"]').forEach(function (el) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        initChildrenAnimation(el, parseOptsFromDataset(el));
                    });
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
