<?php
/**
 * Children Animation Controls — injeta controles de animação staggered
 * de elementos filhos na aba Avançado de todos os elementos do Elementor.
 *
 * @package PTA
 */

namespace PTA;

use Elementor\Controls_Manager;
use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registra os controles "Animar Elementos Filhos" e injeta atributos no render.
 */
class Children_Animation_Controls {

	/** @var array Evita duplo processamento do before_render para o mesmo elemento. */
	private $rendered_ids = [];

	public function __construct() {
		// ── Widgets ───────────────────────────────────────────────────────────
		add_action(
			'elementor/element/common/section_effects/after_section_end',
			[ $this, 'add_controls' ],
			20, // priority 20 para ficar depois do text animation (10)
			2
		);

		// ── Section (layout element) ──────────────────────────────────────────
		add_action(
			'elementor/element/section/section_effects/after_section_end',
			[ $this, 'add_controls' ],
			10,
			2
		);

		// ── Column ────────────────────────────────────────────────────────────
		add_action(
			'elementor/element/column/section_effects/after_section_end',
			[ $this, 'add_controls' ],
			10,
			2
		);

		// ── Container (Flexbox Container — Elementor 3.16+) ───────────────────
		add_action(
			'elementor/element/container/section_effects/after_section_end',
			[ $this, 'add_controls' ],
			10,
			2
		);

		// ── Render attributes ─────────────────────────────────────────────────
		add_action(
			'elementor/frontend/element/before_render',
			[ $this, 'before_render' ]
		);
	}

	// ── Controles ─────────────────────────────────────────────────────────────

	/**
	 * Adiciona a seção "Animar Elementos Filhos" à aba Avançado.
	 *
	 * @param Element_Base $element  Instância do elemento.
	 * @param array        $args     Argumentos da seção.
	 */
	public function add_controls( Element_Base $element, array $args ): void {

		$element->start_controls_section(
			'pta_children_section',
			[
				'label' => esc_html__( '🎬 Animar Elementos Filhos (PTA)', 'pta' ),
				'tab'   => Controls_Manager::TAB_ADVANCED,
			]
		);

		// ── Habilitar ─────────────────────────────────────────────────────────
		$element->add_control(
			'pta_children_enable',
			[
				'label'        => esc_html__( 'Animar Elementos Filhos', 'pta' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Sim', 'pta' ),
				'label_off'    => esc_html__( 'Não', 'pta' ),
				'return_value' => 'yes',
				'default'      => '',
			]
		);

		// ── Tipo de animação ──────────────────────────────────────────────────
		$element->add_control(
			'pta_children_animation',
			[
				'label'     => esc_html__( 'Tipo de Animação', 'pta' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'fade-up',
				'options'   => [
					'fade-up'    => esc_html__( 'Fade Up',      'pta' ),
					'fade-down'  => esc_html__( 'Fade Down',    'pta' ),
					'fade-in'    => esc_html__( 'Fade In',      'pta' ),
					'slide-left' => esc_html__( 'Slide Esquerda', 'pta' ),
					'slide-right'=> esc_html__( 'Slide Direita',  'pta' ),
					'zoom-in'    => esc_html__( 'Zoom In',      'pta' ),
					'zoom-out'   => esc_html__( 'Zoom Out',     'pta' ),
					'flip-up'    => esc_html__( 'Flip Up',      'pta' ),
					'rotate-in'  => esc_html__( 'Rotate In',   'pta' ),
					'bounce-in'  => esc_html__( 'Bounce In',   'pta' ),
				],
				'condition' => [ 'pta_children_enable' => 'yes' ],
			]
		);

		// ── Seletor dos filhos ────────────────────────────────────────────────
		$element->add_control(
			'pta_children_selector',
			[
				'label'       => esc_html__( 'Seletor CSS dos Filhos', 'pta' ),
				'type'        => Controls_Manager::TEXT,
				'default'     => '.elementor-widget',
				'placeholder' => '.elementor-widget, .elementor-icon-list-item',
				'description' => esc_html__( 'Seletor CSS para identificar os elementos filhos a animar. Padrão: .elementor-widget', 'pta' ),
				'condition'   => [ 'pta_children_enable' => 'yes' ],
			]
		);

		// ── Duração ───────────────────────────────────────────────────────────
		$element->add_control(
			'pta_children_duration',
			[
				'label'     => esc_html__( 'Duração por filho (ms)', 'pta' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 3000,
						'step' => 50,
					],
				],
				'default'   => [ 'size' => 600 ],
				'condition' => [ 'pta_children_enable' => 'yes' ],
			]
		);

		// ── Delay inicial ─────────────────────────────────────────────────────
		$element->add_control(
			'pta_children_delay',
			[
				'label'     => esc_html__( 'Delay inicial (ms)', 'pta' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 3000,
						'step' => 50,
					],
				],
				'default'   => [ 'size' => 0 ],
				'condition' => [ 'pta_children_enable' => 'yes' ],
			]
		);

		// ── Delay entre filhos (stagger) ──────────────────────────────────────
		$element->add_control(
			'pta_children_stagger',
			[
				'label'     => esc_html__( 'Delay entre filhos (ms)', 'pta' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 1000,
						'step' => 10,
					],
				],
				'default'   => [ 'size' => 150 ],
				'condition' => [ 'pta_children_enable' => 'yes' ],
			]
		);

		// ── Gatilho ───────────────────────────────────────────────────────────
		$element->add_control(
			'pta_children_trigger',
			[
				'label'     => esc_html__( 'Disparar ao', 'pta' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'scroll',
				'options'   => [
					'scroll' => esc_html__( 'Entrar na viewport (scroll)', 'pta' ),
					'load'   => esc_html__( 'Carregar a página', 'pta' ),
				],
				'condition' => [ 'pta_children_enable' => 'yes' ],
			]
		);

		// ── Threshold ─────────────────────────────────────────────────────────
		$element->add_control(
			'pta_children_threshold',
			[
				'label'     => esc_html__( 'Visibilidade para disparar (%)', 'pta' ),
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
					'pta_children_enable'  => 'yes',
					'pta_children_trigger' => 'scroll',
				],
			]
		);

		// ── Repetir ───────────────────────────────────────────────────────────
		$element->add_control(
			'pta_children_replay',
			[
				'label'        => esc_html__( 'Repetir ao re-entrar na viewport', 'pta' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Sim', 'pta' ),
				'label_off'    => esc_html__( 'Não', 'pta' ),
				'return_value' => 'yes',
				'default'      => '',
				'condition'    => [
					'pta_children_enable'  => 'yes',
					'pta_children_trigger' => 'scroll',
				],
			]
		);

		$element->end_controls_section();
	}

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Injeta data-attributes no wrapper do elemento antes de renderizar.
	 *
	 * @param Element_Base $element  Instância do elemento.
	 */
	public function before_render( Element_Base $element ): void {

		// Evita processar o mesmo elemento duas vezes.
		$id = $element->get_id();
		if ( $id && isset( $this->rendered_ids[ $id ] ) ) {
			return;
		}
		if ( $id ) {
			$this->rendered_ids[ $id ] = true;
		}

		$settings = $element->get_settings_for_display();

		if ( empty( $settings['pta_children_enable'] ) || 'yes' !== $settings['pta_children_enable'] ) {
			return;
		}

		// Sanitize o seletor CSS (permite apenas caracteres válidos).
		$raw_selector = $settings['pta_children_selector'] ?? '.elementor-widget';
		$selector     = preg_replace( '/[^a-zA-Z0-9_\-\.\s,:#>+~\[\]=^$*|()]/', '', $raw_selector );
		$selector     = $selector ?: '.elementor-widget';

		$element->add_render_attribute(
			'_wrapper',
			[
				'data-ptac-enable'    => '1',
				'data-ptac-animation' => esc_attr( $settings['pta_children_animation'] ?? 'fade-up' ),
				'data-ptac-selector'  => esc_attr( $selector ),
				'data-ptac-duration'  => esc_attr( $settings['pta_children_duration']['size'] ?? 600 ),
				'data-ptac-delay'     => esc_attr( $settings['pta_children_delay']['size'] ?? 0 ),
				'data-ptac-stagger'   => esc_attr( $settings['pta_children_stagger']['size'] ?? 150 ),
				'data-ptac-trigger'   => esc_attr( $settings['pta_children_trigger'] ?? 'scroll' ),
				'data-ptac-threshold' => esc_attr( ( $settings['pta_children_threshold']['size'] ?? 15 ) / 100 ),
				'data-ptac-replay'    => ( 'yes' === ( $settings['pta_children_replay'] ?? '' ) ) ? '1' : '0',
			]
		);
	}
}
