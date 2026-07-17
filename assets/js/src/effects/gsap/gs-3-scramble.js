import { registerEffect } from '../../core/registry.js';
import { scrambleTextEffect } from '../../core/helpers.js';

var effect = {
    id: 'gs-3',
    // Operates on the parent element, not the split `units` — see
    // core/engine.js's isSelfManaged()/initTextAnimation().
    selfManaged: true,
    run: function (units, opts, textEl) {
        var original = textEl._auroraOriginal || textEl.innerText;
        textEl.style.opacity = '0';
        // Restore the element (removes split)
        textEl.innerHTML = '';
        textEl.textContent = original;
        scrambleTextEffect(textEl, original, opts.duration, opts.delay);
    },
};

registerEffect(effect);
export default effect;
