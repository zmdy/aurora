<?php
/**
 * Gradient module: multi-stop gradients on backgrounds, text and icons.
 *
 * Widgets that can be painted in more than one way (icon box, icon list) get
 * a "Paint" choice; the others have a single target. Color stops use an
 * Elementor repeater and are serialized into the module's `stops` string.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Element_Base;
use Elementor\Repeater;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Gradient_Module extends Schema_Module {

	protected function managed_options(): array {
		return [ 'target', 'selector', 'stops' ];
	}

	protected function paints( Element_Base $element ): array {
		return Element_Targets::gradient_paints( $element->get_name() );
	}

	protected function register_leading_fields( Element_Base $element ): void {

		$paints = $this->paints( $element );

		if ( count( $paints ) > 1 ) {
			$labels = [
				'background' => esc_html__( 'Background', 'aurora-for-elementor' ),
				'text'       => esc_html__( 'Text', 'aurora-for-elementor' ),
				'icon'       => esc_html__( 'Icon', 'aurora-for-elementor' ),
			];
			$options = [];
			foreach ( $paints as $paint ) {
				$options[ $paint ] = $labels[ $paint ];
			}

			$element->add_control(
				$this->control_id( 'paint' ),
				[
					'label'       => esc_html__( 'Apply to', 'aurora-for-elementor' ),
					'type'        => Controls_Manager::SELECT,
					'default'     => $paints[0],
					'options'     => $options,
					'condition'   => [ $this->enable_id() => 'yes' ],
					'render_type' => 'template',
				]
			);
		}

		$repeater = new Repeater();
		$repeater->add_control(
			'color',
			[
				'label'   => esc_html__( 'Color', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::COLOR,
				'default' => '#7c6cff',
			]
		);
		$repeater->add_control(
			'offset',
			[
				'label'       => esc_html__( 'Position (%)', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::NUMBER,
				'min'         => 0,
				'max'         => 100,
				'description' => esc_html__( 'Leave empty to distribute the stops evenly.', 'aurora-for-elementor' ),
			]
		);

		$element->add_control(
			$this->control_id( 'stops' ),
			[
				'label'       => esc_html__( 'Color stops', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::REPEATER,
				'fields'      => $repeater->get_controls(),
				'default'     => [
					[ 'color' => '#7c6cff' ],
					[ 'color' => '#ff7a2f' ],
					[ 'color' => '#2af598' ],
				],
				'title_field' => '{{{ color }}}',
				'condition'   => [ $this->enable_id() => 'yes' ],
				'render_type' => 'template',
			]
		);
	}

	/**
	 * Which paint is active for an element.
	 *
	 * @param array        $settings Element settings.
	 * @param Element_Base $element  Element instance.
	 */
	private function active_paint( array $settings, Element_Base $element ): string {
		$paints = $this->paints( $element );
		$chosen = (string) ( $settings[ $this->control_id( 'paint' ) ] ?? '' );
		return in_array( $chosen, $paints, true ) ? $chosen : ( $paints[0] ?? 'background' );
	}

	protected function derived_options( array $settings, ?Element_Base $element ): array {
		if ( ! $element ) {
			return [];
		}

		$options = [];

		$target = Element_Targets::gradient( $element->get_name(), $this->active_paint( $settings, $element ) );
		if ( $target ) {
			$options['target'] = $target['target'];
			if ( '' !== $target['selector'] ) {
				$options['selector'] = $target['selector'];
			}
		}

		$stops = $this->stops_string( $settings[ $this->control_id( 'stops' ) ] ?? [] );
		if ( '' !== $stops ) {
			$options['stops'] = $stops;
		}

		return $options;
	}

	/**
	 * Serializes repeater rows into "#a;#b 40;#c".
	 *
	 * @param mixed $rows Repeater value.
	 */
	public function stops_string( $rows ): string {
		if ( ! is_array( $rows ) ) {
			return '';
		}

		$parts = [];
		foreach ( $rows as $row ) {
			if ( empty( $row['color'] ) ) {
				continue;
			}
			$part = trim( (string) $row['color'] );
			if ( isset( $row['offset'] ) && '' !== $row['offset'] && is_numeric( $row['offset'] ) ) {
				$part .= ' ' . ( $row['offset'] + 0 );
			}
			$parts[] = $part;
		}

		return implode( ';', $parts );
	}
}
