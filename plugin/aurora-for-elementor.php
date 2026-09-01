<?php
/**
 * Plugin Name:       Aurora for Elementor
 * Plugin URI:        https://github.com/zmdy/aurora
 * Description:       The open-source Swiss Army knife for Elementor design. Advanced text & children animations (GSAP + Anime.js), multi-stop gradients and more — color and motion, unleashed.
 * Version:           0.7.1
 * Requires at least: 5.9
 * Requires PHP:      7.4
 * Requires Plugins:  elementor
 * Author:            Aurora
 * Author URI:        https://github.com/zmdy
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

// Read straight from this file's own "Version:" header instead of a second
// hardcoded literal — a hardcoded AURORA_VERSION drifted out of sync with the
// header in the past (the header was bumped for a release but this constant
// wasn't), which silently broke JS/CSS cache-busting: wp_enqueue_script()/
// wp_enqueue_style() use AURORA_VERSION as the `?ver=` query arg, so an
// unbumped constant meant browsers kept serving stale cached assets after an
// update. get_file_data() is defined in wp-includes/functions.php, loaded
// well before plugins, so it's always available here.
define( 'AURORA_VERSION',      get_file_data( __FILE__, [ 'Version' => 'Version' ] )['Version'] );
define( 'AURORA_FILE',         __FILE__ );
define( 'AURORA_PATH',         plugin_dir_path( __FILE__ ) );
define( 'AURORA_URL',          plugin_dir_url( __FILE__ ) );
define( 'AURORA_MIN_PHP',      '7.4' );
define( 'AURORA_MIN_WP',       '5.9' );
define( 'AURORA_MIN_ELEMENTOR', '3.0.0' );
define( 'AURORA_HAS_GSAP',      file_exists( AURORA_PATH . 'assets/js/vendor/gsap.min.js' ) );

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Translations: English is the default (source) language used throughout
// the codebase; translation files (e.g. pt_BR) live in /languages. No
// load_plugin_textdomain() call is needed here — WordPress.org auto-loads
// a hosted plugin's translations from its own translation packs, keyed by
// the plugin slug, since WP 4.6. Calling load_plugin_textdomain()
// ourselves on top of that is redundant for a WP.org-hosted plugin (and
// is exactly what WP.org's own Plugin Check tool flags as discouraged).

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
