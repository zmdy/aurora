/**
 * Aurora Text Animation — EDITOR bundle entry point.
 *
 * Built into a single flat file (dist/aurora-text-editor.js), enqueued
 * only inside the Elementor editor/preview context (see
 * Asset_Manager::enqueue_frontend_assets()). Bundles EVERY effect so the
 * panel can preview any dropdown choice instantly, with no per-effect
 * network round trip while editing.
 *
 * Adding effect #26: create the file under ../effects/{gsap,anime}/, add
 * ONE import line below, and add its PHP select option. Nothing else in
 * this file (or core/*) ever needs to change.
 */

// Every import below runs the effect file's own top-level
// registerEffect() call as a side effect — this list is a manifest, not a
// map, deliberately (see core/registry.js for why).
import '../effects/gsap/gs-1-fade-up.js';
import '../effects/gsap/gs-2-clip-reveal.js';
import '../effects/gsap/gs-3-scramble.js';
import '../effects/gsap/gs-4-elastic-bounce.js';
import '../effects/gsap/gs-5-flip-y.js';
import '../effects/gsap/gs-6-slide-in.js';
import '../effects/gsap/gs-7-scale-up.js';
import '../effects/gsap/gs-8-wave.js';
import '../effects/gsap/gs-9-bounce-drop.js';
import '../effects/gsap/gs-10-glitch.js';
import '../effects/gsap/gs-11-rotate-in.js';
import '../effects/gsap/gs-12-slot-machine.js';
import '../effects/gsap/gs-13-spin-in.js';
import '../effects/gsap/gs-14-neon-flicker.js';
import '../effects/gsap/gs-15-crt-boot.js';
import '../effects/gsap/gs-16-domino-fall.js';
import '../effects/gsap/gs-17-pendulum-swing.js';
import '../effects/gsap/gs-18-unfold-3d.js';
import '../effects/gsap/gs-19-stretch-warp.js';
import '../effects/gsap/gs-20-heartbeat.js';
import '../effects/gsap/gs-21-vertical-blinds.js';
import '../effects/gsap/gs-22-rubber-stamp.js';
import '../effects/gsap/gs-23-vhs-tracking.js';
import '../effects/gsap/gs-24-liquid-fill.js';
import '../effects/gsap/gs-25-perspective-fly.js';
import '../effects/gsap/gs-26-cinema-title.js';
import '../effects/gsap/gs-27-text-emerge.js';
import '../effects/gsap/gs-28-stagger-flip-3d.js';
import '../effects/gsap/gs-29-scroll-highlight.js';
import '../effects/gsap/gs-30-text-reveal-wall.js';
import '../effects/gsap/gs-31-letter-roll.js';
import '../effects/gsap/gs-32-elastic-text.js';
import '../effects/gsap/gs-33-letter-swap.js';
import '../effects/gsap/gs-34-mesh-text.js';

import '../effects/anime/ml-1-float-up.js';
import '../effects/anime/ml-2-scale-in.js';
import '../effects/anime/ml-3-drop-down.js';
import '../effects/anime/ml-4-slide-right.js';
import '../effects/anime/ml-5-wave.js';
import '../effects/anime/ml-6-flip-x.js';
import '../effects/anime/ml-7-typewriter.js';
import '../effects/anime/ml-8-blur-reveal.js';
import '../effects/anime/ml-9-skew-in.js';
import '../effects/anime/ml-10-explosion.js';
import '../effects/anime/ml-11-native-split.js';
import '../effects/anime/ml-12-clip-wrap.js';
import '../effects/anime/ml-13-echo-clone.js';
import '../effects/anime/ml-14-native-scramble.js';
import '../effects/anime/ml-15-continuous-wave.js';
import '../effects/anime/ml-16-elastic-slide.js';
import '../effects/anime/ml-17-scatter-converge.js';
import '../effects/anime/ml-18-matrix-rain.js';
import '../effects/anime/ml-19-spiral-in.js';
import '../effects/anime/ml-20-flip-board.js';
import '../effects/anime/ml-21-rgb-split.js';
import '../effects/anime/ml-22-typewriter-delete.js';
import '../effects/anime/ml-23-rotating-dial.js';

// ml-24+ : Anime.js ports of the GSAP-only effects above (gs-4, gs-5,
// gs-6, gs-9..gs-26) — see ml-24-elastic-bounce.js's header comment for
// why this parity set exists (WordPress.org submission prep: GSAP's core
// license isn't GPL-compatible, Anime.js's MIT license is; GSAP stays
// available for now per explicit instruction, this just means dropping it
// later won't lose any effect).
import '../effects/anime/ml-24-elastic-bounce.js';
import '../effects/anime/ml-25-flip-y.js';
import '../effects/anime/ml-26-slide-from-left.js';
import '../effects/anime/ml-27-bounce-drop.js';
import '../effects/anime/ml-28-glitch.js';
import '../effects/anime/ml-29-rotate-in.js';
import '../effects/anime/ml-30-slot-machine.js';
import '../effects/anime/ml-31-spin-in.js';
import '../effects/anime/ml-32-neon-flicker.js';
import '../effects/anime/ml-33-crt-boot.js';
import '../effects/anime/ml-34-domino-fall.js';
import '../effects/anime/ml-35-pendulum-swing.js';
import '../effects/anime/ml-36-unfold-3d.js';
import '../effects/anime/ml-37-stretch-warp.js';
import '../effects/anime/ml-38-heartbeat.js';
import '../effects/anime/ml-39-vertical-blinds.js';
import '../effects/anime/ml-40-rubber-stamp.js';
import '../effects/anime/ml-41-vhs-tracking.js';
import '../effects/anime/ml-42-liquid-fill.js';
import '../effects/anime/ml-43-perspective-fly.js';
import '../effects/anime/ml-44-cinema-title.js';

// ml-45+ : Anime.js ports of the six new effects above (gs-27..gs-32),
// same parity convention as ml-24+.
import '../effects/anime/ml-45-text-emerge.js';
import '../effects/anime/ml-46-stagger-flip-3d.js';
import '../effects/anime/ml-47-scroll-highlight.js';
import '../effects/anime/ml-48-text-reveal-wall.js';
import '../effects/anime/ml-49-letter-roll.js';
import '../effects/anime/ml-50-elastic-text.js';
import '../effects/anime/ml-51-letter-swap.js';
import '../effects/anime/ml-52-mesh-text.js';

import { bootstrap } from '../core/elementor-handler.js';

bootstrap();
