/**
 * The drawing itself.
 *
 * The shape geometry comes from the animated-headlines manifest, but the
 * marker is drawn here rather than by mounting that component: this module
 * decorates text an author already wrote, and must not rewrite it. The
 * motion follows the library's - the pen travels at a steady speed and the
 * softness lives in the dissolve, not in a decelerating stroke.
 */
export var css = `
.aurora-highlight{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
width:calc(100% + var(--ah-highlight-bleed-x,.35em) * 2);
height:calc(100% + var(--ah-highlight-bleed-y,.3em) * 2);
overflow:visible;pointer-events:none;z-index:0}
.aurora-highlight path{fill:none;stroke:var(--ah-highlight-color,#e63946);
stroke-width:var(--ah-highlight-width,7px);stroke-linecap:round;stroke-linejoin:round;
vector-effect:non-scaling-stroke;stroke-dasharray:100 100;stroke-dashoffset:100}
.aurora-highlight.is-visible path{animation-name:aurora-highlight-draw;
animation-duration:var(--ah-draw-duration,1.1s);animation-timing-function:linear;
animation-fill-mode:both}
.aurora-highlight.is-visible path:nth-of-type(2){animation-delay:calc(var(--ah-draw-duration,1.1s) * .45)}
.aurora-highlight.is-visible path:nth-of-type(3){animation-delay:calc(var(--ah-draw-duration,1.1s) * .9)}
.aurora-highlight.is-visible path:nth-of-type(4){animation-delay:calc(var(--ah-draw-duration,1.1s) * 1.35)}
.aurora-highlight.is-drawn path{stroke-dashoffset:0}

/* The marker reads as ink, not a line: blunt, thick, behind the text. */
.aurora-highlight[data-shape="marker"]{z-index:-1}
.aurora-highlight[data-shape="marker"] path{stroke-linecap:butt;opacity:.55;
stroke:var(--ah-highlight-color,#ffd166);stroke-width:var(--ah-highlight-width,42px)}

/* Every path after the underline of "spark" is a twinkle: filled, scaled from
   its own centre, and popped in once the line beneath it has landed. */
.aurora-highlight[data-shape="spark"] path:nth-of-type(n+2){fill:var(--ah-highlight-color,#e63946);
stroke:none;transform-box:fill-box;transform-origin:center}
.aurora-highlight[data-shape="spark"].is-visible path:nth-of-type(n+2){animation-name:aurora-highlight-spark;animation-delay:0s}
.aurora-highlight[data-shape="corner-ticks"].is-visible path:nth-of-type(2){animation-delay:calc(var(--ah-draw-duration,1.1s) * .12)}
.aurora-highlight[data-shape="corner-ticks"].is-visible path:nth-of-type(3){animation-delay:calc(var(--ah-draw-duration,1.1s) * .24)}
.aurora-highlight[data-shape="corner-ticks"].is-visible path:nth-of-type(4){animation-delay:calc(var(--ah-draw-duration,1.1s) * .36)}

@keyframes aurora-highlight-draw{from{stroke-dashoffset:100}to{stroke-dashoffset:0}}
@keyframes aurora-highlight-spark{0%,55%{opacity:0;transform:scale(0) rotate(-35deg)}
82%{opacity:1;transform:scale(1.18) rotate(6deg)}100%{opacity:1;transform:scale(1) rotate(0)}}

@media (prefers-reduced-motion:reduce){
.aurora-highlight path{stroke-dashoffset:0;animation:none!important}
.aurora-highlight[data-shape="spark"] path:nth-of-type(n+2){opacity:1;transform:none}
}
`;
