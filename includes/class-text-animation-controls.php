<?php
/**
 * Text Animation Controls — injeta controles na aba Avançado de todos
 * os widgets do Elementor e adiciona os data-attributes no frontend.
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
 * Registra os controles de animação de texto e injeta atributos no render.
 */
class Text_Animation_Controls {

	/** @var array Evita duplo processamento do before_render para o mesmo elemento. */
	private $rendered_ids = [];

	public function __construct() {
		// ── Adiciona seção de controles na aba Avançado (widgets) ─────────────
		add_action(
			'elementor/element/common/section_effects/after_section_end',
			[ $this, 'add_controls' ],
			10,
			2
		);

		// ── Injeta data-* no wrapper — hook genérico (sections, containers) ───
		add_action(
			'elementor/frontend/element/before_render',
			[ $this, 'before_render' ]
		);

		// ── Injeta data-* no wrapper — hook específico de widgets ─────────────
		// Necessário em versões do Elementor onde element/before_render não
		// é disparado para widgets durante a renderização no frontend.
		add_action(
			'elementor/frontend/widget/before_render',
			[ $this, 'before_render' ]
		);
	}

	// ── Controles ─────────────────────────────────────────────────────────────

	/**
	 * Adiciona a seção "Animação de Texto" à aba Avançado.
	 *
	 * @param Element_Base $element  Instância do elemento.
	 * @param array        $args     Argumentos da seção.
	 */
	public function add_controls( Element_Base $element, array $args ): void {

		$element->start_controls_section(
			'pta_text_section',
			[
				'label' => esc_html__( '✨ Animação de Texto (PTA)', 'pta' ),
				'tab'   => Controls_Manager::TAB_ADVANCED,
			]
		);

		// ── Habilitar ─────────────────────────────────────────────────────────
		$element->add_control(
			'pta_text_enable',
			[
				'label'              => esc_html__( 'Habilitar Animação de Texto', 'pta' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Sim', 'pta' ),
				'label_off'          => esc_html__( 'Não', 'pta' ),
				'return_value'       => 'yes',
				'default'            => '',
				'frontend_available' => true,
			]
		);

		// ── Biblioteca ────────────────────────────────────────────────────────
		$element->add_control(
			'pta_text_library',
			[
				'label'              => esc_html__( 'Biblioteca', 'pta' ),
				'type'               => Controls_Manager::SELECT,
				'default'            => 'gsap',
				'options'            => [
					'gsap'    => esc_html__( 'GSAP', 'pta' ),
					'animejs' => esc_html__( 'Anime.js', 'pta' ),
				],
				'condition'          => [ 'pta_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Tipo de Animação — GSAP ───────────────────────────────────────────
		$element->add_control(
			'pta_text_animation_gsap',
			[
				'label'     => esc_html__( 'Tipo de Animação', 'pta' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'gs-1',
				'options'   => [
					'gs-1'  => esc_html__( 'Fade Up',         'pta' ),
					'gs-2'  => esc_html__( 'Clip Reveal',     'pta' ),
					'gs-3'  => esc_html__( 'Scramble Text',   'pta' ),
					'gs-4'  => esc_html__( 'Elastic Bounce',  'pta' ),
					'gs-5'  => esc_html__( '3D Flip',         'pta' ),
					'gs-6'  => esc_html__( 'Slide In',        'pta' ),
					'gs-7'  => esc_html__( 'Scale Up',        'pta' ),
					'gs-8'  => esc_html__( 'Wave',            'pta' ),
					'gs-9'  => esc_html__( 'Bounce Drop',     'pta' ),
					'gs-10' => esc_html__( 'Glitch',          'pta' ),
				],
				'condition' => [
					'pta_text_enable'  => 'yes',
					'pta_text_library' => 'gsap',
				],
				'frontend_available' => true,
			]
		);

		// ── Tipo de Animação — Anime.js ───────────────────────────────────────
		$element->add_control(
			'pta_text_animation_anime',
			[
				'label'     => esc_html__( 'Tipo de Animação', 'pta' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'ml-1',
				'options'   => [
					'ml-1'  => esc_html__( 'Float Up',       'pta' ),
					'ml-2'  => esc_html__( 'Scale In',       'pta' ),
					'ml-3'  => esc_html__( 'Drop Down',      'pta' ),
					'ml-4'  => esc_html__( 'Slide From Right', 'pta' ),
					'ml-5'  => esc_html__( 'Wave',           'pta' ),
					'ml-6'  => esc_html__( 'Flip X',         'pta' ),
					'ml-7'  => esc_html__( 'Typewriter',     'pta' ),
					'ml-8'  => esc_html__( 'Blur Reveal',    'pta' ),
					'ml-9'  => esc_html__( 'Skew In',        'pta' ),
					'ml-10' => esc_html__( 'Explosion',      'pta' ),
					'ml-11' => esc_html__( 'Split Nativo (Letras)', 'pta' ),
					'ml-12' => esc_html__( 'Clip Wrap (Palavras)',  'pta' ),
					'ml-13' => esc_html__( 'Clone Eco (Letras)',    'pta' ),
					'ml-14' => esc_html__( 'Scramble Nativo',       'pta' ),
				],
				'condition' => [
					'pta_text_enable'  => 'yes',
					'pta_text_library' => 'animejs',
				],
				'frontend_available' => true,
			]
		);

		// ── Dividir por ───────────────────────────────────────────────────────
		$element->add_control(
			'pta_text_split_by',
			[
				'label'     => esc_html__( 'Dividir por', 'pta' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'chars',
				'options'   => [
					'chars' => esc_html__( 'Letras', 'pta' ),
					'words' => esc_html__( 'Palavras', 'pta' ),
					'lines' => esc_html__( 'Linhas', 'pta' ),
				],
				'condition' => [
					'pta_text_enable'       => 'yes',
					'pta_text_animation_gsap!' => 'gs-3', // Scramble ignora split
				],
				'frontend_available' => true,
			]
		);

		// ── Duração ───────────────────────────────────────────────────────────
		$element->add_control(
			'pta_text_duration',
			[
				'label'      => esc_html__( 'Duração (ms)', 'pta' ),
				'type'       => Controls_Manager::SLIDER,
				'range'      => [
					'px' => [
						'min'  => 100,
						'max'  => 4000,
						'step' => 50,
					],
				],
				'default'    => [ 'size' => 800 ],
				'condition'  => [ 'pta_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Delay inicial ─────────────────────────────────────────────────────
		$element->add_control(
			'pta_text_delay',
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
				'condition' => [ 'pta_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Delay entre unidades (stagger) ────────────────────────────────────
		$element->add_control(
			'pta_text_stagger',
			[
				'label'     => esc_html__( 'Delay entre unidades (ms)', 'pta' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 500,
						'step' => 5,
					],
				],
				'default'   => [ 'size' => 30 ],
				'condition' => [
					'pta_text_enable'       => 'yes',
					'pta_text_animation_gsap!' => 'gs-3',
				],
				'frontend_available' => true,
			]
		);

		// ── Gatilho ───────────────────────────────────────────────────────────
		$element->add_control(
			'pta_text_trigger',
			[
				'label'     => esc_html__( 'Disparar ao', 'pta' ),
				'type'      => Controls_Manager::SELECT,
				'default'   => 'scroll',
				'options'   => [
					'scroll' => esc_html__( 'Entrar na viewport (scroll)', 'pta' ),
					'load'   => esc_html__( 'Carregar a página', 'pta' ),
				],
				'condition' => [ 'pta_text_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Threshold ─────────────────────────────────────────────────────────
		$element->add_control(
			'pta_text_threshold',
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
				'default'   => [ 'size' => 20 ],
				'condition' => [
					'pta_text_enable'   => 'yes',
					'pta_text_trigger'  => 'scroll',
				],
				'frontend_available' => true,
			]
		);

		// ── Repetir ───────────────────────────────────────────────────────────
		$element->add_control(
			'pta_text_replay',
			[
				'label'        => esc_html__( 'Repetir ao re-entrar na viewport', 'pta' ),
				'type'         => Controls_Manager::SWITCHER,
				'label_on'     => esc_html__( 'Sim', 'pta' ),
				'label_off'    => esc_html__( 'Não', 'pta' ),
				'return_value' => 'yes',
				'default'      => '',
				'condition'    => [
					'pta_text_enable'  => 'yes',
					'pta_text_trigger' => 'scroll',
				],
				'frontend_available' => true,
			]
		);

		$element->end_controls_section();
	}

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Injeta data-attributes no wrapper do widget antes de renderizar.
	 *
	 * @param Element_Base $element  Instância do elemento.
	 */
	public function before_render( Element_Base $element ): void {

		// Evita processar o mesmo elemento duas vezes (ambos os hooks podem disparar).
		$id = $element->get_id();
		if ( $id && isset( $this->rendered_ids[ $id ] ) ) {
			return;
		}
		if ( $id ) {
			$this->rendered_ids[ $id ] = true;
		}

		$settings = $element->get_settings_for_display();

		if ( empty( $settings['pta_text_enable'] ) || 'yes' !== $settings['pta_text_enable'] ) {
			return;
		}

		$library   = $settings['pta_text_library'] ?? 'gsap';
		$animation = 'gsap' === $library
			? ( $settings['pta_text_animation_gsap'] ?? 'gs-1' )
			: ( $settings['pta_text_animation_anime'] ?? 'ml-1' );

		$element->add_render_attribute(
			'_wrapper',
			[
				'data-pta-enable'    => '1',
				'data-pta-library'   => esc_attr( $library ),
				'data-pta-animation' => esc_attr( $animation ),
				'data-pta-split-by'  => esc_attr( $settings['pta_text_split_by'] ?? 'chars' ),
				'data-pta-duration'  => esc_attr( $settings['pta_text_duration']['size'] ?? 800 ),
				'data-pta-delay'     => esc_attr( $settings['pta_text_delay']['size'] ?? 0 ),
				'data-pta-stagger'   => esc_attr( $settings['pta_text_stagger']['size'] ?? 30 ),
				'data-pta-trigger'   => esc_attr( $settings['pta_text_trigger'] ?? 'scroll' ),
				'data-pta-threshold' => esc_attr( ( $settings['pta_text_threshold']['size'] ?? 20 ) / 100 ),
				'data-pta-replay'    => ( 'yes' === ( $settings['pta_text_replay'] ?? '' ) ) ? '1' : '0',
			]
		);
	}
}
