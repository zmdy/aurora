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

	public function __construct() {
		parent::__construct();
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_styles' ] );
	}

	/**
	 * Enqueues Elementor's native animate.css style, ensuring it loads on
	 * the frontend even when Elementor doesn't auto-enqueue it, plus Aurora's
	 * own blur-animation set (which animate.css doesn't provide).
	 */
	public function enqueue_styles(): void {
		// Aurora's blur/focus @keyframes — the only entrance effects in this
		// module that animate.css can't cover. Tiny, CSS-only, no dependency.
		wp_enqueue_style(
			'aurora-children-animations',
			AURORA_URL . 'assets/css/children-animations.css',
			[],
			AURORA_VERSION
		);

		// Try the pre-registered handle first (some Elementor versions register it).
		if ( wp_style_is( 'elementor-animations', 'registered' ) ) {
			wp_enqueue_style( 'elementor-animations' );
			return;
		}

		// Fall back: directly register & enqueue Elementor's bundled animations file.
		$elementor_path = WP_PLUGIN_DIR . '/elementor/assets/lib/animations/animations.min.css';
		$elementor_url  = plugins_url( 'elementor/assets/lib/animations/animations.min.css' );

		if ( file_exists( $elementor_path ) ) {
			if ( ! wp_style_is( 'aurora-elementor-animations', 'registered' ) ) {
				wp_register_style( 'aurora-elementor-animations', $elementor_url, [], AURORA_VERSION );
			}
			wp_enqueue_style( 'aurora-elementor-animations' );
		}
	}

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
			// _section_responsive is the last Advanced-tab section on structural
			// elements — hooking after it places Aurora's panel at the bottom.
			[ 'hook' => 'elementor/element/section/_section_responsive/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/column/_section_responsive/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/container/_section_responsive/after_section_end', 'priority' => 10 ],
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
			'elementor/frontend/before_render',
			'elementor/frontend/section/before_render',
			'elementor/frontend/column/before_render',
			'elementor/frontend/container/before_render',
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

		// ── Animation type (Full Elementor Motion Effects List) ────────────────
		$element->add_control(
			'aurora_children_animation',
			[
				'label'     => esc_html__( 'Animation Type', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'fade-up',
				'groups'    => [
					[
						'label'   => esc_html__( 'Fading', 'aurora-for-elementor' ),
						'options' => [
							'fadeIn'     => esc_html__( 'Fade In', 'aurora-for-elementor' ),
							'fadeInDown' => esc_html__( 'Fade In Down', 'aurora-for-elementor' ),
							'fadeInLeft' => esc_html__( 'Fade In Left', 'aurora-for-elementor' ),
							'fadeInRight'=> esc_html__( 'Fade In Right', 'aurora-for-elementor' ),
							'fadeInUp'   => esc_html__( 'Fade In Up', 'aurora-for-elementor' ),
							'fade-up'    => esc_html__( 'Fade Up (Aurora)', 'aurora-for-elementor' ),
							'fade-down'  => esc_html__( 'Fade Down (Aurora)', 'aurora-for-elementor' ),
							'fade-in'    => esc_html__( 'Fade In (Aurora)', 'aurora-for-elementor' ),
						],
					],
					[
						'label'   => esc_html__( 'Blur (Aurora)', 'aurora-for-elementor' ),
						'options' => [
							'auroraBlurIn'      => esc_html__( 'Blur In', 'aurora-for-elementor' ),
							'auroraBlurInUp'    => esc_html__( 'Blur In Up', 'aurora-for-elementor' ),
							'auroraBlurInDown'  => esc_html__( 'Blur In Down', 'aurora-for-elementor' ),
							'auroraBlurInLeft'  => esc_html__( 'Blur In Left', 'aurora-for-elementor' ),
							'auroraBlurInRight' => esc_html__( 'Blur In Right', 'aurora-for-elementor' ),
							'auroraBlurZoomIn'  => esc_html__( 'Blur Zoom In', 'aurora-for-elementor' ),
							'auroraFocusIn'     => esc_html__( 'Focus In', 'aurora-for-elementor' ),
						],
					],
					[
						'label'   => esc_html__( 'Sliding', 'aurora-for-elementor' ),
						'options' => [
							'slideInDown' => esc_html__( 'Slide In Down', 'aurora-for-elementor' ),
							'slideInLeft' => esc_html__( 'Slide In Left', 'aurora-for-elementor' ),
							'slideInRight'=> esc_html__( 'Slide In Right', 'aurora-for-elementor' ),
							'slideInUp'   => esc_html__( 'Slide In Up', 'aurora-for-elementor' ),
							'slide-left'  => esc_html__( 'Slide Left (Aurora)', 'aurora-for-elementor' ),
							'slide-right' => esc_html__( 'Slide Right (Aurora)', 'aurora-for-elementor' ),
						],
					],
					[
						'label'   => esc_html__( 'Zooming', 'aurora-for-elementor' ),
						'options' => [
							'zoomIn'     => esc_html__( 'Zoom In', 'aurora-for-elementor' ),
							'zoomInDown' => esc_html__( 'Zoom In Down', 'aurora-for-elementor' ),
							'zoomInLeft' => esc_html__( 'Zoom In Left', 'aurora-for-elementor' ),
							'zoomInRight'=> esc_html__( 'Zoom In Right', 'aurora-for-elementor' ),
							'zoomInUp'   => esc_html__( 'Zoom In Up', 'aurora-for-elementor' ),
							'zoom-in'    => esc_html__( 'Zoom In (Aurora)', 'aurora-for-elementor' ),
							'zoom-out'   => esc_html__( 'Zoom Out (Aurora)', 'aurora-for-elementor' ),
						],
					],
					[
						'label'   => esc_html__( 'Bouncing', 'aurora-for-elementor' ),
						'options' => [
							'bounceIn'     => esc_html__( 'Bounce In', 'aurora-for-elementor' ),
							'bounceInDown' => esc_html__( 'Bounce In Down', 'aurora-for-elementor' ),
							'bounceInLeft' => esc_html__( 'Bounce In Left', 'aurora-for-elementor' ),
							'bounceInRight'=> esc_html__( 'Bounce In Right', 'aurora-for-elementor' ),
							'bounceInUp'   => esc_html__( 'Bounce In Up', 'aurora-for-elementor' ),
							'bounce-in'    => esc_html__( 'Bounce In (Aurora)', 'aurora-for-elementor' ),
						],
					],
					[
						'label'   => esc_html__( 'Rotating', 'aurora-for-elementor' ),
						'options' => [
							'rotateIn'          => esc_html__( 'Rotate In', 'aurora-for-elementor' ),
							'rotateInDownLeft'  => esc_html__( 'Rotate In Down Left', 'aurora-for-elementor' ),
							'rotateInDownRight' => esc_html__( 'Rotate In Down Right', 'aurora-for-elementor' ),
							'rotateInUpLeft'    => esc_html__( 'Rotate In Up Left', 'aurora-for-elementor' ),
							'rotateInUpRight'   => esc_html__( 'Rotate In Up Right', 'aurora-for-elementor' ),
							'rotate-in'         => esc_html__( 'Rotate In (Aurora)', 'aurora-for-elementor' ),
							'flip-up'           => esc_html__( 'Flip Up (Aurora)', 'aurora-for-elementor' ),
						],
					],
					[
						'label'   => esc_html__( 'Attention Seekers', 'aurora-for-elementor' ),
						'options' => [
							'bounce'    => esc_html__( 'Bounce', 'aurora-for-elementor' ),
							'flash'     => esc_html__( 'Flash', 'aurora-for-elementor' ),
							'pulse'     => esc_html__( 'Pulse', 'aurora-for-elementor' ),
							'rubberBand'=> esc_html__( 'Rubber Band', 'aurora-for-elementor' ),
							'shake'     => esc_html__( 'Shake', 'aurora-for-elementor' ),
							'headShake' => esc_html__( 'Head Shake', 'aurora-for-elementor' ),
							'swing'     => esc_html__( 'Swing', 'aurora-for-elementor' ),
							'tada'      => esc_html__( 'Tada', 'aurora-for-elementor' ),
							'wobble'    => esc_html__( 'Wobble', 'aurora-for-elementor' ),
							'jello'     => esc_html__( 'Jello', 'aurora-for-elementor' ),
						],
					],
					[
						'label'   => esc_html__( 'Specials', 'aurora-for-elementor' ),
						'options' => [
							'lightSpeedIn' => esc_html__( 'LightSpeed In', 'aurora-for-elementor' ),
							'rollIn'       => esc_html__( 'Roll In', 'aurora-for-elementor' ),
						],
					],
				],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Alternate Directions / Pattern ─────────────────────────────────────
		$element->add_control(
			'aurora_children_alternate',
			[
				'label'       => esc_html__( 'Alternate Direction / Pattern', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::SELECT,
				'default'     => 'none',
				'options'     => [
					'none'       => esc_html__( 'None (Same for All Children)', 'aurora-for-elementor' ),
					'horizontal' => esc_html__( 'Alternate Left ⇄ Right (Odd/Even)', 'aurora-for-elementor' ),
					'vertical'   => esc_html__( 'Alternate Up ⇄ Down (Odd/Even)', 'aurora-for-elementor' ),
					'zoom'       => esc_html__( 'Alternate Zoom In ⇄ Zoom Out', 'aurora-for-elementor' ),
					'rotate'     => esc_html__( 'Alternate Rotate Left ⇄ Rotate Right', 'aurora-for-elementor' ),
				],
				'description' => esc_html__( 'Alternates animation directions or effects between odd and even child elements for a dynamic staggered layout.', 'aurora-for-elementor' ),
				'condition'   => [ 'aurora_children_enable' => 'yes' ],
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

		// ── Delay ─────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_delay',
			[
				'label'     => esc_html__( 'Initial Delay (ms)', 'aurora-for-elementor' ),
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

		// ── Stagger interval ──────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_stagger',
			[
				'label'       => esc_html__( 'Stagger Interval (ms)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'range'       => [
					'px' => [
						'min'  => 0,
						'max'  => 1000,
						'step' => 25,
					],
				],
				'default'     => [ 'size' => 150 ],
				'description' => esc_html__( 'Time delay between each consecutive child animation.', 'aurora-for-elementor' ),
				'condition'   => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Trigger ───────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_trigger',
			[
				'label'     => esc_html__( 'Trigger Mode', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'scroll',
				'options'   => [
					'scroll' => esc_html__( 'On Scroll (Viewport)', 'aurora-for-elementor' ),
					'load'   => esc_html__( 'On Page Load',          'aurora-for-elementor' ),
				],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Viewport threshold ────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_threshold',
			[
				'label'     => esc_html__( 'Viewport Threshold (%)', 'aurora-for-elementor' ),
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

		// ── HEADING: Children Hover Effects ───────────────────────────────────
		$element->add_control(
			'aurora_children_hover_heading',
			[
				'label'     => esc_html__( 'Children Hover Effects', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::HEADING,
				'separator' => 'before',
			]
		);

		// ── Enable Hover ──────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_enable',
			[
				'label'              => esc_html__( 'Enable Children Hover Effects', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'frontend_available' => true,
			]
		);

		// ── Hover Preset ──────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_preset',
			[
				'label'     => esc_html__( 'Hover Preset', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'lift',
				'options'   => [
					'lift'        => esc_html__( 'Lift Vertical (Move Y -10px)', 'aurora-for-elementor' ),
					'slide_x'     => esc_html__( 'Slide Horizontal (Move X +10px)', 'aurora-for-elementor' ),
					'scale_up'    => esc_html__( 'Scale Up (Zoom +5%)', 'aurora-for-elementor' ),
					'rotate_tilt' => esc_html__( 'Rotate Tilt (-4deg)', 'aurora-for-elementor' ),
					'flip_h'      => esc_html__( 'Flip Horizontal', 'aurora-for-elementor' ),
					'flip_v'      => esc_html__( 'Flip Vertical', 'aurora-for-elementor' ),
					'custom'      => esc_html__( 'Custom Controls', 'aurora-for-elementor' ),
				],
				'condition' => [ 'aurora_children_hover_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Custom Move X ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_translate_x',
			[
				'label'     => esc_html__( 'Move X (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => -100,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'   => [ 'size' => 0 ],
				'condition' => [
					'aurora_children_hover_enable' => 'yes',
					'aurora_children_hover_preset' => 'custom',
				],
				'frontend_available' => true,
			]
		);

		// ── Custom Move Y ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_translate_y',
			[
				'label'     => esc_html__( 'Move Y (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => -100,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'   => [ 'size' => -10 ],
				'condition' => [
					'aurora_children_hover_enable' => 'yes',
					'aurora_children_hover_preset' => 'custom',
				],
				'frontend_available' => true,
			]
		);

		// ── Custom Scale ──────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_scale',
			[
				'label'     => esc_html__( 'Scale Ratio', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0.5,
						'max'  => 1.5,
						'step' => 0.01,
					],
				],
				'default'   => [ 'size' => 1.05 ],
				'condition' => [
					'aurora_children_hover_enable' => 'yes',
					'aurora_children_hover_preset' => 'custom',
				],
				'frontend_available' => true,
			]
		);

		// ── Custom Rotate ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_rotate',
			[
				'label'     => esc_html__( 'Rotate (deg)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => -180,
						'max'  => 180,
						'step' => 1,
					],
				],
				'default'   => [ 'size' => 0 ],
				'condition' => [
					'aurora_children_hover_enable' => 'yes',
					'aurora_children_hover_preset' => 'custom',
				],
				'frontend_available' => true,
			]
		);

		// ── Custom Skew ───────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_skew',
			[
				'label'     => esc_html__( 'Skew (deg)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => -45,
						'max'  => 45,
						'step' => 1,
					],
				],
				'default'   => [ 'size' => 0 ],
				'condition' => [
					'aurora_children_hover_enable' => 'yes',
					'aurora_children_hover_preset' => 'custom',
				],
				'frontend_available' => true,
			]
		);

		// ── Custom Flip ───────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_flip',
			[
				'label'     => esc_html__( 'Flip Axis', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'none',
				'options'   => [
					'none'       => esc_html__( 'None', 'aurora-for-elementor' ),
					'horizontal' => esc_html__( 'Flip Horizontal', 'aurora-for-elementor' ),
					'vertical'   => esc_html__( 'Flip Vertical', 'aurora-for-elementor' ),
					'both'       => esc_html__( 'Flip Both', 'aurora-for-elementor' ),
				],
				'condition' => [
					'aurora_children_hover_enable' => 'yes',
					'aurora_children_hover_preset' => 'custom',
				],
				'frontend_available' => true,
			]
		);

		// ── Proximity Sibling Wave ────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_proximity',
			[
				'label'        => esc_html__( 'Proximity Sibling Wave Effect', 'aurora-for-elementor' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'    => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value' => 'yes',
				'default'      => '',
				'description'  => esc_html__( 'Applies proportional transform effects to nearby adjacent sibling elements in 1D rows and 2D grids.', 'aurora-for-elementor' ),
				'condition'    => [ 'aurora_children_hover_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Proximity Intensity / Falloff ─────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_proximity_intensity',
			[
				'label'     => esc_html__( 'Sibling Wave Falloff Intensity (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 10,
						'max'  => 100,
						'step' => 5,
					],
				],
				'default'   => [ 'size' => 50 ],
				'condition' => [
					'aurora_children_hover_enable'    => 'yes',
					'aurora_children_hover_proximity' => 'yes',
				],
				'frontend_available' => true,
			]
		);

		// ── Hover Duration ────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_hover_duration',
			[
				'label'     => esc_html__( 'Hover Transition Duration (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 1000,
						'step' => 50,
					],
				],
				'default'   => [ 'size' => 300 ],
				'condition' => [ 'aurora_children_hover_enable' => 'yes' ],
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

		$has_children_enable = ! empty( $settings['aurora_children_enable'] ) && 'yes' === $settings['aurora_children_enable'];
		$has_hover_enable    = ! empty( $settings['aurora_children_hover_enable'] ) && 'yes' === $settings['aurora_children_hover_enable'];

		if ( ! $has_children_enable && ! $has_hover_enable ) {
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

		$attributes = [];

		if ( $has_children_enable ) {
			$attributes['data-aurora-children-enable']      = '1';
			$attributes['data-aurora-children-animation']   = esc_attr( $settings['aurora_children_animation'] ?? 'fade-up' );
			$attributes['data-aurora-children-alternate']   = esc_attr( $settings['aurora_children_alternate'] ?? 'none' );
			$attributes['data-aurora-children-target-type'] = esc_attr( $settings['aurora_children_target_type'] ?? 'child_containers' );
			$attributes['data-aurora-children-depth']       = esc_attr( $settings['aurora_children_depth'] ?? '1' );
			$attributes['data-aurora-children-selector']    = esc_attr( $selector );
			$attributes['data-aurora-children-duration']    = esc_attr( $settings['aurora_children_duration']['size'] ?? 600 );
			$attributes['data-aurora-children-delay']       = esc_attr( $settings['aurora_children_delay']['size'] ?? 0 );
			$attributes['data-aurora-children-stagger']     = esc_attr( $settings['aurora_children_stagger']['size'] ?? 150 );
			$attributes['data-aurora-children-trigger']     = esc_attr( $settings['aurora_children_trigger'] ?? 'scroll' );
			$attributes['data-aurora-children-threshold']   = esc_attr( ( $settings['aurora_children_threshold']['size'] ?? 15 ) / 100 );
			$attributes['data-aurora-children-replay']      = ( 'yes' === ( $settings['aurora_children_replay'] ?? '' ) ) ? '1' : '0';
		}

		if ( $has_hover_enable ) {
			$attributes['data-aurora-children-hover-enable']              = '1';
			$attributes['data-aurora-children-hover-preset']              = esc_attr( $settings['aurora_children_hover_preset'] ?? 'lift' );
			$attributes['data-aurora-children-hover-translate-x']        = esc_attr( $settings['aurora_children_hover_translate_x']['size'] ?? 0 );
			$attributes['data-aurora-children-hover-translate-y']        = esc_attr( $settings['aurora_children_hover_translate_y']['size'] ?? -10 );
			$attributes['data-aurora-children-hover-scale']              = esc_attr( $settings['aurora_children_hover_scale']['size'] ?? 1.05 );
			$attributes['data-aurora-children-hover-rotate']             = esc_attr( $settings['aurora_children_hover_rotate']['size'] ?? 0 );
			$attributes['data-aurora-children-hover-skew']               = esc_attr( $settings['aurora_children_hover_skew']['size'] ?? 0 );
			$attributes['data-aurora-children-hover-flip']               = esc_attr( $settings['aurora_children_hover_flip'] ?? 'none' );
			$attributes['data-aurora-children-hover-proximity']          = ( 'yes' === ( $settings['aurora_children_hover_proximity'] ?? '' ) ) ? '1' : '0';
			$attributes['data-aurora-children-hover-proximity-intensity'] = esc_attr( ( $settings['aurora_children_hover_proximity_intensity']['size'] ?? 50 ) / 100 );
			$attributes['data-aurora-children-hover-duration']           = esc_attr( $settings['aurora_children_hover_duration']['size'] ?? 300 );
		}

		return $attributes;
	}
}
