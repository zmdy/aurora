<?php
/**
 * Glassmorphism Controls — efeito de vidro (blur + transparência) para
 * imagens e containers: background translúcido, backdrop-filter com
 * blur/saturação e borda sutil.
 *
 * Implementa apenas o que é específico deste módulo; o encanamento
 * comum (hooks, deduplicação, montagem da seção) vive em Animation_Module.
 *
 * Diferente dos demais módulos, este não depende de JS no frontend —
 * todo o efeito é resolvido em um único atributo `style` calculado em
 * PHP, já que blur/transparência/borda não precisam de animação nem de
 * leitura de DOM em tempo de execução.
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
 * Registra os controles de "Glassmorphism" e injeta o style no render.
 */
class Glassmorphism_Controls extends Animation_Module {

	/** Elementos onde este módulo aparece: imagens e containers. */
	const SUPPORTED_ELEMENTS = [ 'image', 'section', 'column', 'container' ];

	protected function get_section_id(): string {
		return 'aurora_glass_section';
	}

	protected function get_section_label(): string {
		return __( 'Glassmorphism', 'aurora-for-elementor' );
	}

	/**
	 * Só aparece no widget Image e nos elementos estruturais.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), self::SUPPORTED_ELEMENTS, true );
	}

	/**
	 * Precisa do hook "common" (widgets) além dos estruturais — applies_to_element()
	 * filtra para que a seção só apareça de fato no widget Image.
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 40 ],
			[ 'hook' => 'elementor/element/section/section_effects/after_section_end', 'priority' => 30 ],
			[ 'hook' => 'elementor/element/column/section_effects/after_section_end', 'priority' => 30 ],
			[ 'hook' => 'elementor/element/container/section_effects/after_section_end', 'priority' => 30 ],
		];
	}

	protected function get_render_hooks(): array {
		return [
			'elementor/frontend/element/before_render',
			'elementor/frontend/widget/before_render',
		];
	}

	// ── Controles ─────────────────────────────────────────────────────────────

	/**
	 * Campos da seção "Glassmorphism".
	 *
	 * @param Element_Base $element Instância do elemento.
	 */
	protected function register_fields( Element_Base $element ): void {

		// ── Habilitar ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_enable',
			[
				'label'              => esc_html__( 'Habilitar Glassmorphism', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'Sim', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'Não', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'frontend_available' => true,
			]
		);

		// ── Cor do vidro ──────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_tint',
			[
				'label'              => esc_html__( 'Cor do Vidro', 'aurora-for-elementor' ),
				'type'               => Controls_Manager::COLOR,
				'default'            => '#ffffff',
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Opacidade do fundo ────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_opacity',
			[
				'label'     => esc_html__( 'Opacidade do Fundo (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 18 ],
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Blur ──────────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_blur',
			[
				'label'     => esc_html__( 'Intensidade do Blur (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 40,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 12 ],
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Saturação ─────────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_saturate',
			[
				'label'     => esc_html__( 'Saturação (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 100,
						'max'  => 250,
						'step' => 5,
					],
				],
				'default'            => [ 'size' => 180 ],
				'description'        => esc_html__( 'Aumenta a saturação do que aparece atrás do vidro — efeito clássico de glassmorphism.', 'aurora-for-elementor' ),
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Opacidade da borda ────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_border_opacity',
			[
				'label'     => esc_html__( 'Opacidade da Borda (%)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 100,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 30 ],
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);

		// ── Raio da borda ─────────────────────────────────────────────────────
		$element->add_control(
			'aurora_glass_radius',
			[
				'label'     => esc_html__( 'Raio da Borda (px)', 'aurora-for-elementor' ),
				'type'      => Controls_Manager::SLIDER,
				'range'     => [
					'px' => [
						'min'  => 0,
						'max'  => 60,
						'step' => 1,
					],
				],
				'default'            => [ 'size' => 16 ],
				'condition'          => [ 'aurora_glass_enable' => 'yes' ],
				'frontend_available' => true,
			]
		);
	}

	// ── Render Attributes ─────────────────────────────────────────────────────

	/**
	 * Converte as configurações salvas em um único atributo `style` (mais a
	 * classe de apoio usada pelo fallback de @supports). Retorna array vazio
	 * quando o efeito está desabilitado.
	 *
	 * @param array             $settings Configurações do elemento.
	 * @param Element_Base|null $element  Não utilizado neste módulo.
	 * @return array<string, string>
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		if ( empty( $settings['aurora_glass_enable'] ) || 'yes' !== $settings['aurora_glass_enable'] ) {
			return [];
		}

		$tint = sanitize_hex_color( $settings['aurora_glass_tint'] ?? '#ffffff' );
		$tint = $tint ? $tint : '#ffffff';
		list( $r, $g, $b ) = $this->hex_to_rgb( $tint );

		$blur           = max( 0, min( 40, (int) ( $settings['aurora_glass_blur']['size'] ?? 12 ) ) );
		$bg_opacity      = max( 0, min( 100, (int) ( $settings['aurora_glass_opacity']['size'] ?? 18 ) ) ) / 100;
		$saturate       = max( 100, min( 250, (int) ( $settings['aurora_glass_saturate']['size'] ?? 180 ) ) );
		$border_opacity = max( 0, min( 100, (int) ( $settings['aurora_glass_border_opacity']['size'] ?? 30 ) ) ) / 100;
		$radius         = max( 0, min( 60, (int) ( $settings['aurora_glass_radius']['size'] ?? 16 ) ) );

		$filter = sprintf( 'blur(%dpx) saturate(%d%%)', $blur, $saturate );

		$style = sprintf(
			'background:rgba(%d,%d,%d,%s);backdrop-filter:%s;-webkit-backdrop-filter:%s;border:1px solid rgba(255,255,255,%s);border-radius:%dpx;',
			$r,
			$g,
			$b,
			$bg_opacity,
			$filter,
			$filter,
			$border_opacity,
			$radius
		);

		return [
			'class' => 'aurora-glass-active',
			'style' => esc_attr( $style ),
		];
	}

	/**
	 * Converte uma cor hex (#rgb ou #rrggbb) em [r, g, b]. Faz fallback
	 * para branco se a cor for inválida.
	 *
	 * @param string $hex Cor em formato hexadecimal.
	 * @return array{0:int, 1:int, 2:int}
	 */
	private function hex_to_rgb( string $hex ): array {
		$hex = ltrim( $hex, '#' );

		if ( 3 === strlen( $hex ) ) {
			$hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
		}

		if ( 6 !== strlen( $hex ) || ! ctype_xdigit( $hex ) ) {
			return [ 255, 255, 255 ];
		}

		return [
			hexdec( substr( $hex, 0, 2 ) ),
			hexdec( substr( $hex, 2, 2 ) ),
			hexdec( substr( $hex, 4, 2 ) ),
		];
	}
}
