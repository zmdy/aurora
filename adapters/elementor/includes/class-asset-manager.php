<?php
/**
 * Asset_Manager — registers and enqueues the Aurora scripts.
 *
 * The plugin ships the runtime plus one script per module. A module script
 * is enqueued only when an element on the page actually uses it. The scripts
 * are local files, so a site never depends on a CDN.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Asset_Manager {

	/** @var Asset_Manager|null */
	private static $instance = null;

	public static function instance(): Asset_Manager {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'wp_enqueue_scripts', [ $this, 'register_scripts' ], 5 );
		add_action( 'elementor/preview/enqueue_scripts', [ $this, 'enqueue_preview' ] );
	}

	/** Script handle of a module ("text" => "aurora-text"). */
	public static function handle( string $module ): string {
		return 'aurora-' . $module;
	}

	private function file_url( string $file ): string {
		return AURORA_URL . 'assets/js/aurora/' . $file;
	}

	/**
	 * Cache-busting version for an asset: the plugin version plus the file's
	 * modification time. This makes browsers (and the Elementor editor preview)
	 * re-fetch a changed script even when the plugin version itself is
	 * unchanged — otherwise `?ver=1.0.0` stays identical and the old, cached
	 * file keeps running after an update.
	 *
	 * @param string $relative_path Path under the plugin root.
	 */
	private static function ver( string $relative_path ): string {
		$mtime = @filemtime( AURORA_PATH . $relative_path );
		return $mtime ? AURORA_VERSION . '.' . $mtime : AURORA_VERSION;
	}

	public function register_scripts(): void {
		wp_register_script( 'aurora-core', $this->file_url( 'aurora.core.min.js' ), [], self::ver( 'assets/js/aurora/aurora.core.min.js' ), true );

		foreach ( [ 'text', 'children', 'cursor', 'gradient', 'morph-card' ] as $module ) {
			wp_register_script(
				self::handle( $module ),
				$this->file_url( 'aurora.' . $module . '.min.js' ),
				[ 'aurora-core' ],
				self::ver( 'assets/js/aurora/aurora.' . $module . '.min.js' ),
				true
			);
		}
	}

	/**
	 * Enqueues the runtime and one module script. Safe to call while an
	 * element renders: footer scripts are printed after the content.
	 *
	 * @param string $module Module key ("text", "morph-card", ...).
	 */
	public static function need( string $module ): void {
		self::instance();
		if ( ! wp_script_is( 'aurora-core', 'registered' ) ) {
			wp_register_script( 'aurora-core', AURORA_URL . 'assets/js/aurora/aurora.core.min.js', [], self::ver( 'assets/js/aurora/aurora.core.min.js' ), true );
			wp_register_script( self::handle( $module ), AURORA_URL . 'assets/js/aurora/aurora.' . $module . '.min.js', [ 'aurora-core' ], self::ver( 'assets/js/aurora/aurora.' . $module . '.min.js' ), true );
		}
		wp_enqueue_script( self::handle( $module ) );
	}

	/**
	 * Editor preview: every module script (any control can be switched on at
	 * any time) plus the script that keeps live elements in sync with the panel.
	 */
	public function enqueue_preview(): void {
		$this->register_scripts();

		$handles = [ 'aurora-core' ];
		foreach ( array_keys( Module_Manager::get_modules() ) as $module ) {
			if ( Module_Manager::is_active( $module ) ) {
				$handles[] = self::handle( $module );
			}
		}
		if ( Module_Manager::is_active( 'morph-card' ) ) {
			$handles[] = self::handle( 'morph-card' );
		}

		wp_register_script( 'aurora-elementor-adapter', AURORA_URL . 'assets/js/elementor-adapter.js', $handles, self::ver( 'assets/js/elementor-adapter.js' ), true );
		wp_localize_script(
			'aurora-elementor-adapter',
			'AuroraElementor',
			[
				'schemas' => Module_Manager::schemas(),
				'targets' => Element_Targets::export(),
			]
		);
		wp_enqueue_script( 'aurora-elementor-adapter' );
	}
}
