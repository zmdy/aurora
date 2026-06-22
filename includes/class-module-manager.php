<?php
/**
 * Module_Manager — registro central dos módulos de animação Aurora.
 *
 * Para adicionar um novo módulo no futuro:
 *   1. Crie includes/class-{nome-do-modulo}.php com uma classe que
 *      estenda Animation_Module e implemente os 4 métodos abstratos.
 *   2. Acrescente a classe ao array $modules abaixo.
 * Nada mais precisa ser tocado — o autoload (registrado em
 * aurora-for-elementor.php) cuida do require, e o construtor de
 * Animation_Module cuida dos hooks do Elementor.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Module_Manager {

	/** @var array<int, class-string<Animation_Module>> Módulos ativos do plugin. */
	private static $modules = [
		Text_Animation_Controls::class,
		Children_Animation_Controls::class,
		Gradient_Controls::class,
		Glassmorphism_Controls::class,
	];

	/**
	 * Instancia todos os módulos registrados.
	 */
	public static function init(): void {
		foreach ( self::$modules as $module_class ) {
			new $module_class();
		}
	}
}
