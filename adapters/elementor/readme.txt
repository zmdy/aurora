=== Aurora for Elementor ===
Contributors: zmdy
Tags: elementor, animation, gradient, text animation, cursor
Requires at least: 5.9
Tested up to: 6.6
Requires PHP: 7.4
Stable tag: 1.0.0
License: MIT
License URI: https://opensource.org/licenses/MIT

The open-source Swiss Army knife for animated web design: text animations, animated children, gradients, a cursor follower and a morphing card.

== Description ==

Aurora adds animation controls to the **Advanced** tab of Elementor elements. Everything ships as local files: no CDN, no external requests, no GSAP.

The same modules also work outside WordPress as standalone scripts (plain HTML, Webflow and others). See https://github.com/zmdy/aurora.

= Modules =

* **Text Animation**: 53 effects that split text into characters, words or lines. Trigger on scroll or on load, with hover scatter.
* **Animate Children**: staggered entrance animations for the children of a container, section, column, icon list or gallery, plus hover and proximity effects.
* **Gradient**: multi-stop gradients for backgrounds, text and icons, with flow and hue animation, a cursor spotlight and WebGL mesh styles.
* **Cursor Follow**: a dot-and-ring cursor inside an element, with hover states.
* **Morph Card**: a widget that morphs between post, profile and polaroid layouts.

Each module can be switched off in the Aurora settings page; a switched-off module loads no assets.

Animations respect the visitor's reduced-motion preference.

= Requirements =

* Elementor 3.0 or higher (Elementor Pro is not required)
* PHP 7.4 or higher
* WordPress 5.9 or higher

== Installation ==

1. Upload the plugin to `/wp-content/plugins/` or install the zip from Plugins > Add New.
2. Activate it. Elementor must be active.
3. Open any element, go to the Advanced tab and find the Aurora sections.

== Changelog ==

= 1.0.0 =
* First release: rebuilt on a shared, builder-agnostic core with Anime.js v4, CSS and the Web Animations API.
