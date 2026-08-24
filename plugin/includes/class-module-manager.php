<?php
/**
 * Module_Manager — central registry of the Aurora animation modules.
 *
 * To add a new module in the future:
 *   1. Create includes/class-{module-name}.php with a class that
 *      extends Animation_Module and implements the 4 abstract methods.
 *   2. Add an entry to the $modules array inside get_modules() below.
 * Nothing else needs to be touched — the autoloader (registered in
 * aurora-for-elementor.php) takes care of the require, the
 * Animation_Module constructor takes care of the Elementor hooks, and
 * Admin_Page automatically picks up the new entry for its Modules tab
 * toggle grid, since it reads this same array.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Module_Manager {

	/**
	 * Option name storing which modules are enabled, as
	 * [ module_key => bool ]. A key missing from the saved option is
	 * treated as enabled — this is what keeps every existing install
	 * fully functional immediately after updating to a version that
	 * introduces this option, with nothing to migrate.
	 */
	const OPTION_ACTIVE_MODULES = 'aurora_active_modules';

	/**
	 * Central registry: module key => label/description/icon/class. Used
	 * both to instantiate modules (init()) and to render the Admin_Page
	 * Modules tab — one list, two consumers, so a module added here shows
	 * up in both places with no further wiring.
	 */
	public static function get_modules(): array {
		return [
			'text_animation'   => [
				'label'       => esc_html__( 'Text Animation', 'aurora-for-elementor' ),
				'description' => esc_html__( 'Splits text into characters, words, or lines and animates them on scroll or page load — 88 effects across GSAP and Anime.js.', 'aurora-for-elementor' ),
				'icon'        => AURORA_URL . 'assets/branding/icons/aurora_icon_green_module_animate_text.svg',
				'icon_type'   => 'svg',
				'class'       => Text_Animation_Controls::class,
			],
			'animate_children' => [
				'label'       => esc_html__( 'Animate Children Elements', 'aurora-for-elementor' ),
				'description' => esc_html__( 'Applies a staggered entrance animation to each child of a Section, Column, Container, or Widget.', 'aurora-for-elementor' ),
				'icon'        => AURORA_URL . 'assets/branding/icons/aurora_icon_green_module_animate_children.svg',
				'icon_type'   => 'svg',
				'class'       => Children_Animation_Controls::class,
			],
			'gradient'         => [
				'label'       => esc_html__( 'Gradient', 'aurora-for-elementor' ),
				'description' => esc_html__( 'Multi-stop linear, radial, and conic gradients, the animated WebGL Mesh Shader Engine, and a Follow Mouse spotlight mode.', 'aurora-for-elementor' ),
				'icon'        => AURORA_URL . 'assets/branding/icons/aurora_icon_green_module_gradient.svg',
				'icon_type'   => 'svg',
				'class'       => Gradient_Controls::class,
			],
			'glassmorphism'    => [
				'label'       => esc_html__( 'Glassmorphism', 'aurora-for-elementor' ),
				'description' => esc_html__( 'A translucent, blurred "frosted glass" background resolved entirely in PHP — no JavaScript involved.', 'aurora-for-elementor' ),
				'icon'        => AURORA_URL . 'assets/branding/icons/aurora_icon_green_module_glassmorphism.svg',
				'icon_type'   => 'svg',
				'class'       => Glassmorphism_Controls::class,
			],
			'cursor_follow'    => [
				'label'       => esc_html__( 'Cursor Follow', 'aurora-for-elementor' ),
				'description' => esc_html__( 'Replaces the native cursor with a custom dot-and-ring pair, with configurable hover states.', 'aurora-for-elementor' ),
				'icon'        => 'dashicons-move',
				'icon_type'   => 'dashicon',
				'class'       => Cursor_Follow_Controls::class,
			],
			'image_effects'    => [
				'label'       => esc_html__( 'Image Effects', 'aurora-for-elementor' ),
				'description' => esc_html__( 'Entrance animations and hover effects for the native Elementor Image widget.', 'aurora-for-elementor' ),
				'icon'        => 'dashicons-format-image',
				'icon_type'   => 'dashicon',
				'class'       => Image_Effects_Controls::class,
			],
		];
	}

	/**
	 * Resolves which modules are currently active, defaulting any module
	 * never explicitly saved to enabled.
	 *
	 * @return array<string, bool> module key => active.
	 */
	public static function get_active_modules(): array {
		$saved = get_option( self::OPTION_ACTIVE_MODULES, [] );
		if ( ! is_array( $saved ) ) {
			$saved = [];
		}

		$active = [];
		foreach ( array_keys( self::get_modules() ) as $key ) {
			$active[ $key ] = ! isset( $saved[ $key ] ) || ! empty( $saved[ $key ] );
		}
		return $active;
	}

	/**
	 * Instantiates every currently-active module.
	 */
	public static function init(): void {
		$active = self::get_active_modules();

		foreach ( self::get_modules() as $key => $module ) {
			if ( ! empty( $active[ $key ] ) ) {
				new $module['class']();
			}
		}
	}
}
