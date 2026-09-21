/**
 * Shared cursor engine.
 *
 * One dot + ring pair exists for the whole page. Elements with the module
 * enabled are "zones"; while the pointer is inside a zone the pair adopts that
 * zone's options. Zones can be nested: the most recently entered zone wins and
 * leaving it reveals the zone still active underneath (tracked by a stack).
 *
 * The dot follows the pointer instantly. The ring eases towards it with
 * frame-rate independent exponential smoothing, so `trailDelay` behaves the
 * same at 60 Hz and 144 Hz.
 */

import { ticker } from '@aurora/core';

var EPSILON = 0.1;

var zones = [];          // active zone stack; the last item is on top
var registered = [];     // every mounted zone, active or not
var dot = null;
var ring = null;
var listening = false;
var stopTicker = null;

var pointer = { x: -100, y: -100, known: false, target: null };
var ringPos = { x: -100, y: -100 };
var hoverTarget = null;
var hoverDirty = false;
var state = 'default';

function createElements() {
    if (dot && ring) return;
    dot = document.createElement('div');
    dot.className = 'aurora-cursor-dot';
    dot.setAttribute('aria-hidden', 'true');
    ring = document.createElement('div');
    ring.className = 'aurora-cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    document.body.appendChild(ring);
}

function removeElements() {
    if (dot) dot.remove();
    if (ring) ring.remove();
    dot = null;
    ring = null;
}

function top() {
    return zones.length ? zones[zones.length - 1] : null;
}

function setVisible(visible) {
    if (!dot || !ring) return;
    var value = visible ? '1' : '0';
    dot.style.opacity = value;
    ring.style.opacity = value;
}

/**
 * Applies the options of the zone on top of the stack to the elements.
 */
function applyAppearance() {
    var zone = top();
    if (!zone || !dot || !ring) return;
    var o = zone.options;

    dot.style.width = o.dotSize + 'px';
    dot.style.height = o.dotSize + 'px';
    dot.style.setProperty('--aurora-cursor-color', o.dotColor);

    ring.style.width = o.ringSize + 'px';
    ring.style.height = o.ringSize + 'px';

    applyState(state);
    setVisible(pointer.known);
}

function applyState(next) {
    var zone = top();
    if (!zone || !dot || !ring) return;
    var o = zone.options;
    state = next;

    var scaled = next !== 'default';
    dot.style.setProperty('--aurora-cursor-scale', scaled ? '0.6' : '1');
    ring.style.setProperty('--aurora-cursor-scale', String(next === 'image' ? o.imageScale : next === 'interactive' ? o.interactiveScale : 1));
    ring.style.setProperty('--aurora-cursor-color', next === 'image' ? o.dotColor : o.ringColor);
    ring.style.setProperty('--aurora-cursor-trail', o.trailDelay + 'ms');
}

function computeState(target) {
    var zone = top();
    if (!zone || !(target instanceof Element)) return 'default';
    var o = zone.options;
    try {
        if (o.imageSelector && target.closest(o.imageSelector)) return 'image';
        if (o.interactiveSelector && target.closest(o.interactiveSelector)) return 'interactive';
    } catch (error) {
        // An invalid selector never reaches this point (options are validated),
        // but a selector can become invalid at match time in exotic cases.
    }
    return 'default';
}

function refreshHover(target) {
    var next = computeState(target);
    if (next !== state) applyState(next);
}

function render(now, delta) {
    var zone = top();
    if (!zone || !dot || !ring) return;

    if (hoverDirty) {
        hoverDirty = false;
        refreshHover(pointer.target);
    }

    dot.style.transform = 'translate3d(' + pointer.x + 'px,' + pointer.y + 'px,0) translate(-50%,-50%)';

    var trail = zone.options.trailDelay;
    if (trail <= 0) {
        ringPos.x = pointer.x;
        ringPos.y = pointer.y;
    } else {
        // Time constant chosen so the ring covers ~95% of the gap in `trail` ms.
        var factor = 1 - Math.exp(-delta / (trail / 3));
        ringPos.x += (pointer.x - ringPos.x) * factor;
        ringPos.y += (pointer.y - ringPos.y) * factor;
    }
    ring.style.transform = 'translate3d(' + ringPos.x + 'px,' + ringPos.y + 'px,0) translate(-50%,-50%)';

    var settled = Math.abs(pointer.x - ringPos.x) < EPSILON && Math.abs(pointer.y - ringPos.y) < EPSILON;
    if (settled) {
        ringPos.x = pointer.x;
        ringPos.y = pointer.y;
        stopLoop();
    }
}

function startLoop() {
    if (!stopTicker) stopTicker = ticker.add(render);
}

function stopLoop() {
    if (stopTicker) {
        stopTicker();
        stopTicker = null;
    }
}

function onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    var first = !pointer.known;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.target = event.target;
    hoverDirty = true;

    if (first) {
        pointer.known = true;
        ringPos.x = pointer.x;
        ringPos.y = pointer.y;
        if (top()) setVisible(true);
    }
    if (top()) startLoop();
}

function onPointerLeaveDocument(event) {
    if (event.relatedTarget === null) {
        pointer.known = false;
        setVisible(false);
    }
}

function listen() {
    if (listening) return;
    listening = true;
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerout', onPointerLeaveDocument);
}

function unlisten() {
    if (!listening) return;
    listening = false;
    document.removeEventListener('pointermove', onPointerMove, { passive: true });
    document.removeEventListener('pointerout', onPointerLeaveDocument);
}

function enter(zone) {
    var index = zones.indexOf(zone);
    if (index !== -1) zones.splice(index, 1);
    zones.push(zone);
    refreshFromPoint();
    applyAppearance();
    if (pointer.known) startLoop();
}

function leave(zone) {
    var index = zones.indexOf(zone);
    if (index !== -1) zones.splice(index, 1);

    if (zones.length === 0) {
        setVisible(false);
        stopLoop();
        return;
    }
    refreshFromPoint();
    applyAppearance();
}

function refreshFromPoint() {
    if (!pointer.known || typeof document.elementFromPoint !== 'function') return;
    var target = document.elementFromPoint(pointer.x, pointer.y);
    if (target) pointer.target = target;
    hoverDirty = true;
}

function syncNativeCursor(zone) {
    zone.el.classList.toggle('aurora-cursor-native-hidden', !!zone.options.hideNative);
}

/**
 * Registers a zone and returns its controller.
 *
 * @param {HTMLElement} el
 * @param {Object} options Validated options of the cursor schema.
 * @returns {{update: (options: Object) => void, destroy: () => void}}
 */
export function mountZone(el, options) {
    var zone = { el: el, options: options };
    registered.push(zone);

    createElements();
    listen();
    syncNativeCursor(zone);

    var onEnter = function () { enter(zone); };
    var onLeave = function () { leave(zone); };
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);

    return {
        update: function (next) {
            zone.options = next;
            syncNativeCursor(zone);
            if (top() === zone) {
                hoverDirty = true;
                applyAppearance();
            }
        },
        destroy: function () {
            el.removeEventListener('pointerenter', onEnter);
            el.removeEventListener('pointerleave', onLeave);
            el.classList.remove('aurora-cursor-native-hidden');
            leave(zone);

            var index = registered.indexOf(zone);
            if (index !== -1) registered.splice(index, 1);

            if (registered.length === 0) {
                stopLoop();
                unlisten();
                removeElements();
                pointer.known = false;
                pointer.target = null;
                state = 'default';
            }
        },
    };
}
