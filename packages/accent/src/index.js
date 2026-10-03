import { defineModule } from '@aurora/core';
import { schema } from './schema.js';
import { mountAccent } from './engine.js';

/**
 * Aurora Accent: a hand-drawn-feeling SVG underline, circle, zigzag, strike
 * or frame around existing markup — without reconstructing it.
 *
 * Unlike the text module's headline shapes, Accent never reads or rewrites
 * the target's children: it only appends one absolutely-positioned SVG
 * alongside them, so any markup already inside the target (manual spans, an
 * inline icon, a <br>) survives untouched.
 *
 * Usage:
 *   <span data-aurora-accent="underline" data-aurora-accent-color="#B21F24">
 *     transformam realidades
 *   </span>
 *   Aurora.accent(document.querySelector('.hero mark'), { shape: 'circle' });
 */
export var accent = defineModule({
    name: 'accent',
    schema: schema,
    init: function (el, options, ctx) {
        return mountAccent(el, options, ctx);
    },
});

export { schema };
