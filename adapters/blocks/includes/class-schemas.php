<?php
/**
 * Module schemas (generated from packages/<module>/src/schema.js) and the
 * sanitizer that turns options saved in a block into data-attributes.
 *
 * @package Aurora
 */

namespace Aurora\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Schemas {

	/** Longest string or selector value kept. */
	const MAX_STRING = 300;

	/** @var array|null */
	private static $data = null;

	private static function file(): string {
		return AURORA_BLOCKS_PATH . 'includes/generated/schemas.json';
	}

	public static function available(): bool {
		return is_readable( self::file() );
	}

	/** @return array<string, array> Module name => schema. */
	public static function all(): array {
		if ( null === self::$data ) {
			$json       = self::available() ? json_decode( (string) file_get_contents( self::file() ), true ) : null;
			self::$data = is_array( $json ) && isset( $json['modules'] ) && is_array( $json['modules'] ) ? $json['modules'] : [];
		}
		return self::$data;
	}

	public static function get( string $module ): ?array {
		$all = self::all();
		return $all[ $module ] ?? null;
	}

	/**
	 * Validates the options saved for one module against its schema.
	 *
	 * Unknown options and invalid values are dropped, numbers are clamped,
	 * and options equal to their default or hidden by an unmet `when`
	 * condition are left out so the markup stays small.
	 *
	 * @param string $module   Module name.
	 * @param array  $saved    Options as saved in the block.
	 * @param array  $defaults Block-type defaults (Block_Targets), applied when not saved.
	 * @return array{primary: string, options: array}|null Null for an unknown module.
	 */
	public static function sanitize( string $module, array $saved, array $defaults = [] ): ?array {
		$schema = self::get( $module );
		if ( ! $schema || empty( $schema['options'] ) ) {
			return null;
		}

		$values = [];
		foreach ( $schema['options'] as $key => $option ) {
			$raw = array_key_exists( $key, $saved ) ? $saved[ $key ] : ( $defaults[ $key ] ?? null );
			if ( null === $raw ) {
				continue;
			}
			$value = self::coerce( $option, $raw );
			if ( null !== $value ) {
				$values[ $key ] = $value;
			}
		}

		$resolved = [];
		foreach ( $schema['options'] as $key => $option ) {
			$resolved[ $key ] = $values[ $key ] ?? ( $option['default'] ?? null );
		}

		$primary_key = $schema['primary'] ?? '';
		$options     = [];
		foreach ( $values as $key => $value ) {
			$option = $schema['options'][ $key ];
			if ( $key === $primary_key ) {
				continue;
			}
			if ( array_key_exists( 'default', $option ) && $value === $option['default'] ) {
				continue;
			}
			if ( ! empty( $option['when'] ) && ! self::when( $option['when'], $resolved ) ) {
				continue;
			}
			$options[ $key ] = $value;
		}

		return [
			'primary' => (string) ( $resolved[ $primary_key ] ?? '' ),
			'options' => $options,
		];
	}

	/** Whether a `when` condition ({ option: value | [values] }) holds. */
	public static function when( array $when, array $resolved ): bool {
		foreach ( $when as $key => $expected ) {
			$actual = $resolved[ $key ] ?? null;
			if ( is_array( $expected ) ? ! in_array( $actual, $expected, true ) : $actual !== $expected ) {
				return false;
			}
		}
		return true;
	}

	/** Enum values as plain strings (schemas allow strings or { value, label }). */
	public static function enum_values( array $option ): array {
		$out = [];
		foreach ( $option['values'] ?? [] as $entry ) {
			$out[] = (string) ( is_array( $entry ) ? ( $entry['value'] ?? '' ) : $entry );
		}
		return $out;
	}

	/**
	 * One value converted to the option's type, or null when invalid.
	 *
	 * @param array $option Schema entry.
	 * @param mixed $raw    Saved value.
	 * @return mixed
	 */
	private static function coerce( array $option, $raw ) {
		switch ( $option['type'] ?? '' ) {
			case 'enum':
				if ( ! is_scalar( $raw ) ) {
					return null;
				}
				$raw = (string) $raw;
				return in_array( $raw, self::enum_values( $option ), true ) ? $raw : null;

			case 'number':
				if ( ! is_numeric( $raw ) ) {
					return null;
				}
				$n = (float) $raw;
				if ( isset( $option['min'] ) ) {
					$n = max( (float) $option['min'], $n );
				}
				if ( isset( $option['max'] ) ) {
					$n = min( (float) $option['max'], $n );
				}
				return floor( $n ) === $n && abs( $n ) < PHP_INT_MAX ? (int) $n : $n;

			case 'boolean':
				if ( is_bool( $raw ) ) {
					return $raw;
				}
				return filter_var( $raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE );

			case 'color':
				if ( ! is_string( $raw ) ) {
					return null;
				}
				$raw = trim( $raw );
				if ( preg_match( '/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $raw ) ) {
					return $raw;
				}
				return preg_match( '/^(?:rgba?|hsla?)\(\s*[0-9.,%\s\/deg+-]+\)$/i', $raw ) ? $raw : null;

			case 'string':
			case 'selector':
				if ( ! is_scalar( $raw ) ) {
					return null;
				}
				$raw = trim( wp_strip_all_tags( (string) $raw ) );
				return '' === $raw ? '' : mb_substr( $raw, 0, self::MAX_STRING );
		}
		return null;
	}
}
