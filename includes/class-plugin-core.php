<?php
/**
 * Plugin Core — carrega os módulos e registra os assets.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Singleton que orquestra todo o plugin.
 */
final class Plugin_Core {

	/** @var Plugin_Core|null */
	private static $_instance = null;

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
		require_once AURORA_PATH . 'includes/class-text-animation-controls.php';
		require_once AURORA_PATH . 'includes/class-children-animation-controls.php';

		new Text_Animation_Controls();
		new Children_Animation_Controls();
	}

	// ── Hooks ─────────────────────────────────────────────────────────────────

	private function register_hooks(): void {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ] );
		add_action( 'elementor/editor/after_enqueue_styles', [ $this, 'enqueue_editor_assets' ] );
	}

	// ── Asset Enqueue ─────────────────────────────────────────────────────────

	public function enqueue_frontend_assets(): void {

		// Elementor já foi verificado em aurora_init(); esta checagem é apenas
		// uma salvaguarda extra para evitar erros em contextos inesperados.
		if ( ! class_exists( '\Elementor\Plugin' ) ) {
			return;
		}

		// ── Vendor: GSAP 3.12 (local) ─────────────────────────────────────────
		wp_enqueue_script(
			'aurora-gsap',
			AURORA_URL . 'assets/js/vendor/gsap.min.js',
			[],
			'3.12.5',
			true
		);

		// ── Vendor: Anime.js 4.4 (local, UMD global)─────────────────────────────────────
		wp_enqueue_script(
			'aurora-animejs',
			AURORA_URL . 'assets/js/vendor/anime.min.js',
			[],
			'4.4.1',
			true
		);

		// ── Text animations ───────────────────────────────────────────────────
		// Depende de 'elementor-frontend' para garantir que elementorFrontend/
		// elementorModules já existam quando este script registra seu Frontend
		// Handler (onInit/onElementChange) — necessário para o preview live no editor.
		wp_enqueue_script(
			'aurora-text-animations',
			AURORA_URL . 'assets/js/text-animations.js',
			[ 'jquery', 'aurora-gsap', 'aurora-animejs', 'elementor-frontend' ],
			AURORA_VERSION,
			true
		);

		// ── Children animations ───────────────────────────────────────────────
		wp_enqueue_script(
			'aurora-children-animations',
			AURORA_URL . 'assets/js/children-animations.js',
			[ 'jquery', 'aurora-gsap', 'elementor-frontend' ],
			AURORA_VERSION,
			true
		);

		// ── Styles ────────────────────────────────────────────────────────────
		wp_enqueue_style(
			'aurora-text-animations',
			AURORA_URL . 'assets/css/text-animations.css',
			[],
			AURORA_VERSION
		);
	}

	/**
	 * Estilos exclusivos do painel do editor do Elementor — usados para
	 * trocar o ícone padrão das seções Aurora pelos ícones de marca.
	 */
	public function enqueue_editor_assets(): void {
		wp_enqueue_style(
			'aurora-editor',
			AURORA_URL . 'assets/css/editor.css',
			[],
			AURORA_VERSION
		);
	}
}
