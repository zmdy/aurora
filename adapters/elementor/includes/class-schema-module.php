<?php
/**
 * Schema_Module — an Animation_Module whose Elementor controls and
 * data-attributes are generated from an Aurora module schema.
 *
 * The schema (includes/generated/schemas.php) is produced from the JS
 * modules, so a new option added to a module appears here without editing PHP.
 * Subclasses only describe what is specific to Elementor: which elements the
 * module applies to, the controls the schema cannot express, and the
 * selectors that map Elementor's DOM onto the module's options.
 *
 * On the frontend the module is configured through two attributes on the
 * element wrapper, both read by the Aurora runtime itself:
 *
 *   data-aurora-<module>="<primary option>"
 *   data-aurora-<module>-options='{"option":"value", ...}'
 *
 * No Elementor-specific JavaScript is needed there. The editor, which
 * re-renders elements in the browser, uses elementor-adapter.js.
 *
 * @package Aurora
 */

namespace Aurora;

use Elementor\Controls_Manager;
use Elementor\Element_Base;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Schema_Module extends Animation_Module {

	/** @var string Module name as registered in JS ("text", "children", ...). */
	protected $key;

	/** @var array Schema of the module: [ 'primary' => ?string, 'options' => [...] ]. */
	protected $schema;

	/** @var array Module definition from Module_Manager. */
	protected $config;

	public function __construct( string $key, array $schema, array $config ) {
		$this->key    = $key;
		$this->schema = $schema;
		$this->config = $config;

		// Must run last: the parent constructor already calls get_controls_hooks().
		parent::__construct();
	}

	// ── Naming ────────────────────────────────────────────────────────────

	/** "morph-card" => "morph_card". */
	protected function slug(): string {
		return str_replace( '-', '_', $this->key );
	}

	/** "hoverPreset" => "hover_preset". */
	public static function snake( string $name ): string {
		return strtolower( preg_replace( '/([a-z0-9])([A-Z])/', '$1_$2', $name ) );
	}

	/** "hoverPreset" => "hover-preset". */
	public static function kebab( string $name ): string {
		return str_replace( '_', '-', self::snake( $name ) );
	}

	/** Elementor control id of an option. */
	public function control_id( string $option ): string {
		return 'aurora_' . $this->slug() . '_' . self::snake( $option );
	}

	protected function enable_id(): string {
		return 'aurora_' . $this->slug() . '_enable';
	}

	// ── Animation_Module contract ─────────────────────────────────────────

	protected function get_section_id(): string {
		return 'aurora_' . $this->slug() . '_section';
	}

	protected function get_section_label(): string {
		return $this->config['label'];
	}

	protected function applies_to_element( Element_Base $element ): bool {
		return in_array( $element->get_name(), $this->config['elements'], true );
	}

	/**
	 * Each targeted WIDGET is reached through its own last control section,
	 * because Elementor has no per-widget hook that fires after the shared
	 * common Advanced sections: `{widget}/_section_responsive` never fires
	 * (the responsive section lives on the shared `common` stack and fires
	 * only as `common/_section_responsive`, with the pseudo-name "common").
	 * Hooking `common` would place the panel on EVERY widget and its callback
	 * can't tell which widget it is, so applies_to_element() could never scope
	 * it to this module's targets. A widget's own section instead fires with
	 * the real widget name, which applies_to_element() matches — so the panel
	 * shows up only on the module's targeted widgets.
	 *
	 * Structural elements (section, column, container) are absent here and fall
	 * back to `_section_responsive`, keeping their panel at the bottom of the
	 * Advanced tab. Widget panels land after the widget's own controls (above
	 * the common sections) — the only placement Elementor allows for a
	 * widget-scoped hook.
	 *
	 * @var array<string, string> Widget name => its last own control section.
	 */
	const WIDGET_ANCHORS = [
		'heading'       => 'section_title_style',
		'text-editor'   => 'section_style',
		'button'        => 'section_style',
		'icon'          => 'section_style_icon',
		'icon-box'      => 'section_style_content',
		'image-box'     => 'section_style_content',
		'image'         => 'section_style_image',
		'testimonial'   => 'section_style_testimonial_job',
		'icon-list'     => 'section_text_style',
		'alert'         => 'section_dismiss_icon',
		'image-gallery' => 'section_caption',
	];

	protected function get_controls_hooks(): array {
		$priority = $this->config['priority'] ?? 10;
		$hooks    = [];
		foreach ( $this->config['elements'] as $element ) {
			$section = self::WIDGET_ANCHORS[ $element ] ?? '_section_responsive';
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

	// ── Options managed by the adapter ────────────────────────────────────

	/**
	 * Options the adapter derives from the element type instead of showing
	 * a control (for example selectors that depend on Elementor's markup).
	 *
	 * @return string[]
	 */
	protected function managed_options(): array {
		return [];
	}

	/**
	 * Controls added before the schema controls.
	 *
	 * @param Element_Base $element Element instance.
	 */
	protected function register_leading_fields( Element_Base $element ): void {}

	/**
	 * Options derived from the element, merged over the ones read from controls.
	 *
	 * @param array             $settings Element settings.
	 * @param Element_Base|null $element  Element instance.
	 * @return array<string, mixed>
	 */
	protected function derived_options( array $settings, ?Element_Base $element ): array {
		return [];
	}

	/**
	 * Overrides how a setting is read into an option value.
	 *
	 * @param string $option   Option name.
	 * @param array  $settings Element settings.
	 * @return mixed|null Null lets the generic reader handle it.
	 */
	protected function read_special( string $option, array $settings ) {
		return null;
	}

	// ── Controls ──────────────────────────────────────────────────────────

	protected function register_fields( Element_Base $element ): void {

		$element->add_control(
			$this->enable_id(),
			[
				'label'              => esc_html( $this->config['label'] ),
				'type'               => Controls_Manager::SWITCHER,
				'label_on'           => esc_html__( 'On', 'aurora-for-elementor' ),
				'label_off'          => esc_html__( 'Off', 'aurora-for-elementor' ),
				'return_value'       => 'yes',
				'default'            => '',
				'render_type'        => 'template',
				// The editor adapter reads settings through the frontend handler's
				// getElementSettings(), which only exposes frontend_available
				// controls — without this every Aurora option is undefined there
				// and the live preview never runs.
				'frontend_available' => true,
			]
		);

		$this->register_leading_fields( $element );

		$group = null;
		foreach ( $this->schema['options'] as $name => $spec ) {
			if ( in_array( $name, $this->managed_options(), true ) ) {
				continue;
			}

			if ( ( $spec['group'] ?? null ) !== $group ) {
				$group = $spec['group'] ?? null;
				if ( $group ) {
					$element->add_control(
						$this->control_id( '_group_' . $group ),
						[
							'label'     => esc_html( $group ),
							'type'      => Controls_Manager::HEADING,
							'separator' => 'before',
							'condition' => [ $this->enable_id() => 'yes' ],
						]
					);
				}
			}

			$args = $this->control_args( $name, $spec );
			if ( $args ) {
				$element->add_control( $this->control_id( $name ), $args );
			}
		}
	}

	/**
	 * Builds the Elementor control arguments for one option.
	 *
	 * @param string $name Option name.
	 * @param array  $spec Option schema.
	 * @return array|null Null skips the option.
	 */
	protected function control_args( string $name, array $spec ): ?array {

		$args = [
			'label'              => esc_html( $spec['label'] ?? $name ),
			'description'        => isset( $spec['description'] ) ? esc_html( $spec['description'] ) : '',
			'condition'          => $this->conditions( $spec ),
			'render_type'        => 'template',
			// Exposed to the editor adapter via getElementSettings() (see the
			// enable control above for why this is required).
			'frontend_available' => true,
		];

		switch ( $spec['type'] ) {
			case 'boolean':
				$args['type']         = Controls_Manager::SWITCHER;
				$args['return_value'] = 'yes';
				$args['default']      = ! empty( $spec['default'] ) ? 'yes' : '';
				break;

			case 'number':
				$args['type']    = Controls_Manager::NUMBER;
				$args['default'] = $spec['default'];
				if ( isset( $spec['min'] ) ) {
					$args['min'] = $spec['min'];
				}
				if ( isset( $spec['max'] ) ) {
					$args['max'] = $spec['max'];
				}
				$args['step'] = $spec['step'] ?? ( ( isset( $spec['default'] ) && floor( $spec['default'] ) !== (float) $spec['default'] ) ? 0.01 : 1 );
				if ( ! empty( $spec['unit'] ) ) {
					$args['label'] .= ' (' . $spec['unit'] . ')';
				}
				break;

			case 'enum':
				$args['type']    = Controls_Manager::SELECT;
				$args['default'] = $spec['default'];
				$args['options'] = [];
				foreach ( $spec['values'] as $value ) {
					// Values are either plain strings or { value, label } pairs.
					if ( is_array( $value ) ) {
						$args['options'][ $value['value'] ] = esc_html( $value['label'] ?? $value['value'] );
					} else {
						$args['options'][ $value ] = esc_html( ucfirst( str_replace( '-', ' ', (string) $value ) ) );
					}
				}
				break;

			case 'color':
				$args['type']    = Controls_Manager::COLOR;
				$args['default'] = $spec['default'];
				break;

			case 'json':
				$args['type']    = Controls_Manager::TEXTAREA;
				$args['rows']    = 5;
				$args['default'] = wp_json_encode( $spec['default'] );
				break;

			case 'selector':
			case 'string':
			case 'list':
			default:
				$args['type']    = Controls_Manager::TEXT;
				$args['default'] = is_array( $spec['default'] ) ? implode( ';', $spec['default'] ) : (string) $spec['default'];
				break;
		}

		return $args;
	}

	/**
	 * Converts a schema `when` hint into an Elementor condition. The module
	 * switch always has to be on.
	 *
	 * @param array $spec Option schema.
	 * @return array<string, mixed>
	 */
	protected function conditions( array $spec ): array {
		$conditions = [ $this->enable_id() => 'yes' ];

		foreach ( ( $spec['when'] ?? [] ) as $option => $expected ) {
			if ( in_array( $option, $this->managed_options(), true ) ) {
				continue;
			}
			$other = $this->schema['options'][ $option ] ?? null;
			if ( ! $other ) {
				continue;
			}
			$key = $this->control_id( $option );

			if ( 'boolean' === $other['type'] ) {
				$conditions[ $key ] = $expected ? 'yes' : '';
			} else {
				$conditions[ $key ] = $expected;
			}
		}

		return $conditions;
	}

	// ── Rendering ─────────────────────────────────────────────────────────

	protected function get_render_attributes( array $settings, ?Element_Base $element = null ): array {

		if ( 'yes' !== ( $settings[ $this->enable_id() ] ?? '' ) ) {
			return [];
		}

		Asset_Manager::need( $this->key );

		$options = $this->collect_options( $settings, $element );
		$primary = $this->schema['primary'] ?? null;

		$attributes = [
			'data-aurora-' . $this->key => $primary && isset( $options[ $primary ] ) ? (string) $options[ $primary ] : '',
		];
		if ( $primary ) {
			unset( $options[ $primary ] );
		}
		if ( $options ) {
			$attributes[ 'data-aurora-' . $this->key . '-options' ] = wp_json_encode( $options );
		}

		return $attributes;
	}

	/**
	 * Options that differ from their default, read from the element settings,
	 * plus the ones the adapter derives from the element type. The primary
	 * option is always included.
	 *
	 * @param array             $settings Element settings.
	 * @param Element_Base|null $element  Element instance.
	 * @return array<string, mixed>
	 */
	public function collect_options( array $settings, ?Element_Base $element = null ): array {
		$options = [];
		$primary = $this->schema['primary'] ?? null;

		foreach ( $this->schema['options'] as $name => $spec ) {
			if ( in_array( $name, $this->managed_options(), true ) ) {
				continue;
			}

			$value = $this->read_special( $name, $settings );
			if ( null === $value ) {
				$value = $this->read_setting( $name, $spec, $settings );
			}
			if ( null === $value ) {
				continue;
			}

			if ( $name === $primary || $value !== ( $spec['default'] ?? null ) ) {
				$options[ $name ] = $value;
			}
		}

		return array_merge( $options, $this->derived_options( $settings, $element ) );
	}

	/**
	 * Reads one option from the settings and casts it to the schema type.
	 *
	 * @param string $name     Option name.
	 * @param array  $spec     Option schema.
	 * @param array  $settings Element settings.
	 * @return mixed|null Null when the setting is absent or unusable.
	 */
	protected function read_setting( string $name, array $spec, array $settings ) {
		$id = $this->control_id( $name );
		if ( ! array_key_exists( $id, $settings ) ) {
			return null;
		}
		$raw = $settings[ $id ];

		switch ( $spec['type'] ) {
			case 'boolean':
				return 'yes' === $raw;

			case 'number':
				if ( '' === $raw || ! is_numeric( $raw ) ) {
					return null;
				}
				$number = $raw + 0;
				return is_float( $number ) && floor( $number ) === $number ? (int) $number : $number;

			case 'json':
				$decoded = is_string( $raw ) ? json_decode( $raw, true ) : $raw;
				return null === $decoded ? null : $decoded;

			default:
				return is_scalar( $raw ) ? (string) $raw : null;
		}
	}
}
