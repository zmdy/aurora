/**
 * Aurora for Elementor — Frontend: Animações de Texto
 *
 * Suporta 20 animações (10 GSAP + 10 Anime.js) com split por letras,
 * palavras ou linhas, disparadas por IntersectionObserver ou page load.
 *
 * @package Aurora
 * @version 1.0.0
 */

/* global gsap, anime, elementorFrontend, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // ─────────────────────────────────────────────────────────────────────────
    // UTILIDADES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retorna o primeiro elemento de texto significativo dentro do wrapper
     * (respeita seletores nativos do Elementor).
     *
     * @param {HTMLElement} wrapper
     * @returns {HTMLElement}
     */
    function getTextTarget(wrapper) {
        var selectors = [
            '.elementor-heading-title',
            '.elementor-text-editor > *:first-child',
            '.elementor-button-text',
            '.elementor-counter-number',
            '.elementor-price-table__heading',
            '.elementor-widget-container > h1',
            '.elementor-widget-container > h2',
            '.elementor-widget-container > h3',
            '.elementor-widget-container > h4',
            '.elementor-widget-container > h5',
            '.elementor-widget-container > h6',
            '.elementor-widget-container > p',
        ];

        for (var i = 0; i < selectors.length; i++) {
            var el = wrapper.querySelector(selectors[i]);
            if (el && el.innerText && el.innerText.trim()) return el;
        }
        return wrapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEXT SPLITTER
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Divide o elemento em spans por caractere.
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement[]}
     */
    function splitIntoChars(el) {
        var text = el.innerText || el.textContent;
        el.setAttribute('aria-label', text);

        var words  = text.split(' ');
        var chars  = [];
        el.innerHTML = '';

        words.forEach(function (word, wi) {
            var wordWrap       = document.createElement('span');
            wordWrap.style.cssText = 'display:inline-block;white-space:nowrap;';
            wordWrap.setAttribute('aria-hidden', 'true');

            Array.from(word).forEach(function (char) {
                var span           = document.createElement('span');
                span.className     = 'aurora-char';
                span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
                span.textContent   = char;
                wordWrap.appendChild(span);
                chars.push(span);
            });

            el.appendChild(wordWrap);

            if (wi < words.length - 1) {
                // non-breaking space between words to preserve spacing
                var space = document.createElement('span');
                space.style.display = 'inline-block';
                space.innerHTML = '&nbsp;';
                el.appendChild(space);
            }
        });

        return chars;
    }

    /**
     * Divide o elemento em spans por palavra.
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement[]}
     */
    function splitIntoWords(el) {
        var text = el.innerText || el.textContent;
        el.setAttribute('aria-label', text);
        el.innerHTML = '';

        return text.split(/\s+/).filter(Boolean).map(function (word, i, arr) {
            var span           = document.createElement('span');
            span.className     = 'aurora-word';
            span.style.cssText = 'display:inline-block;will-change:transform,opacity;';
            span.setAttribute('aria-hidden', 'true');
            span.textContent   = word + (i < arr.length - 1 ? '\u00a0' : '');
            el.appendChild(span);
            return span;
        });
    }

    /**
     * Divide o elemento em spans por linha (mede offsetTop para agrupar).
     *
     * @param {HTMLElement} el
     * @returns {HTMLElement[]}
     */
    function splitIntoLines(el) {
        var text = el.innerText || el.textContent;
        el.setAttribute('aria-label', text);

        // Etapa 1: criar word spans temporários para medir quebra de linha
        var words = text.split(/\s+/).filter(Boolean);
        el.innerHTML = '';

        var wordSpans = words.map(function (word, i, arr) {
            var span       = document.createElement('span');
            span.style.cssText = 'display:inline-block;';
            span.textContent = word + (i < arr.length - 1 ? '\u00a0' : '');
            el.appendChild(span);
            return span;
        });

        // Etapa 2: agrupar por offsetTop
        var lineMap = {};
        wordSpans.forEach(function (span) {
            var top = Math.round(span.getBoundingClientRect().top);
            if (!lineMap[top]) lineMap[top] = [];
            lineMap[top].push(span);
        });

        // Etapa 3: reconstruir com wrappers de linha
        el.innerHTML = '';
        var lines = [];

        Object.keys(lineMap).sort(function (a, b) { return a - b; }).forEach(function (top) {
            var lineWrap       = document.createElement('div');
            lineWrap.style.cssText = 'overflow:hidden;display:block;';
            lineWrap.className = 'aurora-line-wrap';

            var lineInner       = document.createElement('div');
            lineInner.style.cssText = 'display:inline-block;will-change:transform,opacity;';
            lineInner.className = 'aurora-line';
            lineInner.setAttribute('aria-hidden', 'true');

            lineMap[top].forEach(function (s) { lineInner.appendChild(s); });
            lineWrap.appendChild(lineInner);
            el.appendChild(lineWrap);
            lines.push(lineInner);
        });

        return lines;
    }

    /**
     * Despacha o split correto de acordo com `by`.
     *
     * @param {HTMLElement} el
     * @param {string} by  'chars' | 'words' | 'lines'
     * @returns {HTMLElement[]}
     */
    function splitText(el, by) {
        switch (by) {
            case 'words': return splitIntoWords(el);
            case 'lines': return splitIntoLines(el);
            default:      return splitIntoChars(el);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EFEITO SCRAMBLE (implementação open-source)
    // ─────────────────────────────────────────────────────────────────────────

    var SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&';

    /**
     * Anima o texto de um elemento com efeito scramble/hacker.
     *
     * @param {HTMLElement} el
     * @param {string}      finalText
     * @param {number}      duration   ms
     * @param {number}      delay      ms
     */
    function scrambleTextEffect(el, finalText, duration, delay) {
        el.style.opacity = '1';
        el.style.fontVariantNumeric = 'tabular-nums';

        setTimeout(function () {
            var steps   = Math.max(10, Math.floor(duration / 40));
            var step    = 0;
            var handle  = setInterval(function () {
                var progress = step / steps;
                var output   = '';
                for (var i = 0; i < finalText.length; i++) {
                    if (finalText[i] === ' ') {
                        output += ' ';
                    } else if (i / finalText.length < progress) {
                        output += finalText[i];
                    } else {
                        output += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                    }
                }
                el.textContent = output;
                step++;
                if (step > steps) {
                    clearInterval(handle);
                    el.textContent = finalText;
                }
            }, 40);
        }, delay);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANIMAÇÕES GSAP  (gs-1 … gs-10)
    // ─────────────────────────────────────────────────────────────────────────

    var gsapAnimations = {

        // gs-1 — Fade Up
        'gs-1': function (units, opts) {
            gsap.fromTo(units,
                { y: 60, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : 0,
                    opacity  : 1,
                    ease     : 'power3.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-2 — Clip Reveal (sobe de baixo, mascarado)
        'gs-2': function (units, opts) {
            units.forEach(function (u) {
                u.parentElement.style.overflow = 'hidden';
                u.style.display = 'inline-block';
            });
            gsap.fromTo(units,
                { y: '110%', opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : '0%',
                    opacity  : 1,
                    ease     : 'power4.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-3 — Scramble Text  (opera no elemento-pai, não nos units)
        'gs-3': function (units, opts, textEl) {
            var original = textEl._auroraOriginal || textEl.innerText;
            textEl.style.opacity = '0';
            // Restore the element (removes split)
            textEl.innerHTML = '';
            textEl.textContent = original;
            scrambleTextEffect(textEl, original, opts.duration, opts.delay);
        },

        // gs-4 — Elastic Bounce
        'gs-4': function (units, opts) {
            gsap.fromTo(units,
                { y: 60, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : 0,
                    opacity  : 1,
                    ease     : 'elastic.out(1, 0.4)',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-5 — 3D Flip Y
        'gs-5': function (units, opts) {
            gsap.set(units, { transformPerspective: 600 });
            gsap.fromTo(units,
                { rotationY: 90, opacity: 0 },
                {
                    duration  : opts.duration / 1000,
                    delay     : opts.delay / 1000,
                    rotationY : 0,
                    opacity   : 1,
                    ease      : 'power3.out',
                    stagger   : opts.stagger / 1000,
                }
            );
        },

        // gs-6 — Slide In (from left)
        'gs-6': function (units, opts) {
            gsap.fromTo(units,
                { x: -80, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    x        : 0,
                    opacity  : 1,
                    ease     : 'power3.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-7 — Scale Up
        'gs-7': function (units, opts) {
            gsap.fromTo(units,
                { scale: 0, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    scale    : 1,
                    opacity  : 1,
                    ease     : 'back.out(1.7)',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-8 — Wave (deslocamento Y senoidal por índice)
        'gs-8': function (units, opts) {
            gsap.fromTo(units,
                { y: function (i) { return Math.sin(i * 0.9) * 45; }, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : 0,
                    opacity  : 1,
                    ease     : 'power2.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-9 — Bounce Drop (cai de cima com bounce)
        'gs-9': function (units, opts) {
            gsap.fromTo(units,
                { y: -80, opacity: 0 },
                {
                    duration : opts.duration / 1000,
                    delay    : opts.delay / 1000,
                    y        : 0,
                    opacity  : 1,
                    ease     : 'bounce.out',
                    stagger  : opts.stagger / 1000,
                }
            );
        },

        // gs-10 — Glitch (sacudidas rápidas + estabiliza)
        'gs-10': function (units, opts) {
            var tl = gsap.timeline({ delay: opts.delay / 1000 });

            tl.set(units, { opacity: 0 })
              .to(units, {
                  duration : 0.04,
                  opacity  : 1,
                  x        : function () { return (Math.random() - 0.5) * 30; },
                  stagger  : opts.stagger / 1000,
              })
              .to(units, {
                  duration : 0.04,
                  x        : function () { return (Math.random() - 0.5) * 15; },
              })
              .to(units, {
                  duration : 0.04,
                  x        : function () { return (Math.random() - 0.5) * 8; },
              })
              .to(units, {
                  duration : opts.duration / 1000 * 0.6,
                  x        : 0,
                  ease     : 'power2.out',
              });
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // ANIMAÇÕES ANIME.JS v4  (ml-1 … ml-14)
    // ─────────────────────────────────────────────────────────────────────────
    //
    // v3 → v4: `anime({targets, ...})` tornou-se `anime.animate(targets, {...})`,
    // `easing` foi renomeado para `ease` e os nomes de easing perderam o
    // prefixo "ease" (easeOutExpo → outExpo). Callbacks de delay no formato
    // function(el, i) continuam compatíveis sem alterações.
    //
    // ml-11 … ml-14 usam as novas APIs nativas de texto do Anime.js v4
    // (anime.splitText() e anime.scrambleText()) e por isso são "self-managed"
    // (ver SELF_MANAGED_ANIMATIONS): fazem seu próprio split/scramble em
    // textEl em vez de usar os `units` genéricos pré-divididos pelo splitText()
    // deste arquivo.

    /**
     * (Re)executa o split nativo do Anime.js v4, revertendo qualquer split
     * anterior do mesmo elemento antes de dividir de novo. Necessário para
     * suportar "Repetir ao re-entrar na viewport" sem dividir um DOM que já
     * foi dividido (o que duplicaria/corromperia o conteúdo).
     *
     * @param {HTMLElement} textEl
     * @param {Object}      settings  Settings de anime.splitText()
     * @returns {Object} TextSplitter
     */
    function resplitNative(textEl, settings) {
        if (textEl._auroraSplitInstance && typeof textEl._auroraSplitInstance.revert === 'function') {
            textEl._auroraSplitInstance.revert();
            textEl._auroraSplitInstance = null;
        } else if (typeof textEl._auroraPristineHTML !== 'undefined') {
            textEl.innerHTML = textEl._auroraPristineHTML;
        }
        var split = anime.splitText(textEl, settings);
        textEl._auroraSplitInstance = split;
        return split;
    }

    var animeAnimations = {

        // ml-1 — Float Up
        'ml-1': function (units, opts) {
            anime.animate(units, {
                translateY: [60, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-2 — Scale In
        'ml-2': function (units, opts) {
            anime.animate(units, {
                scale    : [0.2, 1],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                ease     : 'outBack',
            });
        },

        // ml-3 — Drop Down
        'ml-3': function (units, opts) {
            anime.animate(units, {
                translateY: [-60, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-4 — Slide From Right
        'ml-4': function (units, opts) {
            anime.animate(units, {
                translateX: [80, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-5 — Wave (translateY senoidal por índice)
        'ml-5': function (units, opts) {
            anime.animate(units, {
                translateY: function (el, i) { return [Math.sin(i * 0.85) * 40, 0]; },
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outSine',
            });
        },

        // ml-6 — Flip X (rotateX com perspectiva)
        'ml-6': function (units, opts) {
            units.forEach(function (u) {
                u.style.transformOrigin  = 'center bottom';
                u.style.transformStyle   = 'preserve-3d';
                u.style.backfaceVisibility = 'hidden';
            });
            anime.animate(units, {
                rotateX : [90, 0],
                opacity : [0, 1],
                duration: opts.duration,
                delay   : function (el, i) { return opts.delay + i * opts.stagger; },
                ease    : 'outExpo',
            });
        },

        // ml-7 — Typewriter (aparece letra por letra, sem transição)
        'ml-7': function (units, opts) {
            anime.animate(units, {
                opacity : [0, 1],
                duration: 1,
                delay   : function (el, i) {
                    // stagger maior para simular digitação
                    return opts.delay + i * Math.max(opts.stagger, 60);
                },
                ease    : 'linear',
            });
        },

        // ml-8 — Blur Reveal
        'ml-8': function (units, opts) {
            // Inicia com blur
            units.forEach(function (u) { u.style.filter = 'blur(14px)'; });
            anime.animate(units, {
                filter  : ['blur(14px)', 'blur(0px)'],
                opacity : [0, 1],
                duration: opts.duration,
                delay   : function (el, i) { return opts.delay + i * opts.stagger; },
                ease    : 'outQuart',
            });
        },

        // ml-9 — Skew In
        'ml-9': function (units, opts) {
            anime.animate(units, {
                skewX    : [-35, 0],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                ease     : 'outExpo',
            });
        },

        // ml-10 — Explosion (escala grande → normal)
        'ml-10': function (units, opts) {
            anime.animate(units, {
                scale    : [4, 1],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                ease     : 'outExpo',
            });
        },

        // ml-11 — Split Nativo (letras divididas via anime.splitText())
        'ml-11': function (units, opts, textEl) {
            textEl.style.opacity = '1';
            var split = resplitNative(textEl, { chars: true });
            anime.animate(split.chars, {
                translateY: [40, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-12 — Clip Wrap (palavras mascaradas via parâmetro wrap:'clip')
        'ml-12': function (units, opts, textEl) {
            textEl.style.opacity = '1';
            var split = resplitNative(textEl, { words: { wrap: 'clip' } });
            anime.animate(split.words, {
                translateY: ['100%', '0%'],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-13 — Clone Eco (cada letra clonada via parâmetro clone, efeito de eco/profundidade)
        'ml-13': function (units, opts, textEl) {
            textEl.style.opacity = '1';
            var split = resplitNative(textEl, { chars: { wrap: 'clip', clone: 'bottom' } });
            anime.animate(split.chars, {
                translateY: ['-100%', '0%'],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                ease      : 'outExpo',
            });
        },

        // ml-14 — Scramble Nativo (anime.scrambleText(), revela com efeito hacker)
        'ml-14': function (units, opts, textEl) {
            textEl.style.opacity = '1';
            anime.animate(textEl, {
                innerHTML: anime.scrambleText({ duration: opts.duration }),
                delay    : opts.delay,
            });
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LÓGICA CENTRAL
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Normaliza um valor de slider do Elementor ({size, unit}, número ou string).
     *
     * @param {*}      val
     * @param {number} fallback
     * @returns {number}
     */
    function sizeOf(val, fallback) {
        if (val && typeof val === 'object' && typeof val.size !== 'undefined') {
            var fromObj = parseFloat(val.size);
            return isNaN(fromObj) ? fallback : fromObj;
        }
        var num = parseFloat(val);
        return isNaN(num) ? fallback : num;
    }

    /**
     * Lê as opções de animação a partir dos data-aurora-* (renderizados pelo PHP).
     * Usado apenas como último recurso, quando o sistema de Frontend Handlers
     * do Elementor não está disponível (ex.: versões muito antigas).
     *
     * @param {HTMLElement} wrapper
     * @returns {Object}
     */
    function parseOptsFromDataset(wrapper) {
        var ds = wrapper.dataset;
        return {
            library   : ds.auroraLibrary   || 'gsap',
            animation : ds.auroraAnimation || 'gs-1',
            splitBy   : ds.auroraSplitBy   || 'chars',
            duration  : parseInt(ds.auroraDuration,  10) || 800,
            delay     : parseInt(ds.auroraDelay,     10) || 0,
            stagger   : parseInt(ds.auroraStagger,   10) || 30,
            trigger   : ds.auroraTrigger   || 'scroll',
            threshold : parseFloat(ds.auroraThreshold)  || 0.2,
            replay    : ds.auroraReplay    === '1',
        };
    }

    /**
     * Redefine visualmente os units para o estado inicial (antes da animação).
     *
     * @param {HTMLElement[]} units
     * @param {Object}        opts
     */
    function resetUnits(units, opts) {
        if (typeof gsap !== 'undefined') {
            gsap.set(units, { clearProps: 'all', opacity: 0 });
        } else {
            units.forEach(function (u) { u.style.opacity = '0'; });
        }

        // Limpa filtros do blur reveal
        if (opts.animation === 'ml-8') {
            units.forEach(function (u) { u.style.filter = 'blur(14px)'; });
        }
    }

    /**
     * Animações que gerenciam seu próprio DOM/split (não usam os `units`
     * genéricos pré-divididos por splitText() neste arquivo). Cada uma é
     * responsável por restaurar/esconder o textEl e revelar seu próprio
     * conteúdo dentro da função de animação correspondente.
     */
    var SELF_MANAGED_ANIMATIONS = ['gs-3', 'ml-11', 'ml-12', 'ml-13', 'ml-14'];

    function isSelfManaged(animation) {
        return SELF_MANAGED_ANIMATIONS.indexOf(animation) !== -1;
    }

    /**
     * Executa a animação de acordo com biblioteca e tipo.
     *
     * @param {HTMLElement[]} units
     * @param {Object}        opts
     * @param {HTMLElement}   textEl
     */
    function playAnimation(units, opts, textEl) {
        var lib  = opts.library;
        var anim = opts.animation;

        if (lib === 'gsap' && typeof gsap !== 'undefined') {
            var fn = gsapAnimations[anim];
            if (fn) fn(units, opts, textEl);
        } else if (lib === 'animejs' && typeof anime !== 'undefined') {
            var fn2 = animeAnimations[anim];
            if (fn2) fn2(units, opts, textEl);
        }
    }

    /**
     * Inicializa (ou reinicializa) a animação de texto de um wrapper. Pode
     * ser chamada várias vezes para o mesmo wrapper — por exemplo, quando o
     * usuário altera um controle no painel do Elementor. Cada chamada
     * restaura o HTML original do alvo antes de dividir de novo (o split é
     * destrutivo) e substitui qualquer observer de uma execução anterior.
     *
     * @param {HTMLElement} wrapper
     * @param {Object}      opts
     */
    function initTextAnimation(wrapper, opts) {
        console.log('[Aurora:text] initTextAnimation()', { wrapper: wrapper, opts: opts });
        var textEl = getTextTarget(wrapper);
        console.log('[Aurora:text] textEl encontrado ->', textEl, 'texto:', (textEl.innerText || textEl.textContent || '').slice(0, 40));

        // Guarda (uma única vez) o HTML original do alvo, para poder
        // restaurá-lo antes de cada reinicialização.
        if (typeof textEl._auroraPristineHTML === 'undefined') {
            textEl._auroraPristineHTML = textEl.innerHTML;
        } else {
            textEl.innerHTML = textEl._auroraPristineHTML;
        }

        // Cancela qualquer observer de uma inicialização anterior.
        if (wrapper._auroraObserver) {
            wrapper._auroraObserver.disconnect();
            wrapper._auroraObserver = null;
        }

        // Guarda texto original (necessário para scramble)
        textEl._auroraOriginal = textEl.innerText || textEl.textContent;

        // Divisão do texto (não aplica para animações self-managed, que
        // fazem seu próprio split/scramble — ver SELF_MANAGED_ANIMATIONS)
        var units = [];
        if (!isSelfManaged(opts.animation)) {
            units = splitText(textEl, opts.splitBy);
            // Estado inicial: invisível
            units.forEach(function (u) { u.style.opacity = '0'; });
        } else {
            // Self-managed: mantém texto mas esconde o elemento; a própria
            // função de animação (ml-11..14, gs-3) reexibe ao tocar.
            textEl.style.opacity = '0';
        }

        var played = false;

        function trigger() {
            if (played && !opts.replay) return;
            played = true;
            if (!isSelfManaged(opts.animation)) {
                units.forEach(function (u) { u.style.opacity = '0'; }); // Reset antes de re-animar
            }
            playAnimation(units, opts, textEl);
        }

        function reset() {
            played = false;
            if (isSelfManaged(opts.animation)) {
                textEl.style.opacity = '0';
            } else {
                resetUnits(units, opts);
            }
        }

        if (opts.trigger === 'scroll') {
            var observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        trigger();
                        if (!opts.replay) observer.unobserve(entry.target);
                    } else if (opts.replay) {
                        reset();
                    }
                });
            }, { threshold: opts.threshold });

            observer.observe(wrapper);
            wrapper._auroraObserver = observer;
        } else {
            // Dispara imediatamente ao carregar
            trigger();
        }
    }

    /**
     * Desfaz a animação de texto de um wrapper, restaurando o HTML original
     * (usado quando o controle "Habilitar Animação de Texto" é desligado
     * dinamicamente no editor).
     *
     * @param {HTMLElement} wrapper
     */
    function teardownTextAnimation(wrapper) {
        if (wrapper._auroraObserver) {
            wrapper._auroraObserver.disconnect();
            wrapper._auroraObserver = null;
        }
        var textEl = getTextTarget(wrapper);
        if (textEl && typeof textEl._auroraPristineHTML !== 'undefined') {
            textEl.innerHTML = textEl._auroraPristineHTML;
            textEl.style.opacity = '';
            textEl._auroraSplitInstance = null;
        }
    }

    function waitForLibs(callback) {
        var waited  = 0;
        var maxWait = 6000;
        var step    = 80;
        var timer   = setInterval(function () {
            waited += step;
            var gsapOk  = typeof gsap  !== 'undefined';
            var animeOk = typeof anime !== 'undefined';
            if (gsapOk || animeOk || waited >= maxWait) {
                clearInterval(timer);
                callback();
            }
        }, step);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTEGRAÇÃO ELEMENTOR — FRONTEND HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    //
    // `frontend/element_ready` dispara apenas UMA VEZ por elemento, na sua
    // primeira renderização — não dispara de novo quando um controle é
    // alterado no painel do editor. Para refletir mudanças instantaneamente
    // no preview (sem precisar recarregar o iframe), usamos a API oficial de
    // Frontend Handlers do Elementor: onElementChange() é chamado a cada
    // alteração de controle marcado como `frontend_available`.
    // Veja: https://developers.elementor.com/docs/editor-controls/frontend-available/

    /**
     * Registra o AuroraTextAnimationHandler junto ao Elementor.
     * Retorna `false` se a API de Frontend Handlers não estiver disponível
     * (ex.: versões muito antigas do Elementor).
     *
     * @returns {boolean}
     */
    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            console.log('[Aurora:text] elementorModules.frontend.handlers ainda não disponível.');
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            // elementorFrontend já existe, mas .hooks ainda não foi anexado
            // (acontece no editor, onde a ordem de inicialização difere do
            // frontend real). Sem essa checagem, addAction() abaixo lançaria
            // um TypeError não capturado que abortaria todo o restante do
            // script — incluindo o fallback de polling e o bootstrap().
            console.log('[Aurora:text] elementorFrontend.hooks ainda não disponível.');
            return false;
        }

        function AuroraTextAnimationHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraTextAnimationHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraTextAnimationHandler.prototype.constructor = AuroraTextAnimationHandler;

        AuroraTextAnimationHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_text_enable') === 'yes';
        };

        AuroraTextAnimationHandler.prototype.getOpts = function () {
            var library = this.getElementSettings('aurora_text_library') || 'gsap';
            return {
                library   : library,
                animation : library === 'gsap'
                    ? (this.getElementSettings('aurora_text_animation_gsap') || 'gs-1')
                    : (this.getElementSettings('aurora_text_animation_anime') || 'ml-1'),
                splitBy   : this.getElementSettings('aurora_text_split_by') || 'chars',
                duration  : sizeOf(this.getElementSettings('aurora_text_duration'), 800),
                delay     : sizeOf(this.getElementSettings('aurora_text_delay'), 0),
                stagger   : sizeOf(this.getElementSettings('aurora_text_stagger'), 30),
                trigger   : this.getElementSettings('aurora_text_trigger') || 'scroll',
                threshold : sizeOf(this.getElementSettings('aurora_text_threshold'), 20) / 100,
                replay    : this.getElementSettings('aurora_text_replay') === 'yes',
            };
        };

        AuroraTextAnimationHandler.prototype.runAnimation = function () {
            var wrapper = this.$element[0];
            var enabled = this.isEnabled();
            console.log('[Aurora:text] runAnimation()', { wrapper: wrapper, enabled: enabled });
            if (!enabled) {
                teardownTextAnimation(wrapper);
                return;
            }
            var opts = this.getOpts();
            console.log('[Aurora:text] opts ->', opts);
            setTimeout(function () { initTextAnimation(wrapper, opts); }, 80);
        };

        AuroraTextAnimationHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            console.log('[Aurora:text] onInit()', this.$element[0]);
            this.runAnimation();
        };

        AuroraTextAnimationHandler.prototype.onElementChange = function (propertyName) {
            console.log('[Aurora:text] onElementChange()', propertyName);
            if (propertyName.indexOf('aurora_text_') === 0) {
                this.runAnimation();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            console.log('[Aurora:text] frontend/element_ready/global ->', $element);
            elementorFrontend.elementsHandler.addHandler(AuroraTextAnimationHandler, { $element: $element });
        });

        console.log('[Aurora:text] Handler registrado com sucesso.');
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REGISTRO DO HOOK — o MAIS CEDO possível, de forma síncrona
    // ─────────────────────────────────────────────────────────────────────────
    //
    // `elementorFrontend.hooks.addAction()` não depende de gsap/anime estarem
    // carregados, nem de `isInit`/DOM pronto — só precisa que o objeto
    // `elementorModules`/`elementorFrontend` já exista, o que é garantido pela
    // dependência 'elementor-frontend' deste script (ela executa ANTES desta
    // linha). No frontend real (fora do editor) o Elementor pode disparar
    // `frontend/element_ready` para cada widget muito rapidamente após o load
    // da página — e esse evento só dispara UMA VEZ por elemento. O antigo
    // código só tentava registrar o hook depois de `waitForLibs()` (um polling
    // de no mínimo 80ms), o que era tempo suficiente para o Elementor disparar
    // o evento ANTES do nosso hook existir — perdendo-o para sempre. Por isso,
    // a tentativa de registro agora roda de forma síncrona, fora de qualquer
    // espera, no exato momento em que este arquivo é avaliado pelo navegador.
    var auroraHandlerRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraHandlerRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks) {
            return false;
        }
        auroraHandlerRegistered = registerHandler();
        return auroraHandlerRegistered;
    }

    if (!tryRegisterHandlerNow() && typeof elementorFrontend !== 'undefined') {
        console.log('[Aurora:text] Não registrado ainda — aguardando evento elementor/frontend/init e fazendo polling como fallback...');
        $(window).on('elementor/frontend/init', function () {
            console.log('[Aurora:text] evento elementor/frontend/init disparado.');
            tryRegisterHandlerNow();
        });
        (function poll() {
            var tries = 0;
            var timer = setInterval(function () {
                tries++;
                if (tryRegisterHandlerNow() || tries > 50) {
                    clearInterval(timer);
                }
            }, 100);
        })();
    }

    function bootstrap() {
        console.log('[Aurora:text] bootstrap() iniciado.');
        waitForLibs(function () {
            console.log('[Aurora:text] waitForLibs resolvido. gsap?', typeof gsap !== 'undefined', 'anime?', typeof anime !== 'undefined');

            // Fallback: nenhum Elementor JS disponível — varre a página
            // usando os data-aurora-* renderizados pelo PHP no frontend real.
            if (typeof elementorFrontend === 'undefined') {
                console.log('[Aurora:text] Elementor JS indisponível — usando fallback via data-aurora-*.');
                document.querySelectorAll('[data-aurora-enable="1"]').forEach(function (el) {
                    setTimeout(function () { initTextAnimation(el, parseOptsFromDataset(el)); }, 80);
                });
            }
        });
    }

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
