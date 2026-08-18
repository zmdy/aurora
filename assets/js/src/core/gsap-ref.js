/**
 * Aurora's own GSAP reference — dynamically resolved via a Proxy at runtime.
 */

function getGsapRef() {
	if (typeof window !== 'undefined') {
		return window.AuroraGSAP || window.gsap || null;
	}
	return null;
}

export var gsap = new Proxy({}, {
	get: function(target, prop) {
		var ref = getGsapRef();
		if (!ref) {
			console.warn('[Aurora] GSAP library is not available on window.AuroraGSAP or window.gsap');
			return function() {};
		}
		var val = ref[prop];
		if (typeof val === 'function') {
			return val.bind(ref);
		}
		return val;
	}
});
