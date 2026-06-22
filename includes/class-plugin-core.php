<?php
/**
 * Plugin Core — ponto de entrada do plugin. Apenas inicializa o
 * Asset_Manager (assets de frontend/editor) e o Module_Manager
 * (módulos de animação) — toda a lógica concreta vive nas próprias
 * classes especializadas.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Singleton que orquestra todo o plugin.
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
