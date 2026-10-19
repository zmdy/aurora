<?php
/**
 * Wires the adapter into WordPress.
 *
 * Options live in one block attribute, `aurora`, saved in the block comment:
 *
 *   <!-- wp:heading {"aurora":{"text":{"effect":"blur-reveal","duration":1200}}} -->
 *
 * The block's own saved HTML is never changed (so no block can become
 * "invalid" in the editor). The data-attributes are added to the block's
 * outer element when it renders, which covers posts, pages, templates and
 * template parts alike, and each module's script is enqueued only on pages
 * that use it.
 *
 * @package Aurora
 */

namespace Aurora\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Plugin {

	/** Modules offered in the block inspector's Aurora panel. */
	const MODULES = [ 'text', 'children', 'gradient', 'cursor' ];

	/** Every module script the plugin ships. Keep in sync with tools/build-blocks.mjs. */
	const SCRIPTS = [ 'text', 'children', 'gradient', 'cursor', 'morph-card' ];

	/** Name of the block attribute that holds every module's options. */
	const ATTRIBUTE = 'aurora';

	/** @var Plugin|null */
	private static $instance = null;

	public static function instance(): Plugin {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'init', [ $this, 'register_scripts' ] );
		add_filter( 'register_block_type_args', [ $this, 'add_attribute' ], 10, 2 );
		add_filter( 'render_block', [ $this, 'render' ], 10, 2 );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor' ] );
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_canvas' ] );

		Morph_Card_Block::instance();
	}

	/** Script handle of a module ("text" => "aurora-text"). */
	public static function handle( string $module ): string {
		return 'aurora-' . $module;
	}

	private static function ver( string $relative_path ): string {
		$mtime = @filemtime( AURORA_BLOCKS_PATH . $relative_path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		return $mtime ? AURORA_BLOCKS_VERSION . '.' . $mtime : AURORA_BLOCKS_VERSION;
	}

	public function register_scripts(): void {
		$dir = 'assets/js/aurora/';
		wp_register_script( 'aurora-core', AURORA_BLOCKS_URL . $dir . 'aurora.core.min.js', [], self::ver( $dir . 'aurora.core.min.js' ), true );
		foreach ( self::SCRIPTS as $module ) {
			$file = 'aurora.' . $module . '.min.js';
			wp_register_script( self::handle( $module ), AURORA_BLOCKS_URL . $dir . $file, [ 'aurora-core' ], self::ver( $dir . $file ), true );
		}
	}

	/**
	 * Declares the `aurora` attribute on every block, so the server keeps it
	 * when it validates attributes (dynamic blocks, the block renderer API).
	 *
	 * @param array  $args Block type arguments.
	 * @param string $name Block name.
	 */
	public function add_attribute( $args, $name ) {
		if ( ! is_array( $args ) ) {
			return $args;
		}
		$args['attributes'] = isset( $args['attributes'] ) && is_array( $args['attributes'] ) ? $args['attributes'] : [];
		if ( ! isset( $args['attributes'][ self::ATTRIBUTE ] ) ) {
			$args['attributes'][ self::ATTRIBUTE ] = [ 'type' => 'object' ];
		}
		return $args;
	}

	/**
	 * The data-attributes for one block, keyed by attribute name, and the
	 * modules they need. Public for the smoke test.
	 *
	 * @param string $block_name Block name.
	 * @param mixed  $saved      Value of the `aurora` attribute.
	 * @return array{attributes: array<string, string>, modules: string[]}
	 */
	public static function attributes_for( string $block_name, $saved ): array {
		$out = [
			'attributes' => [],
			'modules'    => [],
		];
		if ( ! is_array( $saved ) ) {
			return $out;
		}
		foreach ( self::MODULES as $module ) {
			if ( ! isset( $saved[ $module ] ) || ! is_array( $saved[ $module ] ) || ! Block_Targets::offers( $module, $block_name ) ) {
				continue;
			}
			$clean = Schemas::sanitize( $module, $saved[ $module ], Block_Targets::defaults( $module, $block_name ) );
			if ( ! $clean ) {
				continue;
			}
			$out['attributes'][ 'data-aurora-' . $module ] = $clean['primary'];
			if ( $clean['options'] ) {
				$out['attributes'][ 'data-aurora-' . $module . '-options' ] = (string) wp_json_encode( $clean['options'] );
			}
			$out['modules'][] = $module;
		}
		return $out;
	}

	/**
	 * Adds the data-attributes to the block's outer element.
	 *
	 * @param string $content Rendered block HTML.
	 * @param array  $block   Parsed block.
	 */
	public function render( $content, $block ) {
		if ( ! is_string( $content ) || '' === trim( $content ) || empty( $block['attrs'][ self::ATTRIBUTE ] ) ) {
			return $content;
		}
		$found = self::attributes_for( (string) ( $block['blockName'] ?? '' ), $block['attrs'][ self::ATTRIBUTE ] );
		if ( ! $found['attributes'] ) {
			return $content;
		}

		$tags = new \WP_HTML_Tag_Processor( $content );
		if ( ! $tags->next_tag() ) {
			return $content;
		}
		foreach ( $found['attributes'] as $name => $value ) {
			$tags->set_attribute( $name, $value );
		}
		foreach ( $found['modules'] as $module ) {
			wp_enqueue_script( self::handle( $module ) );
		}
		return $tags->get_updated_html();
	}

	/**
	 * Loads the runtime and the Morph Card module into the editor canvas (the
	 * editor iframe), so the Morph Card block can preview itself. Automatic
	 * initialization is off there: nothing animates unless a block asks for it.
	 */
	public function enqueue_canvas(): void {
		if ( ! is_admin() ) {
			return;
		}
		wp_add_inline_script( 'aurora-core', 'window.AuroraConfig = Object.assign({}, window.AuroraConfig, { autoInit: false });', 'before' );
		wp_enqueue_script( self::handle( 'morph-card' ) );
	}

	public function enqueue_editor(): void {
		wp_enqueue_script(
			'aurora-blocks-editor',
			AURORA_BLOCKS_URL . 'assets/js/editor.js',
			[ 'wp-hooks', 'wp-compose', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n' ],
			self::ver( 'assets/js/editor.js' ),
			true
		);
		wp_add_inline_script(
			'aurora-blocks-editor',
			'window.AuroraBlocks = ' . wp_json_encode(
				[
					'attribute' => self::ATTRIBUTE,
					'modules'   => self::MODULES,
					'schemas'   => Schemas::all(),
					'targets'   => Block_Targets::all(),
				]
			) . ';',
			'before'
		);
		wp_enqueue_style( 'aurora-blocks-editor', AURORA_BLOCKS_URL . 'assets/css/editor.css', [], self::ver( 'assets/css/editor.css' ) );
	}
}
