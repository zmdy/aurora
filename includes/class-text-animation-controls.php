<?php
/**
 * Text Animation Controls — injects controls into the Advanced tab of
 * text-bearing Elementor widgets and adds the data-attributes on the frontend.
 *
 * Implements only what's specific to this module; the shared plumbing
 * (hooks, deduplication, section assembly) lives in Animation_Module.
 *
 * Scope is restricted to text-bearing widgets (Heading, Text Editor, Button,
 * Icon Box, Image Box, Testimonial, Alert, Text Path) where animating text
 * is a valid product feature. Non-textual widgets (Image, Video, Map, Divider,
 * Spacer, etc.) and structural containers return false in applies_to_element(),
 * preventing 0-value control keys on unrelated elements.
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

	/** Text-bearing Elementor widgets supported by this module. */
	const SUPPORTED_ELEMENTS = [
		'heading',
		'text-editor',
		'button',
		'icon-box',
		'image-box',
		'testimonial',
		'alert',
		'text-path',
	];

	protected function get_section_id(): string {
		return 'aurora_text_section';
	}

	protected function get_section_label(): string {
		return __( 'Text Animation', 'aurora-for-elementor' );
	}

	/**
	 * Only appears on actual text-bearing widgets.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
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
	 * @param Element_Base $element Element instance.
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

		static $lib_options = null;
		if ( null === $lib_options ) {
			$lib_options = AURORA_HAS_GSAP
				? [ 'gsap' => esc_html__( 'GSAP', 'aurora-for-elementor' ), 'animejs' => esc_html__( 'Anime.js', 'aurora-for-elementor' ) ]
				: [ 'animejs' => esc_html__( 'Anime.js', 'aurora-for-elementor' ) ];
		}

		// ── Library ───────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_text_library',
			[
				'label'              => esc_html__( 'Library', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => AURORA_HAS_GSAP ? 'gsap' : 'animejs',
				'options'            => $lib_options,
				'condition'          => [ 'aurora_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		if ( AURORA_HAS_GSAP ) {
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
						'gs-11' => esc_html__( 'Rotate In',       'aurora-for-elementor' ),
						'gs-12' => esc_html__( 'Slot Machine',    'aurora-for-elementor' ),
						'gs-13' => esc_html__( 'Spin In',         'aurora-for-elementor' ),
						'gs-14' => esc_html__( 'Neon Flicker',    'aurora-for-elementor' ),
						'gs-15' => esc_html__( 'CRT Boot',        'aurora-for-elementor' ),
						'gs-16' => esc_html__( 'Domino Fall',     'aurora-for-elementor' ),
						'gs-17' => esc_html__( 'Pendulum Swing',  'aurora-for-elementor' ),
						'gs-18' => esc_html__( 'Unfold 3D',       'aurora-for-elementor' ),
						'gs-19' => esc_html__( 'Stretch Warp',    'aurora-for-elementor' ),
						'gs-20' => esc_html__( 'Heartbeat',       'aurora-for-elementor' ),
						'gs-21' => esc_html__( 'Vertical Blinds', 'aurora-for-elementor' ),
						'gs-22' => esc_html__( 'Rubber Stamp',    'aurora-for-elementor' ),
						'gs-23' => esc_html__( 'VHS Tracking',    'aurora-for-elementor' ),
						'gs-24' => esc_html__( 'Liquid Fill Reveal', 'aurora-for-elementor' ),
						'gs-25' => esc_html__( 'Perspective Fly', 'aurora-for-elementor' ),
						'gs-26' => esc_html__( 'Cinema Title',    'aurora-for-elementor' ),
						// gs-27+ : new additions inspired by Originkit's text
						// animation library (independent reimplementations,
						// no code copied — see each effect file's header
						// comment for what it was inspired by).
						'gs-27' => esc_html__( 'Text Emerge',     'aurora-for-elementor' ),
						'gs-28' => esc_html__( 'Stagger Flip 3D', 'aurora-for-elementor' ),
						'gs-29' => esc_html__( 'Scroll Highlight', 'aurora-for-elementor' ),
						'gs-30' => esc_html__( 'Text Reveal Wall', 'aurora-for-elementor' ),
						'gs-31' => esc_html__( 'Letter Roll',     'aurora-for-elementor' ),
						'gs-32' => esc_html__( 'Elastic Text (Cursor Spring)', 'aurora-for-elementor' ),
					],
					'condition' => [
						'aurora_text_enable'  => 'yes',
						'aurora_text_library' => 'gsap',
					],
					'frontend_available' => true,
				]
			);
		}

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
					'ml-15' => esc_html__( 'Continuous Wave (never stops)', 'aurora-for-elementor' ),
					'ml-16' => esc_html__( 'Elastic Slide',        'aurora-for-elementor' ),
					'ml-17' => esc_html__( 'Scatter Converge',     'aurora-for-elementor' ),
					'ml-18' => esc_html__( 'Matrix Rain',          'aurora-for-elementor' ),
					'ml-19' => esc_html__( 'Spiral In',            'aurora-for-elementor' ),
					'ml-20' => esc_html__( 'Flip Board',           'aurora-for-elementor' ),
					'ml-21' => esc_html__( 'RGB Split',            'aurora-for-elementor' ),
					'ml-22' => esc_html__( 'Typewriter Delete',    'aurora-for-elementor' ),
					'ml-23' => esc_html__( 'Rotating Character Dial', 'aurora-for-elementor' ),
					// ml-24+ : Anime.js equivalents of the GSAP-only effects
					// above (gs-4, gs-5, gs-6, gs-9..gs-26) — same visual,
					// different library. See the "Building the Text
					// Animation module" section of README.md.
					'ml-24' => esc_html__( 'Elastic Bounce',       'aurora-for-elementor' ),
					'ml-25' => esc_html__( '3D Flip',               'aurora-for-elementor' ),
					'ml-26' => esc_html__( 'Slide In',              'aurora-for-elementor' ),
					'ml-27' => esc_html__( 'Bounce Drop',           'aurora-for-elementor' ),
					'ml-28' => esc_html__( 'Glitch',                'aurora-for-elementor' ),
					'ml-29' => esc_html__( 'Rotate In',             'aurora-for-elementor' ),
					'ml-30' => esc_html__( 'Slot Machine',          'aurora-for-elementor' ),
					'ml-31' => esc_html__( 'Spin In',               'aurora-for-elementor' ),
					'ml-32' => esc_html__( 'Neon Flicker',          'aurora-for-elementor' ),
					'ml-33' => esc_html__( 'CRT Boot',              'aurora-for-elementor' ),
					'ml-34' => esc_html__( 'Domino Fall',           'aurora-for-elementor' ),
					'ml-35' => esc_html__( 'Pendulum Swing',        'aurora-for-elementor' ),
					'ml-36' => esc_html__( 'Unfold 3D',             'aurora-for-elementor' ),
					'ml-37' => esc_html__( 'Stretch Warp',          'aurora-for-elementor' ),
					'ml-38' => esc_html__( 'Heartbeat',             'aurora-for-elementor' ),
					'ml-39' => esc_html__( 'Vertical Blinds',       'aurora-for-elementor' ),
					'ml-40' => esc_html__( 'Rubber Stamp',          'aurora-for-elementor' ),
					'ml-41' => esc_html__( 'VHS Tracking',          'aurora-for-elementor' ),
					'ml-42' => esc_html__( 'Liquid Fill Reveal',    'aurora-for-elementor' ),
					'ml-43' => esc_html__( 'Perspective Fly',       'aurora-for-elementor' ),
					'ml-44' => esc_html__( 'Cinema Title',          'aurora-for-elementor' ),
					// ml-45+ : Anime.js ports of gs-27..gs-32 above.
					'ml-45' => esc_html__( 'Text Emerge',           'aurora-for-elementor' ),
					'ml-46' => esc_html__( 'Stagger Flip 3D',       'aurora-for-elementor' ),
					'ml-47' => esc_html__( 'Scroll Highlight',      'aurora-for-elementor' ),
					'ml-48' => esc_html__( 'Text Reveal Wall',      'aurora-for-elementor' ),
					'ml-49' => esc_html__( 'Letter Roll',           'aurora-for-elementor' ),
					'ml-50' => esc_html__( 'Elastic Text (Cursor Spring)', 'aurora-for-elementor' ),
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
					// These GSAP effects manage their own DOM (they set
					// selfManaged: true in their effect file) and ignore
					// this control entirely — see core/engine.js's
					// isSelfManaged().
					'aurora_text_animation_gsap!' => [ 'gs-3', 'gs-24', 'gs-25', 'gs-26', 'gs-28', 'gs-30', 'gs-32' ],
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

		// ── Hover Scatter (independent of the entrance effect above) ─────────
		$element->add_control(
			'aurora_text_hover_enable',
			[
				'label'              => esc_html__( 'Hover Scatter', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'separator'          => 'before',
				'description'        => esc_html__( 'Independent of the entrance effect above — on hover, each split unit jumps to a random position and settles back on mouse out. Always uses Anime.js. Works best with "Split by: Characters".', 'aurora-for-elementor' ),
				'condition'          => [ 'aurora_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		$element->add_control(
			'aurora_text_hover_intensity',
			[
				'label'     => esc_html__( 'Scatter Intensity (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 5,
						'max'  => 80,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 24 ],
				'condition'          => [
					'aurora_text_enable'       => 'yes',
					'aurora_text_hover_enable' => 'yes',
				],
				'frontend_available' => true,
			]
		);

		$element->add_control(
			'aurora_text_hover_duration',
			[
				'label'     => esc_html__( 'Scatter/Settle Duration (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 1200,
						'step' => 50,
					],
				],
				'default'            => [ 'size' => 350 ],
				'condition'          => [
					'aurora_text_enable'       => 'yes',
					'aurora_text_hover_enable' => 'yes',
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

		$this->enqueue_effect_script( $animation, $library );

		$hover_enable = 'yes' === ( $settings['aurora_text_hover_enable'] ?? '' );

		return [
			'data-aurora-enable'          => '1',
			'data-aurora-library'         => esc_attr( $library ),
			'data-aurora-animation'       => esc_attr( $animation ),
			'data-aurora-split-by'        => esc_attr( $settings['aurora_text_split_by'] ?? 'chars' ),
			'data-aurora-duration'        => esc_attr( $settings['aurora_text_duration']['size'] ?? 800 ),
			'data-aurora-delay'           => esc_attr( $settings['aurora_text_delay']['size'] ?? 0 ),
			'data-aurora-stagger'         => esc_attr( $settings['aurora_text_stagger']['size'] ?? 30 ),
			'data-aurora-trigger'         => esc_attr( $settings['aurora_text_trigger'] ?? 'scroll' ),
			'data-aurora-threshold'       => esc_attr( ( $settings['aurora_text_threshold']['size'] ?? 20 ) / 100 ),
			'data-aurora-replay'          => ( 'yes' === ( $settings['aurora_text_replay'] ?? '' ) ) ? '1' : '0',
			'data-aurora-hover-enable'    => $hover_enable ? '1' : '0',
			'data-aurora-hover-intensity' => esc_attr( max( 5, (int) ( $settings['aurora_text_hover_intensity']['size'] ?? 24 ) ) ),
			'data-aurora-hover-duration'  => esc_attr( max( 100, (int) ( $settings['aurora_text_hover_duration']['size'] ?? 350 ) ) ),
		];
	}

	/**
	 * Enqueues the ONE effect chunk this widget actually needs
	 * (assets/js/dist/effects/{id}.js — see scripts/build-text-effects.mjs).
	 *
	 * Skipped entirely inside the Elementor editor/preview context: there,
	 * Asset_Manager already loads the full "aurora-text-editor.js" bundle
	 * with every effect baked in, so the panel can preview any dropdown
	 * choice instantly without waiting on a script to load.
	 *
	 * On the real frontend this runs once per widget, during
	 * elementor/frontend/element/before_render — before wp_footer, so a
	 * wp_enqueue_script() call made here still gets printed. Calling it
	 * more than once with the same $animation (e.g. two widgets using the
	 * same effect) is harmless: WordPress dedupes by handle automatically.
	 *
	 * @param string $animation  Effect id, e.g. 'gs-1' or 'ml-15'.
	 * @param string $library    'gsap' | 'animejs' — decides which vendor
	 *                           script the chunk depends on.
	 */
	private function enqueue_effect_script( string $animation, string $library ): void {

		if ( \Elementor\Plugin::$instance->editor->is_edit_mode()
			|| \Elementor\Plugin::$instance->preview->is_preview_mode() ) {
			return;
		}

		// Guards against a corrupt/unexpected saved value being used to
		// build a file path.
		if ( ! preg_match( '/^(gs|ml)-\d+$/', $animation ) ) {
			return;
		}

		$handle = 'aurora-text-effect-' . $animation;

		wp_enqueue_script(
			$handle,
			AURORA_URL . 'assets/js/dist/effects/' . $animation . '.js',
			[ 'aurora-text-core', 'gsap' === $library ? 'aurora-gsap' : 'aurora-animejs' ],
			AURORA_VERSION,
			true
		);
	}
}
