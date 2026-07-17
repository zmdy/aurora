/* global anime */
import { registerEffect } from '../../core/registry.js';

// Anime.js port of gs-18 Unfold 3D (see ml-24's header comment).
var effect = {
    id: 'ml-36',
    run: function (units, opts) {
        units.forEach(function (u) {
            u.style.transformOrigin = 'left center';
            u.style.transformStyle = 'preserve-3d';
        });
        anime.animate(units, {
            rotateY: [-90, 0],
            rotateX: [45, 0],
            scale: [0.5, 1],
            opacity: [0, 1],
            duration: opts.duration,
            delay: function (el, i) { return opts.delay + i * opts.stagger; },
            ease: 'outExpo',
        });
    },
};

registerEffect(effect);
export default effect;
