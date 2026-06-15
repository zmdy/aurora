# Text Animations for Elementor

> A WordPress plugin that adds **advanced text animations** (GSAP + Anime.js) and **staggered children element animations** to the **Advanced** tab of Elementor — no code required, straight from the panel.

---

## ✨ Features

### 🔤 Module 1 — Text Animation

Available on **any Elementor widget** (Heading, Text Editor, Button, etc.) via **Advanced → ✨ Text Animation (PTA)**.

Automatically splits text content into **characters**, **words**, or **lines** and applies one of 20 available animations, triggered on scroll or on page load.

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

### 🎬 Module 2 — Animate Children Elements

Available on **Sections, Columns, Containers, and Widgets** via **Advanced → 🎬 Animate Children (PTA)**.

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

## 📦 Installation

### Via ZIP upload

1. Download this repository as a `.zip`
2. In the WordPress dashboard, go to **Plugins → Add New → Upload Plugin**
3. Select the `.zip` file and click **Install Now**
4. Activate the plugin

### Via FTP / CLI

1. Clone this repository inside `wp-content/plugins/`:

```bash
git clone https://github.com/your-username/plugin-text-animations.git \
  wp-content/plugins/plugin-text-animations
```

2. Activate the plugin from the WordPress dashboard

---

## 🔧 Requirements

| Requirement | Minimum version |
|-------------|----------------|
| WordPress | 5.9+ |
| PHP | 7.4+ |
| Elementor | 3.0+ |
| Elementor Pro | Not required |

Animation libraries are loaded automatically via CDN:
- **GSAP 3.12** — [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js)
- **Anime.js 3.2** — [cdnjs.cloudflare.com](https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js)

---

## 🗂️ Project Structure

```
plugin-text-animations/
├── plugin-text-animations.php                  ← Main bootstrap file
├── includes/
│   ├── class-plugin-core.php                   ← Singleton: loads modules & assets
│   ├── class-text-animation-controls.php       ← Text animation controls
│   └── class-children-animation-controls.php   ← Children animation controls
├── assets/
│   ├── js/
│   │   ├── text-animations.js                  ← 20 animations (GSAP + Anime.js)
│   │   └── children-animations.js              ← Children stagger (GSAP)
│   └── css/
│       └── text-animations.css                 ← Base styles & helpers
├── LICENSE
└── README.md
```

---

## 🛠️ How it works

1. **PHP registers controls** in the Elementor Advanced tab via hooks:
   - `elementor/element/common/section_effects/after_section_end`
   - `elementor/element/section/section_effects/after_section_end`
   - `elementor/element/container/section_effects/after_section_end`

2. **PHP injects `data-*` attributes** onto the element wrapper via:
   - `elementor/frontend/element/before_render`

3. **JavaScript** detects elements by `data-pta-enable="1"` / `data-ptac-enable="1"`, uses `IntersectionObserver` to trigger animations on scroll, and applies effects via GSAP or Anime.js.

---

## 🔒 Security & Accessibility

- Children CSS selector is sanitized via regex in PHP
- All attributes are escaped with `esc_attr()`
- Split text elements receive `aria-label` with the original content and `aria-hidden="true"` on individual spans
- Full `prefers-reduced-motion` support via CSS media query

---

## 📝 License

This project is distributed under the [MIT License](./LICENSE).

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an Issue first to discuss what you'd like to change.

1. Fork the project
2. Create your branch (`git checkout -b feature/new-animation`)
3. Commit your changes (`git commit -m 'feat: add new animation'`)
4. Push to the branch (`git push origin feature/new-animation`)
5. Open a Pull Request

---

## 💡 Inspiration

- [Moving Letters — Tobias Ahlin](https://tobiasahlin.com/moving-letters/)
- [GSAP — GreenSock](https://gsap.com/)
- [Anime.js](https://animejs.com/)
