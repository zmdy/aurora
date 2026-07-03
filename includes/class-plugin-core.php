<?php
/**
 * Plugin Core — the plugin's entry point. It only bootstraps the
 * Asset_Manager (frontend/editor assets) and the Module_Manager
 * (animation modules) — all the concrete logic lives in the
 * specialized classes themselves.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Singleton that orchestrates the whole plugin.
 */
final class Plugin_Core {

	/** @var Plugin_Core|null */
	private static $_instance = null;

	/** @var Asset_Manager */
	private $asset_manager;

	public static function instance(): Plugin_Core {
		if ( null === self::$_instance ) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}

	private function __construct() {
		$this->asset_manager = new Asset_Manager();

		Module_Manager::init();
	}
}
