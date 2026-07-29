<?php
/**
 * Cursor Follow Controls — a two-part custom cursor (an inner dot that
 * tracks the mouse instantly and an outer ring that trails behind it)
 * active while the pointer is inside the element it's enabled on, with
 * configurable hover states for links/buttons and images.
 *
 * Implements only what's specific to this module; the shared plumbing
 * (hooks, deduplication, section assembly) lives in Animation_Module.
 *
 * Scope is restricted to containers and interactive elements where a
 * custom cursor zone makes sense (section, column, container, image,
 * icon-box, button). Deliberately omits the common hook to prevent 0-value
 * keys on standard non-interactive widgets.
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
 * Registers the "Cursor Follow" controls and injects the data-attributes on render.
 */
class Cursor_Follow_Controls extends Animation_Module {

	/** Elements where this module appears: structural containers and key interactive widgets. */
	const SUPPORTED_ELEMENTS = [ 'section', 'column', 'container', 'image', 'icon-box', 'button' ];

	protected function get_section_id(): string {
		return 'aurora_cursor_section';
	}

	protected function get_section_label(): string {
		return __( 'Cursor Follow', 'aurora-for-elementor' );
	}

	/**
	 * Registers on structural elements and supported widget style sections.
	 * The 'common' hook is omitted to prevent loading 0-value control keys on
	 * non-supported widgets.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/image/section_style_image/after_section_end', 'priority' => 50 ],
			[ 'hook' => 'elementor/element/icon-box/section_style_box/after_section_end', 'priority' => 50 ],
			[ 'hook' => 'elementor/element/button/section_style/after_section_end', 'priority' => 50 ],
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 40 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 40 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 40 ],
		];
	}

	/**
	 * Only appears on supported elements.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
	}

	/**
	 * Registers fields for Cursor Follow.
	 *
	 * @param Element_Base $element Element instance.
	 */
	protected function register_fields( Element_Base $element ): void {

		// ── Enable ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_enable',
			[
				'label'              => esc_html__( 'Enable Cursor Follow', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'description'        => esc_html__( 'Replaces the native cursor with a two-part custom cursor (dot + trailing ring) while the pointer is inside this element.', 'aurora-for-elementor' ),
				'frontend_available' => true,
			]
		);

		// ── Dot color ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_dot_color',
			[
				'label'              => esc_html__( 'Dot Color', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => '#ff7a2f',
				'condition'          => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Ring color ────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_ring_color',
			[
				'label'              => esc_html__( 'Ring Color', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => '#7c6cff',
				'condition'          => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Dot size ──────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_dot_size',
			[
				'label'     => esc_html__( 'Dot Size (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 2,
						'max'  => 24,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 8 ],
				'condition'          => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Ring size ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_ring_size',
			[
				'label'       => esc_html__( 'Ring Size (px)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'range'       => [
					'px' => [
						'min'  => 8,
						'max'  => 120,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 24 ],
				'description'        => esc_html__( 'Resting size of the trailing ring, before any hover scaling is applied.', 'aurora-for-elementor' ),
				'condition'          => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Trail delay ───────────────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_trail_delay',
			[
				'label'       => esc_html__( 'Trail Delay (ms)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'range'       => [
					'px' => [
						'min'  => 0,
						'max'  => 400,
						'step' => 10,
					],
				],
				'default'            => [ 'size' => 150 ],
				'description'        => esc_html__( 'How long the outer ring takes to catch up with the dot. The dot itself always tracks the mouse instantly.', 'aurora-for-elementor' ),
				'condition'          => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Interactive elements ──────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_interactive_selector',
			[
				'label'       => esc_html__( 'Interactive Elements Selector', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => 'a, button, .cursor-pointer',
				'placeholder' => 'a, button, .cursor-pointer',
				'description' => esc_html__( 'CSS selector for elements that should shrink/highlight the ring on hover (links, buttons, etc.).', 'aurora-for-elementor' ),
				'condition'   => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Interactive hover scale ───────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_interactive_scale',
			[
				'label'     => esc_html__( 'Interactive Hover Scale', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0.2,
						'max'  => 3,
						'step' => 0.05,
					],
				],
				'default'   => [ 'size' => 1.5 ],
				'condition' => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Image elements ────────────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_image_selector',
			[
				'label'       => esc_html__( 'Image Elements Selector', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => 'img, .zoom-target',
				'placeholder' => 'img, .zoom-target',
				'description' => esc_html__( 'CSS selector for elements that should grow/highlight the ring on hover (images, galleries, etc.).', 'aurora-for-elementor' ),
				'condition'   => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Image hover scale ─────────────────────────────────────────────────
		$element->add_control(
			'aurora_cursor_image_scale',
			[
				'label'     => esc_html__( 'Image Hover Scale', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0.2,
						'max'  => 4,
						'step' => 0.05,
					],
				],
				'default'   => [ 'size' => 2.33 ],
				'condition' => [ 'aurora_cursor_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);
	}

	/**
	 * Builds the data-attributes that the cursor-follow JS module reads.
	 *
	 * @param array             $settings  Element settings from get_settings_for_display().
	 * @param Element_Base|null $element   Unused.
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		if ( empty( $settings['aurora_cursor_enable'] ) || 'yes' !== $settings['aurora_cursor_enable'] ) {
			return [];
		}

		// Values from Elementor COLOR controls are already sanitized by the framework.
		$dot_color  = $settings['aurora_cursor_dot_color'] ?: '#ff7a2f';
		$ring_color = $settings['aurora_cursor_ring_color'] ?: '#7c6cff';

		static $selector_cache = [];
		$raw_interactive_selector = $settings['aurora_cursor_interactive_selector'] ?? 'a, button, .cursor-pointer';
		if ( ! isset( $selector_cache[ $raw_interactive_selector ] ) ) {
			$selector_cache[ $raw_interactive_selector ] = preg_replace( '/[^a-zA-Z0-9_\-\.\s,:#>+~\[\]=^$*|()]/', '', $raw_interactive_selector )
				?: 'a, button, .cursor-pointer';
		}
		$interactive_selector = $selector_cache[ $raw_interactive_selector ];

		$raw_image_selector = $settings['aurora_cursor_image_selector'] ?? 'img, .zoom-target';
		if ( ! isset( $selector_cache[ $raw_image_selector ] ) ) {
			$selector_cache[ $raw_image_selector ] = preg_replace( '/[^a-zA-Z0-9_\-\.\s,:#>+~\[\]=^$*|()]/', '', $raw_image_selector )
				?: 'img, .zoom-target';
		}
		$image_selector = $selector_cache[ $raw_image_selector ];

		return [
			'data-aurora-cursor-enable'               => '1',
			'data-aurora-cursor-dot-color'             => esc_attr( $dot_color ),
			'data-aurora-cursor-ring-color'            => esc_attr( $ring_color ),
			'data-aurora-cursor-dot-size'               => esc_attr( (int) ( $settings['aurora_cursor_dot_size']['size'] ?? 8 ) ),
			'data-aurora-cursor-ring-size'              => esc_attr( (int) ( $settings['aurora_cursor_ring_size']['size'] ?? 24 ) ),
			'data-aurora-cursor-trail-delay'            => esc_attr( (int) ( $settings['aurora_cursor_trail_delay']['size'] ?? 150 ) ),
			'data-aurora-cursor-interactive-selector'   => esc_attr( $interactive_selector ),
			'data-aurora-cursor-interactive-scale'      => esc_attr( $settings['aurora_cursor_interactive_scale']['size'] ?? 1.5 ),
			'data-aurora-cursor-image-selector'         => esc_attr( $image_selector ),
			'data-aurora-cursor-image-scale'            => esc_attr( $settings['aurora_cursor_image_scale']['size'] ?? 2.33 ),
		];
	}
}
