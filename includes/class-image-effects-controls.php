<?php
/**
 * Image Effects Controls — advanced entrance (reveal/impact) animations
 * and hover effects for the native Elementor Image widget.
 *
 * Two fully independent toggles instead of a single master switch, since
 * a user may want only the entrance animation, only the hover effect, or
 * both at once:
 *   - Entrance: user picks a Library (GSAP or Anime.js, mirroring the Text
 *     Animation module). GSAP offers 13 effects (fade, slide, zoom, flip,
 *     blur, skew, and 4 "reveal" effects — wipe/curtain/iris — that need
 *     an animated overlay); Anime.js offers 8 spring/elastic-leaning
 *     effects (Elastic Pop, Bounce Drop, etc.). Needs frontend JS
 *     (image-effects.js), since it depends on GSAP/Anime.js tweens and
 *     (for scroll trigger) IntersectionObserver.
 *   - Hover: 7 effects, including the "shine" sweep. Resolved entirely in
 *     CSS (:hover + transition), the same "no JS" approach already used by
 *     Glassmorphism — PHP only needs to compute a `style` attribute with a
 *     handful of CSS custom properties plus a data-attribute for effect
 *     dispatch (see assets/css/image-effects.css).
 *
 * Implements only what's specific to this module; the shared plumbing
 * (hooks, deduplication, section assembly) lives in Animation_Module.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the "Image Effects" controls and injects the data-attributes
 * (entrance) and style/class (hover) on render.
 */
class Image_Effects_Controls extends Animation_Module {

	/** Elements where this module appears: only the native Image widget. */
	const SUPPORTED_ELEMENTS = [ 'image' ];

	/** Valid GSAP entrance effect keys (13 — comfortably above the 10 requested). */
	const ENTRANCE_EFFECTS = [
		'fade-up',
		'fade-in',
		'slide-left',
		'slide-right',
		'zoom-in',
		'zoom-out',
		'flip-3d',
		'blur-reveal',
		'skew-reveal',
		'wipe-left',
		'wipe-up',
		'curtain',
		'iris',
	];

	/** Valid Anime.js entrance effect keys (8 — spring/elastic-leaning, Anime.js's specialty). */
	const ANIME_ENTRANCE_EFFECTS = [
		'am-1',
		'am-2',
		'am-3',
		'am-4',
		'am-5',
		'am-6',
		'am-7',
		'am-8',
	];

	/** Entrance effects that need an animated overlay (and therefore an overlay color) — GSAP only. */
	const OVERLAY_EFFECTS = [ 'wipe-left', 'wipe-up', 'curtain', 'iris' ];

	/** Valid hover effect keys. */
	const HOVER_EFFECTS = [
		'shine',
		'circle',
		'blur-sharp',
		'sharp-blur',
		'zoom-in',
		'zoom-out',
		'grayscale',
		'grayscale-reverse',
		'rotate-zoom',
		'tint',
		'slide-overlay',
		'3d-tilt',
		'rgb-split',
		'liquid-warp',
		'pixelate',
	];

	protected function get_section_id(): string {
		return 'aurora_img_fx_section';
	}

	protected function get_section_label(): string {
		return __( 'Image Effects', 'aurora-for-elementor' );
	}

	/**
	 * Only appears on the native Image widget.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
	}

	/**
	 * Needs a dedicated hook targeting a section that genuinely belongs to
	 * the Image widget itself, not just the generic "common" one — debug
	 * logging proved the 'common'/'common-optimized' callback is invoked
	 * with a shared pseudo-element (get_name() literally "common"/
	 * "common-optimized", never "image"), so an inclusion check for a
	 * specific widget type can never pass there. The Image widget doesn't
	 * register its own "section_effects", but it does register its own
	 * "section_style_image" (a Style-tab section) — hooking after that
	 * still lets us place our new section in the Advanced tab, since the
	 * 'tab' argument of start_controls_section() is independent of which
	 * hook triggered it. Kept the "common" hook too, harmlessly, since
	 * applies_to_element() already filters it out.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/image/section_style_image/after_section_end', 'priority' => 10 ],
		];
	}

	/**
	 * Same reasoning as Text_Animation_Controls/Gradient_Controls: ensures
	 * the widget's before_render hook (in addition to the generic element
	 * one) actually fires so the data-attributes make it onto the frontend.
	 */
	protected function get_render_hooks(): array {
		return [
			'elementor/frontend/element/before_render',
			'elementor/frontend/widget/before_render',
		];
	}

	// ── Controls ─────────────────────────────────────────────────────────────

	/**
	 * Fields of the "Image Effects" section.
	 *
	 * @param Element_Base $element Element instance.
	 */
	protected function register_fields( Element_Base $element ): void {

		// ── Entrance: enable ──────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_entrance_enable',
			[
				'label'              => esc_html__( 'Enable Entrance Animation', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'description'        => esc_html__( 'Plays a reveal/impact animation the first time the image enters the screen (or on page load).', 'aurora-for-elementor' ),
				'frontend_available' => true,
			]
		);

		// ── Entrance: library ─────────────────────────────────────────────────
		$has_gsap = AURORA_HAS_GSAP;
		$lib_options = [];
		if ( $has_gsap ) {
			$lib_options['gsap'] = esc_html__( 'GSAP', 'aurora-for-elementor' );
		}
		$lib_options['animejs'] = esc_html__( 'Anime.js', 'aurora-for-elementor' );

		$element->add_control(
			'aurora_img_entrance_library',
			[
				'label'              => esc_html__( 'Library', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => $has_gsap ? 'gsap' : 'animejs',
				'options'            => $lib_options,
				'condition'          => [ 'aurora_img_entrance_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		if ( $has_gsap ) {
			// ── Entrance: effect — GSAP ───────────────────────────────────────────
			$element->add_control(
				'aurora_img_entrance_effect',
				[
					'label'              => esc_html__( 'Entrance Effect', 'aurora-for-elementor' ),
					'type'               => Controls_Manager::SELECT,
					'default'            => 'fade-up',
					'options'            => [
						'fade-up'     => esc_html__( 'Fade Up', 'aurora-for-elementor' ),
						'fade-in'     => esc_html__( 'Fade In', 'aurora-for-elementor' ),
						'slide-left'  => esc_html__( 'Slide from Left', 'aurora-for-elementor' ),
						'slide-right' => esc_html__( 'Slide from Right', 'aurora-for-elementor' ),
						'zoom-in'     => esc_html__( 'Zoom In', 'aurora-for-elementor' ),
						'zoom-out'    => esc_html__( 'Zoom Out', 'aurora-for-elementor' ),
						'flip-3d'     => esc_html__( 'Flip 3D', 'aurora-for-elementor' ),
						'blur-reveal' => esc_html__( 'Blur Reveal', 'aurora-for-elementor' ),
						'skew-reveal' => esc_html__( 'Skew Reveal', 'aurora-for-elementor' ),
						'wipe-left'   => esc_html__( 'Wipe Reveal (Left → Right)', 'aurora-for-elementor' ),
						'wipe-up'     => esc_html__( 'Wipe Reveal (Bottom → Top)', 'aurora-for-elementor' ),
						'curtain'     => esc_html__( 'Curtain Reveal (Split Center)', 'aurora-for-elementor' ),
						'iris'        => esc_html__( 'Iris Reveal (Circle Expand)', 'aurora-for-elementor' ),
					],
					'condition'          => [
						'aurora_img_entrance_enable'  => 'yes',
						'aurora_img_entrance_library' => 'gsap',
					],
					'frontend_available' => true,
				]
			);
		}

		// ── Entrance: effect — Anime.js ────────────────────────────────────────
		// Leans into what Anime.js is best at — spring/elastic-feeling settles —
		// rather than duplicating the GSAP list.
		$element->add_control(
			'aurora_img_entrance_effect_anime',
			[
				'label'              => esc_html__( 'Entrance Effect', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'am-1',
				'options'            => [
					'am-1' => esc_html__( 'Elastic Pop', 'aurora-for-elementor' ),
					'am-2' => esc_html__( 'Bounce Drop', 'aurora-for-elementor' ),
					'am-3' => esc_html__( 'Spring Rotate', 'aurora-for-elementor' ),
					'am-4' => esc_html__( 'Soft Zoom', 'aurora-for-elementor' ),
					'am-5' => esc_html__( 'Swing In', 'aurora-for-elementor' ),
					'am-6' => esc_html__( 'Perspective Tilt', 'aurora-for-elementor' ),
					'am-7' => esc_html__( 'Elastic Slide', 'aurora-for-elementor' ),
					'am-8' => esc_html__( 'Jelly Squash', 'aurora-for-elementor' ),
				],
				'condition'          => [
					'aurora_img_entrance_enable'  => 'yes',
					'aurora_img_entrance_library' => 'animejs',
				],
				'frontend_available' => true,
			]
		);

		// ── Entrance: overlay color ───────────────────────────────────────────
		// Only used by the 4 "reveal" effects, which cover the image with an
		// animated overlay panel that then wipes/expands away — see
		// OVERLAY_EFFECTS and image-effects.js.
		$element->add_control(
			'aurora_img_entrance_overlay_color',
			[
				'label'              => esc_html__( 'Overlay Color', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => '#0afbc1',
				'condition'          => [
					'aurora_img_entrance_enable'  => 'yes',
					'aurora_img_entrance_library' => 'gsap',
					'aurora_img_entrance_effect'  => self::OVERLAY_EFFECTS,
				],
				'frontend_available' => true,
			]
		);

		// ── Entrance: duration ────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_entrance_duration',
			[
				'label'     => esc_html__( 'Duration (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 3000,
						'step' => 50,
					],
				],
				'default'            => [ 'size' => 800 ],
				'condition'          => [ 'aurora_img_entrance_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Entrance: delay ───────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_entrance_delay',
			[
				'label'     => esc_html__( 'Delay (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 3000,
						'step' => 50,
					],
				],
				'default'            => [ 'size' => 0 ],
				'condition'          => [ 'aurora_img_entrance_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Entrance: trigger ─────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_entrance_trigger',
			[
				'label'              => esc_html__( 'Trigger', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'scroll',
				'options'            => [
					'scroll' => esc_html__( 'On Scroll (when visible)', 'aurora-for-elementor' ),
					'load'   => esc_html__( 'On Page Load', 'aurora-for-elementor' ),
				],
				'condition'          => [ 'aurora_img_entrance_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Entrance: visibility threshold ────────────────────────────────────
		$element->add_control(
			'aurora_img_entrance_threshold',
			[
				'label'     => esc_html__( 'Visibility Threshold (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 5,
					],
				],
				'default'            => [ 'size' => 15 ],
				'description'        => esc_html__( 'How much of the image must be visible before the animation plays.', 'aurora-for-elementor' ),
				'condition'          => [
					'aurora_img_entrance_enable'  => 'yes',
					'aurora_img_entrance_trigger' => 'scroll',
				],
				'frontend_available' => true,
			]
		);

		// ── Entrance: replay ──────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_entrance_replay',
			[
				'label'              => esc_html__( 'Replay Every Time Visible', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'condition'          => [
					'aurora_img_entrance_enable'  => 'yes',
					'aurora_img_entrance_trigger' => 'scroll',
				],
				'frontend_available' => true,
			]
		);

		// ── Hover: enable ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_enable',
			[
				'label'              => esc_html__( 'Enable Hover Effect', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'separator'          => 'before',
				'description'        => esc_html__( 'Independent from the Entrance Animation above — can be used alone or combined with it.', 'aurora-for-elementor' ),
				'frontend_available' => true,
			]
		);

		// ── Hover: trigger ───────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_trigger',
			[
				'label'              => esc_html__( 'Activation Trigger', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'hover',
				'options'            => [
					'hover'  => esc_html__( 'On Hover Only', 'aurora-for-elementor' ),
					'appear' => esc_html__( 'On Appear (Scroll Reveal)', 'aurora-for-elementor' ),
					'both'   => esc_html__( 'Both (On Appear & On Hover)', 'aurora-for-elementor' ),
				],
				'condition'          => [ 'aurora_img_hover_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Hover: effect ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_effect',
			[
				'label'              => esc_html__( 'Image Effect Preset', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'shine',
				'options'            => [
					'shine'             => esc_html__( 'Shine Sweep (NxWorld)', 'aurora-for-elementor' ),
					'circle'            => esc_html__( 'Circle Ripple (NxWorld)', 'aurora-for-elementor' ),
					'blur-sharp'        => esc_html__( 'Blur → Sharp Focus', 'aurora-for-elementor' ),
					'sharp-blur'        => esc_html__( 'Sharp → Blur Focus', 'aurora-for-elementor' ),
					'zoom-in'           => esc_html__( 'Zoom In', 'aurora-for-elementor' ),
					'zoom-out'          => esc_html__( 'Zoom Out', 'aurora-for-elementor' ),
					'grayscale'         => esc_html__( 'Grayscale → Color', 'aurora-for-elementor' ),
					'grayscale-reverse' => esc_html__( 'Color → Grayscale', 'aurora-for-elementor' ),
					'rotate-zoom'       => esc_html__( 'Rotate + Zoom', 'aurora-for-elementor' ),
					'tint'              => esc_html__( 'Color Tint Overlay', 'aurora-for-elementor' ),
					'slide-overlay'     => esc_html__( 'Slide Color Overlay (Framer)', 'aurora-for-elementor' ),
					'3d-tilt'           => esc_html__( 'Interactive 3D Tilt (Framer)', 'aurora-for-elementor' ),
					'rgb-split'         => esc_html__( 'Chromatic RGB Split (Framer)', 'aurora-for-elementor' ),
					'liquid-warp'       => esc_html__( 'Liquid Warp Distortion (Framer)', 'aurora-for-elementor' ),
					'pixelate'          => esc_html__( 'Retro Pixelate Reveal', 'aurora-for-elementor' ),
				],
				'condition'          => [ 'aurora_img_hover_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Hover: duration ───────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_duration',
			[
				'label'     => esc_html__( 'Hover Duration (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 2000,
						'step' => 50,
					],
				],
				'default'            => [ 'size' => 500 ],
				'condition'          => [ 'aurora_img_hover_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Hover: shine color/width (shine only) ─────────────────────────────
		$element->add_control(
			'aurora_img_hover_shine_color',
			[
				'label'              => esc_html__( 'Shine Color', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => '#ffffff',
				'condition'          => [
					'aurora_img_hover_enable' => 'yes',
					'aurora_img_hover_effect' => 'shine',
				],
				'frontend_available' => true,
			]
		);

		$element->add_control(
			'aurora_img_hover_shine_width',
			[
				'label'     => esc_html__( 'Shine Width (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 10,
						'max'  => 100,
						'step' => 5,
					],
				],
				'default'            => [ 'size' => 30 ],
				'condition'          => [
					'aurora_img_hover_enable' => 'yes',
					'aurora_img_hover_effect' => 'shine',
				],
				'frontend_available' => true,
			]
		);

		// ── Hover: tint color (tint or slide-overlay) ─────────────────────────
		$element->add_control(
			'aurora_img_hover_tint_color',
			[
				'label'              => esc_html__( 'Color / Overlay Tint', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => '#7c6cff',
				'condition'          => [
					'aurora_img_hover_enable' => 'yes',
					'aurora_img_hover_effect' => [ 'tint', 'slide-overlay' ],
				],
				'frontend_available' => true,
			]
		);

		// ── Hover: slide overlay direction ────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_slide_dir',
			[
				'label'              => esc_html__( 'Slide Direction', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'up',
				'options'            => [
					'up'    => esc_html__( 'Slide Up', 'aurora-for-elementor' ),
					'down'  => esc_html__( 'Slide Down', 'aurora-for-elementor' ),
					'left'  => esc_html__( 'Slide Left', 'aurora-for-elementor' ),
					'right' => esc_html__( 'Slide Right', 'aurora-for-elementor' ),
				],
				'condition'          => [
					'aurora_img_hover_enable' => 'yes',
					'aurora_img_hover_effect' => 'slide-overlay',
				],
				'frontend_available' => true,
			]
		);

		// ── Hover: RGB Split Amount ───────────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_rgb_amount',
			[
				'label'     => esc_html__( 'RGB Split Amount (px)', 'aurora-for-elementor' ),
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
					'aurora_img_hover_enable' => 'yes',
					'aurora_img_hover_effect' => 'rgb-split',
				],
				'frontend_available' => true,
			]
		);

		// ── Hover: Circle Radius/Scale ────────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_circle_color',
			[
				'label'              => esc_html__( 'Circle Overlay Color', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => 'rgba(255,255,255,0.25)',
				'condition'          => [
					'aurora_img_hover_enable' => 'yes',
					'aurora_img_hover_effect' => 'circle',
				],
				'frontend_available' => true,
			]
		);
	}

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Converts the saved settings into the wrapper's data-attributes
	 * (entrance) plus a computed `style`/`class`/data-attribute (hover).
	 * The two halves are independent — either, both, or neither can be
	 * present depending on the two enable switches.
	 *
	 * @param array             $settings Element settings.
	 * @param Element_Base|null $element  Unused in this module.
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		$attrs = [];

		// ── Entrance ──────────────────────────────────────────────────────────
		if ( ! empty( $settings['aurora_img_entrance_enable'] ) && 'yes' === $settings['aurora_img_entrance_enable'] ) {

			$library = ( 'animejs' === ( $settings['aurora_img_entrance_library'] ?? 'gsap' ) ) ? 'animejs' : 'gsap';

			if ( 'animejs' === $library ) {
				$effect = $settings['aurora_img_entrance_effect_anime'] ?? 'am-1';
				$effect = in_array( $effect, self::ANIME_ENTRANCE_EFFECTS, true ) ? $effect : 'am-1';
			} else {
				$effect = $settings['aurora_img_entrance_effect'] ?? 'fade-up';
				$effect = in_array( $effect, self::ENTRANCE_EFFECTS, true ) ? $effect : 'fade-up';
			}

			// Overlay reveal panels (wipe/curtain/iris) are a GSAP-only concept.
			$needs_overlay = 'gsap' === $library && in_array( $effect, self::OVERLAY_EFFECTS, true );
			// Value from Elementor COLOR control is already sanitized by the framework.
			$overlay_color = $settings['aurora_img_entrance_overlay_color'] ?: '#0afbc1';

			$trigger = 'load' === ( $settings['aurora_img_entrance_trigger'] ?? 'scroll' ) ? 'load' : 'scroll';

			$attrs['data-aurora-img-entrance-enable']    = '1';
			$attrs['data-aurora-img-entrance-library']   = esc_attr( $library );
			$attrs['data-aurora-img-entrance']           = esc_attr( $effect );
			$attrs['data-aurora-img-entrance-overlay']   = $needs_overlay ? esc_attr( $overlay_color ) : '';
			$attrs['data-aurora-img-entrance-duration']  = esc_attr( max( 100, (int) ( $settings['aurora_img_entrance_duration']['size'] ?? 800 ) ) );
			$attrs['data-aurora-img-entrance-delay']     = esc_attr( max( 0, (int) ( $settings['aurora_img_entrance_delay']['size'] ?? 0 ) ) );
			$attrs['data-aurora-img-entrance-trigger']   = esc_attr( $trigger );
			$attrs['data-aurora-img-entrance-threshold'] = esc_attr( max( 0, min( 100, (int) ( $settings['aurora_img_entrance_threshold']['size'] ?? 15 ) ) ) );
			$attrs['data-aurora-img-entrance-replay']    = 'yes' === ( $settings['aurora_img_entrance_replay'] ?? '' ) ? '1' : '0';
		}

		// ── Hover / Appear (CSS + JS dynamic bindings) ────────────────────────
		if ( ! empty( $settings['aurora_img_hover_enable'] ) && 'yes' === $settings['aurora_img_hover_enable'] ) {

			$hover = $settings['aurora_img_hover_effect'] ?? 'shine';
			$hover = in_array( $hover, self::HOVER_EFFECTS, true ) ? $hover : 'shine';

			$trigger = $settings['aurora_img_hover_trigger'] ?? 'hover';
			$trigger = in_array( $trigger, [ 'hover', 'appear', 'both' ], true ) ? $trigger : 'hover';

			$duration = max( 100, (int) ( $settings['aurora_img_hover_duration']['size'] ?? 500 ) );

			// Values from Elementor COLOR controls are already sanitized by the framework.
			$shine_color = $settings['aurora_img_hover_shine_color'] ?: '#ffffff';
			$shine_width = max( 10, min( 100, (int) ( $settings['aurora_img_hover_shine_width']['size'] ?? 30 ) ) );

			$circle_color = $settings['aurora_img_hover_circle_color'] ?? 'rgba(255,255,255,0.25)';

			$tint_color = $settings['aurora_img_hover_tint_color'] ?: '#7c6cff';

			$slide_dir = $settings['aurora_img_hover_slide_dir'] ?? 'up';
			$rgb_amount = max( 1, (int) ( $settings['aurora_img_hover_rgb_amount']['size'] ?? 8 ) );

			$style = sprintf(
				'--aurora-img-hover-duration:%dms;--aurora-img-shine-color:%s;--aurora-img-shine-width:%d%%;--aurora-img-tint-color:%s;--aurora-img-circle-color:%s;--aurora-img-rgb-amount:%dpx;',
				$duration,
				$shine_color,
				$shine_width,
				$tint_color,
				$circle_color,
				$rgb_amount
			);

			$attrs['class']                  = trim( ( $attrs['class'] ?? '' ) . ' aurora-img-hover-active' );
			$attrs['style']                  = esc_attr( ( $attrs['style'] ?? '' ) . $style );
			$attrs['data-aurora-img-hover']  = esc_attr( $hover );
			$attrs['data-aurora-img-trigger'] = esc_attr( $trigger );
			$attrs['data-aurora-img-slide']   = esc_attr( $slide_dir );
		}

		return $attrs;
	}
}
