var effect = {
    id: 'spinning-circular-text',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original || textEl.textContent || '';
        if (!original) return;

        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var fontSize = parseFloat(getComputedStyle(textEl).fontSize) || 24;
        var radius = Math.max(26, fontSize * 1.3);
        var size = radius * 2 + fontSize;

        var wrap = document.createElement('span');
        wrap.style.cssText = 'position:relative;display:inline-block;width:' + size + 'px;height:' + size + 'px;'
            + 'vertical-align:middle;';

        var ring = document.createElement('span');
        ring.style.cssText = 'position:absolute;inset:0;will-change:transform;';
        wrap.appendChild(ring);
        textEl.appendChild(wrap);

        if (fx.reducedMotion) {
            textEl.innerHTML = '';
            textEl.textContent = original;
            return;
        }

        // How many characters actually fit around this ring without
        // overlapping: divide the circumference by an average glyph
        // advance width instead of aiming for a fixed count, so a small
        // catalog-card font-size and a large hero font-size both read
        // cleanly instead of the same fixed count cramming or under-filling
        // very different circle sizes.
        var unit = (original + ' • ').split(' ').join('\u00A0');
        var circumference = 2 * Math.PI * radius;
        var avgCharWidth = fontSize * 0.78;
        var slotCount = Math.max(unit.length, Math.round(circumference / avgCharWidth));
        var repeated = '';
        while (repeated.length < slotCount) repeated += unit;
        var chars = repeated.slice(0, slotCount).split('');

        var step = 360 / chars.length;
        chars.forEach(function (ch, i) {
            // Two nested spans: the outer one places an anchor point at
            // `radius` px from the ring's center at this character's angle;
            // the inner one centers the glyph ON that anchor point. Without
            // the inner centering step, each glyph's own top-left corner
            // (not its middle) sits on the anchor, so wide characters are
            // pushed outward and downward by their own box size -- the
            // circle looks fine geometrically but the letters themselves
            // bunch up unevenly instead of reading cleanly around the ring.
            var slot = document.createElement('span');
            var angle = i * step;
            slot.style.cssText = 'position:absolute;left:50%;top:50%;transform-origin:0 0;'
                + 'transform:rotate(' + angle + 'deg) translateY(-' + radius + 'px);';

            var glyph = document.createElement('span');
            glyph.textContent = ch;
            glyph.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;';

            slot.appendChild(glyph);
            ring.appendChild(slot);
        });

        fx.set(wrap, { opacity: 0 });
        fx.animate(wrap, {
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: opts.delay,
            ease: 'outQuad',
        });

        fx.animate(ring, {
            rotate: [0, 360],
            duration: Math.max(4000, opts.duration * 6),
            delay: opts.delay,
            loop: true,
            ease: 'linear',
        });
    },
};

export default effect;
