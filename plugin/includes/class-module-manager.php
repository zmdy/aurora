<?php
/**
 * Module_Manager — central registry of the Aurora animation modules.
 *
 * To add a new module in the future:
 *   1. Create includes/class-{module-name}.php with a class that
 *      extends Animation_Module and implements the 4 abstract methods.
 *   2. Add the class to the $modules array inside Module_Manager::init() below.
 * Nothing else needs to be touched — the autoloader (registered in
 * aurora-for-elementor.php) takes care of the require, and the
 * Animation_Module constructor takes care of the Elementor hooks.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Module_Manager {

	/**
	 * Instantiates all registered modules.
	 */
	public static function init(): void {
		$modules = [
			Text_Animation_Controls::class,
			Gradient_Controls::class,
			Glassmorphism_Controls::class,
			Cursor_Follow_Controls::class,
			Image_Effects_Controls::class,
			// Children_Animation_Controls was originally GSAP-only and gated
			// behind AURORA_HAS_GSAP; it has since been rewritten on top of
			// Elementor's own bundled animate.css (see enqueue_styles() and
			// assets/js/children-animations.js — neither touches GSAP or
			// Anime.js), so it no longer needs that gate and now ships
			// unconditionally in both the full and light builds.
			Children_Animation_Controls::class,
		];

		foreach ( $modules as $module_class ) {
			new $module_class();
		}
	}
}
