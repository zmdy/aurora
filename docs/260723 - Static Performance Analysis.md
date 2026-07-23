# 260723 - Static Performance Analysis

**Plugin:** Aurora for Elementor  
**Date:** 2026-07-23  
**Scope:** All PHP files in `includes/` + all JS files in `assets/js/` (excluding `vendor/` and `dist/`)  
**Context:** WordPress + Elementor — every render hook fires once per element per page load. The editor reprocesses on every panel control interaction.

---

## Executive Summary

The analysis found **25 issues in JavaScript** and **9 issues in PHP**, across four severity levels.

| Severity | JS | PHP | Total |
|---|---|---|---|
| 🔴 Critical | 3 | — | 3 |
| 🟠 High | 9 | 4 | 13 |
| 🟡 Medium | 8 | 4 | 12 |
| 🔵 Low | 5 | 1 | 6 |

**Key findings:**
- Three RAF/resize loops that leak on every editor interaction (GPU crash risk in extended editing sessions).
- Four unthrottled `mousemove` handlers without `passive: true`, causing forced reflows at 60–120 fps.
- Perpetual Anime.js loops (`loop: true`) with no stored instance — cannot be cancelled on teardown.
- `file_exists()` for GSAP executed as 4 independent filesystem calls per request across isolated class contexts.
- All plugin assets loaded unconditionally on every page, including non-Elementor pages.

---

## JavaScript Issues

### 🔴 Critical

---

#### [C-1] Liquid Warp RAF Loop — No `cancelAnimationFrame` · `image-effects.js` · Lines 696–720

**Problematic code:**
```js
var render = function () {
    if (!active.canvas) return;
    time += 0.05;
    // ...canvas draw...
    requestAnimationFrame(render);  // ID never stored
};
render();
```

**Root cause:** The `liquid-warp` effect starts an unconditional `requestAnimationFrame` loop. The RAF ID is **never stored**. `clearImageInteractions()` sets `active.canvas = null` but never calls `cancelAnimationFrame()`. Each editor re-render (every control interaction) spawns a new loop without cancelling the previous one.

**Impact in Elementor context:** After an editing session with five Liquid Warp images and 10 slider drags, there can be 50+ ghost RAF loops drawing to orphaned canvases. This saturates GPU compositing and can crash the editor tab.

**Fix:**
```js
active.rafId = null;
var render = function () {
    if (!active.canvas) return;
    // ...
    active.rafId = requestAnimationFrame(render);
};
render();

// In clearImageInteractions():
if (active.rafId) {
    cancelAnimationFrame(active.rafId);
    active.rafId = null;
}
```
Also add an `IntersectionObserver` to pause rendering when the element is off-screen (mirror the pattern already used in `gradient-module.js`).

---

#### [C-2] WebGL Canvas Resize Listener Leak — No Removal, No Debounce · `gradient-module.js` · Line 373

**Problematic code:**
```js
window.addEventListener('resize', resizeCanvas);  // local closure — no removal possible
resizeCanvas();
```

**Root cause:** `resizeCanvas` is a local closure attached to `window` on every `applyMeshShader()` call. `clearMeshShader()` removes the `mouseHandler`, `observer`, and `rafId` from the active state, but has **no reference to `resizeCanvas`** and therefore never removes it. Every Elementor control drag re-invokes `applyMeshShader()`, leaking another handler.

**Impact:** After 20 slider drags, 20 `resize` handlers are active. Each one calls `gl.viewport()`, `gl.uniform2f()`, and reads `el.offsetWidth` (forced layout reflow). With no debounce, resizing the browser window fires all of them at the browser's event rate (~60 fps).

**Fix:**
```js
// Store the closure in the active state:
activeMeshShaders.set(el, {
    ...,
    resizeHandler: resizeCanvas
});

// In clearMeshShader():
if (active.resizeHandler) {
    window.removeEventListener('resize', active.resizeHandler);
}

// Add debounce to the handler:
var _resizeTimer;
function resizeCanvas() {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(function() {
        /* actual gl.viewport + uniform update */
    }, 150);
}
```

---

#### [C-3] 2D Canvas Resize Listener Leak — No Removal, No Debounce · `image-effects.js` · Line 689

**Problematic code:**
```js
var resize = function () {
    canvas.width = box.offsetWidth || 300;
    canvas.height = box.offsetHeight || 300;
};
window.addEventListener('resize', resize);  // local closure — no removal possible
```

Same class of bug as C-2, on the 2D canvas path. `clearImageInteractions()` removes `mouseMoveHandler` and `mouseLeaveHandler` but **cannot reach** the `resize` closure. Accumulates one leaked handler per editor interaction.

**Fix:** Same pattern as C-2 — store `resize` in the active state map, call `window.removeEventListener` in cleanup, add 150ms debounce.

---

### 🟠 High

---

#### [H-1] Unthrottled `mousemove` — Follow Mouse Spotlight · `gradient-module.js` · Lines 192–210

**Problematic code:**
```js
function handler(e) {
    var rect = trackEl.getBoundingClientRect();  // forced layout read every event
    pos.x = rect.width ? ((e.clientX - rect.left) / rect.width) * 100 : 50;
    pos.y = rect.height ? ((e.clientY - rect.top) / rect.height) * 100 : 50;
    render();  // writes backgroundImage inline → style mutation → repaint
}
trackEl.addEventListener('mousemove', handler);  // no passive flag
```

**Root cause:** Every `mousemove` event (60–120 fps on most input devices): (1) `getBoundingClientRect()` — forced layout reflow; (2) `render()` — inline `backgroundImage` mutation triggering a full paint cycle.

**Fix:**
```js
var ticking = false;
function handler(e) {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function() {
        var rect = trackEl.getBoundingClientRect();
        pos.x = rect.width ? ((e.clientX - rect.left) / rect.width) * 100 : 50;
        pos.y = rect.height ? ((e.clientY - rect.top) / rect.height) * 100 : 50;
        render();
        ticking = false;
    });
}
trackEl.addEventListener('mousemove', handler, { passive: true });
```

---

#### [H-2] Unthrottled `mousemove` — liquidCursor WebGL · `gradient-module.js` · Lines 354–361

**Problematic code:**
```js
mouseHandler = function (e) {
    var rect = el.getBoundingClientRect();  // layout read every mouse event
    targetMouse.x = e.clientX - rect.left;
    targetMouse.y = rect.height - (e.clientY - rect.top);
};
el.addEventListener('mousemove', mouseHandler);  // no passive flag
```

The actual WebGL uniform update happens in the RAF loop (correct). The concern is the `getBoundingClientRect()` call on the main thread at every mouse event with no throttle and no `passive` flag.

**Fix:**
```js
var cachedRect = el.getBoundingClientRect();
// Refresh cachedRect inside the resize handler only.
mouseHandler = function (e) {
    targetMouse.x = e.clientX - cachedRect.left;
    targetMouse.y = cachedRect.height - (e.clientY - cachedRect.top);
};
el.addEventListener('mousemove', mouseHandler, { passive: true });
```

---

#### [H-3] Global `document` mousemove — Never Removed, No Passive Flag · `cursor-follow.js` · Line 255

**Problematic code:**
```js
document.addEventListener('mousemove', onMouseMove);  // module-level, never removed
```

`onMouseMove` calls `target.closest(zone.interactiveSelector)` and `target.closest(zone.imageSelector)` — two DOM traversals per event — then calls `render()` which writes `transform` inline on two elements. This listener lives for the entire page session and without `{ passive: true }` blocks the browser's threaded input handling.

**Fix:**
```js
var cursorTicking = false;
function onMouseMove(e) {
    if (!zoneStack.length || cursorTicking) return;
    cursorTicking = true;
    requestAnimationFrame(function() {
        ensureCursorEls();
        updateHoverState(e.target);
        render();
        cursorTicking = false;
    });
}
document.addEventListener('mousemove', onMouseMove, { passive: true });
```

---

#### [H-4] Unthrottled `mousemove` — 3D Tilt · `image-effects.js` · Lines 625–637

**Problematic code:**
```js
var mouseMoveHandler = function (e) {
    var rect = box.getBoundingClientRect();   // forced reflow every event
    // ... math ...
    img.style.transform = 'rotateX(...) rotateY(...) scale3d(...)';  // mutation 1
    img.style.boxShadow = '...';                                       // mutation 2
};
wrapper.addEventListener('mousemove', mouseMoveHandler);  // no passive
```

Every mouse event: 1 forced reflow + 2 style mutations on a transitioning property (CSS `transition: 0.1s ease-out` is active). The browser must merge the new value with the in-progress transition every frame.

**Fix:** Same `ticking` + RAF pattern as H-1 and `{ passive: true }`.

---

#### [H-5] `setInterval` at 40ms — Scramble Text, No Handle Stored · `src/core/helpers.js` · Lines 32–50

**Problematic code:**
```js
var handle = setInterval(function () {
    // iterates over finalText.length chars, writes textContent
    el.textContent = output;
    step++;
    if (step > steps) { clearInterval(handle); el.textContent = finalText; }
}, 40);
// handle is never stored outside this scope
```

**Impact:** (1) `handle` is not stored on the element. If `initTextAnimation` runs again (every editor control change), the old interval keeps firing in parallel with the new one — stacking intervals. (2) No `prefers-reduced-motion` check. (3) 40ms = 25 fps of DOM mutations + string iteration.

**Fix:**
```js
// Respect reduced motion:
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = finalText;
    return;
}

// Clear any existing interval before creating a new one:
if (el._auroraScrambleHandle) {
    clearInterval(el._auroraScrambleHandle);
}
el._auroraScrambleHandle = setInterval(function () {
    // ...
    if (step > steps) {
        clearInterval(el._auroraScrambleHandle);
        el._auroraScrambleHandle = null;
        el.textContent = finalText;
    }
}, 40);
```

---

#### [H-6] Three Nested `setInterval` Chains — No Cleanup Handle · `src/effects/anime/ml-22-typewriter-delete.js` · Lines 24–48

Three levels of chained intervals (`typeHandle` → `deleteHandle` → `retypeHandle`), with `typeSpeed` as low as 20ms (50 fps). **None of the three handles are stored** outside their closures. Calling `teardownTextAnimation()` mid-animation leaves all three running indefinitely, mutating `el.textContent` on a potentially detached node.

**Fix:**
```js
// At the top of the effect's run() function:
if (textEl._auroraTypeHandles) {
    textEl._auroraTypeHandles.forEach(clearInterval);
}
textEl._auroraTypeHandles = [];

// When creating each interval:
textEl._auroraTypeHandles.push(typeHandle);
```

---

#### [H-7] `window.Aurora` Global Namespace Pollution · `morph-card.js` · Lines 733–735

**Problematic code:**
```js
window.Aurora = window.Aurora || {};
window.Aurora.MorphCard = MorphCard;
window.Aurora.MorphCard = Sequence;
```

In a WordPress environment, dozens of plugins and themes run in the same page context. Another plugin using `window.Aurora` for a different purpose will silently overwrite or be overwritten.

**Fix:**
```js
window.AuroraPlugin = window.AuroraPlugin || {};
window.AuroraPlugin.MorphCard = MorphCard;
window.AuroraPlugin.MorphCardSequence = Sequence;
```

---

#### [H-8] `loop: true` Anime.js Animation — No Handle Stored, Not Cancellable · `src/effects/anime/ml-15-continuous-wave.js` · Lines 31–38

**Problematic code:**
```js
anime.animate(units, {
    translateY: [0, -14],
    loop: true,
    alternate: true,
    ease: 'inOutSine',
    // returned instance discarded
});
```

The animation instance returned by `anime.animate()` is not stored. When `teardownTextAnimation()` is called (user disables the effect in the editor), there is no way to stop the perpetual loop. Anime.js continues driving every character span's `translateY` indefinitely. If `replay: true` is set, restarting the opacity tween conflicts with the still-running `translateY` loop.

**Fix:**
```js
var waveAnim = anime.animate(units, { ..., loop: true });
units.forEach(function(u) { u._auroraLoopAnim = waveAnim; });

// In teardown / at the top of run():
if (units[0] && units[0]._auroraLoopAnim) {
    units[0]._auroraLoopAnim.pause();
}
```
Add `prefers-reduced-motion` guard.

---

#### [H-9] `loop: true` Rotation + Detached-Node Memory Leak · `src/effects/anime/ml-23-rotating-dial.js` · Lines 35–40

**Problematic code:**
```js
anime.animate(dial, {
    rotate: 360,
    loop: true,
    ease: 'linear',
    // returned instance discarded
});
```

Same issue as H-8. Additionally, since this effect is `selfManaged` and replaces `textEl.innerHTML` with a custom `<div>` dial on teardown, the `dial` element is removed from the DOM while Anime.js still holds a reference to it — a classic detached-node memory leak preventing garbage collection.

**Fix:** Store the animation instance, call `.pause()` before any DOM manipulation, then remove the element.

---

### 🟡 Medium

---

#### [M-1] Seven Concurrent Polling Intervals at Boot (80–100ms) · Multiple Files

`waitForGsap()`, `waitForEntranceLibs()`, `waitForLibs()`, and handler-registration polls in five separate modules all start polling intervals simultaneously on page load. All self-clear within 6 seconds (correct), but during that window they collectively fire ~75 times/second checking `typeof gsap !== 'undefined'`.

**Files:** `children-animations.js`, `image-effects.js`, `src/core/engine.js`, `cursor-follow.js`, `gradient-module.js`, `src/core/elementor-handler.js`

**Fix:** A single shared promise at the plugin level resolves for all modules:
```js
// aurora-libs-ready.js (shared):
var auroraLibsReady = new Promise(function(resolve) {
    window.addEventListener('load', function() {
        resolve({ gsap: typeof gsap !== 'undefined', anime: typeof anime !== 'undefined' });
    }, { once: true });
});
```

---

#### [M-2] `rafId` Stored as `null` in WeakMap — `cancelAnimationFrame` in Cleanup is Always a No-Op · `gradient-module.js` · Lines 412–417

**Problematic code:**
```js
var rafId = null;
activeMeshShaders.set(el, {
    ...,
    rafId: rafId,  // stores the VALUE null, not a reference to the variable
});
function render() {
    // ...
    rafId = requestAnimationFrame(render);  // updates the local var, not the WeakMap entry
}
```

The WeakMap stores the primitive value `null` at init time. The `render()` closure reassigns the local `rafId` variable but the object in the WeakMap is never updated. `clearMeshShader()` always reads `active.rafId === null`, so `cancelAnimationFrame(null)` is always a no-op. The only thing stopping the loop is the `IntersectionObserver` visibility flag.

**Fix:** Use a mutable wrapper object shared between the map entry and the closure:
```js
var state = { canvas: canvas, observer: null, rafId: null, mouseHandler: mouseHandler };
activeMeshShaders.set(el, state);

function render() {
    // ...
    state.rafId = requestAnimationFrame(render);  // mutates the shared object
}
// In clearMeshShader(): cancelAnimationFrame(state.rafId) now correctly cancels the loop
```

---

#### [M-3] Recursive `setTimeout` Typewriter Chain — Not Cancellable from `destroy()` · `morph-card.js` · Lines 528–543

The morph card's typewriter uses recursive `setTimeout` calls (55–95ms per character). The `!el.isConnected` guard prevents DOM mutations on detached nodes (good), but there is no way to abort a mid-flight typewriter from `Sequence.destroy()`. The open timeout chain holds element and `resolve` references until the text completes.

**Fix:** Track the active handle and cancel it in `destroy()`:
```js
this._typewriterHandle = setTimeout(step, delay);
// In destroy():
clearTimeout(this._typewriterHandle);
```

---

#### [M-4] `querySelectorAll` on Every `onElementChange` Event in Editor · `gradient-module.js` · Lines 542–544

`findTextLeaves()` calls `textEl.querySelectorAll('.aurora-char, .aurora-word, ...')` inside `clearTextGradient()`, which runs on every editor control change. For a heading split into 100 characters, this is a DOM query over 100 nodes followed by 9 property clears on each.

**Fix:** Cache the leaf spans on the element:
```js
textEl._auroraLeaves = textEl._auroraLeaves || findTextLeaves(textEl);
var leaves = textEl._auroraLeaves;
// Invalidate cache when text content changes
```

---

#### [M-5] `getBoundingClientRect()` × N Words in `splitIntoLines()` · `src/core/dom.js` · Lines 127–131

**Problematic code:**
```js
wordSpans.forEach(function (span) {
    var top = Math.round(span.getBoundingClientRect().top);  // N forced layout reads
    // ...
});
```

For a 100-word paragraph, this forces 100 sequential layout reads on every widget init/reinit. In the editor, this fires every time any text animation control changes.

**Note:** The reads happen after all appends are complete, so the browser only computes layout once (not N times). The actual cost is one flush. This is medium severity rather than high because modern browsers batch sequential `getBoundingClientRect` calls efficiently in this pattern. The cleaner alternative is `offsetTop` where applicable.

---

#### [M-6] `mouseenter`/`mouseleave` Handlers Attached but Never Removed · `cursor-follow.js` · Lines 90–103

**Problematic code:**
```js
function bindZoneEvents(wrapper) {
    if (wrapper._auroraCursorZoneBound) return;
    wrapper._auroraCursorZoneBound = true;
    wrapper.addEventListener('mouseenter', function () { ... });  // anonymous, no reference
    wrapper.addEventListener('mouseleave', function () { ... });  // anonymous, no reference
}
```

`teardownZone()` removes the wrapper from `zoneConfigs` (making handlers no-ops) but never calls `removeEventListener`. The anonymous closures accumulate one pair per zone per page load, never explicitly removed.

**Fix:**
```js
var enterHandler = function() { ... };
var leaveHandler = function() { ... };
wrapper._auroraCursorHandlers = { enter: enterHandler, leave: leaveHandler };
wrapper.addEventListener('mouseenter', enterHandler);
wrapper.addEventListener('mouseleave', leaveHandler);

// In teardownZone():
if (wrapper._auroraCursorHandlers) {
    wrapper.removeEventListener('mouseenter', wrapper._auroraCursorHandlers.enter);
    wrapper.removeEventListener('mouseleave', wrapper._auroraCursorHandlers.leave);
    wrapper._auroraCursorHandlers = null;
}
```

---

#### [M-7] WebGL Uniform Location Queries Inside Loop on Every Settings Change · `gradient-module.js` · Lines 330–339

**Problematic code:**
```js
for (var i = 0; i < stopCount; i++) {
    var colorLoc = gl.getUniformLocation(program, 'u_stops[' + i + ']');   // per-iteration
    var offsetLoc = gl.getUniformLocation(program, 'u_offsets[' + i + ']'); // per-iteration
    // ...
}
```

`gl.getUniformLocation()` is called twice per color stop inside the loop on every `applyMeshShader()` invocation. Uniform locations for a given program are stable — they only need to be queried once and cached.

**Fix:** Query locations once when the program is linked, store in the active state object, reuse on every update pass.

---

#### [M-8] `getComputedStyle()` × 3 on Every Morph Transition · `morph-card.js` · Lines 445–462

**Problematic code:**
```js
zones.forEach((zone) => {
    const cs = getComputedStyle(zone);  // forces style flush × 3 zones per morph
    // ...
});
```

Three `getComputedStyle()` calls per morph (header, image, footer zones), triggering a style flush. In a looping morph sequence with short durations, this repeats every few seconds.

**Fix:** Cache computed styles on zones after the first render, invalidate on resize only.

---

### 🔵 Low

---

#### [L-1] `window.AuroraTextEffects` Namespace Pollution · `src/core/registry.js` · Lines 38–42

```js
window.AuroraTextEffects = window.AuroraTextEffects || {};
window.AuroraTextEffects[effect.id] = effect;
```

**Fix:** Consolidate under `window.AuroraPlugin.TextEffects` or scope the registry to the IIFE.

---

#### [L-2] `setTimeout(fn, 80–120)` Delays — Flash-of-Invisible Risk · Multiple Files

Arbitrary delays before animation init create a window where elements are at `opacity: 0` with no animation running. On slow connections this is noticeable.

**Fix:** Replace with double-RAF (~33ms, same "wait for paint" guarantee):
```js
requestAnimationFrame(function() {
    requestAnimationFrame(function() {
        initChildrenAnimation(wrapper, opts);
    });
});
```

---

#### [L-3] No `prefers-reduced-motion` Check on Perpetual Animations · `ml-15`, `ml-23`, All `loop: true` Effects

All perpetual animations must respect the user's motion preference to comply with WCAG 2.1 criterion 2.3.3 (Animation from Interactions).

**Fix:** Add at the top of every effect's `run()` function:
```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    units.forEach(function(u) { u.style.opacity = '1'; });
    return;
}
```

---

#### [L-4] Morph Card Handler Only Registered on `elementor/frontend/init` — Misses Already-Initialised Context · `morph-card.js` · Line 722

Unlike all other Aurora modules (which use the synchronous `tryRegisterHandlerNow()` + poll pattern), the morph card only listens for `elementor/frontend/init`. On cached pages where `elementorFrontend` is already initialised when the script runs, the event never fires and the editor live-preview hook is missed.

**Fix:** Mirror the `tryRegisterHandlerNow()` pattern used by other modules.

---

#### [L-5] Inline `transition` Style Overrides All External CSS Specificity · `image-effects.js` · Line 622

**Problematic code:**
```js
img.style.transition = 'transform 0.1s ease-out, box-shadow 0.1s ease-out';
```

Inline styles have maximum CSS specificity. Any `transition` rule set by Elementor Pro Motion Effects or a theme stylesheet for `.elementor-image img` will be silently ignored while the 3D tilt is active.

**Fix:** Use a CSS class instead:
```css
.aurora-img-tilt-active {
    transition: transform 0.1s ease-out, box-shadow 0.1s ease-out;
}
```
```js
img.classList.add('aurora-img-tilt-active');
// In cleanup:
img.classList.remove('aurora-img-tilt-active');
```

---

---

## PHP Issues

### 🔴 High

---

#### [P-1] `file_exists()` for GSAP Called in 4 Isolated Class Contexts per Request

**Files:** `class-module-manager.php:46` · `class-asset-manager.php:33` · `class-text-animation-controls.php:89` · `class-image-effects-controls.php:170`

`file_exists()` forces a filesystem `stat()` syscall. The same file (`gsap.min.js`) is checked in four completely independent classes on every page request, with no result sharing between them.

**Fix:** Define a constant once in the plugin bootstrap:
```php
// aurora-for-elementor.php — after the existing define() calls:
define( 'AURORA_HAS_GSAP', file_exists( AURORA_PATH . 'assets/js/vendor/gsap.min.js' ) );
```
Replace all four occurrences of `file_exists( AURORA_PATH . 'assets/js/vendor/gsap.min.js' )` with the constant `AURORA_HAS_GSAP`.

---

### 🟠 Medium

---

#### [P-2] All Plugin Assets Loaded Unconditionally on Every Page · `class-asset-manager.php` · Lines 25–224

GSAP (~68KB gzip), Anime.js (~17KB gzip), Motion One, WebGL shader engine, image effects, cursor follow, and all Aurora CSS are enqueued on `wp_enqueue_scripts` on every page — including pages with no Elementor content whatsoever.

**Fix:**
```php
public function enqueue_frontend_assets(): void {
    if ( ! class_exists( '\Elementor\Plugin' ) ) {
        return;
    }
    // Skip pages not built with Elementor — no Aurora widgets are possible there.
    if ( ! \Elementor\Plugin::$instance->db->is_built_with_elementor( get_the_ID() ) ) {
        return;
    }
    // ... existing enqueue logic
}
```

---

#### [P-3] Large Option Arrays Rebuilt on Every `register_fields()` Call · Multiple Controls Files

**Files:** `class-text-animation-controls.php:117–210` · `class-image-effects-controls.php:197–239` · `class-gradient-controls.php:157–181`

Elementor calls `register_controls()` for every registered element type. Arrays of 70+ entries (GSAP + Anime.js effects, gradient types, etc.) are constructed inline from scratch on every invocation — potentially hundreds of transient allocations per editor load.

**Fix:** Lazy-static class methods (PHP `const` cannot hold translated strings, so this pattern is required):
```php
private static ?array $gsap_options = null;

private static function gsap_options(): array {
    if ( null === self::$gsap_options ) {
        self::$gsap_options = [
            'gs-1'  => __( 'Fade Up',         'aurora-for-elementor' ),
            'gs-2'  => __( 'Clip Reveal',     'aurora-for-elementor' ),
            // ...
        ];
    }
    return self::$gsap_options;
}

// In register_fields():
'options' => self::gsap_options(),
```

---

#### [P-4] `$rendered_ids` Array Grows Without Bound — Elementor Loop Widget Risk · `class-animation-module.php` · Lines 26, 172–177

**Problematic code:**
```php
private $rendered_ids = [];

// in before_render():
if ( $id && isset( $this->rendered_ids[ $id ] ) ) { return; }
if ( $id ) { $this->rendered_ids[ $id ] = true; }
```

The deduplication array accumulates element IDs for the entire PHP request lifetime. In Elementor Loop Widget or WooCommerce product loops, IDs from the first loop iteration block reprocessing in subsequent iterations — animations fail silently on all but the first render.

**Fix:** Add a `reset_rendered_ids()` method and call it at the start of each loop iteration via the appropriate hook, or use a more robust composite key:
```php
$class_key = static::class . ':' . $id;
if ( isset( $this->rendered_ids[ $class_key ] ) ) { return; }
$this->rendered_ids[ $class_key ] = true;
```

---

#### [P-5] `preg_replace()` on CSS Selector on Every Render Call — No Cache · Multiple Controls Files

**Files:** `class-children-animation-controls.php:241` · `class-cursor-follow-controls.php:254,258`

`preg_replace()` (internally a PCRE call) runs inside `before_render()` — once per element per page load. For a page with 50 elements using Children Animation, that is 100+ regex executions per request for values that never change at render time.

**Fix:** Short-circuit for the default value (the most common case):
```php
$raw = $settings['aurora_children_selector'] ?? '.elementor-widget';
if ( '.elementor-widget' === $raw ) {
    $selector = '.elementor-widget';
} else {
    $selector = preg_replace( '/[^a-zA-Z0-9_\-\.\s,:#>+~\[\]=^$*|()]/', '', $raw )
        ?: '.elementor-widget';
}
```

---

### 🟡 Medium

---

#### [P-6] Dead Static `$modules` Property in `class-module-manager.php` · Lines 25–32

**Problematic code:**
```php
// Never read — dead code:
private static $modules = [
    Text_Animation_Controls::class,
    Children_Animation_Controls::class,
    // ...
];

// Actually used — different list:
$modules = [ /* local var inside init(), without Children_Animation_Controls */ ];
```

The static property is never read; `init()` constructs a local `$modules` array independently. The two lists diverge (`Children_Animation_Controls` appears in the property but not in the local var). Any developer reading the class property gets a wrong mental model of the loaded modules.

**Fix:** Remove the `private static $modules` property entirely. The `init()` method is already self-contained.

---

#### [P-7] Redundant `sanitize_hex_color()` in Render Path · Multiple Controls Files

**Files:** `class-cursor-follow-controls.php:248–251` · `class-glassmorphism-controls.php:231–232` · `class-image-effects-controls.php:584,611–618`

`sanitize_hex_color()` executes `preg_match()` internally. Values originating from Elementor's `COLOR` control are already sanitized at save time by Elementor's own validation. Re-sanitizing on every render call in `get_render_attributes()` is redundant and adds regex overhead per element.

**Note:** This is safe to remove for COLOR control values. For any programmatically set values not validated by Elementor, keep the sanitization.

---

#### [P-8] `wp_kses_post()` Called Twice Per State Per Render — Never Cached · `class-morph-card-widget.php`

`wp_kses_post()` is one of the most CPU-intensive functions in WordPress core — it parses HTML through the allowed-tags filter using multiple regex passes. With 5 repeater states, this means 10 calls per morph card widget render.

**Fix:**
```php
$settings_hash = md5( serialize( $settings['aurora_mc_states'] ?? [] ) );
$cache_key     = 'aurora_mc_states_' . $this->get_id() . '_' . $settings_hash;
$normalized    = wp_cache_get( $cache_key, 'aurora' );
if ( false === $normalized ) {
    $normalized = array_map( [ $this, 'normalize_state' ], $states );
    wp_cache_set( $cache_key, $normalized, 'aurora', 3600 );
}
```

---

### 🔵 Low

---

#### [P-9] Autoloader Closure Recomputes Prefix String on Every Autoload Call · `aurora-for-elementor.php` · Lines 77–89

**Problematic code:**
```php
spl_autoload_register(
    function ( $class ) {
        $prefix = __NAMESPACE__ . '\\';   // string concatenation on every call
        if ( 0 !== strpos( $class, $prefix ) ) { return; }
        $name = substr( $class, strlen( $prefix ) );   // strlen recomputed
        // ...
    }
);
```

The autoloader is invoked for every class PHP attempts to load, including third-party classes that fail the prefix check immediately. String concatenation and `strlen` are recomputed on every call. With OPcache enabled, impact is minimal but avoidable.

**Fix:**
```php
$aurora_prefix     = __NAMESPACE__ . '\\';
$aurora_prefix_len = strlen( $aurora_prefix );
spl_autoload_register(
    function ( $class ) use ( $aurora_prefix, $aurora_prefix_len ) {
        if ( 0 !== strpos( $class, $aurora_prefix ) ) { return; }
        $name = substr( $class, $aurora_prefix_len );
        $file = AURORA_PATH . 'includes/class-' . strtolower( str_replace( '_', '-', $name ) ) . '.php';
        if ( file_exists( $file ) ) { require $file; }
    }
);
```

---

---

## Confirmed Clean

| Category | Status |
|---|---|
| Unguarded database queries (`$wpdb`, `get_posts`, `WP_Query`) | ✅ None found |
| Heavy loops inside render hooks | ✅ None found |
| `WP_Query` / `get_posts` without caching | ✅ None found |
| `add_action` hooks registered multiple times | ✅ None found |

---

## Consolidated Priority Table

### JavaScript

| ID | Severity | File | Lines | Issue |
|----|----------|------|-------|-------|
| C-1 | 🔴 Critical | `image-effects.js` | 696–720 | Liquid Warp RAF loop leaks on every editor re-render — no `cancelAnimationFrame` |
| C-2 | 🔴 Critical | `gradient-module.js` | 373 | `window.resize` WebGL canvas never removed — accumulates per editor interaction |
| C-3 | 🔴 Critical | `image-effects.js` | 689 | `window.resize` 2D canvas never removed — same accumulation issue |
| H-1 | 🟠 High | `gradient-module.js` | 192–210 | Unthrottled `mousemove` — `getBoundingClientRect` + style mutation every event |
| H-2 | 🟠 High | `gradient-module.js` | 354–361 | Unthrottled `mousemove` for liquidCursor — no `passive` flag |
| H-3 | 🟠 High | `cursor-follow.js` | 255 | Global `document` `mousemove` — permanent, no `passive`, DOM traversal every event |
| H-4 | 🟠 High | `image-effects.js` | 625–637 | Unthrottled `mousemove` for 3D tilt — reflow + 2 style mutations per event |
| H-5 | 🟠 High | `src/core/helpers.js` | 32–50 | `setInterval` 40ms scramble — handle not stored, intervals stack in editor |
| H-6 | 🟠 High | `ml-22-typewriter-delete.js` | 24–48 | 3 nested `setInterval` chains (≥20ms) — no cleanup handle |
| H-7 | 🟠 High | `morph-card.js` | 733–735 | `window.Aurora` global namespace — collision risk with other WP plugins |
| H-8 | 🟠 High | `ml-15-continuous-wave.js` | 31–38 | `loop: true` Anime.js — no instance stored, cannot be stopped |
| H-9 | 🟠 High | `ml-23-rotating-dial.js` | 35–40 | `loop: true` Anime.js + detached-node memory leak on teardown |
| M-1 | 🟡 Medium | Multiple | — | 7 concurrent 80–100ms polling intervals running simultaneously at boot |
| M-2 | 🟡 Medium | `gradient-module.js` | 412–417 | `rafId` stored as primitive `null` — `cancelAnimationFrame` in cleanup is always no-op |
| M-3 | 🟡 Medium | `morph-card.js` | 528–543 | Recursive typewriter `setTimeout` chain not cancellable from `destroy()` |
| M-4 | 🟡 Medium | `gradient-module.js` | 542–544 | `querySelectorAll` over all text spans on every editor `onElementChange` |
| M-5 | 🟡 Medium | `src/core/dom.js` | 127–131 | `getBoundingClientRect()` × N words in `splitIntoLines()` |
| M-6 | 🟡 Medium | `cursor-follow.js` | 90–103 | `mouseenter`/`mouseleave` handlers attached but never removed |
| M-7 | 🟡 Medium | `gradient-module.js` | 330–339 | `gl.getUniformLocation()` queried inside loop on every settings change |
| M-8 | 🟡 Medium | `morph-card.js` | 445–462 | `getComputedStyle()` × 3 on every morph transition |
| L-1 | 🔵 Low | `src/core/registry.js` | 38–42 | `window.AuroraTextEffects` global namespace pollution |
| L-2 | 🔵 Low | Multiple | — | `setTimeout(fn, 80–120)` delays — flash-of-invisible, replace with double-RAF |
| L-3 | 🔵 Low | All `loop: true` effects | — | No `prefers-reduced-motion` checks on perpetual animations (WCAG 2.1, 2.3.3) |
| L-4 | 🔵 Low | `morph-card.js` | 722 | Handler only on `elementor/frontend/init` — misses already-initialised context |
| L-5 | 🔵 Low | `image-effects.js` | 622 | Inline `transition` style overrides all external CSS (max specificity) |

### PHP

| ID | Severity | File(s) | Issue |
|----|----------|---------|-------|
| P-1 | 🔴 High | 4 files | `file_exists()` for GSAP in 4 separate class contexts per request |
| P-2 | 🟠 Medium | `class-asset-manager.php` | All assets enqueued on every page without checking if page uses Elementor |
| P-3 | 🟠 Medium | 3 controls files | Large option arrays rebuilt from scratch on every `register_fields()` call |
| P-4 | 🟠 Medium | `class-animation-module.php` | `$rendered_ids` grows without bound — Elementor Loop Widget fails silently |
| P-5 | 🟠 Medium | 2 controls files | `preg_replace()` for CSS selector on every render call, no cache |
| P-6 | 🟡 Medium | `class-module-manager.php` | Dead static `$modules` property — inconsistent with actual module list |
| P-7 | 🟡 Medium | 3 controls files | Redundant `sanitize_hex_color()` in render path (already sanitized at save) |
| P-8 | 🟡 Medium | `class-morph-card-widget.php` | `wp_kses_post()` called twice per state per render — never cached |
| P-9 | 🔵 Low | `aurora-for-elementor.php` | Autoloader closure recomputes prefix string on every autoload invocation |

---

## Recommended Implementation Order

| Priority | Action | Effort | Impact |
|---|---|---|---|
| 1 | **C-1, C-2, C-3** — Store and cancel RAF/resize listeners correctly | Low | 🔴 Prevents editor crashes during extended editing sessions |
| 2 | **H-1 to H-4** — Add `{ passive: true }` + RAF throttle to all `mousemove` handlers | Low | 🟠 Eliminates forced reflows in hot path |
| 3 | **P-1** — `define('AURORA_HAS_GSAP', ...)` in bootstrap | Trivial | 🔴 Eliminates 3 redundant filesystem calls per request |
| 4 | **H-5, H-6** — Store and clear all `setInterval` handles | Low | 🟠 Prevents interval stacking in editor |
| 5 | **H-8, H-9 + M-2** — Store Anime.js `loop: true` instances, fix stale `rafId` | Low | 🟠 Eliminates zombie animations and memory leaks |
| 6 | **P-2** — Conditional asset enqueue based on `is_built_with_elementor()` | Low | 🟠 Eliminates asset loading on non-Elementor pages |
| 7 | **P-8** — Cache `normalize_state()` / `wp_kses_post()` results | Medium | 🟡 Reduces Morph Card render cost |
| 8 | **P-3** — Lazy-static option arrays | Low | 🟡 Reduces allocations during editor load |
| 9 | **L-3** — `prefers-reduced-motion` on all perpetual effects | Low | 🔵 WCAG 2.1 compliance |
| 10 | **Remaining cleanup** — namespace fixes, cursor handlers, autoloader | Trivial | 🔵 Robustness and maintainability |
