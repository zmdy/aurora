<?php
/**
 * Plugin Core — carrega os módulos e registra os assets.
 *
 * @package PTA
 */

namespace PTA;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Singleton que orquestra todo o plugin.
 */
final class Plugin_Core {

	/** @var Plugin_Core|null */
	private static ?Plugin_Core $_instance = null;

	public static function instance(): Plugin_Core {
		if ( null === self::$_instance ) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}

	private function __construct() {
		$this->load_modules();
		$this->register_hooks();
	}

	// ── Modules ────────────────────────────────────────────────────────────────

	private function load_modules(): void {
		require_once PTA_PATH . 'includes/class-text-animation-controls.php';
		require_once PTA_PATH . 'includes/class-children-animation-controls.php';

		new Text_Animation_Controls();
		new Children_Animation_Controls();
	}

	// ── Hooks ─────────────────────────────────────────────────────────────────

	private function register_hooks(): void {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ] );
	}

	// ── Asset Enqueue ─────────────────────────────────────────────────────────

	public function enqueue_frontend_assets(): void {

		if ( ! function_exists( 'elementor_load_plugin_textdomain' ) ) {
			return; // Only enqueue when Elementor is active.
		}

		// ── Vendor: GSAP 3.12 (core) ──────────────────────────────────────────
		wp_enqueue_script(
			'pta-gsap',
			'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
			[],
			'3.12.5',
			true
		);

		// ── Vendor: Anime.js 3.2 ─────────────────────────────────────────────
		wp_enqueue_script(
			'pta-animejs',
			'https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js',
			[],
			'3.2.1',
			true
		);

		// ── Text animations ───────────────────────────────────────────────────
		wp_enqueue_script(
			'pta-text-animations',
			PTA_URL . 'assets/js/text-animations.js',
			[ 'jquery', 'pta-gsap', 'pta-animejs' ],
			PTA_VERSION,
			true
		);

		// ── Children animations ───────────────────────────────────────────────
		wp_enqueue_script(
			'pta-children-animations',
			PTA_URL . 'assets/js/children-animations.js',
			[ 'jquery', 'pta-gsap' ],
			PTA_VERSION,
			true
		);

		// ── Styles ────────────────────────────────────────────────────────────
		wp_enqueue_style(
			'pta-text-animations',
			PTA_URL . 'assets/css/text-animations.css',
			[],
			PTA_VERSION
		);
	}
}
