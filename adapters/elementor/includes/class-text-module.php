<?php
/**
 * Text module: split-text effects on headings, paragraphs and button labels.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Text_Module extends Schema_Module {

	protected function managed_options(): array {
		return [ 'target' ];
	}

	protected function derived_options( array $settings, ?Element_Base $element ): array {
		$target = $element ? Element_Targets::text( $element->get_name() ) : '';
		return $target ? [ 'target' => $target ] : [];
	}
}
