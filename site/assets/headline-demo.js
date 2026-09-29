(function () {
    var node = document.getElementById('headline-preview');
    if (!node) return;
    var schema = JSON.parse(document.getElementById('headline-schema').textContent).options;
    var config = JSON.parse(document.getElementById('headline-config').textContent);
    var panel = document.getElementById('headline-controls');
    var state = { mode: 'headline', trigger: 'load', beforeText: 'Create', highlightedText: 'extraordinary', afterText: 'experiences.', rotatingText: 'memorable\noriginal' };
    var instance, timer, groups = {}, snippet;
    var keys = ['beforeText', 'highlightedText', 'afterText', 'animationStyle', 'animationShape', 'rotatingText', 'rotationEffect', 'headlineColor', 'headlineColor2', 'strokeWidth', 'duration', 'holdDuration', 'headlineLoop'];
    function make(tag, cls, value) { var el = document.createElement(tag); el.className = cls; if (value !== undefined) el.textContent = value; return el; }
    function run() {
        instance = window.Aurora.text(node, state);
        document.getElementById('headline-pause').textContent = 'Pause';
        document.getElementById('headline-pause').setAttribute('aria-pressed', 'false');
        Object.keys(groups).forEach(function (key) {
            var when = schema[key].when || {};
            groups[key].hidden = !Object.keys(when).every(function (other) { return state[other] === when[other]; });
        });
        document.getElementById('headline-badge').textContent = state.animationStyle;
        var sample = document.createElement('h2'); sample.setAttribute('data-aurora-text', '');
        sample.setAttribute('data-aurora-text-options', JSON.stringify(state));
        sample.textContent = [state.beforeText, state.highlightedText, state.afterText].join(' ');
        snippet = sample.outerHTML;
        config.scripts.forEach(function (script) { snippet += '\n\n<script src="' + script.src + '" integrity="' + script.integrity + '" crossorigin="anonymous"><\/script>'; });
        document.getElementById('headline-code').textContent = snippet;
    }
    keys.forEach(function (key) {
        var spec = schema[key]; if (!(key in state)) state[key] = spec.default;
        var group = make('div', spec.type === 'boolean' ? 'toggle-row' : 'ctrl-group'); groups[key] = group;
        var label = make('label', spec.type === 'boolean' ? 'toggle-label-text' : 'ctrl-label', spec.label); label.htmlFor = 'headline-' + key; group.appendChild(label);
        var input;
        if (spec.type === 'enum') {
            input = make('select', 'ctrl-select'); spec.values.forEach(function (value) { var option = make('option', '', value.replace(/-/g,' ')); option.value = value; input.appendChild(option); });
        } else if (spec.ui === 'textarea') input = make('textarea', 'ctrl-input');
        else { input = make('input', spec.type === 'number' ? 'ctrl-range' : spec.type === 'color' ? 'ctrl-color' : 'ctrl-input'); input.type = spec.type === 'number' ? 'range' : spec.type === 'boolean' ? 'checkbox' : spec.type === 'color' ? 'color' : 'text'; }
        input.id = label.htmlFor;
        if (spec.type === 'boolean') { input.checked = state[key]; var toggle = make('label', 'toggle-switch'); input.setAttribute('aria-label', spec.label); toggle.appendChild(input); toggle.appendChild(make('span','toggle-track')); group.appendChild(toggle); }
        else if (spec.type === 'number' || spec.type === 'color') {
            if (spec.type === 'number') { input.min = spec.min; input.max = key === 'duration' ? 3000 : key === 'holdDuration' ? 5000 : spec.max; input.step = spec.step || 1; }
            var row = make('div', 'range-row'); row.appendChild(input); row.appendChild(make('output', 'range-val', state[key] + (spec.unit || ''))); group.appendChild(row);
        } else group.appendChild(input);
        input.value = state[key];
        input.addEventListener(spec.type === 'enum' || spec.type === 'boolean' ? 'change' : 'input', function () {
            state[key] = spec.type === 'boolean' ? input.checked : spec.type === 'number' ? Number(input.value) : input.value;
            var output = group.querySelector('output'); if (output) output.textContent = state[key] + (spec.unit || '');
            clearTimeout(timer); timer = setTimeout(run, 100);
        });
        panel.appendChild(group);
    });
    document.getElementById('headline-replay').addEventListener('click', function () { instance.replay(); document.getElementById('headline-pause').textContent = 'Pause'; document.getElementById('headline-pause').setAttribute('aria-pressed', 'false'); });
    document.getElementById('headline-pause').addEventListener('click', function () {
        var paused = this.getAttribute('aria-pressed') !== 'true'; this.setAttribute('aria-pressed', String(paused)); this.textContent = paused ? 'Play' : 'Pause'; instance.api[paused ? 'pause' : 'play']();
    });
    document.getElementById('headline-copy').addEventListener('click', function () {
        var status = document.getElementById('headline-copy-status');
        if (!navigator.clipboard) { status.textContent = 'Select the code above to copy.'; return; }
        navigator.clipboard.writeText(snippet).then(function () { status.textContent = 'Copied!'; }).catch(function () { status.textContent = 'Select the code above to copy.'; });
    });
    run();
})();
