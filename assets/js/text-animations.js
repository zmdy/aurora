/**
 * Text Animations for Elementor — Frontend: Animações de Texto
 *
 * Suporta 20 animações (10 GSAP + 10 Anime.js) com split por letras,
 * palavras ou linhas, disparadas por IntersectionObserver ou page load.
 *
 * @package PTA
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
                span.className     = 'pta-char';
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
            span.className     = 'pta-word';
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
            lineWrap.className = 'pta-line-wrap';

            var lineInner       = document.createElement('div');
            lineInner.style.cssText = 'display:inline-block;will-change:transform,opacity;';
            lineInner.className = 'pta-line';
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
            gsap.from(units, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                y        : 60,
                opacity  : 0,
                ease     : 'power3.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // gs-2 — Clip Reveal (sobe de baixo, mascarado)
        'gs-2': function (units, opts) {
            units.forEach(function (u) {
                u.parentElement.style.overflow = 'hidden';
                u.style.display = 'inline-block';
            });
            gsap.from(units, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                y        : '110%',
                opacity  : 0,
                ease     : 'power4.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // gs-3 — Scramble Text  (opera no elemento-pai, não nos units)
        'gs-3': function (units, opts, textEl) {
            var original = textEl._ptaOriginal || textEl.innerText;
            textEl.style.opacity = '0';
            // Restore the element (removes split)
            textEl.innerHTML = '';
            textEl.textContent = original;
            scrambleTextEffect(textEl, original, opts.duration, opts.delay);
        },

        // gs-4 — Elastic Bounce
        'gs-4': function (units, opts) {
            gsap.from(units, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                y        : 60,
                opacity  : 0,
                ease     : 'elastic.out(1, 0.4)',
                stagger  : opts.stagger / 1000,
            });
        },

        // gs-5 — 3D Flip Y
        'gs-5': function (units, opts) {
            gsap.set(units, { transformPerspective: 600 });
            gsap.from(units, {
                duration  : opts.duration / 1000,
                delay     : opts.delay / 1000,
                rotationY : 90,
                opacity   : 0,
                ease      : 'power3.out',
                stagger   : opts.stagger / 1000,
            });
        },

        // gs-6 — Slide In (from left)
        'gs-6': function (units, opts) {
            gsap.from(units, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                x        : -80,
                opacity  : 0,
                ease     : 'power3.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // gs-7 — Scale Up
        'gs-7': function (units, opts) {
            gsap.from(units, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                scale    : 0,
                opacity  : 0,
                ease     : 'back.out(1.7)',
                stagger  : opts.stagger / 1000,
            });
        },

        // gs-8 — Wave (deslocamento Y senoidal por índice)
        'gs-8': function (units, opts) {
            gsap.from(units, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                y        : function (i) { return Math.sin(i * 0.9) * 45; },
                opacity  : 0,
                ease     : 'power2.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // gs-9 — Bounce Drop (cai de cima com bounce)
        'gs-9': function (units, opts) {
            gsap.from(units, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                y        : -80,
                opacity  : 0,
                ease     : 'bounce.out',
                stagger  : opts.stagger / 1000,
            });
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
    // ANIMAÇÕES ANIME.JS  (ml-1 … ml-10)
    // ─────────────────────────────────────────────────────────────────────────

    var animeAnimations = {

        // ml-1 — Float Up
        'ml-1': function (units, opts) {
            anime({
                targets  : units,
                translateY: [60, 0],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                easing   : 'easeOutExpo',
            });
        },

        // ml-2 — Scale In
        'ml-2': function (units, opts) {
            anime({
                targets  : units,
                scale    : [0.2, 1],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                easing   : 'easeOutBack',
            });
        },

        // ml-3 — Drop Down
        'ml-3': function (units, opts) {
            anime({
                targets   : units,
                translateY: [-60, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                easing    : 'easeOutExpo',
            });
        },

        // ml-4 — Slide From Right
        'ml-4': function (units, opts) {
            anime({
                targets   : units,
                translateX: [80, 0],
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                easing    : 'easeOutExpo',
            });
        },

        // ml-5 — Wave (translateY senoidal por índice)
        'ml-5': function (units, opts) {
            anime({
                targets   : units,
                translateY: function (el, i) { return [Math.sin(i * 0.85) * 40, 0]; },
                opacity   : [0, 1],
                duration  : opts.duration,
                delay     : function (el, i) { return opts.delay + i * opts.stagger; },
                easing    : 'easeOutSine',
            });
        },

        // ml-6 — Flip X (rotateX com perspectiva)
        'ml-6': function (units, opts) {
            units.forEach(function (u) {
                u.style.transformOrigin  = 'center bottom';
                u.style.transformStyle   = 'preserve-3d';
                u.style.backfaceVisibility = 'hidden';
            });
            anime({
                targets : units,
                rotateX : [90, 0],
                opacity : [0, 1],
                duration: opts.duration,
                delay   : function (el, i) { return opts.delay + i * opts.stagger; },
                easing  : 'easeOutExpo',
            });
        },

        // ml-7 — Typewriter (aparece letra por letra, sem transição)
        'ml-7': function (units, opts) {
            anime({
                targets : units,
                opacity : [0, 1],
                duration: 1,
                delay   : function (el, i) {
                    // stagger maior para simular digitação
                    return opts.delay + i * Math.max(opts.stagger, 60);
                },
                easing  : 'linear',
            });
        },

        // ml-8 — Blur Reveal
        'ml-8': function (units, opts) {
            // Inicia com blur
            units.forEach(function (u) { u.style.filter = 'blur(14px)'; });
            anime({
                targets : units,
                filter  : ['blur(14px)', 'blur(0px)'],
                opacity : [0, 1],
                duration: opts.duration,
                delay   : function (el, i) { return opts.delay + i * opts.stagger; },
                easing  : 'easeOutQuart',
            });
        },

        // ml-9 — Skew In
        'ml-9': function (units, opts) {
            anime({
                targets  : units,
                skewX    : [-35, 0],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                easing   : 'easeOutExpo',
            });
        },

        // ml-10 — Explosion (escala grande → normal)
        'ml-10': function (units, opts) {
            anime({
                targets  : units,
                scale    : [4, 1],
                opacity  : [0, 1],
                duration : opts.duration,
                delay    : function (el, i) { return opts.delay + i * opts.stagger; },
                easing   : 'easeOutExpo',
            });
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LÓGICA CENTRAL
    // ─────────────────────────────────────────────────────────────────────────

    /** @type {WeakMap<HTMLElement, boolean>} */
    var ptaInstances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

    /**
     * Lê os data-attributes do wrapper e retorna um objeto de opções.
     *
     * @param {DOMStringMap} ds
     * @returns {Object}
     */
    function parseOpts(ds) {
        return {
            library   : ds.ptaLibrary   || 'gsap',
            animation : ds.ptaAnimation || 'gs-1',
            splitBy   : ds.ptaSplitBy   || 'chars',
            duration  : parseInt(ds.ptaDuration,  10) || 800,
            delay     : parseInt(ds.ptaDelay,     10) || 0,
            stagger   : parseInt(ds.ptaStagger,   10) || 30,
            trigger   : ds.ptaTrigger   || 'scroll',
            threshold : parseFloat(ds.ptaThreshold)  || 0.2,
            replay    : ds.ptaReplay    === '1',
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
            if (fn2) fn2(units, opts);
        }
    }

    /**
     * Inicializa a animação de texto de um wrapper.
     *
     * @param {HTMLElement} wrapper
     */
    function initTextAnimation(wrapper) {
        if (ptaInstances && ptaInstances.has(wrapper)) return;

        var opts   = parseOpts(wrapper.dataset);
        var textEl = getTextTarget(wrapper);

        // Guarda texto original (necessário para scramble)
        textEl._ptaOriginal = textEl.innerText || textEl.textContent;

        // Divisão do texto (não aplica para scramble gs-3)
        var units = [];
        if (opts.animation !== 'gs-3') {
            units = splitText(textEl, opts.splitBy);
            // Estado inicial: invisível
            units.forEach(function (u) { u.style.opacity = '0'; });
        } else {
            // Scramble: mantém texto mas esconde o elemento
            textEl.style.opacity = '0';
        }

        var played = false;

        function trigger() {
            if (played && !opts.replay) return;
            played = true;
            if (opts.animation !== 'gs-3') {
                units.forEach(function (u) { u.style.opacity = '0'; }); // Reset antes de re-animar
            }
            playAnimation(units, opts, textEl);
        }

        function reset() {
            played = false;
            if (opts.animation === 'gs-3') {
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
        } else {
            // Dispara imediatamente ao carregar
            trigger();
        }

        if (ptaInstances) ptaInstances.set(wrapper, true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTEGRAÇÃO ELEMENTOR
    // ─────────────────────────────────────────────────────────────────────────

    function processElement($scope) {
        var wrapper = ($scope && $scope[0]) ? $scope[0] : $scope;
        if (!wrapper || !wrapper.dataset) return;
        if (wrapper.dataset.ptaEnable !== '1') return;
        // Pequeno delay para garantir que o DOM foi completamente renderizado
        setTimeout(function () { initTextAnimation(wrapper); }, 80);
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

    function bootstrap() {
        waitForLibs(function () {

            // Elementor: ativa tanto no frontend quanto no preview do editor
            if (typeof elementorFrontend !== 'undefined') {
                elementorFrontend.hooks.addAction(
                    'frontend/element_ready/global',
                    processElement
                );
            }

            // Fallback: escaneia todos os elementos da página
            document.querySelectorAll('[data-pta-enable="1"]').forEach(function (el) {
                setTimeout(function () { initTextAnimation(el); }, 80);
            });
        });
    }

    // Inicializa quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    // Suporte ao evento de init do Elementor.
    // Se elementorFrontend já inicializou (scripts no footer carregam tarde),
    // registra o hook diretamente; caso contrário, aguarda o evento.
    if (typeof elementorFrontend !== 'undefined' && elementorFrontend.isInit) {
        elementorFrontend.hooks.addAction('frontend/element_ready/global', processElement);
    } else {
        $(window).on('elementor/frontend/init', function () {
            if (typeof elementorFrontend !== 'undefined') {
                elementorFrontend.hooks.addAction(
                    'frontend/element_ready/global',
                    processElement
                );
            }
        });
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
