import { gsap } from '../../core/gsap-ref.js';
import { registerEffect } from '../../core/registry.js';

// Text Reveal Wall — rewritten against the FULL Originkit "Text Reveal
// Wall" GSAP source (pasted in full) to match its actual wall-generation
// and reveal/settle/loop algorithm, rather than the simpler one-word-per-
// row/interval-driven approximation this file used before. Ported piece
// by piece:
//
//  - measureCharWidth(): bakes a hidden probe span with the SAME computed
//    font as textEl and the reference's own alphanumeric sample string, to
//    get a real per-character cell width — used to compute charsPerLine
//    from the container's actual width instead of a hardcoded column
//    count.
//  - distributeWordsAcrossLines() + generateLineDataForWords(): the
//    reference's own two-stage placement — first spread the N words
//    evenly across an "active" line range (leaving `emptyLines`% of lines
//    empty top/bottom), then, for any line that received more than one
//    word, randomly place each word at a non-overlapping column range
//    (50 retries before giving up on a word that won't fit). This is what
//    lets one row legitimately contain several of the input words, not
//    just one.
//  - buildLineContent(): renders one row as a string of fixed-width
//    per-character <span>s — some holding a settled/resolved character of
//    a real word, some still scrambling through ALL_CHARS, some blank —
//    exactly like the reference's dangerouslySetInnerHTML string (kept as
//    literal per-char markup on purpose, to match the reference's visual
//    grid alignment exactly; this is the one place in Aurora's effects
//    that deliberately favors exact fidelity over the "cheaper technique"
//    bias used elsewhere, per this feature's explicit ask).
//  - The reveal loop itself: each line gets two GSAP tweens against a
//    plain { revealProgress, settleProgress } state object (0→1, staggered
//    by line index), whose onUpdate re-renders that line's HTML — this
//    IS how the reference does it too (gsap.to(lineState, {...})), not a
//    style substitute. When `loop` is on (always, matching the reference's
//    own default), a matching pair of REVERSE tweens (1→0) plays after a
//    hold, and a setTimeout re-triggers the whole cycle once the reverse
//    phase finishes — again a direct port of the reference's own
//    setTimeout-based restart rather than a `gsap.timeline({repeat:-1})`,
//    since the source itself manages the loop that way (its animated
//    values are on a REACT STATE object it recomputes per cycle, so a
//    single fixed-length repeating timeline wouldn't have been equivalent
//    even in the original).
//
// Two deliberate adaptations for Aurora's own conventions (both called out
// since "exatamente igual" was requested for everything else):
//  - `emptyLines` (padding at top/bottom, reference default 4 meaning 4%)
//    and the hold duration between reveal and reverse (reference default
//    transition.delay = 1s) are fixed constants, not new PHP controls —
//    Aurora reuses its existing Duration/Stagger/Initial-delay controls for
//    the reveal timing/per-line stagger/entrance gate instead of adding
//    reference-specific props no other effect has.
//  - `words` comes from splitting the widget's own Text Animation string on
//    whitespace (Aurora widgets configure one text string, not an array
//    prop) — already the previous version's approach, kept as-is.
//
// Self-managed: builds its own multi-row character grid instead of using
// the generic split `units`.
var ALL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
var EMPTY_LINES_PERCENT = 4;
var HOLD_DURATION = 1; // seconds — reference's default transition.delay

function mapValue(value, inMin, inMax, outMin, outMax) {
    if (value <= inMin) return outMin;
    if (value >= inMax) return outMax;
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function measureCharWidth(cs) {
    var probe = document.createElement('span');
    probe.textContent = ALL_CHARS;
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;line-height:1;padding:0;margin:0;top:-9999px;left:-9999px;';
    probe.style.fontFamily = cs.fontFamily;
    probe.style.fontSize = cs.fontSize;
    probe.style.fontWeight = cs.fontWeight;
    probe.style.fontStyle = cs.fontStyle;
    probe.style.letterSpacing = cs.letterSpacing;
    document.body.appendChild(probe);
    var w = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);
    return (w / ALL_CHARS.length) || (parseFloat(cs.fontSize) * 0.6) || 10;
}

function distributeWordsAcrossLines(words, numLines) {
    var emptyLineCount = Math.floor((EMPTY_LINES_PERCENT / 100) * numLines);
    var startLine = emptyLineCount;
    var endLine = numLines - emptyLineCount;
    var availableLines = Math.max(0, endLine - startLine);
    var wordsPerLine = [];
    for (var i = 0; i < numLines; i++) wordsPerLine.push([]);
    if (availableLines <= 0) return wordsPerLine;
    var numWords = words.length;
    words.forEach(function (word, wordIndex) {
        var targetLine;
        if (numWords === 1) {
            targetLine = startLine + Math.floor(availableLines / 2);
        } else {
            targetLine = startLine + Math.floor((wordIndex * (availableLines - 1)) / (numWords - 1));
        }
        var clamped = Math.max(startLine, Math.min(endLine - 1, targetLine));
        wordsPerLine[clamped].push(word);
    });
    return wordsPerLine;
}

function generateLineDataForWords(wordsForLine, totalChars) {
    var wordPositions = [];
    var usedRanges = [];
    wordsForLine.forEach(function (word) {
        var wordLen = word.length;
        if (wordLen >= totalChars) return;
        var placed = false;
        var attempts = 0;
        while (!placed && attempts < 50) {
            var maxStart = totalChars - wordLen;
            if (maxStart < 0) break;
            var start = Math.floor(Math.random() * (maxStart + 1));
            var end = start + wordLen;
            var overlaps = usedRanges.some(function (u) {
                return (start >= u.start && start < u.end) || (end > u.start && end <= u.end) || (start <= u.start && end >= u.end);
            });
            if (!overlaps) {
                wordPositions.push({ word: word, start: start, end: end });
                usedRanges.push({ start: start, end: end });
                placed = true;
            }
            attempts++;
        }
    });
    wordPositions.sort(function (a, b) { return a.start - b.start; });
    return wordPositions;
}

function wordAt(wordPositions, i) {
    for (var w = 0; w < wordPositions.length; w++) {
        if (i >= wordPositions[w].start && i < wordPositions[w].end) return wordPositions[w];
    }
    return null;
}

function buildLineContent(wordPositions, totalChars, revealProgress, settleProgress, reverseLine, cellWidth, wordsColor, textColor) {
    var numChars = Math.floor(mapValue(revealProgress, 0, 1, 0, totalChars));
    var settledChars = Math.floor(mapValue(settleProgress, 0, 1, 0, totalChars));
    var cellStyle = 'display:inline-block;width:' + cellWidth + 'px;text-align:center;';
    function isVisible(i) { return reverseLine ? i >= totalChars - numChars : i < numChars; }
    function isSettled(i) { return reverseLine ? i >= totalChars - settledChars : i < settledChars; }
    var html = '';
    var i = 0;
    while (i < totalChars) {
        var word = wordAt(wordPositions, i);
        if (word && isVisible(i)) {
            var end = i, text = '';
            while (end < word.end && isVisible(end)) { text += word.word[end - word.start]; end++; }
            var width = (end - i) * cellWidth;
            html += '<span style="display:inline-block;width:' + width + 'px;white-space:pre;text-align:' + (reverseLine ? 'right' : 'left') + ';color:' + wordsColor + ';">' + escapeHtml(text) + '</span>';
            i = end;
            continue;
        }
        if (!isVisible(i)) {
            html += '<span style="' + cellStyle + '">&nbsp;</span>';
            i++;
            continue;
        }
        var ch = isSettled(i) ? ' ' : ALL_CHARS[Math.floor(Math.random() * ALL_CHARS.length)];
        html += '<span style="' + cellStyle + 'color:' + textColor + ';">' + escapeHtml(ch) + '</span>';
        i++;
    }
    return html;
}

var effect = {
    id: 'gs-30',
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = (textEl._auroraOriginal || textEl.innerText || '').trim();
        var words = original.split(/\s+/).filter(Boolean);
        if (!words.length) return;

        if (textEl._auroraRevealWall) {
            textEl._auroraRevealWall.cleanup();
            textEl._auroraRevealWall = null;
        }

        var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        var reverseLine = true; // reference default `reverse: true` — right-to-left fill

        var wordsColor = getComputedStyle(textEl).color || 'rgb(255, 255, 255)';
        var cm = wordsColor.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
        var textColor = cm ? 'rgba(' + cm[1] + ', ' + cm[2] + ', ' + cm[3] + ', 0.55)' : 'rgba(255,255,255,0.55)';

        var resizeTimer = null;
        var tweens = [];
        var loopTimeout = null;
        var startTimer = null;
        var paused = false;
        var rowEls = [];

        function teardown() {
            clearTimeout(loopTimeout);
            clearTimeout(startTimer);
            loopTimeout = null;
            startTimer = null;
            tweens.forEach(function (t) { t.kill(); });
            tweens = [];
            rowEls = [];
        }

        function build() {
            teardown();

            var rect = textEl.getBoundingClientRect();
            var containerWidth = Math.max(40, rect.width || textEl.offsetWidth || 300);
            var cs = getComputedStyle(textEl);
            var charWidth = measureCharWidth(cs);
            var COLS = Math.max(20, Math.min(160, Math.floor(containerWidth / charWidth)));
            var cellWidth = containerWidth / COLS;

            var ROWS = Math.max(8, Math.min(28, words.length + 8));

            textEl.innerHTML = '';
            textEl.style.opacity = '1';
            textEl.style.fontVariantNumeric = 'tabular-nums';

            var wordsPerLine = distributeWordsAcrossLines(words, ROWS);
            var linesData = wordsPerLine.map(function (lineWords) {
                return generateLineDataForWords(lineWords, COLS);
            });

            for (var ri = 0; ri < ROWS; ri++) {
                var rowEl = document.createElement('div');
                rowEl.style.cssText = 'white-space:pre;';
                textEl.appendChild(rowEl);
                rowEls.push(rowEl);
            }

            var lineStates = linesData.map(function () { return { revealProgress: 0, settleProgress: 0 }; });

            function updateLine(index) {
                rowEls[index].innerHTML = buildLineContent(
                    linesData[index], COLS,
                    lineStates[index].revealProgress,
                    lineStates[index].settleProgress,
                    reverseLine, cellWidth, wordsColor, textColor
                );
            }

            if (reducedMotion) {
                linesData.forEach(function (_, index) {
                    lineStates[index].revealProgress = 1;
                    lineStates[index].settleProgress = 1;
                    updateLine(index);
                });
                return;
            }

            // Initial scrambled frame before the first cycle starts.
            linesData.forEach(function (_, index) { updateLine(index); });

            var duration = Math.max(0.3, opts.duration / 1000);
            var stagger = Math.max(0.02, opts.stagger / 1000);
            var ease = 'power1.inOut'; // approximation of the reference's default "easeInOut"

            function runAnimationCycle() {
                var phaseOffset = duration * 0.5;
                var lastLineDelay = (ROWS - 1) * stagger;
                var totalPhaseTime = lastLineDelay + phaseOffset + duration;

                linesData.forEach(function (_, index) {
                    var lineDelay = index * stagger;
                    tweens.push(gsap.to(lineStates[index], {
                        revealProgress: 1, duration: duration, delay: lineDelay, ease: ease,
                        onUpdate: function () { updateLine(index); },
                    }));
                    tweens.push(gsap.to(lineStates[index], {
                        settleProgress: 1, duration: duration, delay: lineDelay + phaseOffset, ease: ease,
                        onUpdate: function () { updateLine(index); },
                    }));
                });

                var reverseStartDelay = totalPhaseTime + HOLD_DURATION;
                linesData.forEach(function (_, index) {
                    var lineDelay = index * stagger;
                    tweens.push(gsap.to(lineStates[index], {
                        settleProgress: 0, duration: duration, delay: reverseStartDelay + lineDelay, ease: ease,
                        onUpdate: function () { updateLine(index); },
                    }));
                    tweens.push(gsap.to(lineStates[index], {
                        revealProgress: 0, duration: duration, delay: reverseStartDelay + lineDelay + phaseOffset, ease: ease,
                        onUpdate: function () { updateLine(index); },
                    }));
                });

                var totalCycleTime = (totalPhaseTime + HOLD_DURATION) * 2;
                scheduleRestart(totalCycleTime * 1000);
            }

            function scheduleRestart(ms) {
                loopTimeout = setTimeout(function restart() {
                    if (paused) {
                        loopTimeout = setTimeout(restart, 300);
                        return;
                    }
                    lineStates.forEach(function (s) { s.revealProgress = 0; s.settleProgress = 0; });
                    tweens.forEach(function (t) { t.kill(); });
                    tweens = [];
                    runAnimationCycle();
                }, ms);
            }

            startTimer = setTimeout(runAnimationCycle, opts.delay);
        }

        build();

        function onResize() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(build, 150);
        }
        window.addEventListener('resize', onResize);

        var io = null;
        if (!reducedMotion) {
            io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    paused = !entry.isIntersecting;
                    tweens.forEach(function (t) { paused ? t.pause() : t.play(); });
                });
            }, { threshold: 0.01 });
            io.observe(textEl);
        }

        textEl._auroraRevealWall = {
            cleanup: function () {
                clearTimeout(resizeTimer);
                window.removeEventListener('resize', onResize);
                if (io) io.disconnect();
                teardown();
            },
        };
    },
};

registerEffect(effect);
export default effect;
