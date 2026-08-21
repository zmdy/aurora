<?php
/**
 * Glassmorphism Controls — glass effect (blur + transparency) for
 * images and containers: translucent background, backdrop-filter with
 * blur/saturation, and a subtle border.
 *
 * Implements only what's specific to this module; the shared plumbing
 * (hooks, deduplication, section assembly) lives in Animation_Module.
 *
 * Unlike the other modules, this one doesn't rely on frontend JS —
 * the whole effect is resolved into a single `style` attribute computed
 * in PHP, since blur/transparency/border don't need animation or
 * runtime DOM reads.
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
 * Registers the "Glassmorphism" controls and injects the style on render.
 */
class Glassmorphism_Controls extends Animation_Module {

	/** Elements where this module appears: images and containers. */
	const SUPPORTED_ELEMENTS = [ 'image', 'section', 'column', 'container' ];

	protected function get_section_id(): string {
		return 'aurora_glass_section';
	}

	protected function get_section_label(): string {
		return __( 'Glassmorphism', 'aurora-for-elementor' );
	}

	/**
	 * Only appears on the Image widget and on structural elements.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
	}

	/**
	 * The Image widget doesn't register its own "section_effects" (that
	 * only exists under "common"), but it does register its own
	 * "section_style_image" (a Style-tab section) — hooking after that
	 * still lets us place our new section in the Advanced tab, since the
	 * 'tab' argument of start_controls_section() is independent of which
	 * hook triggered it. Structural elements (section/column/container)
	 * get their own dedicated hooks below.
	 *
	 * Deliberately NOT hooking 'common/section_effects': debug logging
	 * proved that callback is invoked with a shared pseudo-element whose
	 * get_name() is literally "common"/"common-optimized" (never "image"
	 * or any real widget name), so applies_to_element()'s inclusion check
	 * can never pass there — it would only fire add_controls() on every
	 * widget on the page for nothing. A third-party plugin's Navigator
	 * Indicator was measurably degrading (multi-second main-thread blocks)
	 * partly because of the sheer number of registered control-section
	 * callbacks Elementor accumulates per widget across active plugins;
	 * every no-op hook we can drop reduces that surface for free.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/image/section_style_image/after_section_end', 'priority' => 40 ],
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 30 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 30 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 30 ],
		];
	}

	protected function get_render_hooks(): array {
		return [
			'elementor/frontend/before_render',
			'elementor/frontend/widget/before_render',
		];
	}

	// ── Controls ─────────────────────────────────────────────────────────────

	/**
	 * Fields of the "Glassmorphism" section.
	 *
	 * @param Element_Base $element Element instance.
	 */
	protected function register_fields( Element_Base $element ): void {

		// ── Enable ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_enable',
			[
				'label'              => esc_html__( 'Enable Glassmorphism', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'frontend_available' => true,
			]
		);

		// ── Glass color ───────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_tint',
			[
				'label'              => esc_html__( 'Glass Color', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => '#ffffff',
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Background opacity ────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_opacity',
			[
				'label'     => esc_html__( 'Background Opacity (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 18 ],
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Blur ──────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_blur',
			[
				'label'     => esc_html__( 'Blur Intensity (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 40,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 12 ],
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Saturation ────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_saturate',
			[
				'label'     => esc_html__( 'Saturation (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 250,
						'step' => 5,
					],
				],
				'default'            => [ 'size' => 180 ],
				'description'        => esc_html__( 'Increases the saturation of what appears behind the glass — the classic glassmorphism effect.', 'aurora-for-elementor' ),
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Border opacity ────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_border_opacity',
			[
				'label'     => esc_html__( 'Border Opacity (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 30 ],
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Border radius ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_radius',
			[
				'label'     => esc_html__( 'Border Radius (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 60,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 16 ],
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);
	}

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Converts the saved settings into a single `style` attribute (plus the
	 * support class used by the @supports fallback). Returns an empty array
	 * when the effect is disabled.
	 *
	 * @param array             $settings Element settings.
	 * @param Element_Base|null $element  Unused in this module.
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		if ( empty( $settings['aurora_glass_enable'] ) || 'yes' !== $settings['aurora_glass_enable'] ) {
			return [];
		}

		// Value from Elementor COLOR control is already sanitized by the framework.
		$tint = $settings['aurora_glass_tint'] ?: '#ffffff';
		list( $r, $g, $b ) = $this->hex_to_rgb( $tint );

		$blur           = max( 0, min( 40, (int) ( $settings['aurora_glass_blur']['size'] ?? 12 ) ) );
		$bg_opacity      = max( 0, min( 100, (int) ( $settings['aurora_glass_opacity']['size'] ?? 18 ) ) ) / 100;
		$saturate       = max( 100, min( 250, (int) ( $settings['aurora_glass_saturate']['size'] ?? 180 ) ) );
		$border_opacity = max( 0, min( 100, (int) ( $settings['aurora_glass_border_opacity']['size'] ?? 30 ) ) ) / 100;
		$radius         = max( 0, min( 60, (int) ( $settings['aurora_glass_radius']['size'] ?? 16 ) ) );

		$filter = sprintf( 'blur(%dpx) saturate(%d%%)', $blur, $saturate );

		$style = sprintf(
			'background:rgba(%d,%d,%d,%s);backdrop-filter:%s;-webkit-backdrop-filter:%s;border:1px solid rgba(255,255,255,%s);border-radius:%dpx;',
			$r,
			$g,
			$b,
			$bg_opacity,
			$filter,
			$filter,
			$border_opacity,
			$radius
		);

		return [
			'class' => 'aurora-glass-active',
			'style' => esc_attr( $style ),
		];
	}

	/**
	 * Converts a hex color (#rgb or #rrggbb) into [r, g, b]. Falls back
	 * to white if the color is invalid.
	 *
	 * @param string $hex Color in hexadecimal format.
	 * @return array{0:int, 1:int, 2:int}
	 */
	private function hex_to_rgb( string $hex ): array {
		$hex = ltrim( $hex, '#' );

		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}

		if ( 6 !== strlen( $hex ) || ! ctype_xdigit( $hex ) ) {
			return [ 255, 255, 255 ];
		}

		return [
			hexdec( substr( $hex, 0, 2 ) ),
			hexdec( substr( $hex, 2, 2 ) ),
			hexdec( substr( $hex, 4, 2 ) ),
		];
	}
}
