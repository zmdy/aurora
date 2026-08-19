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

    function parseHoverOptsFromDataset(wrapper) {
        var ds = wrapper.dataset;
        return {
            enable             : ds.auroraChildrenHoverEnable === '1',
            preset             : ds.auroraChildrenHoverPreset || 'lift',
            translateX         : parseFloat(ds.auroraChildrenHoverTranslateX) || 0,
            translateY         : parseFloat(ds.auroraChildrenHoverTranslateY) || -10,
            scale              : parseFloat(ds.auroraChildrenHoverScale) || 1.05,
            rotate             : parseFloat(ds.auroraChildrenHoverRotate) || 0,
            skew               : parseFloat(ds.auroraChildrenHoverSkew) || 0,
            flip               : ds.auroraChildrenHoverFlip || 'none',
            proximity          : ds.auroraChildrenHoverProximity === '1',
            proximityIntensity : parseFloat(ds.auroraChildrenHoverProximityIntensity) || 0.5,
            duration           : parseInt(ds.auroraChildrenHoverDuration, 10) || 300,
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CHILDREN HOVER & PROXIMITY WAVE ENGINE
    // ─────────────────────────────────────────────────────────────────────────

    function getTransformParams(opts) {
        var preset = opts.preset || 'lift';
        var p = { trX: 0, trY: 0, scale: 1, rotate: 0, skew: 0, flipX: 1, flipY: 1 };

        if (preset === 'lift') {
            p.trY = -10;
        } else if (preset === 'slide_x') {
            p.trX = 10;
        } else if (preset === 'scale_up') {
            p.scale = 1.05;
        } else if (preset === 'rotate_tilt') {
            p.rotate = -4;
        } else if (preset === 'flip_h') {
            p.flipX = -1;
        } else if (preset === 'flip_v') {
            p.flipY = -1;
        } else if (preset === 'custom') {
            p.trX = opts.translateX || 0;
            p.trY = opts.translateY || 0;
            p.scale = opts.scale !== undefined ? opts.scale : 1;
            p.rotate = opts.rotate || 0;
            p.skew = opts.skew || 0;
            var flip = opts.flip || 'none';
            if (flip === 'horizontal' || flip === 'both') p.flipX = -1;
            if (flip === 'vertical' || flip === 'both') p.flipY = -1;
        }
        return p;
    }

    function initChildrenHover(wrapper, opts) {
        if (!opts || !opts.enable) return;

        var children = getChildren(wrapper, opts);
        if (!children || children.length === 0) return;

        var params = getTransformParams(opts);
        var duration = opts.duration || 300;
        var useProximity = !!opts.proximity;
        var intensity = opts.proximityIntensity !== undefined ? opts.proximityIntensity : 0.5;

        // Apply transition and hardware acceleration to children
        children.forEach(function (child) {
            child.style.transition = 'transform ' + duration + 'ms cubic-bezier(0.25, 1, 0.5, 1)';
            child.style.willChange = 'transform';
        });

        function applyHoverTransforms(hoveredIndex) {
            if (hoveredIndex === -1) {
                children.forEach(function (child) {
                    child.style.transform = '';
                });
                return;
            }

            var hoveredChild = children[hoveredIndex];
            var hRect = hoveredChild.getBoundingClientRect();
            var hCx = hRect.left + hRect.width / 2;
            var hCy = hRect.top + hRect.height / 2;

            // Calculate min neighbor step R across children in 1D / 2D layout
            var minDist = Infinity;
            children.forEach(function (child, idx) {
                if (idx !== hoveredIndex) {
                    var r = child.getBoundingClientRect();
                    var cx = r.left + r.width / 2;
                    var cy = r.top + r.height / 2;
                    var d = Math.sqrt(Math.pow(cx - hCx, 2) + Math.pow(cy - hCy, 2));
                    if (d > 0 && d < minDist) minDist = d;
                }
            });
            if (minDist === Infinity || minDist === 0) minDist = 150;

            var radiusMax = minDist * 2.2;

            children.forEach(function (child, idx) {
                var factor = 0;
                if (idx === hoveredIndex) {
                    factor = 1.0;
                } else if (useProximity) {
                    var r = child.getBoundingClientRect();
                    var cx = r.left + r.width / 2;
                    var cy = r.top + r.height / 2;
                    var dist = Math.sqrt(Math.pow(cx - hCx, 2) + Math.pow(cy - hCy, 2));
                    if (dist < radiusMax) {
                        var linearFalloff = 1 - (dist / radiusMax);
                        factor = Math.max(0, linearFalloff) * intensity;
                    }
                }

                if (factor > 0.001) {
                    var curTrX = params.trX * factor;
                    var curTrY = params.trY * factor;
                    var curScale = 1 + (params.scale - 1) * factor;
                    var curRotate = params.rotate * factor;
                    var curSkew = params.skew * factor;
                    var curFlipX = params.flipX < 0 ? (factor > 0.5 ? -1 : 1) : 1;
                    var curFlipY = params.flipY < 0 ? (factor > 0.5 ? -1 : 1) : 1;

                    var transformStr = 'translate3d(' + curTrX + 'px, ' + curTrY + 'px, 0px)' +
                        ' scale(' + (curScale * curFlipX) + ', ' + (curScale * curFlipY) + ')' +
                        ' rotate(' + curRotate + 'deg)' +
                        ' skewX(' + curSkew + 'deg)';

                    child.style.transform = transformStr;
                } else {
                    child.style.transform = '';
                }
            });
        }

        children.forEach(function (child, idx) {
            child.addEventListener('mouseenter', function () {
                applyHoverTransforms(idx);
            });
        });

        wrapper.addEventListener('mouseleave', function () {
            applyHoverTransforms(-1);
        });
    }

    function teardownChildrenHover(wrapper) {
        var children = getChildren(wrapper, { targetType: 'all_widgets', depth: 'all' });
        children.forEach(function (child) {
            child.style.transition = '';
            child.style.willChange = '';
            child.style.transform = '';
        });
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

        AuroraChildrenAnimationHandler.prototype.isHoverEnabled = function () {
            return this.getElementSettings('aurora_children_hover_enable') === 'yes';
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

        AuroraChildrenAnimationHandler.prototype.getHoverOpts = function () {
            return {
                enable             : this.isHoverEnabled(),
                preset             : this.getElementSettings('aurora_children_hover_preset') || 'lift',
                translateX         : sizeOf(this.getElementSettings('aurora_children_hover_translate_x'), 0),
                translateY         : sizeOf(this.getElementSettings('aurora_children_hover_translate_y'), -10),
                scale              : sizeOf(this.getElementSettings('aurora_children_hover_scale'), 1.05),
                rotate             : sizeOf(this.getElementSettings('aurora_children_hover_rotate'), 0),
                skew               : sizeOf(this.getElementSettings('aurora_children_hover_skew'), 0),
                flip               : this.getElementSettings('aurora_children_hover_flip') || 'none',
                proximity          : this.getElementSettings('aurora_children_hover_proximity') === 'yes',
                proximityIntensity : sizeOf(this.getElementSettings('aurora_children_hover_proximity_intensity'), 50) / 100,
                duration           : sizeOf(this.getElementSettings('aurora_children_hover_duration'), 300),
            };
        };

        AuroraChildrenAnimationHandler.prototype.runAnimation = function () {
            var wrapper = this.$element[0];
            var animEnabled = this.isEnabled();
            var hoverEnabled = this.isHoverEnabled();

            if (!animEnabled) {
                teardownChildrenAnimation(wrapper);
            }
            if (!hoverEnabled) {
                teardownChildrenHover(wrapper);
            }

            var opts = this.getOpts();
            var hoverOpts = this.getHoverOpts();

            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    if (animEnabled) {
                        initChildrenAnimation(wrapper, opts);
                    }
                    if (hoverEnabled) {
                        initChildrenHover(wrapper, hoverOpts);
                    }
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
            document.querySelectorAll('[data-aurora-children-enable="1"], [data-aurora-children-hover-enable="1"]').forEach(function (el) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        if (el.dataset.auroraChildrenEnable === '1') {
                            initChildrenAnimation(el, parseOptsFromDataset(el));
                        }
                        if (el.dataset.auroraChildrenHoverEnable === '1') {
                            initChildrenHover(el, parseHoverOptsFromDataset(el));
                        }
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
