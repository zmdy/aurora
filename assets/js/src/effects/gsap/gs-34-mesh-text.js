import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Mesh Text Hover — inspired by the idea of text rendered onto a WebGL
// surface that warps under the cursor like a soft, elastic mesh, explored
// via a pasted Originkit source that builds a subdivided vertex grid
// (~3,800 vertices) driven by a per-vertex spring/damping physics loop
// running on the CPU every frame. Reimplemented from scratch with a much
// cheaper technique that matches how Aurora's OWN Gradient module already
// does "mesh" distortion (see gradient-module.js's Mesh Shader): a single
// full-screen quad plus a fragment shader that displaces the *sampled UV*
// near the cursor, instead of displacing thousands of real vertices on
// the CPU every frame. Visually similar pull/warp result, none of the
// per-frame JS array walk — deliberately chosen given this exact module
// was the subject of this session's Elementor performance investigation.
//
// Self-managed: bakes the text onto an offscreen 2D canvas (used as a
// WebGL texture) and replaces textEl's content with a <canvas>, since
// this isn't a per-character animation — it needs the whole block as one
// texture. Follows the same hardened lifecycle rules established for
// Aurora's other canvas/WebGL effects this session: RAF id kept in a
// shared state object (not a bare reassigned local, see gradient-module.js
// M-2), resize debounced, an IntersectionObserver pauses the loop when
// scrolled off-screen, pointer listeners are passive, and every GL
// resource is explicitly deleted on teardown (WebGL contexts are a
// limited, per-tab resource).
var effect = {
    id: 'gs-34',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText || textEl.textContent || '';

        // Reinitializing (e.g. an editor control change) tears down the
        // previous WebGL context before building a new one.
        if (textEl._auroraMeshText) {
            textEl._auroraMeshText.cleanup();
            textEl._auroraMeshText = null;
        }

        var rect = textEl.getBoundingClientRect();
        var boxWidth = Math.max(20, rect.width || textEl.offsetWidth || 300);
        var boxHeight = Math.max(20, rect.height || textEl.offsetHeight || 80);

        var cs = getComputedStyle(textEl);
        var color = cs.color || '#ffffff';
        var fontStyle = cs.fontStyle || 'normal';
        var fontWeight = cs.fontWeight || '400';
        var fontFamily = cs.fontFamily || 'sans-serif';
        var fontSize = parseFloat(cs.fontSize) || 32;

        // Pin the box's height explicitly — once innerHTML is cleared, the
        // element would otherwise collapse to whatever the empty <canvas>
        // reports, losing the height the surrounding layout expects.
        textEl.style.height = boxHeight + 'px';
        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var canvas = document.createElement('canvas');
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', original);
        canvas.style.cssText = 'display:block;width:100%;height:100%;';
        textEl.appendChild(canvas);

        var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            // No WebGL available — fall back to plain text, nothing lost.
            canvas.remove();
            textEl.textContent = original;
            textEl.style.height = '';
            return;
        }

        function compileShader(type, src) {
            var s = gl.createShader(type);
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
                gl.deleteShader(s);
                return null;
            }
            return s;
        }

        var VERT = 'attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';
        var FRAG = [
            'precision mediump float;',
            'varying vec2 vUv;',
            'uniform sampler2D uTex;',
            'uniform vec2 uMouse;',
            'uniform vec2 uVel;',
            'uniform float uAspect;',
            'void main() {',
            '    vec2 d = vUv - uMouse;',
            '    d.x *= uAspect;',
            '    float dist = length(d);',
            '    float falloff = smoothstep(0.35, 0.0, dist);',
            '    vec2 warped = vUv - uVel * falloff;',
            '    float mag = clamp(length(uVel) * 6.0, 0.0, 1.0) * falloff;',
            '    vec4 base = texture2D(uTex, warped);',
            '    if (mag > 0.001) {',
            '        vec2 off = vec2(uVel.y, -uVel.x) * 0.02 * mag;',
            '        float rA = texture2D(uTex, warped + off).a;',
            '        float bA = texture2D(uTex, warped - off).a;',
            '        vec3 col = base.rgb * base.a;',
            '        col += vec3(1.0, 0.15, 0.35) * max(0.0, rA - base.a);',
            '        col += vec3(0.15, 0.55, 1.0) * max(0.0, bA - base.a);',
            '        gl_FragColor = vec4(col, max(base.a, max(rA, bA)));',
            '    } else {',
            '        gl_FragColor = base;',
            '    }',
            '}',
        ].join('\n');

        var vs = compileShader(gl.VERTEX_SHADER, VERT);
        var fs = compileShader(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) {
            canvas.remove();
            textEl.textContent = original;
            textEl.style.height = '';
            return;
        }

        var program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            canvas.remove();
            textEl.textContent = original;
            textEl.style.height = '';
            return;
        }
        gl.useProgram(program);

        var quadBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
        var aPos = gl.getAttribLocation(program, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        var uMouse = gl.getUniformLocation(program, 'uMouse');
        var uVel = gl.getUniformLocation(program, 'uVel');
        var uAspect = gl.getUniformLocation(program, 'uAspect');
        var uTex = gl.getUniformLocation(program, 'uTex');

        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        function renderTextTexture(w, h, dpr) {
            var off = document.createElement('canvas');
            off.width = Math.max(2, Math.round(w * dpr));
            off.height = Math.max(2, Math.round(h * dpr));
            var ctx2d = off.getContext('2d');
            ctx2d.clearRect(0, 0, off.width, off.height);
            ctx2d.fillStyle = color;
            ctx2d.textAlign = 'center';
            ctx2d.textBaseline = 'middle';
            ctx2d.font = fontStyle + ' ' + fontWeight + ' ' + Math.round(fontSize * dpr) + 'px ' + fontFamily;
            ctx2d.fillText(original, off.width / 2, off.height / 2);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            // The 2D canvas stores row 0 at the top, but WebGL texture v=0
            // is the bottom row by convention — without this flip the
            // baked text renders upside-down (mirrored on the vertical
            // axis), which is what made characters like S/E come out
            // looking reversed.
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);
        }

        var dpr = window.devicePixelRatio || 1;
        var resizeTimer = null;

        function doResize() {
            var r = textEl.getBoundingClientRect();
            var w = Math.max(20, r.width || boxWidth);
            var h = Math.max(20, r.height || boxHeight);
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.uniform1f(uAspect, h / w);
            renderTextTexture(w, h, dpr);
        }

        function onResize() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(doResize, 150);
        }

        doResize();

        var mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0 };

        function onPointerMove(e) {
            var r = canvas.getBoundingClientRect();
            if (!r.width || !r.height) return;
            mouse.x = (e.clientX - r.left) / r.width;
            mouse.y = (e.clientY - r.top) / r.height;
        }
        function onPointerLeave() {
            // Let the loop's own decay carry velocity back to zero rather
            // than snapping it — avoids a visible pop when the pointer
            // leaves mid-drag.
        }

        canvas.addEventListener('pointermove', onPointerMove, { passive: true });
        canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

        var state = { rafId: null, running: false };

        function tick() {
            mouse.vx = (mouse.x - mouse.px) * 0.4 + mouse.vx * 0.6;
            mouse.vy = (mouse.y - mouse.py) * 0.4 + mouse.vy * 0.6;
            mouse.px = mouse.x;
            mouse.py = mouse.y;
            // Settle back to rest even while the pointer sits still.
            mouse.vx *= 0.9;
            mouse.vy *= 0.9;

            gl.useProgram(program);
            gl.uniform2f(uMouse, mouse.x, mouse.y);
            gl.uniform2f(uVel, mouse.vx, mouse.vy);
            gl.uniform1i(uTex, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            state.rafId = requestAnimationFrame(tick);
        }

        // First frame: static, no distortion. Also the permanent state
        // when the user prefers reduced motion — the text is still
        // rendered crisply, it just never warps.
        gl.uniform2f(uMouse, 0.5, 0.5);
        gl.uniform2f(uVel, 0, 0);
        gl.uniform1i(uTex, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        var io = null;
        if (!reducedMotion) {
            io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting && !state.running) {
                        state.running = true;
                        state.rafId = requestAnimationFrame(tick);
                    } else if (!entry.isIntersecting && state.running) {
                        state.running = false;
                        if (state.rafId) cancelAnimationFrame(state.rafId);
                        state.rafId = null;
                    }
                });
            }, { threshold: 0.01 });
            io.observe(textEl);
        }

        window.addEventListener('resize', onResize);

        gsap.fromTo(canvas, { opacity: 0 }, {
            opacity: 1,
            duration: Math.max(0.3, opts.duration / 1000),
            delay: opts.delay / 1000,
            ease: 'power2.out',
        });

        textEl._auroraMeshText = {
            cleanup: function () {
                clearTimeout(resizeTimer);
                window.removeEventListener('resize', onResize);
                canvas.removeEventListener('pointermove', onPointerMove);
                canvas.removeEventListener('pointerleave', onPointerLeave);
                if (io) io.disconnect();
                if (state.rafId) cancelAnimationFrame(state.rafId);
                state.running = false;
                gl.deleteBuffer(quadBuf);
                gl.deleteTexture(tex);
                gl.deleteProgram(program);
                gl.deleteShader(vs);
                gl.deleteShader(fs);
                textEl.style.height = '';
            },
        };
    },
};

registerEffect(effect);
export default effect;
