/**
 * Aurora's own Anime.js reference — captured ONCE, at this module's load
 * time, instead of every call site reading the live `window.anime` global.
 *
 * Why this exists: several other Elementor add-ons bundle their own copy
 * of Anime.js and also assign it to the same `window.anime` global (we've
 * seen this in the wild with a third-party addon shipping Anime.js v3,
 * where `anime` itself is the animation function, not `anime.animate()`).
 * Whichever plugin's script happens to execute LAST on the page wins that
 * shared global — so even though Aurora's own v4 Anime.js loads correctly,
 * a later, unrelated plugin script can silently clobber `window.anime`
 * with an incompatible older version. Any Aurora effect that only reads
 * `anime` at the moment it actually animates (e.g. one gated behind an
 * IntersectionObserver, which can fire long after page load) then breaks
 * with "anime.animate is not a function", even though nothing in Aurora
 * itself changed.
 *
 * The fix: Asset_Manager::enqueue_frontend_assets() enqueues a tiny inline
 * script immediately after assets/js/vendor/anime.min.js (handle
 * 'aurora-animejs') that stashes OUR copy on `window.AuroraAnimeJS` before
 * any other plugin's script gets a chance to run. This module reads that
 * safe, namespaced reference once, so every effect that imports `anime`
 * from here keeps working no matter what any other script does to
 * `window.anime` afterwards.
 */

export var anime = (typeof window !== 'undefined' && (window.AuroraAnimeJS || window.anime)) || null;
