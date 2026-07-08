<?php
/**
 * Image Effects Controls — advanced entrance (reveal/impact) animations
 * and hover effects for the native Elementor Image widget.
 *
 * Two fully independent toggles instead of a single master switch, since
 * a user may want only the entrance animation, only the hover effect, or
 * both at once:
 *   - Entrance: 13 scroll/load-triggered effects (fade, slide, zoom, flip,
 *     blur, skew, and 4 "reveal" effects — wipe/curtain/iris — that need
 *     an animated overlay). Needs frontend JS (image-effects.js), since it
 *     depends on GSAP tweens and (for scroll trigger) IntersectionObserver.
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

	/** Valid entrance effect keys (13 — comfortably above the 10 requested). */
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

	/** Entrance effects that need an animated overlay (and therefore an overlay color). */
	const OVERLAY_EFFECTS = [ 'wipe-left', 'wipe-up', 'curtain', 'iris' ];

	/** Valid hover effect keys. */
	const HOVER_EFFECTS = [
		'shine',
		'zoom-in',
		'grayscale',
		'blur-sharp',
		'tint',
		'brightness',
		'rotate-zoom',
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
	 * Uses a dedicated hook for the Image widget instead of the generic
	 * "common" one — the "common" section_effects hook doesn't reliably
	 * fire for the Image widget across Elementor versions (same issue
	 * found and fixed in Glassmorphism_Controls), which was hiding this
	 * entire section. Since this module only ever targets 'image', there's
	 * no need for the catch-all "common" hook at all.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/image/section_effects/after_section_end', 'priority' => 10 ],
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

		// ── Entrance: effect ──────────────────────────────────────────────────
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
				'condition'          => [ 'aurora_img_entrance_enable' => 'yes' ],
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
					'aurora_img_entrance_enable' => 'yes',
					'aurora_img_entrance_effect' => self::OVERLAY_EFFECTS,
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

		// ── Hover: effect ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_effect',
			[
				'label'              => esc_html__( 'Hover Effect', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'shine',
				'options'            => [
					'shine'       => esc_html__( 'Shine Sweep', 'aurora-for-elementor' ),
					'zoom-in'     => esc_html__( 'Zoom In', 'aurora-for-elementor' ),
					'grayscale'   => esc_html__( 'Grayscale → Color', 'aurora-for-elementor' ),
					'blur-sharp'  => esc_html__( 'Blur → Sharp Focus', 'aurora-for-elementor' ),
					'tint'        => esc_html__( 'Color Tint Overlay', 'aurora-for-elementor' ),
					'brightness'  => esc_html__( 'Brightness Pop', 'aurora-for-elementor' ),
					'rotate-zoom' => esc_html__( 'Rotate + Zoom', 'aurora-for-elementor' ),
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

		// ── Hover: tint color (tint only) ─────────────────────────────────────
		$element->add_control(
			'aurora_img_hover_tint_color',
			[
				'label'              => esc_html__( 'Tint Color', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => '#7c6cff',
				'condition'          => [
					'aurora_img_hover_enable' => 'yes',
					'aurora_img_hover_effect' => 'tint',
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

			$effect = $settings['aurora_img_entrance_effect'] ?? 'fade-up';
			$effect = in_array( $effect, self::ENTRANCE_EFFECTS, true ) ? $effect : 'fade-up';

			$needs_overlay = in_array( $effect, self::OVERLAY_EFFECTS, true );
			$overlay_color = sanitize_hex_color( $settings['aurora_img_entrance_overlay_color'] ?? '#0afbc1' );
			$overlay_color = $overlay_color ? $overlay_color : '#0afbc1';

			$trigger = 'load' === ( $settings['aurora_img_entrance_trigger'] ?? 'scroll' ) ? 'load' : 'scroll';

			$attrs['data-aurora-img-entrance-enable']    = '1';
			$attrs['data-aurora-img-entrance']           = esc_attr( $effect );
			$attrs['data-aurora-img-entrance-overlay']   = $needs_overlay ? esc_attr( $overlay_color ) : '';
			$attrs['data-aurora-img-entrance-duration']  = esc_attr( max( 100, (int) ( $settings['aurora_img_entrance_duration']['size'] ?? 800 ) ) );
			$attrs['data-aurora-img-entrance-delay']     = esc_attr( max( 0, (int) ( $settings['aurora_img_entrance_delay']['size'] ?? 0 ) ) );
			$attrs['data-aurora-img-entrance-trigger']   = esc_attr( $trigger );
			$attrs['data-aurora-img-entrance-threshold'] = esc_attr( max( 0, min( 100, (int) ( $settings['aurora_img_entrance_threshold']['size'] ?? 15 ) ) ) );
			$attrs['data-aurora-img-entrance-replay']    = 'yes' === ( $settings['aurora_img_entrance_replay'] ?? '' ) ? '1' : '0';
		}

		// ── Hover (pure CSS — no JS involved) ─────────────────────────────────
		if ( ! empty( $settings['aurora_img_hover_enable'] ) && 'yes' === $settings['aurora_img_hover_enable'] ) {

			$hover = $settings['aurora_img_hover_effect'] ?? 'shine';
			$hover = in_array( $hover, self::HOVER_EFFECTS, true ) ? $hover : 'shine';

			$duration = max( 100, (int) ( $settings['aurora_img_hover_duration']['size'] ?? 500 ) );

			$shine_color = sanitize_hex_color( $settings['aurora_img_hover_shine_color'] ?? '#ffffff' );
			$shine_color = $shine_color ? $shine_color : '#ffffff';
			$shine_width = max( 10, min( 100, (int) ( $settings['aurora_img_hover_shine_width']['size'] ?? 30 ) ) );

			$tint_color = sanitize_hex_color( $settings['aurora_img_hover_tint_color'] ?? '#7c6cff' );
			$tint_color = $tint_color ? $tint_color : '#7c6cff';

			$style = sprintf(
				'--aurora-img-hover-duration:%dms;--aurora-img-shine-color:%s;--aurora-img-shine-width:%d%%;--aurora-img-tint-color:%s;',
				$duration,
				$shine_color,
				$shine_width,
				$tint_color
			);

			$attrs['class']                 = trim( ( $attrs['class'] ?? '' ) . ' aurora-img-hover-active' );
			$attrs['style']                 = esc_attr( ( $attrs['style'] ?? '' ) . $style );
			$attrs['data-aurora-img-hover'] = esc_attr( $hover );
		}

		return $attrs;
	}
}
