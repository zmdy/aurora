<?php
/**
 * Counter module: a clock, a countdown, a timecode or a counting number.
 *
 * The controls come from the schema, which is derived from the
 * animated-headlines manifest, so a counter added to that library turns up
 * here without this file changing.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Counter_Module extends Schema_Module {

	/**
	 * `target` is the countdown's date here, not a selector — the node the
	 * counter is mounted into is `selector`, and that is what the adapter
	 * derives from the element.
	 */
	protected function managed_options(): array {
		return [ 'selector' ];
	}

	/**
	 * Elementor hands the module its widget wrapper, so without a selector the
	 * counter would replace the whole widget rather than the text inside it.
	 */
	protected function derived_options( array $settings, ?Element_Base $element ): array {
		$selector = $element ? Element_Targets::text( $element->get_name() ) : '';
		return $selector ? [ 'selector' => $selector ] : [];
	}
}
