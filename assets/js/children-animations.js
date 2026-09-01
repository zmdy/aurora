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
        'fadeIn', 'fadeInDown', 'fadeInLeft', 'fadeInRight', 'fadeInUp',
        'slideInDown', 'slideInLeft', 'slideInRight', 'slideInUp',
        'zoomIn', 'zoomInDown', 'zoomInLeft', 'zoomInRight', 'zoomInUp',
        'bounceIn', 'bounceInDown', 'bounceInLeft', 'bounceInRight', 'bounceInUp',
        'rotateIn', 'rotateInDownLeft', 'rotateInDownRight', 'rotateInUpLeft', 'rotateInUpRight',
        'lightSpeedIn', 'rollIn',
        'bounce', 'flash', 'pulse', 'rubberBand', 'shake', 'headShake', 'swing', 'tada', 'wobble', 'jello',
        'flipInX', 'flipInY',
        // Aurora blur set (assets/css/children-animations.css) — CSS-only
        // @keyframes, driven through this same animate.css engine.
        'auroraBlurIn', 'auroraBlurInUp', 'auroraBlurInDown', 'auroraBlurInLeft',
        'auroraBlurInRight', 'auroraBlurZoomIn', 'auroraFocusIn'
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

    function getAnimClass(anim) {
        if (!anim) return 'fadeInUp';
        if (ANIMATION_CLASS_MAP[anim]) return ANIMATION_CLASS_MAP[anim];
        return anim;
    }

    function getAlternateClass(baseAnim, altMode, index) {
        if (!altMode || altMode === 'none') {
            return getAnimClass(baseAnim);
        }
        var isEven = index % 2 === 0;

        if (altMode === 'horizontal') {
            if (baseAnim && baseAnim.indexOf('slide') === 0) {
                return isEven ? 'slideInLeft' : 'slideInRight';
            }
            return isEven ? 'fadeInLeft' : 'fadeInRight';
        }

        if (altMode === 'vertical') {
            if (baseAnim && baseAnim.indexOf('slide') === 0) {
                return isEven ? 'slideInUp' : 'slideInDown';
            }
            return isEven ? 'fadeInUp' : 'fadeInDown';
        }

        if (altMode === 'zoom') {
            return isEven ? 'zoomIn' : 'zoomInDown';
        }

        if (altMode === 'rotate') {
            return isEven ? 'rotateInDownLeft' : 'rotateInDownRight';
        }

        return getAnimClass(baseAnim);
    }

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
            alternate  : ds.auroraChildrenAlternate  || 'none',
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

        if (wrapper.classList && wrapper.classList.contains('elementor-widget-icon-list')) {
            var list = wrapper.querySelector('ul.elementor-icon-list-items, ol.elementor-icon-list-items');
            if (list) return list;
        }

        var inner = wrapper.querySelector(':scope > .e-con-inner') || 
                    wrapper.querySelector(':scope > .elementor-container') || 
                    wrapper.querySelector(':scope > .elementor-widget-wrap') ||
                    wrapper.querySelector(':scope > .elementor-widget-container');
        return inner || wrapper;
    }

    function getSpecialWidgetChildren(wrapper) {
        if (!wrapper || !wrapper.classList) return null;

        // Icon List Widget — target individual .elementor-icon-list-item elements
        if (wrapper.classList.contains('elementor-widget-icon-list')) {
            var items = Array.from(wrapper.querySelectorAll('.elementor-icon-list-item'));
            if (items.length > 0) return items;
        }

        // Image Gallery / WP Gallery Widget
        if (wrapper.classList.contains('elementor-widget-image-gallery') || wrapper.classList.contains('elementor-widget-wp-gallery')) {
            var galleryItems = Array.from(wrapper.querySelectorAll('.gallery-item, .elementor-gallery-item, .e-gallery-item'));
            if (galleryItems.length > 0) return galleryItems;
        }

        // Icon Box Widget
        if (wrapper.classList.contains('elementor-widget-icon-box')) {
            var iconBoxInner = wrapper.querySelector('.elementor-icon-box-wrapper');
            if (iconBoxInner && iconBoxInner.children.length > 0) {
                return Array.from(iconBoxInner.children);
            }
        }

        // Image Box Widget
        if (wrapper.classList.contains('elementor-widget-image-box')) {
            var imageBoxInner = wrapper.querySelector('.elementor-image-box-wrapper');
            if (imageBoxInner && imageBoxInner.children.length > 0) {
                return Array.from(imageBoxInner.children);
            }
        }

        return null;
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

        // Check for specialized widget types (Icon List, Gallery, Icon/Image Box) if targetType isn't custom
        if (targetType !== 'custom') {
            var specialChildren = getSpecialWidgetChildren(wrapper);
            if (specialChildren && specialChildren.length > 0) {
                return specialChildren;
            }
        }

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
            var fallbacks = ['.e-con', '.elementor-column', '.elementor-icon-list-item', '.elementor-widget', ':scope > *'];
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

    // Strips the animate.css entrance classes and the inline animation props
    // left on a child once its entrance has finished. This is what lets the
    // Children Hover Effect transition work on the frontend.
    //
    // A CSS animation whose fill-mode is `both` keeps its final keyframe
    // "active" forever after it ends, which means the animation KEEPS
    // OWNERSHIP of transform/filter in the cascade. While a property is owned
    // by an animation, CSS transitions on that same property are ignored — so
    // the hover's `transition: transform` never ran and the hover jumped
    // between its two states abruptly. (The editor often looked fine because
    // the scroll-triggered entrance hadn't actually played/stuck there yet.)
    // Clearing the finished entrance hands transform/filter back to the inline
    // style + transition the hover engine sets, so the hover animates smoothly.
    function clearEntranceState(child) {
        if (child._auroraEntranceEnd) {
            child.removeEventListener('animationend', child._auroraEntranceEnd);
            child._auroraEntranceEnd = null;
        }
        for (var k = 0; k < ALL_ANIMATION_CLASSES.length; k++) {
            child.classList.remove(ALL_ANIMATION_CLASSES[k]);
        }
        child.classList.remove('animated');
        child.style.animationDuration = '';
        child.style.animationDelay = '';
        child.style.animationFillMode = '';
    }

    function animateChild(child, animClass, duration, delay) {
        clearEntranceState(child);

        child.style.visibility = 'visible';
        child.style.opacity = '';
        child.style.animationDuration = duration + 'ms';
        child.style.animationDelay = delay + 'ms';
        child.style.animationFillMode = 'both';

        // Guarded on e.target === child so a nested widget's own animate.css
        // animationend (which bubbles up to this child) can't strip the
        // parent's entrance before it has actually finished.
        child._auroraEntranceEnd = function (e) {
            if (e.target !== child) return;
            clearEntranceState(child);
        };
        child.addEventListener('animationend', child._auroraEntranceEnd);

        void child.offsetWidth;

        child.classList.add('animated', animClass);
    }

    function resetChild(child, animClass) {
        if (child._auroraEntranceEnd) {
            child.removeEventListener('animationend', child._auroraEntranceEnd);
            child._auroraEntranceEnd = null;
        }
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

    function initChildrenAnimation(wrapper, opts, isControlChange) {
        var children = getChildren(wrapper, opts);

        if (wrapper._auroraChildrenObserver) {
            wrapper._auroraChildrenObserver.disconnect();
            wrapper._auroraChildrenObserver = null;
        }

        if (children.length === 0) return;

        if (wrapper._auroraChildrenPlayed && !opts.replay && !isControlChange) {
            return;
        }

        var played = false;

        function trigger() {
            if (played && !opts.replay && !isControlChange) return;
            played = true;
            wrapper._auroraChildrenPlayed = true;

            var rawAnim = opts.animation || 'fade-up';
            var altMode = opts.alternate || 'none';

            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                var animClass = getAlternateClass(rawAnim, altMode, i);
                var delay = opts.delay + (i * opts.stagger);
                animateChild(child, animClass, opts.duration, delay);
            }

            refreshCounters(children);
        }

        function reset() {
            played = false;
            wrapper._auroraChildrenPlayed = false;
            var rawAnim = opts.animation || 'fade-up';
            var altMode = opts.alternate || 'none';

            for (var i = 0; i < children.length; i++) {
                var animClass = getAlternateClass(rawAnim, altMode, i);
                resetChild(children[i], animClass);
            }

            refreshCounters(children);
        }

        if (opts.trigger === 'scroll') {
            // Hide children immediately so they animate in when scrolled into view.
            reset();

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
        wrapper._auroraChildrenPlayed = false;
        var children = getChildren(wrapper, { targetType: 'all_widgets', depth: 'all' });
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (child._auroraEntranceEnd) {
                child.removeEventListener('animationend', child._auroraEntranceEnd);
                child._auroraEntranceEnd = null;
            }
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

        // Apply transition and hardware acceleration to children. Set the
        // transition with `important` so a theme/Elementor rule that declares
        // `transition: none` (or its own transition) on the same element can't
        // silently swallow the hover easing — that would make the hover snap
        // between states with no duration, the exact frontend symptom this
        // guards against.
        children.forEach(function (child) {
            child.style.setProperty('transition', 'transform ' + duration + 'ms cubic-bezier(0.25, 1, 0.5, 1)', 'important');
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
            var setting = this.getElementSettings('aurora_children_enable');
            if (setting === 'yes') return true;
            if (setting === 'no') return false;
            var wrapper = this.$element && this.$element[0];
            return wrapper && wrapper.getAttribute && wrapper.getAttribute('data-aurora-children-enable') === '1';
        };

        AuroraChildrenAnimationHandler.prototype.isHoverEnabled = function () {
            var setting = this.getElementSettings('aurora_children_hover_enable');
            if (setting === 'yes') return true;
            if (setting === 'no') return false;
            var wrapper = this.$element && this.$element[0];
            return wrapper && wrapper.getAttribute && wrapper.getAttribute('data-aurora-children-hover-enable') === '1';
        };

        AuroraChildrenAnimationHandler.prototype.getOpts = function () {
            var wrapper = this.$element && this.$element[0];
            var ds = wrapper ? parseOptsFromDataset(wrapper) : {};

            var anim = this.getElementSettings('aurora_children_animation');
            var alt = this.getElementSettings('aurora_children_alternate');
            var target = this.getElementSettings('aurora_children_target_type');
            var depth = this.getElementSettings('aurora_children_depth');
            var selector = this.getElementSettings('aurora_children_selector');
            var duration = this.getElementSettings('aurora_children_duration');
            var delay = this.getElementSettings('aurora_children_delay');
            var stagger = this.getElementSettings('aurora_children_stagger');
            var trigger = this.getElementSettings('aurora_children_trigger');
            var threshold = this.getElementSettings('aurora_children_threshold');
            var replay = this.getElementSettings('aurora_children_replay');

            return {
                animation  : (anim && anim !== '') ? anim : ds.animation,
                alternate  : (alt && alt !== '') ? alt : ds.alternate,
                targetType : (target && target !== '') ? target : ds.targetType,
                depth      : (depth && depth !== '') ? depth : ds.depth,
                selector   : (selector && selector !== '') ? sanitizeSelector(selector) : ds.selector,
                duration   : sizeOf(duration, ds.duration),
                delay      : sizeOf(delay, ds.delay),
                stagger    : sizeOf(stagger, ds.stagger),
                trigger    : (trigger && trigger !== '') ? trigger : ds.trigger,
                threshold  : (threshold !== undefined && threshold !== null && threshold !== '') ? (sizeOf(threshold, 15) / 100) : ds.threshold,
                replay     : (replay !== undefined && replay !== null && replay !== '') ? (replay === 'yes') : ds.replay,
            };
        };

        AuroraChildrenAnimationHandler.prototype.getHoverOpts = function () {
            var wrapper = this.$element && this.$element[0];
            var ds = wrapper ? parseHoverOptsFromDataset(wrapper) : {};

            var preset = this.getElementSettings('aurora_children_hover_preset');
            var trX = this.getElementSettings('aurora_children_hover_translate_x');
            var trY = this.getElementSettings('aurora_children_hover_translate_y');
            var scale = this.getElementSettings('aurora_children_hover_scale');
            var rotate = this.getElementSettings('aurora_children_hover_rotate');
            var skew = this.getElementSettings('aurora_children_hover_skew');
            var flip = this.getElementSettings('aurora_children_hover_flip');
            var proximity = this.getElementSettings('aurora_children_hover_proximity');
            var intensity = this.getElementSettings('aurora_children_hover_proximity_intensity');
            var duration = this.getElementSettings('aurora_children_hover_duration');

            return {
                enable             : this.isHoverEnabled(),
                preset             : (preset && preset !== '') ? preset : ds.preset,
                translateX         : sizeOf(trX, ds.translateX),
                translateY         : sizeOf(trY, ds.translateY),
                scale              : sizeOf(scale, ds.scale),
                rotate             : sizeOf(rotate, ds.rotate),
                skew               : sizeOf(skew, ds.skew),
                flip               : (flip && flip !== '') ? flip : ds.flip,
                proximity          : (proximity !== undefined && proximity !== null && proximity !== '') ? (proximity === 'yes') : ds.proximity,
                proximityIntensity : (intensity !== undefined && intensity !== null && intensity !== '') ? (sizeOf(intensity, 50) / 100) : ds.proximityIntensity,
                duration           : sizeOf(duration, ds.duration),
            };
        };

        AuroraChildrenAnimationHandler.prototype.runAnimation = function (isControlChange) {
            var wrapper = this.$element[0];
            var animEnabled = this.isEnabled();
            var hoverEnabled = this.isHoverEnabled();

            if (!animEnabled) {
                teardownChildrenAnimation(wrapper);
            }
            if (!hoverEnabled) {
                teardownChildrenHover(wrapper);
            }

            if (!animEnabled && !hoverEnabled) return;

            var opts = this.getOpts();
            var hoverOpts = this.getHoverOpts();

            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    if (animEnabled) {
                        initChildrenAnimation(wrapper, opts, isControlChange);
                    }
                    if (hoverEnabled) {
                        initChildrenHover(wrapper, hoverOpts);
                    }
                });
            });
        };

        AuroraChildrenAnimationHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            this.runAnimation(false);
        };

        AuroraChildrenAnimationHandler.prototype.onElementChange = function (propertyName) {
            if (propertyName.indexOf('aurora_children_') === 0) {
                this.runAnimation(true);
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

    // scanAndInit is the fallback for pages where elementorFrontend is not
    // available (e.g. plain PHP themes). When the Elementor handler is
    // already registered via element_ready/global, let it manage everything.
    function scanAndInit() {
        // If Elementor handler is managing the elements, don't duplicate init.
        if (auroraChildrenHandlerRegistered) return;

        document.querySelectorAll('[data-aurora-children-enable="1"], [data-aurora-children-hover-enable="1"]').forEach(function (el) {
            if (el.getAttribute('data-aurora-children-enable') === '1' && !el._auroraChildrenInit) {
                el._auroraChildrenInit = true;
                initChildrenAnimation(el, parseOptsFromDataset(el));
            }
            if (el.getAttribute('data-aurora-children-hover-enable') === '1' && !el._auroraChildrenHoverInit) {
                el._auroraChildrenHoverInit = true;
                initChildrenHover(el, parseHoverOptsFromDataset(el));
            }
        });
    }

    // Try to register immediately (if elementorFrontend is already loaded).
    // If not, listen for the Elementor init event or fall back to scanAndInit.
    if (!tryRegisterHandlerNow()) {
        // Only bind to Elementor's init event when Elementor is actually
        // present. Without this guard, $(window).on(...) is reached on any
        // non-Elementor page (e.g. the standalone showcase site) — and
        // there, when jQuery itself isn't loaded either, `$` falls back to
        // the plain callback-only stub at the bottom of this file, whose
        // return value is undefined, so `.on(...)` throws
        // "Cannot read properties of undefined (reading 'on')" and aborts
        // the rest of this script (killing the scanAndInit fallback below).
        if (typeof elementorFrontend !== 'undefined') {
            $(window).on('elementor/frontend/init', function () {
                tryRegisterHandlerNow();
            });
        }
        // scanAndInit fallback for non-Elementor contexts.
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', scanAndInit);
        } else {
            scanAndInit();
        }
        window.addEventListener('load', scanAndInit);
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
