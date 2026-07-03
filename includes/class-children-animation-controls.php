<?php
/**
 * Children Animation Controls — injects staggered children-element
 * animation controls into the Advanced tab of every Elementor element.
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
 * Registers the "Animate Children Elements" controls and injects attributes on render.
 */
class Children_Animation_Controls extends Animation_Module {

	protected function get_section_id(): string {
		return 'aurora_children_section';
	}

	protected function get_section_label(): string {
		return __( 'Animate Children Elements', 'aurora-for-elementor' );
	}

	/**
	 * This module acts on widgets, sections, columns and containers —
	 * unlike the default (widgets only) used by most modules.
	 */
	protected function get_controls_hooks(): array {
		return [
			// priority 20 so it comes after text animation (10) on widgets.
			[ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 20 ],
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 10 ],
		];
	}

	// ── Controls ─────────────────────────────────────────────────────────────

	/**
	 * Fields of the "Animate Children Elements" section.
	 *
	 * @param Element_Base $element  Element instance.
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
					'slide-left' => esc_html__( 'Slide Left', 'aurora-for-elementor' ),
					'slide-right'=> esc_html__( 'Slide Right',  'aurora-for-elementor' ),
					'zoom-in'    => esc_html__( 'Zoom In',      'aurora-for-elementor' ),
					'zoom-out'   => esc_html__( 'Zoom Out',     'aurora-for-elementor' ),
					'flip-up'    => esc_html__( 'Flip Up',      'aurora-for-elementor' ),
					'rotate-in'  => esc_html__( 'Rotate In',   'aurora-for-elementor' ),
					'bounce-in'  => esc_html__( 'Bounce In',   'aurora-for-elementor' ),
				],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Children selector ─────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_selector',
			[
				'label'       => esc_html__( 'Children CSS Selector', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => '.elementor-widget',
				'placeholder' => '.elementor-widget, .elementor-icon-list-item',
				'description' => esc_html__( 'CSS selector used to identify the child elements to animate. Default: .elementor-widget', 'aurora-for-elementor' ),
				'condition'   => [ 'aurora_children_enable' => 'yes' ],
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

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Converts the saved settings into the wrapper's data-attributes.
	 * Returns an empty array when the animation is disabled.
	 *
	 * @param array             $settings  Element settings.
	 * @param Element_Base|null $element   Unused in this module.
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		if ( empty( $settings['aurora_children_enable'] ) || 'yes' !== $settings['aurora_children_enable'] ) {
			return [];
		}

		// Sanitize the CSS selector (allow only valid characters).
		$raw_selector = $settings['aurora_children_selector'] ?? '.elementor-widget';
		$selector     = preg_replace( '/[^a-zA-Z0-9_\-\.\s,:#>+~\[\]=^$*|()]/', '', $raw_selector );
		$selector     = $selector ?: '.elementor-widget';

		return [
			'data-aurora-children-enable'    => '1',
			'data-aurora-children-animation' => esc_attr( $settings['aurora_children_animation'] ?? 'fade-up' ),
			'data-aurora-children-selector'  => esc_attr( $selector ),
			'data-aurora-children-duration'  => esc_attr( $settings['aurora_children_duration']['size'] ?? 600 ),
			'data-aurora-children-delay'     => esc_attr( $settings['aurora_children_delay']['size'] ?? 0 ),
			'data-aurora-children-stagger'   => esc_attr( $settings['aurora_children_stagger']['size'] ?? 150 ),
			'data-aurora-children-trigger'   => esc_attr( $settings['aurora_children_trigger'] ?? 'scroll' ),
			'data-aurora-children-threshold' => esc_attr( ( $settings['aurora_children_threshold']['size'] ?? 15 ) / 100 ),
			'data-aurora-children-replay'    => ( 'yes' === ( $settings['aurora_children_replay'] ?? '' ) ) ? '1' : '0',
		];
	}
}
