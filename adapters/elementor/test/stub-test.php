<?php
/**
 * Smoke test of the Elementor adapter against minimal WordPress/Elementor stubs.
 * Run: php adapters/elementor/test/stub-test.php
 * It checks control generation and the attributes rendered for each module.
 * It does not replace testing inside a real WordPress + Elementor install.
 */
namespace Elementor {
	class Controls_Manager { const TAB_ADVANCED='advanced'; const TAB_STYLE='style'; const NUMBER='number'; const SWITCHER='switcher'; const SELECT='select'; const COLOR='color'; const TEXT='text'; const TEXTAREA='textarea'; const HEADING='heading'; const RAW_HTML='raw'; const REPEATER='repeater'; const MEDIA='media'; const SLIDER='slider'; const HIDDEN='hidden'; const DIVIDER='divider'; const SELECT2='select2'; }
	class Repeater { public $c=[]; function add_control($k,$a){$this->c[$k]=$a;} function get_controls(){return $this->c;} }
	class Utils { static function get_placeholder_image_src(){return 'ph.png';} }
	class Element_Base { public $name; public $controls=[]; public $settings=[]; public $attrs=[];
		function __construct($n,$s=[]){$this->name=$n;$this->settings=$s;}
		function get_name(){return $this->name;} function get_controls($id=null){return $id? ($this->controls[$id]??null):$this->controls;}
		function start_controls_section($id,$a){$this->controls[$id]=$a;} function end_controls_section(){}
		function add_control($id,$a){$this->controls[$id]=$a;} function add_responsive_control($id,$a){$this->controls[$id]=$a;}
		function get_settings_for_display(){return $this->settings;}
		function add_render_attribute($k,$v=null){ if(is_array($k)){foreach($k as $a=>$b)$this->attrs[$a]=$b;} else {$this->attrs[$k]=$v;} }
		function get_render_attribute_string($k){$o='';foreach($this->attrs as $a=>$v)$o.=$a.'="'.htmlspecialchars((string)$v).'" ';return $o;} }
	class Widget_Base extends Element_Base { function __construct(){} function add_group_control($k,$a){$this->controls[$a['name']]=$a;} }
	class Group_Control_Typography { static function get_type(){return 'typography';} }
}
namespace {
	define('ABSPATH','/'); define('AURORA_PATH',dirname(__DIR__).'/'); define('AURORA_URL','/p/'); define('AURORA_VERSION','1');
	$GLOBALS['hooks']=[]; $GLOBALS['enq']=[];
	function add_action($h,$c,$p=10,$a=1){$GLOBALS['hooks'][]=$h;} function add_filter(){}
	function esc_html__($s){return $s;} function esc_html($s){return $s;} function esc_attr($s){return $s;} function __($s){return $s;}
	function wp_json_encode($v){return json_encode($v,JSON_UNESCAPED_SLASHES);}
	function wp_register_script($h){$GLOBALS['reg'][]=$h;} function wp_enqueue_script($h){$GLOBALS['enq'][$h]=1;} function wp_script_is($h,$w){return in_array($h,$GLOBALS['reg']??[]);}
	function is_admin(){return false;} function get_option($n,$d=false){return $d;} function register_setting(){} function wp_localize_script(){}
	spl_autoload_register(function($c){ if(strpos($c,'Aurora\\')!==0)return; $n=substr($c,7); $f=AURORA_PATH.'includes/class-'.strtolower(str_replace('_','-',$n)).'.php'; if(file_exists($f))require $f; });
	function check($ok,$m){echo ($ok?'ok   ':'FAIL ').$m."\n"; if(!$ok)$GLOBALS['fail']=1;}

	$mods = Aurora\Module_Manager::init();
	check(count($mods)>=4,'modules loaded: '.implode(',',array_keys($mods)));
	Aurora\Plugin_Core::instance();
	check(count($GLOBALS['hooks'])>0,'hooks registered: '.count($GLOBALS['hooks']));

	$h = new Elementor\Element_Base('heading');
	$mod = $mods['text'] ?? null;
	$mod->add_controls($h,[]);
	check(isset($h->controls['aurora_text_enable']),'text: enable control on heading');
	check(isset($h->controls['aurora_text_effect']),'text: effect control');

	$h2 = new Elementor\Element_Base('heading',['aurora_text_enable'=>'yes','aurora_text_effect'=>'blur-reveal']);
	$r=(new ReflectionMethod($mod,'get_render_attributes')); $r->setAccessible(true);
	$a=$r->invoke($mod,$h2->settings,$h2);
	check(($a['data-aurora-text']??null)==='blur-reveal','text primary attr: '.json_encode($a));
	check(isset($a['data-aurora-text-options']) && strpos($a['data-aurora-text-options'],'.elementor-heading-title')!==false,'text target derived');
	check(!empty($GLOBALS['enq']['aurora-text']),'text script enqueued');
	$off=$r->invoke($mod,['aurora_text_enable'=>''],$h2); check($off===[],'disabled renders nothing');

	$g=$mods['gradient']; $rg=new ReflectionMethod($g,'get_render_attributes'); $rg->setAccessible(true);
	$box=new Elementor\Element_Base('icon-box',['aurora_gradient_enable'=>'yes','aurora_gradient_paint'=>'icon','aurora_gradient_stops'=>[['color'=>'#f00','offset'=>''],['color'=>'#00f','offset'=>70]]]);
	$ga=$rg->invoke($g,$box->settings,$box); echo json_encode($ga)."\n";
	check(strpos($ga['data-aurora-gradient-options']??'','#f00;#00f 70')!==false,'gradient stops serialized');
	check(strpos($ga['data-aurora-gradient-options']??'','"target":"icon"')!==false,'gradient icon paint');

	$c=$mods['children']; $rc=new ReflectionMethod($c,'get_render_attributes'); $rc->setAccessible(true);
	$con=new Elementor\Element_Base('container',['aurora_children_enable'=>'yes','aurora_children_choice'=>'widgets']);
	$ca=$rc->invoke($c,$con->settings,$con); echo json_encode($ca)."\n";
	check(strpos($ca['data-aurora-children-options']??'','.elementor-widget')!==false,'children selector');

	$w=new Aurora\Morph_Card_Widget();
	$o=Aurora\Morph_Card_Widget::options_from_settings(['loop'=>'','states'=>[['template'=>'profile','username'=>'ana','likes'=>'','photo'=>['url'=>'a.jpg'],'duration_ms'=>2000]],'label_follow'=>'Seguir']);
	echo json_encode($o)."\n";
	check($o['loop']===false && $o['states'][0]['photo']==='a.jpg' && $o['labels']['follow']==='Seguir','morph-card options');
	$rw=new ReflectionMethod($w,'register_controls'); $rw->setAccessible(true); $rw->invoke($w);

    $headline = new Aurora\Animated_Headline_Widget();
    $rh = new ReflectionMethod($headline, 'register_controls'); $rh->setAccessible(true); $rh->invoke($headline);
    check(isset($headline->controls['beforeText'], $headline->controls['highlightedText'], $headline->controls['afterText']), 'headline content controls');
    check(($headline->controls['animationShape']['condition']['animationStyle'] ?? '') === 'highlighted', 'headline shape condition');
    check(($headline->controls['rotatingText']['type'] ?? '') === 'textarea', 'headline multiline rotating phrases');
    $ho = Aurora\Animated_Headline_Widget::options_from_settings(['animationStyle'=>'rotating','beforeText'=>'Build','highlightedText'=>'better','afterText'=>'sites','rotatingText'=>"brighter\noriginal",'headlineLoop'=>'','duration'=>-4]);
    check($ho['mode']==='headline' && $ho['headlineLoop']===false && $ho['duration']===50 && $ho['trigger']==='load', 'headline shared options and bounds');
    check($headline->get_script_depends()===['aurora-text'], 'headline reuses text module');
    $headline->settings=['html_tag'=>'script', 'beforeText'=>'Build', 'highlightedText'=>'better', 'afterText'=>'sites'];
    $render = new ReflectionMethod($headline,'render'); $render->setAccessible(true);
    ob_start(); $render->invoke($headline); $markup=ob_get_clean();
    check(strpos($markup,'<h2 ')===0 && strpos($markup,'Build better sites')!==false && strpos($markup,'data-aurora-text-mode="headline"')!==false, 'headline semantic fallback and safe tag');
    $manager = new class { public $widgets=[]; function register($w){$this->widgets[]=$w->get_name();} };
    Aurora\Plugin_Core::instance()->register_widgets($manager);
    check(in_array('aurora-animated-headline',$manager->widgets,true), 'headline widget registered');
	exit(empty($GLOBALS['fail'])?0:1);
}
