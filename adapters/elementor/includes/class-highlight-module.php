<?php
/**
 * Highlight Shapes module: a hand-drawn marker drawn over a phrase.
 *
 * Every control comes from the schema, which is itself derived from the
 * animated-headlines manifest, so a shape added to that library turns up here
 * without this file changing.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Highlight_Module extends Schema_Module {

	protected function managed_options(): array {
		return [ 'target' ];
	}

	/**
	 * Elementor hands the module its widget wrapper, so without a target the
	 * drawing would replace the whole widget rather than decorate the heading
	 * inside it. The text nodes are the same ones the Text module uses.
	 */
	protected function derived_options( array $settings, ?Element_Base $element ): array {
		$target = $element ? Element_Targets::text( $element->get_name() ) : '';
		return $target ? [ 'target' => $target ] : [];
	}
}
