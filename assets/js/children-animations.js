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
     * lido das configurações do Elementor vem direto do model, sem a
     * sanitização que o before_render aplica no frontend.
     *
     * @param {string} raw
     * @returns {string}
     */
    function sanitizeSelector(raw) {
        var selector = (raw || '').replace(/[^a-zA-Z0-9_\-.\s,:#>+~[\]=^$*|()]/g, '');
        return selector || '.elementor-widget';
    }

    /**
     * Lê as opções de animação de filhos a partir dos data-ptac-*
     * (renderizados pelo PHP). Usado apenas como último recurso, quando o
     * sistema de Frontend Handlers do Elementor não está disponível.
     *
     * @param {HTMLElement} wrapper
     * @returns {Object}
     */
    function parseOptsFromDataset(wrapper) {
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

    /**
     * Inicializa (ou reinicializa) a animação stagger de filhos de um wrapper.
     * Pode ser chamada várias vezes para o mesmo wrapper — por exemplo, quando
     * o usuário altera um controle no painel do Elementor — pois substitui
     * qualquer observer/estado de uma inicialização anterior.
     *
     * @param {HTMLElement} wrapper
     * @param {Object}      opts
     */
    function initChildrenAnimation(wrapper, opts) {
        console.log('[PTA:children] initChildrenAnimation()', { wrapper: wrapper, opts: opts });
        if (typeof gsap === 'undefined') {
            console.log('[PTA:children] gsap indisponível, abortando.');
            return;
        }

        var children = getChildren(wrapper, opts.selector);
        console.log('[PTA:children] children encontrados ->', children.length, children);

        // Cancela qualquer observer de uma inicialização anterior.
        if (wrapper._ptacObserver) {
            wrapper._ptacObserver.disconnect();
            wrapper._ptacObserver = null;
        }

        if (children.length === 0) return;

        // Estado inicial: filhos invisíveis
        gsap.set(children, { clearProps: 'all', opacity: 0 });

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
            wrapper._ptacObserver = observer;
        } else {
            trigger();
        }
    }

    /**
     * Desfaz a animação de filhos de um wrapper (usado quando o controle
     * "Animar Elementos Filhos" é desligado dinamicamente no editor).
     *
     * @param {HTMLElement} wrapper
     */
    function teardownChildrenAnimation(wrapper) {
        if (wrapper._ptacObserver) {
            wrapper._ptacObserver.disconnect();
            wrapper._ptacObserver = null;
        }
        var children = Array.from(wrapper.children);
        if (typeof gsap !== 'undefined' && children.length) {
            gsap.set(children, { clearProps: 'all' });
        }
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
     * Registra o PTAChildrenAnimationHandler junto ao Elementor.
     * Retorna `false` se a API de Frontend Handlers não estiver disponível
     * (ex.: versões muito antigas do Elementor).
     *
     * @returns {boolean}
     */
    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            console.log('[PTA:children] elementorModules.frontend.handlers ainda não disponível.');
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            // Mesma checagem de text-animations.js: elementorFrontend pode
            // existir antes de .hooks ser anexado (caso do editor), e sem
            // essa guarda o addAction() abaixo lançaria um TypeError não
            // capturado, abortando todo o script (fallback/polling/bootstrap).
            console.log('[PTA:children] elementorFrontend.hooks ainda não disponível.');
            return false;
        }

        function PTAChildrenAnimationHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        PTAChildrenAnimationHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        PTAChildrenAnimationHandler.prototype.constructor = PTAChildrenAnimationHandler;

        PTAChildrenAnimationHandler.prototype.isEnabled = function () {
            return this.getElementSettings('pta_children_enable') === 'yes';
        };

        PTAChildrenAnimationHandler.prototype.getOpts = function () {
            return {
                animation : this.getElementSettings('pta_children_animation') || 'fade-up',
                selector  : sanitizeSelector(this.getElementSettings('pta_children_selector')),
                duration  : sizeOf(this.getElementSettings('pta_children_duration'), 600),
                delay     : sizeOf(this.getElementSettings('pta_children_delay'), 0),
                stagger   : sizeOf(this.getElementSettings('pta_children_stagger'), 150),
                trigger   : this.getElementSettings('pta_children_trigger') || 'scroll',
                threshold : sizeOf(this.getElementSettings('pta_children_threshold'), 15) / 100,
                replay    : this.getElementSettings('pta_children_replay') === 'yes',
            };
        };

        PTAChildrenAnimationHandler.prototype.runAnimation = function () {
            var wrapper = this.$element[0];
            var enabled = this.isEnabled();
            console.log('[PTA:children] runAnimation()', { wrapper: wrapper, enabled: enabled });
            if (!enabled) {
                teardownChildrenAnimation(wrapper);
                return;
            }
            var opts = this.getOpts();
            console.log('[PTA:children] opts ->', opts);
            setTimeout(function () { initChildrenAnimation(wrapper, opts); }, 120);
        };

        PTAChildrenAnimationHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            console.log('[PTA:children] onInit()', this.$element[0]);
            this.runAnimation();
        };

        PTAChildrenAnimationHandler.prototype.onElementChange = function (propertyName) {
            console.log('[PTA:children] onElementChange()', propertyName);
            if (propertyName.indexOf('pta_children_') === 0) {
                this.runAnimation();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            console.log('[PTA:children] frontend/element_ready/global ->', $element);
            elementorFrontend.elementsHandler.addHandler(PTAChildrenAnimationHandler, { $element: $element });
        });

        console.log('[PTA:children] Handler registrado com sucesso.');
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // REGISTRO DO HOOK — o MAIS CEDO possível, de forma síncrona
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Mesma lógica e mesmo motivo de text-animations.js: `hooks.addAction()`
    // não depende do GSAP estar carregado nem de `isInit`. No frontend real
    // (fora do editor) `frontend/element_ready` dispara só UMA VEZ por
    // elemento, rápido depois do load da página — esperar `waitForGsap()`
    // (polling de no mínimo 80ms) antes de registrar o hook fazia perdermos
    // esse disparo pra sempre. Por isso o registro agora é síncrono, no
    // momento em que este arquivo é avaliado.
    var ptacHandlerRegistered = false;

    function tryRegisterHandlerNow() {
        if (ptacHandlerRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined') {
            return false;
        }
        ptacHandlerRegistered = registerHandler();
        return ptacHandlerRegistered;
    }

    if (!tryRegisterHandlerNow() && typeof elementorFrontend !== 'undefined') {
        console.log('[PTA:children] Não registrado ainda — aguardando evento elementor/frontend/init e fazendo polling como fallback...');
        $(window).on('elementor/frontend/init', function () {
            console.log('[PTA:children] evento elementor/frontend/init disparado.');
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
        console.log('[PTA:children] bootstrap() iniciado.');
        waitForGsap(function () {
            console.log('[PTA:children] waitForGsap resolvido. gsap?', typeof gsap !== 'undefined');

            // Fallback: nenhum Elementor JS disponível — varre a página
            // usando os data-ptac-* renderizados pelo PHP no frontend real.
            if (typeof elementorFrontend === 'undefined') {
                console.log('[PTA:children] Elementor JS indisponível — usando fallback via data-ptac-*.');
                document.querySelectorAll('[data-ptac-enable="1"]').forEach(function (el) {
                    setTimeout(function () { initChildrenAnimation(el, parseOptsFromDataset(el)); }, 120);
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
