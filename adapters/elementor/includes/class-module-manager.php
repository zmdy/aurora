<?php
/**
 * Module_Manager — registry of the Aurora modules exposed in Elementor.
 *
 * One list feeds both the module instantiation and the settings page. A
 * module missing from the saved option counts as enabled, so new modules
 * work right after an update.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Module_Manager {

	const OPTION_ACTIVE_MODULES = 'aurora_active_modules';

	/** @var array|null Cached schemas from includes/generated/schemas.php. */
	private static $schemas = null;

	/**
	 * Option schemas of every module, generated from the JavaScript modules.
	 *
	 * @return array<string, array>
	 */
	public static function schemas(): array {
		if ( null === self::$schemas ) {
			$file          = AURORA_PATH . 'includes/generated/schemas.php';
			self::$schemas = file_exists( $file ) ? (array) require $file : [];
		}
		return self::$schemas;
	}

	/**
	 * @return array<string, array> module key => definition.
	 */
	public static function get_modules(): array {
		return [
			'text'     => [
				'label'       => esc_html__( 'Text Animation', 'aurora-for-elementor' ),
				'description' => esc_html__( 'Splits text into characters, words or lines and animates it on scroll or page load, with 53 effects.', 'aurora-for-elementor' ),
				'class'       => Text_Module::class,
				'elements'    => [ 'heading', 'text-editor', 'button', 'icon-box', 'image-box', 'testimonial', 'alert' ],
				'priority'    => 10,
			],
			'children' => [
				'label'       => esc_html__( 'Animate Children Elements', 'aurora-for-elementor' ),
				'description' => esc_html__( 'A staggered entrance animation for each child of a container, section, column, icon list or gallery, with hover and proximity effects.', 'aurora-for-elementor' ),
				'class'       => Children_Module::class,
				'elements'    => [ 'section', 'column', 'container', 'icon-list', 'image-gallery', 'icon-box', 'image-box' ],
				'priority'    => 20,
			],
			'gradient' => [
				'label'       => esc_html__( 'Gradient', 'aurora-for-elementor' ),
				'description' => esc_html__( 'Multi-stop gradients for backgrounds, text and icons, with animation, a cursor spotlight and WebGL mesh styles.', 'aurora-for-elementor' ),
				'class'       => Gradient_Module::class,
				'elements'    => [ 'section', 'column', 'container', 'heading', 'text-editor', 'icon', 'icon-box', 'icon-list' ],
				'priority'    => 30,
			],
			'highlight' => [
				'label'       => esc_html__( 'Highlight Shapes', 'aurora-for-elementor' ),
				'description' => esc_html__( 'A hand-drawn marker - underline, circle, scribble, marker pen and twelve more - drawn over a phrase, with phrases that can rotate.', 'aurora-for-elementor' ),
				'class'       => Highlight_Module::class,
				'elements'    => [ 'heading', 'text-editor', 'button', 'icon-box', 'image-box', 'testimonial', 'alert' ],
				'priority'    => 50,
			],
			'cursor'   => [
				'label'       => esc_html__( 'Cursor Follow', 'aurora-for-elementor' ),
				'description' => esc_html__( 'A custom dot-and-ring cursor inside the element, with hover states for links and images.', 'aurora-for-elementor' ),
				'class'       => Cursor_Module::class,
				'elements'    => [ 'section', 'column', 'container', 'image', 'icon-box', 'button' ],
				'priority'    => 40,
			],
		];
	}

	/**
	 * Modules that have their own widget instead of controls on other elements.
	 *
	 * @return array<string, array>
	 */
	public static function get_widget_modules(): array {
		return [
			'morph-card' => [
				'label'       => esc_html__( 'Morph Card', 'aurora-for-elementor' ),
				'description' => esc_html__( 'A card widget that morphs between post, profile, polaroid and custom layouts.', 'aurora-for-elementor' ),
			],
		];
	}

	/**
	 * @return array<string, bool> module key => active.
	 */
	public static function get_active_modules(): array {
		$saved = get_option( self::OPTION_ACTIVE_MODULES, [] );
		if ( ! is_array( $saved ) ) {
			$saved = [];
		}

		$keys   = array_merge( array_keys( self::get_modules() ), array_keys( self::get_widget_modules() ) );
		$active = [];
		foreach ( $keys as $key ) {
			$active[ $key ] = ! isset( $saved[ $key ] ) || ! empty( $saved[ $key ] );
		}
		return $active;
	}

	public static function is_active( string $key ): bool {
		$active = self::get_active_modules();
		return ! empty( $active[ $key ] );
	}

	/**
	 * Instantiates every active module.
	 *
	 * @return Schema_Module[]
	 */
	public static function init(): array {
		$schemas = self::schemas();
		$created = [];

		foreach ( self::get_modules() as $key => $config ) {
			if ( ! self::is_active( $key ) || empty( $schemas[ $key ] ) ) {
				continue;
			}
			$created[ $key ] = new $config['class']( $key, $schemas[ $key ], $config );
		}

		return $created;
	}
}
