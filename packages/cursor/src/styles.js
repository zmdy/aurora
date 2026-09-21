/**
 * Base stylesheet of the cursor. Injected once by the module.
 *
 * Structure: each of `.aurora-cursor-dot` / `.aurora-cursor-ring` is a fixed
 * box that JavaScript moves with `transform`. Its visual (`::before`) carries
 * the color and the hover scale, so scaling never fights with positioning.
 */
export var css = [
    '.aurora-cursor-dot,.aurora-cursor-ring{',
    'position:fixed;top:0;left:0;z-index:var(--aurora-cursor-z,9999);',
    'pointer-events:none;opacity:0;transition:opacity 200ms ease;will-change:transform;',
    '}',
    '.aurora-cursor-dot::before,.aurora-cursor-ring::before{',
    'content:"";position:absolute;inset:0;box-sizing:border-box;border-radius:50%;',
    'transform:scale(var(--aurora-cursor-scale,1));',
    'transition:transform 150ms ease,background-color 150ms ease,border-color 150ms ease;',
    '}',
    '.aurora-cursor-dot::before{background:var(--aurora-cursor-color,#ff7a2f);}',
    '.aurora-cursor-ring::before{',
    'border:1px solid var(--aurora-cursor-color,#7c6cff);',
    'background:color-mix(in srgb,var(--aurora-cursor-color,#7c6cff) 12%,transparent);',
    '}',
    '.aurora-cursor-native-hidden,.aurora-cursor-native-hidden *{cursor:none!important;}',
    '.aurora-cursor-native-hidden :is(input,textarea,select,[contenteditable="true"]){cursor:auto!important;}',
    '@media (prefers-reduced-motion:reduce){',
    '.aurora-cursor-dot,.aurora-cursor-ring{display:none!important;}',
    '.aurora-cursor-native-hidden,.aurora-cursor-native-hidden *{cursor:auto!important;}',
    '}',
    '@media (hover:none){',
    '.aurora-cursor-dot,.aurora-cursor-ring{display:none!important;}',
    '.aurora-cursor-native-hidden,.aurora-cursor-native-hidden *{cursor:auto!important;}',
    '}',
].join('');
