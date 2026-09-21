var effect = {
    id: 'echo-clone',
    // Each letter is cloned through splitText()'s clone option for an
    // echo/depth effect; splits the DOM itself.
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        textEl.style.opacity = '1';
        var split = fx.resplit(textEl, { chars: { wrap: 'clip', clone: 'bottom' } });
        fx.animate(split.chars, {
            translateY: ['-100%', '0%'],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

export default effect;
