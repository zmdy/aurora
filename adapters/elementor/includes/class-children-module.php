<?php
/**
 * Animate Children module: staggered entrance and hover effects for the
 * children of a container, section, column or repeated-item widget.
 *
 * Which elements count as "children" is an Elementor concern, so this class
 * adds a "Animate" choice and translates it, together with the element type,
 * into the module's `root` and `selector` options.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Children_Module extends Schema_Module {

	protected function managed_options(): array {
		return [ 'root', 'selector' ];
	}

	/** Elements that always animate their own repeated items. */
	private function has_fixed_items( Element_Base $element ): bool {
		return isset( Element_Targets::CHILDREN_ITEMS[ $element->get_name() ] );
	}

	protected function register_leading_fields( Element_Base $element ): void {

		if ( $this->has_fixed_items( $element ) ) {
			return;
		}

		$element->add_control(
			$this->control_id( 'choice' ),
			[
				'label'       => esc_html__( 'Animate', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::SELECT,
				'default'     => 'children',
				'options'     => [
					'children'   => esc_html__( 'Direct children', 'aurora-for-elementor' ),
					'containers' => esc_html__( 'Nested containers and columns', 'aurora-for-elementor' ),
					'widgets'    => esc_html__( 'All widgets inside', 'aurora-for-elementor' ),
					'custom'     => esc_html__( 'Custom CSS selector', 'aurora-for-elementor' ),
				],
				'condition'   => [ $this->enable_id() => 'yes' ],
				'render_type' => 'template',
			]
		);

		$element->add_control(
			$this->control_id( 'custom_selector' ),
			[
				'label'       => esc_html__( 'CSS selector', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXT,
				'placeholder' => '.my-card',
				'condition'   => [
					$this->enable_id()          => 'yes',
					$this->control_id( 'choice' ) => 'custom',
				],
				'render_type' => 'template',
			]
		);
	}

	protected function derived_options( array $settings, ?Element_Base $element ): array {
		if ( ! $element ) {
			return [];
		}

		$targets = Element_Targets::children(
			$element->get_name(),
			(string) ( $settings[ $this->control_id( 'choice' ) ] ?? 'children' ),
			(string) ( $settings[ $this->control_id( 'custom_selector' ) ] ?? '' )
		);

		return array_filter( $targets, static function ( $value ) {
			return '' !== $value;
		} );
	}
}
