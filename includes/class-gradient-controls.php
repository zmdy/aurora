<?php
/**
 * Gradient Controls — gradientes multi-stop (3+ cores) em containers
 * (fundo) e nos widgets Heading/Text Editor (texto), com opção de
 * animação em "mesh" (blobs com blur) ou "loop" (rotação de matiz).
 *
 * Implementa apenas o que é específico deste módulo; o encanamento
 * comum (hooks, deduplicação, montagem da seção) vive em Animation_Module.
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

/**
 * Registra os controles de "Gradiente" e injeta os data-attributes no render.
 */
class Gradient_Controls extends Animation_Module {

	/** Elementos onde este módulo aparece: fundo em estruturais, texto nos 2 widgets. */
	const SUPPORTED_ELEMENTS = [ 'section', 'column', 'container', 'heading', 'text-editor' ];

	/** Widgets onde o gradiente é aplicado como text-fill em vez de fundo. */
	const TEXT_ELEMENTS = [ 'heading', 'text-editor' ];

	protected function get_section_id(): string {
		return 'aurora_gradient_section';
	}

	protected function get_section_label(): string {
		return __( 'Gradiente', 'aurora-for-elementor' );
	}

	/**
	 * Só aparece em containers (fundo) e nos widgets Heading/Text Editor (texto).
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
	}

	/**
	 * Precisa do hook "common" (widgets) além dos estruturais — applies_to_element()
	 * filtra para que a seção só apareça de fato em Heading/Text Editor.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 30 ],
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 20 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 20 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 20 ],
		];
	}

	/**
	 * Mesmo motivo do Text_Animation_Controls: garante que widgets (Heading,
	 * Text Editor) também recebam os atributos no frontend.
	 */
	protected function get_render_hooks(): array {
		return [
			'elementor/frontend/element/before_render',
			'elementor/frontend/widget/before_render',
		];
	}

	// ── Controles ─────────────────────────────────────────────────────────────

	/**
	 * Campos da seção "Gradiente".
	 *
	 * @param Element_Base $element Instância do elemento.
	 */
	protected function register_fields( Element_Base $element ): void {

		// ── Habilitar ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_enable',
			[
				'label'              => esc_html__( 'Habilitar Gradiente', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Sim', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'Não', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'description'        => esc_html__( 'Em containers, aplica no fundo. Em Heading/Text Editor, aplica na cor do texto.', 'aurora-for-elementor' ),
				'frontend_available' => true,
			]
		);

		// ── Tipo ──────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_type',
			[
				'label'              => esc_html__( 'Tipo', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'linear',
				'options'            => [
					'linear' => esc_html__( 'Linear', 'aurora-for-elementor' ),
					'radial' => esc_html__( 'Radial', 'aurora-for-elementor' ),
					'conic'  => esc_html__( 'Cônico', 'aurora-for-elementor' ),
				],
				'condition'          => [ 'aurora_gradient_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Ângulo ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_angle',
			[
				'label'     => esc_html__( 'Ângulo (graus)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 360,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 135 ],
				'condition'          => [
					'aurora_gradient_enable' => 'yes',
					'aurora_gradient_type'   => [ 'linear', 'conic' ],
				],
				'frontend_available' => true,
			]
		);

		// ── Cores (repeater, 3+) ──────────────────────────────────────────────
		$repeater = new Repeater();

		$repeater->add_control(
			'color',
			[
				'label'   => esc_html__( 'Cor', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::COLOR,
				'default' => '#0afbc1',
			]
		);

		$repeater->add_control(
			'offset',
			[
				'label'   => esc_html__( 'Posição (%)', 'aurora-for-elementor' ),
				'type'    => Controls_Manager::SLIDER,
				'range'   => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default' => [ 'size' => 0 ],
			]
		);

		$element->add_control(
			'aurora_gradient_stops',
			[
				'label'              => esc_html__( 'Cores do Gradiente (mín. 3)', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::REPEATER,
				'fields'             => $repeater->get_controls(),
				'default'            => [
					[
						'color'  => '#0afbc1',
						'offset' => [ 'size' => 0 ],
					],
					[
						'color'  => '#02db72',
						'offset' => [ 'size' => 50 ],
					],
					[
						'color'  => '#019282',
						'offset' => [ 'size' => 100 ],
					],
				],
				'title_field'        => '{{{ color }}}',
				'condition'          => [ 'aurora_gradient_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Animar ────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_animate',
			[
				'label'              => esc_html__( 'Animar Gradiente', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Sim', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'Não', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'condition'          => [ 'aurora_gradient_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Estilo da animação ────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_animation_style',
			[
				'label'     => esc_html__( 'Estilo da Animação', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'mesh',
				'options'   => [
					'mesh' => esc_html__( 'Mesh (blobs em movimento)', 'aurora-for-elementor' ),
					'loop' => esc_html__( 'Loop de Cor (rotação de matiz)', 'aurora-for-elementor' ),
				],
				'condition' => [
					'aurora_gradient_enable'  => 'yes',
					'aurora_gradient_animate' => 'yes',
				],
				'frontend_available' => true,
			]
		);

		// ── Velocidade ────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_gradient_speed',
			[
				'label'     => esc_html__( 'Duração do Ciclo (s)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 1,
						'max'  => 30,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 8 ],
				'condition'          => [
					'aurora_gradient_enable'  => 'yes',
					'aurora_gradient_animate' => 'yes',
				],
				'frontend_available' => true,
			]
		);
	}

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Converte as configurações salvas nos data-attributes do wrapper.
	 * Retorna array vazio quando o gradiente está desabilitado ou tem
	 * menos de 2 cores válidas.
	 *
	 * @param array             $settings Configurações do elemento.
	 * @param Element_Base|null $element  Instância do elemento (define fundo vs. texto).
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		if ( empty( $settings['aurora_gradient_enable'] ) || 'yes' !== $settings['aurora_gradient_enable'] ) {
			return [];
		}

		$raw_stops = $settings['aurora_gradient_stops'] ?? [];
		if ( ! is_array( $raw_stops ) || count( $raw_stops ) < 2 ) {
			return [];
		}

		$stops = [];
		foreach ( $raw_stops as $stop ) {
			$color    = ! empty( $stop['color'] ) ? $stop['color'] : '#0afbc1';
			$sanitized = sanitize_hex_color( $color );
			$offset   = isset( $stop['offset']['size'] ) ? (float) $stop['offset']['size'] : null;
			$stops[]  = [
				'color'  => $sanitized ? $sanitized : preg_replace( '/[^#a-zA-Z0-9(),.%\s]/', '', $color ),
				'offset' => $offset,
			];
		}

		$name   = $element ? $element->get_name() : '';
		$target = in_array( $name, self::TEXT_ELEMENTS, true ) ? 'text' : 'background';

		$type = $settings['aurora_gradient_type'] ?? 'linear';
		$type = in_array( $type, [ 'linear', 'radial', 'conic' ], true ) ? $type : 'linear';

		$style = $settings['aurora_gradient_animation_style'] ?? 'mesh';
		$style = in_array( $style, [ 'mesh', 'loop' ], true ) ? $style : 'mesh';

		return [
			'data-aurora-gradient-enable'  => '1',
			'data-aurora-gradient-target'  => esc_attr( $target ),
			'data-aurora-gradient-type'    => esc_attr( $type ),
			'data-aurora-gradient-angle'   => esc_attr( (int) ( $settings['aurora_gradient_angle']['size'] ?? 135 ) ),
			'data-aurora-gradient-stops'   => esc_attr( wp_json_encode( $stops ) ),
			'data-aurora-gradient-animate' => ( 'yes' === ( $settings['aurora_gradient_animate'] ?? '' ) ) ? '1' : '0',
			'data-aurora-gradient-style'   => esc_attr( $style ),
			'data-aurora-gradient-speed'   => esc_attr( max( 1, (int) ( $settings['aurora_gradient_speed']['size'] ?? 8 ) ) ),
		];
	}
}
