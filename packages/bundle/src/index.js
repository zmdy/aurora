/** ESM entry: everything, for bundlers and `import` from npm. */
export { createAurora, defineModule, VERSION } from '@aurora/core';
export { text } from '@aurora/text';
export { children } from '@aurora/children';
export { cursor } from '@aurora/cursor';
export { gradient } from '@aurora/gradient';
export { morphCard } from '@aurora/morph-card';

import { createAurora } from '@aurora/core';
import { text } from '@aurora/text';
import { children } from '@aurora/children';
import { cursor } from '@aurora/cursor';
import { gradient } from '@aurora/gradient';
import { morphCard } from '@aurora/morph-card';

/** Creates a runtime with every module registered. */
export function createFullAurora(config) {
    var aurora = createAurora(config);
    [text, children, cursor, gradient, morphCard].forEach(function (definition) { aurora.register(definition); });
    return aurora;
}
