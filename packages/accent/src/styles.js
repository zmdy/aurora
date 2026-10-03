export var css = `
.aurora-accent{position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:0}
.aurora-accent path{fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;stroke-dasharray:1 1;stroke-dashoffset:1}
.aurora-accent.is-visible path{animation-name:aurora-accent-draw;animation-duration:var(--aurora-accent-duration,700ms);animation-timing-function:var(--aurora-accent-easing,cubic-bezier(.16,1,.3,1));animation-delay:var(--aurora-accent-delay,0ms);animation-fill-mode:forwards}
.aurora-accent.is-drawn path{stroke-dashoffset:0}
@keyframes aurora-accent-draw{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.aurora-accent path{stroke-dashoffset:0;animation:none}}
`;
