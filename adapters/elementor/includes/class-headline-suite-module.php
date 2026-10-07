<?php
/**
 * Animated Headline: one Elementor tool over three Aurora modules.
 *
 * Aurora keeps rotating phrases, highlight shapes and counters as three
 * separate modules — they are three scripts, and a page that only draws a
 * marker should not pay for the other two. In Elementor they are one panel:
 * they are the same feature to the person using it, they come from the same
 * component library, and two of them are commonly used on the same heading
 * (a phrase that rotates with a marker drawn under it).
 *
 * So this suite owns the section and the render pass, and each effect is the
 * ordinary module built as a `part`: same generated controls, same
 * data-attributes, no hooks of its own.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Headline_Suite_Module extends Animation_Module {

	/** @var array<string, Schema_Module> Effect key => the module behind it. */
	private $parts = [];

	/** @var array Suite definition from Module_Manager. */
	private $config;

	/** @var string Suite key, as registered in Module_Manager. */
	private $key;

	/**
	 * @param string $key    Suite key, which is also the key of its own module.
	 * @param array  $schema Generated schema of that module (used by the part).
	 * @param array  $config Suite definition from Module_Manager.
	 */
	public function __construct( string $key, array $schema, array $config ) {
		$this->key    = $key;
		$this->config = $config;

		$schemas = Module_Manager::schemas();
		foreach ( $config['parts'] as $part => $definition ) {
			if ( empty( $schemas[ $part ] ) ) {
				continue;
			}
			$class                = $definition['class'];
			$this->parts[ $part ] = $class::part( $part, $schemas[ $part ], $definition );
		}

		// Must run last: the parent constructor already calls get_controls_hooks().
		parent::__construct();
	}

	/** @return string[] Runtime module keys this tool can switch on. */
	public function part_keys(): array {
		return array_keys( $this->parts );
	}

	// ── Animation_Module contract ─────────────────────────────────────────

	protected function get_section_id(): string {
		return 'aurora_' . str_replace( '-', '_', $this->key ) . '_section';
	}

	protected function get_section_label(): string {
		return $this->config['label'];
	}

	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), $this->config['elements'], true );
	}

	/**
	 * Same placement rule as a single module's panel — see the long note on
	 * Schema_Module::WIDGET_ANCHORS for why each widget is reached through its
	 * own last section rather than the shared `common` stack.
	 */
	protected function get_controls_hooks(): array {
		$priority = $this->config['priority'] ?? 10;
		$hooks    = [];
		foreach ( $this->config['elements'] as $element ) {
			$section = Schema_Module::WIDGET_ANCHORS[ $element ] ?? '_section_responsive';
			$hooks[] = [
				'hook'     => 'elementor/element/' . $element . '/' . $section . '/after_section_end',
				'priority' => $priority,
			];
		}
		return $hooks;
	}

	protected function get_render_hooks(): array {
		return [
			'elementor/frontend/before_render',
			'elementor/frontend/widget/before_render',
		];
	}

	// ── Panel and rendering ───────────────────────────────────────────────

	/**
	 * Each effect contributes its own switch and controls. An effect that does
	 * not apply to this element is left out: the counter has nothing to count
	 * on a testimonial, where a marker still makes sense.
	 */
	protected function register_fields( Element_Base $element ): void {
		foreach ( $this->parts as $part ) {
			if ( $part->handles( $element ) ) {
				$part->fields( $element );
			}
		}
	}

	/**
	 * The effects are independent, so a heading can rotate its phrases and
	 * carry a marker at once; each writes its own pair of data-attributes.
	 */
	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {
		$attributes = [];
		foreach ( $this->parts as $part ) {
			if ( $element && ! $part->handles( $element ) ) {
				continue;
			}
			$attributes = array_merge( $attributes, $part->attributes( $settings, $element ) );
		}
		return $attributes;
	}
}
