var effect = {
    id: 'line-shadow-text',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original || textEl.textContent || '';
        var accent = getComputedStyle(textEl).color || '#ffffff';

        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var wrap = document.createElement('span');
        wrap.style.cssText = 'position:relative;display:inline-block;';

        var shadow = document.createElement('span');
        shadow.textContent = original;
        shadow.setAttribute('aria-hidden', 'true');
        shadow.style.cssText = 'position:absolute;top:0;left:0;z-index:0;color:transparent;'
            + '-webkit-text-stroke:1.5px ' + accent + ';text-stroke:1.5px ' + accent + ';opacity:.55;will-change:transform;';

        var main = document.createElement('span');
        main.textContent = original;
        main.style.cssText = 'position:relative;z-index:1;';

        wrap.appendChild(shadow);
        wrap.appendChild(main);
        textEl.appendChild(wrap);

        fx.animate(wrap, {
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: opts.delay,
            ease: 'outQuad',
        });

        if (fx.reducedMotion) {
            fx.set(shadow, { translateX: 6, translateY: 6 });
            return;
        }

        fx.animate(shadow, {
            translateX: [7, -7],
            translateY: [7, -7],
            duration: Math.max(1200, opts.duration * 2),
            delay: opts.delay,
            loop: true,
            alternate: true,
            ease: 'inOutSine',
        });
    },
};

export default effect;
