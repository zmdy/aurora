<?php
/**
 * Morph_Card_Widget — Elementor widget for the Morph Card module.
 *
 * The widget only collects content. The markup is a single element carrying
 * `data-aurora-morph-card` plus the JSON options, so the standalone script
 * does all the work on the frontend.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Repeater;
use Elementor\Utils;
use Elementor\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Morph_Card_Widget extends Widget_Base {

	public function get_name(): string {
		return 'aurora-morph-card';
	}

	public function get_title(): string {
		return 'Aurora Morph Card';
	}

	public function get_icon(): string {
		return 'eicon-image-rollover';
	}

	public function get_categories(): array {
		return [ 'general' ];
	}

	public function get_keywords(): array {
		return [ 'aurora', 'card', 'morph', 'animation', 'profile', 'polaroid' ];
	}

	public function get_script_depends(): array {
		return [ Asset_Manager::handle( 'morph-card' ) ];
	}

	protected function register_controls(): void {

		$this->start_controls_section( 'aurora_mc_states', [ 'label' => 'States' ] );

		$repeater = new Repeater();

		$repeater->add_control(
			'template',
			[
				'label'   => 'Template',
				'type'    => Controls_Manager::SELECT,
				'default' => 'post',
				'options' => [
					'post'     => 'Post',
					'profile'  => 'Profile',
					'polaroid' => 'Polaroid',
				],
			]
		);
		$repeater->add_control(
			'photo',
			[
				'label'   => 'Photo',
				'type'    => Controls_Manager::MEDIA,
				'default' => [ 'url' => Utils::get_placeholder_image_src() ],
			]
		);
		$repeater->add_control(
			'avatar',
			[
				'label'      => 'Avatar',
				'type'       => Controls_Manager::MEDIA,
				'default'    => [ 'url' => '' ],
				'conditions' => $this->only( [ 'post', 'profile' ] ),
			]
		);
		$repeater->add_control(
			'username',
			[
				'label'      => 'Username',
				'type'       => Controls_Manager::TEXT,
				'default'    => '',
				'conditions' => $this->only( [ 'post', 'profile' ] ),
			]
		);
		$repeater->add_control(
			'name',
			[
				'label'      => 'Name',
				'type'       => Controls_Manager::TEXT,
				'default'    => '',
				'conditions' => $this->only( [ 'profile' ] ),
			]
		);
		$repeater->add_control(
			'bio',
			[
				'label'      => 'Bio',
				'type'       => Controls_Manager::TEXTAREA,
				'default'    => '',
				'conditions' => $this->only( [ 'profile' ] ),
			]
		);
		$repeater->add_control(
			'caption',
			[
				'label'      => 'Caption',
				'type'       => Controls_Manager::TEXTAREA,
				'default'    => '',
				'conditions' => $this->only( [ 'post', 'polaroid' ] ),
			]
		);
		$repeater->add_control(
			'likes',
			[
				'label'      => 'Likes',
				'type'       => Controls_Manager::NUMBER,
				'default'    => 0,
				'conditions' => $this->only( [ 'post' ] ),
			]
		);
		foreach ( [ 'posts', 'followers', 'following' ] as $stat ) {
			$repeater->add_control(
				$stat,
				[
					'label'      => ucfirst( $stat ),
					'type'       => Controls_Manager::TEXT,
					'default'    => '',
					'conditions' => $this->only( [ 'profile' ] ),
				]
			);
		}
		$repeater->add_control(
			'duration_ms',
			[
				'label'   => 'Duration (ms)',
				'type'    => Controls_Manager::NUMBER,
				'default' => 3000,
				'min'     => 500,
				'step'    => 100,
			]
		);
		$repeater->add_control(
			'transition_ms',
			[
				'label'       => 'Transition (ms)',
				'type'        => Controls_Manager::NUMBER,
				'default'     => '',
				'description' => 'Empty uses the default timing.',
				'min'         => 100,
				'step'        => 50,
			]
		);

		$this->add_control(
			'states',
			[
				'label'       => 'States',
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $repeater->get_controls(),
				'title_field' => '{{{ template }}} {{{ username || caption || name }}}',
				'default'     => [
					[ 'template' => 'post' ],
					[ 'template' => 'profile' ],
					[ 'template' => 'polaroid' ],
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section( 'aurora_mc_sequence', [ 'label' => 'Sequence' ] );

		$this->add_control( 'loop', [ 'label' => 'Loop', 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'autoplay', [ 'label' => 'Autoplay', 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control( 'float', [ 'label' => 'Floating motion', 'type' => Controls_Manager::SWITCHER, 'default' => 'yes' ] );
		$this->add_control(
			'initial_delay',
			[
				'label'   => 'Initial delay (ms)',
				'type'    => Controls_Manager::NUMBER,
				'default' => 0,
				'min'     => 0,
			]
		);
		$this->add_control(
			'caption_effect',
			[
				'label'   => 'Polaroid caption effect',
				'type'    => Controls_Manager::SELECT,
				'default' => 'typewriter',
				'options' => [
					'typewriter' => 'Typewriter',
					'letters'    => 'Letters',
				],
			]
		);

		$this->end_controls_section();

		$this->start_controls_section( 'aurora_mc_labels', [ 'label' => 'Labels' ] );

		$labels = [
			'likes'        => 'Likes',
			'viewComments' => 'View comments',
			'posts'        => 'Posts',
			'followers'    => 'Followers',
			'following'    => 'Following',
			'follow'       => 'Follow',
			'message'      => 'Message',
			'email'        => 'Email',
		];
		foreach ( $labels as $key => $label ) {
			$this->add_control(
				'label_' . $key,
				[
					'label'       => $label,
					'type'        => Controls_Manager::TEXT,
					'default'     => '',
					'placeholder' => $label,
				]
			);
		}

		$this->end_controls_section();
	}

	/**
	 * Visibility condition: the repeater row's template is one of the given.
	 *
	 * @param string[] $templates Template names.
	 */
	private function only( array $templates ): array {
		return [
			'terms' => [
				[
					'name'     => 'template',
					'operator' => 'in',
					'value'    => $templates,
				],
			],
		];
	}

	/**
	 * Converts one repeater row to the state object the script expects.
	 * Empty fields are left out so the template defaults apply.
	 */
	public static function state_from_row( array $row ): array {
		$state = [ 'template' => $row['template'] ?? 'post' ];

		foreach ( [ 'photo', 'avatar' ] as $key ) {
			$url = $row[ $key ]['url'] ?? '';
			if ( '' !== $url ) {
				$state[ $key ] = $url;
			}
		}
		foreach ( [ 'username', 'name', 'bio', 'caption', 'posts', 'followers', 'following' ] as $key ) {
			if ( isset( $row[ $key ] ) && '' !== $row[ $key ] ) {
				$state[ $key ] = (string) $row[ $key ];
			}
		}
		if ( isset( $row['likes'] ) && '' !== $row['likes'] ) {
			$state['likes'] = (int) $row['likes'];
		}
		if ( ! empty( $row['duration_ms'] ) ) {
			$state['durationMs'] = (int) $row['duration_ms'];
		}
		if ( ! empty( $row['transition_ms'] ) ) {
			$state['transitionDurationMs'] = (int) $row['transition_ms'];
		}

		return $state;
	}

	/**
	 * Options that differ from the module defaults.
	 */
	public static function options_from_settings( array $settings ): array {
		$options = [];

		foreach ( [ 'loop', 'autoplay', 'float' ] as $key ) {
			if ( 'yes' !== ( $settings[ $key ] ?? 'yes' ) ) {
				$options[ $key ] = false;
			}
		}
		if ( ! empty( $settings['initial_delay'] ) ) {
			$options['initialDelay'] = (int) $settings['initial_delay'];
		}
		if ( 'typewriter' !== ( $settings['caption_effect'] ?? 'typewriter' ) ) {
			$options['captionEffect'] = $settings['caption_effect'];
		}

		$labels = [];
		foreach ( [ 'likes', 'viewComments', 'posts', 'followers', 'following', 'follow', 'message', 'email' ] as $key ) {
			$value = $settings[ 'label_' . $key ] ?? '';
			if ( '' !== $value ) {
				$labels[ $key ] = $value;
			}
		}
		if ( $labels ) {
			$options['labels'] = $labels;
		}

		$states = [];
		foreach ( (array) ( $settings['states'] ?? [] ) as $row ) {
			$states[] = self::state_from_row( (array) $row );
		}
		$options['states'] = $states;

		return $options;
	}

	protected function render(): void {
		Asset_Manager::need( 'morph-card' );

		$options = self::options_from_settings( $this->get_settings_for_display() );

		$this->add_render_attribute(
			'card',
			[
				'data-aurora-morph-card'         => '',
				'data-aurora-morph-card-options' => wp_json_encode( $options ),
			]
		);

		echo '<div ' . $this->get_render_attribute_string( 'card' ) . '></div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
}
