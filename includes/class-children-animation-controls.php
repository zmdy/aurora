<?php
/**
 * Children Animation Controls — injeta controles de animação staggered
 * de elementos filhos na aba Avançado de todos os elementos do Elementor.
 *
 * Implementa apenas o que é específico deste módulo; o encanamento
 * comum (hooks, deduplicação, montagem da seção) vive em Animation_Module.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registra os controles "Animar Elementos Filhos" e injeta atributos no render.
 */
class Children_Animation_Controls extends Animation_Module {

	protected function get_section_id(): string {
		return 'aurora_children_section';
	}

	protected function get_section_label(): string {
		return __( 'Animar Elementos Filhos', 'aurora-for-elementor' );
	}

	/**
	 * Este módulo atua em widgets, sections, columns e containers —
	 * diferente do padrão (só widgets) usado pela maioria dos módulos.
	 */
	protected function get_controls_hooks(): array {
		return [
			// priority 20 para ficar depois do text animation (10) nos widgets.
			[ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 20 ],
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 10 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 10 ],
		];
	}

	// ── Controles ─────────────────────────────────────────────────────────────

	/**
	 * Campos da seção "Animar Elementos Filhos".
	 *
	 * @param Element_Base $element  Instância do elemento.
	 */
	protected function register_fields( Element_Base $element ): void {

		// ── Habilitar ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_enable',
			[
				'label'              => esc_html__( 'Animar Elementos Filhos', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Sim', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'Não', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'frontend_available' => true,
			]
		);

		// ── Tipo de animação ──────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_animation',
			[
				'label'     => esc_html__( 'Tipo de Animação', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'fade-up',
				'options'   => [
					'fade-up'    => esc_html__( 'Fade Up',      'aurora-for-elementor' ),
					'fade-down'  => esc_html__( 'Fade Down',    'aurora-for-elementor' ),
					'fade-in'    => esc_html__( 'Fade In',      'aurora-for-elementor' ),
					'slide-left' => esc_html__( 'Slide Esquerda', 'aurora-for-elementor' ),
					'slide-right'=> esc_html__( 'Slide Direita',  'aurora-for-elementor' ),
					'zoom-in'    => esc_html__( 'Zoom In',      'aurora-for-elementor' ),
					'zoom-out'   => esc_html__( 'Zoom Out',     'aurora-for-elementor' ),
					'flip-up'    => esc_html__( 'Flip Up',      'aurora-for-elementor' ),
					'rotate-in'  => esc_html__( 'Rotate In',   'aurora-for-elementor' ),
					'bounce-in'  => esc_html__( 'Bounce In',   'aurora-for-elementor' ),
				],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Seletor dos filhos ────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_selector',
			[
				'label'       => esc_html__( 'Seletor CSS dos Filhos', 'aurora-for-elementor' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => '.elementor-widget',
				'placeholder' => '.elementor-widget, .elementor-icon-list-item',
				'description' => esc_html__( 'Seletor CSS para identificar os elementos filhos a animar. Padrão: .elementor-widget', 'aurora-for-elementor' ),
				'condition'   => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Duração ───────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_duration',
			[
				'label'     => esc_html__( 'Duração por filho (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 3000,
						'step' => 50,
					],
				],
				'default'   => [ 'size' => 600 ],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Delay inicial ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_delay',
			[
				'label'     => esc_html__( 'Delay inicial (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 3000,
						'step' => 50,
					],
				],
				'default'   => [ 'size' => 0 ],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Delay entre filhos (stagger) ──────────────────────────────────────
		$element->add_control(
			'aurora_children_stagger',
			[
				'label'     => esc_html__( 'Delay entre filhos (ms)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 1000,
						'step' => 10,
					],
				],
				'default'   => [ 'size' => 150 ],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Gatilho ───────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_trigger',
			[
				'label'     => esc_html__( 'Disparar ao', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'scroll',
				'options'   => [
					'scroll' => esc_html__( 'Entrar na viewport (scroll)', 'aurora-for-elementor' ),
					'load'   => esc_html__( 'Carregar a página', 'aurora-for-elementor' ),
				],
				'condition' => [ 'aurora_children_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Threshold ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_threshold',
			[
				'label'     => esc_html__( 'Visibilidade para disparar (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 5,
					],
				],
				'default'   => [ 'size' => 15 ],
				'condition' => [
					'aurora_children_enable'  => 'yes',
					'aurora_children_trigger' => 'scroll',
				],
				'frontend_available' => true,
			]
		);

		// ── Repetir ───────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_children_replay',
			[
				'label'        => esc_html__( 'Repetir ao re-entrar na viewport', 'aurora-for-elementor' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Sim', 'aurora-for-elementor' ),
				'label_off'    => esc_html__( 'Não', 'aurora-for-elementor' ),
				'return_value' => 'yes',
				'default'      => '',
				'condition'    => [
					'aurora_children_enable'  => 'yes',
					'aurora_children_trigger' => 'scroll',
				],
				'frontend_available' => true,
			]
		);
	}

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Converte as configurações salvas nos data-attributes do wrapper.
	 * Retorna array vazio quando a animação está desabilitada.
	 *
	 * @param array $settings  Configurações do elemento.
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings ): array {

		if ( empty( $settings['aurora_children_enable'] ) || 'yes' !== $settings['aurora_children_enable'] ) {
			return [];
		}

		// Sanitize o seletor CSS (permite apenas caracteres válidos).
		$raw_selector = $settings['aurora_children_selector'] ?? '.elementor-widget';
		$selector     = preg_replace( '/[^a-zA-Z0-9_\-\.\s,:#>+~\[\]=^$*|()]/', '', $raw_selector );
		$selector     = $selector ?: '.elementor-widget';

		return [
			'data-aurora-children-enable'    => '1',
			'data-aurora-children-animation' => esc_attr( $settings['aurora_children_animation'] ?? 'fade-up' ),
			'data-aurora-children-selector'  => esc_attr( $selector ),
			'data-aurora-children-duration'  => esc_attr( $settings['aurora_children_duration']['size'] ?? 600 ),
			'data-aurora-children-delay'     => esc_attr( $settings['aurora_children_delay']['size'] ?? 0 ),
			'data-aurora-children-stagger'   => esc_attr( $settings['aurora_children_stagger']['size'] ?? 150 ),
			'data-aurora-children-trigger'   => esc_attr( $settings['aurora_children_trigger'] ?? 'scroll' ),
			'data-aurora-children-threshold' => esc_attr( ( $settings['aurora_children_threshold']['size'] ?? 15 ) / 100 ),
			'data-aurora-children-replay'    => ( 'yes' === ( $settings['aurora_children_replay'] ?? '' ) ) ? '1' : '0',
		];
	}
}
