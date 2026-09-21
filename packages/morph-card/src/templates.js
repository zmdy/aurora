import { icon } from './icons.js';

/**
 * Templates render the three zones of the card (header, image, footer) and
 * describe the frame (radius, padding, ...) the card takes on. The frame is
 * written as explicit inline values so any template can morph into any other.
 */

export var DEFAULT_LABELS = {
    likes: 'likes',
    viewComments: 'View all comments',
    posts: 'Posts',
    followers: 'Followers',
    following: 'Following',
    follow: 'Follow',
    message: 'Message',
    email: 'Email',
};

export var TEMPLATES = ['post', 'profile', 'polaroid', 'custom'];

export var POLAROID_SIZES = {
    normal: { photoRatio: '1 / 1', radius: 3, top: 16, sides: 16, bottom: 56 },
    instax: { photoRatio: '3 / 4', radius: 3, top: 14, sides: 14, bottom: 64 },
    'instax-square': { photoRatio: '1 / 1', radius: 3, top: 14, sides: 14, bottom: 48 },
    horizontal: { photoRatio: '4 / 3', radius: 3, top: 14, sides: 14, bottom: 48 },
    mini: { photoRatio: '3 / 4', radius: 3, top: 10, sides: 10, bottom: 40 },
};

export var POLAROID_FRAMES = ['classic', 'vintage', 'pink', 'dark', 'floral'];

export function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

/** Only http(s), relative and data:image URLs may be used as image sources. */
export function safeUrl(url) {
    var value = String(url || '').trim();
    if (!value) return '';
    if (/^(https?:|\/|\.\/|\.\.\/|data:image\/)/i.test(value) || !/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
    return '';
}

function px(value, fallback) {
    var n = parseFloat(value);
    return (isNaN(n) ? fallback : n) + 'px';
}

/**
 * Frame of a state: everything that changes the outer shape of the card.
 */
export function frameFor(state) {
    switch (state.template) {
        case 'polaroid': {
            var size = POLAROID_SIZES[state.size] ? state.size : 'normal';
            var cfg = POLAROID_SIZES[size];
            return {
                mode: 'polaroid',
                frameClass: POLAROID_FRAMES.indexOf(state.frame) !== -1 ? 'amc-frame-' + state.frame : null,
                borderRadius: cfg.radius + 'px',
                padding: cfg.top + 'px ' + cfg.sides + 'px ' + cfg.bottom + 'px ' + cfg.sides + 'px',
                rotate: '0deg',
                maxWidth: '320px',
                aspectRatio: 'auto',
                background: '',
                imageAspectRatio: cfg.photoRatio,
                imageBorderRadius: '0px',
            };
        }
        case 'profile':
            return {
                mode: 'profile', frameClass: null, borderRadius: '18px', padding: '0px 0px 0px 0px', rotate: '0deg',
                maxWidth: '380px', aspectRatio: 'auto', background: '', imageAspectRatio: 'auto', imageBorderRadius: '0px',
            };
        case 'custom': {
            var pad = state.padding || {};
            var unit = pad.unit || 'px';
            var max = state.maxWidth || {};
            var ratio = state.aspectRatio && state.aspectRatio !== 'auto' ? String(state.aspectRatio).replace('/', ' / ') : 'auto';
            return {
                mode: 'custom', frameClass: null,
                borderRadius: px(state.radius, 0),
                padding: [pad.top, pad.right, pad.bottom, pad.left].map(function (v) { return (parseFloat(v) || 0) + unit; }).join(' '),
                rotate: (parseFloat(state.rotate) || 0) + 'deg',
                maxWidth: max.size ? max.size + (max.unit || 'px') : 'none',
                aspectRatio: ratio,
                background: state.bgColor || '',
                imageAspectRatio: 'auto',
                imageBorderRadius: '0px',
            };
        }
        default:
            return {
                mode: 'post', frameClass: null, borderRadius: '22px', padding: '14px 14px 18px 14px', rotate: '0deg',
                maxWidth: '320px', aspectRatio: 'auto', background: '', imageAspectRatio: '1 / 1', imageBorderRadius: '14px',
            };
    }
}

/**
 * Zone markup of a state.
 *
 * @returns {{header: string, image: string, footer: string, headerClass: string, showHeader: boolean, showImage: boolean, showFooter: boolean}}
 */
export function contentFor(state, labels) {
    var l = Object.assign({}, DEFAULT_LABELS, labels || {});
    var caption = escapeHtml(state.caption);
    var photo = escapeHtml(safeUrl(state.photo));

    switch (state.template) {
        case 'polaroid':
            return {
                headerClass: 'amc-header', showHeader: true, header: '',
                showImage: true,
                image: '<img class="amc-image-photo" src="' + photo + '" alt="' + caption + '">',
                showFooter: true,
                footer: '<p class="amc-caption amc-post-caption-as-polaroid"><span class="amc-caption-text">' + caption + '</span></p>',
            };

        case 'profile': {
            var grid = Array.isArray(state.gridPhotos) ? state.gridPhotos : [];
            var tiles = grid.length
                ? grid.map(function (src) { return '<div class="amc-profile-grid-item"><img src="' + escapeHtml(safeUrl(src)) + '" alt=""></div>'; })
                : Array.from({ length: 9 }, function () { return '<div class="amc-profile-grid-item amc-profile-grid-item-empty"></div>'; });
            return {
                headerClass: 'amc-header', showHeader: true,
                header:
                    '<div class="amc-profile-top">' +
                    '<span class="amc-profile-avatar-ring"><img class="amc-profile-avatar-img" src="' + escapeHtml(safeUrl(state.avatar || state.photo)) + '" alt="' + escapeHtml(state.username || state.name) + '"></span>' +
                    '<div class="amc-profile-stats">' +
                    '<div class="amc-profile-stat"><strong>' + escapeHtml(state.posts || 0) + '</strong><span>' + escapeHtml(l.posts) + '</span></div>' +
                    '<div class="amc-profile-stat"><strong>' + escapeHtml(state.followers || 0) + '</strong><span>' + escapeHtml(l.followers) + '</span></div>' +
                    '<div class="amc-profile-stat"><strong>' + escapeHtml(state.following || 0) + '</strong><span>' + escapeHtml(l.following) + '</span></div>' +
                    '</div></div>' +
                    '<div class="amc-profile-info"><p class="amc-profile-name">' + escapeHtml(state.name) + '</p><p class="amc-profile-bio">' + escapeHtml(state.bio) + '</p></div>' +
                    '<div class="amc-profile-actions">' +
                    '<button class="amc-profile-btn amc-profile-btn-primary" type="button">' + escapeHtml(l.follow) + '</button>' +
                    '<button class="amc-profile-btn amc-profile-btn-secondary" type="button">' + escapeHtml(l.message) + '</button>' +
                    '<button class="amc-profile-btn amc-profile-btn-icon" type="button" aria-label="' + escapeHtml(l.email) + '">' + icon('mail') + '</button>' +
                    '</div>' +
                    '<div class="amc-profile-tabs">' +
                    '<span class="amc-profile-tab active">' + icon('grid') + '</span>' +
                    '<span class="amc-profile-tab">' + icon('video') + '</span>' +
                    '<span class="amc-profile-tab">' + icon('bookmark') + '</span>' +
                    '</div>',
                showImage: true,
                image: '<div class="amc-profile-grid">' + tiles.join('') + '</div>',
                showFooter: false, footer: '',
            };
        }

        case 'custom':
            return {
                headerClass: 'amc-header', showHeader: !!state.headerHtml, header: state.headerHtml || '',
                showImage: !!state.photo,
                image: state.photo
                    ? '<img class="amc-image-photo" src="' + photo + '" alt="' + caption + '" style="object-fit:' + escapeHtml(state.imageFit || 'cover') + ';object-position:' + escapeHtml(state.imagePosition || 'center center') + ';">'
                    : '',
                showFooter: !!state.footerHtml, footer: state.footerHtml || '',
            };

        default: {
            var username = escapeHtml(state.username);
            return {
                headerClass: 'amc-header amc-post-header', showHeader: true,
                header:
                    '<span class="amc-post-avatar-ring"><img class="amc-post-avatar-img" src="' + escapeHtml(safeUrl(state.avatar || state.photo)) + '" alt="' + username + '"></span>' +
                    '<div class="amc-post-header-text"><p class="amc-post-username">' + username + '</p><p class="amc-post-subtext">' + escapeHtml(state.subtext) + '</p></div>' +
                    icon('ellipsis', 'amc-post-more'),
                showImage: true,
                image: '<img class="amc-post-photo-item" src="' + photo + '" alt="' + caption + '">' +
                    '<div class="amc-post-heart-burst">' + icon('heart', '', true) + '</div>',
                showFooter: true,
                footer:
                    '<div class="amc-post-actions">' + icon('heart', 'amc-post-icon') + icon('comment', 'amc-post-icon') + icon('send', 'amc-post-icon') + icon('bookmark', 'amc-post-icon amc-post-icon-save') + '</div>' +
                    '<div class="amc-post-meta">' +
                    '<p class="amc-post-likes"><span class="amc-post-likes-count">' + escapeHtml(state.likes || 0) + '</span> ' + escapeHtml(l.likes) + '</p>' +
                    '<p class="amc-post-caption"><span class="amc-post-caption-user">' + username + '</span> <span class="amc-post-caption-text">' + caption + '</span></p>' +
                    '<p class="amc-post-comments">' + escapeHtml(l.viewComments) + '</p></div>',
            };
        }
    }
}
