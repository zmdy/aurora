import { text } from '@aurora/text';
import { children } from '@aurora/children';
import { cursor } from '@aurora/cursor';
import { gradient } from '@aurora/gradient';
import { morphCard } from '@aurora/morph-card';
import { getAurora, markReady } from './runtime.js';

var aurora = getAurora();
[text, children, cursor, gradient, morphCard].forEach(function (definition) { aurora.register(definition); });
if ((window.AuroraConfig || {}).autoInit !== false && document.readyState !== 'loading') {
    aurora.init();
    markReady();
}
