var effect = {
    id: 'shiny-sweep-text',
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original || textEl.textContent || '';
        var base = getComputedStyle(textEl).color || '#ffffff';

        textEl.innerHTML = '';
        textEl.style.opacity = '1';

        var wrap = document.createElement('span');
        wrap.style.cssText = 'position:relative;display:inline-block;color:' + base + ';';

        var main = document.createElement('span');
        main.textContent = original;
        main.style.cssText = 'position:relative;';

        var shine = document.createElement('span');
        shine.textContent = original;
        shine.setAttribute('aria-hidden', 'true');
        shine.style.cssText = 'position:absolute;top:0;left:0;background-image:linear-gradient(100deg, transparent 40%, '
            + 'rgba(255,255,255,.9) 50%, transparent 60%);background-size:220% 100%;background-position:150% 0;'
            + '-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-fill-color:transparent;';

        wrap.appendChild(main);
        wrap.appendChild(shine);
        textEl.appendChild(wrap);

        fx.animate(wrap, {
            opacity: [0, 1],
            duration: Math.max(300, opts.duration),
            delay: opts.delay,
            ease: 'outQuad',
        });

        if (fx.reducedMotion) return;

        fx.animate(shine, {
            backgroundPositionX: ['150%', '-80%'],
            duration: Math.max(1600, opts.duration * 2.5),
            delay: opts.delay,
            loop: true,
            ease: 'inOutSine',
        });
    },
};

export default effect;
