<?php
/**
 * Children Animation Controls — injects staggered children-element
 * animation controls into the Advanced tab of structural Elementor
 * elements (section, column, container).
 *
 * Implements only what's specific to this module; the shared plumbing
 * (hooks, deduplication, section assembly) lives in Animation_Module.
 *
 * All settings are stored under a single Repeater key (aurora_children_config)
 * to minimise Aurora's contribution to the Backbone settings model's key
 * count — each registered control adds one key that every tree-walking
 * editor plugin (e.g. Navigator Indicator) pays to clone via .toJSON().
 *
 * Scope is intentionally restricted to section/column/container: it makes
 * no product sense to "animate children" of a Heading or Button widget
 * (they have no children to stagger), and the restriction eliminates the
 * common hook registration entirely, since applies_to_element() would
 * block every call there anyway.
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
 * Registers the "Animate Children Elements" controls and injects attributes on render.
 */
class Children_Animation_Controls extends Animation_Module {

	/** Elements where this module appears: structural containers only. */
	const SUPPORTED_ELEMENTS = [ 'section', 'column', 'container' ];

	protected function get_section_id(): string {
		return 'aurora_children_section';
	}

	protected function get_section_label(): string {
		return __( 'Animate Children Elements', 'aurora-for-elementor' );
	}

	/**
	 * Only registers on the three structural element types.
	 * The 'common' hook is omitted: applies_to_element() would block every
	 * call there (common's element name is never section/column/container),
	 * so registering on it would only fire a no-op callback for every widget
	 * on every page load.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 10 ],
		];
	}

	/**
	 * Only appears on section, column, and container elements.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
	}

	/**
	 * Registers all Animate Children settings under a single Repeater key so the
	 * Backbone model carries 1 key instead of 9 on structural elements,
	 * and 0 on every other widget type (since applies_to_element() prevents
	 * this module from registering there at all).
	 *
	 * @param Element_Base $element  Element instance.
	 */
	protected function register_fields( Element_Base $element ): void {

		$repeater = new Repeater();

		// ── Enable ────────────────────────────────────────────────────────────
		$repeater->add_control(
			'aurora_children_enable',
			[
				'label'        => esc_html__( 'Animate Children Elements', 'aurora-for-elementor' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'    => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value' => 'yes',
				'default'      => '',
			]
		);

		// ── Animation type ────────────────────────────────────────────────────
		$repeater->add_control(
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
			]
		);

		// ── Children selector ─────────────────────────────────────────────────
		$repeater->add_control(
			'aurora_children_selector',
			[
				'label'       => esc_html__( 'Children CSS Selector', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => '.elementor-widget',
				'placeholder' => '.elementor-widget, .elementor-icon-list-item',
				'description' => esc_html__( 'CSS selector used to identify the child elements to animate. Default: .elementor-widget', 'aurora-for-elementor' ),
				'condition'   => [ 'aurora_children_enable' => 'yes' ],
			]
		);

		// ── Duration ──────────────────────────────────────────────────────────
		$repeater->add_control(
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
			]
		);

		// ── Initial delay ─────────────────────────────────────────────────────
		$repeater->add_control(
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
			]
		);

		// ── Stagger delay between children ────────────────────────────────────
		$repeater->add_control(
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
			]
		);

		// ── Trigger ───────────────────────────────────────────────────────────
		$repeater->add_control(
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
			]
		);

		// ── Threshold ─────────────────────────────────────────────────────────
		$repeater->add_control(
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
			]
		);

		// ── Replay ────────────────────────────────────────────────────────────
		$repeater->add_control(
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
			]
		);

		// ── Single-row Repeater ───────────────────────────────────────────────
		$element->add_control(
			'aurora_children_config',
			[
				'type'               => Controls_Manager::REPEATER,
				'fields'             => $repeater->get_controls(),
				'default'            => [ [] ],
				'max_items'          => 1,
				'prevent_empty'      => true,
				'frontend_available' => true,
				'title_field'        => esc_html__( 'Children Animation Settings', 'aurora-for-elementor' ),
			]
		);
	}

	/**
	 * Builds the data-attributes that the children-animations JS module reads.
	 * Reads from the first (and only) Repeater row.
	 *
	 * @param array             $settings  Element settings from get_settings_for_display().
	 * @param Element_Base|null $element   Unused.
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		$cfg = $settings['aurora_children_config'][0] ?? [];

		if ( empty( $cfg['aurora_children_enable'] ) || 'yes' !== $cfg['aurora_children_enable'] ) {
			return [];
		}

		// Sanitize the CSS selector (allow only valid characters). Cache per raw value.
		static $selector_cache = [];
		$raw_selector = $cfg['aurora_children_selector'] ?? '.elementor-widget';
		if ( ! isset( $selector_cache[ $raw_selector ] ) ) {
			$selector_cache[ $raw_selector ] = preg_replace( '/[^a-zA-Z0-9_\-\.\s,:#>+~\[\]=^$*|()]/', '', $raw_selector )
				?: '.elementor-widget';
		}
		$selector = $selector_cache[ $raw_selector ];

		return [
			'data-aurora-children-enable'    => '1',
			'data-aurora-children-animation' => esc_attr( $cfg['aurora_children_animation'] ?? 'fade-up' ),
			'data-aurora-children-selector'  => esc_attr( $selector ),
			'data-aurora-children-duration'  => esc_attr( $cfg['aurora_children_duration']['size'] ?? 600 ),
			'data-aurora-children-delay'     => esc_attr( $cfg['aurora_children_delay']['size'] ?? 0 ),
			'data-aurora-children-stagger'   => esc_attr( $cfg['aurora_children_stagger']['size'] ?? 150 ),
			'data-aurora-children-trigger'   => esc_attr( $cfg['aurora_children_trigger'] ?? 'scroll' ),
			'data-aurora-children-threshold' => esc_attr( ( $cfg['aurora_children_threshold']['size'] ?? 15 ) / 100 ),
			'data-aurora-children-replay'    => ( 'yes' === ( $cfg['aurora_children_replay'] ?? '' ) ) ? '1' : '0',
		];
	}
}
