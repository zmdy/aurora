/** Effect catalog. Every effect is `{id, selfManaged?, run(units, options, textEl, fx)}`. */

import effect_appear_text from './appear-text.js';
import effect_blur_reveal from './blur-reveal.js';
import effect_cinema_title from './cinema-title.js';
import effect_clip_wrap from './clip-wrap.js';
import effect_continuous_wave from './continuous-wave.js';
import effect_crt_boot from './crt-boot.js';
import effect_dia_text_reveal from './dia-text-reveal.js';
import effect_echo_clone from './echo-clone.js';
import effect_elastic_text from './elastic-text.js';
import effect_explosion from './explosion.js';
import effect_flip_board from './flip-board.js';
import effect_flip_in from './flip-in.js';
import effect_glitch from './glitch.js';
import effect_gradient_flow_text from './gradient-flow-text.js';
import effect_heartbeat from './heartbeat.js';
import effect_letter_roll from './letter-roll.js';
import effect_letter_swap from './letter-swap.js';
import effect_line_shadow_text from './line-shadow-text.js';
import effect_liquid_fill from './liquid-fill.js';
import effect_matrix_rain from './matrix-rain.js';
import effect_mesh_text from './mesh-text.js';
import effect_neon_flicker from './neon-flicker.js';
import effect_pendulum_swing from './pendulum-swing.js';
import effect_perspective_fly from './perspective-fly.js';
import effect_rgb_split from './rgb-split.js';
import effect_rotate_in from './rotate-in.js';
import effect_rotating_dial from './rotating-dial.js';
import effect_rubber_stamp from './rubber-stamp.js';
import effect_scale_in from './scale-in.js';
import effect_scatter_converge from './scatter-converge.js';
import effect_scramble from './scramble.js';
import effect_scroll_highlight from './scroll-highlight.js';
import effect_scroll_velocity_marquee from './scroll-velocity-marquee.js';
import effect_shiny_sweep_text from './shiny-sweep-text.js';
import effect_skew_in from './skew-in.js';
import effect_slide_in from './slide-in.js';
import effect_slot_machine from './slot-machine.js';
import effect_sparkles_text from './sparkles-text.js';
import effect_spin_in from './spin-in.js';
import effect_spinning_circular_text from './spinning-circular-text.js';
import effect_spiral_in from './spiral-in.js';
import effect_split_chars from './split-chars.js';
import effect_stagger_flip_3d from './stagger-flip-3d.js';
import effect_stretch_warp from './stretch-warp.js';
import effect_text_emerge from './text-emerge.js';
import effect_text_highlighter from './text-highlighter.js';
import effect_text_reveal_wall from './text-reveal-wall.js';
import effect_typewriter from './typewriter.js';
import effect_typewriter_delete from './typewriter-delete.js';
import effect_unfold_3d from './unfold-3d.js';
import effect_vertical_blinds from './vertical-blinds.js';
import effect_vhs_tracking from './vhs-tracking.js';
import effect_wave from './wave.js';

var list = [
    effect_appear_text,
    effect_blur_reveal,
    effect_cinema_title,
    effect_clip_wrap,
    effect_continuous_wave,
    effect_crt_boot,
    effect_dia_text_reveal,
    effect_echo_clone,
    effect_elastic_text,
    effect_explosion,
    effect_flip_board,
    effect_flip_in,
    effect_glitch,
    effect_gradient_flow_text,
    effect_heartbeat,
    effect_letter_roll,
    effect_letter_swap,
    effect_line_shadow_text,
    effect_liquid_fill,
    effect_matrix_rain,
    effect_mesh_text,
    effect_neon_flicker,
    effect_pendulum_swing,
    effect_perspective_fly,
    effect_rgb_split,
    effect_rotate_in,
    effect_rotating_dial,
    effect_rubber_stamp,
    effect_scale_in,
    effect_scatter_converge,
    effect_scramble,
    effect_scroll_highlight,
    effect_scroll_velocity_marquee,
    effect_shiny_sweep_text,
    effect_skew_in,
    effect_slide_in,
    effect_slot_machine,
    effect_sparkles_text,
    effect_spin_in,
    effect_spinning_circular_text,
    effect_spiral_in,
    effect_split_chars,
    effect_stagger_flip_3d,
    effect_stretch_warp,
    effect_text_emerge,
    effect_text_highlighter,
    effect_text_reveal_wall,
    effect_typewriter,
    effect_typewriter_delete,
    effect_unfold_3d,
    effect_vertical_blinds,
    effect_vhs_tracking,
    effect_wave,
];

export var effects = {};
list.forEach(function (effect) { effects[effect.id] = effect; });

/** Effect ids in display order. */
export var EFFECT_IDS = list.map(function (effect) { return effect.id; });

/** "float-up" -> "Float up" */
export function labelFor(id) {
    var text = id.replace(/-/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
}
