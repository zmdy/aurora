var effect = {
    id: 'text-highlighter',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original || textEl.textContent || '';

        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var wrap = document.createElement('span');
        wrap.style.cssText = 'position:relative;display:inline-block;padding:0 .1em;';

        var color = opts.highlightColor || '#facc15';

        var mark = document.createElement('span');
        mark.setAttribute('aria-hidden', 'true');
        mark.style.cssText = 'position:absolute;left:-2%;right:-2%;top:12%;bottom:8%;z-index:0;'
            + 'background:color-mix(in srgb, ' + color + ' 55%, transparent);border-radius:2px 9px 3px 8px;transform:scaleX(0) rotate(-1deg);'
            + 'transform-origin:0% 50%;';

        var label = document.createElement('span');
        label.textContent = original;
        label.style.cssText = 'position:relative;z-index:1;';

        wrap.appendChild(mark);
        wrap.appendChild(label);
        textEl.appendChild(wrap);

        if (fx.reducedMotion) {
            fx.set(mark, { scaleX: 1, rotate: '-1deg' });
            return;
        }

        fx.animate(mark, {
            scaleX: [0, 1],
            duration: Math.max(400, opts.duration),
            delay: opts.delay,
            ease: 'inOutQuad',
        });
    },
};

export default effect;
