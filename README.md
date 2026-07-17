<div align="center">
  <img src="assets/branding/aurora_animated_logo.svg" alt="Aurora Logo" width="150" />

  <p><strong>The open-source Swiss Army knife for Elementor design.</strong></p>
  <!-- Badges -->
  <img src="https://img.shields.io/badge/WordPress-21759B.svg?style=for-the-badge&logo=WordPress&logoColor=white" alt="WordPress">
  <img src="https://img.shields.io/badge/Elementor-92003B.svg?style=for-the-badge&logo=Elementor&logoColor=white" alt="Elementor" />
  <img src="https://img.shields.io/badge/Anime.js-000000.svg?style=for-the-badge&logo=animedotjs&logoColor=white" alt="Anime.JS">
  <img src="https://img.shields.io/badge/GSAP-0AE448.svg?style=for-the-badge&logo=GSAP&logoColor=white" alt="GSAP">
  <img src="https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white" alt="PHP" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/License-GPL_v3-blue?style=for-the-badge" alt="GPL License" />
</div>

Aurora adds **advanced text animations** (GSAP + Anime.js), **staggered children element animations**, **multi-stop gradients** (including a mouse-following spotlight), **glassmorphism**, a **custom cursor follow effect**, and an **advanced image effects module** (13 entrance/reveal animations + 7 hover effects, incl. Shine) to the **Advanced** tab of every Elementor widget, section, column, and container — no code required, straight from the panel.

---

<h2 style="display: flex; align-items: center;">
  <img src="./assets/branding/icons/aurora_icon_blue_features.svg" alt="Features icon" style="height: 48px; margin-right: 8px;"/>
  Features
</h2>

<h3 style="display: flex; align-items: center;">
  <img src="./assets/branding/icons/aurora_icon_green_module_animate_text.svg" alt="Features icon" style="height: 32px; margin-right: 8px;"/>
  Module 1 — Text Animation
</h3>

Available on **any Elementor widget** (Heading, Text Editor, Button, etc.) via **Advanced → ✨ Text Animation (Aurora)**.

Automatically splits text content into **characters**, **words**, or **lines** and applies one of **24 available animations**, triggered on scroll or on page load.

| # | Library | Name | Effect |
|---|---------|------|--------|
| gs-1 | GSAP | Fade Up | Characters rise with fade |
| gs-2 | GSAP | Clip Reveal | Slides up from behind a mask |
| gs-3 | GSAP | Scramble Text | Shuffles characters → reveals final text |
| gs-4 | GSAP | Elastic Bounce | Bounces with elastic easing |
| gs-5 | GSAP | 3D Flip | Y-axis rotation in 3D perspective |
| gs-6 | GSAP | Slide In | Slides in from the left |
| gs-7 | GSAP | Scale Up | Grows from zero |
| gs-8 | GSAP | Wave | Sinusoidal Y offset per index |
| gs-9 | GSAP | Bounce Drop | Drops from above with bounce |
| gs-10 | GSAP | Glitch | Digital shake then stabilizes |
| ml-1 | Anime.js | Float Up | Rises smoothly (easeOutExpo) |
| ml-2 | Anime.js | Scale In | Scale 0.2 → 1 with back ease |
| ml-3 | Anime.js | Drop Down | Falls from above (easeOutExpo) |
| ml-4 | Anime.js | Slide From Right | Slides in from the right |
| ml-5 | Anime.js | Wave | Sinusoidal wave by index |
| ml-6 | Anime.js | Flip X | 3D rotation on the X axis |
| ml-7 | Anime.js | Typewriter | Typewriter effect, one character at a time |
| ml-8 | Anime.js | Blur Reveal | Blurred → sharp |
| ml-9 | Anime.js | Skew In | Skews then snaps into position |
| ml-10 | Anime.js | Explosion | Large scale → normal |
| ml-11 | Anime.js | Native Split (Letters) | Native Anime.js v4 text splitter, per letter |
| ml-12 | Anime.js | Clip Wrap (Words) | Masked reveal per word |
| ml-13 | Anime.js | Echo Clone (Letters) | Cloned trailing echo per letter |
| ml-14 | Anime.js | Native Scramble | Native Anime.js v4 scramble effect |

**Available controls per animation:**
- Library (GSAP / Anime.js)
- Animation type
- Split by (Characters / Words / Lines)
- Duration (ms)
- Initial delay (ms)
- Stagger delay between units (ms)
- Trigger: scroll or page load
- Visibility threshold (%)
- Replay on re-entering viewport

---

<h3 style="display: flex; align-items: center;">
  <img src="./assets/branding/icons/aurora_icon_green_module_animate_children.svg" alt="Features icon" style="height: 32px; margin-right: 8px;"/>
  Module 2 — Animate Children Elements
</h3>

Available on **Sections, Columns, Containers, and Widgets** via **Advanced → 🎬 Animate Children Elements (Aurora)**.

Applies an entrance animation in cascade (stagger) to each child element, one after the other, with a configurable delay.

**Available animations:**
| Name | Effect |
|------|--------|
| Fade Up | Rises with fade (default) |
| Fade Down | Drops with fade |
| Fade In | Opacity only |
| Slide Left | Slides in from the left |
| Slide Right | Slides in from the right |
| Zoom In | Grows from 65% → 100% |
| Zoom Out | Shrinks from 135% → 100% |
| Flip Up | 3D rotation on the X axis |
| Rotate In | Z rotation + scale |
| Bounce In | Rises with elastic ease |

**Available controls:**
- Animation type
- CSS selector for children (customizable)
- Duration per child (ms)
- Initial delay (ms)
- Stagger delay between children (ms)
- Trigger: scroll or page load
- Visibility threshold (%)
- Replay on re-entering viewport

---

<h3 style="display: flex; align-items: center;">
  <img src="./assets/branding/icons/aurora_icon_green_module_gradient.svg" alt="Features icon" style="height: 32px; margin-right: 8px;"/>
  Module 3 — Gradient
</h3>

Available on **Sections, Columns, Containers** (as a background) and on **Heading / Text Editor** widgets (as a text-fill) via **Advanced → 🌈 Gradient (Aurora)**.

Multi-stop gradients (3 or more colors, each with its own position) in linear, radial, or conic form, with three optional motion modes:

| Mode | Effect |
|------|--------|
| Static | No motion — a plain multi-stop gradient |
| Mesh (backgrounds) / Pan (text) | Backgrounds get drifting blurred color blobs; text gets a sliding gradient (background-clip:text can't render blurred blob layers) |
| Color Loop | Continuous hue-rotation cycle |
| **Follow Mouse (Spotlight)** | Radial-only: recenters the gradient on the live cursor position as it moves over the element — the same "spotlight" effect used behind a hero or footer background |

**Available controls:**
- Type (Linear / Radial / Conic)
- Angle (linear/conic)
- Gradient colors (repeater, min. 3, each with its own position %)
- Follow Mouse toggle + spotlight radius (px) — radial only
- Animate toggle + Animation Style (Mesh/Pan or Color Loop) + Cycle Duration (s) — hidden while Follow Mouse is active, since the two drive the background in incompatible ways (one from a timer, the other from the cursor)

---

<h3 style="display: flex; align-items: center;">
  <img src="./assets/branding/icons/aurora_icon_green_module_glassmorphism.svg" alt="Features icon" style="height: 32px; margin-right: 8px;"/>
  Module 4 — Glassmorphism
</h3>

Available on the **Image** widget and on **Sections, Columns, Containers** via **Advanced → 🧊 Glassmorphism (Aurora)**.

A translucent, blurred "frosted glass" background — glass color, background opacity, blur intensity, saturation, border opacity, and border radius — resolved entirely in PHP into a single inline `style` attribute, with a CSS fallback for browsers without `backdrop-filter` support. No JavaScript involved.

---

<h3 style="display: flex; align-items: center;">
  Module 5 — Cursor Follow
</h3>

Available on **any Elementor element** (widgets, Sections, Columns, Containers) via **Advanced → 🖱️ Cursor Follow (Aurora)**.

Replaces the native cursor with a two-part custom cursor — an inner dot that tracks the mouse instantly and an outer ring that trails behind it — while the pointer is inside the element it's enabled on ("zone"). Zones can be nested (e.g. a hero section zone with a button zone inside it); the innermost one under the cursor wins. Interactive elements (links, buttons) and images each get their own configurable hover scale and highlight color, matching a common pattern from modern agency/portfolio sites.

**Available controls:**
- Dot color, ring color
- Dot size (px), ring resting size (px)
- Trail delay (ms) — how long the ring takes to catch up with the dot
- Interactive elements selector (default `a, button, .cursor-pointer`) + hover scale
- Image elements selector (default `img, .zoom-target`) + hover scale

---

<h3 style="display: flex; align-items: center;">
  Module 6 — Image Effects
</h3>

Available on the native **Image** widget via **Advanced → 🖼️ Image Effects (Aurora)**. Two fully independent toggles — either, both, or neither can be active at once.

**Entrance Animation** (13 effects — scroll or page-load triggered, animated with GSAP):

| Name | Effect |
|------|--------|
| Fade Up | Rises with fade |
| Fade In | Opacity only |
| Slide from Left | Slides in from the left |
| Slide from Right | Slides in from the right |
| Zoom In | Grows from 70% → 100% |
| Zoom Out | Shrinks from 130% → 100% |
| Flip 3D | Y-axis 3D rotation |
| Blur Reveal | Blurred → sharp |
| Skew Reveal | Skewed → straightened |
| Wipe Reveal (Left → Right) | An overlay panel recedes to reveal the image left-to-right |
| Wipe Reveal (Bottom → Top) | An overlay panel recedes to reveal the image bottom-to-top |
| Curtain Reveal (Split Center) | Two overlay panels part from the center outward |
| Iris Reveal (Circle Expand) | A circular clip-path expands from the center |

Shared controls: Duration (ms), Delay (ms), Trigger (scroll / page load), Visibility Threshold (%), Replay every time visible, and an Overlay Color (used only by the 4 reveal effects).

**Hover Effect** (7 effects — 100% CSS, no JavaScript involved):

| Name | Effect |
|------|--------|
| Shine Sweep | A skewed light band sweeps across the image — the effect referenced from the Schon theme |
| Zoom In | Scales up inside a clipped container |
| Grayscale → Color | Desaturated at rest, full color on hover |
| Blur → Sharp Focus | Blurred at rest, sharp on hover |
| Color Tint Overlay | A color overlay fades in on hover |
| Brightness Pop | Brightness boost on hover |
| Rotate + Zoom | Slight rotation + zoom combined |

Shared controls: Hover Duration (ms); Shine Color + Shine Width (%) (shine only); Tint Color (tint only).

---

<h2 style="display: flex; align-items: center;">
  <img src="./assets/branding/icons/aurora_icon_blue_install.svg" alt="Features icon" style="height: 48px; margin-right: 8px;"/>
  Installation
</h2>

### Via ZIP upload

1. Download this repository as a `.zip`
2. In the WordPress dashboard, go to **Plugins → Add New → Upload Plugin**
3. Select the `.zip` file and click **Install Now**
4. Activate the plugin

### Via FTP / CLI

1. Clone this repository inside `wp-content/plugins/`:

```bash
git clone https://github.com/zmdy/aurora \
  wp-content/plugins/aurora-for-elementor
```

2. Activate the plugin from the WordPress dashboard

---

<h2 style="display: flex; align-items: center;">
  <img src="./assets/branding/icons/aurora_icon_blue_specs.svg" alt="Features icon" style="height: 48px; margin-right: 8px;"/>
  Project Specs
</h2>

| Requirement | Minimum version |
|-------------|----------------|
| WordPress | 5.9+ |
| PHP | 7.4+ |
| Elementor | 3.0+ |
| Elementor Pro | Not required |

Animation libraries are bundled with the plugin (no CDN dependency):
- **GSAP 3.12.5** — `assets/js/vendor/gsap.min.js`
- **Anime.js 4.4.1** — `assets/js/vendor/anime.min.js`


### Project Structure

```
aurora-for-elementor/
├── aurora-for-elementor.php                    ← Main bootstrap file
├── includes/
│   ├── class-plugin-core.php                   ← Singleton: loads modules & assets
│   ├── class-animation-module.php              ← Shared base class for every module
│   ├── class-module-manager.php                ← Module registry
│   ├── class-asset-manager.php                 ← Frontend/editor asset enqueueing
│   ├── class-text-animation-controls.php       ← Module 1: Text Animation
│   ├── class-children-animation-controls.php   ← Module 2: Animate Children Elements
│   ├── class-gradient-controls.php             ← Module 3: Gradient (incl. Follow Mouse)
│   ├── class-glassmorphism-controls.php        ← Module 4: Glassmorphism
│   ├── class-cursor-follow-controls.php        ← Module 5: Cursor Follow
│   └── class-image-effects-controls.php        ← Module 6: Image Effects
├── assets/
│   ├── js/
│   │   ├── src/                                ← Text Animation SOURCE (needs `npm run build`)
│   │   │   ├── core/                           ←   Shared runtime (split, engine, Elementor handler)
│   │   │   ├── effects/gsap/                   ←   One file per GSAP effect (gs-1 … gs-10)
│   │   │   ├── effects/anime/                  ←   One file per Anime.js effect (ml-1 … ml-15+)
│   │   │   └── entries/                        ←   editor.js (all effects) / frontend-core.js (runtime only)
│   │   ├── dist/                               ← Text Animation BUILD OUTPUT (committed — no build step needed to run the plugin)
│   │   │   ├── aurora-text-editor.js           ←   Full bundle, loaded only inside the Elementor editor/preview
│   │   │   ├── aurora-text-core.js             ←   Shared runtime, loaded on the real frontend
│   │   │   └── effects/{gs-1,ml-15,...}.js     ←   One tiny chunk per effect — PHP enqueues only the one a widget uses
│   │   ├── children-animations.js              ← Children stagger (GSAP)
│   │   ├── gradient-module.js                  ← Gradient rendering + mouse tracking
│   │   ├── cursor-follow.js                    ← Dot/ring cursor + zone tracking
│   │   ├── image-effects.js                    ← 13 entrance/reveal animations (GSAP)
│   │   └── vendor/                             ← Bundled GSAP & Anime.js
│   └── css/
│       ├── text-animations.css                 ← Base styles & helpers
│       ├── gradient-module.css                 ← Gradient base styles
│       ├── glass-module.css                    ← Glassmorphism fallback
│       ├── cursor-follow.css                   ← Cursor Follow base styles
│       └── image-effects.css                   ← 7 hover effects (pure CSS) + overlay base styles
├── languages/
│   ├── aurora-for-elementor.pot                ← Translation template
│   ├── aurora-for-elementor-pt_BR.po           ← Portuguese (Brazil) translation
│   └── aurora-for-elementor-pt_BR.mo           ← Compiled Portuguese (Brazil) translation
├── LICENSE
└── README.md
```

### Building the Text Animation module

The Text Animation module is the only part of Aurora with a build step — every other module is plain PHP/JS/CSS, no tooling required. Its source lives in `assets/js/src/` (one file per effect, under `effects/gsap/` and `effects/anime/`) and is compiled with **Vite** into the flat files the plugin actually loads (`assets/js/dist/`). `assets/js/dist/` is committed to the repo, so installing the plugin from a .zip or running it as-is never requires Node/npm — the build step is only needed when you change a file under `assets/js/src/`.

#### Prerequisites

- Node.js 18+ and npm (check with `node -v` / `npm -v`)

#### One-time setup

```
cd aurora-for-elementor
npm install
```

This reads `package.json` and installs Vite into `node_modules/` (already `.gitignore`d — never committed).

#### Compiling

```
npm run build
```

This runs `scripts/build-text-effects.mjs`, which drives Vite's build API directly (no `vite.config.js` — see the script's own header comment for why: `iife` output doesn't support multi-entry code-splitting, so every bundle is produced as its own isolated build call). One run regenerates everything in `assets/js/dist/`:

| Output | What it is | When it's loaded |
|---|---|---|
| `aurora-text-editor.js` | Core runtime + **all** effects baked in, one file | Only inside the Elementor editor/preview iframe |
| `aurora-text-core.js` | Core runtime only, no effects | Every real (non-editor) frontend page |
| `effects/{id}.js` (e.g. `gs-1.js`, `ml-23.js`) | One effect each, self-contained | Only the effect(s) a given widget actually uses, enqueued per-widget by PHP |

Re-run `npm run build` after editing, adding, or removing anything under `assets/js/src/` — it's the only step that turns those source changes into what the plugin actually serves. Nothing needs to be manually copied or renamed; the script discovers every effect file automatically from its `{id}-{slug}.js` filename.

#### Adding a new effect

1. Create `assets/js/src/effects/gsap/{id}-{slug}.js` or `assets/js/src/effects/anime/{id}-{slug}.js`, following the shape of any existing file in that folder (`export default { id, run(units, opts, textEl) {...} }`, plus `registerEffect(effect)`).
2. Add one import line to `assets/js/src/entries/editor.js` (so the editor bundle picks it up).
3. Add its select option in `includes/class-text-animation-controls.php`.
4. Run `npm run build`.

Nothing else in the codebase needs to change — no manifest to update, no ids to register elsewhere.

#### GSAP → Anime.js parity

Every GSAP effect (`gs-1`..`gs-26`) has an Anime.js effect with the same visual result, so the Library control is a real choice rather than Anime.js being a smaller fallback set. This exists to prepare for an eventual WordPress.org submission: GSAP's core license (GreenSock's "Standard No-Charge License") isn't GPL-compatible, while Anime.js is MIT. GSAP is still bundled and selectable today — nothing has been removed — but if GSAP is ever dropped, no effect is lost; the Library default just needs to switch to `animejs` and each `aurora_text_animation_gsap` value needs to be remapped to its Anime.js counterpart below.

| GSAP | Anime.js | | GSAP | Anime.js |
|---|---|---|---|---|
| gs-1 Fade Up | ml-1 Float Up | | gs-14 Neon Flicker | ml-32 Neon Flicker |
| gs-2 Clip Reveal | ml-12 Clip Wrap | | gs-15 CRT Boot | ml-33 CRT Boot |
| gs-3 Scramble Text | ml-14 Native Scramble | | gs-16 Domino Fall | ml-34 Domino Fall |
| gs-4 Elastic Bounce | ml-24 Elastic Bounce | | gs-17 Pendulum Swing | ml-35 Pendulum Swing |
| gs-5 3D Flip | ml-25 3D Flip | | gs-18 Unfold 3D | ml-36 Unfold 3D |
| gs-6 Slide In | ml-26 Slide In | | gs-19 Stretch Warp | ml-37 Stretch Warp |
| gs-7 Scale Up | ml-2 Scale In | | gs-20 Heartbeat | ml-38 Heartbeat |
| gs-8 Wave | ml-5 Wave | | gs-21 Vertical Blinds | ml-39 Vertical Blinds |
| gs-9 Bounce Drop | ml-27 Bounce Drop | | gs-22 Rubber Stamp | ml-40 Rubber Stamp |
| gs-10 Glitch | ml-28 Glitch | | gs-23 VHS Tracking | ml-41 VHS Tracking |
| gs-11 Rotate In | ml-29 Rotate In | | gs-24 Liquid Fill Reveal | ml-42 Liquid Fill Reveal |
| gs-12 Slot Machine | ml-30 Slot Machine | | gs-25 Perspective Fly | ml-43 Perspective Fly |
| gs-13 Spin In | ml-31 Spin In | | gs-26 Cinema Title | ml-44 Cinema Title |

(`ml-6`..`ml-11`, `ml-13`, `ml-15`..`ml-23` are Anime.js-original effects with no GSAP equivalent — no mapping needed for those.)

### Translations

English is the plugin's default language. A Portuguese (Brazil) translation is bundled in `languages/`, loaded automatically via the standard WordPress i18n API (`load_plugin_textdomain`) when the site's locale is `pt_BR`. To add another language, copy `languages/aurora-for-elementor.pot` to `languages/aurora-for-elementor-{locale}.po`, translate the strings, and compile it to a `.mo` file (e.g. with `msgfmt` or Poedit).

### How it works

1. **PHP registers controls** in the Elementor Advanced tab via hooks:
   - `elementor/element/common/section_effects/after_section_end`
   - `elementor/element/section/section_effects/after_section_end`
   - `elementor/element/column/section_effects/after_section_end`
   - `elementor/element/container/section_effects/after_section_end`

2. **PHP injects `data-*` attributes** onto the element wrapper via:
   - `elementor/frontend/element/before_render`
   - `elementor/frontend/widget/before_render`

3. **JavaScript** detects elements by their `data-aurora-*-enable="1"` attribute, registers an Elementor Frontend Handler per module for live preview in the editor, and applies effects via GSAP/Anime.js (animations), `IntersectionObserver` (scroll triggers), or a live `mousemove` listener (the Gradient module's Follow Mouse spotlight and the Cursor Follow module's dot/ring tracking).

## 💡 Inspiration

- [Moving Letters — Tobias Ahlin](https://tobiasahlin.com/moving-letters/)
- [GSAP — GreenSock](https://gsap.com/)
- [Anime.js](https://animejs.com/)
- [Animation Addons for Elementor](https://animation-addons.com/)


---

<h2 style="display: flex; align-items: center;">
  <img src="./assets/branding/icons/aurora_icon_blue_contributing.svg" alt="Features icon" style="height: 48px; margin-right: 8px;"/>
  Contributing
</h2>

This project is distributed under the [GPL License](./LICENSE).

Pull requests are welcome! For major changes, please open an Issue first to discuss what you'd like to change.

1. Fork the project
2. Create your branch (`git checkout -b feature/new-animation`)
3. Commit your changes (`git commit -m 'feat: add new animation'`)
4. Push to the branch (`git push origin feature/new-animation`)
5. Open a Pull Request

[![Feito no Brasil](https://selo.feitonobrasil.dev.br/pt-br/colorido/1x.svg)](https://feitonobrasil.dev.br)
