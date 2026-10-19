/**
 * Aurora for Blocks: the Morph Card block (aurora/morph-card).
 *
 * A dynamic block: `save` returns null and the card is rendered by
 * Morph_Card_Block::render(). In the editor the card previews live: the
 * runtime and the morph-card module are loaded into the editor canvas
 * (Plugin::enqueue_canvas) and mounted on an empty element React does not
 * manage, so the module can own its children.
 */
(function (wp, data) {
    if (!wp || !data) return;

    var el = wp.element.createElement;
    var Fragment = wp.element.Fragment;
    var useRef = wp.element.useRef;
    var useEffect = wp.element.useEffect;
    var __ = wp.i18n.__;
    var sprintf = wp.i18n.sprintf;
    var be = wp.blockEditor;
    var C = wp.components;

    var TEMPLATE_LABELS = {
        post: __('Post', 'aurora-for-blocks'),
        profile: __('Profile', 'aurora-for-blocks'),
        polaroid: __('Polaroid', 'aurora-for-blocks'),
    };
    var DEFAULT_LABELS = {
        likes: 'likes', viewComments: 'View all comments', posts: 'Posts', followers: 'Followers',
        following: 'Following', follow: 'Follow', message: 'Message', email: 'Email',
    };
    var LABEL_NAMES = {
        likes: __('Likes', 'aurora-for-blocks'), viewComments: __('View comments', 'aurora-for-blocks'),
        posts: __('Posts', 'aurora-for-blocks'), followers: __('Followers', 'aurora-for-blocks'),
        following: __('Following', 'aurora-for-blocks'), follow: __('Follow button', 'aurora-for-blocks'),
        message: __('Message button', 'aurora-for-blocks'), email: __('Email button (screen readers)', 'aurora-for-blocks'),
    };

    // Which state fields each template reads (Morph_Card_Block::state() keeps the same set).
    var FIELDS = {
        post: ['photo', 'avatar', 'username', 'subtext', 'caption', 'likes'],
        profile: ['photo', 'avatar', 'username', 'name', 'bio', 'posts', 'followers', 'following', 'gridPhotos'],
        polaroid: ['photo', 'caption', 'size', 'frame'],
    };

    function has(template, field) {
        return (FIELDS[template] || FIELDS.post).indexOf(field) !== -1;
    }

    function prettify(s) {
        s = String(s).replace(/[-_]/g, ' ');
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    /** Module options from the attributes, mirroring Morph_Card_Block::options(). */
    function moduleOptions(attributes) {
        var states = (attributes.states || []).map(function (s) {
            var state = Object.assign({}, s, { template: s.template || 'post' });
            delete state.photoId;
            delete state.avatarId;
            if (Array.isArray(state.gridPhotos)) {
                state.gridPhotos = state.gridPhotos.map(function (g) { return g && g.url ? g.url : g; }).filter(Boolean);
                if (!state.gridPhotos.length || state.template !== 'profile') delete state.gridPhotos;
            }
            if (!state.photo) state.photo = data.placeholder;
            Object.keys(state).forEach(function (k) { if (state[k] === '' || state[k] === undefined) delete state[k]; });
            return state;
        });
        var labels = {};
        Object.keys(attributes.labels || {}).forEach(function (k) {
            if (attributes.labels[k]) labels[k] = attributes.labels[k];
        });
        return {
            states: states,
            labels: labels,
            loop: attributes.loop,
            autoplay: attributes.autoplay,
            float: attributes.float,
            initialDelay: attributes.initialDelay,
            captionEffect: attributes.captionEffect,
        };
    }

    function Preview(props) {
        var ref = useRef(null);
        var key = JSON.stringify(props.options);

        useEffect(function () {
            var node = ref.current;
            if (!node || !props.options.states.length) return undefined;
            var win = node.ownerDocument.defaultView;
            var aurora = win && win.Aurora;
            if (!aurora || typeof aurora.morphCard !== 'function') {
                node.textContent = __('The preview is not available here; the card plays on the page and in Preview.', 'aurora-for-blocks');
                return undefined;
            }
            var instance = aurora.morphCard(node, JSON.parse(key));
            return function () {
                if (instance && typeof instance.destroy === 'function') instance.destroy();
                node.textContent = '';
            };
        }, [key]);

        return el('div', { ref: ref, className: 'aurora-morph-card-preview' });
    }

    function ImageField(props) {
        var url = props.url;
        return el(C.BaseControl, { label: props.label, __nextHasNoMarginBottom: true },
            el(be.MediaUploadCheck, null,
                el(be.MediaUpload, {
                    allowedTypes: ['image'],
                    value: props.id,
                    onSelect: function (media) {
                        var size = media.sizes && (media.sizes.large || media.sizes.medium_large || media.sizes.full);
                        props.onChange({ url: (size && size.url) || media.url, id: media.id });
                    },
                    render: function (open) {
                        return el('div', { className: 'aurora-mc-image' },
                            url ? el('img', { src: url, alt: '', className: 'aurora-mc-image__thumb' }) : null,
                            el(C.Button, { variant: 'secondary', onClick: open.open, size: 'compact' },
                                url ? __('Replace', 'aurora-for-blocks') : __('Choose image', 'aurora-for-blocks')),
                            url ? el(C.Button, {
                                variant: 'link', isDestructive: true, size: 'compact',
                                onClick: function () { props.onChange({ url: '', id: undefined }); },
                            }, __('Remove', 'aurora-for-blocks')) : null
                        );
                    },
                })
            )
        );
    }

    /** Up to nine photos for the profile grid, picked as a gallery. */
    function GridField(props) {
        var items = props.value;
        return el(C.BaseControl, { label: __('Grid photos (up to 9)', 'aurora-for-blocks'), __nextHasNoMarginBottom: true },
            el(be.MediaUploadCheck, null,
                el(be.MediaUpload, {
                    allowedTypes: ['image'], multiple: true, gallery: true,
                    value: items.map(function (g) { return g.id; }).filter(Boolean),
                    onSelect: function (list) {
                        props.onChange(list.slice(0, 9).map(function (m) {
                            var size = m.sizes && (m.sizes.medium || m.sizes.thumbnail || m.sizes.full);
                            return { url: (size && size.url) || m.url, id: m.id };
                        }));
                    },
                    render: function (open) {
                        return el('div', { className: 'aurora-mc-image' },
                            items.slice(0, 9).map(function (g, i) { return el('img', { key: i, src: g.url, alt: '', className: 'aurora-mc-image__thumb' }); }),
                            el(C.Button, { variant: 'secondary', size: 'compact', onClick: open.open },
                                items.length ? __('Edit grid', 'aurora-for-blocks') : __('Choose photos', 'aurora-for-blocks')),
                            items.length ? el(C.Button, { variant: 'link', isDestructive: true, size: 'compact', onClick: function () { props.onChange([]); } }, __('Clear', 'aurora-for-blocks')) : null
                        );
                    },
                })
            )
        );
    }

    function StatePanel(props) {
        var s = props.state;
        var t = s.template || 'post';
        var set = function (patch) { props.onChange(Object.assign({}, s, patch)); };
        var text = function (field, label, multiline) {
            return el(multiline ? C.TextareaControl : C.TextControl, {
                key: field, label: label, value: s[field] || '',
                onChange: function (v) { var p = {}; p[field] = v; set(p); },
                __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
            });
        };
        var summary = s.username || s.caption || s.name || '';
        var title = sprintf('%1$d. %2$s', props.index + 1, TEMPLATE_LABELS[t] || t) + (summary ? ' — ' + summary.slice(0, 24) : '');

        var controls = [
            el(C.SelectControl, {
                key: 'template', label: __('Template', 'aurora-for-blocks'), value: t,
                options: data.templates.map(function (x) { return { value: x, label: TEMPLATE_LABELS[x] || prettify(x) }; }),
                onChange: function (v) { set({ template: v }); },
                __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
            }),
            el(ImageField, {
                key: 'photo', label: __('Photo', 'aurora-for-blocks'), url: s.photo, id: s.photoId,
                onChange: function (m) { set({ photo: m.url, photoId: m.id }); },
            }),
        ];
        if (has(t, 'avatar')) {
            controls.push(el(ImageField, {
                key: 'avatar', label: __('Avatar (empty uses the photo)', 'aurora-for-blocks'), url: s.avatar, id: s.avatarId,
                onChange: function (m) { set({ avatar: m.url, avatarId: m.id }); },
            }));
        }
        if (has(t, 'username')) controls.push(text('username', __('Username', 'aurora-for-blocks')));
        if (has(t, 'subtext')) controls.push(text('subtext', __('Subtext (e.g. a location)', 'aurora-for-blocks')));
        if (has(t, 'name')) controls.push(text('name', __('Name', 'aurora-for-blocks')));
        if (has(t, 'bio')) controls.push(text('bio', __('Bio', 'aurora-for-blocks'), true));
        if (has(t, 'caption')) controls.push(text('caption', __('Caption', 'aurora-for-blocks'), true));
        if (has(t, 'likes')) {
            controls.push(el(C.__experimentalNumberControl || C.TextControl, {
                key: 'likes', label: __('Likes', 'aurora-for-blocks'), min: 0, value: s.likes === undefined ? '' : s.likes,
                onChange: function (v) { set({ likes: v === '' || v === undefined ? undefined : parseInt(v, 10) || 0 }); },
                __next40pxDefaultSize: true,
            }));
        }
        if (has(t, 'posts')) {
            ['posts', 'followers', 'following'].forEach(function (f) { controls.push(text(f, LABEL_NAMES[f])); });
        }
        if (has(t, 'gridPhotos')) {
            controls.push(el(GridField, {
                key: 'grid', value: s.gridPhotos || [],
                onChange: function (items) { set({ gridPhotos: items.length ? items : undefined }); },
            }));
        }
        if (has(t, 'size')) {
            controls.push(el(C.SelectControl, {
                key: 'size', label: __('Polaroid size', 'aurora-for-blocks'), value: s.size || 'normal',
                options: data.sizes.map(function (x) { return { value: x, label: prettify(x) }; }),
                onChange: function (v) { set({ size: v === 'normal' ? undefined : v }); },
                __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
            }));
            controls.push(el(C.SelectControl, {
                key: 'frame', label: __('Polaroid frame', 'aurora-for-blocks'), value: s.frame || 'classic',
                options: data.frames.map(function (x) { return { value: x, label: prettify(x) }; }),
                onChange: function (v) { set({ frame: v === 'classic' ? undefined : v }); },
                __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
            }));
        }
        controls.push(el(C.RangeControl, {
            key: 'duration', label: __('Shown for (ms)', 'aurora-for-blocks'), min: 500, max: 15000, step: 100,
            value: s.durationMs || 3000, allowReset: true, resetFallbackValue: 3000,
            onChange: function (v) { set({ durationMs: v && v !== 3000 ? v : undefined }); },
            __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
        }));
        controls.push(el(C.RangeControl, {
            key: 'transition', label: __('Morph into this state (ms, empty = default)', 'aurora-for-blocks'), min: 100, max: 5000, step: 50,
            value: s.transitionDurationMs, allowReset: true,
            onChange: function (v) { set({ transitionDurationMs: v || undefined }); },
            __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
        }));
        controls.push(el(C.Flex, { key: 'actions', justify: 'flex-start', wrap: true, className: 'aurora-mc-actions' },
            el(C.Button, { size: 'compact', variant: 'secondary', disabled: props.index === 0, onClick: function () { props.onMove(-1); } }, __('Move up', 'aurora-for-blocks')),
            el(C.Button, { size: 'compact', variant: 'secondary', disabled: props.last, onClick: function () { props.onMove(1); } }, __('Move down', 'aurora-for-blocks')),
            el(C.Button, { size: 'compact', variant: 'secondary', onClick: props.onDuplicate }, __('Duplicate', 'aurora-for-blocks')),
            el(C.Button, { size: 'compact', variant: 'secondary', isDestructive: true, disabled: props.only, onClick: props.onRemove }, __('Remove', 'aurora-for-blocks'))
        ));

        return el(C.PanelBody, { title: title, initialOpen: false, className: 'aurora-mc-state' },
            el(C.__experimentalVStack || 'div', { spacing: 4 }, controls));
    }

    function Edit(props) {
        var a = props.attributes;
        var states = a.states || [];
        var blockProps = be.useBlockProps();

        function setStates(next) { props.setAttributes({ states: next }); }
        function update(i, s) { var next = states.slice(); next[i] = s; setStates(next); }
        function move(i, d) {
            var next = states.slice(); var j = i + d;
            if (j < 0 || j >= next.length) return;
            var tmp = next[i]; next[i] = next[j]; next[j] = tmp; setStates(next);
        }

        var inspector = el(be.InspectorControls, null,
            el(C.PanelBody, { title: __('States', 'aurora-for-blocks'), initialOpen: true },
                el('p', { className: 'aurora-mc-help' }, __('The card shows the states in order, morphing from one to the next.', 'aurora-for-blocks')),
                states.map(function (s, i) {
                    return el(StatePanel, {
                        key: i, index: i, state: s, last: i === states.length - 1, only: states.length === 1,
                        onChange: function (n) { update(i, n); },
                        onMove: function (d) { move(i, d); },
                        onDuplicate: function () { var next = states.slice(); next.splice(i + 1, 0, Object.assign({}, s)); setStates(next); },
                        onRemove: function () { var next = states.slice(); next.splice(i, 1); setStates(next); },
                    });
                }),
                el(C.Button, {
                    variant: 'primary', className: 'aurora-mc-add', disabled: states.length >= 20,
                    onClick: function () { setStates(states.concat([{ template: 'post' }])); },
                }, __('Add state', 'aurora-for-blocks'))
            ),
            el(C.PanelBody, { title: __('Sequence', 'aurora-for-blocks'), initialOpen: false },
                el(C.__experimentalVStack || 'div', { spacing: 4 },
                    el(C.ToggleControl, { label: __('Loop', 'aurora-for-blocks'), checked: a.loop, onChange: function (v) { props.setAttributes({ loop: v }); }, __nextHasNoMarginBottom: true }),
                    el(C.ToggleControl, { label: __('Autoplay', 'aurora-for-blocks'), checked: a.autoplay, onChange: function (v) { props.setAttributes({ autoplay: v }); }, __nextHasNoMarginBottom: true }),
                    el(C.ToggleControl, { label: __('Floating motion', 'aurora-for-blocks'), checked: a.float, onChange: function (v) { props.setAttributes({ float: v }); }, __nextHasNoMarginBottom: true }),
                    el(C.RangeControl, {
                        label: __('Initial delay (ms)', 'aurora-for-blocks'), min: 0, max: 30000, step: 100, value: a.initialDelay,
                        allowReset: true, resetFallbackValue: 0,
                        onChange: function (v) { props.setAttributes({ initialDelay: v || 0 }); },
                        __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
                    }),
                    el(C.SelectControl, {
                        label: __('Polaroid caption effect', 'aurora-for-blocks'), value: a.captionEffect,
                        options: [{ value: 'typewriter', label: __('Typewriter', 'aurora-for-blocks') }, { value: 'letters', label: __('Letters', 'aurora-for-blocks') }],
                        onChange: function (v) { props.setAttributes({ captionEffect: v }); },
                        __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
                    })
                )
            ),
            el(C.PanelBody, { title: __('Labels', 'aurora-for-blocks'), initialOpen: false },
                el('p', { className: 'aurora-mc-help' }, __('Texts inside the card, e.g. to translate them. Empty uses the English default.', 'aurora-for-blocks')),
                el(C.__experimentalVStack || 'div', { spacing: 4 },
                    data.labels.map(function (k) {
                        return el(C.TextControl, {
                            key: k, label: LABEL_NAMES[k] || k, placeholder: DEFAULT_LABELS[k], value: (a.labels || {})[k] || '',
                            onChange: function (v) { var l = Object.assign({}, a.labels || {}); if (v) l[k] = v; else delete l[k]; props.setAttributes({ labels: l }); },
                            __nextHasNoMarginBottom: true, __next40pxDefaultSize: true,
                        });
                    })
                )
            )
        );

        return el(Fragment, null, inspector,
            el('div', blockProps,
                states.length
                    ? el(Preview, { options: moduleOptions(a) })
                    : el(C.Placeholder, { icon: 'images-alt2', label: __('Morph Card', 'aurora-for-blocks'), instructions: __('Add a state in the block settings.', 'aurora-for-blocks') })
            )
        );
    }

    wp.blocks.registerBlockType('aurora/morph-card', {
        edit: Edit,
        save: function () { return null; },
    });
})(window.wp, window.AuroraMorphCard);
