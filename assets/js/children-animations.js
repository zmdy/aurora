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
     * Lê o data-settings nativo do Elementor (controles `frontend_available`).
     * Fonte mais confiável dentro do editor — montada pelo JS do Elementor a
     * partir do model em tempo real, sem depender de before_render do PHP
     * disparar de novo a cada mudança de configuração no painel.
     *
     * @param {HTMLElement} wrapper
     * @returns {Object|null}
     */
    function readElementorSettings(wrapper) {
        var raw = wrapper.getAttribute('data-settings');
        if (!raw) return null;
        try {
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed.pta_children_enable !== 'undefined') return parsed;
        } catch (e) { /* JSON inválido, ignora */ }
        return null;
    }

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
     * Sanitiza um seletor CSS (mesma whitelist usada no PHP), pois o valor
     * lido de data-settings vem direto do model, sem a sanitização que o
     * before_render aplica no frontend.
     *
     * @param {string} raw
     * @returns {string}
     */
    function sanitizeSelector(raw) {
        var selector = (raw || '').replace(/[^a-zA-Z0-9_\-.\s,:#>+~[\]=^$*|()]/g, '');
        return selector || '.elementor-widget';
    }

    /**
     * Verifica se a animação de filhos está habilitada, priorizando o
     * data-settings nativo do Elementor (editor) e usando data-ptac-enable
     * (renderizado pelo PHP) como fallback no frontend.
     *
     * @param {HTMLElement} wrapper
     * @returns {boolean}
     */
    function isChildrenAnimationEnabled(wrapper) {
        var settings = readElementorSettings(wrapper);
        if (settings) return settings.pta_children_enable === 'yes';
        return !!(wrapper.dataset && wrapper.dataset.ptacEnable === '1');
    }

    /**
     * Lê as opções de animação de filhos, priorizando o data-settings nativo
     * do Elementor e usando os data-ptac-* (PHP) como fallback.
     *
     * @param {HTMLElement} wrapper
     * @returns {Object}
     */
    function parseChildrenOpts(wrapper) {
        var settings = readElementorSettings(wrapper);

        if (settings) {
            return {
                animation : settings.pta_children_animation || 'fade-up',
                selector  : sanitizeSelector(settings.pta_children_selector),
                duration  : sizeOf(settings.pta_children_duration, 600),
                delay     : sizeOf(settings.pta_children_delay, 0),
                stagger   : sizeOf(settings.pta_children_stagger, 150),
                trigger   : settings.pta_children_trigger || 'scroll',
                threshold : sizeOf(settings.pta_children_threshold, 15) / 100,
                replay    : settings.pta_children_replay === 'yes',
            };
        }

        // Fallback: data-ptac-* (renderizado pelo PHP no frontend real)
        var ds = wrapper.dataset;
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

        var opts     = parseChildrenOpts(wrapper);
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
        if (!wrapper) return;
        if (!isChildrenAnimationEnabled(wrapper)) return;
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
