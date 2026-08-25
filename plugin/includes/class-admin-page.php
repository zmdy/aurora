<?php
/**
 * Admin_Page — the "Aurora" wp-admin dashboard: a welcome/overview screen,
 * a per-module on/off toggle grid, and an About tab with version/build/
 * support info. Self-contained: registers its own admin_menu,
 * admin_enqueue_scripts, and wp_ajax_* hooks, and only ever loads its
 * assets on its own screen.
 *
 * @package Aurora
 */

namespace Aurora;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class Admin_Page {

	const PAGE_SLUG    = 'aurora-for-elementor';
	const AJAX_ACTION  = 'aurora_toggle_module';
	const NONCE_ACTION = 'aurora_admin_nonce';

	/** @var string Hook suffix returned by add_menu_page(), used to gate asset loading to this screen only. */
	private $hook_suffix = '';

	public function __construct() {
		add_action( 'admin_menu', [ $this, 'register_menu' ] );
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_assets' ] );
		add_action( 'wp_ajax_' . self::AJAX_ACTION, [ $this, 'ajax_toggle_module' ] );
	}

	/**
	 * Registers the top-level "Aurora" wp-admin menu item.
	 */
	public function register_menu(): void {
		$this->hook_suffix = add_menu_page(
			esc_html__( 'Aurora for Elementor', 'aurora-for-elementor' ),
			esc_html__( 'Aurora', 'aurora-for-elementor' ),
			'manage_options',
			self::PAGE_SLUG,
			[ $this, 'render_page' ],
			$this->menu_icon(),
			''
		);
	}

	/**
	 * Builds the wp-admin menu icon as a base64 data: URI from the plugin's
	 * own favicon mark, so the menu entry carries the actual Aurora brand
	 * icon instead of a generic dashicon.
	 */
	private function menu_icon(): string {
		$path = AURORA_PATH . 'assets/branding/aurora_favicon.svg';
		if ( ! file_exists( $path ) ) {
			return 'dashicons-art';
		}
		$svg = file_get_contents( $path );
		if ( false === $svg ) {
			return 'dashicons-art';
		}
		return 'data:image/svg+xml;base64,' . base64_encode( $svg );
	}

	/**
	 * Loads the page's CSS/JS strictly on its own screen — never globally.
	 *
	 * @param string $hook_suffix The current admin screen's hook suffix.
	 */
	public function enqueue_assets( $hook_suffix ): void {
		if ( $hook_suffix !== $this->hook_suffix ) {
			return;
		}

		wp_enqueue_style(
			'aurora-admin-page',
			AURORA_URL . 'assets/css/admin-page.css',
			[],
			AURORA_VERSION
		);

		// The live shader preview on the Dashboard tab reuses the exact
		// same WebGL engine the Gradient module ships to the frontend —
		// same vertex/fragment shaders, same uniform set — so the preview
		// is a truthful sample of what visitors actually see, not a fake.
		wp_enqueue_script(
			'aurora-shaders',
			AURORA_URL . 'assets/js/vendor/aurora-shaders.js',
			[],
			AURORA_VERSION,
			true
		);

		wp_enqueue_script(
			'aurora-admin-page',
			AURORA_URL . 'assets/js/admin-page.js',
			[ 'aurora-shaders' ],
			AURORA_VERSION,
			true
		);

		wp_localize_script(
			'aurora-admin-page',
			'AURORA_ADMIN',
			[
				'nonce' => wp_create_nonce( self::NONCE_ACTION ),
			]
		);
	}

	/**
	 * AJAX handler for a single module's on/off toggle.
	 */
	public function ajax_toggle_module(): void {
		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error(
				[ 'message' => esc_html__( 'You do not have permission to do this.', 'aurora-for-elementor' ) ],
				403
			);
		}

		$module  = isset( $_POST['module'] ) ? sanitize_key( wp_unslash( $_POST['module'] ) ) : '';
		$modules = Module_Manager::get_modules();

		if ( ! isset( $modules[ $module ] ) ) {
			wp_send_json_error(
				[ 'message' => esc_html__( 'Unknown module.', 'aurora-for-elementor' ) ],
				400
			);
		}

		$active_raw = isset( $_POST['active'] ) ? sanitize_text_field( wp_unslash( $_POST['active'] ) ) : '';
		$active     = '' !== $active_raw && '0' !== $active_raw;

		$saved = get_option( Module_Manager::OPTION_ACTIVE_MODULES, [] );
		if ( ! is_array( $saved ) ) {
			$saved = [];
		}
		$saved[ $module ] = $active;
		update_option( Module_Manager::OPTION_ACTIVE_MODULES, $saved );

		wp_send_json_success(
			[
				'module' => $module,
				'active' => $active,
			]
		);
	}

	/**
	 * Reads the newest version block straight out of the bundled
	 * readme.txt's Changelog — same file WordPress.org itself reads —
	 * so the "What's new" summary can never drift from the real
	 * changelog the way a second, hand-copied string could.
	 */
	private function get_changelog_summary(): array {
		$readme = AURORA_PATH . 'readme.txt';
		if ( ! file_exists( $readme ) ) {
			return [];
		}
		$content = file_get_contents( $readme );
		if ( false === $content ) {
			return [];
		}
		if ( ! preg_match( '/==\s*Changelog\s*==\s*\R+=\s*([0-9.]+)\s*=\s*\R((?:\*.+\R?)+)/', $content, $matches ) ) {
			return [];
		}
		preg_match_all( '/^\*\s*(.+)$/m', $matches[2], $items );

		return [
			'version' => trim( $matches[1] ),
			'items'   => array_map( 'trim', $items[1] ?? [] ),
		];
	}

	/**
	 * Renders the full admin page markup.
	 */
	public function render_page(): void {
		$modules   = Module_Manager::get_modules();
		$active    = Module_Manager::get_active_modules();
		$active_ct = count( array_filter( $active ) );
		$total_ct  = count( $modules );
		$is_full   = AURORA_HAS_GSAP;
		?>
		<div class="aurora-admin-wrap">

			<header class="aurora-admin-header">
				<div class="aurora-admin-header__brand">
					<img
						src="<?php echo esc_url( AURORA_URL . 'assets/branding/logo_aurora_animated_tagline.svg' ); ?>"
						alt="<?php esc_attr_e( 'Aurora for Elementor', 'aurora-for-elementor' ); ?>"
						class="aurora-admin-logo"
					>
				</div>

				<nav class="aurora-admin-tabs" role="tablist">
					<button type="button" class="aurora-admin-tab is-active" data-aurora-tab="dashboard" role="tab" aria-selected="true">
						<?php esc_html_e( 'Dashboard', 'aurora-for-elementor' ); ?>
					</button>
					<button type="button" class="aurora-admin-tab" data-aurora-tab="modules" role="tab" aria-selected="false">
						<?php esc_html_e( 'Modules', 'aurora-for-elementor' ); ?>
					</button>
					<button type="button" class="aurora-admin-tab" data-aurora-tab="about" role="tab" aria-selected="false">
						<?php esc_html_e( 'About & Support', 'aurora-for-elementor' ); ?>
					</button>
				</nav>

				<div class="aurora-admin-header__meta">
					<span class="aurora-badge">
						<?php echo esc_html( $is_full ? __( 'Full', 'aurora-for-elementor' ) : __( 'Light', 'aurora-for-elementor' ) ); ?>
					</span>
					<span class="aurora-badge aurora-badge--accent">
						<?php echo esc_html( 'v' . AURORA_VERSION ); ?>
					</span>
					<a
						class="aurora-icon-btn"
						href="https://github.com/zmdy/aurora"
						target="_blank"
						rel="noopener noreferrer"
						title="<?php esc_attr_e( 'View on GitHub', 'aurora-for-elementor' ); ?>"
					>
						<span class="dashicons dashicons-external"></span>
					</a>
				</div>
			</header>

			<div class="aurora-admin-body">

				<section class="aurora-tab-panel is-active" data-aurora-panel="dashboard">
					<div class="aurora-grid-2col">

						<div class="aurora-card aurora-card--welcome">
							<div class="aurora-card__text">
								<h2><?php esc_html_e( 'Welcome to Aurora for Elementor!', 'aurora-for-elementor' ); ?></h2>
								<p>
									<?php esc_html_e( 'Six design modules live in the Advanced tab of every Elementor widget, section, column, and container — no code required. Use this dashboard to explore what\'s available and turn off anything you don\'t use.', 'aurora-for-elementor' ); ?>
								</p>
								<div class="aurora-actions">
									<a class="aurora-btn aurora-btn--primary" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=page' ) ); ?>">
										<?php esc_html_e( 'Create a New Page', 'aurora-for-elementor' ); ?>
									</a>
									<a class="aurora-btn aurora-btn--secondary" href="https://github.com/zmdy/aurora#readme" target="_blank" rel="noopener noreferrer">
										<?php esc_html_e( 'Read the Docs', 'aurora-for-elementor' ); ?>
									</a>
								</div>
							</div>
							<div class="aurora-card__preview">
								<canvas id="aurora-admin-preview" aria-hidden="true"></canvas>
							</div>
						</div>

						<aside class="aurora-card aurora-card--stats">
							<h3><?php esc_html_e( 'Active Modules', 'aurora-for-elementor' ); ?></h3>
							<p class="aurora-stat-number">
								<?php
								printf(
									/* translators: 1: number of active modules, 2: total number of modules. */
									esc_html__( '%1$d of %2$d', 'aurora-for-elementor' ),
									(int) $active_ct,
									(int) $total_ct
								);
								?>
							</p>
							<p class="aurora-stat-caption"><?php esc_html_e( 'Manage which modules load on the Modules tab.', 'aurora-for-elementor' ); ?></p>
							<ul class="aurora-quick-list">
								<li><a href="https://github.com/zmdy/aurora#readme" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Documentation', 'aurora-for-elementor' ); ?></a></li>
								<li><a href="https://github.com/zmdy/aurora/issues" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Report an Issue', 'aurora-for-elementor' ); ?></a></li>
								<li><a href="https://github.com/zmdy/aurora/releases" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Releases', 'aurora-for-elementor' ); ?></a></li>
							</ul>
						</aside>
					</div>

					<div class="aurora-card aurora-card--modules-preview">
						<div class="aurora-card__head">
							<h3><?php esc_html_e( 'Modules', 'aurora-for-elementor' ); ?></h3>
							<button type="button" class="aurora-link-btn" data-aurora-goto-tab="modules">
								<?php esc_html_e( 'Manage all', 'aurora-for-elementor' ); ?> &rarr;
							</button>
						</div>
						<div class="aurora-modules-grid">
							<?php foreach ( $modules as $key => $module ) : ?>
								<?php $this->render_module_card( $key, $module, ! empty( $active[ $key ] ) ); ?>
							<?php endforeach; ?>
						</div>
					</div>
				</section>

				<section class="aurora-tab-panel" data-aurora-panel="modules">
					<div class="aurora-card">
						<div class="aurora-card__head">
							<h3><?php esc_html_e( 'Manage Modules', 'aurora-for-elementor' ); ?></h3>
							<p><?php esc_html_e( 'Turning a module off removes its controls from the Elementor Advanced tab entirely and stops loading its assets — useful if you never use it.', 'aurora-for-elementor' ); ?></p>
						</div>
						<div class="aurora-modules-grid">
							<?php foreach ( $modules as $key => $module ) : ?>
								<?php $this->render_module_card( $key, $module, ! empty( $active[ $key ] ), true ); ?>
							<?php endforeach; ?>
						</div>
					</div>
				</section>

				<section class="aurora-tab-panel" data-aurora-panel="about">
					<div class="aurora-grid-2col">
						<div class="aurora-card">
							<h3><?php esc_html_e( 'About', 'aurora-for-elementor' ); ?></h3>
							<p>
								<?php esc_html_e( 'The open-source Swiss Army knife for Elementor design: text & image animations, gradients, glassmorphism, cursor follow, and more.', 'aurora-for-elementor' ); ?>
							</p>
							<dl class="aurora-meta-list">
								<div>
									<dt><?php esc_html_e( 'Version', 'aurora-for-elementor' ); ?></dt>
									<dd><?php echo esc_html( AURORA_VERSION ); ?></dd>
								</div>
								<div>
									<dt><?php esc_html_e( 'Build', 'aurora-for-elementor' ); ?></dt>
									<dd><?php echo esc_html( $is_full ? __( 'Full (includes GSAP)', 'aurora-for-elementor' ) : __( 'Light (GPL-only, no GSAP)', 'aurora-for-elementor' ) ); ?></dd>
								</div>
								<div>
									<dt><?php esc_html_e( 'License', 'aurora-for-elementor' ); ?></dt>
									<dd>GPLv3</dd>
								</div>
								<div>
									<dt><?php esc_html_e( 'Requires', 'aurora-for-elementor' ); ?></dt>
									<dd>
										<?php
										printf(
											/* translators: 1: minimum PHP version, 2: minimum WordPress version, 3: minimum Elementor version. */
											esc_html__( 'PHP %1$s+, WordPress %2$s+, Elementor %3$s+', 'aurora-for-elementor' ),
											esc_html( AURORA_MIN_PHP ),
											esc_html( AURORA_MIN_WP ),
											esc_html( AURORA_MIN_ELEMENTOR )
										);
										?>
									</dd>
								</div>
							</dl>
							<?php $changelog = $this->get_changelog_summary(); ?>
							<?php if ( ! empty( $changelog['items'] ) ) : ?>
								<h4 class="aurora-changelog-title">
									<?php
									printf(
										/* translators: %s: version number, e.g. 0.6.0. */
										esc_html__( "What's new in %s", 'aurora-for-elementor' ),
										esc_html( $changelog['version'] )
									);
									?>
								</h4>
								<ul class="aurora-changelog-list">
									<?php foreach ( array_slice( $changelog['items'], 0, 5 ) as $item ) : ?>
										<li><?php echo esc_html( $item ); ?></li>
									<?php endforeach; ?>
								</ul>
							<?php endif; ?>
						</div>

						<div class="aurora-card">
							<h3><?php esc_html_e( 'Support & Community', 'aurora-for-elementor' ); ?></h3>
							<p><?php esc_html_e( 'Aurora is free and open-source. If it saved you time, a star on GitHub goes a long way.', 'aurora-for-elementor' ); ?></p>
							<ul class="aurora-link-list">
								<li>
									<a href="https://github.com/zmdy/aurora" target="_blank" rel="noopener noreferrer">
										<span class="dashicons dashicons-external"></span>
										<?php esc_html_e( 'GitHub Repository', 'aurora-for-elementor' ); ?>
									</a>
								</li>
								<li>
									<a href="https://github.com/zmdy/aurora/issues" target="_blank" rel="noopener noreferrer">
										<span class="dashicons dashicons-flag"></span>
										<?php esc_html_e( 'Report an Issue', 'aurora-for-elementor' ); ?>
									</a>
								</li>
								<li>
									<a href="https://github.com/zmdy/aurora/blob/main/plugin/readme.txt" target="_blank" rel="noopener noreferrer">
										<span class="dashicons dashicons-media-text"></span>
										<?php esc_html_e( 'Full Changelog', 'aurora-for-elementor' ); ?>
									</a>
								</li>
							</ul>
						</div>
					</div>
				</section>

			</div>
		</div>
		<?php
	}

	/**
	 * Renders a single module card. $detailed adds the description text —
	 * used on the Modules tab; the Dashboard tab preview grid stays compact
	 * (icon, name, toggle only).
	 */
	private function render_module_card( string $key, array $module, bool $is_active, bool $detailed = false ): void {
		?>
		<div class="aurora-module-card<?php echo $detailed ? ' aurora-module-card--detailed' : ''; ?>" data-aurora-module="<?php echo esc_attr( $key ); ?>">
			<div class="aurora-module-card__row">
				<span class="aurora-module-card__icon">
					<?php if ( 'svg' === $module['icon_type'] ) : ?>
						<img src="<?php echo esc_url( $module['icon'] ); ?>" alt="" aria-hidden="true">
					<?php else : ?>
						<span class="dashicons <?php echo esc_attr( $module['icon'] ); ?>"></span>
					<?php endif; ?>
				</span>
				<label class="aurora-switch">
					<input
						type="checkbox"
						data-aurora-module-toggle="<?php echo esc_attr( $key ); ?>"
						<?php checked( $is_active ); ?>
					>
					<span class="aurora-switch__track"><span class="aurora-switch__thumb"></span></span>
				</label>
			</div>
			<p class="aurora-module-card__label"><?php echo esc_html( $module['label'] ); ?></p>
			<?php if ( $detailed ) : ?>
				<p class="aurora-module-card__desc"><?php echo esc_html( $module['description'] ); ?></p>
			<?php endif; ?>
		</div>
		<?php
	}
}
