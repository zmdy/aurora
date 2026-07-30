<?php
/**
 * Plugin Name:       Aurora for Elementor
 * Plugin URI:        https://github.com/zmdy/aurora
 * Description:       The open-source Swiss Army knife for Elementor design. Advanced text & children animations (GSAP + Anime.js), multi-stop gradients and more — color and motion, unleashed.
 * Version:           0.1.6
 * Requires at least: 5.9
 * Requires PHP:      7.4
 * Author:            Aurora
 * Author URI:        https://github.com/zmdy/aurora
 * License:           GPL v3
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain:       aurora-for-elementor
 * Domain Path:       /languages
 *
 * Elementor tested up to: 3.22.0
 * Elementor Pro tested up to: 3.22.0
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ── Constants ──────────────────────────────────────────────────────────────────

define( 'AURORA_VERSION',      '0.1.6' );
define( 'AURORA_FILE',         __FILE__ );
define( 'AURORA_PATH',         plugin_dir_path( __FILE__ ) );
define( 'AURORA_URL',          plugin_dir_url( __FILE__ ) );
define( 'AURORA_MIN_PHP',      '7.4' );
define( 'AURORA_MIN_WP',       '5.9' );
define( 'AURORA_MIN_ELEMENTOR', '3.0.0' );
define( 'AURORA_HAS_GSAP',      file_exists( AURORA_PATH . 'assets/js/vendor/gsap.min.js' ) );

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Loads the plugin translations. English is the default (source) language
 * used throughout the codebase; translation files (e.g. pt_BR) live in
 * /languages and are loaded here via the standard WordPress i18n API.
 */
function aurora_load_textdomain() {
	load_plugin_textdomain(
		'aurora-for-elementor',
		false,
		dirname( plugin_basename( AURORA_FILE ) ) . '/languages'
	);
}
add_action( 'init', 'Aurora\aurora_load_textdomain' );

/**
 * Load the plugin after all plugins have loaded.
 */
function aurora_init() {

	// PHP version check.
	if ( version_compare( PHP_VERSION, AURORA_MIN_PHP, '<' ) ) {
		add_action( 'admin_notices', 'Aurora\aurora_notice_php_version' );
		return;
	}

	// Elementor check.
	if ( ! did_action( 'elementor/loaded' ) ) {
		add_action( 'admin_notices', 'Aurora\aurora_notice_elementor_missing' );
		return;
	}

	// Elementor version check.
	if ( ! version_compare( ELEMENTOR_VERSION, AURORA_MIN_ELEMENTOR, '>=' ) ) {
		add_action( 'admin_notices', 'Aurora\aurora_notice_elementor_version' );
		return;
	}

	// Autoloads Aurora\Foo_Bar => includes/class-foo-bar.php. Lets new
	// modules be added without ever touching a require_once here.
	$aurora_prefix     = __NAMESPACE__ . '\\';
	$aurora_prefix_len = strlen( $aurora_prefix );
	spl_autoload_register(
		static function ( $class ) use ( $aurora_prefix, $aurora_prefix_len ) {
			if ( 0 !== strpos( $class, $aurora_prefix ) ) {
				return;
			}
			$name = substr( $class, $aurora_prefix_len );
			$file = AURORA_PATH . 'includes/class-' . strtolower( str_replace( '_', '-', $name ) ) . '.php';
			if ( file_exists( $file ) ) {
				require $file;
			}
		}
	);

	// Load core.
	Plugin_Core::instance();
}
add_action( 'plugins_loaded', 'Aurora\aurora_init' );

// ── Admin Notices ─────────────────────────────────────────────────────────────

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
