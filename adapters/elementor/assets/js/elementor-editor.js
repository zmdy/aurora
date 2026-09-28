/**
 * Editor panel tweaks (top window, not the preview iframe).
 *
 * Aurora registers its controls in a custom "Aurora" tab. Elementor builds a
 * widget's tab bar as [the widget's own tabs] + [the shared common tabs], and
 * the Advanced tab is a common one — so a per-widget tab (like Aurora) lands
 * BEFORE Advanced, even though `elementor.config.tabs` lists it after. Section,
 * column and container register their own Advanced sections, so there Aurora is
 * already last. To make widgets match, we move the "aurora" tab to the end of
 * each element's tab list right where the panel reads it, keeping the controls
 * registered per widget in PHP. If Elementor ever changes this, the worst case
 * is the tab falling back to its natural position — nothing breaks.
 */
(function () {
	'use strict';

	function moveAuroraLast(data) {
		if (!data || !data.tabs_controls) {
			return data;
		}
		var tabs = data.tabs_controls;
		var keys = Object.keys(tabs);
		var index = keys.indexOf('aurora');
		if (index < 0 || index === keys.length - 1) {
			return data;
		}
		var reordered = {};
		keys.forEach(function (key) {
			if (key !== 'aurora') {
				reordered[key] = tabs[key];
			}
		});
		reordered.aurora = tabs.aurora;
		data.tabs_controls = reordered;
		return data;
	}

	function install() {
		if (!window.elementor || typeof elementor.getElementData !== 'function' || elementor.__auroraTabPatched) {
			return;
		}
		var original = elementor.getElementData;
		elementor.getElementData = function () {
			return moveAuroraLast(original.apply(this, arguments));
		};
		elementor.__auroraTabPatched = true;
	}

	if (window.jQuery) {
		jQuery(window).on('elementor:init', install);
	}
	install();
})();
