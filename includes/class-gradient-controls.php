<?php
/**
 * Gradient Controls — multi-stop gradients (3+ colors) on containers
 * (background), on the Heading/Text Editor widgets (text-fill), on the
 * Icon widget (icon-fill), and on Icon Box (configurable: box background
 * or icon-fill) — with an optional "mesh" (blurred blobs) or "loop" (hue
 * rotation) animation.
 *
 * Implements only what's specific to this module; the shared plumbing
 * (hooks, deduplication, section assembly) lives in Animation_Module.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Element_Base;
use Elementor\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the "Gradient" controls and injects the data-attributes on render.
 */
class Gradient_Controls extends Animation_Module {

	/** Elements where this module appears. */
	const SUPPORTED_ELEMENTS = [ 'section', 'column', 'container', 'heading', 'text-editor', 'icon', 'icon-box' ];

	/** Widgets where the gradient is applied as a text-fill instead of a background. */
	const TEXT_ELEMENTS = [ 'heading', 'text-editor' ];

	/** Widgets where the gradient is ALWAYS applied as an icon-fill (no choice — Icon Box has one instead, see aurora_gradient_apply_to). */
	const ICON_ELEMENTS = [ 'icon' ];

	/** Icon Box is the only element with a runtime-selectable target (Box background vs. Icon fill). */
	const CONFIGURABLE_TARGET_ELEMENTS = [ 'icon-box' ];

	protected function get_section_id(): string {
		return 'aurora_gradient_section';
	}

	protected function get_section_label(): string {
		return __( 'Gradient', 'aurora-for-elementor' );
	}

	/**
	 * Appears on structural containers (background), Heading/Text Editor
	 * (text-fill), Icon (icon-fill), and Icon Box (box background or
	 * icon-fill, user's choice) — see SUPPORTED_ELEMENTS.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
	}

	/**
	 * Structural elements use the generic section_effects hook. Heading and
	 * Text Editor need dedicated widget-scoped hooks: the generic 'common'
	 * hook fires with a pseudo-element whose get_name() is literally
	 * "common"/"common-optimized" (never the widget's real name), so an
	 * applies_to_element() check for 'heading'/'text-editor' can never pass
	 * there — see the same workaround in Image_Effects_Controls.
	 * Hooking after a section that genuinely belongs to each widget is
	 * enough; the 'tab' argument of start_controls_section() is independent
	 * of which hook triggered it, so the new section still lands in the
	 * Advanced tab.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 30 ],
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 20 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 20 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 20 ],
			[ 'hook' => 'elementor/element/heading/section_title_style/after_section_end', 'priority' => 20 ],
			[ 'hook' => 'elementor/element/text-editor/section_style/after_section_end', 'priority' => 20 ],
			// Icon's own dedicated Style-tab section is 'section_style_icon'
			// (confirmed against Elementor core's Widget_Icon::register_controls()).
			[ 'hook' => 'elementor/element/icon/section_style_icon/after_section_end', 'priority' => 20 ],
			// Icon Box's FIRST widget-scoped Style-tab section is 'section_style_box'
			// (confirmed against Elementor core's Widget_Icon_Box::register_controls())
			// — genuinely belongs to the icon-box widget, unlike the shared 'common' hook.
			[ 'hook' => 'elementor/element/icon-box/section_style_box/after_section_end', 'priority' => 20 ],
		];
	}

	/**
	 * Same reason as Text_Animation_Controls: ensures widgets (Heading,
	 * Text Editor, Icon, Icon Box) also receive the attributes on the frontend.
	 */
	protected function get_render_hooks(): array {
		return [
			'elementor/frontend/element/before_render',
			'elementor/frontend/widget/before_render',
		];
	}

	// ── Controls ─────────────────────────────────────────────────────────────

	/**
	 * Fields of the "Gradient" section.
	 *
	 * @param Element_Base $element Element instance.
	 */
	protected function register_fields( Element_Base $element ): void {

		$name         = $element->get_name();
		$is_icon_box  = in_array( $name, self::CONFIGURABLE_TARGET_ELEMENTS, true );

		// ── Enable ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_enable',
			[
				'label'              => esc_html__( 'Enable Gradient', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'description'        => esc_html__( 'On containers, applies to the background. On Heading/Text Editor, applies to the text color. On the Icon widget, applies to the icon fill. On Icon Box, see "Apply To" below.', 'aurora-for-elementor' ),
				'frontend_available' => true,
			]
		);

		// ── Apply to (Icon Box only) ──────────────────────────────────────────
		// The only element with a runtime-selectable target: the user picks
		// whether the gradient paints the whole box (background, like a card)
		// or just the icon inside it (fill, same technique as the Icon
		// widget). Every other supported element has a fixed, element-type-
		// determined target — see get_render_attributes().
		if ( $is_icon_box ) {
			$element->add_control(
				'aurora_gradient_apply_to',
				[
					'label'              => esc_html__( 'Apply To', 'aurora-for-elementor' ),
					'type'               => Controls_Manager::SELECT,
					'default'            => 'box',
					'options'            => [
						'box'  => esc_html__( 'Whole Box (background)', 'aurora-for-elementor' ),
						'icon' => esc_html__( 'Icon Only (fill)', 'aurora-for-elementor' ),
					],
					'condition'          => [ 'aurora_gradient_enable' => 'yes' ],
					'frontend_available' => true,
				]
			);
		}

		// ── Type ──────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_type',
			[
				'label'              => esc_html__( 'Type', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'linear',
				'options'            => [
					'linear' => esc_html__( 'Linear', 'aurora-for-elementor' ),
					'radial' => esc_html__( 'Radial', 'aurora-for-elementor' ),
					'conic'  => esc_html__( 'Conic', 'aurora-for-elementor' ),
					'mesh'   => esc_html__( 'Mesh Shader Engine', 'aurora-for-elementor' ),
				],
				'condition'          => [ 'aurora_gradient_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Mesh Shader Style Preset ──────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_mesh_style',
			[
				'label'              => esc_html__( 'Mesh Shader Style', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'paper',
				'options'            => [
					'paper'  => esc_html__( 'Paper Shader (Dithered Grain Noise)', 'aurora-for-elementor' ),
					'liquid' => esc_html__( 'Liquid Mesh (Fluid Domain Warping)', 'aurora-for-elementor' ),
					'wave'   => esc_html__( 'Wave Mesh (Undulating Color Bands)', 'aurora-for-elementor' ),
					'silk'   => esc_html__( 'Silk Shader (Specular Sheen)', 'aurora-for-elementor' ),
					'stripe' => esc_html__( 'Stripe Mesh (Chromatic Stripes)', 'aurora-for-elementor' ),
				],
				'condition'          => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => 'mesh',
				],
				'frontend_available' => true,
			]
		);

		// ── Angle ─────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_angle',
			[
				'label'     => esc_html__( 'Angle (degrees)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 360,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 135 ],
				'condition'          => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => [ 'linear', 'conic', 'mesh' ],
				],
				'frontend_available' => true,
			]
		);

		// ── Mesh Distortion (%) ───────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_distortion',
			[
				'label'     => esc_html__( 'Distortion (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'   => [ 'size' => 40 ],
				'condition' => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => 'mesh',
				],
				'frontend_available' => true,
			]
		);

		// ── Mesh Swirl (%) ───────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_swirl',
			[
				'label'     => esc_html__( 'Swirl (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'   => [ 'size' => 25 ],
				'condition' => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => 'mesh',
				],
				'frontend_available' => true,
			]
		);

		// ── Mesh Scale ───────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_scale',
			[
				'label'     => esc_html__( 'Scale', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0.5,
						'max'  => 3.0,
						'step' => 0.05,
					],
				],
				'default'   => [ 'size' => 1.25 ],
				'condition' => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => 'mesh',
				],
				'frontend_available' => true,
			]
		);

		// ── Film Grain Noise ──────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_grain_enable',
			[
				'label'              => esc_html__( 'Add Paper Film Grain', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => 'yes',
				'description'        => esc_html__( 'Applies an analog paper film grain / dither texture overlay across the gradient mesh.', 'aurora-for-elementor' ),
				'condition'          => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => 'mesh',
				],
				'frontend_available' => true,
			]
		);

		$element->add_control(
			'aurora_gradient_grain_intensity',
			[
				'label'     => esc_html__( 'Grain Intensity (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'   => [ 'size' => 35 ],
				'condition' => [
					'aurora_gradient_enable'       => 'yes',
					'aurora_gradient_type'         => 'mesh',
					'aurora_gradient_grain_enable' => 'yes',
				],
				'frontend_available' => true,
			]
		);

		// ── Liquid Cursor Follower ────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_liquid_cursor',
			[
				'label'              => esc_html__( 'Liquid Cursor Distortion', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'description'        => esc_html__( 'Creates a dynamic fluid wave displacement as the mouse moves over the gradient mesh.', 'aurora-for-elementor' ),
				'condition'          => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => 'mesh',
				],
				'frontend_available' => true,
			]
		);

		$element->add_control(
			'aurora_gradient_cursor_radius',
			[
				'label'     => esc_html__( 'Cursor Wave Radius (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 50,
						'max'  => 800,
						'step' => 10,
					],
				],
				'default'   => [ 'size' => 250 ],
				'condition' => [
					'aurora_gradient_enable'        => 'yes',
					'aurora_gradient_type'          => 'mesh',
					'aurora_gradient_liquid_cursor' => 'yes',
				],
				'frontend_available' => true,
			]
		);

		// ── Follow mouse (spotlight) ─────────────────────────────────────────
		// Recenters the radial gradient on the live cursor position instead
		// of a fixed point — e.g. the "spotlight" background used behind a
		// footer/hero, where `radial-gradient(circle {r}px at {x}% {y}%, ...)`
		// is recomputed on every mousemove. Only meaningful for "radial"
		// (linear has no center point, and conic's rotation reads oddly when
		// paired with a moving center), and mutually exclusive with the
		// time-based Animate option below — see gradient-module.js.
		$element->add_control(
			'aurora_gradient_follow_mouse',
			[
				'label'              => esc_html__( 'Follow Mouse (Spotlight)', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'description'        => esc_html__( 'Recenters the gradient on the cursor position as it moves over the element, instead of a fixed center.', 'aurora-for-elementor' ),
				'condition'          => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => 'radial',
				],
				'frontend_available' => true,
			]
		);

		// ── Spotlight radius ──────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_spotlight_radius',
			[
				'label'     => esc_html__( 'Spotlight Radius (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 50,
						'max'  => 1600,
						'step' => 10,
					],
				],
				'default'   => [ 'size' => 600 ],
				'condition' => [
					'aurora_gradient_enable'       => 'yes',
					'aurora_gradient_type'         => 'radial',
					'aurora_gradient_follow_mouse' => 'yes',
				],
				'frontend_available' => true,
			]
		);

		// ── Colors (repeater, 3+) ─────────────────────────────────────────────
		$repeater = new Repeater();

		$repeater->add_control(
			'color',
			[
				'label'   => esc_html__( 'Color', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::COLOR,
				'default' => '#0afbc1',
			]
		);

		$repeater->add_control(
			'offset',
			[
				'label'   => esc_html__( 'Position (%)', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::SLIDER,
				'range'   => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default' => [ 'size' => 0 ],
			]
		);

		$element->add_control(
			'aurora_gradient_stops',
			[
				'label'              => esc_html__( 'Gradient Colors (min. 3)', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::REPEATER,
				'fields'             => $repeater->get_controls(),
				'default'            => [
					[
						'color'  => '#0afbc1',
						'offset' => [ 'size' => 0 ],
					],
					[
						'color'  => '#02db72',
						'offset' => [ 'size' => 50 ],
					],
					[
						'color'  => '#019282',
						'offset' => [ 'size' => 100 ],
					],
				],
				'title_field'        => '{{{ color }}}',
				'condition'          => [ 'aurora_gradient_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Text render mode (headings / text editor only) ───────────────────
		// Only meaningful when the gradient targets text (background-clip
		// on Heading/Text Editor). Two modes:
		//   phrase     — one gradient stretches across the whole sentence.
		//                Each glyph shows its own slice of that gradient.
		//   per-letter — each letter carries its own full copy of the
		//                gradient (all letters look identical). This is
		//                what Text Animation splits used to force, since a
		//                single parent gradient can't paint through
		//                animated descendant text.
		$element->add_control(
			'aurora_gradient_text_mode',
			[
				'label'              => esc_html__( 'Text render mode', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'phrase',
				'options'            => [
					'phrase'     => esc_html__( 'Whole phrase (one gradient across all text)', 'aurora-for-elementor' ),
					'per-letter' => esc_html__( 'Per letter (each glyph shows the full gradient)', 'aurora-for-elementor' ),
				],
				'description'        => esc_html__( 'Only applies when the gradient is used as a text fill on Heading/Text Editor.', 'aurora-for-elementor' ),
				'condition'          => [ 'aurora_gradient_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Animate ───────────────────────────────────────────────────────────
		// Hidden while Follow Mouse is on: one drives the gradient from a
		// timer (CSS @keyframes), the other from live cursor position — the
		// two aren't meant to run at once (see get_render_attributes()).
		$element->add_control(
			'aurora_gradient_animate',
			[
				'label'              => esc_html__( 'Animate Gradient', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'condition'          => [
					'aurora_gradient_enable'       => 'yes',
					'aurora_gradient_follow_mouse!' => 'yes',
				],
				'frontend_available' => true,
			]
		);

		// ── Animation style ───────────────────────────────────────────────────
		// The "mesh" value drives two different CSS effects depending on the
		// target (see gradient-module.js applyBackground()/applyText()/
		// applyIconFill()): a real moving-blobs mesh on backgrounds, but a
		// simple background-position pan on text/icon-fill targets
		// (background-clip:text — or the icon-fill equivalent — can't render
		// blurred ::before blob layers). The option label is adjusted per
		// element type so it never promises a blob effect that won't
		// actually show up. Icon Box isn't included here even though it CAN
		// resolve to an icon-fill target — its target is a runtime setting
		// (aurora_gradient_apply_to), not known yet at registration time, so
		// its label stays the generic "Mesh" wording (a small cosmetic
		// mismatch if the user picks "Icon Only", not a functional bug —
		// see applyIconFill(), which always uses the pan/loop mechanics
		// regardless of the label shown).
		$is_clip_element = in_array( $element->get_name(), array_merge( self::TEXT_ELEMENTS, self::ICON_ELEMENTS ), true );

		$element->add_control(
			'aurora_gradient_animation_style',
			[
				'label'     => esc_html__( 'Animation Style', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'mesh',
				'options'   => [
					'mesh' => $is_clip_element
						? esc_html__( 'Pan (sliding gradient)', 'aurora-for-elementor' )
						: esc_html__( 'Mesh (moving blobs)', 'aurora-for-elementor' ),
					'loop' => esc_html__( 'Color Loop (hue rotation)', 'aurora-for-elementor' ),
				],
				'condition' => [
					'aurora_gradient_enable'        => 'yes',
					'aurora_gradient_animate'       => 'yes',
					'aurora_gradient_follow_mouse!' => 'yes',
				],
				'frontend_available' => true,
			]
		);

		// ── Speed ─────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_speed',
			[
				'label'     => esc_html__( 'Cycle Duration (s)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 1,
						'max'  => 30,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 8 ],
				'condition'          => [
					'aurora_gradient_enable'        => 'yes',
					'aurora_gradient_animate'       => 'yes',
					'aurora_gradient_follow_mouse!' => 'yes',
				],
				'frontend_available' => true,
			]
		);
	}

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Converts the saved settings into the wrapper's data-attributes.
	 * Returns an empty array when the gradient is disabled or has fewer
	 * than 2 valid colors.
	 *
	 * @param array             $settings Element settings.
	 * @param Element_Base|null $element  Element instance (defines background vs. text).
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		if ( empty( $settings['aurora_gradient_enable'] ) || 'yes' !== $settings['aurora_gradient_enable'] ) {
			return [];
		}

		$raw_stops = $settings['aurora_gradient_stops'] ?? [];
		if ( ! is_array( $raw_stops ) || count( $raw_stops ) < 2 ) {
			return [];
		}

		$stops = [];
		foreach ( $raw_stops as $stop ) {
			$color    = ! empty( $stop['color'] ) ? $stop['color'] : '#0afbc1';
			$sanitized = sanitize_hex_color( $color );
			$offset   = isset( $stop['offset']['size'] ) ? (float) $stop['offset']['size'] : null;
			$stops[]  = [
				'color'  => $sanitized ? $sanitized : preg_replace( '/[^#a-zA-Z0-9(),.%\s]/', '', $color ),
				'offset' => $offset,
			];
		}

		$name = $element ? $element->get_name() : '';

		if ( in_array( $name, self::TEXT_ELEMENTS, true ) ) {
			$target = 'text';
		} elseif ( in_array( $name, self::ICON_ELEMENTS, true ) ) {
			$target = 'icon';
		} elseif ( in_array( $name, self::CONFIGURABLE_TARGET_ELEMENTS, true ) ) {
			$target = ( 'icon' === ( $settings['aurora_gradient_apply_to'] ?? 'box' ) ) ? 'icon' : 'background';
		} else {
			$target = 'background';
		}

		$type = $settings['aurora_gradient_type'] ?? 'linear';
		$type = in_array( $type, [ 'linear', 'radial', 'conic' ], true ) ? $type : 'linear';

		$style = $settings['aurora_gradient_animation_style'] ?? 'mesh';
		$style = in_array( $style, [ 'mesh', 'loop' ], true ) ? $style : 'mesh';

		// Follow Mouse only applies to radial gradients (see register_fields())
		// and always wins over the time-based Animate option if a stale
		// "yes" is still saved on it — the two update the background in
		// incompatible ways (one from a CSS @keyframes loop, the other from
		// a mousemove listener), so JS should never try to run both.
		$follow_mouse = 'radial' === $type && 'yes' === ( $settings['aurora_gradient_follow_mouse'] ?? '' );
		$animate      = ! $follow_mouse && 'yes' === ( $settings['aurora_gradient_animate'] ?? '' );

		$text_mode = $settings['aurora_gradient_text_mode'] ?? 'phrase';
		$text_mode = in_array( $text_mode, [ 'phrase', 'per-letter' ], true ) ? $text_mode : 'phrase';

		return [
			'data-aurora-gradient-enable'           => '1',
			'data-aurora-gradient-target'           => esc_attr( $target ),
			'data-aurora-gradient-type'             => esc_attr( $type ),
			'data-aurora-gradient-angle'            => esc_attr( (int) ( $settings['aurora_gradient_angle']['size'] ?? 135 ) ),
			'data-aurora-gradient-stops'            => esc_attr( wp_json_encode( $stops ) ),
			'data-aurora-gradient-animate'          => $animate ? '1' : '0',
			'data-aurora-gradient-style'            => esc_attr( $style ),
			'data-aurora-gradient-speed'            => esc_attr( max( 1, (int) ( $settings['aurora_gradient_speed']['size'] ?? 8 ) ) ),
			'data-aurora-gradient-follow-mouse'     => $follow_mouse ? '1' : '0',
			'data-aurora-gradient-spotlight-radius' => esc_attr( max( 50, (int) ( $settings['aurora_gradient_spotlight_radius']['size'] ?? 600 ) ) ),
			'data-aurora-gradient-text-mode'        => esc_attr( $text_mode ),
		];
	}
}
