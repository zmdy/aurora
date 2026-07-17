/**
 * Aurora for Elementor — Showcase / Landing Page
 * "Orb" hero variant — an interactive gradient animation covering the
 * FULL section background (soft ambient drift everywhere, a brighter
 * concentrated glow toward the right), plus a cursor-follow glow dot
 * near the floating module card. The dot is a lightweight, hand-rolled
 * stand-in for the plugin's own Cursor Follow module — kept independent
 * (no dependency on the real plugin bundle loaded later in the page)
 * since it's purely decorative chrome around the actual demos in the
 * Effects Showcase section.
 */
(function () {
    'use strict';

    var section = document.getElementById('hero-orb');
    if (!section) return;

    var canvas = document.getElementById('aurora-orb-canvas');
    var orbStage = section.querySelector('.aurora-orb-stage');
    var dot = section.querySelector('.aurora-cursor-dot');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;

    /* Mouse position normalized against the whole SECTION. */
    var target = { x: 0.72, y: 0.42 };
    var mouse = { x: 0.72, y: 0.42 };
    var inside = false;

    var dotPos = { x: 0, y: 0 };
    var dotInit = false;

    /* Soft ambient blobs drifting across the full background, echoing
       the aurora borealis canvas used in the original hero. */
    var blobs = [
        { color: 'rgba(124, 92, 255, 0.35)', rx: 0.30, ry: 0.35, sx: 0.20, sy: 0.30, speed: 0.5, phase: 0.6 },
        { color: 'rgba(34, 211, 238, 0.28)', rx: 0.34, ry: 0.30, sx: 0.55, sy: 0.65, speed: 0.4, phase: 2.4 },
        { color: 'rgba(57, 255, 180, 0.22)', rx: 0.26, ry: 0.28, sx: 0.10, sy: 0.75, speed: 0.6, phase: 4.1 }
    ];

    function resize() {
        if (!canvas) return;
        w = section.offsetWidth;
        h = section.offsetHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onMove(clientX, clientY) {
        var rect = section.getBoundingClientRect();
        target.x = (clientX - rect.left) / rect.width;
        target.y = (clientY - rect.top) / rect.height;
        inside = true;
    }

    section.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
    section.addEventListener('mouseleave', function () { inside = false; });
    section.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches[0]) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('resize', resize);
    resize();

    function drawBackground(t) {
        if (!ctx || w <= 0 || h <= 0) return;
        ctx.clearRect(0, 0, w, h);

        /* Ambient ellipses across the whole section. */
        blobs.forEach(function (b) {
            var driftX = Math.sin(t * b.speed + b.phase) * 0.06;
            var driftY = Math.cos(t * b.speed * 0.8 + b.phase) * 0.05;
            var cx = (b.sx + driftX) * w;
            var cy = (b.sy + driftY) * h;
            var r = Math.max(b.rx * w, b.ry * h);

            var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            g.addColorStop(0, b.color);
            g.addColorStop(1, 'rgba(5, 6, 15, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });

        /* The bright "orb" concentration, biased to the right and
           reacting to the cursor across the full section. */
        var cx = w * 0.74;
        var cy = h * 0.46;
        var r = Math.min(w, h) * 0.5;
        if (r <= 0) return;

        var hlx = cx + (mouse.x - 0.74) * r * 0.9 + Math.sin(t * 0.6) * r * 0.04;
        var hly = cy + (mouse.y - 0.46) * r * 0.9 + Math.cos(t * 0.5) * r * 0.04;

        var og = ctx.createRadialGradient(hlx, hly, 0, cx, cy, r);
        og.addColorStop(0, 'rgba(124, 92, 255, 0.85)');
        og.addColorStop(0.35, 'rgba(34, 211, 238, 0.5)');
        og.addColorStop(0.7, 'rgba(57, 255, 180, 0.15)');
        og.addColorStop(1, 'rgba(5, 6, 15, 0)');

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = og;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();
    }

    function positionDot(t) {
        if (!dot || !orbStage) return;

        var sectionRect = section.getBoundingClientRect();
        var stageRect = orbStage.getBoundingClientRect();
        var offsetX = stageRect.left - sectionRect.left;
        var offsetY = stageRect.top - sectionRect.top;

        var idleX = 0.8 * stageRect.width + Math.sin(t * 0.7) * 14;
        var idleY = 0.16 * stageRect.height + Math.cos(t * 0.6) * 10;

        var dx = inside ? (target.x * w - offsetX) : idleX;
        var dy = inside ? (target.y * h - offsetY) : idleY;

        /* Keep the dot roughly within the stage bounds. */
        dx = Math.max(0, Math.min(stageRect.width, dx));
        dy = Math.max(0, Math.min(stageRect.height, dy));

        if (!dotInit) {
            dotPos.x = dx;
            dotPos.y = dy;
            dotInit = true;
        }

        dotPos.x += (dx - dotPos.x) * 0.12;
        dotPos.y += (dy - dotPos.y) * 0.12;
        dot.style.transform = 'translate3d(' + dotPos.x + 'px,' + dotPos.y + 'px,0)';
    }

    if (reduceMotion) {
        drawBackground(0);
        if (dot) dot.style.display = 'none';
        return;
    }

    var t = 0;

    function loop() {
        t += 0.008;
        mouse.x += (target.x - mouse.x) * 0.04;
        mouse.y += (target.y - mouse.y) * 0.04;
        drawBackground(t);
        positionDot(t);
        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
})();
