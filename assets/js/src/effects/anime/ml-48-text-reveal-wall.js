import { anime } from '../../core/anime-ref.js';
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-30 Text Reveal Wall — identical wall-generation
// algorithm (measureCharWidth/distributeWordsAcrossLines/
// generateLineDataForWords/buildLineContent, see gs-30's header comment
// for the full rationale), with anime.animate() driving each line's
// { revealProgress, settleProgress } state instead of gsap.to().
var ALL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
var EMPTY_LINES_PERCENT = 4;
var HOLD_DURATION = 1000; // ms — reference's default transition.delay (1s)

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
    id: 'ml-48',
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
        var reverseLine = true;

        var wordsColor = getComputedStyle(textEl).color || 'rgb(255, 255, 255)';
        var cm = wordsColor.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
        var textColor = cm ? 'rgba(' + cm[1] + ', ' + cm[2] + ', ' + cm[3] + ', 0.55)' : 'rgba(255,255,255,0.55)';

        var resizeTimer = null;
        var anims = [];
        var loopTimeout = null;
        var startTimer = null;
        var paused = false;
        var rowEls = [];

        function teardown() {
            clearTimeout(loopTimeout);
            clearTimeout(startTimer);
            loopTimeout = null;
            startTimer = null;
            anims.forEach(function (a) { if (typeof a.pause === 'function') a.pause(); });
            anims = [];
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

            linesData.forEach(function (_, index) { updateLine(index); });

            var duration = Math.max(300, opts.duration);
            var stagger = Math.max(20, opts.stagger);
            var ease = 'inOutQuad'; // approximation of the reference's default "easeInOut"

            function runAnimationCycle() {
                var phaseOffset = duration * 0.5;
                var lastLineDelay = (ROWS - 1) * stagger;
                var totalPhaseTime = lastLineDelay + phaseOffset + duration;
                var reverseStartDelay = totalPhaseTime + HOLD_DURATION;

                // One shared timeline for the whole cycle, not one
                // independent anime.animate() per phase. Anime.js v4
                // resolves competing animations on the SAME property by
                // composition at creation time — revealProgress (and
                // settleProgress) each get animated to 1 and later back to
                // 0 on the very same lineStates[index] object, and since
                // every phase here was scheduled synchronously in this one
                // function, the later-created call was winning the
                // property from t=0, silently cancelling the earlier one.
                // That's why lines never actually revealed. A single
                // timeline with absolute-position add() calls sequences
                // them correctly instead, the same way gs-30's GSAP
                // timeline does.
                var tl = anime.createTimeline();

                linesData.forEach(function (_, index) {
                    var lineDelay = index * stagger;
                    tl.add(lineStates[index], {
                        revealProgress: 1, duration: duration, ease: ease,
                        onUpdate: function () { updateLine(index); },
                    }, lineDelay);
                    tl.add(lineStates[index], {
                        settleProgress: 1, duration: duration, ease: ease,
                        onUpdate: function () { updateLine(index); },
                    }, lineDelay + phaseOffset);
                });

                linesData.forEach(function (_, index) {
                    var lineDelay = index * stagger;
                    tl.add(lineStates[index], {
                        settleProgress: 0, duration: duration, ease: ease,
                        onUpdate: function () { updateLine(index); },
                    }, reverseStartDelay + lineDelay);
                    tl.add(lineStates[index], {
                        revealProgress: 0, duration: duration, ease: ease,
                        onUpdate: function () { updateLine(index); },
                    }, reverseStartDelay + lineDelay + phaseOffset);
                });

                anims.push(tl);

                var totalCycleTime = (totalPhaseTime + HOLD_DURATION) * 2;
                scheduleRestart(totalCycleTime);
            }

            function scheduleRestart(ms) {
                loopTimeout = setTimeout(function restart() {
                    if (paused) {
                        loopTimeout = setTimeout(restart, 300);
                        return;
                    }
                    lineStates.forEach(function (s) { s.revealProgress = 0; s.settleProgress = 0; });
                    anims.forEach(function (a) { if (typeof a.pause === 'function') a.pause(); });
                    anims = [];
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
                    anims.forEach(function (a) {
                        if (paused && typeof a.pause === 'function') a.pause();
                        else if (!paused && typeof a.play === 'function') a.play();
                    });
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
