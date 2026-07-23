/**
 * Aurora for Elementor — Frontend: Gradient Module
 *
 * Multi-stop gradients (3+ colors) on containers (background), on the
 * Heading/Text Editor widgets (text-fill), on the Icon widget (icon-fill,
 * handling both font-icon and SVG icon markup), and on Icon Box
 * (configurable: box background or icon-fill) — with an optional "mesh"
 * animation (blurred blobs) or "loop" (hue rotation). The whole effect is
 * resolved via CSS — this file only reads the saved data (via the
 * Elementor Handler or data-attributes) and injects a dynamic stylesheet
 * with the gradient and, when animated, a per-instance @keyframes block
 * (each element can have different colors/speed).
 *
 * @package Aurora
 * @version 1.1.0
 */

/* global elementorFrontend, elementorModules, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // ─────────────────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────────────────

    var instanceCounter = 0;

    /**
     * Returns (creating if needed) the dedicated <style> tag for a given
     * target element (the background host or the text node), reusing it
     * across re-runs instead of accumulating rules in a shared tag. Every
     * settings change (color, angle, animate toggle, etc.) re-applies the
     * gradient, and previously each re-run appended a brand new rule set
     * to a single global <style> tag without ever removing the previous
     * one — during an Elementor editor session (where onElementChange
     * fires on every slider drag) this silently accumulated hundreds of
     * orphaned @keyframes blocks. Using one tag per target element and
     * overwriting its textContent keeps things bounded.
     *
     * @param {HTMLElement} target
     * @returns {HTMLStyleElement}
     */
    function getStyleTag(target) {
        var tag = target._auroraGradientStyleTag;
        if (!tag || !tag.isConnected) {
            tag = document.createElement('style');
            target._auroraGradientStyleTag = tag;
            document.head.appendChild(tag);
        }
        return tag;
    }

    function injectCss(target, css) {
        getStyleTag(target).textContent = css;
    }

    /**
     * Reads an Elementor control value that may come as an object
     * `{size, unit}` (SLIDER) or already as a plain number/string.
     *
     * @param {*} value
     * @param {number} fallback
     * @returns {number}
     */
    function sizeOf(value, fallback) {
        if (value && typeof value === 'object' && 'size' in value) {
            var n = parseFloat(value.size);
            return isNaN(n) ? fallback : n;
        }
        var parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    }

    /**
     * Builds the gradient CSS string from the type, angle (linear/conic),
     * and color stops. For "radial", an optional `spot` lets the caller
     * override the implicit centered circle with an explicit radius and
     * center position — used by the Follow Mouse spotlight effect to
     * recenter the gradient on the cursor on every mousemove.
     *
     * @param {string} type   linear | radial | conic
     * @param {number} angle
     * @param {Array}  stops  [{color, offset}]
     * @param {{radius:number, cx:number, cy:number}} [spot]
     * @returns {string}
     */
    function buildGradientCss(type, angle, stops, spot) {
        var stopsCss = stops
            .map(function (s) {
                var offset = s.offset;
                return (offset === null || typeof offset === 'undefined' || offset === '')
                    ? s.color
                    : s.color + ' ' + offset + '%';
            })
            .join(', ');

        if (type === 'radial') {
            if (spot) {
                return 'radial-gradient(circle ' + spot.radius + 'px at ' + spot.cx + '% ' + spot.cy + '%, ' + stopsCss + ')';
            }
            return 'radial-gradient(circle, ' + stopsCss + ')';
        }
        if (type === 'conic') {
            return 'conic-gradient(from ' + angle + 'deg, ' + stopsCss + ')';
        }
        return 'linear-gradient(' + angle + 'deg, ' + stopsCss + ')';
    }

    /**
     * Distributes one radial blob per color around a central circle —
     * the basis of the "mesh" effect used for container backgrounds.
     *
     * @param {Array} stops [{color}]
     * @returns {{image: string, positions: Array<{x:number,y:number}>}}
     */
    function buildMeshLayers(stops) {
        var n = stops.length;
        var positions = [];
        var layers = [];

        for (var i = 0; i < n; i++) {
            var angle = (360 / n) * i;
            var rad = (angle * Math.PI) / 180;
            var x = 50 + 32 * Math.cos(rad);
            var y = 50 + 32 * Math.sin(rad);
            positions.push({ x: x, y: y });
            layers.push(
                'radial-gradient(circle at ' + x.toFixed(1) + '% ' + y.toFixed(1) + '%, ' +
                stops[i].color + ' 0%, transparent 65%)'
            );
        }

        return { image: layers.join(', '), positions: positions };
    }

    function positionString(positions, dx, dy) {
        return positions
            .map(function (p) {
                return (p.x + dx).toFixed(1) + '% ' + (p.y + dy).toFixed(1) + '%';
            })
            .join(', ');
    }

    function parseStops(raw) {
        try {
            var stops = JSON.parse(raw || '[]');
            return Array.isArray(stops) ? stops.filter(function (s) { return s && s.color; }) : [];
        } catch (e) {
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FOLLOW MOUSE (SPOTLIGHT)
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Recenters a radial gradient on the cursor as it moves over `trackEl`,
    // writing the result directly onto `styleTarget.style.backgroundImage`
    // on every mousemove — the same approach as a React mousemove handler
    // recomputing a `radial-gradient(circle 600px at X% Y%, ...)` inline
    // style, just without a virtual DOM in between. `trackEl` and
    // `styleTarget` are the same element for backgrounds, but different for
    // text (the wrapper defines the tracked area, the heading/paragraph
    // node itself receives the background-clip:text gradient).

    var followMouseListeners = new WeakMap(); // trackEl -> mousemove handler

    /**
     * Detaches a previously-attached Follow Mouse listener, if any. Called
     * unconditionally at the top of applyBackground()/applyText() so
     * switching a zone away from Follow Mouse (or re-rendering it) never
     * leaves a stale mousemove listener running in the background.
     *
     * @param {HTMLElement} trackEl
     */
    function stopFollowMouse(trackEl) {
        var handler = followMouseListeners.get(trackEl);
        if (handler) {
            trackEl.removeEventListener('mousemove', handler);
            followMouseListeners.delete(trackEl);
        }
    }

    /**
     * @param {HTMLElement} trackEl     Element whose bounding box defines the 0-100% coordinate space.
     * @param {HTMLElement} styleTarget Element that receives the computed `background-image`.
     * @param {Object}      data
     */
    function startFollowMouse(trackEl, styleTarget, data) {
        var pos = { x: 50, y: 50 }; // centered until the first mousemove
        var ticking = false;

        function render() {
            styleTarget.style.backgroundImage = buildGradientCss('radial', 0, data.stops, {
                radius: data.spotlightRadius,
                cx: pos.x,
                cy: pos.y,
            });
        }

        function handler(e) {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function() {
                var rect = trackEl.getBoundingClientRect();
                pos.x = rect.width ? ( ( e.clientX - rect.left ) / rect.width ) * 100 : 50;
                pos.y = rect.height ? ( ( e.clientY - rect.top ) / rect.height ) * 100 : 50;
                render();
                ticking = false;
            });
        }

        trackEl.addEventListener('mousemove', handler, { passive: true });
        followMouseListeners.set(trackEl, handler);
        render();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EFFECT APPLICATION
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Applies the gradient as the element's background (containers).
     * Static: applied directly via inline style. Animated: via an
     * isolated ::before (z-index:-1 inside its own stacking context),
     * so that blur or hue-rotate never leaks into the container's content.
     * Follow Mouse: a live mousemove listener instead of either of those
     * — see startFollowMouse().
     *
     * @param {HTMLElement} el
     * @param {Object} data
     * @param {number} id
     */
    /**
     * Undoes anything applyBackground may have written. Mirrors
     * clearTextGradient for the container-background path — used when
     * the user disables the gradient toggle so the last render doesn't
     * silently linger on the DOM.
     */
    var activeMeshShaders = new WeakMap();

    function clearMeshShader(el) {
        var active = activeMeshShaders.get(el);
        if (active) {
            if (active.observer) active.observer.disconnect();
            if (active.rafId) cancelAnimationFrame(active.rafId);
            if (active.resizeHandler) window.removeEventListener('resize', active.resizeHandler);
            if (active.resizeTimeout) clearTimeout(active.resizeTimeout);
            if (active.mouseHandler) el.removeEventListener('mousemove', active.mouseHandler);
            if (active.canvas && active.canvas.parentNode) {
                active.canvas.parentNode.removeChild(active.canvas);
            }
            activeMeshShaders.delete(el);
        }
    }

    function hexToRgbVec3(hex) {
        if (!hex) return [0.0, 0.0, 0.0];
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(function (c) { return c + c; }).join('');
        }
        var num = parseInt(hex, 16);
        if (isNaN(num)) return [0.0, 0.0, 0.0];
        return [
            ((num >> 16) & 255) / 255.0,
            ((num >> 8) & 255) / 255.0,
            (num & 255) / 255.0
        ];
    }

    function applyMeshShader(el, data) {
        clearMeshShader(el);

        if (typeof AuroraShaders === 'undefined') return;

        var canvas = document.createElement('canvas');
        canvas.className = 'aurora-mesh-canvas';
        canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';

        if (getComputedStyle(el).position === 'static') {
            el.style.position = 'relative';
        }
        el.insertBefore(canvas, el.firstChild);

        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return;

        var vsSource = AuroraShaders.VERTEX_SHADER;
        var fsSource = AuroraShaders.getFragmentShader(data.meshStyle || 'paper');

        function compileShader(type, src) {
            var s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
        }

        var vs = compileShader(gl.VERTEX_SHADER, vsSource);
        var fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
        if (!vs || !fs) return;

        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

        gl.useProgram(program);

        var posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

        var posLoc = gl.getAttribLocation(program, 'position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        var uRes = gl.getUniformLocation(program, 'u_resolution');
        var uTime = gl.getUniformLocation(program, 'u_time');
        var uMouse = gl.getUniformLocation(program, 'u_mouse');
        var uDist = gl.getUniformLocation(program, 'u_distortion');
        var uSwirl = gl.getUniformLocation(program, 'u_swirl');
        var uScale = gl.getUniformLocation(program, 'u_scale');
        var uAngle = gl.getUniformLocation(program, 'u_angle');
        var uGrainEnable = gl.getUniformLocation(program, 'u_grain_enable');
        var uGrainInt = gl.getUniformLocation(program, 'u_grain_intensity');
        var uLiqCur = gl.getUniformLocation(program, 'u_liquid_cursor');
        var uCurRad = gl.getUniformLocation(program, 'u_cursor_radius');
        var uStopCount = gl.getUniformLocation(program, 'u_stop_count');

        var stops = data.stops || [];
        var stopCount = Math.min(stops.length, 6);
        gl.uniform1i(uStopCount, stopCount);

        for (var i = 0; i < stopCount; i++) {
            var colorLoc = gl.getUniformLocation(program, 'u_stops[' + i + ']');
            var offsetLoc = gl.getUniformLocation(program, 'u_offsets[' + i + ']');
            var rgb = hexToRgbVec3(stops[i].color);
            gl.uniform3f(colorLoc, rgb[0], rgb[1], rgb[2]);
            var offsetVal = (stops[i].offset !== null && typeof stops[i].offset !== 'undefined')
                ? parseFloat(stops[i].offset) / 100.0
                : i / Math.max(1, stopCount - 1);
            gl.uniform1f(offsetLoc, offsetVal);
        }

        gl.uniform1f(uDist, (data.distortion || 40) / 100.0);
        gl.uniform1f(uSwirl, (data.swirl || 25) / 100.0);
        gl.uniform1f(uScale, data.scale || 1.25);
        gl.uniform1f(uAngle, data.angle || 135);
        gl.uniform1f(uGrainEnable, data.grainEnable ? 1.0 : 0.0);
        gl.uniform1f(uGrainInt, (data.grainIntensity || 35) / 100.0);
        gl.uniform1f(uLiqCur, data.liquidCursor ? 1.0 : 0.0);
        gl.uniform1f(uCurRad, data.cursorRadius || 250);

        var mouse = { x: 0, y: 0 };
        var targetMouse = { x: 0, y: 0 };
        var mouseHandler = null;
        var cachedRect = null;

        if (data.liquidCursor) {
            cachedRect = el.getBoundingClientRect();
            mouseHandler = function (e) {
                if (!cachedRect) return;
                targetMouse.x = e.clientX - cachedRect.left;
                targetMouse.y = cachedRect.height - (e.clientY - cachedRect.top);
            };
            el.addEventListener('mousemove', mouseHandler, { passive: true });
        }

        var state = {
            canvas: canvas,
            observer: null,
            rafId: null,
            mouseHandler: mouseHandler,
            resizeHandler: null,
            resizeTimeout: null
        };

        function resizeCanvas(immediate) {
            clearTimeout(state.resizeTimeout);
            var doResize = function () {
                var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
                var width = el.offsetWidth || 300;
                var height = el.offsetHeight || 300;
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.uniform2f(uRes, canvas.width, canvas.height);
                if (data.liquidCursor) {
                    cachedRect = el.getBoundingClientRect();
                }
            };
            if (immediate === true) {
                doResize();
            } else {
                state.resizeTimeout = setTimeout(doResize, 150);
            }
        }

        state.resizeHandler = resizeCanvas;
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas(true);

        var startTime = performance.now();
        var isVisible = true;

        function render() {
            if (!isVisible) return;
            var elapsed = (performance.now() - startTime) * 0.001 * (data.speed ? data.speed / 8.0 : 1.0);

            if (data.liquidCursor) {
                mouse.x += (targetMouse.x - mouse.x) * 0.1;
                mouse.y += (targetMouse.y - mouse.y) * 0.1;
                gl.uniform2f(uMouse, mouse.x * (canvas.width / (el.offsetWidth || 1)), mouse.y * (canvas.height / (el.offsetHeight || 1)));
            }

            gl.uniform1f(uTime, elapsed);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            state.rafId = requestAnimationFrame(render);
        }

        var observer = null;
        if (typeof IntersectionObserver !== 'undefined') {
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    isVisible = entry.isIntersecting;
                    if (isVisible) {
                        render();
                    } else if (state.rafId) {
                        cancelAnimationFrame(state.rafId);
                        state.rafId = null;
                    }
                });
            }, { threshold: 0.05 });
            observer.observe(el);
            state.observer = observer;
        } else {
            render();
        }

        activeMeshShaders.set(el, state);
    }

    function clearBackgroundGradient(el) {
        clearMeshShader(el);
        el.classList.remove('aurora-gradient-host');
        el.removeAttribute('data-aurora-gradient-instance');
        el.style.backgroundImage      = '';
        el.style.backgroundSize       = '';
        el.style.backgroundPosition   = '';
        el.style.backgroundRepeat     = '';
        injectCss(el, '');
        stopFollowMouse(el);
    }

    function applyBackground(el, data, id) {
        clearBackgroundGradient(el);

        if (data.type === 'mesh') {
            applyMeshShader(el, data);
            return;
        }

        if (data.followMouse) {
            startFollowMouse(el, el, data);
            return;
        }

        var gradientCss = buildGradientCss(data.type, data.angle, data.stops);

        if (!data.animate) {
            el.style.backgroundImage = gradientCss;
            return;
        }

        el.classList.add('aurora-gradient-host');
        el.setAttribute('data-aurora-gradient-instance', id);

        var selector = '.aurora-gradient-host[data-aurora-gradient-instance="' + id + '"]';
        var css;

        if (data.style === 'loop') {
            css = selector + '::before{content:"";position:absolute;inset:0;' +
                'background-image:' + gradientCss + ';background-size:200% 200%;' +
                'z-index:-1;pointer-events:none;' +
                'animation:aurora-grad-loop-' + id + ' ' + data.speed + 's linear infinite;}' +
                '@keyframes aurora-grad-loop-' + id + '{' +
                '0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}';
        } else {
            var mesh = buildMeshLayers(data.stops);
            var posBase = positionString(mesh.positions, 0, 0);
            var posMid = positionString(mesh.positions, 8, -10);
            var blur = Math.max(18, Math.round(70 / mesh.positions.length));

            css = selector + '::before{content:"";position:absolute;inset:-25%;' +
                'background-image:' + mesh.image + ';background-repeat:no-repeat;' +
                'filter:blur(' + blur + 'px);z-index:-1;pointer-events:none;' +
                'animation:aurora-grad-mesh-' + id + ' ' + data.speed + 's ease-in-out infinite;}' +
                '@keyframes aurora-grad-mesh-' + id + '{' +
                '0%{background-position:' + posBase + ';}' +
                '50%{background-position:' + posMid + ';}' +
                '100%{background-position:' + posBase + ';}}';
        }

        injectCss(el, css);
    }

    /**
     * Applies the gradient as text-fill on the real text node (Heading
     * or Text Editor) — has to be the text element itself, since
     * background-clip:text has no effect on the Elementor wrapper.
     *
     * @param {HTMLElement} textEl  Already-located node (.elementor-heading-title / .elementor-text-editor).
     * @param {HTMLElement} trackEl Element whose bounding box drives Follow Mouse (the outer wrapper).
     * @param {Object} data
     * @param {number} id
     */
    /**
     * Locates the leaf spans generated by the Text Animation module
     * (splitIntoChars/Words/Lines) so we can re-paint each with the
     * gradient CSS. Without this, splitting the text moves the actual
     * glyphs into child spans while background-clip:text stays on the
     * parent — the parent no longer has a direct text node to mask, and
     * the whole text visually disappears.
     */
    function findTextLeaves(textEl) {
        return textEl.querySelectorAll('.aurora-char, .aurora-word, .aurora-line-wrap .aurora-word, .letter, .word');
    }

    /**
     * Writes the shared background-clip:text incantation onto an element
     * — pulled out so both the parent text node AND the split-animation
     * leaf spans get the exact same paint. line-height + tiny vertical
     * padding stop tall accents (Ê, Õ, tildes) from being visually
     * clipped by the text-metric bounding box that background-clip uses.
     */
    function paintTextTarget(el, gradientCss) {
        el.style.webkitBackgroundClip = 'text';
        el.style.backgroundClip = 'text';
        el.style.color = 'transparent';
        el.style.webkitTextFillColor = 'transparent';
        el.style.backgroundImage = gradientCss;
    }

    /**
     * Undoes every inline style / class / attribute this module might
     * have written on a text target — including any leaf spans left
     * behind by Text Animation. Called when the user disables the
     * gradient or switches the widget's target to a non-text kind,
     * both of which used to leave the previous paint stuck on the DOM.
     */
    function clearTextGradient(textEl, trackEl) {
        stopFollowMouse(trackEl);
        injectCss(textEl, '');
        textEl.classList.remove('aurora-gradient-text');
        textEl.removeAttribute('data-aurora-gradient-instance');

        var propsToClear = [
            'backgroundImage', 'backgroundClip', 'webkitBackgroundClip',
            'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
            'color', 'webkitTextFillColor',
            'paddingTop', 'paddingBottom', 'lineHeight'
        ];
        propsToClear.forEach(function (p) { textEl.style[p] = ''; });

        var leaves = findTextLeaves(textEl);
        for (var i = 0; i < leaves.length; i++) {
            propsToClear.forEach(function (p) { leaves[i].style[p] = ''; });
        }
    }

    function applyText(textEl, trackEl, data, id) {
        // Reset any prior paint (colors, sizes, background positions, leaf
        // paints) before applying a fresh one — makes color/mode changes in
        // the editor deterministic instead of layering onto stale styles.
        clearTextGradient(textEl, trackEl);

        // Guard against accent/descender clipping when the browser
        // computes the text-bounds mask for background-clip:text —
        // tightly-set line-heights on Elementor headings cut off Ê/Õ/g
        // otherwise. Only writes inline if the user hasn't already set
        // their own values.
        if (!textEl.style.paddingTop)    textEl.style.paddingTop    = '0.1em';
        if (!textEl.style.paddingBottom) textEl.style.paddingBottom = '0.1em';
        var cs = getComputedStyle(textEl);
        if (parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) < 1.2) {
            textEl.style.lineHeight = '1.25';
        }

        if (data.followMouse) {
            // Follow Mouse doesn't co-exist with the split-text path yet
            // — it drives the background off mousemove on the parent.
            textEl.style.webkitBackgroundClip = 'text';
            textEl.style.backgroundClip       = 'text';
            textEl.style.color                = 'transparent';
            textEl.style.webkitTextFillColor  = 'transparent';
            startFollowMouse(trackEl, textEl, data);
            return;
        }

        var gradientCss = buildGradientCss(data.type, data.angle, data.stops);
        var leaves      = findTextLeaves(textEl);
        var mode        = data.textMode || 'phrase';

        if (leaves.length === 0) {
            // No Text Animation split — paint the parent directly.
            paintTextTarget(textEl, gradientCss);
        } else if (mode === 'per-letter') {
            // Each glyph carries the FULL gradient (all letters look
            // identical). Parent must stay bare, otherwise its own paint
            // would ghost through the descendant text at the parent's
            // untransformed position (see the earlier bunched-letters
            // regression).
            textEl.style.color                = 'transparent';
            textEl.style.webkitTextFillColor  = 'transparent';
            for (var li = 0; li < leaves.length; li++) {
                paintTextTarget(leaves[li], gradientCss);
            }
        } else {
            // Phrase mode: the whole sentence shares a single gradient
            // that stretches across the parent's bounding box. Each leaf
            // receives a background sized to the parent's dimensions and
            // POSITIONED so it displays only the slice sitting under its
            // own glyph — visually reconstructing the phrase-wide
            // gradient across all animated spans.
            var parentRect = textEl.getBoundingClientRect();
            textEl.style.color               = 'transparent';
            textEl.style.webkitTextFillColor = 'transparent';
            for (var lj = 0; lj < leaves.length; lj++) {
                var leaf     = leaves[lj];
                var leafRect = leaf.getBoundingClientRect();
                paintTextTarget(leaf, gradientCss);
                leaf.style.backgroundSize     = parentRect.width + 'px ' + parentRect.height + 'px';
                leaf.style.backgroundPosition = (parentRect.left - leafRect.left) + 'px ' + (parentRect.top - leafRect.top) + 'px';
                leaf.style.backgroundRepeat   = 'no-repeat';
            }
        }

        if (!data.animate) return;

        textEl.classList.add('aurora-gradient-text');
        textEl.setAttribute('data-aurora-gradient-instance', id);
        textEl.style.backgroundSize = '300% 300%';

        var selector = '.aurora-gradient-text[data-aurora-gradient-instance="' + id + '"]';
        var css;

        if (data.style === 'loop') {
            css = selector + '{animation:aurora-grad-text-hue-' + id + ' ' + data.speed + 's linear infinite;}' +
                '@keyframes aurora-grad-text-hue-' + id + '{' +
                '0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}';
        } else {
            css = selector + '{animation:aurora-grad-text-pan-' + id + ' ' + data.speed + 's ease-in-out infinite;}' +
                '@keyframes aurora-grad-text-pan-' + id + '{' +
                '0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}';
        }

        injectCss(textEl, css);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ICON FILL (Icon widget, and Icon Box when "Apply To" = Icon)
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Elementor's Icon control renders one of two completely different DOM
    // shapes depending on the icon library the user picked, and both need a
    // different gradient technique:
    //   - Font icon (Font Awesome, etc.): the glyph is a font character
    //     rendered via <i class="fa ...">. It IS text, so the exact same
    //     background-clip:text trick used for Heading/Text Editor works
    //     unchanged — paintTextTarget() is reused as-is, including full
    //     Animate (pan/loop) and Follow Mouse support for free.
    //   - SVG icon: <svg> paths have no notion of "text" to clip — CSS
    //     background-clip:text has no effect on them. Instead, a
    //     <linearGradient>/<radialGradient> is injected directly into the
    //     SVG's own <defs>, and every path's fill is pointed at it via
    //     fill="url(#id)". Animate only supports "loop" (a CSS hue-rotate
    //     filter on the whole <svg>, which works regardless of fill type) —
    //     a moving-blobs mesh or a background-position pan don't apply to an
    //     SVG fill, so both "mesh" and "pan" style values fall back to the
    //     hue-rotate loop for SVG icons. Follow Mouse isn't supported for
    //     SVG icons (the spotlight math would need to run in the SVG's own
    //     coordinate space) — it's silently ignored, falling back to a
    //     static gradient centered on the icon.

    /**
     * @param {HTMLElement} iconWrap Icon container, e.g. `.elementor-icon` (holds either an <i> or an <svg>).
     * @returns {{type: 'font'|'svg', glyphEl: HTMLElement}|null}
     */
    function getIconGlyph(iconWrap) {
        if (!iconWrap) return null;
        var svg = iconWrap.querySelector('svg');
        if (svg) return { type: 'svg', glyphEl: svg };
        var i = iconWrap.querySelector('i');
        if (i) return { type: 'font', glyphEl: i };
        return null;
    }

    /**
     * Injects/updates the <linearGradient> or <radialGradient> definition
     * inside an SVG's own <defs> and points every shape's fill at it.
     * Re-run on every settings change — overwrites the previous def instead
     * of accumulating one per re-render.
     *
     * @param {SVGElement} svg
     * @param {Object}     data
     * @param {number}     id
     * @returns {string} The gradient element's id (for the animation CSS selector, unused currently but kept for parity/debugging).
     */
    function paintSvgIconGradient(svg, data, id) {
        var svgNs = 'http://www.w3.org/2000/svg';
        var defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS(svgNs, 'defs');
            svg.insertBefore(defs, svg.firstChild);
        }

        var gradId = 'aurora-grad-icon-' + id;
        var previous = defs.querySelector('#' + gradId);
        if (previous) previous.remove();

        var isRadial = data.type === 'radial';
        var gradEl = document.createElementNS(svgNs, isRadial ? 'radialGradient' : 'linearGradient');
        gradEl.setAttribute('id', gradId);

        if (isRadial) {
            gradEl.setAttribute('cx', '50%');
            gradEl.setAttribute('cy', '50%');
            gradEl.setAttribute('r', '70%');
        } else {
            // Same angle-to-endpoint conversion CSS linear-gradient() uses
            // internally, so the SVG version points the same direction as
            // the CSS one used elsewhere for this same instance.
            var rad = ((data.angle - 90) * Math.PI) / 180;
            var dx = Math.cos(rad) * 0.5;
            var dy = Math.sin(rad) * 0.5;
            gradEl.setAttribute('x1', (50 - dx * 100) + '%');
            gradEl.setAttribute('y1', (50 - dy * 100) + '%');
            gradEl.setAttribute('x2', (50 + dx * 100) + '%');
            gradEl.setAttribute('y2', (50 + dy * 100) + '%');
        }

        data.stops.forEach(function (s, i) {
            var stop = document.createElementNS(svgNs, 'stop');
            var offset = (s.offset === null || typeof s.offset === 'undefined')
                ? (i / Math.max(1, data.stops.length - 1)) * 100
                : s.offset;
            stop.setAttribute('offset', offset + '%');
            stop.setAttribute('stop-color', s.color);
            gradEl.appendChild(stop);
        });

        defs.appendChild(gradEl);

        var shapes = svg.querySelectorAll('path, circle, rect, polygon, ellipse, line, polyline');
        shapes.forEach(function (shape) {
            shape.style.fill = 'url(#' + gradId + ')';
        });
        // Also set it on the <svg> itself, in case a shape inherits fill
        // from the root via `fill="currentColor"` further down the tree.
        svg.style.fill = 'url(#' + gradId + ')';

        return gradId;
    }

    /**
     * Undoes anything applyIconFill may have written — SVG defs/fill AND
     * the font-icon background-clip:text paint, whichever path was used
     * last, so switching icon library or disabling the module never
     * leaves stale paint behind.
     *
     * @param {HTMLElement} iconWrap
     * @param {HTMLElement} trackEl
     */
    function clearIconFill(iconWrap, trackEl) {
        stopFollowMouse(trackEl);
        if (!iconWrap) return;

        injectCss(iconWrap, '');
        iconWrap.classList.remove('aurora-gradient-icon');
        iconWrap.removeAttribute('data-aurora-gradient-instance');

        var glyph = getIconGlyph(iconWrap);
        if (!glyph) return;

        if (glyph.type === 'font') {
            var propsToClear = [
                'backgroundImage', 'backgroundClip', 'webkitBackgroundClip',
                'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
                'color', 'webkitTextFillColor'
            ];
            propsToClear.forEach(function (p) { glyph.glyphEl.style[p] = ''; });
        } else {
            glyph.glyphEl.style.fill = '';
            glyph.glyphEl.style.filter = '';
            var defs = glyph.glyphEl.querySelector('defs');
            if (defs) defs.innerHTML = '';
            var shapes = glyph.glyphEl.querySelectorAll('path, circle, rect, polygon, ellipse, line, polyline');
            shapes.forEach(function (shape) { shape.style.fill = ''; });
        }
    }

    /**
     * @param {HTMLElement} iconWrap Located `.elementor-icon` node.
     * @param {HTMLElement} trackEl  Outer wrapper (bounding box for Follow Mouse).
     * @param {Object}      data
     * @param {number}      id
     */
    function applyIconFill(iconWrap, trackEl, data, id) {
        clearIconFill(iconWrap, trackEl);

        var glyph = getIconGlyph(iconWrap);
        if (!glyph) return;

        if (glyph.type === 'font') {
            // Identical mechanism to text — the glyph IS a font character.
            if (data.followMouse) {
                paintTextTarget(glyph.glyphEl, 'none');
                startFollowMouse(trackEl, glyph.glyphEl, data);
                return;
            }

            var gradientCss = buildGradientCss(data.type, data.angle, data.stops);
            paintTextTarget(glyph.glyphEl, gradientCss);

            if (!data.animate) return;

            iconWrap.classList.add('aurora-gradient-icon');
            iconWrap.setAttribute('data-aurora-gradient-instance', id);
            glyph.glyphEl.style.backgroundSize = '300% 300%';

            var selector = '.aurora-gradient-icon[data-aurora-gradient-instance="' + id + '"] i';
            var css;
            if (data.style === 'loop') {
                css = selector + '{animation:aurora-grad-icon-hue-' + id + ' ' + data.speed + 's linear infinite;}' +
                    '@keyframes aurora-grad-icon-hue-' + id + '{' +
                    '0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}';
            } else {
                css = selector + '{animation:aurora-grad-icon-pan-' + id + ' ' + data.speed + 's ease-in-out infinite;}' +
                    '@keyframes aurora-grad-icon-pan-' + id + '{' +
                    '0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}';
            }
            injectCss(iconWrap, css);
            return;
        }

        // SVG path — Follow Mouse isn't supported (see the block comment
        // above this section); always paints a static-position gradient.
        paintSvgIconGradient(glyph.glyphEl, data, id);

        if (!data.animate) return;

        iconWrap.classList.add('aurora-gradient-icon');
        iconWrap.setAttribute('data-aurora-gradient-instance', id);

        // Mesh/Pan both fall back to the hue-rotate loop for SVG fills —
        // neither a moving-blobs background nor a background-position pan
        // has a meaningful SVG-fill equivalent.
        var svgSelector = '.aurora-gradient-icon[data-aurora-gradient-instance="' + id + '"] svg';
        var svgCss = svgSelector + '{animation:aurora-grad-icon-svg-hue-' + id + ' ' + data.speed + 's linear infinite;}' +
            '@keyframes aurora-grad-icon-svg-hue-' + id + '{' +
            '0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}';
        injectCss(iconWrap, svgCss);
    }

    /**
     * Single entry point: decides background vs. text using the
     * `data-aurora-gradient-target` attribute that PHP already computed
     * from the element's own type (class-gradient-controls.php,
     * TEXT_ELEMENTS = heading/text-editor, everything else = background).
     *
     * This used to be re-derived here via `wrapper.querySelector(
     * '.elementor-heading-title, .elementor-text-editor')`, which does a
     * *deep* search of the wrapper's whole subtree. That misfired badly
     * for the common case of a Section/Column/Container with a Heading
     * or Text Editor widget nested somewhere inside it: enabling the
     * background gradient on the container would instead find that
     * unrelated nested widget's text node and apply the gradient to it
     * as a text-fill, leaving the container itself without its
     * background and silently corrupting an inner heading's styling.
     * Trusting the PHP-computed attribute avoids the DOM search
     * entirely and always matches the element's actual type.
     *
     * @param {HTMLElement} wrapper
     * @param {Object} data
     */
    function applyGradient(wrapper, data) {
        if (!data.stops || data.stops.length < 2) return;

        var id = ++instanceCounter;

        // Target resolution — prefer an explicit `data.target` (set by the
        // Elementor Handler from the widget's own type), fall back to the
        // PHP-written attribute (needed in the pure-frontend fallback path,
        // where the JS handler never runs), and finally to background.
        //
        // The Handler override matters in the editor: when the user toggles
        // Enable Gradient on a Heading, the handler's run() fires BEFORE the
        // widget is re-rendered by PHP, so `data-aurora-gradient-target`
        // still holds a stale/missing value — trusting the attribute alone
        // silently applied the gradient as a background rectangle behind
        // the text instead of as a text-fill.
        var target = data.target || wrapper.getAttribute('data-aurora-gradient-target') || 'background';

        if (target === 'text') {
            var textEl = wrapper.querySelector('.elementor-heading-title, .elementor-text-editor') || wrapper;
            applyText(textEl, wrapper, data, id);
        } else if (target === 'icon') {
            // Icon Box nests its icon one level deeper (.elementor-icon-box-icon
            // .elementor-icon) than the plain Icon widget (.elementor-icon
            // directly) — this selector matches both without needing to know
            // which widget it's running on.
            var iconWrap = wrapper.querySelector('.elementor-icon-box-icon .elementor-icon, .elementor-icon');
            if (iconWrap) applyIconFill(iconWrap, wrapper, data, id);
        } else {
            applyBackground(wrapper, data, id);
        }
    }

    /**
     * Reads the options from the data-attributes — used only in the
     * pure-frontend fallback (when Elementor's JS isn't available).
     *
     * @param {HTMLElement} el
     * @returns {Object}
     */
    function isTrueVal(val) {
        return val === '1' || val === 'yes' || val === 'true';
    }

    function parseOptsFromDataset(el) {
        return {
            target: el.getAttribute('data-aurora-gradient-target') || 'background',
            type: el.getAttribute('data-aurora-gradient-type') || 'linear',
            meshStyle: el.getAttribute('data-aurora-gradient-mesh-style') || 'paper',
            distortion: parseInt(el.getAttribute('data-aurora-gradient-distortion'), 10) || 40,
            swirl: parseInt(el.getAttribute('data-aurora-gradient-swirl'), 10) || 25,
            scale: parseFloat(el.getAttribute('data-aurora-gradient-scale')) || 1.25,
            grainEnable: isTrueVal(el.getAttribute('data-aurora-gradient-grain-enable')),
            grainIntensity: parseInt(el.getAttribute('data-aurora-gradient-grain-intensity'), 10) || 35,
            liquidCursor: isTrueVal(el.getAttribute('data-aurora-gradient-liquid-cursor')),
            cursorRadius: parseInt(el.getAttribute('data-aurora-gradient-cursor-radius'), 10) || 250,
            angle: parseInt(el.getAttribute('data-aurora-gradient-angle'), 10) || 135,
            stops: parseStops(el.getAttribute('data-aurora-gradient-stops')),
            animate: isTrueVal(el.getAttribute('data-aurora-gradient-animate')),
            style: el.getAttribute('data-aurora-gradient-style') || 'mesh',
            speed: parseInt(el.getAttribute('data-aurora-gradient-speed'), 10) || 8,
            followMouse: isTrueVal(el.getAttribute('data-aurora-gradient-follow-mouse')),
            spotlightRadius: parseInt(el.getAttribute('data-aurora-gradient-spotlight-radius'), 10) || 600,
            textMode: el.getAttribute('data-aurora-gradient-text-mode') || 'phrase'
        };
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

        function AuroraGradientHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraGradientHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraGradientHandler.prototype.constructor = AuroraGradientHandler;

        AuroraGradientHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_gradient_enable') === 'yes';
        };

        AuroraGradientHandler.prototype.getOpts = function () {
            var rawStops = this.getElementSettings('aurora_gradient_stops') || [];
            var stops = rawStops
                .map(function (stop) {
                    return {
                        color: stop.color || '#0afbc1',
                        offset: stop.offset ? sizeOf(stop.offset, null) : null
                    };
                })
                .filter(function (s) { return s.color; });

            var type = this.getElementSettings('aurora_gradient_type') || 'linear';

            var followMouse = 'radial' === type && this.getElementSettings('aurora_gradient_follow_mouse') === 'yes';

            return {
                type: type,
                meshStyle: this.getElementSettings('aurora_gradient_mesh_style') || 'paper',
                distortion: sizeOf(this.getElementSettings('aurora_gradient_distortion'), 40),
                swirl: sizeOf(this.getElementSettings('aurora_gradient_swirl'), 25),
                scale: sizeOf(this.getElementSettings('aurora_gradient_scale'), 1.25),
                grainEnable: this.getElementSettings('aurora_gradient_grain_enable') === 'yes',
                grainIntensity: sizeOf(this.getElementSettings('aurora_gradient_grain_intensity'), 35),
                liquidCursor: this.getElementSettings('aurora_gradient_liquid_cursor') === 'yes',
                cursorRadius: sizeOf(this.getElementSettings('aurora_gradient_cursor_radius'), 250),
                angle: sizeOf(this.getElementSettings('aurora_gradient_angle'), 135),
                stops: stops,
                animate: !followMouse && this.getElementSettings('aurora_gradient_animate') === 'yes',
                style: this.getElementSettings('aurora_gradient_animation_style') || 'mesh',
                speed: sizeOf(this.getElementSettings('aurora_gradient_speed'), 8),
                followMouse: followMouse,
                spotlightRadius: sizeOf(this.getElementSettings('aurora_gradient_spotlight_radius'), 600),
                textMode: this.getElementSettings('aurora_gradient_text_mode') || 'phrase'
            };
        };

        AuroraGradientHandler.prototype.resolveTarget = function (el) {
            var isText = el.matches('.elementor-widget-heading, .elementor-widget-text-editor');
            if (isText) return 'text';

            var isIconWidget = el.matches('.elementor-widget-icon');
            if (isIconWidget) return 'icon';

            var isIconBox = el.matches('.elementor-widget-icon-box');
            if (isIconBox) {
                return 'icon' === this.getElementSettings('aurora_gradient_apply_to') ? 'icon' : 'background';
            }

            return 'background';
        };

        AuroraGradientHandler.prototype.run = function () {
            var el = this.$element[0];
            var target = this.resolveTarget(el);

            // Disabled path — actively strip anything the previous run
            // painted. Without this, toggling Enable Gradient off (or
            // switching the target away from text/icon) left the old inline
            // styles frozen on the DOM and the widget appeared to still
            // have a gradient. Same story for editor color changes:
            // clearing before applying is what makes the change stick.
            if (!this.isEnabled()) {
                if (target === 'text') {
                    var textEl = el.querySelector('.elementor-heading-title, .elementor-text-editor') || el;
                    clearTextGradient(textEl, el);
                } else if (target === 'icon') {
                    var iconWrap = el.querySelector('.elementor-icon-box-icon .elementor-icon, .elementor-icon');
                    clearIconFill(iconWrap, el);
                } else {
                    clearBackgroundGradient(el);
                }
                return;
            }

            var opts = this.getOpts();
            opts.target = target;

            // Icon Box's target is a runtime-togglable setting ("Apply To")
            // — clear whichever target ISN'T currently selected first, so
            // flipping it in the editor doesn't leave stale paint from the
            // previous choice (a background AND an icon-fill at once).
            if (el.matches('.elementor-widget-icon-box')) {
                if (target === 'icon') {
                    clearBackgroundGradient(el);
                } else {
                    var iconWrapEl = el.querySelector('.elementor-icon-box-icon .elementor-icon, .elementor-icon');
                    clearIconFill(iconWrapEl, el);
                }
            }

            applyGradient(el, opts);
        };

        AuroraGradientHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            this.run();

            // Re-run whenever Text Animation splits the wrapper's text
            // into per-char/word/line spans — its innerHTML rewrite blows
            // away any inline paint we may have set, and the new leaf
            // spans need the gradient CSS applied to them individually.
            var self = this;
            this.$element[0].addEventListener('aurora:text-split', function () {
                self.run();
            });
        };

        AuroraGradientHandler.prototype.onElementChange = function (propertyName) {
            if (propertyName.indexOf('aurora_gradient_') === 0) {
                this.run();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            elementorFrontend.elementsHandler.addHandler(AuroraGradientHandler, { $element: $element });
        });

        return true;
    }

    var auroraGradientRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraGradientRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks) {
            return false;
        }
        auroraGradientRegistered = registerHandler();
        return auroraGradientRegistered;
    }

    // Synchronous registration, the exact moment the script is evaluated —
    // same reason documented in text-animations.js: on the real frontend
    // Elementor can fire frontend/element_ready BEFORE any async callback,
    // and the event only fires once per element.
    if (!tryRegisterHandlerNow() && typeof elementorFrontend !== 'undefined') {
        $(window).on('elementor/frontend/init', function () {
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
        // Fallback: no Elementor JS available — scan the page using the
        // data-aurora-gradient-* attributes rendered by PHP on the real frontend.
        if (typeof elementorFrontend === 'undefined') {
            document.querySelectorAll('[data-aurora-gradient-enable="1"], [data-aurora-gradient-enable="yes"]').forEach(function (el) {
                applyGradient(el, parseOptsFromDataset(el));
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
