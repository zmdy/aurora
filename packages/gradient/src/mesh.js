import { ticker, observe } from '@aurora/core';
import { VERTEX_SHADER, getFragmentShader } from './shaders.js';

var MAX_STOPS = 6;

function hexToVec3(color) {
    var hex = String(color || '').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
    var value = parseInt(hex, 16);
    if (isNaN(value)) return [0, 0, 0];
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
}

/**
 * Mounts a WebGL mesh gradient behind the element's content.
 *
 * Returns `null` when WebGL or the shader is unavailable, so the caller can
 * fall back to a CSS gradient. Otherwise returns a controller whose `update`
 * pushes new option values onto the running shader (cheap, no rebuild) and
 * whose `destroy` releases every GL resource.
 *
 * @param {HTMLElement} el
 * @param {Object} options   Validated gradient options.
 * @param {Array} stops      Parsed color stops.
 * @param {boolean} animated False renders a single frame (reduced motion).
 */
export function mountMesh(el, options, stops, animated) {
    var canvas = document.createElement('canvas');
    canvas.className = 'aurora-gradient-mesh-canvas';
    canvas.setAttribute('aria-hidden', 'true');

    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return null;

    var vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    var fragment = compile(gl, gl.FRAGMENT_SHADER, getFragmentShader(options.meshStyle));
    if (!vertex || !fragment) return null;

    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    var names = {
        res: 'u_resolution', time: 'u_time', mouse: 'u_mouse', dist: 'u_distortion', swirl: 'u_swirl',
        scale: 'u_scale', angle: 'u_angle', grainOn: 'u_grain_enable', grain: 'u_grain_intensity',
        liquid: 'u_liquid_cursor', radius: 'u_cursor_radius', count: 'u_stop_count',
    };
    var u = {};
    Object.keys(names).forEach(function (key) { u[key] = gl.getUniformLocation(program, names[key]); });
    u.stops = [];
    u.offsets = [];
    for (var i = 0; i < MAX_STOPS; i++) {
        u.stops.push(gl.getUniformLocation(program, 'u_stops[' + i + ']'));
        u.offsets.push(gl.getUniformLocation(program, 'u_offsets[' + i + ']'));
    }

    if (getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
        var restorePosition = true;
    }
    el.insertBefore(canvas, el.firstChild);

    var state = {
        options: options,
        stops: stops,
        mouse: { x: 0, y: 0 },
        target: { x: 0, y: 0 },
        rect: null,
        listening: false,
        removeTick: null,
        stopObserving: null,
        resizeTimer: null,
        destroyed: false,
    };
    var start = performance.now();

    function onMove(event) {
        if (!state.rect) return;
        state.target.x = event.clientX - state.rect.left;
        state.target.y = state.rect.height - (event.clientY - state.rect.top);
    }

    function pushUniforms() {
        var o = state.options;
        gl.useProgram(program);
        gl.uniform1f(u.dist, o.distortion / 100);
        gl.uniform1f(u.swirl, o.swirl / 100);
        gl.uniform1f(u.scale, o.scale);
        gl.uniform1f(u.angle, o.angle);
        gl.uniform1f(u.grainOn, o.grain ? 1 : 0);
        gl.uniform1f(u.grain, o.grainIntensity / 100);
        gl.uniform1f(u.liquid, o.liquidCursor ? 1 : 0);
        gl.uniform1f(u.radius, o.cursorRadius);

        var list = state.stops.slice(0, MAX_STOPS);
        gl.uniform1i(u.count, list.length);
        list.forEach(function (stop, index) {
            var rgb = hexToVec3(stop.color);
            gl.uniform3f(u.stops[index], rgb[0], rgb[1], rgb[2]);
            gl.uniform1f(u.offsets[index], stop.offset === null ? index / Math.max(1, list.length - 1) : stop.offset / 100);
        });

        // Liquid cursor can be toggled without rebuilding the shader.
        if (o.liquidCursor && !state.listening) {
            state.rect = el.getBoundingClientRect();
            el.addEventListener('pointermove', onMove, { passive: true });
            state.listening = true;
        } else if (!o.liquidCursor && state.listening) {
            el.removeEventListener('pointermove', onMove);
            state.listening = false;
        }
    }

    function resize() {
        var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = (el.offsetWidth || 300) * ratio;
        canvas.height = (el.offsetHeight || 300) * ratio;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.uniform2f(u.res, canvas.width, canvas.height);
        if (state.options.liquidCursor) state.rect = el.getBoundingClientRect();
        if (!animated) draw(0);
    }

    function onResize() {
        clearTimeout(state.resizeTimer);
        state.resizeTimer = setTimeout(resize, 150);
    }

    function draw(elapsed) {
        gl.useProgram(program);
        if (state.options.liquidCursor) {
            state.mouse.x += (state.target.x - state.mouse.x) * 0.1;
            state.mouse.y += (state.target.y - state.mouse.y) * 0.1;
            gl.uniform2f(u.mouse,
                state.mouse.x * (canvas.width / (el.offsetWidth || 1)),
                state.mouse.y * (canvas.height / (el.offsetHeight || 1)));
        }
        gl.uniform1f(u.time, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    function tick() {
        draw((performance.now() - start) * 0.001 * (state.options.speed ? 8 / state.options.speed : 1));
    }

    pushUniforms();
    resize();
    window.addEventListener('resize', onResize);

    if (animated) {
        // Draw only while the element is on screen.
        state.stopObserving = observe(el, {
            threshold: 0.05,
            onEnter: function () { if (!state.removeTick) state.removeTick = ticker.add(tick); },
            onLeave: function () { if (state.removeTick) { state.removeTick(); state.removeTick = null; } },
        });
    } else {
        draw(0);
    }

    return {
        meshStyle: options.meshStyle,

        /** False once the GL context is lost; the caller should rebuild. */
        alive: function () { return !state.destroyed && !gl.isContextLost(); },

        update: function (nextOptions, nextStops) {
            state.options = nextOptions;
            state.stops = nextStops;
            pushUniforms();
            if (!animated) draw(0);
        },

        destroy: function () {
            if (state.destroyed) return;
            state.destroyed = true;
            clearTimeout(state.resizeTimer);
            window.removeEventListener('resize', onResize);
            if (state.listening) el.removeEventListener('pointermove', onMove);
            if (state.stopObserving) state.stopObserving();
            if (state.removeTick) state.removeTick();
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
            gl.deleteShader(vertex);
            gl.deleteShader(fragment);
            canvas.remove();
            if (restorePosition) el.style.position = '';
        },
    };
}
