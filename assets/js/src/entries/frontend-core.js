/**
 * Aurora Text Animation — FRONTEND CORE bundle entry point.
 *
 * Built into a single flat file (dist/aurora-text-core.js), enqueued on
 * every real (non-editor) page that uses Text Animation. Contains the
 * shared runtime ONLY — no effects are baked in here. Each widget's
 * specific effect arrives separately as its own small chunk, enqueued by
 * PHP alongside this core file (see
 * Text_Animation_Controls::get_render_attributes()), and self-registers
 * into the same `window.AuroraTextEffects` registry the moment it loads.
 */

import { bootstrap } from '../core/elementor-handler.js';

bootstrap();
