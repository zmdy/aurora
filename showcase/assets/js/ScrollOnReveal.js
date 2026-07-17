'use strict';
(function($){
	$.fn.ScrollOnReveal = function(options){

		var settings = $.extend({}, this.ScrollOnReveal.defaults, options);

		return this.each(function(){
			var Api = new API($(this), settings);
			Api.init();
		})
	}

	$.fn.ScrollOnReveal.defaults = {
		container: $(window),
		speed: 1000,
		reset: true,
		delay: 80,
		viewFactor: 20,
		easing: 'ease-in-out',
		animatedCss: {
			'opacity': '1'
		},

		beforeCss: {
			'opacity': '0'
		}
	};

	function API(elem, settings){
		this.opts = settings;
		this.elem = elem;
		this.Transition;
		this.reval = false;
	};

	API.prototype = {
		init: function() {
			var that = this;
			that.opts.container.on('scroll', that.doTransition.bind(this));
			that.before();
		},

		doTransition: function() {
			var that = this;
			window.requestAnimationFrame(function(){
				that.transition();
			})
		},

		elemOffsets: function(elem) {
			var elemH = elem !== undefined ? elem.height() : 0;
			var elemTop = 0,
				elemBottom = 0;

			if(!$.type(elem) !== 'null' && elem !== undefined) {
				elemTop += elem.offset().top;
				elemBottom += elemTop + elemH;
			}

			return {
				Top: elemTop,
				Bottom: elemBottom,
				Height: elemH
			}
		},

		containerOffsets: function(cont){
			var opt = this.opts;
			var _cont;
			var contTop = 0,
				contBottom = 0,
				contH;

			if($.type(cont) !== 'null' && cont !== undefined) {
				contH = cont.height();
				contTop += cont.scrollTop();
				contBottom += contTop + cont.height();
			} else {
				_cont = opt.container;
				contH = _cont.height();
				contTop += _cont.scrollTop();
				contBottom += contTop + _cont.height();
			}

			return {
				Top: contTop,
				Bottom: contBottom,
				Height: contH
			}
		},

		touchTarget: function(elem) {
			var opt = this.opts;
			var that = this;
			var touchTop = false;
			var reset = false;

			var elemOff = that.elemOffsets(elem);
			var contOff = that.containerOffsets(opt.container);

			var resetCalc = contOff.Top - elemOff.Bottom;

			if((elemOff.Top + opt.viewFactor) <= contOff.Bottom) {
				touchTop = true;
			}
			if((resetCalc + opt.viewFactor) > 0 || !touchTop) {
				reset = true;
				touchTop = false;
			}
			return {
				Top: touchTop,
				Reset: reset
			}
		},

		before: function(elem) {
			var opt = this.opts;
			var element;
			var Css = getKeys(opt.beforeCss);

			if(elem !== undefined) {
				element = elem;
			} else {
				element = this.elem;
			}
			
			if($.isEmptyObject(Css)) {
				return;
			}
			else {
				element.css(Css);
			}

			if(elementPosition(element).absolute) {
				element.css('position', 'relative');
			} else {
				element.css('position', 'relative')
			}
		},

		transition: function() {
			var opt = this.opts;
			var elem = this.elem;
			var transition = {'transition': 'all ' + opt.easing + ' ' + opt.speed / 1000 + 's'}
			var animateCSS = $.extend(opt.animatedCss, transition, {});
			var befCss = getKeys(opt.beforeCss);
			var touch = this.touchTarget(elem);

			if(touch.Top) {
				
				setTimeout(function(){
					elem.eq(0).css(animateCSS)
				}, opt.delay || 1)
				
			}

			if(touch.Reset && opt.reset) {
				setTimeout(function(){
					elem.eq(0).css(befCss);
				}, 0)
			}
		}

	}

	function getKeys(target) {
		var key;
		var obj = {};
		for(key in target) {
			if(target.hasOwnProperty(key)) {
				obj[key] = target[key];
			} else {
				return;
			}
		}
		return obj;
	}

	function elementPosition(elem) {
		var relative = false;
		var absolute = false;

		if($.type(elem) !== 'null') {
			relative = elem.css('position') === 'relative' ? true : false;
			absolute = elem.css('position') === 'absolute' ? true : false;
		}

		return {
			relative: relative,
			absolute: absolute
		}
	}
})(jQuery);