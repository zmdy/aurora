import { defineModule } from '@aurora/core';
import { schema } from './schema.js';
import { css } from './styles.js';
import { mountZone } from './engine.js';

/**
 * Aurora Cursor Follow.
 *
 * Usage:
 *   <section data-aurora-cursor data-aurora-cursor-ring-size="40"> ... </section>
 *   Aurora.cursor(document.querySelector('.hero'), { dotColor: '#fff' });
 */
export var cursor = defineModule({
    name: 'cursor',
    schema: schema,
    init: function (el, options, ctx) {
        ctx.style('cursor', css);
        var zone = mountZone(el, options);
        return {
            update: function (next) { zone.update(next); },
            destroy: function () { zone.destroy(); },
        };
    },
});

export { schema };
