<?php
/**
 * Animation_Module — classe base abstrata para os módulos de animação.
 *
 * Centraliza tudo que é comum a qualquer módulo Aurora: registro dos
 * hooks do Elementor, deduplicação do before_render por ID de elemento
 * e o fluxo de montagem da seção de controles na aba Avançado. Um novo
 * módulo só precisa estender esta classe e implementar os 4 métodos
 * abstratos abaixo — todo o "encanamento" já está pronto aqui.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

abstract class Animation_Module {

	/** @var array Evita duplo processamento do before_render para o mesmo elemento. */
	private $rendered_ids = [];

	public function __construct() {

		foreach ( $this->get_controls_hooks() as $hook ) {
			add_action(
				$hook['hook'],
				[ $this, 'add_controls' ],
				$hook['priority'] ?? 10,
				2
			);
		}

		foreach ( $this->get_render_hooks() as $hook ) {
			add_action( $hook, [ $this, 'before_render' ] );
		}
	}

	// ── Contrato do módulo ──────────────────────────────────────────────────────

	/**
	 * ID único da seção de controles (primeiro argumento de start_controls_section).
	 */
	abstract protected function get_section_id(): string;

	/**
	 * Rótulo exibido no painel Avançado do Elementor (já traduzido, sem escape).
	 */
	abstract protected function get_section_label(): string;

	/**
	 * Registra os add_control() específicos do módulo. Não precisa chamar
	 * start_controls_section()/end_controls_section() — isso já é feito
	 * por add_controls() abaixo.
	 *
	 * @param Element_Base $element Instância do elemento.
	 */
	abstract protected function register_fields( Element_Base $element ): void;

	/**
	 * Converte as configurações salvas (get_settings_for_display) nos
	 * data-attributes a serem injetados no wrapper. Deve retornar um
	 * array vazio quando o módulo estiver desabilitado para o elemento.
	 *
	 * @param array $settings Configurações do elemento.
	 * @return array<string, string> Mapa de data-attributes.
	 */
	abstract protected function get_render_attributes( array $settings ): array;

	// ── Hooks (sobrescrevíveis) ──────────────────────────────────────────────────

	/**
	 * Hooks do Elementor usados para injetar a seção de controles, com
	 * prioridade opcional. Por padrão, a seção aparece só na aba Avançado
	 * dos widgets — módulos que também atuam em section/column/container
	 * devem sobrescrever este método.
	 *
	 * @return array<int, array{hook: string, priority?: int}>
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 10 ],
		];
	}

	/**
	 * Hooks do Elementor usados para injetar os data-attributes no
	 * wrapper antes da renderização.
	 *
	 * @return string[]
	 */
	protected function get_render_hooks(): array {
		return [ 'elementor/frontend/element/before_render' ];
	}

	// ── Encanamento comum ────────────────────────────────────────────────────────

	/**
	 * Monta a seção de controles na aba Avançado.
	 *
	 * @param Element_Base $element Instância do elemento.
	 * @param array        $args    Argumentos da seção (não utilizados aqui).
	 */
	final public function add_controls( Element_Base $element, array $args ): void {

		$element->start_controls_section(
			$this->get_section_id(),
			[
				'label' => esc_html( $this->get_section_label() ),
				'tab'   => Controls_Manager::TAB_ADVANCED,
			]
		);

		$this->register_fields( $element );

		$element->end_controls_section();
	}

	/**
	 * Injeta os data-attributes do módulo no wrapper, uma única vez por
	 * elemento, e só quando o módulo estiver habilitado para ele.
	 *
	 * @param Element_Base $element Instância do elemento.
	 */
	final public function before_render( Element_Base $element ): void {

		// Evita processar o mesmo elemento duas vezes (múltiplos hooks podem disparar).
		$id = $element->get_id();
		if ( $id && isset( $this->rendered_ids[ $id ] ) ) {
			return;
		}
		if ( $id ) {
			$this->rendered_ids[ $id ] = true;
		}

		$settings   = $element->get_settings_for_display();
		$attributes = $this->get_render_attributes( $settings );

		if ( empty( $attributes ) ) {
			return;
		}

		$element->add_render_attribute( '_wrapper', $attributes );
	}
}
