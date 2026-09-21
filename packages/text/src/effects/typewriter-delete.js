var effect = {
    id: 'typewriter-delete',
    // Types the full text out, pauses, deletes it back down to nothing,
    // then retypes it — the classic "hero tagline" flourish. One-shot,
    // hand-rolled with timers since it rebuilds the string character by
    // character.
    selfManaged: true,
    run: function (units, opts, textEl, fx) {
        var original = fx.original;
        textEl.innerHTML = '';
        textEl.style.opacity = '1';
        textEl.textContent = '';


        var typeSpeed = Math.max(20, Math.min(90, opts.duration / Math.max(1, original.length)));
        var deleteSpeed = typeSpeed * 0.6;
        var pauseAfterType = 900;

        var safeTimeout = fx.setTimeout;
        var safeInterval = fx.setInterval;

        safeTimeout(function () {
            var i = 0;
            var typeHandle = safeInterval(function () {
                i++;
                textEl.textContent = original.slice(0, i);
                if (i >= original.length) {
                    fx.clearInterval(typeHandle);
                    safeTimeout(function () {
                        var j = original.length;
                        var deleteHandle = safeInterval(function () {
                            j--;
                            textEl.textContent = original.slice(0, j);
                            if (j <= 0) {
                                fx.clearInterval(deleteHandle);
                                safeTimeout(function () {
                                    var k = 0;
                                    var retypeHandle = safeInterval(function () {
                                        k++;
                                        textEl.textContent = original.slice(0, k);
                                        if (k >= original.length) fx.clearInterval(retypeHandle);
                                    }, typeSpeed);
                                }, 250);
                            }
                        }, deleteSpeed);
                    }, pauseAfterType);
                }
            }, typeSpeed);
        }, opts.delay);
    },
};

export default effect;
