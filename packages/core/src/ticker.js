/**
 * A single shared requestAnimationFrame loop.
 *
 * Any number of tasks can subscribe; the loop runs only while at least one
 * task is registered, so an idle page pays nothing.
 */

/**
 * @typedef {(time: number, delta: number) => void} TickTask
 */

/**
 * @returns {{ add: (task: TickTask) => () => void, readonly size: number }}
 */
export function createTicker() {
    var tasks = new Set();
    var frameId = null;
    var last = 0;

    function frame(now) {
        frameId = null;
        var delta = last ? now - last : 16;
        last = now;

        tasks.forEach(function (task) {
            try {
                task(now, delta);
            } catch (error) {
                console.error('[Aurora] A ticker task threw:', error);
            }
        });

        if (tasks.size > 0) frameId = requestAnimationFrame(frame);
        else last = 0;
    }

    return {
        add: function (task) {
            tasks.add(task);
            if (frameId === null) frameId = requestAnimationFrame(frame);
            return function () {
                tasks.delete(task);
                if (tasks.size === 0 && frameId !== null) {
                    cancelAnimationFrame(frameId);
                    frameId = null;
                    last = 0;
                }
            };
        },
        get size() { return tasks.size; },
    };
}

/** The ticker every module shares. */
export var ticker = createTicker();
