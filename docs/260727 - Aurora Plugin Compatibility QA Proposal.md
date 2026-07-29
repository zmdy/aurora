# 🧪 Aurora for Elementor — QA Compatibility Test Plan & Execution Proposal

**Document Version:** 1.0.0  
**Target Product:** Aurora for Elementor (v0.1.3+)  
**Scope:** Comprehensive manual & performance test battery across the Top 10 WordPress Themes and Top 10 WordPress Plugins.  
**Objective:** Guarantee 100% visual fidelity, script execution safety, zero global namespace collisions, minimal DOM footprint, and flawless editor/frontend stability.

---

## 📋 1. Executive Summary

This proposal outlines a rigorous Quality Assurance (QA) testing protocol for the **Aurora for Elementor** plugin. Because Elementor operates inside a complex ecosystem of third-party themes, optimization suites, e-commerce engines, and dynamic field extensions, Aurora must undergo systematic compatibility testing to certify production readiness.

The plan covers:
1. **Theme Compatibility Matrix:** Testing against the 10 most widely deployed WordPress themes.
2. **Plugin Compatibility Matrix:** Testing against the 10 most critical ecosystem plugins.
3. **Functional Test Suites:** Step-by-step protocols for all 6 Aurora animation modules.
4. **Performance & Caching Audits:** Web Vitals integrity, JS deferral, and asset chunking verification.
5. **Execution Roadmap:** Phased testing workflow, bug reporting protocol, and sign-off criteria.

---

## 📑 2. Target Test Matrices

### 2.1. Top 10 WordPress Themes

| # | Theme Name | Developer | Target Test Focus |
|---|---|---|---|
| 1 | **Astra** | Brainstorm Force | Starter Templates, custom header/footer builders, container layout overrides. |
| 2 | **Hello Elementor** | Elementor | Clean canvas baseline, zero-CSS theme defaults, official Elementor compatibility. |
| 3 | **GeneratePress** | Tom Usborne | High-performance minimal DOM, GPU rendering interaction, strict CSS reset compatibility. |
| 4 | **OceanWP** | OceanWP | E-commerce integration, WooCommerce modal overlays, extensive JS asset enqueuing. |
| 5 | **Kadence Theme** | Kadence WP | Custom header/footer builder, CSS variable inheritance, dark mode toggle integration. |
| 6 | **Divi** | Elegant Themes | Multi-builder coexistence (testing Elementor pages inside a Divi theme installation). |
| 7 | **Avada** | ThemeFusion | Legacy jQuery wrappers, custom option framework, z-index stacking context conflicts. |
| 8 | **Neve** | ThemeIsle | AMP mobile rendering, Shadow DOM components, mobile-first responsive viewport triggers. |
| 9 | **WoodMart** | Xtemos | Complex AJAX shop loading, dynamic product quick-views, heavy CSS/JS bundles. |
| 10 | **Betheme** | Muffin Group | Pre-built site wrapper structures, custom smoothness scrolling scripts, iframe previews. |

---

### 2.2. Top 10 WordPress Plugins

| # | Plugin Name | Category | Target Test Focus |
|---|---|---|---|
| 1 | **Elementor Pro** | Page Builder Ext. | Theme Builder templates (Header/Footer/Single), Motion Effects, Sticky Containers. |
| 2 | **WooCommerce** | E-Commerce | Product loops, AJAX add-to-cart, cart drawer overlays, checkout page scripts. |
| 3 | **WP Rocket** | Caching / Perf. | "Delay JavaScript Execution", JS minification/combination, CDN URL rewrite. |
| 4 | **LiteSpeed Cache** | Caching / Perf. | Inline JS optimization, ESI (Edge Side Includes), CSS combine & WebP replacement. |
| 5 | **ACF Pro** | Dynamic Data | Feeding ACF text/image fields dynamically into Aurora animated elements. |
| 6 | **Essential Addons** | Elementor Addon | Heavy third-party widget registry, custom CSS asset enqueuing per page. |
| 7 | **Crocoblock (JetEngine)** | Dynamic Content | Custom Post Type listings, AJAX pagination, dynamic grid re-initialization. |
| 8 | **Slider Revolution** | Media / Sliders | WebGL/Canvas context sharing, heavy GSAP/Anime.js bundle co-existence. |
| 9 | **Rank Math / Yoast SEO** | SEO | Schema script injections, admin bar integration, editor panel metaboxes. |
| 10 | **WPML / Polylang** | Multilingual | Translated post IDs, localized data-attributes, language switcher widget integration. |

---

## 🧪 3. Comprehensive Manual Test Battery

### Test Suite A: Elementor Editor Experience & Control Panel Integrity

#### **TC-A1: Control Registration & UI Scope**
- **Objective:** Verify all 6 Aurora modules register cleanly in the Elementor Advanced panel across all supported widget types.
- **Steps:**
  1. Open the Elementor Editor on a fresh page.
  2. Insert a **Heading**, **Text Editor**, **Button**, **Image**, and **Container**.
  3. Inspect the **Advanced** tab for each element.
- **Expected Outcome:**
  - `Text Animation` appears ONLY on text-bearing elements (Heading, Text Editor, Button, etc.).
  - `Animate Children` appears ONLY on structural elements (Section, Column, Container).
  - `Cursor Follow`, `Glassmorphism`, `Gradient Engine`, and `Image Effects` appear on their respective allowlisted elements.
  - Zero control bleeding into unsupported widgets (e.g. Spacer, Divider).

#### **TC-A2: Live Preview Responsiveness & Control Modifications**
- **Objective:** Ensure changing control values updates the editor live-preview instantly without iframe reloads.
- **Steps:**
  1. Enable `Text Animation` on a Heading widget.
  2. Cycle through dropdown choices (`gs-1` to `gs-26`, `ml-1` to `ml-44`).
  3. Adjust `Duration`, `Stagger`, and `Split by` sliders.
  4. Toggle `Hover Scatter` on and off.
- **Expected Outcome:**
  - Live preview immediately re-triggers the animation sequence.
  - No JavaScript console errors (`TypeError`, `ReferenceError`).

#### **TC-A3: Tree Walk & Backbone Model Footprint Audit**
- **Objective:** Confirm Aurora adds minimum overhead to Elementor's Backbone settings model.
- **Steps:**
  1. Open Chrome DevTools Console inside the Elementor Editor.
  2. Run: `elementor.documents.getCurrent().container.children.models[0].get('settings').attributes`
- **Expected Outcome:**
  - Key count increases ONLY for elements where Aurora controls are active.
  - Zero `REPEATER` collections created for standard controls.
  - Non-textual elements (e.g. Spacer) have 0 Aurora keys in their settings model.

---

### Test Suite B: Visual Fidelity & Frontend Effect Execution

#### **TC-B1: Text Animation Suite (GSAP & Anime.js Engines)**
- **Objective:** Validate all 70 text animation presets on the real frontend.
- **Steps:**
  1. Create a page with 10 headings, each configured with a different text effect (e.g., `gs-1 Fade Up`, `gs-3 Scramble`, `ml-7 Typewriter`, `ml-15 Continuous Wave`, `ml-21 RGB Split`).
  2. Configure different triggers (`scroll`, `load`) and `split-by` modes (`chars`, `words`, `lines`).
  3. View the page on Chrome, Firefox, Safari, and Edge.
- **Expected Outcome:**
  - Typography, font weight, line-height, and custom fonts are preserved exactly.
  - Entrance animations trigger smoothly when scrolling into viewport.
  - Continuous/loop animations (`ml-15`, `ml-22`, `ml-23`) stop gracefully when `prefers-reduced-motion: reduce` is enabled in OS settings.

#### **TC-B2: WebGL Mesh Shader Engine & Liquid Cursor**
- **Objective:** Verify WebGL canvas rendering, grain noise overlay, and displacement interaction.
- **Steps:**
  1. Apply `Gradient Engine` with Mesh Shader mode to a Container.
  2. Test all 5 WebGL presets: `Paper Shader (grainy)`, `Liquid Mesh`, `Wave Mesh`, `Silk Shader`, `Stripe Mesh`.
  3. Enable `Liquid Cursor Follower` and move mouse over canvas container.
- **Expected Outcome:**
  - Smooth 60fps WebGL canvas animation without GPU memory leaks.
  - Canvas resizes dynamically when browser window is resized.
  - Liquid displacement waves track cursor accurately without offset drift.

#### **TC-B3: Cinematic Image Effects Suite**
- **Objective:** Validate 8 hover/appear image effects under various trigger configurations.
- **Steps:**
  1. Apply Image Effects to Image widgets: `3D Interactive Tilt`, `RGB Split`, `Slide Overlay`, `Liquid Warp`, `Shine Sweep`, `Circle Ripple`, `Blur Focus`, `Retro Pixelate`.
  2. Test trigger modes: `On Hover Only`, `On Appear Only (Scroll Reveal)`, `Both`.
- **Expected Outcome:**
  - 3D Tilt calculates dynamic rotation (`rotateX`, `rotateY`) and shadow offsets accurately on mouse movement.
  - Liquid Warp HTML5 Canvas effect renders ripples smoothly.
  - Image aspect ratio and responsiveness remain perfectly intact.

#### **TC-B4: Glassmorphism & Backdrop Filter Compatibility**
- **Objective:** Test backdrop blur, noise texture, and border glow across rendering engines.
- **Steps:**
  1. Enable Glassmorphism on a Container positioned over a rich background image.
  2. Configure Blur (px), Saturation (%), Noise Opacity, and Border Color.
  3. Test on Safari (iOS/macOS - WebKit) and Chrome (Chromium).
- **Expected Outcome:**
  - `-webkit-backdrop-filter` fallback ensures frosted glass effect works on Safari.
  - Stacking context (`z-index`) preserves content readability above the blurred glass card.

---

### Test Suite C: Multi-Plugin Safety & Namespace Protection

#### **TC-C1: Vendor Global Library Collision Guard**
- **Objective:** Confirm Aurora's namespaced library handles (`AuroraAnimeJS`, `AuroraGSAP`, `AuroraMotionOne`) prevent third-party library collisions.
- **Steps:**
  1. Activate a third-party plugin that loads an older version of Anime.js v3 (e.g. `cmsmasters-elementor-addon`, `revslider`) on the same page.
  2. Verify in console: `window.anime.version` (v3) vs `window.AuroraAnimeJS` (v4).
  3. Trigger an Aurora text effect and an Aurora Morph Card caption reveal.
- **Expected Outcome:**
  - Zero `TypeError: anime.animate is not a function` console errors.
  - Both Aurora effects and third-party plugin animations function simultaneously without interference.

#### **TC-C2: Light Edition Dynamic Fallback (`aurora-for-elementor-light.zip`)**
- **Objective:** Test plugin behavior when GSAP is omitted from the package.
- **Steps:**
  1. Install `aurora-for-elementor-light.zip` on a test site.
  2. Open Elementor Editor on a widget.
- **Expected Outcome:**
  - `AURORA_HAS_GSAP` evaluates to `false`.
  - Library selector defaults to `Anime.js` and hides GSAP choices.
  - `aurora-gsap` asset is suppressed from enqueuing.
  - Zero PHP warnings or missing file notices.

---

### Test Suite D: Performance & Optimization Plugin Integration

#### **TC-D1: JS Deferral & Delay ("Delay JavaScript Execution")**
- **Objective:** Test compatibility with WP Rocket / LiteSpeed Cache JS delay options.
- **Steps:**
  1. Enable WP Rocket's "Delay JavaScript Execution" or LiteSpeed's "JS Delay".
  2. Load a page with Aurora Text Effects and WebGL Shaders.
  3. Scroll and interact with the page (first touch/mousemove).
- **Expected Outcome:**
  - Aurora scripts initialize immediately upon first user interaction.
  - Animation states settle cleanly without visual flicker or Layout Shift (CLS = 0).

#### **TC-D2: Asset Enqueuing & Selective Chunking**
- **Objective:** Verify zero asset bloat on pages not using Aurora.
- **Steps:**
  1. Load a page built with standard Elementor widgets (no Aurora effects enabled).
  2. Inspect `<head>` and footer scripts in page source.
  3. Load a second page with exactly 1 Text Animation effect (`gs-1`).
- **Expected Outcome:**
  - Page 1: **Zero** Aurora CSS/JS assets enqueued.
  - Page 2: Enqueues ONLY `aurora-text-core.js` + `dist/effects/gs-1.js` (no full editor bundle, no unused effect chunks).

---

## 🗓️ 4. Execution Plan & Roadmap

### Phase Details:

1. **Phase 1 — Environment Provisioning (Days 1–4):**
   - Setup 10 clean WordPress 6.5+ staging environments running PHP 8.2 & PHP 8.3.
   - Install Elementor Free v3.22+ and Elementor Pro v3.22+.

2. **Phase 2 — Theme Testing Matrix (Days 5–12):**
   - Execute Test Suites A, B, and C across each of the 10 target themes.
   - Record layout shift, CSS conflicts, or z-index issues.

3. **Phase 3 — Plugin Ecosystem Matrix (Days 13–20):**
   - Incrementally activate target plugins (WooCommerce, WP Rocket, ACF, RevSlider, WPML).
   - Perform caching deferral, dynamic content binding, and global variable collision tests.

4. **Phase 4 — Performance Audit & Sign-off (Days 21–23):**
   - Run Google Lighthouse audit on all test pages (Mobile & Desktop).
   - Target thresholds: **Performance ≥ 95**, **CLS = 0**, **INP < 100ms**.
   - Issue final QA Release Approval certificate.

---

## 📊 5. QA Execution Checklist Template

Use this printable checklist to log test results for each environment:

| Test Case | Description | Status | Pass/Fail Notes |
|---|---|---|---|
| **TC-A1** | Control Registration & UI Scope | 🔲 Pass / 🔲 Fail | |
| **TC-A2** | Live Preview Responsiveness | 🔲 Pass / 🔲 Fail | |
| **TC-A3** | Backbone Model Key Count | 🔲 Pass / 🔲 Fail | |
| **TC-B1** | Text Animations (70 Presets) | 🔲 Pass / 🔲 Fail | |
| **TC-B2** | WebGL Mesh Shaders & Liquid Cursor | 🔲 Pass / 🔲 Fail | |
| **TC-B3** | Cinematic Image Effects (8 Presets) | 🔲 Pass / 🔲 Fail | |
| **TC-B4** | Glassmorphism Safari Fallback | 🔲 Pass / 🔲 Fail | |
| **TC-C1** | Global Library Collision Safety | 🔲 Pass / 🔲 Fail | |
| **TC-C2** | Light Version GSAP Suppression | 🔲 Pass / 🔲 Fail | |
| **TC-D1** | WP Rocket / LiteSpeed JS Delay | 🔲 Pass / 🔲 Fail | |
| **TC-D2** | Selective Asset Enqueuing | 🔲 Pass / 🔲 Fail | |

---
*End of QA Test Plan.*
