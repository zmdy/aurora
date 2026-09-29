<?php
/** Aurora Headline: content and controls only; animation stays in @aurora/text. */
namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Widget_Base;

if ( ! defined( 'ABSPATH' ) ) { exit; }

class Animated_Headline_Widget extends Widget_Base {

	public function get_name(): string { return 'aurora-animated-headline'; }
	public function get_title(): string { return 'Aurora Animated Headline'; }
	public function get_icon(): string { return 'eicon-animated-headline'; }
	public function get_categories(): array { return [ 'general' ]; }
	public function get_keywords(): array { return [ 'aurora', 'headline', 'highlight', 'rotating', 'text', 'animation' ]; }
	public function get_script_depends(): array { return [ Asset_Manager::handle( 'text' ) ]; }

	public static function option_names(): array {
		return [ 'beforeText', 'highlightedText', 'afterText', 'animationStyle', 'animationShape', 'rotatingText', 'rotationEffect', 'letterStagger', 'rotationColor', 'rotationColor2', 'headlineColor', 'headlineColor2', 'strokeWidth', 'duration', 'delay', 'holdDuration', 'headlineLoop', 'headlineAutoplay', 'pauseOnHover' ];
	}

	private static function defaults(): array {
		return [ 'beforeText' => 'Create', 'highlightedText' => 'extraordinary', 'afterText' => 'experiences.', 'rotatingText' => "memorable\noriginal" ];
	}

	protected function register_controls(): void {
		$schema = Module_Manager::schemas()['text']['options'] ?? [];
		$defaults = self::defaults();
		$this->start_controls_section( 'aurora_headline_content', [ 'label' => 'Animated Headline' ] );
		foreach ( self::option_names() as $name ) {
			$spec = $schema[ $name ] ?? null;
			if ( ! $spec ) { continue; }
			$args = [ 'label' => $spec['label'] ?? $name, 'default' => $defaults[ $name ] ?? $spec['default'], 'frontend_available' => true, 'render_type' => 'template' ];
			if ( isset( $spec['description'] ) ) { $args['description'] = $spec['description']; }
			$condition = $spec['when'] ?? [];
			unset( $condition['mode'] );
			if ( $condition ) { $args['condition'] = $condition; }
			switch ( $spec['type'] ) {
				case 'enum':
					$args['type'] = Controls_Manager::SELECT;
					foreach ( $spec['values'] as $value ) {
						$args['options'][ is_array( $value ) ? $value['value'] : $value ] = is_array( $value ) ? $value['label'] : ucwords( str_replace( '-', ' ', $value ) );
					}
					break;
				case 'boolean':
					$args['type'] = Controls_Manager::SWITCHER;
					$args['return_value'] = 'yes';
					$args['default'] = $args['default'] ? 'yes' : '';
					break;
				case 'number':
					$args['type'] = Controls_Manager::NUMBER;
					$args['min'] = $spec['min']; $args['max'] = $spec['max']; $args['step'] = $spec['step'] ?? 1;
					$args['label'] .= isset( $spec['unit'] ) ? ' (' . $spec['unit'] . ')' : '';
					break;
				case 'color': $args['type'] = Controls_Manager::COLOR; break;
				default:
					$args['type'] = 'textarea' === ( $spec['ui'] ?? '' ) ? Controls_Manager::TEXTAREA : Controls_Manager::TEXT;
					$args['dynamic'] = [ 'active' => true ];
			}
			$this->add_control( $name, $args );
		}
		$this->add_control( 'html_tag', [ 'label' => 'HTML tag', 'type' => Controls_Manager::SELECT, 'default' => 'h2', 'options' => array_combine( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p' ], [ 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'div', 'p' ] ) ] );
		$this->end_controls_section();
		$this->start_controls_section( 'aurora_headline_style', [ 'label' => 'Headline style', 'tab' => Controls_Manager::TAB_STYLE ] );
		$this->add_group_control( Group_Control_Typography::get_type(), [ 'name' => 'headline_typography', 'selector' => '{{WRAPPER}} .aurora-headline-heading' ] );
		$this->add_control( 'text_color', [ 'label' => 'Text color', 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .aurora-headline-heading' => 'color: {{VALUE}};' ] ] );
		$this->add_control( 'active_color', [ 'label' => 'Animated text color', 'type' => Controls_Manager::COLOR, 'selectors' => [ '{{WRAPPER}} .aurora-headline__center' => 'color: {{VALUE}};' ] ] );
		$this->add_responsive_control( 'alignment', [ 'label' => 'Alignment', 'type' => Controls_Manager::SELECT, 'options' => [ 'start' => 'Start', 'center' => 'Center', 'end' => 'End' ], 'default' => 'start', 'selectors' => [ '{{WRAPPER}} .aurora-headline-heading' => 'text-align: {{VALUE}};' ] ] );
		$this->end_controls_section();
	}

	public static function options_from_settings( array $settings ): array {
		$schema = Module_Manager::schemas()['text']['options'] ?? [];
		$defaults = self::defaults();
		$options = [ 'mode' => 'headline', 'trigger' => 'load' ];
		foreach ( self::option_names() as $name ) {
			$spec = $schema[ $name ] ?? null;
			if ( ! $spec ) { continue; }
			$raw = $settings[ $name ] ?? ( $defaults[ $name ] ?? $spec['default'] );
			if ( 'boolean' === $spec['type'] ) { $raw = true === $raw || 'yes' === $raw; }
			elseif ( 'number' === $spec['type'] ) { $raw = is_numeric( $raw ) ? max( $spec['min'], min( $spec['max'], (float) $raw ) ) : $spec['default']; }
			elseif ( ! is_scalar( $raw ) ) { $raw = $spec['default']; }
			if ( 'enum' === $spec['type'] && ! in_array( $raw, $spec['values'], true ) ) { $raw = $spec['default']; }
			$options[ $name ] = $raw;
		}
		return $options;
	}

	protected function render(): void {
		Asset_Manager::need( 'text' );
		$settings = $this->get_settings_for_display();
		$options = self::options_from_settings( $settings );
		$tag = $settings['html_tag'] ?? 'h2';
		if ( ! in_array( $tag, [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'p' ], true ) ) { $tag = 'h2'; }
		$fallback = implode( ' ', array_filter( [ $options['beforeText'], $options['highlightedText'] ?: 'Aurora', $options['afterText'] ], 'strlen' ) );
		echo '<' . $tag . ' class="aurora-headline-heading" data-aurora-text data-aurora-text-mode="headline" data-aurora-text-options="' . esc_attr( wp_json_encode( $options ) ) . '">' . esc_html( $fallback ) . '</' . $tag . '>';
	}
}
