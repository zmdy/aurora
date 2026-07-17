/**
 * Aurora for Elementor — Showcase / Landing Page
 *
 * Interactive aurora-borealis-style hero background: a handful of soft,
 * blurred color blobs (teal / green / violet, echoing the northern-lights
 * reference video) drifting on independent sine paths and gently pulled
 * toward the cursor. Self-contained — no dependency on GSAP/Anime.js or
 * any other script on the page, since it's purely decorative chrome
 * around the actual Aurora plugin demos (see the Effects Showcase section
 * below, which runs the real plugin code instead).
 */
(function () {
    'use strict';

    var canvas = document.getElementById('aurora-canvas');
    if (!canvas || !canvas.getContext) return;

    var ctx = canvas.getContext('2d');
    var stage = canvas.parentElement;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;

    var mouse = { x: 0.5, y: 0.32 };
    var target = { x: 0.5, y: 0.32 };

    var blobs = [
        { color: 'rgba(57, 255, 180, 0.55)', r: 0.55, sx: 0.28, sy: 0.32, speed: 0.55, phase: 0.0, pull: 0.16 },
        { color: 'rgba(34, 211, 238, 0.42)', r: 0.62, sx: 0.72, sy: 0.28, speed: 0.42, phase: 2.1, pull: -0.14 },
        { color: 'rgba(168, 85, 247, 0.42)', r: 0.50, sx: 0.55, sy: 0.75, speed: 0.38, phase: 4.2, pull: 0.20 },
        { color: 'rgba(57, 130, 246, 0.32)', r: 0.46, sx: 0.18, sy: 0.78, speed: 0.65, phase: 1.4, pull: -0.10 },
    ];

    function resize() {
        w = stage.offsetWidth;
        h = stage.offsetHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMove(clientX, clientY) {
        var rect = stage.getBoundingClientRect();
        target.x = (clientX - rect.left) / rect.width;
        target.y = (clientY - rect.top) / rect.height;
    }

    stage.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
    stage.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('resize', resize);
    resize();

    function drawStatic() {
        // Reduced-motion fallback: a single still frame, no rAF loop.
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#05060f';
        ctx.fillRect(0, 0, w, h);
        blobs.forEach(function (b) {
            var cx = b.sx * w;
            var cy = b.sy * h;
            var r = b.r * Math.max(w, h);
            var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, b.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });
    }

    if (reduceMotion) {
        drawStatic();
        return;
    }

    var t = 0;

    function draw() {
        t += 0.006;
        mouse.x += (target.x - mouse.x) * 0.03;
        mouse.y += (target.y - mouse.y) * 0.03;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#05060f';
        ctx.fillRect(0, 0, w, h);

        blobs.forEach(function (b) {
            var driftX = Math.sin(t * b.speed + b.phase) * 0.12;
            var driftY = Math.cos(t * b.speed * 0.8 + b.phase) * 0.10;
            var cx = (b.sx + driftX + (mouse.x - 0.5) * b.pull) * w;
            var cy = (b.sy + driftY + (mouse.y - 0.5) * b.pull) * h;
            var r = b.r * Math.max(w, h);

            var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, b.color);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });

        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
})();
