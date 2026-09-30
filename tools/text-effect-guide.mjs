import { readFileSync } from 'node:fs';

export const textEffectCatalog = JSON.parse(readFileSync(new URL('../site/data/text-effects.json', import.meta.url), 'utf8'));
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function textEffectGuide(schema) {
    const expected = schema.options.effect.values.map(value => typeof value === 'string' ? value : value.value);
    const ids = textEffectCatalog.effects.map(effect => effect.id);
    if (new Set(ids).size !== ids.length || expected.length !== ids.length || expected.some(id => !ids.includes(id))) {
        throw new Error('Text effect guide must cover every registered effect exactly once.');
    }
    for (const effect of textEffectCatalog.effects) {
        for (const key of ['name', 'description', 'resembles', 'useWhen', 'avoidWhen', 'playback']) {
            if (typeof effect[key] !== 'string' || !effect[key].trim()) throw new Error(`Missing ${key} for ${effect.id}`);
        }
        if (!textEffectCatalog.playbackDefinitions[effect.playback]) throw new Error(`Unknown playback for ${effect.id}`);
    }
    const fields = [['resembles', 'Feels like'], ['useWhen', 'When to use'], ['avoidWhen', 'Keep in mind'], ['playback', 'Motion']];
    const value = (effect, key) => key === 'playback' ? textEffectCatalog.playbackDefinitions[effect.playback] : effect[key];
    const details = (effect, live) => '<p' + (live ? ' data-guide="description"' : '') + '>' + esc(effect.description) + '</p><dl>' + fields.map(([key, label]) =>
        '<div><dt>' + label + '</dt><dd' + (live ? ' data-guide="' + key + '"' : '') + '>' + esc(value(effect, key)) + '</dd></div>').join('') + '</dl>';
    const initial = textEffectCatalog.effects.find(effect => effect.id === 'slide-in');
    return {
        panel: '<aside class="effect-guide" id="effect-guide" aria-labelledby="effect-guide-title"><div class="effect-guide__heading"><h3 id="effect-guide-title">' + esc(initial.name) + '</h3><a href="#text-effect-guide">Compare all 53 effects ↓</a></div><div id="effect-guide-content" aria-live="polite" aria-atomic="true">' + details(initial, true) + '</div></aside>',
        catalog: '<section class="block" id="text-effect-guide"><div class="wrap"><h2>Text effect selection guide</h2><p>' + esc(textEffectCatalog.selectionGuidance) + '</p><p><a href="../data/text-effects.json" type="application/json">Structured catalog (JSON) — for AI assistants and integrations</a></p><details class="effect-guide__catalog"><summary>Compare all 53 effects: descriptions, references and use cases</summary>' + textEffectCatalog.effects.map(effect => '<article id="guide-' + effect.id + '" data-effect="' + effect.id + '"><h3>' + esc(effect.name) + ' <code>' + effect.id + '</code></h3>' + details(effect, false) + '</article>').join('') + '</details></div></section>',
        data: '<script type="application/json" id="text-effect-catalog">' + JSON.stringify(textEffectCatalog).replace(/</g, '\\u003c') + '</script>',
    };
}
