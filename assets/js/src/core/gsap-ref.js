/**
 * Aurora's own GSAP reference — captured ONCE, at this module's load time,
 * instead of every call site reading the live `window.gsap` global.
 *
 * Same reasoning as core/anime-ref.js: GSAP is bundled by a huge number of
 * WordPress themes and Elementor add-ons, all assigning it to the same
 * `window.gsap` global. Whichever script executes last on the page wins
 * that global — if a theme or another plugin loads its own (possibly
 * older, possibly differently-configured) GSAP build after Aurora's, any
 * Aurora effect that only reads `gsap` at the moment it actually animates
 * (e.g. one gated behind an IntersectionObserver, which can fire long
 * after page load) would silently start using the wrong instance.
 *
 * Asset_Manager::enqueue_frontend_assets() enqueues a tiny inline script
 * immediately after assets/js/vendor/gsap.min.js (handle 'aurora-gsap')
 * that stashes our copy on `window.AuroraGSAP` before any other script
 * gets a chance to run. This module reads that safe, namespaced reference
 * once, so it stays correct no matter what any other plugin does to
 * `window.gsap` afterwards.
 */

export var gsap = (typeof window !== 'undefined' && (window.AuroraGSAP || window.gsap)) || null;
