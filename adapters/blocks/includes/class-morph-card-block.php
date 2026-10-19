<?php
/**
 * The Morph Card block (aurora/morph-card), the counterpart of the Elementor
 * adapter's Morph Card widget.
 *
 * A dynamic block: the editor saves only attributes, and the card markup is
 * built here on render, so the block can never become "invalid". The page
 * gets the first state's photo and caption as fallback content, which the
 * module replaces with the card once its script runs.
 *
 * Like the Elementor widget, only the post, profile and polaroid templates
 * are offered; the "custom" template takes raw HTML and is left out.
 *
 * @package Aurora
 */

namespace Aurora\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Morph_Card_Block {

	const NAME      = 'aurora/morph-card';
	const TEMPLATES = [ 'post', 'profile', 'polaroid' ];
	const SIZES     = [ 'normal', 'instax', 'instax-square', 'horizontal', 'mini' ];
	const FRAMES    = [ 'classic', 'vintage', 'pink', 'dark', 'floral' ];
	const LABELS    = [ 'likes', 'viewComments', 'posts', 'followers', 'following', 'follow', 'message', 'email' ];

	/** State fields that are short, single-line texts. */
	const TEXT_FIELDS = [ 'username', 'name', 'subtext', 'posts', 'followers', 'following' ];

	/** State fields that may span several lines. */
	const LONG_FIELDS = [ 'bio', 'caption' ];

	/** Most states kept, and the longest text kept per field. */
	const MAX_STATES = 20;
	const MAX_TEXT   = 500;

	/** @var Morph_Card_Block|null */
	private static $instance = null;

	public static function instance(): Morph_Card_Block {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		// After Plugin::register_scripts (init, 10), so the module script exists.
		add_action( 'init', [ $this, 'register' ], 20 );
	}

	public static function placeholder(): string {
		return AURORA_BLOCKS_URL . 'assets/img/placeholder.svg';
	}

	public function register(): void {
		$file = 'assets/js/morph-card-block.js';
		wp_register_script(
			'aurora-blocks-morph-card-editor',
			AURORA_BLOCKS_URL . $file,
			[ 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n' ],
			AURORA_BLOCKS_VERSION . '.' . (int) @filemtime( AURORA_BLOCKS_PATH . $file ), // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			true
		);
		wp_add_inline_script(
			'aurora-blocks-morph-card-editor',
			'window.AuroraMorphCard = ' . wp_json_encode(
				[
					'placeholder' => self::placeholder(),
					'templates'   => self::TEMPLATES,
					'sizes'       => self::SIZES,
					'frames'      => self::FRAMES,
					'labels'      => self::LABELS,
				]
			) . ';',
			'before'
		);

		register_block_type( AURORA_BLOCKS_PATH . 'blocks/morph-card', [ 'render_callback' => [ $this, 'render' ] ] );
	}

	/**
	 * One saved state, cleaned for the module. Unknown fields are dropped and
	 * an empty photo falls back to the placeholder image.
	 *
	 * @param mixed $raw Saved state.
	 */
	public static function state( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$template = in_array( $raw['template'] ?? '', self::TEMPLATES, true ) ? $raw['template'] : 'post';
		$state    = [ 'template' => $template ];

		foreach ( [ 'photo', 'avatar' ] as $key ) {
			$url = isset( $raw[ $key ] ) && is_string( $raw[ $key ] ) ? esc_url_raw( $raw[ $key ], [ 'http', 'https' ] ) : '';
			if ( '' !== $url ) {
				$state[ $key ] = $url;
			}
		}
		if ( ! isset( $state['photo'] ) ) {
			$state['photo'] = self::placeholder();
		}
		if ( 'profile' === $template && isset( $raw['gridPhotos'] ) && is_array( $raw['gridPhotos'] ) ) {
			$grid = [];
			foreach ( array_slice( $raw['gridPhotos'], 0, 9 ) as $item ) {
				$url = is_array( $item ) ? ( $item['url'] ?? '' ) : $item;
				$url = is_string( $url ) ? esc_url_raw( $url, [ 'http', 'https' ] ) : '';
				if ( '' !== $url ) {
					$grid[] = $url;
				}
			}
			if ( $grid ) {
				$state['gridPhotos'] = $grid;
			}
		}

		foreach ( self::TEXT_FIELDS as $key ) {
			if ( isset( $raw[ $key ] ) && is_scalar( $raw[ $key ] ) && '' !== (string) $raw[ $key ] ) {
				$state[ $key ] = mb_substr( sanitize_text_field( (string) $raw[ $key ] ), 0, self::MAX_TEXT );
			}
		}
		foreach ( self::LONG_FIELDS as $key ) {
			if ( isset( $raw[ $key ] ) && is_scalar( $raw[ $key ] ) && '' !== (string) $raw[ $key ] ) {
				$state[ $key ] = mb_substr( sanitize_textarea_field( (string) $raw[ $key ] ), 0, self::MAX_TEXT );
			}
		}
		if ( isset( $raw['likes'] ) && is_numeric( $raw['likes'] ) ) {
			$state['likes'] = max( 0, (int) $raw['likes'] );
		}
		if ( 'polaroid' === $template ) {
			if ( in_array( $raw['size'] ?? '', self::SIZES, true ) ) {
				$state['size'] = $raw['size'];
			}
			if ( in_array( $raw['frame'] ?? '', self::FRAMES, true ) ) {
				$state['frame'] = $raw['frame'];
			}
		}
		if ( isset( $raw['durationMs'] ) && is_numeric( $raw['durationMs'] ) && $raw['durationMs'] > 0 ) {
			$state['durationMs'] = min( 60000, max( 500, (int) $raw['durationMs'] ) );
		}
		if ( isset( $raw['transitionDurationMs'] ) && is_numeric( $raw['transitionDurationMs'] ) && $raw['transitionDurationMs'] > 0 ) {
			$state['transitionDurationMs'] = min( 10000, max( 100, (int) $raw['transitionDurationMs'] ) );
		}
		return $state;
	}

	/**
	 * Module options from the block attributes: states and labels, plus the
	 * sequence options validated against the morph-card schema.
	 *
	 * @param array $attributes Block attributes.
	 */
	public static function options( array $attributes ): array {
		$scalars = [];
		foreach ( [ 'loop', 'autoplay', 'float', 'initialDelay', 'captionEffect' ] as $key ) {
			if ( array_key_exists( $key, $attributes ) ) {
				$scalars[ $key ] = $attributes[ $key ];
			}
		}
		$clean   = Schemas::sanitize( 'morph-card', $scalars );
		$options = $clean ? $clean['options'] : [];

		$states = [];
		foreach ( array_slice( (array) ( $attributes['states'] ?? [] ), 0, self::MAX_STATES ) as $raw ) {
			$state = self::state( $raw );
			if ( $state ) {
				$states[] = $state;
			}
		}
		$options['states'] = $states;

		$labels = [];
		foreach ( self::LABELS as $key ) {
			$value = $attributes['labels'][ $key ] ?? '';
			if ( is_scalar( $value ) && '' !== trim( (string) $value ) ) {
				$labels[ $key ] = mb_substr( sanitize_text_field( (string) $value ), 0, 100 );
			}
		}
		if ( $labels ) {
			$options['labels'] = $labels;
		}
		return $options;
	}

	/**
	 * @param array $attributes Block attributes.
	 */
	public function render( $attributes ): string {
		$options = self::options( is_array( $attributes ) ? $attributes : [] );
		if ( ! $options['states'] ) {
			return '';
		}
		wp_enqueue_script( Plugin::handle( 'morph-card' ) );

		$first    = $options['states'][0];
		$caption  = $first['caption'] ?? ( $first['name'] ?? ( $first['username'] ?? '' ) );
		$fallback = sprintf(
			'<figure class="aurora-morph-card__fallback" style="max-width:320px;margin:0 auto"><img src="%s" alt="%s" loading="lazy" style="width:100%%;height:auto;display:block;border-radius:14px">%s</figure>',
			esc_url( $first['photo'] ),
			esc_attr( $caption ),
			'' !== $caption ? '<figcaption>' . esc_html( $caption ) . '</figcaption>' : ''
		);

		$wrapper = get_block_wrapper_attributes(
			[
				'data-aurora-morph-card'         => '',
				'data-aurora-morph-card-options' => (string) wp_json_encode( $options ),
			]
		);
		return '<div ' . $wrapper . '>' . $fallback . '</div>';
	}
}
