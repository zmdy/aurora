/**
 * Aurora for Elementor — Frontend: Módulo de Gradiente
 *
 * Gradientes multi-stop (3+ cores) em containers (fundo) e nos widgets
 * Heading/Text Editor (texto), com animação opcional em "mesh" (blobs
 * com blur, mesma linguagem visual dos ícones da marca) ou "loop"
 * (rotação de matiz). Todo o efeito é resolvido via CSS — este arquivo
 * só lê os dados salvos (via Elementor Handler ou data-attributes) e
 * injeta uma folha de estilo dinâmica com o gradiente e, quando
 * animado, um @keyframes exclusivo por instância (cada elemento pode
 * ter cores/velocidade diferentes).
 *
 * @package Aurora
 * @version 1.0.0
 */

/* global elementorFrontend, elementorModules, jQuery */
(function ($) {
    'use strict';

    if (typeof $ === 'undefined') return;

    // ─────────────────────────────────────────────────────────────────────────
    // UTILIDADES
    // ─────────────────────────────────────────────────────────────────────────

    var instanceCounter = 0;

    /**
     * Retorna (criando se necessário) a tag <style> onde as regras
     * dinâmicas de cada instância são acumuladas.
     *
     * @returns {HTMLStyleElement}
     */
    function getStyleTag() {
        var tag = document.getElementById('aurora-gradient-dynamic-styles');
        if (!tag) {
            tag = document.createElement('style');
            tag.id = 'aurora-gradient-dynamic-styles';
            document.head.appendChild(tag);
        }
        return tag;
    }

    function injectCss(css) {
        getStyleTag().appendChild(document.createTextNode(css));
    }

    /**
     * Lê um valor de controle do Elementor que pode vir como objeto
     * `{size, unit}` (SLIDER) ou já como número/string solta.
     *
     * @param {*} value
     * @param {number} fallback
     * @returns {number}
     */
    function sizeOf(value, fallback) {
        if (value && typeof value === 'object' && 'size' in value) {
            var n = parseFloat(value.size);
            return isNaN(n) ? fallback : n;
        }
        var parsed = parseFloat(value);
        return isNaN(parsed) ? fallback : parsed;
    }

    /**
     * Monta a string CSS do gradiente estático a partir do tipo, ângulo
     * (linear/cônico) e das paradas de cor.
     *
     * @param {string} type   linear | radial | conic
     * @param {number} angle
     * @param {Array}  stops  [{color, offset}]
     * @returns {string}
     */
    function buildGradientCss(type, angle, stops) {
        var stopsCss = stops
            .map(function (s) {
                var offset = s.offset;
                return (offset === null || typeof offset === 'undefined' || offset === '')
                    ? s.color
                    : s.color + ' ' + offset + '%';
            })
            .join(', ');

        if (type === 'radial') {
            return 'radial-gradient(circle, ' + stopsCss + ')';
        }
        if (type === 'conic') {
            return 'conic-gradient(from ' + angle + 'deg, ' + stopsCss + ')';
        }
        return 'linear-gradient(' + angle + 'deg, ' + stopsCss + ')';
    }

    /**
     * Distribui um blob radial por cor ao redor de um círculo central —
     * a base do efeito "mesh" usado no fundo de containers.
     *
     * @param {Array} stops [{color}]
     * @returns {{image: string, positions: Array<{x:number,y:number}>}}
     */
    function buildMeshLayers(stops) {
        var n = stops.length;
        var positions = [];
        var layers = [];

        for (var i = 0; i < n; i++) {
            var angle = (360 / n) * i;
            var rad = (angle * Math.PI) / 180;
            var x = 50 + 32 * Math.cos(rad);
            var y = 50 + 32 * Math.sin(rad);
            positions.push({ x: x, y: y });
            layers.push(
                'radial-gradient(circle at ' + x.toFixed(1) + '% ' + y.toFixed(1) + '%, ' +
                stops[i].color + ' 0%, transparent 65%)'
            );
        }

        return { image: layers.join(', '), positions: positions };
    }

    function positionString(positions, dx, dy) {
        return positions
            .map(function (p) {
                return (p.x + dx).toFixed(1) + '% ' + (p.y + dy).toFixed(1) + '%';
            })
            .join(', ');
    }

    function parseStops(raw) {
        try {
            var stops = JSON.parse(raw || '[]');
            return Array.isArray(stops) ? stops.filter(function (s) { return s && s.color; }) : [];
        } catch (e) {
            return [];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // APLICAÇÃO DO EFEITO
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Aplica o gradiente como fundo do elemento (containers). Estático:
     * direto via inline style. Animado: via ::before isolado (z-index:-1
     * dentro de um contexto de empilhamento próprio), para que blur ou
     * hue-rotate nunca vazem para o conteúdo do container.
     *
     * @param {HTMLElement} el
     * @param {Object} data
     * @param {number} id
     */
    function applyBackground(el, data, id) {
        var gradientCss = buildGradientCss(data.type, data.angle, data.stops);

        el.classList.remove('aurora-gradient-host');
        el.removeAttribute('data-aurora-gradient-instance');
        el.style.backgroundImage = '';

        if (!data.animate) {
            el.style.backgroundImage = gradientCss;
            return;
        }

        el.classList.add('aurora-gradient-host');
        el.setAttribute('data-aurora-gradient-instance', id);

        var selector = '.aurora-gradient-host[data-aurora-gradient-instance="' + id + '"]';
        var css;

        if (data.style === 'loop') {
            css = selector + '::before{content:"";position:absolute;inset:0;' +
                'background-image:' + gradientCss + ';background-size:200% 200%;' +
                'z-index:-1;pointer-events:none;' +
                'animation:aurora-grad-loop-' + id + ' ' + data.speed + 's linear infinite;}' +
                '@keyframes aurora-grad-loop-' + id + '{' +
                '0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}';
        } else {
            var mesh = buildMeshLayers(data.stops);
            var posBase = positionString(mesh.positions, 0, 0);
            var posMid = positionString(mesh.positions, 8, -10);
            var blur = Math.max(18, Math.round(70 / mesh.positions.length));

            css = selector + '::before{content:"";position:absolute;inset:-25%;' +
                'background-image:' + mesh.image + ';background-repeat:no-repeat;' +
                'filter:blur(' + blur + 'px);z-index:-1;pointer-events:none;' +
                'animation:aurora-grad-mesh-' + id + ' ' + data.speed + 's ease-in-out infinite;}' +
                '@keyframes aurora-grad-mesh-' + id + '{' +
                '0%{background-position:' + posBase + ';}' +
                '50%{background-position:' + posMid + ';}' +
                '100%{background-position:' + posBase + ';}}';
        }

        injectCss(css);
    }

    /**
     * Aplica o gradiente como text-fill no nó de texto real (Heading ou
     * Text Editor) — precisa ser o próprio elemento de texto, já que
     * background-clip:text não tem efeito no wrapper do Elementor.
     *
     * @param {HTMLElement} textEl Nó já localizado (.elementor-heading-title / .elementor-text-editor)
     * @param {Object} data
     * @param {number} id
     */
    function applyText(textEl, data, id) {
        var gradientCss = buildGradientCss(data.type, data.angle, data.stops);

        textEl.classList.remove('aurora-gradient-text');
        textEl.removeAttribute('data-aurora-gradient-instance');
        textEl.style.backgroundSize = '';

        textEl.style.backgroundImage = gradientCss;
        textEl.style.webkitBackgroundClip = 'text';
        textEl.style.backgroundClip = 'text';
        textEl.style.color = 'transparent';
        textEl.style.webkitTextFillColor = 'transparent';

        if (!data.animate) return;

        textEl.classList.add('aurora-gradient-text');
        textEl.setAttribute('data-aurora-gradient-instance', id);
        textEl.style.backgroundSize = '300% 300%';

        var selector = '.aurora-gradient-text[data-aurora-gradient-instance="' + id + '"]';
        var css;

        if (data.style === 'loop') {
            css = selector + '{animation:aurora-grad-text-hue-' + id + ' ' + data.speed + 's linear infinite;}' +
                '@keyframes aurora-grad-text-hue-' + id + '{' +
                '0%{filter:hue-rotate(0deg);}100%{filter:hue-rotate(360deg);}}';
        } else {
            css = selector + '{animation:aurora-grad-text-pan-' + id + ' ' + data.speed + 's ease-in-out infinite;}' +
                '@keyframes aurora-grad-text-pan-' + id + '{' +
                '0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}';
        }

        injectCss(css);
    }

    /**
     * Ponto único de entrada: decide fundo vs. texto pela presença do
     * nó de texto real dentro do wrapper — mais confiável do que confiar
     * no tipo de elemento, e funciona igual no editor e no frontend.
     *
     * @param {HTMLElement} wrapper
     * @param {Object} data
     */
    function applyGradient(wrapper, data) {
        if (!data.stops || data.stops.length < 2) return;

        var id = ++instanceCounter;
        var textEl = wrapper.querySelector('.elementor-heading-title, .elementor-text-editor');

        if (textEl) {
            applyText(textEl, data, id);
        } else {
            applyBackground(wrapper, data, id);
        }
    }

    /**
     * Lê as opções a partir dos data-attributes — usado apenas no
     * fallback de frontend puro (sem JS do Elementor disponível).
     *
     * @param {HTMLElement} el
     * @returns {Object}
     */
    function parseOptsFromDataset(el) {
        return {
            type: el.getAttribute('data-aurora-gradient-type') || 'linear',
            angle: parseInt(el.getAttribute('data-aurora-gradient-angle'), 10) || 135,
            stops: parseStops(el.getAttribute('data-aurora-gradient-stops')),
            animate: el.getAttribute('data-aurora-gradient-animate') === '1',
            style: el.getAttribute('data-aurora-gradient-style') || 'mesh',
            speed: parseInt(el.getAttribute('data-aurora-gradient-speed'), 10) || 8
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // INTEGRAÇÃO ELEMENTOR — FRONTEND HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Mesmo padrão usado em text-animations.js / children-animations.js:
    // onElementChange() reflete mudanças de controle instantaneamente no
    // preview do editor; frontend/element_ready/global cobre a primeira
    // renderização tanto no editor quanto no site real. Diferente do
    // módulo de texto, este não depende de nenhuma lib externa — por
    // isso não há waitForLibs()/polling de bibliotecas aqui.

    function registerHandler() {
        if (typeof elementorModules === 'undefined' || !elementorModules.frontend || !elementorModules.frontend.handlers) {
            return false;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks || typeof elementorFrontend.hooks.addAction !== 'function') {
            return false;
        }

        function AuroraGradientHandler() {
            elementorModules.frontend.handlers.Base.apply(this, arguments);
        }

        AuroraGradientHandler.prototype = Object.create(elementorModules.frontend.handlers.Base.prototype);
        AuroraGradientHandler.prototype.constructor = AuroraGradientHandler;

        AuroraGradientHandler.prototype.isEnabled = function () {
            return this.getElementSettings('aurora_gradient_enable') === 'yes';
        };

        AuroraGradientHandler.prototype.getOpts = function () {
            var rawStops = this.getElementSettings('aurora_gradient_stops') || [];
            var stops = rawStops
                .map(function (stop) {
                    return {
                        color: stop.color || '#0afbc1',
                        offset: stop.offset ? sizeOf(stop.offset, null) : null
                    };
                })
                .filter(function (s) { return s.color; });

            return {
                type: this.getElementSettings('aurora_gradient_type') || 'linear',
                angle: sizeOf(this.getElementSettings('aurora_gradient_angle'), 135),
                stops: stops,
                animate: this.getElementSettings('aurora_gradient_animate') === 'yes',
                style: this.getElementSettings('aurora_gradient_animation_style') || 'mesh',
                speed: sizeOf(this.getElementSettings('aurora_gradient_speed'), 8)
            };
        };

        AuroraGradientHandler.prototype.run = function () {
            if (!this.isEnabled()) return;
            applyGradient(this.$element[0], this.getOpts());
        };

        AuroraGradientHandler.prototype.onInit = function () {
            elementorModules.frontend.handlers.Base.prototype.onInit.apply(this, arguments);
            this.run();
        };

        AuroraGradientHandler.prototype.onElementChange = function (propertyName) {
            if (propertyName.indexOf('aurora_gradient_') === 0) {
                this.run();
            }
        };

        elementorFrontend.hooks.addAction('frontend/element_ready/global', function ($element) {
            elementorFrontend.elementsHandler.addHandler(AuroraGradientHandler, { $element: $element });
        });

        return true;
    }

    var auroraGradientRegistered = false;

    function tryRegisterHandlerNow() {
        if (auroraGradientRegistered) {
            return true;
        }
        if (typeof elementorFrontend === 'undefined' || !elementorFrontend.hooks) {
            return false;
        }
        auroraGradientRegistered = registerHandler();
        return auroraGradientRegistered;
    }

    // Registro síncrono, no exato momento em que o script é avaliado —
    // mesmo motivo documentado em text-animations.js: no frontend real
    // o Elementor pode disparar frontend/element_ready ANTES de qualquer
    // callback assíncrono, e o evento só dispara uma vez por elemento.
    if (!tryRegisterHandlerNow() && typeof elementorFrontend !== 'undefined') {
        $(window).on('elementor/frontend/init', function () {
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
        // Fallback: nenhum Elementor JS disponível — varre a página usando
        // os data-aurora-gradient-* renderizados pelo PHP no frontend real.
        if (typeof elementorFrontend === 'undefined') {
            document.querySelectorAll('[data-aurora-gradient-enable="1"]').forEach(function (el) {
                applyGradient(el, parseOptsFromDataset(el));
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrap);
    } else {
        bootstrap();
    }

})(typeof jQuery !== 'undefined' ? jQuery : function (fn) { document.addEventListener('DOMContentLoaded', fn); });
