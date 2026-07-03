<?php
/**
 * Module_Manager — central registry of the Aurora animation modules.
 *
 * To add a new module in the future:
 *   1. Create includes/class-{module-name}.php with a class that
 *      extends Animation_Module and implements the 4 abstract methods.
 *   2. Add the class to the $modules array below.
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

	/** @var array<int, class-string<Animation_Module>> Active modules of the plugin. */
	private static $modules = [
		Text_Animation_Controls::class,
		Children_Animation_Controls::class,
		Gradient_Controls::class,
		Glassmorphism_Controls::class,
		Cursor_Follow_Controls::class,
	];

	/**
	 * Instantiates all registered modules.
	 */
	public static function init(): void {
		foreach ( self::$modules as $module_class ) {
			new $module_class();
		}
	}
}
