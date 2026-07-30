import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-34 Mesh Text Hover — identical WebGL setup (single
// full-screen quad + fragment-shader UV warp near the cursor, same
// hardened lifecycle: debounced resize, IntersectionObserver-paused RAF,
// passive pointer listeners, full GL resource cleanup on teardown). The
// only library-specific part is the canvas fade-in on reveal.
var effect = {
    id: 'ml-52',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText || textEl.textContent || '';

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
        function onPointerLeave() {}

        canvas.addEventListener('pointermove', onPointerMove, { passive: true });
        canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

        var state = { rafId: null, running: false };

        function tick() {
            mouse.vx = (mouse.x - mouse.px) * 0.4 + mouse.vx * 0.6;
            mouse.vy = (mouse.y - mouse.py) * 0.4 + mouse.vy * 0.6;
            mouse.px = mouse.x;
            mouse.py = mouse.y;
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

        anime.animate(canvas, {
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: opts.delay,
            ease: 'outQuad',
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
