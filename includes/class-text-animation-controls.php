<?php
/**
 * Text Animation Controls — injects controls into the Advanced tab of
 * every Elementor widget and adds the data-attributes on the frontend.
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
 * Registers the text animation controls and injects attributes on render.
 */
class Text_Animation_Controls extends Animation_Module {

	/** Structural elements where this module must NOT appear — see applies_to_element(). */
	const UNSUPPORTED_ELEMENTS = [ 'section', 'column', 'container' ];

	protected function get_section_id(): string {
		return 'aurora_text_section';
	}

	protected function get_section_label(): string {
		return __( 'Text Animation', 'aurora-for-elementor' );
	}

	/**
	 * Only appears on actual widgets (Heading, Text Editor, Button, etc.),
	 * matching the "Available on any Elementor widget" behavior described
	 * in the README. The base class only registers this module on the
	 * "common" hook (shared by every element type, including structural
	 * ones), so without this override the section would also show up on
	 * Section/Column/Container. That's not just cosmetic: getTextTarget()
	 * falls back to the wrapper itself when no known text selector
	 * matches, and splitText() then wipes the wrapper's innerHTML to
	 * rebuild it from its flattened text — which would destroy every
	 * widget nested inside a structural element if the module were
	 * mistakenly enabled there.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return ! in_array( $element->get_name(), self::UNSUPPORTED_ELEMENTS, true );
	}

	/**
	 * Besides the generic hook (sections, containers), also listens to the
	 * widget-specific hook — needed in Elementor versions where
	 * element/before_render isn't fired for widgets on the frontend.
	 */
	protected function get_render_hooks(): array {
		return [
			'elementor/frontend/element/before_render',
			'elementor/frontend/widget/before_render',
		];
	}

	// ── Controls ─────────────────────────────────────────────────────────────

	/**
	 * Fields of the "Text Animation" section.
	 *
	 * @param Element_Base $element  Element instance.
	 */
	protected function register_fields( Element_Base $element ): void {

		// ── Enable ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_enable',
			[
				'label'              => esc_html__( 'Enable Text Animation', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'frontend_available' => true,
			]
		);

		// ── Library ───────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_library',
			[
				'label'              => esc_html__( 'Library', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'gsap',
				'options'            => [
					'gsap'    => esc_html__( 'GSAP', 'aurora-for-elementor' ),
					'animejs' => esc_html__( 'Anime.js', 'aurora-for-elementor' ),
				],
				'condition'          => [ 'aurora_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Animation Type — GSAP ─────────────────────────────────────────────
		$element->add_control(
			'aurora_text_animation_gsap',
			[
				'label'     => esc_html__( 'Animation Type', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'gs-1',
				'options'   => [
					'gs-1'  => esc_html__( 'Fade Up',         'aurora-for-elementor' ),
					'gs-2'  => esc_html__( 'Clip Reveal',     'aurora-for-elementor' ),
					'gs-3'  => esc_html__( 'Scramble Text',   'aurora-for-elementor' ),
					'gs-4'  => esc_html__( 'Elastic Bounce',  'aurora-for-elementor' ),
					'gs-5'  => esc_html__( '3D Flip',         'aurora-for-elementor' ),
					'gs-6'  => esc_html__( 'Slide In',        'aurora-for-elementor' ),
					'gs-7'  => esc_html__( 'Scale Up',        'aurora-for-elementor' ),
					'gs-8'  => esc_html__( 'Wave',            'aurora-for-elementor' ),
					'gs-9'  => esc_html__( 'Bounce Drop',     'aurora-for-elementor' ),
					'gs-10' => esc_html__( 'Glitch',          'aurora-for-elementor' ),
				],
				'condition' => [
					'aurora_text_enable'  => 'yes',
					'aurora_text_library' => 'gsap',
				],
				'frontend_available' => true,
			]
		);

		// ── Animation Type — Anime.js ─────────────────────────────────────────
		$element->add_control(
			'aurora_text_animation_anime',
			[
				'label'     => esc_html__( 'Animation Type', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'ml-1',
				'options'   => [
					'ml-1'  => esc_html__( 'Float Up',       'aurora-for-elementor' ),
					'ml-2'  => esc_html__( 'Scale In',       'aurora-for-elementor' ),
					'ml-3'  => esc_html__( 'Drop Down',      'aurora-for-elementor' ),
					'ml-4'  => esc_html__( 'Slide From Right', 'aurora-for-elementor' ),
					'ml-5'  => esc_html__( 'Wave',           'aurora-for-elementor' ),
					'ml-6'  => esc_html__( 'Flip X',         'aurora-for-elementor' ),
					'ml-7'  => esc_html__( 'Typewriter',     'aurora-for-elementor' ),
					'ml-8'  => esc_html__( 'Blur Reveal',    'aurora-for-elementor' ),
					'ml-9'  => esc_html__( 'Skew In',        'aurora-for-elementor' ),
					'ml-10' => esc_html__( 'Explosion',      'aurora-for-elementor' ),
					'ml-11' => esc_html__( 'Native Split (Letters)', 'aurora-for-elementor' ),
					'ml-12' => esc_html__( 'Clip Wrap (Words)',      'aurora-for-elementor' ),
					'ml-13' => esc_html__( 'Echo Clone (Letters)',   'aurora-for-elementor' ),
					'ml-14' => esc_html__( 'Native Scramble',        'aurora-for-elementor' ),
				],
				'condition' => [
					'aurora_text_enable'  => 'yes',
					'aurora_text_library' => 'animejs',
				],
				'frontend_available' => true,
			]
		);

		// ── Split by ──────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_split_by',
			[
				'label'     => esc_html__( 'Split by', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'chars',
				'options'   => [
					'chars' => esc_html__( 'Characters', 'aurora-for-elementor' ),
					'words' => esc_html__( 'Words', 'aurora-for-elementor' ),
					'lines' => esc_html__( 'Lines', 'aurora-for-elementor' ),
				],
				'condition' => [
					'aurora_text_enable'       => 'yes',
					'aurora_text_animation_gsap!' => 'gs-3', // Scramble ignores split.
				],
				'frontend_available' => true,
			]
		);

		// ── Duration ──────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_duration',
			[
				'label'      => esc_html__( 'Duration (ms)', 'aurora-for-elementor' ),
				'type'       => Controls_Manager::SLIDER,
				'range'      => [
					'px' => [
						'min'  => 100,
						'max'  => 4000,
						'step' => 50,
					],
				],
				'default'    => [ 'size' => 800 ],
				'condition'  => [ 'aurora_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Initial delay ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_delay',
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
				'condition' => [ 'aurora_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Stagger delay between units ───────────────────────────────────────
		$element->add_control(
			'aurora_text_stagger',
			[
				'label'     => esc_html__( 'Delay between units (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 500,
						'step' => 5,
					],
				],
				'default'   => [ 'size' => 30 ],
				'condition' => [
					'aurora_text_enable'       => 'yes',
					'aurora_text_animation_gsap!' => 'gs-3',
				],
				'frontend_available' => true,
			]
		);

		// ── Trigger ───────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_trigger',
			[
				'label'     => esc_html__( 'Trigger on', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'scroll',
				'options'   => [
					'scroll' => esc_html__( 'Enter viewport (scroll)', 'aurora-for-elementor' ),
					'load'   => esc_html__( 'Page load', 'aurora-for-elementor' ),
				],
				'condition' => [ 'aurora_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Threshold ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_threshold',
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
				'default'   => [ 'size' => 20 ],
				'condition' => [
					'aurora_text_enable'   => 'yes',
					'aurora_text_trigger'  => 'scroll',
				],
				'frontend_available' => true,
			]
		);

		// ── Replay ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_replay',
			[
				'label'        => esc_html__( 'Replay on re-entering viewport', 'aurora-for-elementor' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'    => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value' => 'yes',
				'default'      => '',
				'condition'    => [
					'aurora_text_enable'  => 'yes',
					'aurora_text_trigger' => 'scroll',
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

		if ( empty( $settings['aurora_text_enable'] ) || 'yes' !== $settings['aurora_text_enable'] ) {
			return [];
		}

		$library   = $settings['aurora_text_library'] ?? 'gsap';
		$animation = 'gsap' === $library
			? ( $settings['aurora_text_animation_gsap'] ?? 'gs-1' )
			: ( $settings['aurora_text_animation_anime'] ?? 'ml-1' );

		return [
			'data-aurora-enable'    => '1',
			'data-aurora-library'   => esc_attr( $library ),
			'data-aurora-animation' => esc_attr( $animation ),
			'data-aurora-split-by'  => esc_attr( $settings['aurora_text_split_by'] ?? 'chars' ),
			'data-aurora-duration'  => esc_attr( $settings['aurora_text_duration']['size'] ?? 800 ),
			'data-aurora-delay'     => esc_attr( $settings['aurora_text_delay']['size'] ?? 0 ),
			'data-aurora-stagger'   => esc_attr( $settings['aurora_text_stagger']['size'] ?? 30 ),
			'data-aurora-trigger'   => esc_attr( $settings['aurora_text_trigger'] ?? 'scroll' ),
			'data-aurora-threshold' => esc_attr( ( $settings['aurora_text_threshold']['size'] ?? 20 ) / 100 ),
			'data-aurora-replay'    => ( 'yes' === ( $settings['aurora_text_replay'] ?? '' ) ) ? '1' : '0',
		];
	}
}
