<?php
/**
 * Which blocks offer which module, and the per-block defaults that point a
 * module at the right node inside the block's markup (the counterpart of
 * the Elementor adapter's Element_Targets).
 *
 * Extend or override with the `aurora_blocks_targets` filter:
 *
 *   add_filter( 'aurora_blocks_targets', function ( $targets ) {
 *       $targets['text']['my/block'] = [ 'target' => '.my-title' ];
 *       return $targets;
 *   } );
 *
 * @package Aurora
 */

namespace Aurora\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Block_Targets {

	/**
	 * Module => block name => defaults applied when the editor did not set
	 * that option. An empty array offers the module with no defaults.
	 */
	const DEFAULTS = [
		'text'     => [
			'core/heading'      => [],
			'core/paragraph'    => [],
			'core/button'       => [ 'target' => '.wp-block-button__link' ],
			'core/site-title'   => [ 'target' => 'a' ],
			'core/site-tagline' => [],
			'core/post-title'   => [ 'target' => 'a' ],
			'core/query-title'  => [],
			'core/pullquote'    => [ 'target' => 'p' ],
			'core/verse'        => [],
		],
		'children' => [
			'core/group'         => [],
			'core/columns'       => [],
			'core/column'        => [],
			'core/buttons'       => [],
			'core/gallery'       => [],
			'core/list'          => [],
			'core/social-links'  => [],
			'core/media-text'    => [],
			'core/post-template' => [],
			'core/cover'         => [ 'root' => '.wp-block-cover__inner-container' ],
		],
		'gradient' => [
			'core/group'      => [],
			'core/columns'    => [],
			'core/column'     => [],
			'core/cover'      => [],
			'core/media-text' => [],
			'core/heading'    => [ 'target' => 'text' ],
			'core/paragraph'  => [ 'target' => 'text' ],
			'core/site-title' => [
				'target'   => 'text',
				'selector' => 'a',
			],
			'core/post-title' => [ 'target' => 'text' ],
			'core/button'     => [
				'target'   => 'text',
				'selector' => '.wp-block-button__link',
			],
		],
		'cursor'   => [
			'core/group'      => [],
			'core/cover'      => [],
			'core/columns'    => [],
			'core/column'     => [],
			'core/media-text' => [],
		],
	];

	/** @var array|null */
	private static $targets = null;

	/** @return array Module => block name => defaults, after the filter. */
	public static function all(): array {
		if ( null === self::$targets ) {
			$targets       = apply_filters( 'aurora_blocks_targets', self::DEFAULTS );
			self::$targets = is_array( $targets ) ? $targets : self::DEFAULTS;
		}
		return self::$targets;
	}

	public static function offers( string $module, string $block ): bool {
		$all = self::all();
		return isset( $all[ $module ][ $block ] );
	}

	public static function defaults( string $module, string $block ): array {
		$all = self::all();
		$out = $all[ $module ][ $block ] ?? [];
		return is_array( $out ) ? $out : [];
	}
}
