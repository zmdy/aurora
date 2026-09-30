(function () {
    var select = document.getElementById('ctrl-animation');
    var panel = document.getElementById('effect-guide');
    if (!select || !panel) return;
    var catalog = JSON.parse(document.getElementById('text-effect-catalog').textContent);
    function update() {
        var effect = catalog.effects.find(function (item) { return item.id === select.value; });
        if (!effect) return;
        panel.dataset.effect = effect.id;
        document.getElementById('effect-guide-title').textContent = effect.name;
        panel.querySelectorAll('[data-guide]').forEach(function (node) {
            var key = node.dataset.guide;
            node.textContent = key === 'playback' ? catalog.playbackDefinitions[effect.playback] : effect[key];
        });
    }
    select.addEventListener('change', update);
    update();
})();
