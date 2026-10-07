<?php
/**
 * Animated Headline module: phrases that rotate through an animation.
 *
 * The controls come from the schema, which is derived from the
 * animated-headlines manifest, so an effect added to that library turns up
 * here without this file changing.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Headline_Module extends Schema_Module {

	protected function managed_options(): array {
		return [ 'target' ];
	}

	/**
	 * Elementor hands the module its widget wrapper, so without a target the
	 * headline would replace the whole widget rather than the heading in it.
	 */
	protected function derived_options( array $settings, ?Element_Base $element ): array {
		$target = $element ? Element_Targets::text( $element->get_name() ) : '';
		return $target ? [ 'target' => $target ] : [];
	}
}
