<?php
/**
 * Settings_Page — the Aurora admin dashboard: an overview of the plugin plus
 * the module on/off switches.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Settings_Page {

	const SLUG = 'aurora-for-elementor';

	/** Project links shown on the dashboard. */
	const GITHUB     = 'https://github.com/zmdy/aurora';
	const DOCS       = 'https://github.com/zmdy/aurora#readme';
	const ISSUES     = 'https://github.com/zmdy/aurora/issues';
	const CHANGELOG  = 'https://github.com/zmdy/aurora/releases';

	public function __construct() {
		add_action( 'admin_menu', [ $this, 'add_menu' ] );
		add_action( 'admin_init', [ $this, 'register_setting' ] );
	}

	/** White single-color mark, sized for the dark wp-admin menu. */
	private function menu_icon_url(): string {
		return AURORA_URL . 'assets/branding/aurora-menu-icon.svg';
	}

	/** Full colored wordmark, for the dashboard header. */
	private function header_logo_url(): string {
		return AURORA_URL . 'assets/branding/logo_aurora_animated.svg';
	}

	public function add_menu(): void {
		add_menu_page(
			esc_html__( 'Aurora', 'aurora-for-elementor' ),
			esc_html__( 'Aurora', 'aurora-for-elementor' ),
			'manage_options',
			self::SLUG,
			[ $this, 'render' ],
			$this->menu_icon_url(),
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

		$active   = Module_Manager::get_active_modules();
		$modules  = array_merge( Module_Manager::get_modules(), Module_Manager::get_widget_modules() );
		$elementor = defined( 'ELEMENTOR_VERSION' ) ? ELEMENTOR_VERSION : '';

		?>
		<div class="wrap aurora-dash">
			<?php $this->styles(); ?>

			<div class="aurora-dash__header">
				<div class="aurora-dash__head-text">
					<h1 class="screen-reader-text"><?php esc_html_e( 'Aurora for Elementor', 'aurora-for-elementor' ); ?></h1>
					<div class="aurora-dash__brand">
						<img class="aurora-dash__logo" src="<?php echo esc_url( $this->header_logo_url() ); ?>" alt="Aurora" />
						<span class="aurora-dash__for"><?php esc_html_e( 'for Elementor', 'aurora-for-elementor' ); ?></span>
						<span class="aurora-dash__version">v<?php echo esc_html( AURORA_VERSION ); ?></span>
					</div>
					<p><?php esc_html_e( 'The open-source Swiss Army knife for animated web design — text animations, animated children, gradients, a cursor follower and a morphing card, no code required.', 'aurora-for-elementor' ); ?></p>
					<div class="aurora-dash__actions">
						<a class="button button-primary" href="<?php echo esc_url( admin_url( 'edit.php?post_type=page' ) ); ?>"><?php esc_html_e( 'Edit a page with Elementor', 'aurora-for-elementor' ); ?></a>
						<a class="button" href="<?php echo esc_url( self::GITHUB ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'GitHub', 'aurora-for-elementor' ); ?></a>
						<a class="button" href="<?php echo esc_url( self::DOCS ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Documentation', 'aurora-for-elementor' ); ?></a>
					</div>
				</div>
			</div>

			<div class="aurora-dash__grid">

				<div class="aurora-dash__main">
					<div class="aurora-card">
						<h2><?php esc_html_e( 'Modules', 'aurora-for-elementor' ); ?></h2>
						<p class="aurora-card__lead"><?php esc_html_e( 'Turn modules on or off. A module you turn off adds no controls to Elementor and loads no scripts.', 'aurora-for-elementor' ); ?></p>

						<form method="post" action="options.php">
							<?php settings_fields( self::SLUG ); ?>
							<ul class="aurora-modules">
								<?php foreach ( $modules as $key => $module ) : ?>
									<li class="aurora-module">
										<label class="aurora-switch">
											<input type="checkbox" name="<?php echo esc_attr( Module_Manager::OPTION_ACTIVE_MODULES ); ?>[<?php echo esc_attr( $key ); ?>]" value="1" <?php checked( ! empty( $active[ $key ] ), true ); ?> />
											<span class="aurora-switch__track" aria-hidden="true"></span>
										</label>
										<div class="aurora-module__text">
											<strong><?php echo esc_html( $module['label'] ); ?></strong>
											<span><?php echo esc_html( $module['description'] ); ?></span>
										</div>
									</li>
								<?php endforeach; ?>
							</ul>
							<?php submit_button( __( 'Save changes', 'aurora-for-elementor' ) ); ?>
						</form>
					</div>

					<div class="aurora-card">
						<h2><?php esc_html_e( 'Getting started', 'aurora-for-elementor' ); ?></h2>
						<ol class="aurora-steps">
							<li><?php esc_html_e( 'Edit any page or template with Elementor.', 'aurora-for-elementor' ); ?></li>
							<li>
								<?php
								printf(
									/* translators: %s: the name of the Elementor panel tab. */
									esc_html__( 'Select a widget, section, column or container and open the %s tab in the panel.', 'aurora-for-elementor' ),
									'<strong>' . esc_html__( 'Advanced', 'aurora-for-elementor' ) . '</strong>'
								);
								?>
							</li>
							<li><?php esc_html_e( 'Find the Aurora sections (Text Animation, Gradient, Animate Children, Cursor Follow), switch one on and tune it — the preview updates live.', 'aurora-for-elementor' ); ?></li>
							<li><?php esc_html_e( 'For the Morph Card, drag the "Morph Card (Aurora)" widget onto the canvas.', 'aurora-for-elementor' ); ?></li>
						</ol>
					</div>
				</div>

				<div class="aurora-dash__side">
					<div class="aurora-card">
						<h2><?php esc_html_e( 'Resources', 'aurora-for-elementor' ); ?></h2>
						<ul class="aurora-links">
							<li><a href="<?php echo esc_url( self::DOCS ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Documentation', 'aurora-for-elementor' ); ?></a></li>
							<li><a href="<?php echo esc_url( self::GITHUB ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Source code on GitHub', 'aurora-for-elementor' ); ?></a></li>
							<li><a href="<?php echo esc_url( self::CHANGELOG ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Changelog &amp; releases', 'aurora-for-elementor' ); ?></a></li>
							<li><a href="<?php echo esc_url( self::ISSUES ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Report an issue', 'aurora-for-elementor' ); ?></a></li>
						</ul>
					</div>

					<div class="aurora-card">
						<h2><?php esc_html_e( 'About', 'aurora-for-elementor' ); ?></h2>
						<dl class="aurora-meta">
							<div><dt><?php esc_html_e( 'Version', 'aurora-for-elementor' ); ?></dt><dd><?php echo esc_html( AURORA_VERSION ); ?></dd></div>
							<div><dt><?php esc_html_e( 'Elementor', 'aurora-for-elementor' ); ?></dt><dd><?php echo $elementor ? esc_html( $elementor ) : esc_html__( 'not detected', 'aurora-for-elementor' ); ?></dd></div>
							<div><dt><?php esc_html_e( 'License', 'aurora-for-elementor' ); ?></dt><dd>MIT</dd></div>
							<div><dt><?php esc_html_e( 'Animation', 'aurora-for-elementor' ); ?></dt><dd><?php esc_html_e( 'Anime.js, CSS &amp; WebGL — no GSAP', 'aurora-for-elementor' ); ?></dd></div>
						</dl>
						<p class="aurora-card__note"><?php esc_html_e( 'All modules respect the visitor\'s reduced-motion setting.', 'aurora-for-elementor' ); ?></p>
					</div>
				</div>

			</div>
		</div>
		<?php
	}

	/** Scoped styles for the dashboard. */
	private function styles(): void {
		?>
		<style>
			.aurora-dash { --aurora-accent:#7c6cff; --aurora-accent-2:#2af598; max-width:1180px; }
			.aurora-dash__header { background:#fff; border:1px solid #e2e4e7; border-radius:12px; padding:22px 24px; margin:16px 0 20px; }
			.aurora-dash__brand { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
			.aurora-dash__logo { height:40px; width:auto; display:block; }
			.aurora-dash__for { font-size:18px; font-weight:600; color:#1d2327; }
			.aurora-dash__version { font-size:12px; font-weight:600; color:#fff; background:linear-gradient(135deg,var(--aurora-accent),var(--aurora-accent-2)); padding:2px 8px; border-radius:999px; }
			.aurora-dash__head-text p { margin:0 0 12px; color:#50575e; max-width:70ch; }
			.aurora-dash__actions .button { margin-right:8px; }
			.aurora-dash__grid { display:grid; grid-template-columns:2fr 1fr; gap:20px; align-items:start; }
			@media (max-width:1100px){ .aurora-dash__grid { grid-template-columns:1fr; } }
			.aurora-dash__main, .aurora-dash__side { display:flex; flex-direction:column; gap:20px; }
			.aurora-card { background:#fff; border:1px solid #e2e4e7; border-radius:12px; padding:20px 22px; }
			.aurora-card h2 { margin:0 0 12px; font-size:16px; }
			.aurora-card__lead { color:#50575e; margin-top:0; }
			.aurora-card__note { color:#787c82; font-size:12px; margin-bottom:0; }
			.aurora-modules { margin:0; }
			.aurora-module { display:flex; gap:14px; align-items:flex-start; padding:14px 0; border-top:1px solid #f0f0f1; }
			.aurora-module:first-child { border-top:0; padding-top:4px; }
			.aurora-module__text strong { display:block; font-size:14px; }
			.aurora-module__text span { color:#50575e; font-size:13px; }
			.aurora-switch { position:relative; flex:0 0 auto; width:42px; height:24px; margin-top:2px; }
			.aurora-switch input { position:absolute; opacity:0; width:100%; height:100%; margin:0; cursor:pointer; }
			.aurora-switch__track { position:absolute; inset:0; background:#c3c4c7; border-radius:999px; transition:background .15s ease; }
			.aurora-switch__track::after { content:""; position:absolute; top:3px; left:3px; width:18px; height:18px; background:#fff; border-radius:50%; transition:transform .15s ease; box-shadow:0 1px 2px rgba(0,0,0,.25); }
			.aurora-switch input:checked + .aurora-switch__track { background:linear-gradient(135deg,var(--aurora-accent),var(--aurora-accent-2)); }
			.aurora-switch input:checked + .aurora-switch__track::after { transform:translateX(18px); }
			.aurora-switch input:focus-visible + .aurora-switch__track { outline:2px solid var(--aurora-accent); outline-offset:2px; }
			.aurora-steps { margin:0; padding-left:20px; color:#3c434a; }
			.aurora-steps li { margin:0 0 8px; }
			.aurora-links { margin:0; }
			.aurora-links li { margin:0 0 8px; }
			.aurora-meta { margin:0; }
			.aurora-meta div { display:flex; justify-content:space-between; gap:12px; padding:7px 0; border-top:1px solid #f0f0f1; }
			.aurora-meta div:first-child { border-top:0; }
			.aurora-meta dt { color:#50575e; margin:0; }
			.aurora-meta dd { margin:0; font-weight:600; text-align:right; }
		</style>
		<?php
	}
}
