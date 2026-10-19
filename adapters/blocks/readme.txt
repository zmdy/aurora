=== Aurora for Blocks ===
Contributors: aurora
Tags: animation, text animation, gradient, blocks, full site editing
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.2.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Aurora's text animations, animated inner blocks, gradients, a custom cursor and a Morph Card block for the block editor and the Site Editor.

== Description ==

Aurora for Blocks adds an "Aurora" panel to the settings sidebar of core blocks, in posts, pages, templates and template parts.

* **Text animation** (headings, paragraphs, buttons, site title, post title, pullquotes, verse): 53 effects that split text into characters, words or lines.
* **Animate inner blocks** (group, columns, column, buttons, gallery, list, social icons, media & text, cover, post template): staggered entrances, hover and proximity effects for the blocks inside.
* **Gradient** (group, columns, column, cover, media & text as background; headings, paragraphs, buttons, site and post titles as text): multi-stop gradients, flow and hue animation, WebGL mesh styles.
* **Custom cursor** (group, cover, columns, column, media & text): a dot-and-ring cursor that follows the pointer inside the block and grows over links and images.
* **Morph Card block**: a card that morphs between social-media style post, profile and polaroid layouts. States are edited in the block settings with photos from the Media Library, and the card previews live in the editor. Visitors without JavaScript see the first photo and caption.

How it works:

* The options are saved in the block's settings. The block's own HTML is never changed, so switching the plugin off leaves every block valid.
* The data-attributes Aurora reads are added when the page renders, and each module's script loads only on pages that use it.
* Effects on core blocks play on the published page and in Preview, not inside the editor; the Morph Card block previews live in the editor.
* Every module respects the visitor's "reduce motion" setting.
* The Morph Card's polaroid captions use the "Caveat" font when the site provides it, and the theme's font otherwise; the plugin does not load fonts from Google.

Text animation uses Anime.js v4; everything else uses native CSS, the Web Animations API or WebGL. No GSAP.

Developers can offer modules on more blocks, or change the per-block defaults, with the `aurora_blocks_targets` filter (see includes/class-block-targets.php).

== Installation ==

1. Upload the zip from Plugins → Add New → Upload Plugin, then activate.
2. Select a heading, a group or another supported block and open the "Aurora" panel in the block settings.

To build the zip from the Aurora repository: `npm install`, then `npm run pack:blocks` (writes build/aurora-for-blocks.zip).

== Changelog ==

= 0.2.0 =
* Custom cursor module on container blocks.
* Morph Card block (post, profile and polaroid templates; profile grid photos, polaroid size and frame; live editor preview).

= 0.1.0 =
* First version: text, children and gradient modules on core blocks.
