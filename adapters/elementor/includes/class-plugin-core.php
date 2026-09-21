<?php
/**
 * Plugin_Core — wires the plugin together once Elementor is available.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Plugin_Core {

	/** @var Plugin_Core|null */
	private static $instance = null;

	public static function instance(): Plugin_Core {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		Asset_Manager::instance();
		Module_Manager::init();

		add_action( 'elementor/widgets/register', [ $this, 'register_widgets' ] );

		if ( is_admin() ) {
			new Settings_Page();
		}
	}

	/**
	 * @param \Elementor\Widgets_Manager $widgets_manager Elementor widgets manager.
	 */
	public function register_widgets( $widgets_manager ): void {
		if ( Module_Manager::is_active( 'morph-card' ) ) {
			$widgets_manager->register( new Morph_Card_Widget() );
		}
	}
}
