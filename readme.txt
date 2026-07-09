=== Aurora for Elementor ===
Contributors: zmdy
Donate link: https://github.com/zmdy/aurora
Tags: elementor, animation, gradient, hover effects, gsap
Requires at least: 5.9
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 0.1
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

The open-source Swiss Army knife for Elementor design: text & image animations, gradients, glassmorphism, cursor follow, and more.

== Description ==

Aurora adds a set of advanced design modules to the **Advanced** tab of every Elementor widget, section, column, and container — no code required, straight from the panel.

= Module 1 — Text Animation =

Available on any Elementor widget (Heading, Text Editor, Button, etc.). Splits text into characters, words, or lines and applies one of 24 animations (10 powered by GSAP, 14 by Anime.js), triggered on scroll or page load.

= Module 2 — Animate Children Elements =

Available on Sections, Columns, Containers, and Widgets. Applies a staggered entrance animation to each child element, one after another, with a configurable delay and 10 animation styles.

= Module 3 — Gradient =

Available on Sections, Columns, Containers (as a background) and on Heading/Text Editor widgets (as a text-fill). Multi-stop gradients (3+ colors) in linear, radial, or conic form, with an optional animated "mesh"/"color loop" motion, or a "Follow Mouse" spotlight mode that recenters a radial gradient on the live cursor position.

= Module 4 — Glassmorphism =

Available on the Image widget and on Sections, Columns, Containers. A translucent, blurred "frosted glass" background — resolved entirely in PHP into a single inline style attribute, with a CSS fallback for browsers without `backdrop-filter` support. No JavaScript involved.

= Module 5 — Cursor Follow =

Available on any Elementor element. Replaces the native cursor with a two-part custom cursor — a dot that tracks the mouse instantly and a ring that trails behind it — with configurable hover states for interactive elements and images.

= Module 6 — Image Effects =

Available on the native Image widget. Two independent controls: an Entrance Animation — choice of GSAP (13 scroll/load-triggered effects, including wipe, curtain, and iris reveals) or Anime.js (8 spring/elastic-leaning effects, including Elastic Pop and Bounce Drop) — and a Hover Effect (7 pure-CSS effects, including a Shine sweep).

= Requirements =

* Elementor 3.0 or higher (Elementor Pro is not required)
* PHP 7.4 or higher
* WordPress 5.9 or higher

= Bundled libraries =

GSAP and Anime.js are bundled locally (no CDN dependency) to power the animation modules.

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

== Upgrade Notice ==

= 0.1 =
Initial release.
