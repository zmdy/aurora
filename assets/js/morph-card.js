// ==========================================================================
// AURORA — MORPH CARD
// ==========================================================================
// A card component with a fixed inner DOM (.morph-header, .morph-image,
// .morph-footer) that can render itself as one of N "templates" (Instagram
// post, Instagram profile, Polaroid, custom) and then MORPH from one
// template into another with a smooth interpolation of the frame + a
// typewriter/letters caption reveal.
//
// The core morphing engine is a generalized version of the site_memoriarte
// prototype's morphToPolaroid(): before swapping the target CSS class we
// pin every computed frame value (radius, padding, rotate, image radius,
// aspect-ratio) as inline style, then let Motion One interpolate to the
// target values. Elements that don't exist in the target template are
// COLLAPSED (opacity+height+padding → 0) rather than removed, so there's
// no layout jump.
//
// The plugin's widget-side "sequence" is a thin loop on top of this engine:
// render the first state → wait state[i].durationMs → morphTo(state[i+1])
// → repeat. Loop toggle wraps from last back to first.
//
// Depends on Motion One (globals: Motion.animate) and Anime.js
// (global: anime) — both enqueued by Asset_Manager.
// ==========================================================================
( function ( $ ) {
	'use strict';

	// ── Guard: skip if Motion One never loaded ──────────────────────────────
	if ( typeof window.Motion === 'undefined' ) {
		// eslint-disable-next-line no-console
		console.warn( '[Aurora Morph Card] Motion One is missing — sequence disabled.' );
	}

	// ── MorphCard ───────────────────────────────────────────────────────────
	class MorphCard {

		// Proportions of each polaroid size (mirrors the .card-polaroid CSS rules).
		static POLAROID_SIZES = {
			'normal':        { photoRatio: '1 / 1', radius: 3, paddingTop: 16, paddingSides: 16, paddingBottom: 56, rotate: -2 },
			'instax':        { photoRatio: '3 / 4', radius: 3, paddingTop: 14, paddingSides: 14, paddingBottom: 64, rotate: -2 },
			'instax-square': { photoRatio: '1 / 1', radius: 3, paddingTop: 14, paddingSides: 14, paddingBottom: 48, rotate: -2 },
			'horizontal':    { photoRatio: '4 / 3', radius: 3, paddingTop: 14, paddingSides: 14, paddingBottom: 48, rotate: -2 },
			'mini':          { photoRatio: '3 / 4', radius: 3, paddingTop: 10, paddingSides: 10, paddingBottom: 40, rotate: -2 }
		};

		// Timing defaults shared across the frame/caption interpolation. Can be
		// overridden per morphTo() call.
		static DEFAULT_MORPH_TIMING = {
			stripDuration: 0.7,
			stripStagger: 0.2,
			frameDuration: 1.6,
			frameDelay: 0.15,
			captionDelay: 1.1,
			captionOutDuration: 0.4,
			captionInDuration: 0.5,
			captionEffect: 'typewriter',
			typewriterMinDelay: 55,
			typewriterMaxDelay: 40,
			lettersStagger: 20,
			lettersStartDelay: 0,
			lettersDuration: 1100
		};

		static CAPTION_FONT_REFERENCE_WIDTH = 320;
		static CAPTION_FONT_REFERENCE_SIZE  = 21.6;
		static CAPTION_FONT_MIN = 11;
		static CAPTION_FONT_MAX = 22;

		constructor( rootEl ) {
			this.root   = rootEl;
			this.header = rootEl.querySelector( '.morph-header' );
			this.image  = rootEl.querySelector( '.morph-image' );
			this.footer = rootEl.querySelector( '.morph-footer' );
			this.mode   = null;
		}

		// ── Rendering: template dispatchers ─────────────────────────────────

		renderState( state ) {
			switch ( state.template ) {
				case 'polaroid':  return this.renderAsPolaroid( state );
				case 'profile':   return this.renderAsProfile( state );
				case 'custom':    return this.renderAsCustom( state );
				case 'instagram':
				default:          return this.renderAsInstagram( state );
			}
		}

		renderAsInstagram( data ) {
			this.mode = 'instagram';
			this._resetRootStyles();
			this.root.classList.remove( 'card-polaroid', 'card-profile', 'card-custom' );
			this.root.classList.add( 'card-instagram' );

			const avatar   = data.avatar || data.photo || '';
			const username = data.username || '';
			const subtext  = data.subtext || '';
			const likes    = data.likes || 0;
			this._igLikes  = likes;

			this.header.className = 'morph-header ig-header';
			this.header.style.cssText = '';
			this.header.innerHTML = `
				<span class="ig-avatar-ring">
					<img src="${ avatar }" alt="${ this._escAttr( username ) }" class="ig-avatar-img">
				</span>
				<div class="ig-header-text">
					<p class="ig-username">${ this._escHtml( username ) }</p>
					<p class="ig-subtext">${ this._escHtml( subtext ) }</p>
				</div>
				<i class="fa-solid fa-ellipsis ig-more"></i>
			`;

			this.image.className     = 'morph-image ig-photo-wrap';
			this.image.style.aspectRatio  = '';
			this.image.style.borderRadius = '';
			this.image.innerHTML = `
				<img class="ig-photo-item" src="${ data.photo || '' }" alt="${ this._escAttr( data.caption || '' ) }" style="opacity:1;">
				<div class="ig-heart-burst"><i class="fa-solid fa-heart"></i></div>
			`;

			this.footer.className = 'morph-footer';
			this.footer.innerHTML = `
				<div class="ig-actions">
					<i class="fa-regular fa-heart ig-icon ig-icon-like"></i>
					<i class="fa-regular fa-comment ig-icon"></i>
					<i class="fa-regular fa-paper-plane ig-icon"></i>
					<i class="fa-regular fa-bookmark ig-icon ig-icon-save"></i>
				</div>
				<div class="ig-meta">
					<p class="ig-likes"><span class="ig-likes-count">${ likes }</span> curtidas</p>
					<p class="ig-caption"><span class="ig-caption-user">${ this._escHtml( username ) }</span> <span class="ig-caption-text">${ this._escHtml( data.caption || '' ) }</span></p>
					<p class="ig-comments">Ver todos os comentários</p>
				</div>
			`;
			return this;
		}

		renderAsCustom( data ) {
			this.mode = 'custom';
			this._resetRootStyles();
			this.root.classList.remove( 'card-instagram', 'card-polaroid', 'card-profile' );
			this.root.classList.remove( 'frame-classic', 'frame-vintage', 'frame-pink', 'frame-dark', 'frame-floral' );
			this.root.classList.add( 'card-custom' );

			// Width/height/padding/radius/rotate/bg all come from the state
			// data — the whole point of the Custom template is that the
			// user paints the frame themselves.
			if ( data.width )  this.root.style.width = `${ data.width }px`;
			if ( data.height ) this.root.style.height = `${ data.height }px`;
			this.root.style.padding      = `${ data.paddingTop || 0 }px ${ data.paddingSides || 0 }px ${ data.paddingBottom || 0 }px`;
			this.root.style.borderRadius = `${ data.radius || 0 }px`;
			this.root.style.rotate       = `${ data.rotate || 0 }deg`;
			if ( data.bgColor ) this.root.style.background = data.bgColor;

			this.header.className = 'morph-header';
			this.header.style.display = data.headerHtml ? '' : 'none';
			this.header.innerHTML = data.headerHtml || '';

			this.image.className         = 'morph-image';
			this.image.style.aspectRatio  = '';
			this.image.style.borderRadius = '';
			if ( data.photo ) {
				this.image.innerHTML = `<img class="morph-image-photo" src="${ data.photo }" alt="${ this._escAttr( data.caption || '' ) }">`;
			} else {
				this.image.innerHTML = '';
				this.image.style.display = 'none';
			}

			this.footer.className = 'morph-footer';
			this.footer.style.display = data.footerHtml ? '' : 'none';
			this.footer.innerHTML = data.footerHtml || '';
			return this;
		}

		renderAsProfile( data ) {
			this.mode = 'profile';
			this._resetRootStyles();
			this.root.classList.remove( 'card-instagram', 'card-polaroid', 'card-custom' );
			this.root.classList.add( 'card-profile' );

			const stats = {
				posts:     data.posts || 0,
				followers: data.followers || 0,
				following: data.following || 0
			};
			const photos = Array.isArray( data.gridPhotos ) ? data.gridPhotos : [];

			this.header.className = 'morph-header';
			this.header.innerHTML = `
				<div class="morph-profile-top">
					<span class="morph-profile-avatar-ring">
						<img src="${ data.avatar || data.photo || '' }" alt="${ this._escAttr( data.username || data.name || '' ) }" class="morph-profile-avatar-img">
					</span>
					<div class="morph-profile-stats">
						<div class="morph-profile-stat"><strong>${ stats.posts }</strong><span>Posts</span></div>
						<div class="morph-profile-stat"><strong>${ stats.followers }</strong><span>Seguidores</span></div>
						<div class="morph-profile-stat"><strong>${ stats.following }</strong><span>Seguindo</span></div>
					</div>
				</div>
				<div class="morph-profile-info">
					<p class="morph-profile-name">${ this._escHtml( data.name || '' ) }</p>
					<p class="morph-profile-bio">${ this._escHtml( data.bio || '' ) }</p>
				</div>
				<div class="morph-profile-actions">
					<button class="morph-profile-btn morph-profile-btn-primary" type="button">Seguir</button>
					<button class="morph-profile-btn morph-profile-btn-secondary" type="button">Mensagem</button>
					<button class="morph-profile-btn morph-profile-btn-icon" type="button" aria-label="E-mail"><i class="fa-regular fa-envelope"></i></button>
				</div>
				<div class="morph-profile-tabs">
					<span class="morph-profile-tab active"><i class="fa-solid fa-table-cells"></i></span>
					<span class="morph-profile-tab"><i class="fa-solid fa-clapperboard"></i></span>
					<span class="morph-profile-tab"><i class="fa-regular fa-bookmark"></i></span>
				</div>
			`;

			this.image.className          = 'morph-image';
			this.image.style.aspectRatio  = '';
			this.image.style.borderRadius = '';
			this.image.innerHTML = `
				<div class="morph-profile-grid">
					${ photos.map( ( src ) => `<div class="morph-profile-grid-item"><img src="${ src }" alt=""></div>` ).join( '' ) }
				</div>
			`;

			this.footer.className = 'morph-footer';
			this.footer.innerHTML = '';
			return this;
		}

		renderAsPolaroid( data ) {
			const size = ( data.size && MorphCard.POLAROID_SIZES[ data.size ] ) ? data.size : 'normal';
			const cfg  = MorphCard.POLAROID_SIZES[ size ];

			this.mode = 'polaroid';
			this.root.classList.remove( 'card-instagram', 'card-profile', 'card-custom' );
			this.root.classList.remove( 'frame-classic', 'frame-vintage', 'frame-pink', 'frame-dark', 'frame-floral' );
			this.root.classList.add( 'card-polaroid' );
			if ( data.frame ) {
				this.root.classList.add( `frame-${ data.frame }` );
			}
			this.root.style.borderRadius = `${ cfg.radius }px`;
			this.root.style.padding      = `${ cfg.paddingTop }px ${ cfg.paddingSides }px ${ cfg.paddingBottom }px`;
			this.root.style.rotate       = `${ cfg.rotate }deg`;

			this.header.className = 'morph-header';
			this.header.innerHTML = '';

			this.image.className         = 'morph-image';
			this.image.style.aspectRatio = cfg.photoRatio;
			this.image.style.borderRadius = '0px';
			this.image.innerHTML = `<img class="morph-image-photo" src="${ data.photo || '' }" alt="${ this._escAttr( data.caption || '' ) }">`;

			this.footer.className = 'morph-footer';
			this.footer.innerHTML = `<p class="morph-caption ig-caption-as-polaroid"><span class="morph-caption-text">${ this._escHtml( data.caption || '' ) }</span></p>`;

			const captionEl = this.footer.querySelector( '.morph-caption' );
			if ( captionEl ) {
				captionEl.style.fontSize = `${ this._captionFontSizeForWidth().toFixed( 1 ) }px`;
			}
			return this;
		}

		// ── Morphing engine ─────────────────────────────────────────────────

		/**
		 * Generalized morph: interpolates the shared frame between any two
		 * templates, re-renders inner HTML for the target template, and (for
		 * polaroid targets) plays a typewriter/letters reveal on the caption.
		 *
		 * For non-polaroid targets the interpolation is simpler: pin current
		 * frame, swap class, re-render, done. Only the polaroid case has the
		 * shimmer + caption reveal because that's where the "wow" of the
		 * original prototype lives.
		 */
		morphTo( state, timing = {} ) {
			if ( typeof window.Motion === 'undefined' ) {
				this.renderState( state );
				return Promise.resolve( this );
			}

			// Per-state transition duration override: converts the ms value
			// stored on the state (widget-side) into the seconds Motion One
			// expects and stretches the caption reveal proportionally so
			// the whole morph reads as one motion instead of two.
			const merged = Object.assign( {}, timing );
			if ( state.transitionDurationMs ) {
				const frameSeconds = state.transitionDurationMs / 1000;
				const defaultFrame = MorphCard.DEFAULT_MORPH_TIMING.frameDuration;
				const scale = frameSeconds / defaultFrame;
				merged.frameDuration      = frameSeconds;
				merged.stripDuration      = MorphCard.DEFAULT_MORPH_TIMING.stripDuration * scale;
				merged.captionDelay       = MorphCard.DEFAULT_MORPH_TIMING.captionDelay * scale;
				merged.captionOutDuration = MorphCard.DEFAULT_MORPH_TIMING.captionOutDuration * scale;
				merged.captionInDuration  = MorphCard.DEFAULT_MORPH_TIMING.captionInDuration * scale;
			}

			// Polaroid destination gets the rich transition (frame interpolate
			// + caption typewriter). Everything else is a simple re-render
			// with a crossfade — good enough visually, without hardcoding a
			// dedicated animation for every (from, to) pair.
			if ( 'polaroid' === state.template ) {
				return this._morphToPolaroid( state, merged );
			}
			return this._morphCrossfade( state, merged );
		}

		_morphCrossfade( state, timing ) {
			const { animate } = window.Motion;
			const t = Object.assign( {}, MorphCard.DEFAULT_MORPH_TIMING, timing );

			return animate( this.root, { opacity: [ 1, 0 ] }, { duration: t.captionOutDuration, easing: 'ease-in' } )
				.finished.then( () => {
					this.renderState( state );
					return animate( this.root, { opacity: [ 0, 1 ] }, { duration: t.captionInDuration, easing: 'ease-out' } ).finished;
				} )
				.then( () => this );
		}

		_morphToPolaroid( state, timing ) {
			const { animate } = window.Motion;
			const t = Object.assign( {}, MorphCard.DEFAULT_MORPH_TIMING, timing );

			const size = ( state.size && MorphCard.POLAROID_SIZES[ state.size ] ) ? state.size : 'normal';
			const cfg  = MorphCard.POLAROID_SIZES[ size ];

			// Pin every computed frame value BEFORE swapping the class — this
			// is the whole trick that keeps the interpolation from snapping.
			const rootCs = getComputedStyle( this.root );
			const fromRadius     = rootCs.borderRadius;
			const fromPadTop     = rootCs.paddingTop;
			const fromPadLeft    = rootCs.paddingLeft;
			const fromPadRight   = rootCs.paddingRight;
			const fromPadBottom  = rootCs.paddingBottom;
			const fromRotate     = ( rootCs.rotate && 'none' !== rootCs.rotate ) ? rootCs.rotate : '0deg';
			const fromImageRadius = getComputedStyle( this.image ).borderRadius;

			this.root.style.borderRadius = fromRadius;
			this.root.style.paddingTop    = fromPadTop;
			this.root.style.paddingLeft   = fromPadLeft;
			this.root.style.paddingRight  = fromPadRight;
			this.root.style.paddingBottom = fromPadBottom;
			this.root.style.rotate        = fromRotate;
			this.image.style.borderRadius = fromImageRadius;

			// References to the elements that need to fade/collapse
			const header       = this.header;
			const actions      = this.footer.querySelector( '.ig-actions' );
			const likesLine    = this.footer.querySelector( '.ig-likes' );
			const commentsLine = this.footer.querySelector( '.ig-comments' );
			const captionLine  = this.footer.querySelector( '.ig-caption' );
			const dotsEl       = this.image.querySelector( '.ig-dots' );
			const heartBurstEl = this.image.querySelector( '.ig-heart-burst' );

			// Now flip the mode class (colors etc. flip instantly; layout is
			// pinned so no snap)
			this.mode = 'polaroid';
			this.root.classList.remove( 'card-instagram', 'card-profile', 'card-custom' );
			this.root.classList.remove( 'frame-classic', 'frame-vintage', 'frame-pink', 'frame-dark', 'frame-floral' );
			this.root.classList.add( 'card-polaroid' );
			if ( state.frame ) {
				this.root.classList.add( `frame-${ state.frame }` );
			}

			// 1) Collapse the header
			if ( header && header.children.length ) {
				this._collapseElement( header, t.stripDuration, 'ease-in' ).then( () => {
					header.innerHTML = '';
					header.style.height = '';
					header.style.paddingTop = '';
					header.style.paddingBottom = '';
					header.style.overflow = '';
				} );
			}

			// 2) Collapse actions/likes/comments in a small cascade
			[ actions, likesLine, commentsLine ].filter( Boolean ).forEach( ( el ) => {
				setTimeout( () => {
					this._collapseElement( el, t.stripDuration, 'ease-in' ).then( () => el.remove() );
				}, t.stripStagger * 1000 );
			} );

			// 2.1) Fade the dots + heart burst
			const imageExtras = [ dotsEl, heartBurstEl ].filter( Boolean );
			if ( imageExtras.length ) {
				animate( imageExtras, { opacity: [ 1, 0 ] }, { duration: t.stripDuration, easing: 'ease-in' } )
					.finished.then( () => imageExtras.forEach( ( el ) => el.remove() ) );
			}

			// 3) Interpolate the frame (radius, padding, rotate) to polaroid target
			animate( this.root, {
				borderRadius: [ fromRadius, `${ cfg.radius }px` ],
				paddingTop:    [ fromPadTop, `${ cfg.paddingTop }px` ],
				paddingLeft:   [ fromPadLeft, `${ cfg.paddingSides }px` ],
				paddingRight:  [ fromPadRight, `${ cfg.paddingSides }px` ],
				paddingBottom: [ fromPadBottom, `${ cfg.paddingBottom }px` ],
				rotate:        [ fromRotate, `${ cfg.rotate }deg` ]
			}, { duration: t.frameDuration, delay: t.frameDelay, easing: [ 0.22, 1, 0.36, 1 ] } );

			// 4) Image: lose its border-radius; also swap aspect-ratio
			animate( this.image, { borderRadius: [ fromImageRadius, '0px' ] }, { duration: t.frameDuration, delay: t.frameDelay, easing: [ 0.22, 1, 0.36, 1 ] } );
			this.image.style.aspectRatio = cfg.photoRatio;

			// Shimmer sweep across the photo while it reshapes
			this._playShimmerOnImage( t.frameDelay + t.frameDuration + 0.3 );

			// 5) Caption: out → swap → typewriter/letters reveal in
			const morphDone = new Promise( ( resolve ) => {
				const fullText = state.caption || '';

				setTimeout( () => {
					if ( ! captionLine ) {
						this._replaceFooterWithPolaroidCaption( fullText, t ).then( () => resolve( this ) );
						return;
					}
					const fromCaptionHeight = captionLine.offsetHeight;
					const targetFontSize    = this._captionFontSizeForWidth();
					const targetCaptionHeight = this._measureCaptionHeight( fullText, targetFontSize );

					animate( captionLine, {
						opacity: [ 1, 0 ],
						height:  [ `${ fromCaptionHeight }px`, `${ targetCaptionHeight }px` ]
					}, { duration: t.captionOutDuration, easing: 'ease-in' } )
						.finished.then( () => {
							captionLine.classList.remove( 'ig-caption' );
							captionLine.classList.add( 'morph-caption', 'ig-caption-as-polaroid' );
							captionLine.style.height   = `${ targetCaptionHeight }px`;
							captionLine.style.fontSize = `${ targetFontSize.toFixed( 1 ) }px`;
							captionLine.innerHTML = '<span class="morph-caption-text"></span>';
							const textEl = captionLine.querySelector( '.morph-caption-text' );

							animate( captionLine, { opacity: [ 0, 1 ] }, { duration: t.captionInDuration, easing: [ 0.22, 1, 0.36, 1 ] } )
								.finished.then( () => {
									const revealPromise = 'letters' === t.captionEffect
										? this._revealCaptionLetters( textEl, fullText, t )
										: this._typewriteCaption( textEl, fullText, t );
									revealPromise.then( () => {
										captionLine.style.height = '';
										resolve( this );
									} );
								} );
						} );
				}, t.captionDelay * 1000 );
			} );

			return morphDone;
		}

		_replaceFooterWithPolaroidCaption( text, t ) {
			this.footer.innerHTML = `<p class="morph-caption ig-caption-as-polaroid"><span class="morph-caption-text"></span></p>`;
			const captionEl = this.footer.querySelector( '.morph-caption' );
			const textEl    = this.footer.querySelector( '.morph-caption-text' );
			if ( captionEl ) {
				captionEl.style.fontSize = `${ this._captionFontSizeForWidth().toFixed( 1 ) }px`;
			}
			if ( ! textEl ) return Promise.resolve( this );
			return 'letters' === t.captionEffect
				? this._revealCaptionLetters( textEl, text, t )
				: this._typewriteCaption( textEl, text, t );
		}

		// ── Utilities ───────────────────────────────────────────────────────

		_resetRootStyles() {
			this.root.style.borderRadius = '';
			this.root.style.padding      = '';
			this.root.style.paddingTop    = '';
			this.root.style.paddingLeft   = '';
			this.root.style.paddingRight  = '';
			this.root.style.paddingBottom = '';
			this.root.style.rotate       = '';
			this.root.style.width        = '';
			this.root.style.height       = '';
		}

		_captionFontSizeForWidth( width ) {
			const effectiveWidth = width || this.root.getBoundingClientRect().width || MorphCard.CAPTION_FONT_REFERENCE_WIDTH;
			const ratio = effectiveWidth / MorphCard.CAPTION_FONT_REFERENCE_WIDTH;
			const size  = ratio * MorphCard.CAPTION_FONT_REFERENCE_SIZE;
			return Math.max( MorphCard.CAPTION_FONT_MIN, Math.min( MorphCard.CAPTION_FONT_MAX, size ) );
		}

		_collapseElement( el, duration, easing ) {
			if ( ! el || typeof window.Motion === 'undefined' ) return Promise.resolve();
			const { animate } = window.Motion;
			const cs = getComputedStyle( el );
			const fromHeight     = el.offsetHeight;
			const fromPadTop     = cs.paddingTop;
			const fromPadBottom  = cs.paddingBottom;
			el.style.overflow      = 'hidden';
			el.style.height        = `${ fromHeight }px`;
			el.style.paddingTop    = fromPadTop;
			el.style.paddingBottom = fromPadBottom;
			return animate( el, {
				opacity:       [ 1, 0 ],
				height:        [ `${ fromHeight }px`, '0px' ],
				paddingTop:    [ fromPadTop, '0px' ],
				paddingBottom: [ fromPadBottom, '0px' ]
			}, { duration, easing } ).finished;
		}

		_typewriteCaption( el, text, timing ) {
			return new Promise( ( resolve ) => {
				el.textContent = '';
				let i = 0;
				const step = () => {
					if ( ! el.isConnected ) { resolve( this ); return; }
					if ( i < text.length ) {
						el.textContent += text.charAt( i );
						i++;
						setTimeout( step, timing.typewriterMinDelay + Math.random() * timing.typewriterMaxDelay );
					} else {
						resolve( this );
					}
				};
				step();
			} );
		}

		_revealCaptionLetters( el, text, timing ) {
			if ( typeof window.anime === 'undefined' ) {
				el.textContent = text;
				return Promise.resolve( this );
			}
			el.textContent = '';
			text.split( /(\s+)/ ).forEach( ( part ) => {
				if ( '' === part.trim() ) {
					el.appendChild( document.createTextNode( part ) );
					return;
				}
				const wordSpan = document.createElement( 'span' );
				wordSpan.className = 'word';
				for ( let i = 0; i < part.length; i++ ) {
					const letterSpan = document.createElement( 'span' );
					letterSpan.className = 'letter';
					letterSpan.textContent = part[ i ];
					wordSpan.appendChild( letterSpan );
				}
				el.appendChild( wordSpan );
			} );
			const letters = el.querySelectorAll( '.letter' );
			if ( ! letters.length ) return Promise.resolve( this );
			return new Promise( ( resolve ) => {
				window.anime( {
					targets:  letters,
					opacity:  [ 0, 1 ],
					translateY: [ 35, 0 ],
					rotateX:  [ -45, 0 ],
					filter:   [ 'blur(12px)', 'blur(0px)' ],
					delay:    window.anime.stagger( timing.lettersStagger, { start: timing.lettersStartDelay } ),
					duration: timing.lettersDuration,
					easing:   'easeOutExpo',
					complete: () => resolve( this )
				} );
			} );
		}

		_measureCaptionHeight( text, fontSize ) {
			const probe = document.createElement( 'p' );
			probe.className = 'morph-caption ig-caption-as-polaroid';
			probe.style.visibility   = 'hidden';
			probe.style.position     = 'absolute';
			probe.style.pointerEvents = 'none';
			probe.style.left         = '-9999px';
			probe.style.width        = `${ this.footer.clientWidth }px`;
			if ( fontSize ) probe.style.fontSize = `${ fontSize }px`;
			probe.innerHTML = `<span class="morph-caption-text">${ this._escHtml( text ) }</span>`;
			this.footer.appendChild( probe );
			const h = probe.offsetHeight;
			probe.remove();
			return h;
		}

		_playShimmerOnImage( duration ) {
			if ( typeof window.Motion === 'undefined' ) return Promise.resolve();
			const { animate } = window.Motion;
			const shimmer = document.createElement( 'div' );
			shimmer.className = 'morph-image-shimmer';
			this.image.appendChild( shimmer );
			requestAnimationFrame( () => shimmer.classList.add( 'is-active' ) );
			return new Promise( ( resolve ) => {
				setTimeout( () => {
					animate( shimmer, { opacity: [ 1, 0 ] }, { duration: 0.4, easing: 'ease-out' } )
						.finished.then( () => { shimmer.remove(); resolve( this ); } );
				}, duration * 1000 );
			} );
		}

		_escHtml( s ) {
			return String( s ).replace( /[&<>"']/g, ( c ) => ( { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ c ] ) );
		}
		_escAttr( s ) { return this._escHtml( s ); }
	}

	// ── Sequence runner ─────────────────────────────────────────────────────
	// Drives the widget's state list. Owns one MorphCard instance per stage
	// element and runs: render state[0] → wait state[i].durationMs → morphTo
	// state[i+1] → repeat. Loop toggle wraps back to state[0] after the last.
	class Sequence {

		constructor( stageEl ) {
			this.stage  = stageEl;
			this.cardEl = stageEl.querySelector( '.morph-card' );
			if ( ! this.cardEl ) return;

			const raw = stageEl.getAttribute( 'data-aurora-morph-config' );
			try {
				this.config = JSON.parse( raw );
			} catch ( e ) {
				this.config = null;
				return;
			}
			if ( ! this.config || ! Array.isArray( this.config.states ) || ! this.config.states.length ) return;

			this.card       = new MorphCard( this.cardEl );
			this.index      = 0;
			this._timer     = null;
			this._destroyed = false;

			this.start();
		}

		start() {
			// Elementor editor: skip the morph loop entirely and render the
			// state picked in the widget panel (aurora_mc_preview_state) as
			// a stable still. Any panel edit re-renders the widget's DOM
			// from the server template, which repeatedly killed the morph
			// mid-flight (class swapped but Motion One's interpolation
			// cancelled) — trying to run the sequence there is fundamentally
			// broken. The full sequence still runs on the real frontend.
			const inEditor = this._isEditor();
			const startIndex = inEditor
				? Math.max( 0, Math.min( this.config.states.length - 1, this.config.previewStateIndex || 0 ) )
				: 0;

			this.index = startIndex;
			this.card.renderState( this.config.states[ startIndex ] );

			// The .morph-card CSS starts at opacity: 0 so Motion One can
			// fade it in without a flash-of-unstyled-content. Force it back
			// to 1 up front so the card is visible even if Motion never
			// loads (editor iframe quirks, network failure, etc.) — Motion
			// then just re-animates from wherever it is.
			this.cardEl.style.opacity = '1';
			if ( typeof window.Motion !== 'undefined' ) {
				const { animate } = window.Motion;
				animate( this.cardEl, { opacity: [ 0, 1 ], scale: [ 0.92, 1 ], y: [ 30, 0 ] }, { duration: 0.9, delay: 0.2, easing: [ 0.22, 1, 0.36, 1 ] } );
			}
			if ( inEditor ) return;
			if ( this.config.states.length < 2 ) return;
			this._scheduleNext( this.config.states[ 0 ].durationMs + ( this.config.initialDelay || 0 ) );
		}

		_isEditor() {
			return !! ( window.elementorFrontend && typeof window.elementorFrontend.isEditMode === 'function' && window.elementorFrontend.isEditMode() );
		}

		_scheduleNext( waitMs ) {
			if ( this._destroyed ) return;
			this._timer = setTimeout( () => this._advance(), Math.max( 0, waitMs ) );
		}

		_advance() {
			if ( this._destroyed ) return;
			const nextIndex = this.index + 1;
			const atEnd     = nextIndex >= this.config.states.length;
			if ( atEnd && ! this.config.loop ) return;

			const targetIndex = atEnd ? 0 : nextIndex;
			const nextState   = this.config.states[ targetIndex ];
			const timing      = { captionEffect: this.config.captionEffect || 'typewriter' };

			this.card.morphTo( nextState, timing ).then( () => {
				this.index = targetIndex;
				this._scheduleNext( nextState.durationMs );
			} );
		}

		destroy() {
			this._destroyed = true;
			if ( this._timer ) clearTimeout( this._timer );
		}
	}

	// ── Elementor Frontend Handler (for editor live preview + frontend) ─────
	const initStages = ( scope ) => {
		const root = scope && scope.length ? scope[ 0 ] : document;
		root.querySelectorAll( '.aurora-morph-card-stage' ).forEach( ( stageEl ) => {
			if ( stageEl._auroraSequence ) {
				stageEl._auroraSequence.destroy();
			}
			stageEl._auroraSequence = new Sequence( stageEl );
		} );
	};

	$( window ).on( 'elementor/frontend/init', () => {
		if ( window.elementorFrontend && window.elementorFrontend.hooks ) {
			window.elementorFrontend.hooks.addAction( 'frontend/element_ready/aurora_morph_card.default', ( $scope ) => {
				initStages( $scope );
			} );
		}
	} );

	$( function () { initStages(); } );

	// Expose for other extensions
	window.Aurora = window.Aurora || {};
	window.Aurora.MorphCard = MorphCard;
	window.Aurora.MorphCardSequence = Sequence;

} )( jQuery );
