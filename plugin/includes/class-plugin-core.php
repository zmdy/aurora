<?php
/**
 * Plugin Core — the plugin's entry point. It only bootstraps the
 * Asset_Manager (frontend/editor assets) and the Module_Manager
 * (animation modules) — all the concrete logic lives in the
 * specialized classes themselves.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Singleton that orchestrates the whole plugin.
 */
final class Plugin_Core {

	/** @var Plugin_Core|null */
	private static $_instance = null;

	/** @var Asset_Manager */
	private $asset_manager;

	public static function instance(): Plugin_Core {
		if ( null === self::$_instance ) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}

	private function __construct() {
		$this->asset_manager = new Asset_Manager();

		Module_Manager::init();

		// wp-admin dashboard: the "Aurora" menu page (module on/off toggles,
		// version/build info, links). Self-contained — registers its own
		// admin_menu/admin_enqueue_scripts/wp_ajax_* hooks in its constructor.
		new Admin_Page();

		// Custom Elementor widgets (not "modules"): register through the
		// dedicated Widgets_Manager hook. Modules add controls to existing
		// widgets; the Morph Card is a widget of its own.
		add_action( 'elementor/widgets/register', [ $this, 'register_widgets' ] );
	}

	/**
	 * Registers Aurora's own Elementor widgets.
	 *
	 * @param \Elementor\Widgets_Manager $widgets_manager Elementor's widget registry.
	 */
	public function register_widgets( $widgets_manager ): void {
		$widgets_manager->register( new Morph_Card_Widget() );
	}
}
