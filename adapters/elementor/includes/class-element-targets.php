<?php
/**
 * Element_Targets — maps Elementor's markup onto module options.
 *
 * The Aurora modules are builder-agnostic: they take CSS selectors for the
 * text node, the children or the icons they should act on. Everything that
 * depends on how Elementor renders its elements lives here, in one place,
 * shared by the PHP renderer and (through export()) the editor script.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Element_Targets {

	/** Text node per widget, in priority order. */
	const TEXT = [
		'heading'     => '.elementor-heading-title',
		'text-editor' => '.elementor-text-editor > :first-child',
		'button'      => '.elementor-button-text',
		'icon-box'    => '.elementor-icon-box-title',
		'image-box'   => '.elementor-image-box-title',
		'testimonial' => '.elementor-testimonial-content',
		'alert'       => '.elementor-alert-title',
	];

	/**
	 * Node whose children are animated, per element. The first selector that
	 * matches is used; when none matches the element itself is used (for
	 * example a full-width container, which has no inner wrapper).
	 */
	const CHILDREN_ROOT = [
		'container' => ':scope > .e-con-inner',
		'section'   => ':scope > .elementor-container',
		'column'    => ':scope > .elementor-widget-wrap',
		'icon-box'  => '.elementor-icon-box-wrapper',
		'image-box' => '.elementor-image-box-wrapper',
	];

	/** Children selector used by widgets that render repeated items. */
	const CHILDREN_ITEMS = [
		'icon-list'     => '.elementor-icon-list-item',
		'image-gallery' => '.gallery-item, .elementor-gallery-item, .e-gallery-item',
	];

	/** Selectors of the "children" choice on containers, sections and columns. */
	const CHILDREN_CHOICES = [
		'containers' => '.e-con, .elementor-column',
		'widgets'    => '.elementor-widget',
	];

	/**
	 * Gradient targets per element: target => [ paint, selector, text_selector? ].
	 * `paint` is the module's `target` option; an empty selector paints the
	 * element itself. The optional third selector is used only by the
	 * "icon-text" paint, which paints the icons (selector) and the text
	 * (text_selector) at once.
	 */
	const GRADIENT = [
		'section'     => [ 'background' => [ 'background', '' ] ],
		'column'      => [ 'background' => [ 'background', '' ] ],
		'container'   => [ 'background' => [ 'background', '' ] ],
		'heading'     => [ 'text' => [ 'text', '.elementor-heading-title' ] ],
		'text-editor' => [ 'text' => [ 'text', '.elementor-text-editor' ] ],
		'icon'        => [ 'icon' => [ 'icon', '.elementor-icon svg, .elementor-icon i' ] ],
		'icon-box'    => [
			'background' => [ 'background', '' ],
			'text'       => [ 'text', '.elementor-icon-box-title' ],
			'icon'       => [ 'icon', '.elementor-icon-box-icon svg, .elementor-icon-box-icon i' ],
			'icon-text'  => [ 'icon-text', '.elementor-icon-box-icon svg, .elementor-icon-box-icon i', '.elementor-icon-box-title' ],
		],
		'icon-list'   => [
			'text'      => [ 'text', '.elementor-icon-list-text' ],
			'icon'      => [ 'icon', '.elementor-icon-list-icon svg, .elementor-icon-list-icon i' ],
			'icon-text' => [ 'icon-text', '.elementor-icon-list-icon svg, .elementor-icon-list-icon i', '.elementor-icon-list-text' ],
		],
	];

	/**
	 * @param string $element Element name.
	 * @return string CSS selector of the text node.
	 */
	public static function text( string $element ): string {
		return self::TEXT[ $element ] ?? '';
	}

	/**
	 * Root and selector of the children to animate.
	 *
	 * @param string $element Element name.
	 * @param string $choice  "children", "widgets", "containers" or "custom".
	 * @param string $custom  Custom selector, used when $choice is "custom".
	 * @return array{root: string, selector: string}
	 */
	public static function children( string $element, string $choice, string $custom = '' ): array {
		$root = self::CHILDREN_ROOT[ $element ] ?? '';

		if ( isset( self::CHILDREN_ITEMS[ $element ] ) ) {
			return [ 'root' => '', 'selector' => self::CHILDREN_ITEMS[ $element ] ];
		}
		if ( 'custom' === $choice ) {
			return [ 'root' => $root, 'selector' => $custom ];
		}
		if ( isset( self::CHILDREN_CHOICES[ $choice ] ) ) {
			return [ 'root' => $root, 'selector' => self::CHILDREN_CHOICES[ $choice ] ];
		}
		return [ 'root' => $root, 'selector' => '' ];
	}

	/**
	 * @param string $element Element name.
	 * @param string $paint   "background", "text", "icon" or "icon-text".
	 * @return array{target: string, selector: string, textSelector?: string}|null
	 */
	public static function gradient( string $element, string $paint ): ?array {
		$entry = self::GRADIENT[ $element ][ $paint ] ?? null;
		if ( ! $entry ) {
			return null;
		}
		$out = [ 'target' => $entry[0], 'selector' => $entry[1] ];
		if ( isset( $entry[2] ) ) {
			$out['textSelector'] = $entry[2];
		}
		return $out;
	}

	/**
	 * Paint choices available on an element.
	 *
	 * @param string $element Element name.
	 * @return string[]
	 */
	public static function gradient_paints( string $element ): array {
		return array_keys( self::GRADIENT[ $element ] ?? [] );
	}

	/**
	 * Everything the editor script needs, for localization.
	 *
	 * @return array<string, mixed>
	 */
	public static function export(): array {
		return [
			'text'             => self::TEXT,
			'childrenRoot'     => self::CHILDREN_ROOT,
			'childrenItems'    => self::CHILDREN_ITEMS,
			'childrenChoices'  => self::CHILDREN_CHOICES,
			'gradient'         => self::GRADIENT,
		];
	}
}
