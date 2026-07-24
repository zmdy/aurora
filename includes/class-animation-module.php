<?php
/**
 * Animation_Module — abstract base class for the animation modules.
 *
 * Centralizes everything that's common to any Aurora module: registering
 * Elementor hooks, deduplicating before_render per element ID, and the
 * flow for assembling the controls section in the Advanced tab. A new
 * module only needs to extend this class and implement the 4 abstract
 * methods below — all the "plumbing" is already handled here.
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

	/** @var array Prevents double-processing before_render for the same element. */
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

	// ── Module contract ──────────────────────────────────────────────────────

	/**
	 * Unique ID of the controls section (first argument of start_controls_section).
	 */
	abstract protected function get_section_id(): string;

	/**
	 * Label shown in the Elementor Advanced panel (already translated, unescaped).
	 */
	abstract protected function get_section_label(): string;

	/**
	 * Registers the module-specific add_control() calls. No need to call
	 * start_controls_section()/end_controls_section() — that's already
	 * handled by add_controls() below.
	 *
	 * @param Element_Base $element Element instance.
	 */
	abstract protected function register_fields( Element_Base $element ): void;

	/**
	 * Converts the saved settings (get_settings_for_display) into the
	 * data-attributes to be injected into the wrapper. Must return an
	 * empty array when the module is disabled for the element.
	 *
	 * The second parameter is optional (doesn't need to be used) — but PHP
	 * requires every class overriding this method to declare the SAME full
	 * signature (same number of parameters), even if only to ignore it;
	 * omitting the parameter causes a Fatal error of "Declaration must be
	 * compatible". Modules that behave differently depending on the element
	 * type (e.g. background on containers vs. text on widgets) can use it
	 * to inspect $element->get_name().
	 *
	 * @param array             $settings Element settings.
	 * @param Element_Base|null $element  Element instance (optional).
	 * @return array<string, string> Map of data-attributes.
	 */
	abstract protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array;

	// ── Hooks (overridable) ──────────────────────────────────────────────────

	/**
	 * Elementor hooks used to inject the controls section, with an
	 * optional priority. By default, the section only appears in the
	 * Advanced tab of widgets — modules that also act on
	 * section/column/container must override this method.
	 *
	 * @return array<int, array{hook: string, priority?: int}>
	 */
	protected function get_controls_hooks(): array {
		return [
			[ 'hook' => 'elementor/element/common/section_effects/after_section_end', 'priority' => 10 ],
		];
	}

	/**
	 * Elementor hooks used to inject the data-attributes into the
	 * wrapper before rendering.
	 *
	 * @return string[]
	 */
	protected function get_render_hooks(): array {
		return [ 'elementor/frontend/element/before_render' ];
	}

	/**
	 * Lets a module appear only on certain element types (e.g. only on
	 * section/column/container/heading/text-editor). By default, the
	 * module appears on any element that triggers one of the hooks from
	 * get_controls_hooks() — same behavior as before this check existed.
	 *
	 * @param Element_Base $element Element instance.
	 */
	protected function applies_to_element( Element_Base $element ): bool {
		return true;
	}

	// ── Shared plumbing ────────────────────────────────────────────────────────

	/**
	 * Assembles the controls section in the Advanced tab — but only for
	 * elements where applies_to_element() returns true.
	 *
	 * @param Element_Base $element Element instance.
	 * @param array        $args    Section arguments (unused here).
	 */
	final public function add_controls( Element_Base $element, array $args ): void {

		if ( ! $this->applies_to_element( $element ) ) {
			return;
		}

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
	 * Injects the module's data-attributes into the wrapper, only once per
	 * element, and only when the module is enabled for it.
	 *
	 * Also re-checks applies_to_element() here, not just in add_controls().
	 * A module's applies_to_element() rule can change between plugin
	 * versions (e.g. a module gets scoped away from structural elements);
	 * without this check, an element that still has a stale "enabled"
	 * setting saved from before that change would keep rendering the
	 * module's attributes on the frontend even though its controls no
	 * longer appear in the editor panel for that element type.
	 *
	 * @param Element_Base $element Element instance.
	 */
	final public function before_render( Element_Base $element ): void {

		if ( ! $this->applies_to_element( $element ) ) {
			return;
		}

		// Prevents processing the same element twice (multiple hooks can fire).
		$id = $element->get_id();
		if ( $id && isset( $this->rendered_ids[ $id ] ) ) {
			return;
		}
		if ( $id ) {
			// Cap at 200 entries to avoid unbounded growth inside Elementor Loop templates.
			if ( count( $this->rendered_ids ) >= 200 ) {
				$this->rendered_ids = [];
			}
			$this->rendered_ids[ $id ] = true;
		}

		$settings   = $element->get_settings_for_display();
		$attributes = $this->get_render_attributes( $settings, $element );

		if ( empty( $attributes ) ) {
			return;
		}

		$element->add_render_attribute( '_wrapper', $attributes );
	}
}
