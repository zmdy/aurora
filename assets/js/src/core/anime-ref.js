/**
 * Aurora's own Anime.js reference — dynamically resolved via a Proxy at runtime.
 *
 * Supports both Anime.js v4 (window.AuroraAnimeJS or window.anime with anime.animate())
 * and Anime.js v3 fallback (where anime(...) is called directly).
 */

function getAnimeRef() {
	if (typeof window !== 'undefined') {
		return window.AuroraAnimeJS || window.anime || null;
	}
	return null;
}

export var anime = new Proxy(function() {}, {
	get: function(target, prop) {
		var ref = getAnimeRef();
		if (!ref) {
			console.warn('[Aurora] Anime.js library is not available on window.AuroraAnimeJS or window.anime');
			return function() {};
		}
		var val = ref[prop];
		if (typeof val === 'function') {
			return val.bind(ref);
		}
		if (prop === 'animate' && typeof ref === 'function') {
			// Fallback for Anime.js v3 where anime(...) is called directly instead of anime.animate(...)
			return ref.bind(ref);
		}
		return val;
	},
	apply: function(target, thisArg, argumentsList) {
		var ref = getAnimeRef();
		if (typeof ref === 'function') {
			return ref.apply(thisArg, argumentsList);
		} else if (ref && typeof ref.animate === 'function') {
			return ref.animate.apply(ref, argumentsList);
		}
		console.warn('[Aurora] Anime.js is not callable');
	}
});
