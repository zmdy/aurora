<?php
/**
 * Morph Card Widget — a standalone Elementor widget that renders a card
 * capable of morphing through N user-defined states (Instagram post,
 * Instagram profile, Camera screen, Polaroid). Each state carries its own
 * data + a duration (how long it stays on screen before morphing into the
 * next). A global "Loop" toggle restarts the sequence after the last state.
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
use Elementor\Repeater;
use Elementor\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Morph_Card_Widget extends Widget_Base {

	const TEMPLATES = [ 'instagram', 'profile', 'camera', 'polaroid' ];

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

	public function get_script_depends(): array {
		return [ 'aurora-motion-one', 'aurora-morph-card' ];
	}

	public function get_style_depends(): array {
		return [ 'aurora-morph-card' ];
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
					'camera'    => esc_html__( 'Camera Screen', 'aurora-for-elementor' ),
					'polaroid'  => esc_html__( 'Polaroid', 'aurora-for-elementor' ),
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

		$this->end_controls_section();
	}

	// ── Render ───────────────────────────────────────────────────────────────

	protected function render(): void {

		$settings = $this->get_settings_for_display();
		$states   = is_array( $settings['aurora_mc_states'] ?? null ) ? $settings['aurora_mc_states'] : [];

		if ( empty( $states ) ) {
			return;
		}

		$config = [
			'states'        => array_map( [ $this, 'normalize_state' ], $states ),
			'loop'          => ( 'yes' === ( $settings['aurora_mc_loop'] ?? '' ) ),
			'initialDelay'  => max( 0, (int) ( $settings['aurora_mc_initial_delay'] ?? 0 ) ),
			'captionEffect' => in_array( $settings['aurora_mc_caption_effect'] ?? 'typewriter', [ 'typewriter', 'letters' ], true ) ? $settings['aurora_mc_caption_effect'] : 'typewriter',
		];

		$json = wp_json_encode( $config );

		?>
		<div class="aurora-morph-card-stage" data-aurora-morph-config="<?php echo esc_attr( $json ); ?>">
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
			'template'    => $template,
			'durationMs'  => max( 0, (int) ( $raw['duration_ms'] ?? 3200 ) ),
			'photo'       => esc_url_raw( $raw['photo']['url'] ?? '' ),
			'caption'     => (string) ( $raw['caption'] ?? '' ),
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
				$grid                = array_filter( array_map( 'trim', explode( "\n", (string) ( $raw['profile_grid_photos'] ?? '' ) ) ) );
				$state['gridPhotos'] = array_values( array_map( 'esc_url_raw', $grid ) );
				break;

			case 'camera':
				// Camera has no extra fields beyond photo/caption.
				break;
		}

		return $state;
	}
}
