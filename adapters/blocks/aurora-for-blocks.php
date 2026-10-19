<?php
/**
 * Plugin Name:       Aurora for Blocks
 * Plugin URI:        https://github.com/zmdy/aurora
 * Description:       The open-source Swiss Army knife for animated web design, in the block editor and the Site Editor: text animations, animated children, gradients and a cursor on core blocks, plus a Morph Card block. No code required.
 * Version:           0.2.0
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Aurora
 * Author URI:        https://github.com/zmdy
 * License:           MIT
 * License URI:       https://opensource.org/licenses/MIT
 * Text Domain:       aurora-for-blocks
 *
 * @package Aurora
 */

namespace Aurora\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'AURORA_BLOCKS_VERSION', get_file_data( __FILE__, [ 'Version' => 'Version' ] )['Version'] );
define( 'AURORA_BLOCKS_FILE', __FILE__ );
define( 'AURORA_BLOCKS_PATH', plugin_dir_path( __FILE__ ) );
define( 'AURORA_BLOCKS_URL', plugin_dir_url( __FILE__ ) );

require_once AURORA_BLOCKS_PATH . 'includes/class-schemas.php';
require_once AURORA_BLOCKS_PATH . 'includes/class-block-targets.php';
require_once AURORA_BLOCKS_PATH . 'includes/class-morph-card-block.php';
require_once AURORA_BLOCKS_PATH . 'includes/class-plugin.php';

// The generated files are missing in a source checkout until
// `npm run build:blocks` has run; say so instead of failing on every page.
if ( ! Schemas::available() ) {
	add_action(
		'admin_notices',
		static function () {
			if ( current_user_can( 'activate_plugins' ) ) {
				echo '<div class="notice notice-error"><p>' . esc_html__( 'Aurora for Blocks is not built. Run `npm run build:blocks` in the Aurora repository, or install the packaged zip.', 'aurora-for-blocks' ) . '</p></div>';
			}
		}
	);
	return;
}

Plugin::instance();
