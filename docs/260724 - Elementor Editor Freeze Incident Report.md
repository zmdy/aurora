# 260724 - Elementor Editor Freeze Incident Report

**Plugin:** Aurora for Elementor
**Date:** 2026-07-24
**Scope:** Investigation of a user-reported "Elementor editor becomes unusable" complaint on a live production site (CMSMasters "Zen Retreat" theme + `cmsmasters-elementor-addon` plugin), plus the fixes shipped in response and open recommendations.
**Context:** Diagnosed from three Chrome DevTools Performance traces (Aurora active v0.1.2, Aurora fully deactivated, and a later trace after partial fixes), one browser console log, and direct inspection of the live third-party plugin source.

---

## Executive Summary

The user reported that the Elementor editor became slow to the point of being unusable — clicks not registering, controls not applying — on pages built with the CMSMasters "Zen Retreat" theme. Aurora v0.1.2 was the only variable the user had changed before the regression appeared.

Static and trace-based analysis found **two separate, real bugs**, only one of which is Aurora's:

1. **A confirmed Aurora bug** (not a performance issue): a `window.anime` / `window.gsap` / `window.Motion` global collision with third-party plugins that bundle their own copies of the same libraries. This threw `Uncaught TypeError: anime.animate is not a function` in the console and silently broke Aurora's own Morph Card caption-reveal feature. **Fixed and shipped** (v0.1.1–v0.1.2).

2. **The actual cause of the multi-second freezes**: a third-party plugin, `cmsmasters-elementor-addon`'s Navigator Indicator feature (`navigator-indicator.min.js`), recursively walks the *entire* Elementor document tree on nearly every editor interaction, explicitly resetting its own lookup cache on every call (defeating the cache's purpose), and calls `.toJSON()` on every element along the way. This is confirmed by reading the live, third-party minified source directly — it is not inference from trace data alone.

Aurora does not cause that bug, but it does make it worse: three Aurora modules (Text Animation, Cursor Follow, Animate Children Elements) register a combined **33 controls** on Elementor's `common` hook, which fires for every widget on the page regardless of whether Aurora's effects are in use. Every registered control adds one key to that widget's Backbone settings model, and `.toJSON()`'s shallow clone cost scales with the *total* key count — so Aurora inflates the exact object the third-party bug is expensive to walk, independent of usage.

A **zero-risk fix** (removing 3 confirmed-dead `common` hook registrations from unrelated modules) has been shipped. Two further, **not-yet-implemented** options are analyzed below with a recommendation.

| Item | Status |
|---|---|
| `window.anime`/`gsap`/`Motion` global collision | ✅ Fixed (v0.1.1, v0.1.2) |
| Dead `common` hook registrations (Gradient, Glassmorphism, Image Effects) | ✅ Fixed (v0.1.3) |
| Root cause of the freeze (third-party plugin bug) | ✅ Identified — not Aurora's code, cannot be patched from Aurora's side |
| Aurora's control-count contribution to the freeze's severity | ⚠️ Open — recommendation below |

---

## Part 1 — Confirmed Root Cause of the Freeze

### [F-1] Third-Party Plugin: Uncached Full-Tree Walk on Every Editor Interaction

**Source:** `cmsmasters-elementor-addon/assets/js/navigator-indicator.min.js` v1.25.1, fetched live from the user's site and read directly.

**Behavior found in the live source:**
- On nearly every editor interaction, the script calls `elementor.documents.getCurrent().container` and recurses into `.view.children` and `.repeaters` for the entire document tree — not just the visible/expanded part of the Navigator panel.
- It resets its own internal lookup cache (`y = null`) at the **start of every single invocation**, which defeats the cache across repeated calls — the exact opposite of what a cache is for.
- Along the way it calls `.toJSON()` / `.get('settings')` on every element it visits.

**Why this matters:** Backbone's default `.toJSON()` is `_.clone(this.attributes)` — a shallow clone whose cost is proportional to the *number of keys* in the settings object, for every element, on every walk, with no caching benefit. On a page with dozens of elements this adds up to seconds of main-thread blocking per interaction.

**Confirmed via trace comparison:**
- Trace with Aurora fully deactivated vs. Aurora active on the same page: both traces still showed the multi-second block — Aurora's own script execution time was near-zero in every trace analyzed. Disabling Aurora reduced but did not eliminate the freeze.
- The user separately confirmed no Aurora effect was even applied/in-use on the test page, ruling out a "DOM footprint from active effects" theory — the cost is a **registration-time** cost (how many controls exist), not a **usage-time** cost (whether an effect is running).

**Can this be fixed from Aurora's side?** No. There is no Elementor mechanism to hide a registered control from another script's introspection, and Backbone's `toJSON()` clones all keys in `attributes` regardless of value — there is no "empty property" trick that would make a registered control invisible to this walk. The bug lives entirely in the third-party plugin's code.

---

## Part 2 — Aurora Bugs Found and Fixed This Session

### [F-2] `window.anime` Global Collision — Confirmed via Console Error

**Symptom (user-reported, verbatim from browser console):**
```
aurora-text-editor.js?ver=0.1:1 Uncaught TypeError: anime.animate is not a function
```
with a stack trace through an `IntersectionObserver` callback.

**Root cause:** The CMSMasters Elementor Addon bundles its own, older copy of Anime.js (v3.2.1) and assigns it to the same `window.anime` global that Aurora's v4.4.1 copy uses. Whichever script's `<script>` tag executes last on the page "wins" the global. Aurora's code reads `window.anime` lazily (inside a deferred `IntersectionObserver` callback) rather than capturing a reference at load time, so it was vulnerable to being handed the wrong (older, v3-API) library after the fact. v3's `anime({...})` calling convention and v4's `anime.animate({...})` are incompatible, producing the `TypeError`.

**Fix shipped:** A namespaced-global capture pattern, applied consistently to all three vendored libraries Aurora ships:

```php
// includes/class-asset-manager.php — right after each vendor script is enqueued:
wp_add_inline_script( 'aurora-animejs',    'window.AuroraAnimeJS   = window.anime;',  'after' );
wp_add_inline_script( 'aurora-gsap',       'window.AuroraGSAP      = window.gsap;',   'after' );
wp_add_inline_script( 'aurora-motion-one', 'window.AuroraMotionOne = window.Motion;', 'after' );
```

`wp_add_inline_script(..., 'after')` guarantees (via WordPress's own dependency ordering) that this capture runs immediately after Aurora's vendor script tag — before any later-loading third-party script has a chance to overwrite the global. Every Aurora runtime file that previously read the bare global (`anime`, `gsap`, `window.Motion`) now reads the namespaced copy first, falling back to the bare global only if Aurora's own script somehow didn't run:

```js
// assets/js/src/core/anime-ref.js
export var anime = (typeof window !== 'undefined' && (window.AuroraAnimeJS || window.anime)) || null;
```

Applied across 69 files: 44 Anime.js effect files, 25 GSAP effect files, plus `engine.js`, `helpers.js`, `children-animations.js`, `image-effects.js`, and `morph-card.js` (the latter two are not part of the Vite build pipeline and were previously **completely unprotected** against this collision).

**Bonus fix found along the way:** `morph-card.js`'s caption-reveal feature called `window.anime({...})` directly as a function — valid only in Anime.js v3's calling convention — a genuine pre-existing bug, unrelated to the collision, masked by the fact that the v3-vs-v4 mismatch simply threw before this line could be reached in most cases. Corrected to `AuroraAnime.animate({...})` / `AuroraAnime.stagger(...)`.

**Shipped as:** v0.1.1 (Anime.js only), v0.1.2 (extended to GSAP + Motion One after the user asked whether the same defensive pattern should be applied preemptively — "não é bom usar a mesma ideia... para evitar outros conflitos futuramente?").

---

### [F-3] Dead `common` Hook Registrations — 3 Modules

**Root cause:** `Gradient_Controls`, `Glassmorphism_Controls`, and `Image_Effects_Controls` each additionally registered on `elementor/element/common/section_effects/after_section_end`, on top of their real, widget-specific hooks. Two of the three had code comments already noting this was "kept harmlessly" — correct for output (the callback can never actually register a visible control there, since the `$element` object passed to a `common` callback is a shared pseudo-element whose `get_name()` is always literally `"common"`/`"common-optimized"`, never the real widget type, so `applies_to_element()`'s inclusion check can never pass) — but **not** harmless for performance: it still fired `add_controls()` on every widget on every page load and every editor interaction, for nothing.

**Fix shipped:** Removed the dead `common` hook entry from all three modules' `get_controls_hooks()`. Their real controls are unaffected — each still registers through its actual per-widget-type hook (`image/section_style_image`, `heading/section_title_style`, `icon/section_style_icon`, `icon-box/section_style_box`, `section|column|container/section_effects`) exactly as before.

```php
// Before (class-glassmorphism-controls.php):
protected function get_controls_hooks(): array {
    return [
        [ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 40 ], // dead
        [ 'hook' => 'elementor/element/image/section_style_image/after_section_end', 'priority' => 40 ],
        [ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 30 ],
        [ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 30 ],
        [ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 30 ],
    ];
}

// After:
protected function get_controls_hooks(): array {
    return [
        [ 'hook' => 'elementor/element/image/section_style_image/after_section_end', 'priority' => 40 ],
        [ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 30 ],
        [ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 30 ],
        [ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 30 ],
    ];
}
```

This cuts the `common` hook's per-widget overhead in half (3 of Aurora's 6 modules no longer fire a no-op callback there). `Text_Animation_Controls`, `Cursor_Follow_Controls`, and `Children_Animation_Controls` genuinely need `common` — their `applies_to_element()` has no widget-name filter, so they register real controls there — and were left unchanged.

**Shipped as:** v0.1.3.

---

## Part 3 — Aurora's Remaining Contribution to the Freeze's Severity

This is the part of the incident that is **not yet fixed** and is the subject of the recommendation below.

### Current state

| Module | Controls registered | Fires on `common`? | `applies_to_element()` scope |
|---|---|---|---|
| Text Animation | 14 | Yes | Every element **except** `section`/`column`/`container` — i.e. every real widget |
| Cursor Follow | 10 | Yes | Every element (no filter) |
| Animate Children Elements | 9 | Yes | Every element (no filter) — **plus** explicit `section`/`column`/`container` hooks |

Combined, these three modules add up to **33 controls** to the settings model of most widgets on a typical page — a registration-time cost paid by every widget regardless of whether any Aurora effect is enabled or in use on that widget instance. This is the exact quantity that inflates the shallow-clone cost the third-party Navigator Indicator bug pays repeatedly.

### Why this can't be "tricked" away

The user asked whether Aurora's code could pass an empty property, or otherwise hide a control from the third party's introspection, without changing anything else. It cannot: Backbone's `.toJSON()` clones every key in `attributes` regardless of its value (empty, default, or otherwise), and Elementor has no API surface that lets one plugin mark a registered control as invisible to another script's tree walk. The only lever available from Aurora's side is reducing how many controls exist per widget in the first place.

### Two paths considered

**Option 1 — Narrow scope.** Restrict which widget types receive Cursor Follow / Animate Children / Text Animation's controls, the same way Gradient/Glassmorphism/Image Effects already do (an explicit `SUPPORTED_ELEMENTS` allow-list checked in `applies_to_element()`). Low engineering risk: it's a data change to an existing, proven pattern in this codebase, not new architecture. Backward-compatible by construction — `Animation_Module::before_render()` already re-evaluates `applies_to_element()` on every render, so a widget that had a setting saved under a scope that's later narrowed simply stops rendering that effect; no error, no data loss, no migration step required.

Within this option, one change is close to risk-free and is recommended regardless of any other decision: **Animate Children Elements** currently applies to literally any widget, including ones that structurally cannot have "children" to stagger (e.g. Heading). Its own explicit, always-correct hooks are already scoped to `section`/`column`/`container` — restricting `applies_to_element()` to match (and dropping its now-redundant `common` registration) is both a performance fix and a product-correctness fix, not a trade-off.

Cursor Follow and Text Animation are broader-purpose (a cursor effect or a text animation can reasonably apply to almost any visible widget), so narrowing their scope is a real product decision requiring a widget allow-list — not one that can be made unilaterally without the user's input on which widget types to keep in scope.

**Option 2 — Consolidate controls into fewer top-level settings keys.** Rather than removing scope, reduce the number of *keys* each module contributes per widget by storing a module's settings as one nested object instead of N flat controls. Because Aurora's frontend runtime never reads Elementor settings directly — `Animation_Module::get_render_attributes()` is the only consumer, and it produces the `data-*` attributes/classes the JS effect files actually read — this change is isolated entirely to the PHP control-registration layer. None of the 69 JS effect files touched in Part 2 would need to change.

Two implementation strategies for Option 2 were evaluated:

- A fully custom Elementor control (`Base_Data_Control` subclass with its own Backbone view) — technically sound, but forfeits Elementor's native field UI (color picker, slider, switcher) for a hand-rolled equivalent that must be maintained indefinitely and won't automatically inherit future native UI improvements.
- A single-row `Controls_Manager::REPEATER` per module, with the module's existing native field types (`COLOR`, `SLIDER`, `SWITCHER`, etc.) registered as repeater sub-fields. This is the same mechanism Elementor's own `ICON` and `MEDIA` controls use internally (storing a multi-property object under one settings key with full native UI) — it keeps every field pixel- and behavior-identical to today, while collapsing N settings keys into 1. The only cost is suppressing the repeater's default list-management chrome (add/remove row, drag handle) via a small amount of CSS/JS, since the UI is designed for repeatable *lists*, not a single fixed settings block — a minor, contained risk if a future Elementor version changes the repeater's internal markup.

### Recommendation

Ship both, in this order:

1. **Immediately, regardless of anything else:** scope Animate Children Elements to `section`/`column`/`container` only. This is not a compromise — it's fixing a control that never made sense on non-container widgets in the first place, and it removes 9 controls from every other widget's settings model for free.
2. **As the durable fix:** consolidate each module's controls behind a single-row Repeater, one module at a time, starting with Cursor Follow (smallest field count, 10 → 1). This is the option that actually reduces Aurora's structural contribution to *any* future third-party plugin with a similar uncached-tree-walk bug — not just the one found this time — without asking the user to give up any feature or widget coverage. Narrowing Cursor Follow's or Text Animation's widget scope (the rest of Option 1) remains available as a faster interim step if the Repeater work is deprioritized, but it trades away functionality where Option 2 does not.

This has not yet been implemented pending confirmation to proceed.

---

## Part 4 — Risk of Recurrence With Other Themes/Plugins

This is not a CMSMasters-specific risk. The bug lives in a companion **plugin** (`cmsmasters-elementor-addon`), not in the "Zen Retreat" **theme** package itself — themes rarely inject their own Backbone/Marionette logic into the Elementor editor; that is almost always the job of a bundled Elementor-addon plugin. Multi-purpose premium themes on marketplaces like ThemeForest commonly ship exactly this kind of companion addon suite, frequently including "enhanced Navigator", mini-map, or editor-productivity features that walk the element tree.

Two conditions both need to hold for this class of bug to surface as a visible freeze:
1. A page with a non-trivial number of elements (the cost is `O(elements × total registered controls)`).
2. Some active plugin's editor-enhancement script performing frequent, uncached full-tree reads of element settings.

Aurora's registered-control count is a permanent multiplier for condition 2, independent of which theme or addon the user is running — it is not specific to CMSMasters and will recur with any other third-party plugin that has a similarly uncached tree-walking feature. Given how common this feature category is among premium Elementor addon suites, this should be treated as a **real, recurring risk category**, not a one-off. This is the primary argument for proceeding with Part 3's recommendation independent of whether or when another specific third-party bug is identified.

---

## Consolidated Status Table

| ID | Area | Status | Version |
|---|---|---|---|
| F-1 | Third-party Navigator Indicator uncached full-tree walk | Identified — not patchable from Aurora | — |
| F-2 | `window.anime`/`gsap`/`Motion` global collision | ✅ Fixed | 0.1.1 / 0.1.2 |
| F-2b | Morph Card `anime()` v3-API misuse (pre-existing, unrelated bug) | ✅ Fixed | 0.1.2 |
| F-3 | Dead `common` hook registrations (Gradient, Glassmorphism, Image Effects) | ✅ Fixed | 0.1.3 |
| Part 3, Option 1 (partial) | Scope Animate Children to structural elements only | ⬜ Recommended, not yet shipped | — |
| Part 3, Option 1 (full) | Narrow Cursor Follow / Text Animation widget scope | ⬜ Requires product decision on widget allow-list | — |
| Part 3, Option 2 | Consolidate module controls via single-row Repeater | ⬜ Recommended as durable fix, not yet started | — |

---

## Recommended Implementation Order

| Priority | Action | Effort | Impact |
|---|---|---|---|
| 1 | Scope `Children_Animation_Controls::applies_to_element()` to `section`/`column`/`container`; drop its now-dead `common` hook entry | Low | Removes 9 controls/widget for the majority of widget types; also a correctness fix |
| 2 | Pilot single-row Repeater consolidation on Cursor Follow (10 controls → 1) | Medium | Validates the pattern before rolling out to the other two modules; no JS runtime changes required |
| 3 | Roll out the same Repeater consolidation to Animate Children Elements and Text Animation | Medium | Reduces Aurora's total `common`-hook footprint from 33 keys/widget to 3 |
| 4 | Decide, with user input, whether to additionally narrow Cursor Follow / Text Animation's widget scope | Low (decision) + Low (implementation) | Optional further reduction; trades scope for a small additional performance gain once Option 2 is in place |
