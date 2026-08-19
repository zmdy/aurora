<?php
/**
 * Children Animation Controls — injects staggered children-element
 * animation controls into the Advanced tab of structural Elementor
 * elements (section, column, container).
 *
 * Implements only what's specific to this module; the shared plumbing
 * (hooks, deduplication, section assembly) lives in Animation_Module.
 *
 * Scope is restricted to structural elements (section/column/container)
 * where animating child elements is a valid product feature. The common
 * hook is omitted so 0 controls are registered on standard non-container
 * widgets (Heading, Button, Spacer, etc.).
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
 * Registers the "Animate Children Elements" controls and injects attributes on render.
 */
class Children_Animation_Controls extends Animation_Module {

	/** Elements where this module appears: structural containers and list/grid widgets. */
	const SUPPORTED_ELEMENTS = [
		'section',
		'column',
		'container',
		'icon-list',
		'image-gallery',
		'icon-box',
		'image-box',
	];

	protected function get_section_id(): string {
		return 'aurora_children_section';
	}

	protected function get_section_label(): string {
		return __( 'Animate Children Elements', 'aurora-for-elementor' );
	}

	/**
	 * Registers on structural elements and supported list/grid widgets.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/icon-list/section_icon_list/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/icon-list/section_text_style/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/image-gallery/section_gallery/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/icon-box/section_style_box/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/image-box/section_style_box/after_section_end', 'priority' => 10 ],
		];
	}

	/**
	 * Appears on structural elements and list/grid widgets.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
	}

	/**
	 * Render hooks for injecting attributes on frontend before render.
	 */
	protected function get_render_hooks(): array {
		return [
			'elementor/frontend/element/before_render',
			'elementor/frontend/section/before_render',
			'elementor/frontend/container/before_render',
			'elementor/frontend/column/before_render',
			'elementor/frontend/widget/before_render',
		];
	}

	/**
	 * Registers fields for Animate Children Elements.
	 *
	 * @param Element_Base $element Element instance.
	 */
	protected function register_fields( Element_Base $element ): void {

		// ── Enable ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_enable',
			[
				'label'              => esc_html__( 'Animate Children Elements', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'frontend_available' => true,
			]
		);

		// ── Animation type ────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_animation',
			[
				'label'     => esc_html__( 'Animation Type', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'fade-up',
				'options'   => [
					'fade-up'    => esc_html__( 'Fade Up',      'aurora-for-elementor' ),
					'fade-down'  => esc_html__( 'Fade Down',    'aurora-for-elementor' ),
					'fade-in'    => esc_html__( 'Fade In',      'aurora-for-elementor' ),
					'slide-left' => esc_html__( 'Slide Left',   'aurora-for-elementor' ),
					'slide-right'=> esc_html__( 'Slide Right',  'aurora-for-elementor' ),
					'zoom-in'    => esc_html__( 'Zoom In',      'aurora-for-elementor' ),
					'zoom-out'   => esc_html__( 'Zoom Out',     'aurora-for-elementor' ),
					'flip-up'    => esc_html__( 'Flip Up',      'aurora-for-elementor' ),
					'rotate-in'  => esc_html__( 'Rotate In',    'aurora-for-elementor' ),
					'bounce-in'  => esc_html__( 'Bounce In',    'aurora-for-elementor' ),
				],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Target Children Type ─────────────────────────────────────────────
		$element->add_control(
			'aurora_children_target_type',
			[
				'label'              => esc_html__( 'Target Children (What to animate)', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'child_containers',
				'options'            => [
					'child_containers' => esc_html__( 'Direct Child Containers / Columns (Cards & Blocks)', 'aurora-for-elementor' ),
					'direct_children'  => esc_html__( 'All Direct Children (1st Level)', 'aurora-for-elementor' ),
					'all_widgets'      => esc_html__( 'All Nested Widgets (Any Depth)', 'aurora-for-elementor' ),
					'custom'           => esc_html__( 'Custom CSS Selector', 'aurora-for-elementor' ),
				],
				'condition'          => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Depth Level ───────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_depth',
			[
				'label'              => esc_html__( 'Max Depth Level', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => '1',
				'options'            => [
					'1'   => esc_html__( 'Level 1 (Direct Children Only)', 'aurora-for-elementor' ),
					'2'   => esc_html__( 'Level 2 (Up to 2nd Level)', 'aurora-for-elementor' ),
					'3'   => esc_html__( 'Level 3 (Up to 3rd Level)', 'aurora-for-elementor' ),
					'all' => esc_html__( 'Unlimited (All Levels)', 'aurora-for-elementor' ),
				],
				'condition'          => [
					'aurora_children_enable'       => 'yes',
					'aurora_children_target_type!' => 'all_widgets',
				],
				'frontend_available' => true,
			]
		);

		// ── Children selector (only for Custom) ───────────────────────────────
		$element->add_control(
			'aurora_children_selector',
			[
				'label'              => esc_html__( 'Custom CSS Selector', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::TEXT,
				'default'            => '.elementor-widget',
				'placeholder'        => '.elementor-widget, .my-card',
				'description'        => esc_html__( 'CSS selector used to identify the child elements to animate when Target is Custom.', 'aurora-for-elementor' ),
				'condition'          => [
					'aurora_children_enable'      => 'yes',
					'aurora_children_target_type' => 'custom',
				],
				'frontend_available' => true,
			]
		);

		// ── Duration ──────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_duration',
			[
				'label'     => esc_html__( 'Duration per child (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 3000,
						'step' => 50,
					],
				],
				'default'   => [ 'size' => 600 ],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Initial delay ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_delay',
			[
				'label'     => esc_html__( 'Initial delay (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 3000,
						'step' => 50,
					],
				],
				'default'   => [ 'size' => 0 ],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Stagger delay between children ────────────────────────────────────
		$element->add_control(
			'aurora_children_stagger',
			[
				'label'     => esc_html__( 'Delay between children (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 1000,
						'step' => 10,
					],
				],
				'default'   => [ 'size' => 150 ],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Trigger ───────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_trigger',
			[
				'label'     => esc_html__( 'Trigger on', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'scroll',
				'options'   => [
					'scroll' => esc_html__( 'Enter viewport (scroll)', 'aurora-for-elementor' ),
					'load'   => esc_html__( 'Page load', 'aurora-for-elementor' ),
				],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Threshold ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_threshold',
			[
				'label'     => esc_html__( 'Visibility threshold (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 5,
					],
				],
				'default'   => [ 'size' => 15 ],
				'condition' => [
					'aurora_children_enable'  => 'yes',
					'aurora_children_trigger' => 'scroll',
				],
				'frontend_available' => true,
			]
		);

		// ── Replay ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_replay',
			[
				'label'        => esc_html__( 'Replay on re-entering viewport', 'aurora-for-elementor' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'    => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value' => 'yes',
				'default'      => '',
				'condition'    => [
					'aurora_children_enable'  => 'yes',
					'aurora_children_trigger' => 'scroll',
				],
				'frontend_available' => true,
			]
		);
	}

	/**
	 * Builds the data-attributes that the children-animations JS module reads.
	 *
	 * @param array             $settings  Element settings from get_settings_for_display().
	 * @param Element_Base|null $element   Unused.
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		if ( empty( $settings['aurora_children_enable'] ) || 'yes' !== $settings['aurora_children_enable'] ) {
			return [];
		}

		// Sanitize the CSS selector (allow only valid characters). Cache per raw value.
		static $selector_cache = [];
		$raw_selector = $settings['aurora_children_selector'] ?? '.elementor-widget';
		if ( ! isset( $selector_cache[ $raw_selector ] ) ) {
			$selector_cache[ $raw_selector ] = preg_replace( '/[^a-zA-Z0-9_\-\.\s,:#>+~\[\]=^$*|()]/', '', $raw_selector )
				?: '.elementor-widget';
		}
		$selector = $selector_cache[ $raw_selector ];

		return [
			'data-aurora-children-enable'      => '1',
			'data-aurora-children-animation'   => esc_attr( $settings['aurora_children_animation'] ?? 'fade-up' ),
			'data-aurora-children-target-type' => esc_attr( $settings['aurora_children_target_type'] ?? 'child_containers' ),
			'data-aurora-children-depth'       => esc_attr( $settings['aurora_children_depth'] ?? '1' ),
			'data-aurora-children-selector'    => esc_attr( $selector ),
			'data-aurora-children-duration'    => esc_attr( $settings['aurora_children_duration']['size'] ?? 600 ),
			'data-aurora-children-delay'       => esc_attr( $settings['aurora_children_delay']['size'] ?? 0 ),
			'data-aurora-children-stagger'     => esc_attr( $settings['aurora_children_stagger']['size'] ?? 150 ),
			'data-aurora-children-trigger'     => esc_attr( $settings['aurora_children_trigger'] ?? 'scroll' ),
			'data-aurora-children-threshold'   => esc_attr( ( $settings['aurora_children_threshold']['size'] ?? 15 ) / 100 ),
			'data-aurora-children-replay'      => ( 'yes' === ( $settings['aurora_children_replay'] ?? '' ) ) ? '1' : '0',
		];
	}
}
