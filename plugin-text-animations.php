<?php
/**
 * Plugin Name:       Text Animations for Elementor
 * Plugin URI:        https://github.com/your-repo/plugin-text-animations
 * Description:       Adiciona animações de texto avançadas (GSAP + Anime.js) e animação stagger de elementos filhos à aba Avançado do Elementor.
 * Version:           1.0.0
 * Requires at least: 5.9
 * Requires PHP:      7.4
 * Author:            Your Name
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       pta
 * Domain Path:       /languages
 *
 * Elementor tested up to: 3.22.0
 * Elementor Pro tested up to: 3.22.0
 */

namespace PTA;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// ── Constants ──────────────────────────────────────────────────────────────────

define( 'PTA_VERSION',     '1.0.0' );
define( 'PTA_FILE',        __FILE__ );
define( 'PTA_PATH',        plugin_dir_path( __FILE__ ) );
define( 'PTA_URL',         plugin_dir_url( __FILE__ ) );
define( 'PTA_MIN_PHP',     '7.4' );
define( 'PTA_MIN_WP',      '5.9' );
define( 'PTA_MIN_ELEMENTOR', '3.0.0' );

// ── Bootstrap ─────────────────────────────────────────────────────────────────

/**
 * Load the plugin after all plugins have loaded.
 */
function pta_init(): void {

	// PHP version check.
	if ( version_compare( PHP_VERSION, PTA_MIN_PHP, '<' ) ) {
		add_action( 'admin_notices', 'PTA\pta_notice_php_version' );
		return;
	}

	// Elementor check.
	if ( ! did_action( 'elementor/loaded' ) ) {
		add_action( 'admin_notices', 'PTA\pta_notice_elementor_missing' );
		return;
	}

	// Elementor version check.
	if ( ! version_compare( ELEMENTOR_VERSION, PTA_MIN_ELEMENTOR, '>=' ) ) {
		add_action( 'admin_notices', 'PTA\pta_notice_elementor_version' );
		return;
	}

	// Load core.
	require_once PTA_PATH . 'includes/class-plugin-core.php';
	Plugin_Core::instance();
}
add_action( 'plugins_loaded', 'PTA\pta_init' );

// ── Admin Notices ─────────────────────────────────────────────────────────────

function pta_notice_php_version(): void {
	printf(
		'<div class="notice notice-error"><p><strong>Text Animations for Elementor</strong>: requer PHP %s ou superior. Versão atual: %s.</p></div>',
		esc_html( PTA_MIN_PHP ),
		esc_html( PHP_VERSION )
	);
}

function pta_notice_elementor_missing(): void {
	echo '<div class="notice notice-error"><p><strong>Text Animations for Elementor</strong>: requer o plugin Elementor instalado e ativado.</p></div>';
}

function pta_notice_elementor_version(): void {
	printf(
		'<div class="notice notice-error"><p><strong>Text Animations for Elementor</strong>: requer Elementor %s ou superior.</p></div>',
		esc_html( PTA_MIN_ELEMENTOR )
	);
}
