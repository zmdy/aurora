<?php
/**
 * Plugin Name:       Aurora for Elementor
 * Plugin URI:        https://github.com/zmdy/aurora
 * Description:       The open-source Swiss Army knife for animated web design, inside Elementor: text animations, animated children, gradients, a cursor follower and a morphing card. No code required.
 * Version:           1.0.0
 * Requires at least: 5.9
 * Requires PHP:      7.4
 * Requires Plugins:  elementor
 * Author:            Aurora
 * Author URI:        https://github.com/zmdy
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       aurora-for-elementor
 *
 * Elementor tested up to: 3.22.0
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// The version comes from the header above, so cache-busting can never drift
// from the released version.
define( 'AURORA_VERSION', get_file_data( __FILE__, [ 'Version' => 'Version' ] )['Version'] );
define( 'AURORA_FILE', __FILE__ );
define( 'AURORA_PATH', plugin_dir_path( __FILE__ ) );
define( 'AURORA_URL', plugin_dir_url( __FILE__ ) );
define( 'AURORA_MIN_PHP', '7.4' );
define( 'AURORA_MIN_ELEMENTOR', '3.0.0' );

/**
 * Loads the plugin once every plugin is available.
 */
function aurora_init() {

	if ( version_compare( PHP_VERSION, AURORA_MIN_PHP, '<' ) ) {
		add_action( 'admin_notices', 'Aurora\aurora_notice_php_version' );
		return;
	}

	if ( ! did_action( 'elementor/loaded' ) ) {
		add_action( 'admin_notices', 'Aurora\aurora_notice_elementor_missing' );
		return;
	}

	if ( ! version_compare( ELEMENTOR_VERSION, AURORA_MIN_ELEMENTOR, '>=' ) ) {
		add_action( 'admin_notices', 'Aurora\aurora_notice_elementor_version' );
		return;
	}

	// Autoloads Aurora\Foo_Bar => includes/class-foo-bar.php.
	spl_autoload_register(
		static function ( $class ) {
			$prefix = __NAMESPACE__ . '\\';
			if ( 0 !== strpos( $class, $prefix ) ) {
				return;
			}
			$name = substr( $class, strlen( $prefix ) );
			$file = AURORA_PATH . 'includes/class-' . strtolower( str_replace( '_', '-', $name ) ) . '.php';
			if ( file_exists( $file ) ) {
				require $file;
			}
		}
	);

	Plugin_Core::instance();
}
add_action( 'plugins_loaded', 'Aurora\aurora_init' );

function aurora_notice_php_version() {
	printf(
		'<div class="notice notice-error"><p><strong>Aurora for Elementor</strong>: %s</p></div>',
		sprintf(
			/* translators: 1: minimum required PHP version, 2: currently installed PHP version. */
			esc_html__( 'requires PHP %1$s or higher. Current version: %2$s.', 'aurora-for-elementor' ),
			esc_html( AURORA_MIN_PHP ),
			esc_html( PHP_VERSION )
		)
	);
}

function aurora_notice_elementor_missing() {
	printf(
		'<div class="notice notice-error"><p><strong>Aurora for Elementor</strong>: %s</p></div>',
		esc_html__( 'requires the Elementor plugin to be installed and activated.', 'aurora-for-elementor' )
	);
}

function aurora_notice_elementor_version() {
	printf(
		'<div class="notice notice-error"><p><strong>Aurora for Elementor</strong>: %s</p></div>',
		sprintf(
			/* translators: %s: minimum required Elementor version. */
			esc_html__( 'requires Elementor %s or higher.', 'aurora-for-elementor' ),
			esc_html( AURORA_MIN_ELEMENTOR )
		)
	);
}
