<?php
/**
 * Morph Card Widget — a standalone Elementor widget that renders a card
 * capable of morphing through N user-defined states (Instagram post,
 * Instagram profile, Polaroid, or a fully custom template). Each state
 * carries its own data + a duration (how long it stays on screen before
 * morphing into the next) + its own transition duration (how long the
 * morph animation into this state takes). A global "Loop" toggle
 * restarts the sequence after the last state.
 *
 * Unlike every other Aurora module (which only injects controls into the
 * Advanced tab of existing widgets), this one is a *new* widget — the
 * MorphCard needs a fixed inner DOM (.morph-header / .morph-image /
 * .morph-footer) that only makes sense as a dedicated widget.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Group_Control_Typography;
use Elementor\Repeater;
use Elementor\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Morph_Card_Widget extends Widget_Base {

	const TEMPLATES = [ 'instagram', 'profile', 'polaroid', 'custom' ];

	const POLAROID_SIZES = [ 'normal', 'instax', 'instax-square', 'horizontal', 'mini' ];

	const POLAROID_FRAMES = [ '', 'classic', 'vintage', 'pink', 'dark', 'floral' ];

	public function get_name(): string {
		return 'aurora_morph_card';
	}

	public function get_title(): string {
		return esc_html__( 'Aurora Morph Card', 'aurora-for-elementor' );
	}

	public function get_icon(): string {
		return 'eicon-image-box';
	}

	public function get_categories(): array {
		return [ 'basic' ];
	}

	public function get_keywords(): array {
		return [ 'aurora', 'morph', 'card', 'instagram', 'polaroid', 'transform' ];
	}

	/**
	 * The Instagram/Profile templates render Font Awesome glyphs
	 * (like/comment/save icons, tab bar, envelope). Elementor ships FA
	 * as its own icon library — depending on those handles here makes
	 * Elementor pull them in on any page that hosts a Morph Card
	 * widget, in both editor and frontend, without us re-registering
	 * or bundling our own copy.
	 */
	public function get_style_depends(): array {
		return [ 'elementor-icons-fa-solid', 'elementor-icons-fa-regular', 'elementor-icons-fa-brands' ];
	}

	// ── Controls ─────────────────────────────────────────────────────────────

	protected function register_controls(): void {

		$this->start_controls_section(
			'aurora_mc_section_states',
			[
				'label' => esc_html__( 'States', 'aurora-for-elementor' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$repeater = new Repeater();

		// ── Template picker ──────────────────────────────────────────────────
		$repeater->add_control(
			'template',
			[
				'label'   => esc_html__( 'Template', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'instagram',
				'options' => [
					'instagram' => esc_html__( 'Instagram Post', 'aurora-for-elementor' ),
					'profile'   => esc_html__( 'Instagram Profile', 'aurora-for-elementor' ),
					'polaroid'  => esc_html__( 'Polaroid', 'aurora-for-elementor' ),
					'custom'    => esc_html__( 'Custom', 'aurora-for-elementor' ),
				],
			]
		);

		// ── Duration on this state ───────────────────────────────────────────
		$repeater->add_control(
			'duration_ms',
			[
				'label'       => esc_html__( 'Duration on this state (ms)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::NUMBER,
				'default'     => 3200,
				'min'         => 0,
				'step'        => 100,
				'description' => esc_html__( 'How long the card stays on this state before morphing to the next one.', 'aurora-for-elementor' ),
			]
		);

		// ── Transition duration into this state ──────────────────────────────
		// Overrides the default frame-morph duration (1600ms) when the card
		// morphs *into* this state. Lets each transition pace differently
		// (e.g. a slow polaroid reveal followed by a snappy instagram flip).
		$repeater->add_control(
			'transition_duration_ms',
			[
				'label'       => esc_html__( 'Transition duration into this state (ms)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::NUMBER,
				'default'     => 1600,
				'min'         => 100,
				'step'        => 100,
				'description' => esc_html__( 'How long the morph animation into this state takes.', 'aurora-for-elementor' ),
			]
		);

		// ── Photo (used by all templates) ────────────────────────────────────
		$repeater->add_control(
			'photo',
			[
				'label'   => esc_html__( 'Photo', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::MEDIA,
				'default' => [ 'url' => '' ],
			]
		);

		$repeater->add_control(
			'caption',
			[
				'label'   => esc_html__( 'Caption', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::TEXT,
				'default' => '',
			]
		);

		// ── Instagram post fields ────────────────────────────────────────────
		$repeater->add_control(
			'ig_username',
			[
				'label'     => esc_html__( 'Username', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::TEXT,
				'default'   => 'aurora.demo',
				'condition' => [ 'template' => [ 'instagram' ] ],
			]
		);

		$repeater->add_control(
			'ig_subtext',
			[
				'label'     => esc_html__( 'Subtext (below username)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::TEXT,
				'default'   => '',
				'condition' => [ 'template' => [ 'instagram' ] ],
			]
		);

		$repeater->add_control(
			'ig_avatar',
			[
				'label'     => esc_html__( 'Avatar (falls back to photo)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::MEDIA,
				'default'   => [ 'url' => '' ],
				'condition' => [ 'template' => [ 'instagram' ] ],
			]
		);

		$repeater->add_control(
			'ig_likes',
			[
				'label'     => esc_html__( 'Likes', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::NUMBER,
				'default'   => 128,
				'min'       => 0,
				'condition' => [ 'template' => [ 'instagram' ] ],
			]
		);

		// ── Polaroid fields ──────────────────────────────────────────────────
		$repeater->add_control(
			'polaroid_size',
			[
				'label'     => esc_html__( 'Polaroid Size', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'normal',
				'options'   => [
					'normal'         => esc_html__( 'Normal (1:1)', 'aurora-for-elementor' ),
					'instax'         => esc_html__( 'Instax (3:4)', 'aurora-for-elementor' ),
					'instax-square'  => esc_html__( 'Instax Square (1:1)', 'aurora-for-elementor' ),
					'horizontal'     => esc_html__( 'Horizontal (4:3)', 'aurora-for-elementor' ),
					'mini'           => esc_html__( 'Mini (3:4)', 'aurora-for-elementor' ),
				],
				'condition' => [ 'template' => [ 'polaroid' ] ],
			]
		);

		$repeater->add_control(
			'polaroid_frame',
			[
				'label'     => esc_html__( 'Polaroid Frame Color', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => '',
				'options'   => [
					''        => esc_html__( 'Default', 'aurora-for-elementor' ),
					'classic' => esc_html__( 'Classic (cream)', 'aurora-for-elementor' ),
					'vintage' => esc_html__( 'Vintage (yellow)', 'aurora-for-elementor' ),
					'pink'    => esc_html__( 'Pink', 'aurora-for-elementor' ),
					'dark'    => esc_html__( 'Dark', 'aurora-for-elementor' ),
					'floral'  => esc_html__( 'Floral', 'aurora-for-elementor' ),
				],
				'condition' => [ 'template' => [ 'polaroid' ] ],
			]
		);

		// ── Profile fields ───────────────────────────────────────────────────
		$repeater->add_control(
			'profile_name',
			[
				'label'     => esc_html__( 'Display Name', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::TEXT,
				'default'   => 'Aurora',
				'condition' => [ 'template' => [ 'profile' ] ],
			]
		);

		$repeater->add_control(
			'profile_username',
			[
				'label'     => esc_html__( 'Username', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::TEXT,
				'default'   => 'aurora.demo',
				'condition' => [ 'template' => [ 'profile' ] ],
			]
		);

		$repeater->add_control(
			'profile_bio',
			[
				'label'     => esc_html__( 'Bio', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::TEXTAREA,
				'default'   => '',
				'condition' => [ 'template' => [ 'profile' ] ],
			]
		);

		$repeater->add_control(
			'profile_avatar',
			[
				'label'     => esc_html__( 'Avatar', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::MEDIA,
				'default'   => [ 'url' => '' ],
				'condition' => [ 'template' => [ 'profile' ] ],
			]
		);

		$repeater->add_control(
			'profile_posts',
			[
				'label'     => esc_html__( 'Posts count', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::NUMBER,
				'default'   => 0,
				'min'       => 0,
				'condition' => [ 'template' => [ 'profile' ] ],
			]
		);

		$repeater->add_control(
			'profile_followers',
			[
				'label'     => esc_html__( 'Followers count', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::NUMBER,
				'default'   => 0,
				'min'       => 0,
				'condition' => [ 'template' => [ 'profile' ] ],
			]
		);

		$repeater->add_control(
			'profile_following',
			[
				'label'     => esc_html__( 'Following count', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::NUMBER,
				'default'   => 0,
				'min'       => 0,
				'condition' => [ 'template' => [ 'profile' ] ],
			]
		);

		$repeater->add_control(
			'profile_grid_photos',
			[
				'label'       => esc_html__( 'Grid photos (one URL per line)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXTAREA,
				'default'     => '',
				'description' => esc_html__( 'Paste one image URL per line. They fill the 3-column grid.', 'aurora-for-elementor' ),
				'condition'   => [ 'template' => [ 'profile' ] ],
			]
		);

		// ── Custom template fields ───────────────────────────────────────────
		// Width is auto (fills the widget slot). The user controls the
		// bounding box via max-width + aspect-ratio + padding, which is a
		// much more predictable model for a template that has to work at
		// arbitrary column widths.
		$repeater->add_control(
			'custom_max_width',
			[
				'label'       => esc_html__( 'Max width', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'size_units'  => [ 'px', '%', 'em', 'rem', 'vw' ],
				'range'       => [
					'px'  => [ 'min' => 40,  'max' => 1200, 'step' => 1 ],
					'%'   => [ 'min' => 10,  'max' => 100,  'step' => 1 ],
					'em'  => [ 'min' => 5,   'max' => 80,   'step' => 0.5 ],
					'rem' => [ 'min' => 5,   'max' => 80,   'step' => 0.5 ],
					'vw'  => [ 'min' => 10,  'max' => 100,  'step' => 1 ],
				],
				'default'     => [ 'size' => 320, 'unit' => 'px' ],
				'condition'   => [ 'template' => [ 'custom' ] ],
			]
		);
		$repeater->add_control(
			'custom_aspect_ratio',
			[
				'label'       => esc_html__( 'Aspect ratio (W:H)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::SELECT,
				'default'     => 'auto',
				'options'     => [
					'auto'    => esc_html__( 'Auto (fits content)', 'aurora-for-elementor' ),
					'1/1'     => '1 : 1',
					'4/3'     => '4 : 3',
					'3/4'     => '3 : 4',
					'3/2'     => '3 : 2',
					'2/3'     => '2 : 3',
					'16/9'    => '16 : 9',
					'9/16'    => '9 : 16',
					'21/9'    => '21 : 9',
					'custom'  => esc_html__( 'Custom…', 'aurora-for-elementor' ),
				],
				'description' => esc_html__( 'Card proportion. Image fills the remaining space (after header/footer/padding).', 'aurora-for-elementor' ),
				'condition'   => [ 'template' => [ 'custom' ] ],
			]
		);
		// Two-number pair only revealed when the user picks "Custom…" —
		// keeps the standard-ratio flow uncluttered.
		$repeater->add_control(
			'custom_aspect_ratio_w',
			[
				'label'     => esc_html__( 'Custom ratio: Width', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::NUMBER,
				'default'   => 1,
				'min'       => 0.1,
				'step'      => 0.1,
				'condition' => [
					'template'            => [ 'custom' ],
					'custom_aspect_ratio' => 'custom',
				],
			]
		);
		$repeater->add_control(
			'custom_aspect_ratio_h',
			[
				'label'     => esc_html__( 'Custom ratio: Height', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::NUMBER,
				'default'   => 1,
				'min'       => 0.1,
				'step'      => 0.1,
				'condition' => [
					'template'            => [ 'custom' ],
					'custom_aspect_ratio' => 'custom',
				],
			]
		);
		$repeater->add_control(
			'custom_padding',
			[
				'label'       => esc_html__( 'Padding', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::DIMENSIONS,
				'size_units'  => [ 'px', '%', 'em', 'rem' ],
				'default'     => [ 'top' => 16, 'right' => 16, 'bottom' => 16, 'left' => 16, 'unit' => 'px', 'isLinked' => true ],
				'condition'   => [ 'template' => [ 'custom' ] ],
			]
		);
		$repeater->add_control(
			'custom_radius',
			[
				'label'     => esc_html__( 'Border radius (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::NUMBER,
				'default'   => 14,
				'min'       => 0,
				'max'       => 200,
				'condition' => [ 'template' => [ 'custom' ] ],
			]
		);
		$repeater->add_control(
			'custom_rotate',
			[
				'label'     => esc_html__( 'Rotate (deg)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::NUMBER,
				'default'   => 0,
				'min'       => -45,
				'max'       => 45,
				'condition' => [ 'template' => [ 'custom' ] ],
			]
		);
		$repeater->add_control(
			'custom_bg_color',
			[
				'label'     => esc_html__( 'Background color', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'default'   => '#ffffff',
				'condition' => [ 'template' => [ 'custom' ] ],
			]
		);
		// ── Image sizing/positioning (object-fit + object-position) ──────────
		// The image container fills the card's remaining space (see
		// .card-custom .morph-image in morph-card.css); object-fit decides
		// how the photo covers that box, object-position lets the user
		// nudge which crop wins when object-fit crops.
		$repeater->add_control(
			'custom_image_fit',
			[
				'label'     => esc_html__( 'Image fit', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'cover',
				'options'   => [
					'cover'      => esc_html__( 'Cover (crop to fill)', 'aurora-for-elementor' ),
					'contain'    => esc_html__( 'Contain (fit inside)', 'aurora-for-elementor' ),
					'fill'       => esc_html__( 'Fill (stretch)', 'aurora-for-elementor' ),
					'none'       => esc_html__( 'None (original size)', 'aurora-for-elementor' ),
					'scale-down' => esc_html__( 'Scale down', 'aurora-for-elementor' ),
				],
				'condition' => [ 'template' => [ 'custom' ] ],
			]
		);
		$repeater->add_control(
			'custom_image_position',
			[
				'label'     => esc_html__( 'Image position', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'center center',
				'options'   => [
					'top left'      => esc_html__( 'Top left', 'aurora-for-elementor' ),
					'top center'    => esc_html__( 'Top center', 'aurora-for-elementor' ),
					'top right'     => esc_html__( 'Top right', 'aurora-for-elementor' ),
					'center left'   => esc_html__( 'Center left', 'aurora-for-elementor' ),
					'center center' => esc_html__( 'Center', 'aurora-for-elementor' ),
					'center right'  => esc_html__( 'Center right', 'aurora-for-elementor' ),
					'bottom left'   => esc_html__( 'Bottom left', 'aurora-for-elementor' ),
					'bottom center' => esc_html__( 'Bottom center', 'aurora-for-elementor' ),
					'bottom right'  => esc_html__( 'Bottom right', 'aurora-for-elementor' ),
				],
				'condition' => [ 'template' => [ 'custom' ] ],
			]
		);
		$repeater->add_control(
			'custom_header_html',
			[
				'label'       => esc_html__( 'Header HTML', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXTAREA,
				'default'     => '',
				'description' => esc_html__( 'Raw HTML injected into .morph-header. Empty = header hidden.', 'aurora-for-elementor' ),
				'condition'   => [ 'template' => [ 'custom' ] ],
			]
		);
		$repeater->add_control(
			'custom_footer_html',
			[
				'label'       => esc_html__( 'Footer HTML', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXTAREA,
				'default'     => '',
				'description' => esc_html__( 'Raw HTML injected into .morph-footer. Empty = footer hidden.', 'aurora-for-elementor' ),
				'condition'   => [ 'template' => [ 'custom' ] ],
			]
		);

		// ── States repeater ──────────────────────────────────────────────────
		$this->add_control(
			'aurora_mc_states',
			[
				'label'       => esc_html__( 'States (sequence)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $repeater->get_controls(),
				'default'     => [
					[ 'template' => 'instagram', 'duration_ms' => 3200, 'ig_username' => 'aurora.demo', 'ig_likes' => 128 ],
					[ 'template' => 'polaroid',  'duration_ms' => 3200, 'polaroid_size' => 'normal' ],
				],
				'title_field' => '{{{ template }}} — {{{ duration_ms }}}ms',
			]
		);

		$this->end_controls_section();

		// ── Sequence controls ────────────────────────────────────────────────
		$this->start_controls_section(
			'aurora_mc_section_sequence',
			[
				'label' => esc_html__( 'Sequence', 'aurora-for-elementor' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'aurora_mc_initial_delay',
			[
				'label'       => esc_html__( 'Initial delay before first morph (ms)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::NUMBER,
				'default'     => 0,
				'min'         => 0,
				'step'        => 100,
				'description' => esc_html__( 'Extra wait before the sequence starts (on top of each state\'s own duration).', 'aurora-for-elementor' ),
			]
		);

		$this->add_control(
			'aurora_mc_loop',
			[
				'label'        => esc_html__( 'Loop sequence', 'aurora-for-elementor' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Yes', 'aurora-for-elementor' ),
				'label_off'    => esc_html__( 'No', 'aurora-for-elementor' ),
				'return_value' => 'yes',
				'default'      => '',
				'description'  => esc_html__( 'When on, the last state morphs back to the first and the sequence repeats forever.', 'aurora-for-elementor' ),
			]
		);

		$this->add_control(
			'aurora_mc_caption_effect',
			[
				'label'   => esc_html__( 'Caption reveal effect (polaroid)', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::SELECT,
				'default' => 'typewriter',
				'options' => [
					'typewriter' => esc_html__( 'Typewriter', 'aurora-for-elementor' ),
					'letters'    => esc_html__( 'Letters cascade', 'aurora-for-elementor' ),
				],
			]
		);

		// ── Editor-only: pick which state to render as a still preview ───────
		// The JS handler skips the morph loop while inside the Elementor
		// editor (a stable preview beats a broken animation — see
		// morph-card.js:Sequence.start). This control lets you pick which
		// state is shown there. Ignored on the real frontend.
		$this->add_control(
			'aurora_mc_preview_state',
			[
				'label'       => esc_html__( 'Editor preview: state index', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::NUMBER,
				'default'     => 0,
				'min'         => 0,
				'step'        => 1,
				'description' => esc_html__( 'Which state (0-based) is rendered in the editor preview. On the real frontend the sequence always starts from state 0.', 'aurora-for-elementor' ),
			]
		);

		$this->end_controls_section();

		// ── Appearance controls ──────────────────────────────────────────────
		$this->start_controls_section(
			'aurora_mc_section_appearance',
			[
				'label' => esc_html__( 'Appearance', 'aurora-for-elementor' ),
				'tab'   => Controls_Manager::TAB_CONTENT,
			]
		);

		$this->add_control(
			'aurora_mc_float_enable',
			[
				'label'        => esc_html__( 'Floating animation', 'aurora-for-elementor' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'On', 'aurora-for-elementor' ),
				'label_off'    => esc_html__( 'Off', 'aurora-for-elementor' ),
				'return_value' => 'yes',
				'default'      => 'yes',
				'description'  => esc_html__( 'The subtle up/down float applied via CSS on the card.', 'aurora-for-elementor' ),
			]
		);

		$this->add_control(
			'aurora_mc_rotation',
			[
				'label'       => esc_html__( 'Widget rotation (deg)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::SLIDER,
				'range'       => [ 'px' => [ 'min' => -45, 'max' => 45, 'step' => 1 ] ],
				'default'     => [ 'size' => 0 ],
				'description' => esc_html__( 'Rotation applied to the whole card, on top of each state\'s own rotation.', 'aurora-for-elementor' ),
			]
		);

		$this->end_controls_section();

		// ── Style tab: Card ──────────────────────────────────────────────────
		// Card-level visual controls (box shadow, base body text color).
		$this->start_controls_section(
			'aurora_mc_section_card_style',
			[
				'label' => esc_html__( 'Card', 'aurora-for-elementor' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			[
				'name'     => 'aurora_mc_box_shadow',
				'label'    => esc_html__( 'Box shadow', 'aurora-for-elementor' ),
				'selector' => '{{WRAPPER}} .morph-card',
			]
		);

		$this->add_control(
			'aurora_mc_text_color',
			[
				'label'     => esc_html__( 'Base text color (fallback)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .morph-card' => 'color: {{VALUE}};',
				],
			]
		);

		$this->end_controls_section();

		// ── Style tab: Instagram text ────────────────────────────────────────
		// One typography group per text zone so restyling the username
		// doesn't drag the caption with it (and vice versa). Every group
		// emits its own scoped CSS block, so unused groups add nothing.
		$this->start_controls_section(
			'aurora_mc_section_ig_style',
			[
				'label' => esc_html__( 'Instagram text', 'aurora-for-elementor' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);
		$this->_add_text_typography_group( 'ig_username',  'Username',       '{{WRAPPER}} .ig-username, {{WRAPPER}} .ig-caption-user' );
		$this->_add_text_typography_group( 'ig_subtext',   'Subtext',        '{{WRAPPER}} .ig-subtext' );
		$this->_add_text_typography_group( 'ig_caption',   'Caption text',   '{{WRAPPER}} .ig-caption, {{WRAPPER}} .ig-caption .ig-caption-text' );
		$this->_add_text_typography_group( 'ig_likes',     'Likes counter',  '{{WRAPPER}} .ig-likes, {{WRAPPER}} .ig-likes-count' );
		$this->_add_text_typography_group( 'ig_comments',  'Comments line',  '{{WRAPPER}} .ig-comments' );
		$this->end_controls_section();

		// ── Style tab: Polaroid text ─────────────────────────────────────────
		$this->start_controls_section(
			'aurora_mc_section_polaroid_style',
			[
				'label' => esc_html__( 'Polaroid text', 'aurora-for-elementor' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);
		// Kept the legacy name (aurora_mc_caption_typography) so existing
		// saved widgets don't lose their polaroid font settings.
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'aurora_mc_caption_typography',
				'label'    => esc_html__( 'Caption typography', 'aurora-for-elementor' ),
				'selector' => '{{WRAPPER}} .morph-caption, {{WRAPPER}} .ig-caption-as-polaroid',
			]
		);
		$this->add_control(
			'aurora_mc_polaroid_caption_color',
			[
				'label'     => esc_html__( 'Caption color', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					'{{WRAPPER}} .morph-caption, {{WRAPPER}} .ig-caption-as-polaroid' => 'color: {{VALUE}};',
				],
			]
		);
		$this->end_controls_section();

		// ── Style tab: Profile text ──────────────────────────────────────────
		$this->start_controls_section(
			'aurora_mc_section_profile_style',
			[
				'label' => esc_html__( 'Profile text', 'aurora-for-elementor' ),
				'tab'   => Controls_Manager::TAB_STYLE,
			]
		);
		$this->_add_text_typography_group( 'profile_name',     'Display name',   '{{WRAPPER}} .morph-profile-name' );
		$this->_add_text_typography_group( 'profile_bio',      'Bio',            '{{WRAPPER}} .morph-profile-bio' );
		$this->_add_text_typography_group( 'profile_stat_num', 'Stats numbers',  '{{WRAPPER}} .morph-profile-stat strong' );
		$this->_add_text_typography_group( 'profile_stat_lbl', 'Stats labels',   '{{WRAPPER}} .morph-profile-stat span' );
		$this->_add_text_typography_group( 'profile_btn',      'Buttons',        '{{WRAPPER}} .morph-profile-btn' );
		$this->end_controls_section();
	}

	/**
	 * Adds a Typography group + matching Color control for one text zone.
	 * Keeps register_controls() readable — every zone would otherwise
	 * repeat the same 8-line block. `name_key` becomes the setting id
	 * prefix so Elementor stores each group under a unique key.
	 */
	private function _add_text_typography_group( string $name_key, string $label, string $selector ): void {
		$this->add_group_control(
			Group_Control_Typography::get_type(),
			[
				'name'     => 'aurora_mc_typo_' . $name_key,
				'label'    => sprintf( esc_html__( '%s typography', 'aurora-for-elementor' ), $label ),
				'selector' => $selector,
			]
		);
		$this->add_control(
			'aurora_mc_color_' . $name_key,
			[
				'label'     => sprintf( esc_html__( '%s color', 'aurora-for-elementor' ), $label ),
				'type'      => Controls_Manager::COLOR,
				'selectors' => [
					$selector => 'color: {{VALUE}};',
				],
			]
		);
	}

	// ── Render ───────────────────────────────────────────────────────────────

	protected function render(): void {

		$settings = $this->get_settings_for_display();
		$states   = is_array( $settings['aurora_mc_states'] ?? null ) ? $settings['aurora_mc_states'] : [];

		if ( empty( $states ) ) {
			return;
		}

		$normalized_states = array_map( [ $this, 'normalize_state' ], $states );
		$preview_index     = (int) ( $settings['aurora_mc_preview_state'] ?? 0 );
		$preview_index     = max( 0, min( count( $normalized_states ) - 1, $preview_index ) );
		$float_enabled     = ( 'yes' === ( $settings['aurora_mc_float_enable'] ?? 'yes' ) );
		$rotation_deg      = (int) ( $settings['aurora_mc_rotation']['size'] ?? 0 );
		$rotation_deg      = max( -45, min( 45, $rotation_deg ) );

		$config = [
			'states'            => $normalized_states,
			'loop'              => ( 'yes' === ( $settings['aurora_mc_loop'] ?? '' ) ),
			'initialDelay'      => max( 0, (int) ( $settings['aurora_mc_initial_delay'] ?? 0 ) ),
			'captionEffect'     => in_array( $settings['aurora_mc_caption_effect'] ?? 'typewriter', [ 'typewriter', 'letters' ], true ) ? $settings['aurora_mc_caption_effect'] : 'typewriter',
			'previewStateIndex' => $preview_index,
		];

		$json = wp_json_encode( $config );

		$stage_classes = 'aurora-morph-card-stage';
		if ( ! $float_enabled ) {
			$stage_classes .= ' no-float';
		}

		$stage_style = '';
		if ( 0 !== $rotation_deg ) {
			// Widget-level rotation lives on the stage wrapper (not on
			// .morph-card) so it composes cleanly with the card's own
			// state-specific rotation (e.g. polaroid's -2deg) and doesn't
			// clash with the CSS float animation's transform.
			$stage_style = sprintf( ' style="transform: rotate(%ddeg);"', $rotation_deg );
		}

		?>
		<div class="<?php echo esc_attr( $stage_classes ); ?>" data-aurora-morph-config="<?php echo esc_attr( $json ); ?>"<?php echo $stage_style; ?>>
			<div class="morph-card-glow"></div>
			<div class="morph-card">
				<div class="morph-header"></div>
				<div class="morph-image"></div>
				<div class="morph-footer"></div>
			</div>
		</div>
		<?php
	}

	/**
	 * Coerces a raw repeater row into the shape the JS runner expects.
	 * Everything is validated here so the JS side can trust the payload.
	 */
	private function normalize_state( $raw ): array {
		$template = in_array( $raw['template'] ?? '', self::TEMPLATES, true ) ? $raw['template'] : 'instagram';

		$state = [
			'template'             => $template,
			'durationMs'           => max( 0, (int) ( $raw['duration_ms'] ?? 3200 ) ),
			'transitionDurationMs' => max( 100, (int) ( $raw['transition_duration_ms'] ?? 1600 ) ),
			'photo'                => esc_url_raw( $raw['photo']['url'] ?? '' ),
			'caption'              => (string) ( $raw['caption'] ?? '' ),
		];

		switch ( $template ) {
			case 'instagram':
				$state['username'] = (string) ( $raw['ig_username'] ?? '' );
				$state['subtext']  = (string) ( $raw['ig_subtext'] ?? '' );
				$state['avatar']   = esc_url_raw( $raw['ig_avatar']['url'] ?? '' );
				$state['likes']    = max( 0, (int) ( $raw['ig_likes'] ?? 0 ) );
				break;

			case 'polaroid':
				$size  = in_array( $raw['polaroid_size'] ?? '', self::POLAROID_SIZES, true ) ? $raw['polaroid_size'] : 'normal';
				$frame = in_array( $raw['polaroid_frame'] ?? '', self::POLAROID_FRAMES, true ) ? $raw['polaroid_frame'] : '';
				$state['size']  = $size;
				$state['frame'] = $frame;
				break;

			case 'profile':
				$state['name']       = (string) ( $raw['profile_name'] ?? '' );
				$state['username']   = (string) ( $raw['profile_username'] ?? '' );
				$state['bio']        = (string) ( $raw['profile_bio'] ?? '' );
				$state['avatar']     = esc_url_raw( $raw['profile_avatar']['url'] ?? '' );
				$state['posts']      = max( 0, (int) ( $raw['profile_posts'] ?? 0 ) );
				$state['followers']  = max( 0, (int) ( $raw['profile_followers'] ?? 0 ) );
				$state['following']  = max( 0, (int) ( $raw['profile_following'] ?? 0 ) );
				// preg_split with \r?\n handles Windows CRLF line endings —
				// explode("\n", ...) alone leaves stray \r on each URL and
				// esc_url_raw then strips them to empty strings, silently
				// hiding every image on Windows-authored posts.
				$grid_raw            = preg_split( '/\r?\n/', (string) ( $raw['profile_grid_photos'] ?? '' ) );
				$grid                = array_filter( array_map( 'trim', is_array( $grid_raw ) ? $grid_raw : [] ) );
				$state['gridPhotos'] = array_values( array_filter( array_map( 'esc_url_raw', $grid ) ) );
				break;

			case 'custom':
				// Values from Elementor COLOR control are already sanitized by the framework.
				$bg = $raw['custom_bg_color'] ?: '#ffffff';

				// Max width: SLIDER with size_units returns { size, unit }.
				$mw_raw   = is_array( $raw['custom_max_width'] ?? null ) ? $raw['custom_max_width'] : [];
				$mw_unit  = in_array( $mw_raw['unit'] ?? '', [ 'px', '%', 'em', 'rem', 'vw' ], true ) ? $mw_raw['unit'] : 'px';
				$mw_size  = is_numeric( $mw_raw['size'] ?? null ) ? (float) $mw_raw['size'] : 320;

				// Aspect ratio: whitelist of enum strings; 'auto' means no
				// aspect-ratio (card shrinks to content). 'custom' resolves
				// to "W/H" from the paired number fields — anything
				// non-positive falls back to auto so a half-typed value
				// never freezes the card at 0-height.
				$ar_allowed = [ 'auto', '1/1', '4/3', '3/4', '3/2', '2/3', '16/9', '9/16', '21/9', 'custom' ];
				$ar_choice  = in_array( $raw['custom_aspect_ratio'] ?? '', $ar_allowed, true ) ? $raw['custom_aspect_ratio'] : 'auto';
				if ( 'custom' === $ar_choice ) {
					$ar_w = is_numeric( $raw['custom_aspect_ratio_w'] ?? null ) ? (float) $raw['custom_aspect_ratio_w'] : 0;
					$ar_h = is_numeric( $raw['custom_aspect_ratio_h'] ?? null ) ? (float) $raw['custom_aspect_ratio_h'] : 0;
					$ar   = ( $ar_w > 0 && $ar_h > 0 ) ? ( $ar_w . '/' . $ar_h ) : 'auto';
				} else {
					$ar = $ar_choice;
				}

				// Padding: DIMENSIONS returns { top, right, bottom, left, unit }.
				$pad_raw  = is_array( $raw['custom_padding'] ?? null ) ? $raw['custom_padding'] : [];
				$pad_unit = in_array( $pad_raw['unit'] ?? '', [ 'px', '%', 'em', 'rem' ], true ) ? $pad_raw['unit'] : 'px';

				$fit_allowed = [ 'cover', 'contain', 'fill', 'none', 'scale-down' ];
				$fit         = in_array( $raw['custom_image_fit'] ?? '', $fit_allowed, true ) ? $raw['custom_image_fit'] : 'cover';

				$pos_allowed = [ 'top left', 'top center', 'top right', 'center left', 'center center', 'center right', 'bottom left', 'bottom center', 'bottom right' ];
				$pos         = in_array( $raw['custom_image_position'] ?? '', $pos_allowed, true ) ? $raw['custom_image_position'] : 'center center';

				$state['maxWidth']    = [ 'size' => $mw_size, 'unit' => $mw_unit ];
				$state['aspectRatio'] = $ar;
				$state['padding']     = [
					'top'    => is_numeric( $pad_raw['top'] ?? null )    ? (float) $pad_raw['top']    : 16,
					'right'  => is_numeric( $pad_raw['right'] ?? null )  ? (float) $pad_raw['right']  : 16,
					'bottom' => is_numeric( $pad_raw['bottom'] ?? null ) ? (float) $pad_raw['bottom'] : 16,
					'left'   => is_numeric( $pad_raw['left'] ?? null )   ? (float) $pad_raw['left']   : 16,
					'unit'   => $pad_unit,
				];
				$state['radius']        = max( 0, min( 200, (int) ( $raw['custom_radius'] ?? 14 ) ) );
				$state['rotate']        = max( -45, min( 45, (int) ( $raw['custom_rotate'] ?? 0 ) ) );
				$state['bgColor']       = $bg ? $bg : '#ffffff';
				$state['imageFit']      = $fit;
				$state['imagePosition'] = $pos;
				// Header/footer HTML is passed through wp_kses_post so users
				// can style the card freely but can't inject <script> or
				// event handlers via a saved widget.
				static $kses_cache = [];
				$h_key = $raw['custom_header_html'] ?? '';
				$f_key = $raw['custom_footer_html'] ?? '';
				if ( ! isset( $kses_cache[ $h_key ] ) ) {
					$kses_cache[ $h_key ] = wp_kses_post( (string) $h_key );
				}
				if ( ! isset( $kses_cache[ $f_key ] ) ) {
					$kses_cache[ $f_key ] = wp_kses_post( (string) $f_key );
				}
				$state['headerHtml'] = $kses_cache[ $h_key ];
				$state['footerHtml'] = $kses_cache[ $f_key ];
				break;
		}

		return $state;
	}
}
