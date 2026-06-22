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

Aurora adds **advanced text animations** (GSAP + Anime.js) and **staggered children element animations** to the **Advanced** tab of every Elementor widget, section, column, and container — no code required, straight from the panel.

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
│   ├── class-text-animation-controls.php       ← Text animation controls
│   └── class-children-animation-controls.php   ← Children animation controls
├── assets/
│   ├── js/
│   │   ├── text-animations.js                  ← 24 animations (GSAP + Anime.js)
│   │   ├── children-animations.js              ← Children stagger (GSAP)
│   │   └── vendor/                             ← Bundled GSAP & Anime.js
│   └── css/
│       └── text-animations.css                 ← Base styles & helpers
├── LICENSE
└── README.md
```


### How it works

1. **PHP registers controls** in the Elementor Advanced tab via hooks:
   - `elementor/element/common/section_effects/after_section_end`
   - `elementor/element/section/section_effects/after_section_end`
   - `elementor/element/column/section_effects/after_section_end`
   - `elementor/element/container/section_effects/after_section_end`

2. **PHP injects `data-*` attributes** onto the element wrapper via:
   - `elementor/frontend/element/before_render`
   - `elementor/frontend/widget/before_render`

3. **JavaScript** detects elements by `data-aurora-enable="1"` / `data-aurora-children-enable="1"`, registers an Elementor Frontend Handler for live preview in the editor, uses `IntersectionObserver` to trigger animations on scroll, and applies effects via GSAP or Anime.js.

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
