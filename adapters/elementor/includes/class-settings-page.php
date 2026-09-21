<?php
/**
 * Settings_Page — lets administrators turn modules on and off.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Settings_Page {

	const SLUG = 'aurora-for-elementor';

	public function __construct() {
		add_action( 'admin_menu', [ $this, 'add_menu' ] );
		add_action( 'admin_init', [ $this, 'register_setting' ] );
	}

	public function add_menu(): void {
		add_menu_page(
			esc_html__( 'Aurora', 'aurora-for-elementor' ),
			esc_html__( 'Aurora', 'aurora-for-elementor' ),
			'manage_options',
			self::SLUG,
			[ $this, 'render' ],
			'dashicons-art',
			59
		);
	}

	public function register_setting(): void {
		register_setting(
			self::SLUG,
			Module_Manager::OPTION_ACTIVE_MODULES,
			[
				'type'              => 'array',
				'sanitize_callback' => [ $this, 'sanitize' ],
				'default'           => [],
			]
		);
	}

	/**
	 * Unchecked boxes are not submitted, so every known module is written
	 * explicitly as true or false.
	 *
	 * @param mixed $input Submitted value.
	 * @return array<string, bool>
	 */
	public function sanitize( $input ): array {
		$input = is_array( $input ) ? $input : [];
		$clean = [];
		foreach ( array_keys( array_merge( Module_Manager::get_modules(), Module_Manager::get_widget_modules() ) ) as $key ) {
			$clean[ $key ] = ! empty( $input[ $key ] );
		}
		return $clean;
	}

	public function render(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		$active  = Module_Manager::get_active_modules();
		$modules = array_merge( Module_Manager::get_modules(), Module_Manager::get_widget_modules() );

		echo '<div class="wrap"><h1>' . esc_html__( 'Aurora', 'aurora-for-elementor' ) . '</h1>';
		echo '<p>' . esc_html__( 'Choose which modules are available in Elementor. Modules you turn off load no scripts.', 'aurora-for-elementor' ) . '</p>';
		echo '<form method="post" action="options.php">';
		settings_fields( self::SLUG );
		echo '<table class="form-table" role="presentation"><tbody>';

		foreach ( $modules as $key => $module ) {
			printf(
				'<tr><th scope="row">%1$s</th><td><label><input type="checkbox" name="%2$s[%3$s]" value="1" %4$s> %5$s</label></td></tr>',
				esc_html( $module['label'] ),
				esc_attr( Module_Manager::OPTION_ACTIVE_MODULES ),
				esc_attr( $key ),
				checked( ! empty( $active[ $key ] ), true, false ),
				esc_html( $module['description'] )
			);
		}

		echo '</tbody></table>';
		submit_button();
		echo '</form></div>';
	}
}
