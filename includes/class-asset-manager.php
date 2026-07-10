<?php
/**
 * Asset_Manager — registers and enqueues all of the plugin's assets
 * (frontend, editor live preview, and editor panel).
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
	 * Scripts and styles used on the frontend (and in the editor's live preview).
	 */
	public function enqueue_frontend_assets(): void {

		// Elementor was already checked in aurora_init(); this check is just
		// an extra safeguard against errors in unexpected contexts.
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

		// ── Vendor: Motion One 11 (local) ─────────────────────────────────────
		// Used by the Morph Card widget for the smooth frame interpolation
		// between templates (radius/padding/rotate/height) — a domain where
		// GSAP would work too, but Motion's promise-based API keeps the
		// morph pipeline readable.
		wp_enqueue_script(
			'aurora-motion-one',
			AURORA_URL . 'assets/js/vendor/motion.min.js',
			[],
			'11.0.0',
			true
		);

		// ── Text animations ───────────────────────────────────────────────────
		// Depends on 'elementor-frontend' to make sure elementorFrontend/
		// elementorModules already exist when this script registers its Frontend
		// Handler (onInit/onElementChange) — needed for the editor's live preview.
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

		// ── Gradient module ───────────────────────────────────────────────────
		// Doesn't depend on GSAP/Anime.js — the whole effect (static, animated,
		// mesh/loop, or the mouse-follow spotlight) is resolved in pure CSS
		// (or a live inline style, for the spotlight) driven by the script itself.
		wp_enqueue_script(
			'aurora-gradient-module',
			AURORA_URL . 'assets/js/gradient-module.js',
			[ 'jquery', 'elementor-frontend' ],
			AURORA_VERSION,
			true
		);

		// ── Cursor Follow module ──────────────────────────────────────────────
		// No external dependency beyond 'elementor-frontend' for the Frontend
		// Handler — the dot/ring pair and its mouse tracking are plain DOM/CSS.
		wp_enqueue_script(
			'aurora-cursor-follow',
			AURORA_URL . 'assets/js/cursor-follow.js',
			[ 'jquery', 'elementor-frontend' ],
			AURORA_VERSION,
			true
		);

		// ── Image Effects module ──────────────────────────────────────────────
		// Handles the entrance animations (GSAP or Anime.js, user-selectable,
		// + IntersectionObserver for the scroll trigger) — the hover effects
		// are pure CSS, see assets/css/image-effects.css.
		wp_enqueue_script(
			'aurora-image-effects',
			AURORA_URL . 'assets/js/image-effects.js',
			[ 'jquery', 'aurora-gsap', 'aurora-animejs', 'elementor-frontend' ],
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

		wp_enqueue_style(
			'aurora-gradient-module',
			AURORA_URL . 'assets/css/gradient-module.css',
			[],
			AURORA_VERSION
		);

		// ── Glassmorphism module ──────────────────────────────────────────────
		// No JS — the effect is a single `style` attribute computed in PHP.
		// This stylesheet only covers the fallback for browsers without backdrop-filter.
		wp_enqueue_style(
			'aurora-glass-module',
			AURORA_URL . 'assets/css/glass-module.css',
			[],
			AURORA_VERSION
		);

		// ── Cursor Follow module ──────────────────────────────────────────────
		wp_enqueue_style(
			'aurora-cursor-follow',
			AURORA_URL . 'assets/css/cursor-follow.css',
			[],
			AURORA_VERSION
		);

		// ── Image Effects module ──────────────────────────────────────────────
		// Covers the hover effects (pure CSS) and the overlay panels used by
		// the wipe/curtain/iris entrance effects.
		wp_enqueue_style(
			'aurora-image-effects',
			AURORA_URL . 'assets/css/image-effects.css',
			[],
			AURORA_VERSION
		);

		// ── Morph Card widget ─────────────────────────────────────────────────
		// Enqueued globally (matches every other Aurora module): relying on
		// get_script_depends() alone doesn't reliably pull the handler into
		// the Elementor editor iframe, and without the handler the widget
		// stays invisible (its .morph-card starts at opacity: 0 in the CSS).
		wp_enqueue_script(
			'aurora-morph-card',
			AURORA_URL . 'assets/js/morph-card.js',
			[ 'jquery', 'aurora-motion-one', 'aurora-animejs', 'elementor-frontend' ],
			AURORA_VERSION,
			true
		);
		wp_enqueue_style(
			'aurora-morph-card',
			AURORA_URL . 'assets/css/morph-card.css',
			[],
			AURORA_VERSION
		);
	}

	/**
	 * Styles used only in the Elementor editor panel — used to swap the
	 * default icon of the Aurora sections for the brand icons.
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
