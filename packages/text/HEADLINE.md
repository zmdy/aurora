# Animated Headline

Headline is a composition mode of `@aurora/text`, selected with `mode: 'headline'`.
The existing 53 split-text effects keep `mode: 'effects'` as the default. A
separate mode keeps their timing and effect-specific options backward compatible.
No Elementor or Pro Elements code, assets or runtime dependencies are used.

## Generic contract

The runtime owns three plain-text segments: `beforeText`, `highlightedText`, and
`afterText`. Only the middle segment animates. Empty highlighted text falls back
to the element's original text. All strings are rendered as text, never HTML.

- `animationStyle: 'highlighted'`: draws `animationShape` around the phrase.
  Shapes: `underline`, `double-underline`, `circle`, `zigzag`, `strike`,
  `aurora-orbit`, `aurora-wave`, `aurora-spark`, `aurora-frame`, `text-highlighter`.
  The highlighter sweeps a translucent marker behind the fixed phrase, using the
  existing Text Highlighter renderer and the two shape colors; stroke width
  applies only to SVG outlines. `zigzag` and `strike` are plain single-stroke
  lines; `aurora-orbit`/`aurora-wave`/`aurora-frame` combine multiple original
  SVG subpaths with a two-color stroke (`headlineColor`, `headlineColor2`,
  `strokeWidth`) — `aurora-frame` draws four corner brackets, like a focus
  reticle, as one continuous multi-subpath stroke.
- `animationStyle: 'rotating'`: starts with the highlighted phrase, then cycles
  through `rotatingText` (one phrase per line; blank and duplicate lines removed).
  `rotationEffect` supports two families. Whole-word entrances swap the entire
  phrase at once: `prism-rise`, `comet-slide`, `split-flap`, `soft-focus`,
  `curtain-wipe` (a hard-edge clip-path wipe) and `drop-bounce` (an overshoot
  drop with a settle). Letter effects animate each grapheme with its own
  stagger: `airport-flip`, `scramble`, `sparkles-text`, `text-reveal-wall`,
  `letter-swap`, `echo-clone`, `typewriter` (a near-instant per-letter strike
  plus a blinking caret once the phrase is fully typed) and `wave-pop` (each
  letter crests at a different moment, reading as one traveling wave). These
  are compact headline adaptations: Reveal Wall resolves three rows into
  each letter without expanding the heading into a full-screen wall, and
  Letter Swap shows a genuine swap from an accent-colored placeholder glyph
  to the real letter rather than repeating the same glyph.
  Unicode graphemes remain intact. `letterStagger` is capped at 65% of the
  duration for long phrases; `rotationColor` and `rotationColor2` set accents.
  All phrases share a grid cell, reserving the largest width/height to avoid
  moving the surrounding text. Long phrases wrap within the available width.
- `duration`, `delay` and `trigger` reuse Text's existing option names.
  `holdDuration` is the reading time between transitions. `headlineLoop: false`
  draws a highlight once or stops at the last rotating phrase.
- `headlineAutoplay` controls automatic playback. `pauseOnHover` also pauses
  while focus is inside the element. Background tabs and offscreen instances
  suspend playback. Reduced motion shows a static composition without timers.

```html
<h2 data-aurora-text data-aurora-text-mode="headline"
    data-aurora-text-options='{"beforeText":"Create","highlightedText":"extraordinary","afterText":"experiences.","animationStyle":"highlighted","animationShape":"aurora-orbit","trigger":"load"}'>
  Create extraordinary experiences.
</h2>
<script src="aurora.core.min.js"></script>
<script src="aurora.text.min.js"></script>
```

```js
const headline = Aurora.text(document.querySelector('h2'), {
  mode: 'headline', trigger: 'load',
  beforeText: 'Create', highlightedText: 'extraordinary', afterText: 'experiences.',
  animationStyle: 'rotating', rotatingText: 'memorable\noriginal',
  rotationEffect: 'prism-rise', duration: 700, holdDuration: 1800
});
headline.api.pause();
headline.api.play();
headline.api.next();
headline.replay();
headline.update({ animationStyle: 'highlighted', animationShape: 'aurora-wave' });
headline.destroy(); // restores the actual original DOM nodes and their listeners
```

The accessible sentence includes every rotating phrase once; animation does not
spam a live region. Original heading semantics remain intact. SVGs are decorative.
The stylesheet uses the core's nonce-aware injection, and all timers, animations,
observers and listeners are cleaned up on update/destroy. The rotating `api.next()`
also works with autoplay disabled. `aurora:text:headline-change` is emitted with
`index`, `text`, and `style` when a visual transition starts.

## Elementor adapter

With the Text module enabled, add **Aurora Animated Headline** from the widget
panel (works with Elementor Free). Content fields and effect choices are generated
from the same JS option schema. Style controls add typography, text/accent colors,
responsive alignment, and a whitelisted heading tag. PHP outputs a readable
fallback plus `data-aurora-text-options`; the editor handler calls `Aurora.text`
with those same options after control changes. Existing Heading widgets can also
select **Aurora → Text mode → Headline**.

The conceptual reference is Elementor's
[Animated Headline interface](https://elementor.com/help/animated-headline-pro/).
The SVG shapes, transition definitions, lifecycle and integration are Aurora's
own implementation. Preview the feature at `docs/modules/text.html#headline`.

Build with `npm run build`, `npm run build:elementor`, and `npm run build:site`.
`npm run pack` creates the installable ZIP. The Text gzip budget is 41 KB, including the composition runtime, letter
transitions and shared schema. Highlight strokes draw sequentially, hold, then
fade before the next loop; one-shot highlights remain visible.
