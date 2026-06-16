/**
 * Text Animations for Elementor — Frontend: Animação Stagger de Filhos
 *
 * Aplica animações de entrada em sequência (stagger) aos elementos filhos
 * de qualquer container/section do Elementor.
 *
 * @package PTA
 * @version 1.0.0
 */

/* global gsap, elementorFrontend, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // ─────────────────────────────────────────────────────────────────────────
    // PARSE DE OPÇÕES
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Lê os data-ptac-* do wrapper e retorna um objeto de opções.
     *
     * @param {DOMStringMap} ds
     * @returns {Object}
     */
    function parseChildrenOpts(ds) {
        return {
            animation : ds.ptacAnimation || 'fade-up',
            selector  : ds.ptacSelector  || '.elementor-widget',
            duration  : parseInt(ds.ptacDuration,  10) || 600,
            delay     : parseInt(ds.ptacDelay,     10) || 0,
            stagger   : parseInt(ds.ptacStagger,   10) || 150,
            trigger   : ds.ptacTrigger   || 'scroll',
            threshold : parseFloat(ds.ptacThreshold) || 0.15,
            replay    : ds.ptacReplay    === '1',
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SELEÇÃO DE FILHOS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retorna os elementos filhos a animar, de acordo com o seletor configurado.
     * Tenta múltiplos seletores fallback caso o seletor principal não retorne nada.
     *
     * @param {HTMLElement} wrapper
     * @param {string}      selector
     * @returns {HTMLElement[]}
     */
    function getChildren(wrapper, selector) {
        var children = Array.from(wrapper.querySelectorAll(selector));

        // Fallbacks progressivos
        if (children.length === 0) {
            var fallbacks = [
                '.elementor-widget',
                '.elementor-column',
                '.elementor-container > *',
                '.e-con > .e-con-inner > *',
                '.e-con > *',
                '.elementor-icon-list-item',
                '.elementor-grid-item',
                ':scope > *',
            ];
            for (var i = 0; i < fallbacks.length; i++) {
                try {
                    children = Array.from(wrapper.querySelectorAll(fallbacks[i]));
                    if (children.length > 0) break;
                } catch (e) { /* seletor inválido, continua */ }
            }
        }

        // Último fallback: filhos diretos
        if (children.length === 0) {
            children = Array.from(wrapper.children);
        }

        return children;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ANIMAÇÕES DE FILHOS  (GSAP)
    // ─────────────────────────────────────────────────────────────────────────

    var childrenAnimations = {

        // Fade Up
        'fade-up': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                y        : 50,
                opacity  : 0,
                ease     : 'power3.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // Fade Down
        'fade-down': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                y        : -50,
                opacity  : 0,
                ease     : 'power3.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // Fade In (apenas opacidade)
        'fade-in': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                opacity  : 0,
                ease     : 'power2.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // Slide da Esquerda
        'slide-left': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                x        : -80,
                opacity  : 0,
                ease     : 'power3.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // Slide da Direita
        'slide-right': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                x        : 80,
                opacity  : 0,
                ease     : 'power3.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // Zoom In
        'zoom-in': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                scale    : 0.65,
                opacity  : 0,
                ease     : 'back.out(1.7)',
                stagger  : opts.stagger / 1000,
            });
        },

        // Zoom Out (começa grande e encolhe)
        'zoom-out': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                scale    : 1.35,
                opacity  : 0,
                ease     : 'power3.out',
                stagger  : opts.stagger / 1000,
            });
        },

        // Flip Up (rotação 3D no eixo X)
        'flip-up': function (children, opts) {
            gsap.set(children, {
                transformPerspective : 800,
                transformOrigin      : 'center bottom',
            });
            gsap.from(children, {
                duration  : opts.duration / 1000,
                delay     : opts.delay / 1000,
                rotationX : 80,
                opacity   : 0,
                ease      : 'power3.out',
                stagger   : opts.stagger / 1000,
            });
        },

        // Rotate In (rotação Z + fade)
        'rotate-in': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                rotation : -20,
                scale    : 0.8,
                opacity  : 0,
                ease     : 'back.out(1.4)',
                stagger  : opts.stagger / 1000,
            });
        },

        // Bounce In (sobe com bounce)
        'bounce-in': function (children, opts) {
            gsap.from(children, {
                duration : opts.duration / 1000,
                delay    : opts.delay / 1000,
                y        : 70,
                opacity  : 0,
                ease     : 'elastic.out(1, 0.5)',
                stagger  : opts.stagger / 1000,
            });
        },
    };

    // ─────────────────────────────────────────────────────────────────────────
    // LÓGICA CENTRAL
    // ─────────────────────────────────────────────────────────────────────────

    /** @type {WeakMap<HTMLElement, boolean>} */
    var ptacInstances = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

    /**
     * Inicializa a animação stagger de filhos para um wrapper.
     *
     * @param {HTMLElement} wrapper
     */
    function initChildrenAnimation(wrapper) {
        if (ptacInstances && ptacInstances.has(wrapper)) return;
        if (typeof gsap === 'undefined') return;

        var opts     = parseChildrenOpts(wrapper.dataset);
        var children = getChildren(wrapper, opts.selector);

        if (children.length === 0) return;

        // Estado inicial: filhos invisíveis
        gsap.set(children, { opacity: 0 });

        var played = false;

        function trigger() {
            if (played && !opts.replay) return;
            played = true;
            // Reseta para estado inicial antes de re-animar
            gsap.set(children, { clearProps: 'all', opacity: 0 });

            var fn = childrenAnimations[opts.animation];
            if (fn) fn(children, opts);
        }

        function reset() {
            played = false;
            gsap.set(children, { clearProps: 'all', opacity: 0 });
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
            trigger();
        }

        if (ptacInstances) ptacInstances.set(wrapper, true);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTEGRAÇÃO ELEMENTOR
    // ─────────────────────────────────────────────────────────────────────────

    function processChildrenElement($scope) {
        var wrapper = ($scope && $scope[0]) ? $scope[0] : $scope;
        if (!wrapper || !wrapper.dataset) return;
        if (wrapper.dataset.ptacEnable !== '1') return;
        // Delay ligeiramente maior que o text-animations para evitar conflito
        setTimeout(function () { initChildrenAnimation(wrapper); }, 120);
    }

    function waitForGsap(callback) {
        var waited  = 0;
        var maxWait = 6000;
        var step    = 80;
        var timer   = setInterval(function () {
            waited += step;
            if (typeof gsap !== 'undefined' || waited >= maxWait) {
                clearInterval(timer);
                callback();
            }
        }, step);
    }

    function bootstrap() {
        waitForGsap(function () {

            if (typeof elementorFrontend !== 'undefined') {
                elementorFrontend.hooks.addAction(
                    'frontend/element_ready/global',
                    processChildrenElement
                );
            }

            // Fallback: escaneia página toda
            document.querySelectorAll('[data-ptac-enable="1"]').forEach(function (el) {
                setTimeout(function () { initChildrenAnimation(el); }, 120);
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

    // Se elementorFrontend já inicializou (scripts no footer carregam tarde),
    // registra o hook diretamente; caso contrário, aguarda o evento.
    if (typeof elementorFrontend !== 'undefined' && elementorFrontend.isInit) {
        elementorFrontend.hooks.addAction('frontend/element_ready/global', processChildrenElement);
    } else {
        $(window).on('elementor/frontend/init', function () {
            if (typeof elementorFrontend !== 'undefined') {
                elementorFrontend.hooks.addAction(
                    'frontend/element_ready/global',
                    processChildrenElement
                );
            }
        });
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
