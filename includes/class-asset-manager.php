<?php
/**
 * Asset_Manager — registra e enfileira todos os assets do plugin
 * (frontend, preview live do editor, e painel do editor).
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Asset_Manager {

	public function __construct() {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ] );
		add_action( 'elementor/editor/after_enqueue_styles', [ $this, 'enqueue_editor_assets' ] );
	}

	/**
	 * Scripts e estilos usados no frontend (e no preview live do editor).
	 */
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

		// ── Vendor: Anime.js 4.4 (local, UMD global) ──────────────────────────
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
