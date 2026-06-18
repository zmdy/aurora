<?php
/**
 * Plugin Name:       Aurora for Elementor
 * Plugin URI:        https://github.com/your-repo/aurora-for-elementor
 * Description:       The open-source Swiss Army knife for Elementor design. Advanced text & children animations (GSAP + Anime.js), multi-stop gradients and more — color and motion, unleashed.
 * Version:           2.0.0
 * Requires at least: 5.9
 * Requires PHP:      7.4
 * Author:            Your Name
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
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

define( 'AURORA_VERSION',      '2.0.0' );
define( 'AURORA_FILE',         __FILE__ );
define( 'AURORA_PATH',         plugin_dir_path( __FILE__ ) );
define( 'AURORA_URL',          plugin_dir_url( __FILE__ ) );
define( 'AURORA_MIN_PHP',      '7.4' );
define( 'AURORA_MIN_WP',       '5.9' );
define( 'AURORA_MIN_ELEMENTOR', '3.0.0' );

// ── Bootstrap ─────────────────────────────────────────────────────────────────

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

	// Load core.
	require_once AURORA_PATH . 'includes/class-plugin-core.php';
	Plugin_Core::instance();
}
add_action( 'plugins_loaded', 'Aurora\aurora_init' );

// ── Admin Notices ─────────────────────────────────────────────────────────────

function aurora_notice_php_version() {
	printf(
		'<div class="notice notice-error"><p><strong>Aurora for Elementor</strong>: requer PHP %s ou superior. Versão atual: %s.</p></div>',
		esc_html( AURORA_MIN_PHP ),
		esc_html( PHP_VERSION )
	);
}

function aurora_notice_elementor_missing() {
	echo '<div class="notice notice-error"><p><strong>Aurora for Elementor</strong>: requer o plugin Elementor instalado e ativado.</p></div>';
}

function aurora_notice_elementor_version() {
	printf(
		'<div class="notice notice-error"><p><strong>Aurora for Elementor</strong>: requer Elementor %s ou superior.</p></div>',
		esc_html( AURORA_MIN_ELEMENTOR )
	);
}
