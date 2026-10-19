<?php
/**
 * Smoke test of the block adapter against minimal WordPress stubs.
 * Run: npm run build:blocks && php adapters/blocks/test/smoke-test.php
 * It checks option sanitizing and the data-attributes produced per block.
 * It does not replace testing inside a real WordPress install.
 */

namespace {
	define( 'ABSPATH', '/' );
	define( 'AURORA_BLOCKS_PATH', dirname( __DIR__ ) . '/' );
	define( 'AURORA_BLOCKS_URL', '/p/' );
	define( 'AURORA_BLOCKS_VERSION', '0' );

	$GLOBALS['filters'] = [];
	function add_action() {}
	function add_filter() {}
	function apply_filters( $hook, $value ) {
		return isset( $GLOBALS['filters'][ $hook ] ) ? $GLOBALS['filters'][ $hook ]( $value ) : $value;
	}
	function wp_json_encode( $v ) {
		return json_encode( $v, JSON_UNESCAPED_SLASHES );
	}
	function wp_strip_all_tags( $s ) {
		return trim( strip_tags( $s ) );
	}
	function sanitize_text_field( $s ) {
		return trim( preg_replace( '/\s+/', ' ', strip_tags( $s ) ) );
	}
	function sanitize_textarea_field( $s ) {
		return trim( strip_tags( $s ) );
	}
	function esc_url_raw( $url, $protocols = null ) {
		return preg_match( '#^https?://#i', $url ) ? $url : '';
	}
	function esc_url( $url ) {
		return htmlspecialchars( $url, ENT_QUOTES );
	}
	function esc_attr( $s ) {
		return htmlspecialchars( $s, ENT_QUOTES );
	}
	function esc_html( $s ) {
		return htmlspecialchars( $s, ENT_QUOTES );
	}
	$GLOBALS['enqueued'] = [];
	function wp_enqueue_script( $h ) {
		$GLOBALS['enqueued'][] = $h;
	}
	function get_block_wrapper_attributes( $extra = [] ) {
		$out = 'class="wp-block-aurora-morph-card"';
		foreach ( $extra as $k => $v ) {
			$out .= ' ' . $k . '="' . htmlspecialchars( $v, ENT_QUOTES ) . '"';
		}
		return $out;
	}

	require AURORA_BLOCKS_PATH . 'includes/class-schemas.php';
	require AURORA_BLOCKS_PATH . 'includes/class-block-targets.php';
	require AURORA_BLOCKS_PATH . 'includes/class-morph-card-block.php';
	require AURORA_BLOCKS_PATH . 'includes/class-plugin.php';

	use Aurora\Blocks\Schemas;
	use Aurora\Blocks\Plugin;
	use Aurora\Blocks\Morph_Card_Block;

	$failed = 0;
	function check( $label, $actual, $expected ) {
		global $failed;
		if ( $actual === $expected ) {
			echo "ok   $label\n";
			return;
		}
		$failed++;
		echo "FAIL $label\n     expected " . var_export( $expected, true ) . "\n     got      " . var_export( $actual, true ) . "\n";
	}

	if ( ! Schemas::available() ) {
		fwrite( STDERR, "includes/generated/schemas.json is missing; run `npm run build:blocks` first.\n" );
		exit( 1 );
	}

	foreach ( Plugin::SCRIPTS as $module ) {
		check( "schema $module loaded", is_array( Schemas::get( $module ) ), true );
	}

	// Text on a heading: primary attribute, non-default options only.
	$r = Plugin::attributes_for( 'core/heading', [ 'text' => [ 'effect' => 'blur-reveal', 'duration' => 1200, 'delay' => 0 ] ] );
	check( 'heading text primary', $r['attributes']['data-aurora-text'] ?? null, 'blur-reveal' );
	check( 'heading text options', $r['attributes']['data-aurora-text-options'] ?? null, '{"duration":1200}' );
	check( 'heading modules', $r['modules'], [ 'text' ] );

	// A module turned on with nothing changed still renders its primary option.
	$r = Plugin::attributes_for( 'core/heading', [ 'text' => [] ] );
	check( 'empty options use the default effect', $r['attributes']['data-aurora-text'] ?? null, 'slide-in' );
	check( 'empty options add no -options attribute', isset( $r['attributes']['data-aurora-text-options'] ), false );

	// Block defaults: the button points the text module at its link.
	$r = Plugin::attributes_for( 'core/button', [ 'text' => [ 'effect' => 'blur-reveal' ] ] );
	check( 'button text target default', $r['attributes']['data-aurora-text-options'] ?? null, '{"target":".wp-block-button__link"}' );

	// Invalid values are dropped, numbers clamped, unknown options ignored.
	$r = Plugin::attributes_for( 'core/heading', [ 'text' => [ 'effect' => 'nope', 'duration' => 999999, 'bogus' => 1, 'split' => 'words' ] ] );
	check( 'invalid enum falls back to default', $r['attributes']['data-aurora-text'] ?? null, 'slide-in' );
	check( 'clamped and filtered options', $r['attributes']['data-aurora-text-options'] ?? null, '{"split":"words","duration":10000}' );

	// `when`: options hidden by their condition are left out.
	$r = Plugin::attributes_for( 'core/heading', [ 'text' => [ 'effect' => 'blur-reveal', 'trigger' => 'load', 'threshold' => 0.5 ] ] );
	check( 'option hidden by when is dropped', $r['attributes']['data-aurora-text-options'] ?? null, '{"trigger":"load"}' );

	// Tags are stripped from strings; bad colors are dropped.
	$r = Plugin::attributes_for( 'core/heading', [ 'text' => [ 'effect' => 'sparkles-text', 'sparkleColor' => 'red;}</style>', 'sparkleColor2' => '#00ff00' ] ] );
	check( 'invalid color dropped, valid kept', $r['attributes']['data-aurora-text-options'] ?? null, '{"sparkleColor2":"#00ff00"}' );
	$r = Plugin::attributes_for( 'core/group', [ 'children' => [ 'selector' => '<b>.x</b>' ] ] );
	check( 'tags stripped from selectors', $r['attributes']['data-aurora-children-options'] ?? null, '{"selector":".x"}' );

	// Modules are only applied on blocks that offer them.
	$r = Plugin::attributes_for( 'core/image', [ 'text' => [ 'effect' => 'blur-reveal' ] ] );
	check( 'module not offered on block', $r['attributes'], [] );
	$r = Plugin::attributes_for( 'core/heading', 'not-an-array' );
	check( 'non-array attribute ignored', $r['attributes'], [] );

	// Several modules on one block.
	$r = Plugin::attributes_for( 'core/cover', [ 'children' => [ 'animation' => 'zoom' ], 'gradient' => [ 'type' => 'mesh' ] ] );
	check( 'cover children root default', $r['attributes']['data-aurora-children-options'] ?? null, '{"root":".wp-block-cover__inner-container"}' );
	check( 'cover gradient primary', $r['attributes']['data-aurora-gradient'] ?? null, 'mesh' );
	check( 'cover modules', $r['modules'], [ 'children', 'gradient' ] );

	// Heading gradient defaults to painting the text.
	$r = Plugin::attributes_for( 'core/heading', [ 'gradient' => [ 'type' => 'linear' ] ] );
	check( 'heading gradient paints text', $r['attributes']['data-aurora-gradient-options'] ?? null, '{"target":"text"}' );

	// Cursor: no primary option, so the attribute is empty; options as usual.
	$r = Plugin::attributes_for( 'core/group', [ 'cursor' => [] ] );
	check( 'cursor attribute present and empty', $r['attributes']['data-aurora-cursor'] ?? null, '' );
	check( 'cursor without options', isset( $r['attributes']['data-aurora-cursor-options'] ), false );
	$r = Plugin::attributes_for( 'core/cover', [ 'cursor' => [ 'dotColor' => '#000000', 'ringSize' => 999 ] ] );
	check( 'cursor options clamped', $r['attributes']['data-aurora-cursor-options'] ?? null, '{"dotColor":"#000000","ringSize":200}' );
	check( 'cursor not offered on heading', Plugin::attributes_for( 'core/heading', [ 'cursor' => [] ] )['attributes'], [] );

	// Morph Card: states are cleaned, unsafe values dropped, placeholder used.
	$o = Morph_Card_Block::options(
		[
			'states'        => [
				[ 'template' => 'post', 'photo' => 'https://x.test/a.jpg', 'username' => '<b>flora</b>', 'likes' => '12', 'bogus' => 1 ],
				[ 'template' => 'custom', 'photo' => 'javascript:alert(1)', 'headerHtml' => '<script>x</script>' ],
				[ 'template' => 'polaroid', 'caption' => 'Hi', 'size' => 'mini', 'frame' => 'neon', 'durationMs' => 99 ],
				'not-a-state',
			],
			'loop'          => false,
			'autoplay'      => true,
			'captionEffect' => 'letters',
			'labels'        => [ 'likes' => 'μου αρέσει', 'unknown' => 'x', 'follow' => '' ],
		]
	);
	check( 'morph: three valid states kept', count( $o['states'] ), 3 );
	check( 'morph: post state', $o['states'][0], [ 'template' => 'post', 'photo' => 'https://x.test/a.jpg', 'username' => 'flora', 'likes' => 12 ] );
	check( 'morph: custom template becomes post', $o['states'][1]['template'], 'post' );
	check( 'morph: unsafe photo replaced by placeholder', $o['states'][1]['photo'], Morph_Card_Block::placeholder() );
	check( 'morph: raw html dropped', isset( $o['states'][1]['headerHtml'] ), false );
	check( 'morph: polaroid size kept, bad frame dropped, duration clamped', $o['states'][2], [ 'template' => 'polaroid', 'photo' => Morph_Card_Block::placeholder(), 'caption' => 'Hi', 'size' => 'mini', 'durationMs' => 500 ] );
	check( 'morph: options differ from defaults only', [ $o['loop'] ?? null, isset( $o['autoplay'] ), $o['captionEffect'] ?? null ], [ false, false, 'letters' ] );
	check( 'morph: labels filtered', $o['labels'], [ 'likes' => 'μου αρέσει' ] );

	$g = Morph_Card_Block::state( [ 'template' => 'profile', 'gridPhotos' => [ [ 'url' => 'https://x.test/1.jpg', 'id' => 3 ], 'https://x.test/2.jpg', 'ftp://bad', [ 'url' => 'javascript:x' ] ] ] );
	check( 'morph: profile grid photos cleaned', $g['gridPhotos'] ?? null, [ 'https://x.test/1.jpg', 'https://x.test/2.jpg' ] );
	check( 'morph: grid photos only on profile', isset( Morph_Card_Block::state( [ 'template' => 'post', 'gridPhotos' => [ 'https://x.test/1.jpg' ] ] )['gridPhotos'] ), false );

	$block = Morph_Card_Block::instance();
	$html  = $block->render( [ 'states' => [ [ 'template' => 'polaroid', 'photo' => 'https://x.test/p.jpg', 'caption' => 'A "quote"' ] ] ] );
	check( 'morph: render has the data attribute', strpos( $html, 'data-aurora-morph-card=""' ) !== false, true );
	check( 'morph: render escapes the options json', strpos( $html, 'data-aurora-morph-card-options="{&quot;states&quot;' ) !== false, true );
	check( 'morph: fallback image and caption', strpos( $html, '<img src="https://x.test/p.jpg" alt="A &quot;quote&quot;"' ) !== false, true );
	check( 'morph: script enqueued', in_array( 'aurora-morph-card', $GLOBALS['enqueued'], true ), true );
	check( 'morph: no states renders nothing', $block->render( [ 'states' => [] ] ), '' );

	// The aurora_blocks_targets filter can offer a module on another block.
	$GLOBALS['filters']['aurora_blocks_targets'] = function ( $t ) {
		$t['text']['my/title'] = [ 'target' => '.t' ];
		return $t;
	};
	$reflection = new ReflectionProperty( Aurora\Blocks\Block_Targets::class, 'targets' );
	$reflection->setAccessible( true );
	$reflection->setValue( null, null );
	$r = Plugin::attributes_for( 'my/title', [ 'text' => [] ] );
	check( 'filter adds a block', $r['attributes']['data-aurora-text-options'] ?? null, '{"target":".t"}' );

	echo $failed ? "\n$failed failed\n" : "\nAll passed\n";
	exit( $failed ? 1 : 0 );
}
