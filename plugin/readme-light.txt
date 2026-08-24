=== Aurora for Elementor ===
Contributors: zmdy
Tags: elementor, animation, gradient, hover effects, animejs
Requires at least: 5.9
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.5.0
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

The open-source Swiss Army knife for Elementor design: text & image animations, gradients, glassmorphism, cursor follow, and more.

== Description ==

Aurora adds a set of advanced design modules to the **Advanced** tab of every Elementor widget, section, column, and container — no code required, straight from the panel.

= Module 1 — Text Animation =

Available on any Elementor widget (Heading, Text Editor, Button, etc.). Splits text into characters, words, or lines and applies one of 53 native animations powered by Anime.js — a curated collection spanning entrance, kinetic, glitch/digital, and creative styles — triggered on scroll or page load. Includes a Hover Scatter interaction (each split unit jumps to a random position on mouseenter and settles back on mouseleave), independent of the entrance animation. The full effect catalog ships as one shared frontend bundle, so every animation is available instantly with no extra per-effect network request.

= Module 2 — Animate Children Elements =

Available on Sections, Columns, Containers, and Widgets. Applies a staggered entrance animation to each child element, one after another, with a configurable delay and 10 animation styles.

= Module 3 — Gradient =

Available on Sections, Columns, Containers (as a background), Heading/Text Editor widgets (as a text-fill), the Icon widget (as an icon-fill), and Icon Box (choice of box background or icon-fill). Multi-stop gradients (3+ colors) in linear, radial, or conic form, a "Follow Mouse" spotlight mode that recenters a radial gradient on the live cursor position (Follow Mouse isn't available on SVG-based icon fills), or the animated WebGL Mesh Shader Engine with seven presets — Paper, Liquid, Wave, Silk, Stripe, and two Aurora Borealis-inspired styles (a drifting flare and rippling vertical curtains) — all sharing the same Distortion, Swirl, Scale, Angle, Grain, and Liquid Cursor controls plus your chosen color stops.

= Module 4 — Glassmorphism =

Available on the Image widget and on Sections, Columns, Containers. A translucent, blurred "frosted glass" background — resolved entirely in PHP into a single inline style attribute, with a CSS fallback for browsers without `backdrop-filter` support. No JavaScript involved.

= Module 5 — Cursor Follow =

Available on any Elementor element. Replaces the native cursor with a two-part custom cursor — a dot that tracks the mouse instantly and a ring that trails behind it — with configurable hover states for interactive elements and images.

= Module 6 — Image Effects =

Available on the native Image widget. Two independent controls: an Entrance Animation — 8 spring/elastic entrance effects powered by Anime.js — and a Hover Effect (7 pure-CSS effects, including a Shine sweep).

= Requirements =

* Elementor 3.0 or higher (Elementor Pro is not required)
* PHP 7.4 or higher
* WordPress 5.9 or higher

= Bundled libraries =

Anime.js and Motion One are bundled locally under 100% GPL-compatible MIT licenses (no CDN dependency) to power the animation modules.

= Source code & build tools =

Unminified JavaScript source files (`assets/js/src/`) and developer build tooling are maintained at https://github.com/zmdy/aurora.

== Installation ==

1. Upload the plugin files to the `/wp-content/plugins/aurora-for-elementor` directory, or install the plugin through the WordPress plugins screen directly.
2. Activate the plugin through the "Plugins" screen in WordPress.
3. Make sure Elementor is installed and activated.
4. Edit any element with Elementor and open the "Advanced" tab to find the Aurora sections (Text Animation, Animate Children Elements, Gradient, Glassmorphism, Cursor Follow, Image Effects).

== Frequently Asked Questions ==

= Does this require Elementor Pro? =

No. Aurora only requires the free version of Elementor (3.0 or higher).

= Does Aurora send any data to external servers? =

No. Aurora does not make any external network requests, does not track users, and does not use any third-party service.

= Is Aurora translation-ready? =

Yes. English is the default language, and a Portuguese (Brazil) translation is bundled. Additional languages can be added via the standard WordPress `.pot`/`.po`/`.mo` translation workflow — see the `/languages` directory.

== Screenshots ==

1. Text Animation controls in the Elementor Advanced tab.
2. Gradient module with the Follow Mouse spotlight enabled.
3. Image Effects — entrance animation and Shine hover effect.

== Changelog ==

= 0.6.0 =
* Gradient: added two new Mesh Shader Engine presets — Aurora Borealis (a drifting, top-anchored flare over a night-sky base) and Aurora Curtains (rippling vertical light bands) — using the same Distortion, Swirl, Scale, Angle, Grain, Liquid Cursor, and color-stop controls as every other mesh style.

= 0.5.0 =
* Animate Children Elements: added alternate direction/pattern controls (Left/Right, Up/Down, Zoom, Rotate) for staggered animations.
* Fixed a gradient disappearance bug on text elements that also had a Text Animation effect applied, including inside Loop Grid/Posts widgets and on animated Phrase-mode text.
* Fixed titles/headings permanently losing their entrance animation after a page reload, when the page had already been scrolled past them.
* Fixed inherited CSS `text-transform: capitalize` incorrectly forcing every animated character to uppercase.
* Animate Children Elements: fixed animations occasionally not loading on the frontend, elements briefly flashing visible before their scroll trigger, and corrected render hook registration for reliability across themes.
* Animate Children Elements: fixed the module being unavailable in this build — it no longer needs GSAP since the 0.3.0 engine migration, so it's now always active.
* Packaging: the readme's Stable tag is now generated automatically from the plugin's Version header at build time, so the two can no longer drift out of sync.

= 0.4.2 =
* Animate Children Elements: Icon List and Image Gallery widgets now animate each item individually instead of moving as a single block.

= 0.4.1 =
* Animate Children Elements: fixed a frontend data fallback issue and a double-execution bug inside the Elementor editor.

= 0.4.0 =
* Animate Children Elements: added Elementor's native Motion Effects list and a new Hover Proximity Wave interaction.

= 0.3.0 =
* Animate Children Elements: migrated the animation engine to Elementor's own bundled animate.css library.

= 0.2.5 =
* Fixed Counter widgets nested inside an animated container not refreshing/re-triggering correctly.

= 0.2.4 =
* Animate Children Elements: isolated CSS transitions, forced GPU-accelerated rendering, and optimized the scroll-trigger threshold for smoother playback.

= 0.2.3 =
* Animate Children Elements: added "Target Children" (what to animate) and "Max Depth Level" controls.

= 0.2.2 =
* Gradient: fixed an icon-slicing bug and added Gradient support to the Icon List widget.

= 0.2.0 =
* Added the Gradient, Glassmorphism, Cursor Follow, and Image Effects modules.
* Added the Morph Card widget.
* Added English + Portuguese (Brazil) translations.
* Grew the Text Animation catalog to dozens of Anime.js effects, each loaded on demand as its own small chunk.
* Added the "Requires Plugins" header for native Elementor dependency checking.
* Added the cross-platform Full/Light packaging workflow.
* Numerous stability and performance fixes across every module.

= 0.1 =
* Initial release: Text Animation, Animate Children Elements, Gradient (incl. Follow Mouse spotlight), Glassmorphism, Cursor Follow, and Image Effects modules.
* Text Animation: added a Continuous Wave entrance effect and a Hover Scatter interaction (both Anime.js).
* Text Animation: restructured into one file per effect, built via Vite into a full editor bundle and small, individually-loadable frontend chunks — only the effect a widget actually uses is sent to real visitors.
* Text Animation: added 24 new animation effects — Rotate In, Slot Machine, Spin In, Neon Flicker, CRT Boot, Domino Fall, Pendulum Swing, Unfold 3D, Stretch Warp, Heartbeat, Vertical Blinds, Rubber Stamp, VHS Tracking, Liquid Fill Reveal, Perspective Fly, Cinema Title, Elastic Slide, Scatter Converge, Matrix Rain, Spiral In, Flip Board, RGB Split, Typewriter Delete, and Rotating Character Dial. Near-duplicate variants were intentionally skipped in favor of one representative effect each.
* Text Animation: added native Anime.js equivalents for all effects, delivering the complete animation catalog under a 100% GPL-compatible open-source engine (MIT license).

== Upgrade Notice ==

= 0.6.0 =
Adds two new Aurora-themed Mesh Shader Engine presets to the Gradient module.

= 0.5.0 =
Fixes gradient/text-animation combinations disappearing in some layouts and ensures Animate Children Elements is always available.

= 0.1 =
Initial release.
