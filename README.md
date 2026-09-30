<div align="center">
  <img src="assets/branding/logo_aurora_animated_tagline.svg" alt="Aurora" width="280" />

  <p><strong>The open-source Swiss Army knife for animated web design.</strong></p>

  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License" />
</div>

Aurora is a toolkit of animation modules that works in any page: paste two script tags into plain HTML, add a snippet to Webflow, or install the Elementor plugin. The modules, the attributes and the options are the same everywhere.

No GSAP. Text animation uses [Anime.js](https://animejs.com) v4; everything else uses native CSS, the Web Animations API or WebGL. All modules respect `prefers-reduced-motion`.

## Modules

| Module | What it does | Script (gzip) |
| --- | --- | --- |
| `text` | 53 effects that split text into characters, words or lines | ~34 KB |
| `children` | Staggered entrances, hover and proximity effects for children | ~4 KB |
| `gradient` | Multi-stop gradients for backgrounds, text and icons; WebGL mesh styles | ~8 KB |
| `cursor` | A dot-and-ring cursor inside an element | ~3 KB |
| `morph-card` | A card that morphs between post, profile and polaroid layouts | ~8 KB |

Every module also needs the small runtime, `aurora.core.min.js` (~4.5 KB).

## Use it

### Plain HTML

```html
<h2 data-aurora-text="blur-reveal">Motion, unleashed.</h2>

<script src="aurora.core.min.js"></script>
<script src="aurora.text.min.js"></script>
```

Options are attributes (`data-aurora-text-duration="1200"`), one JSON attribute (`data-aurora-text-options='{"duration":1200}'`) or an object in JavaScript:

```js
var fx = Aurora.text(document.querySelector('h2'), { effect: 'blur-reveal', duration: 1200 });
fx.replay();
fx.destroy();
```

Page settings go in `window.AuroraConfig = { autoInit, observe, nonce, debug }`, defined before the scripts.

The website (`npm run build:site`) has a page per module with a live playground, a complete copy-paste HTML file, and the options table.

### Webflow

Add the scripts in *Custom code*, then use *Custom attributes* on any element. See the Webflow page of the site for the anti-flash snippet and tips for Collection Lists.

### Elementor

`npm run pack` builds `build/aurora-for-elementor.zip`. Install it from *Plugins, Add New, Upload Plugin*. Every option appears as a control in the Advanced tab; controls are generated from the module schemas.

## Repository

```
packages/
  core/         runtime: modules, options, observers, ticker, events
  text/         text module (Anime.js v4)
  children/     animate-children module
  gradient/     gradient module
  cursor/       cursor module
  morph-card/   morph card module
  bundle/       entry points for the distributable scripts
adapters/
  elementor/    WordPress plugin (PHP, generated controls)
site/           website sources (pages are generated from the schemas)
tools/          build, pack and site scripts
```

A module is defined with `defineModule({ name, schema, init })`. The schema is the single source of truth: it drives option parsing, the Elementor controls, the site's playground and the options tables.

## Development

```bash
npm install
npm test            # unit tests (Vitest + jsdom)
npm run test:php    # Elementor adapter smoke test (needs PHP)
npm run build       # dist/: one script per module, an all-in-one script, an ES module, SRI hashes
npm run build:site  # docs/ (the GitHub Pages source)
npm run pack        # build/aurora-for-elementor.zip
```

Gzip size budgets per script are enforced by `npm run build` (`tools/budgets.json`).

Commits follow [Conventional Commits](https://www.conventionalcommits.org).

## Releasing to `main`

`main` ships only the built output — the website and the Elementor plugin — not the monorepo source. To promote the current state of `dev` to `main`:

```bash
# 1. Build the release artifacts
npm run pack         # build/aurora-for-elementor/ + .zip
npm run build:site   # docs/

# 2. Check out main in a separate worktree, without leaving this checkout on dev
git worktree add .worktree-main main
cd .worktree-main

# 3. Replace the curated paths with the freshly built ones
rm -rf plugin docs assets
cp -r ../build/aurora-for-elementor plugin
cp -r ../docs .
cp -r ../assets .
cp ../LICENSE .

# 4. Review the diff, then commit
git status
git add -A
git commit -m "release: promote dev@$(cd .. && git rev-parse --short dev) to main"

# 5. Clean up and push
cd ..
git worktree remove .worktree-main
git push origin main
```

`main` keeps its own `README.md`, scoped to installing and using the built output — it is not copied from this one, and does not carry a `Repository` or `Development` section, since `packages/`, `tools/` and `site/` never ship there. Update it by hand when the "Use it" instructions below change.

## Status

The modules are covered by unit tests and were checked in Chromium. The Elementor adapter has been tested in a live WordPress install with the Hello Elementor theme, in three configurations: Elementor (free), Elementor Pro, and ProElements — no bugs or performance issues found in any of them. The Webflow instructions have not been tested in a live Webflow project yet.

## License

MIT. See [LICENSE](LICENSE).
