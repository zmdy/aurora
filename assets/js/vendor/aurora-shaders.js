/**
 * Aurora for Elementor — WebGL Mesh Shaders Engine
 *
 * Provides high-performance GLSL shaders & noise generators for:
 * 1. Paper Shader (Dithered Film Grain Noise)
 * 2. Liquid Mesh (Fluid Domain Warping & Swirl)
 * 3. Wave Mesh (Undulating Height Maps)
 * 4. Silk Shader (Specular Sheen & Iridescence)
 * 5. Stripe Mesh (Chromatic Grid Rotation)
 * 6. Liquid Cursor Follower (Interactive Mouse Displacement Buffer)
 *
 * @package Aurora
 * @version 1.2.0
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AuroraShaders = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var VERTEX_SHADER = [
        'attribute vec2 position;',
        'varying vec2 vUv;',
        'void main() {',
        '    vUv = (position + 1.0) * 0.5;',
        '    gl_Position = vec4(position, 0.0, 1.0);',
        '}'
    ].join('\n');

    // Common GLSL Noise & Utilities
    var GLSL_COMMON = [
        'precision highp float;',
        'uniform vec2 u_resolution;',
        'uniform float u_time;',
        'uniform vec2 u_mouse;',
        'uniform float u_distortion;',
        'uniform float u_swirl;',
        'uniform float u_scale;',
        'uniform float u_angle;',
        'uniform float u_grain_enable;',
        'uniform float u_grain_intensity;',
        'uniform float u_liquid_cursor;',
        'uniform float u_cursor_radius;',
        'uniform int u_stop_count;',
        'uniform vec3 u_stops[6];',
        'uniform float u_offsets[6];',
        'varying vec2 vUv;',

        'mat2 rotate2D(float angle) {',
        '    float s = sin(angle), c = cos(angle);',
        '    return mat2(c, -s, s, c);',
        '}',

        'float hash(vec2 p) {',
        '    p = fract(p * vec2(234.34, 435.345));',
        '    p += dot(p, p + 34.23);',
        '    return fract(p.x * p.y);',
        '}',

        'float noise(vec2 p) {',
        '    vec2 i = floor(p);',
        '    vec2 f = fract(p);',
        '    f = f * f * (3.0 - 2.0 * f);',
        '    float a = hash(i);',
        '    float b = hash(i + vec2(1.0, 0.0));',
        '    float c = hash(i + vec2(0.0, 1.0));',
        '    float d = hash(i + vec2(1.0, 1.0));',
        '    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);',
        '}',

        'float fbm(vec2 p) {',
        '    float val = 0.0, amp = 0.5;',
        '    mat2 rot = rotate2D(0.45);',
        '    for (int i = 0; i < 5; i++) {',
        '        val += amp * noise(p);',
        '        p = rot * p * 2.02;',
        '        amp *= 0.5;',
        '    }',
        '    return val;',
        '}',

        'vec3 sampleGradient(float t) {',
        '    t = clamp(t, 0.0, 1.0);',
        '    if (u_stop_count <= 1) return u_stops[0];',
        '    for (int i = 0; i < 5; i++) {',
        '        if (i >= u_stop_count - 1) break;',
        '        if (t >= u_offsets[i] && t <= u_offsets[i+1]) {',
        '            float factor = (t - u_offsets[i]) / max(0.001, u_offsets[i+1] - u_offsets[i]);',
        '            return mix(u_stops[i], u_stops[i+1], factor);',
        '        }',
        '    }',
        '    return u_stops[u_stop_count - 1];',
        '}',

        'vec2 applySwirl(vec2 st, float swirlAmount) {',
        '    vec2 center = vec2(0.5);',
        '    vec2 dir = st - center;',
        '    float dist = length(dir);',
        '    float angle = swirlAmount * (1.0 - dist);',
        '    return center + rotate2D(angle) * dir;',
        '}',

        'vec2 applyLiquidCursor(vec2 st) {',
        '    if (u_liquid_cursor < 0.5) return st;',
        '    vec2 mouseNorm = u_mouse / u_resolution;',
        '    vec2 dir = st - mouseNorm;',
        '    float dist = length(dir * vec2(u_resolution.x / u_resolution.y, 1.0));',
        '    float radiusNorm = u_cursor_radius / max(u_resolution.x, u_resolution.y);',
        '    if (dist < radiusNorm) {',
        '        float factor = 1.0 - smoothstep(0.0, radiusNorm, dist);',
        '        float wave = sin(dist * 25.0 - u_time * 4.0) * 0.08 * factor;',
        '        st += normalize(dir + vec2(0.001)) * wave;',
        '    }',
        '    return st;',
        '}'
    ].join('\n');

    // 1. Paper Shader (Dithered Film Grain Noise)
    var FS_PAPER = [
        GLSL_COMMON,
        'void main() {',
        '    vec2 st = (vUv - 0.5) * u_scale + 0.5;',
        '    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;',
        '    st = applyLiquidCursor(st);',
        '    if (u_swirl > 0.01) st = applySwirl(st, u_swirl * 3.14);',
        '    float distortion = fbm(st * 3.0 + vec2(u_time * 0.05)) * (u_distortion * 0.5);',
        '    float t = st.x + st.y * 0.5 + distortion;',
        '    vec3 col = sampleGradient(fract(t));',
        '    if (u_grain_enable > 0.5) {',
        '        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.25);',
        '        col += vec3(grain);',
        '    }',
        '    gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    // 2. Liquid Mesh (Fluid Domain Warping)
    var FS_LIQUID = [
        GLSL_COMMON,
        'void main() {',
        '    vec2 st = (vUv - 0.5) * u_scale + 0.5;',
        '    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;',
        '    st = applyLiquidCursor(st);',
        '    if (u_swirl > 0.01) st = applySwirl(st, u_swirl * 4.0);',
        '    vec2 q = vec2(fbm(st * 2.0 + vec2(0.0, u_time * 0.08)), fbm(st * 2.0 + vec2(1.7, u_time * 0.06)));',
        '    vec2 r = vec2(fbm(st + 2.0 * q + vec2(2.8, 5.1) + 0.1 * u_time), fbm(st + 2.0 * q + vec2(7.1, 2.4) + 0.08 * u_time));',
        '    float f = fbm(st + r * (u_distortion * 1.5));',
        '    vec3 col = sampleGradient(clamp(f, 0.0, 1.0));',
        '    if (u_grain_enable > 0.5) {',
        '        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.20);',
        '        col += vec3(grain);',
        '    }',
        '    gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    // 3. Wave Mesh (Undulating Height Maps)
    var FS_WAVE = [
        GLSL_COMMON,
        'void main() {',
        '    vec2 st = (vUv - 0.5) * u_scale + 0.5;',
        '    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;',
        '    st = applyLiquidCursor(st);',
        '    float wave1 = sin(st.x * (8.0 + u_distortion * 10.0) + u_time * 0.8) * 0.15;',
        '    float wave2 = cos(st.y * (6.0 + u_swirl * 8.0) - u_time * 0.6) * 0.15;',
        '    float t = st.y + wave1 + wave2;',
        '    vec3 col = sampleGradient(fract(t));',
        '    if (u_grain_enable > 0.5) {',
        '        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.20);',
        '        col += vec3(grain);',
        '    }',
        '    gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    // 4. Silk Shader (Specular Sheen)
    var FS_SILK = [
        GLSL_COMMON,
        'void main() {',
        '    vec2 st = (vUv - 0.5) * u_scale + 0.5;',
        '    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;',
        '    st = applyLiquidCursor(st);',
        '    float f = fbm(st * (2.0 + u_distortion * 3.0) + vec2(u_time * 0.1));',
        '    vec3 col = sampleGradient(fract(f));',
        '    float sheen = pow(abs(sin(f * 3.1415 + u_time * 0.5)), 4.0) * 0.35;',
        '    col += vec3(sheen);',
        '    if (u_grain_enable > 0.5) {',
        '        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.18);',
        '        col += vec3(grain);',
        '    }',
        '    gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    // 5. Stripe Mesh (Chromatic Stripes)
    var FS_STRIPE = [
        GLSL_COMMON,
        'void main() {',
        '    vec2 st = (vUv - 0.5) * u_scale + 0.5;',
        '    st = rotate2D(radians(u_angle)) * (st - 0.5) + 0.5;',
        '    st = applyLiquidCursor(st);',
        '    float stripe = sin(st.x * (12.0 + u_distortion * 20.0) + sin(st.y * 5.0 + u_time) * (u_swirl * 5.0) + u_time * 0.7) * 0.5 + 0.5;',
        '    vec3 col = sampleGradient(stripe);',
        '    if (u_grain_enable > 0.5) {',
        '        float grain = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * (u_grain_intensity * 0.20);',
        '        col += vec3(grain);',
        '    }',
        '    gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    return {
        VERTEX_SHADER: VERTEX_SHADER,
        FS_PAPER: FS_PAPER,
        FS_LIQUID: FS_LIQUID,
        FS_WAVE: FS_WAVE,
        FS_SILK: FS_SILK,
        FS_STRIPE: FS_STRIPE,

        getFragmentShader: function (style) {
            switch (style) {
                case 'liquid': return FS_LIQUID;
                case 'wave':   return FS_WAVE;
                case 'silk':   return FS_SILK;
                case 'stripe': return FS_STRIPE;
                case 'paper':
                default:
                    return FS_PAPER;
            }
        }
    };
}));
