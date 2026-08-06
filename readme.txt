=== Aurora for Elementor ===
Contributors: zmdy
Tags: elementor, animation, gradient, hover effects, animejs
Requires at least: 5.9
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1.9
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

The open-source Swiss Army knife for Elementor design: text & image animations, gradients, glassmorphism, cursor follow, and more.

== Description ==

Aurora adds a set of advanced design modules to the **Advanced** tab of every Elementor widget, section, column, and container — no code required, straight from the panel.

= Module 1 — Text Animation =

Available on any Elementor widget (Heading, Text Editor, Button, etc.). Splits text into characters, words, or lines and applies one of 53 native animations powered by Anime.js — a curated collection spanning entrance, kinetic, glitch/digital, and creative styles — triggered on scroll or page load. Includes a Hover Scatter interaction (each split unit jumps to a random position on mouseenter and settles back on mouseleave), independent of the entrance animation. Only the specific effect a widget uses is ever loaded on the real frontend, on top of a small shared runtime — so adding more effects over time never adds weight to pages that don't use them.

= Module 2 — Animate Children Elements =

Available on Sections, Columns, Containers, and Widgets. Applies a staggered entrance animation to each child element, one after another, with a configurable delay and 10 animation styles.

= Module 3 — Gradient =

Available on Sections, Columns, Containers (as a background), Heading/Text Editor widgets (as a text-fill), the Icon widget (as an icon-fill), and Icon Box (choice of box background or icon-fill). Multi-stop gradients (3+ colors) in linear, radial, or conic form, with an optional animated "mesh"/"color loop" motion, or a "Follow Mouse" spotlight mode that recenters a radial gradient on the live cursor position (Follow Mouse isn't available on SVG-based icon fills).

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

= 0.1 =
* Initial release: Text Animation, Animate Children Elements, Gradient (incl. Follow Mouse spotlight), Glassmorphism, Cursor Follow, and Image Effects modules.
* Text Animation: added a Continuous Wave entrance effect and a Hover Scatter interaction (both Anime.js).
* Text Animation: restructured into one file per effect, built via Vite into a full editor bundle and small, individually-loadable frontend chunks — only the effect a widget actually uses is sent to real visitors.
* Text Animation: added 24 new animation effects — Rotate In, Slot Machine, Spin In, Neon Flicker, CRT Boot, Domino Fall, Pendulum Swing, Unfold 3D, Stretch Warp, Heartbeat, Vertical Blinds, Rubber Stamp, VHS Tracking, Liquid Fill Reveal, Perspective Fly, Cinema Title, Elastic Slide, Scatter Converge, Matrix Rain, Spiral In, Flip Board, RGB Split, Typewriter Delete, and Rotating Character Dial. Near-duplicate variants were intentionally skipped in favor of one representative effect each.
* Text Animation: added native Anime.js equivalents for all effects, delivering the complete animation catalog under a 100% GPL-compatible open-source engine (MIT license).

== Upgrade Notice ==

= 0.1 =
Initial release.
