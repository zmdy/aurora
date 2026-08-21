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

	// Captured once, at this script's own load time, instead of reading the
	// live `window.Motion`/`window.anime` globals at every call site below —
	// see Asset_Manager::enqueue_frontend_assets() and core/gsap-ref.js /
	// core/anime-ref.js for the same reasoning applied to GSAP/Anime.js:
	// other themes/plugins bundling their own copy of either library can
	// otherwise clobber these globals after this script has already loaded.
	var AuroraMotion = window.AuroraMotionOne || window.Motion;
	var AuroraAnime  = window.AuroraAnimeJS   || window.anime;

	// ── MorphCard ───────────────────────────────────────────────────────────
	class MorphCard {

		// Base frame specs for templates whose frame is fixed by design.
		// The morph engine writes THESE VALUES EXPLICITLY (never clears
		// inline styles first) so the browser sees `20px → 40px`, not
		// `20px → '' → 40px`, and the CSS transitions on .is-morphing
		// interpolate cleanly instead of flashing through the class default.
		static INSTAGRAM_FRAME = {
			modeClass:         'card-instagram',
			borderRadius:      '22px',
			padding:           '14px 14px 18px 14px',
			rotate:            '0deg',
			maxWidth:          '320px',
			aspectRatio:       'auto',
			background:        '',
			imageAspectRatio:  '1 / 1',
			imageBorderRadius: '14px'
		};

		static PROFILE_FRAME = {
			modeClass:         'card-profile',
			borderRadius:      '18px',
			padding:           '0px 0px 0px 0px',
			rotate:            '0deg',
			maxWidth:          '380px',
			aspectRatio:       'auto',
			background:        '',
			imageAspectRatio:  'auto',
			imageBorderRadius: '0px'
		};

		// Proportions of each polaroid size (mirrors the .card-polaroid CSS rules).
		// Rotate stays at 0 for every preset — the classic "-2deg photograph"
		// tilt now belongs to the widget-level Rotation slider (Appearance
		// section), so the template presets don't force a tilt on users
		// who want their polaroid straight.
		static POLAROID_SIZES = {
			'normal':        { photoRatio: '1 / 1', radius: 3, paddingTop: 16, paddingSides: 16, paddingBottom: 56, rotate: 0 },
			'instax':        { photoRatio: '3 / 4', radius: 3, paddingTop: 14, paddingSides: 14, paddingBottom: 64, rotate: 0 },
			'instax-square': { photoRatio: '1 / 1', radius: 3, paddingTop: 14, paddingSides: 14, paddingBottom: 48, rotate: 0 },
			'horizontal':    { photoRatio: '4 / 3', radius: 3, paddingTop: 14, paddingSides: 14, paddingBottom: 48, rotate: 0 },
			'mini':          { photoRatio: '3 / 4', radius: 3, paddingTop: 10, paddingSides: 10, paddingBottom: 40, rotate: 0 }
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
			this._destroyed = false;
			this._styleCache = {};
			this._resizeClearCache = () => { this._styleCache = {}; };
			window.addEventListener( 'resize', this._resizeClearCache );
		}

		destroy() {
			this._destroyed = true;
			if ( this._captionTimeout ) clearTimeout( this._captionTimeout );
			if ( this._typewriterTimeout ) clearTimeout( this._typewriterTimeout );
			if ( this._shimmerTimeout ) clearTimeout( this._shimmerTimeout );
			if ( this._lettersAnim && typeof this._lettersAnim.pause === 'function' ) {
				this._lettersAnim.pause();
			}
			if ( this._shimmerAnim && typeof this._shimmerAnim.pause === 'function' ) {
				this._shimmerAnim.pause();
			}
			window.removeEventListener( 'resize', this._resizeClearCache );
			const shimmers = this.image.querySelectorAll( '.morph-image-shimmer' );
			shimmers.forEach( ( s ) => s.remove() );
		}

		// ── Rendering: template dispatchers ─────────────────────────────────

		renderState( state ) {
			this.mode = state.template || 'instagram';
			this._applyFrame( this._getFrameSpec( state ) );
			switch ( state.template ) {
				case 'polaroid':  return this._renderPolaroidContent( state );
				case 'profile':   return this._renderProfileContent( state );
				case 'custom':    return this._renderCustomContent( state );
				case 'instagram':
				default:          return this._renderInstagramContent( state );
			}
		}

		// Kept as public aliases for backwards compat (typewriteCaption and
		// external code may still call these). They now just delegate to
		// renderState so every entry point flows through the same pipeline.
		renderAsInstagram( data ) { return this.renderState( Object.assign( {}, data, { template: 'instagram' } ) ); }
		renderAsProfile( data )   { return this.renderState( Object.assign( {}, data, { template: 'profile' } ) ); }
		renderAsPolaroid( data )  { return this.renderState( Object.assign( {}, data, { template: 'polaroid' } ) ); }
		renderAsCustom( data )    { return this.renderState( Object.assign( {}, data, { template: 'custom' } ) ); }

		/**
		 * Returns a normalized frame spec for any state — the single
		 * source of truth for what a template's frame looks like.
		 */
		_getFrameSpec( state ) {
			switch ( state.template ) {
				case 'polaroid': {
					const size = ( state.size && MorphCard.POLAROID_SIZES[ state.size ] ) ? state.size : 'normal';
					const cfg  = MorphCard.POLAROID_SIZES[ size ];
					return {
						modeClass:         'card-polaroid',
						frameClass:        state.frame ? `frame-${ state.frame }` : null,
						borderRadius:      `${ cfg.radius }px`,
						padding:           `${ cfg.paddingTop }px ${ cfg.paddingSides }px ${ cfg.paddingBottom }px ${ cfg.paddingSides }px`,
						rotate:            `${ cfg.rotate }deg`,
						maxWidth:          '320px',
						aspectRatio:       'auto',
						background:        '',
						imageAspectRatio:  cfg.photoRatio,
						imageBorderRadius: '0px'
					};
				}
				case 'profile':   return Object.assign( {}, MorphCard.PROFILE_FRAME );
				case 'custom': {
					const pad = state.padding || {};
					const pu  = pad.unit || 'px';
					const mw  = state.maxWidth || {};
					const ar  = ( state.aspectRatio && 'auto' !== state.aspectRatio ) ? state.aspectRatio.replace( '/', ' / ' ) : 'auto';
					return {
						modeClass:         'card-custom',
						borderRadius:      `${ state.radius || 0 }px`,
						padding:           `${ pad.top || 0 }${ pu } ${ pad.right || 0 }${ pu } ${ pad.bottom || 0 }${ pu } ${ pad.left || 0 }${ pu }`,
						rotate:            `${ state.rotate || 0 }deg`,
						maxWidth:          mw.size ? `${ mw.size }${ mw.unit || 'px' }` : 'none',
						aspectRatio:       ar,
						background:        state.bgColor || '',
						// Custom lets the image flex-fill the remaining
						// space, so no explicit aspect ratio on .morph-image.
						imageAspectRatio:  'auto',
						imageBorderRadius: '0px'
					};
				}
				case 'instagram':
				default:          return Object.assign( {}, MorphCard.INSTAGRAM_FRAME );
			}
		}

		/**
		 * Writes every frame property to the root/image as an explicit
		 * inline value — never clears. Combined with the CSS transitions
		 * on .is-morphing, this is what makes any state → any state
		 * morph smoothly instead of flashing through class defaults.
		 */
		_applyFrame( spec ) {
			// Mode class (mutually exclusive)
			this.root.classList.remove( 'card-instagram', 'card-polaroid', 'card-profile', 'card-custom' );
			this.root.classList.add( spec.modeClass );
			// Polaroid frame color variant
			this.root.classList.remove( 'frame-classic', 'frame-vintage', 'frame-pink', 'frame-dark', 'frame-floral' );
			if ( spec.frameClass ) this.root.classList.add( spec.frameClass );
			// Root inline styles — always written, never cleared.
			this.root.style.borderRadius = spec.borderRadius;
			this.root.style.padding      = spec.padding;
			this.root.style.rotate       = spec.rotate;
			this.root.style.maxWidth     = spec.maxWidth;
			this.root.style.aspectRatio  = spec.aspectRatio;
			// backgroundColor (not the `background` shorthand) — shorthand
			// nukes background-image/repeat/etc which the polaroid noise
			// texture and other CSS rules quietly depend on. Longhand
			// keeps them intact.
			this.root.style.backgroundColor = spec.background;
			// Image frame — same principle. width/height stay in CSS.
			this.image.style.aspectRatio  = spec.imageAspectRatio;
			this.image.style.borderRadius = spec.imageBorderRadius;
		}

		_renderInstagramContent( data ) {
			const avatar   = data.avatar || data.photo || '';
			const username = data.username || '';
			const subtext  = data.subtext || '';
			const likes    = data.likes || 0;
			this._igLikes  = likes;

			this.header.className = 'morph-header ig-header';
			this.header.style.cssText = '';
			this.header.style.display = '';
			this.header.innerHTML = `
				<span class="ig-avatar-ring">
					<img src="${ this._escAttr( avatar ) }" alt="${ this._escAttr( username ) }" class="ig-avatar-img">
				</span>
				<div class="ig-header-text">
					<p class="ig-username">${ this._escHtml( username ) }</p>
					<p class="ig-subtext">${ this._escHtml( subtext ) }</p>
				</div>
				<i class="fa-solid fa-ellipsis ig-more"></i>
			`;

			this.image.className     = 'morph-image ig-photo-wrap';
			this.image.style.display = '';
			this.image.innerHTML = `
				<img class="ig-photo-item" src="${ this._escAttr( data.photo || '' ) }" alt="${ this._escAttr( data.caption || '' ) }" style="opacity:1;">
				<div class="ig-heart-burst"><i class="fa-solid fa-heart"></i></div>
			`;

			this.footer.className = 'morph-footer';
			this.footer.style.display = '';
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

		_renderCustomContent( data ) {
			this.header.className = 'morph-header';
			this.header.style.display = data.headerHtml ? '' : 'none';
			this.header.innerHTML = data.headerHtml || '';

			this.image.className     = 'morph-image';
			this.image.style.display = '';
			if ( data.photo ) {
				const fit = data.imageFit || 'cover';
				const pos = data.imagePosition || 'center center';
				this.image.innerHTML = `<img class="morph-image-photo" src="${ this._escAttr( data.photo ) }" alt="${ this._escAttr( data.caption || '' ) }" style="object-fit:${ fit };object-position:${ pos };">`;
			} else {
				this.image.innerHTML = '';
				this.image.style.display = 'none';
			}

			this.footer.className = 'morph-footer';
			this.footer.style.display = data.footerHtml ? '' : 'none';
			this.footer.innerHTML = data.footerHtml || '';
			return this;
		}

		_renderProfileContent( data ) {
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
						<img src="${ this._escAttr( data.avatar || data.photo || '' ) }" alt="${ this._escAttr( data.username || data.name || '' ) }" class="morph-profile-avatar-img">
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

			// Empty gallery falls back to 9 placeholder tiles so the
			// profile template still LOOKS like a profile in the editor
			// before the user has filled in URLs — otherwise the grid
			// zone renders empty and the card looks broken.
			const gridItems = photos.length
				? photos.map( ( src ) => `<div class="morph-profile-grid-item"><img src="${ this._escAttr( src ) }" alt=""></div>` )
				: Array.from( { length: 9 }, () => '<div class="morph-profile-grid-item morph-profile-grid-item-empty"></div>' );

			this.image.className     = 'morph-image';
			this.image.style.display = '';
			this.image.innerHTML = `
				<div class="morph-profile-grid">
					${ gridItems.join( '' ) }
				</div>
			`;

			this.footer.className = 'morph-footer';
			this.footer.style.display = '';
			this.footer.innerHTML = '';
			return this;
		}

		_renderPolaroidContent( data ) {
			this.header.className = 'morph-header';
			this.header.style.display = '';
			this.header.innerHTML = '';

			this.image.className     = 'morph-image';
			this.image.style.display = '';
			this.image.innerHTML = `<img class="morph-image-photo" src="${ this._escAttr( data.photo || '' ) }" alt="${ this._escAttr( data.caption || '' ) }">`;

			this.footer.className = 'morph-footer';
			this.footer.style.display = '';
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
			if ( typeof AuroraMotion === 'undefined' ) {
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

			// Polaroid destination keeps its bespoke transition (shimmer +
			// caption typewriter reveal) because those effects are the
			// signature of the original prototype. Every other target goes
			// through the generic _morphFrame: real frame interpolation
			// (radius/padding/rotate/image radius/aspect-ratio) with the
			// inner content crossfading over the top.
			if ( 'polaroid' === state.template ) {
				return this._morphToPolaroid( state, merged );
			}
			return this._morphFrame( state, merged );
		}

		/**
		 * Generic morph — shared-element crossfade with no blank frame.
		 *
		 * The previous version faded the zones out to opacity 0, THEN
		 * re-rendered underneath, THEN faded them back in — leaving a
		 * visible gap where the card was empty. Now the pipeline is:
		 *
		 *   1. Snapshot each zone's current children into an absolutely-
		 *      positioned overlay layered on top of the zone.
		 *   2. Render the new state — new content instantly populates the
		 *      zones underneath, but the overlays hide it visually.
		 *   3. Motion One fades the overlays from 1 → 0 in parallel with
		 *      the CSS transitions morphing the outer frame.
		 *   4. Overlays are removed once fully transparent.
		 *
		 * The zones themselves stay at opacity 1 the whole time, so the
		 * new content is always visible the instant the overlay drops
		 * below full opacity — no blank moment, no "fade to nothing then
		 * fade back". Same principle as Framer Motion's AnimatePresence.
		 */
		_morphFrame( state, timing ) {
			const { animate } = AuroraMotion;
			const t = Object.assign( {}, MorphCard.DEFAULT_MORPH_TIMING, timing );

			const durationMs = Math.round( ( t.frameDuration || 1.6 ) * 1000 );
			this.root.style.setProperty( '--amc-morph-duration', `${ durationMs }ms` );
			this.root.classList.add( 'is-morphing' );

			// 1) Snapshot current zone contents into overlays that mimic
			//    each zone's own layout (so old flex children still lay
			//    out like they did before the swap).
			const overlays = this._snapshotZoneOverlays();

			// 2) Render new state — writes new innerHTML into the zones,
			//    but the overlays are re-appended on top afterwards so
			//    they visually cover the new content until they fade out.
			this.renderState( state );
			overlays.forEach( ( { zone, overlay } ) => zone.appendChild( overlay ) );

			// 3) Fade overlays out over the frame duration (matches the
			//    CSS transition, so shape + content settle together).
			const overlayEls = overlays.map( ( o ) => o.overlay );
			const fadeMs = Math.max( t.captionOutDuration || 0.4, t.captionInDuration || 0.5 );
			const fadeDone = overlayEls.length
				? animate( overlayEls, { opacity: [ 1, 0 ] }, { duration: fadeMs, easing: 'ease-in-out' } )
					.finished.then( () => overlayEls.forEach( ( o ) => o.remove() ) )
				: Promise.resolve();

			// Disarm .is-morphing after CSS transitions have settled.
			const settleMs = durationMs + Math.round( ( t.frameDelay || 0 ) * 1000 ) + 60;
			setTimeout( () => this.root.classList.remove( 'is-morphing' ), settleMs );

			return fadeDone.then( () => this );
		}

		/**
		 * Builds one absolutely-positioned overlay per zone containing a
		 * clone of that zone's current innerHTML. Overlay layout mimics
		 * the zone's own display/flex/padding so cloned children lay out
		 * identically instead of collapsing into an inline flow.
		 */
		_snapshotZoneOverlays() {
			const zones = [ this.header, this.image, this.footer ].filter( Boolean );
			const out = [];
			const cacheKey = this.mode || 'instagram';
			if ( ! this._styleCache[ cacheKey ] ) {
				this._styleCache[ cacheKey ] = new Map();
			}
			const modeCache = this._styleCache[ cacheKey ];

			zones.forEach( ( zone ) => {
				if ( ! zone.innerHTML.trim() ) return;
				let cs = modeCache.get( zone );
				if ( ! cs ) {
					const computed = getComputedStyle( zone );
					cs = {
						display:        computed.display,
						flexDirection:  computed.flexDirection,
						alignItems:     computed.alignItems,
						justifyContent: computed.justifyContent,
						gap:            computed.gap,
						padding:        computed.padding
					};
					modeCache.set( zone, cs );
				}
				const overlay = document.createElement( 'div' );
				overlay.className = 'morph-zone-overlay';
				overlay.style.display        = cs.display;
				overlay.style.flexDirection  = cs.flexDirection;
				overlay.style.alignItems     = cs.alignItems;
				overlay.style.justifyContent = cs.justifyContent;
				overlay.style.gap            = cs.gap;
				overlay.style.padding        = cs.padding;
				overlay.innerHTML            = zone.innerHTML;
				out.push( { zone, overlay } );
			} );
			return out;
		}

		_morphToPolaroid( state, timing ) {
			const { animate } = AuroraMotion;
			const t = Object.assign( {}, MorphCard.DEFAULT_MORPH_TIMING, timing );

			// Frame morph — same engine as every other target: arm CSS
			// transitions via .is-morphing, then re-render the target
			// which writes explicit inline values (from _applyFrame), and
			// the browser interpolates between the two automatically.
			const durationMs = Math.round( ( t.frameDuration || 1.6 ) * 1000 );
			this.root.style.setProperty( '--amc-morph-duration', `${ durationMs }ms` );
			this.root.classList.add( 'is-morphing' );

			const captionLine = this.footer.querySelector( '.ig-caption' );
			const fullText    = state.caption || ( captionLine && captionLine.querySelector( '.ig-caption-text' ) ? captionLine.querySelector( '.ig-caption-text' ).textContent : '' );

			// Same overlay-crossfade as _morphFrame — no blank moment.
			const overlays = this._snapshotZoneOverlays();
			this.renderState( state );
			// Hide caption text under the overlay so the typewriter can
			// reveal it "for the first time" once the frame finishes.
			const captionTextEl = this.footer.querySelector( '.morph-caption-text' );
			if ( captionTextEl ) captionTextEl.textContent = '';
			overlays.forEach( ( { zone, overlay } ) => zone.appendChild( overlay ) );

			const overlayEls = overlays.map( ( o ) => o.overlay );
			const fadeMs = Math.max( t.captionOutDuration || 0.4, t.captionInDuration || 0.5 );
			if ( overlayEls.length ) {
				animate( overlayEls, { opacity: [ 1, 0 ] }, { duration: fadeMs, easing: 'ease-in-out' } )
					.finished.then( () => overlayEls.forEach( ( o ) => o.remove() ) );
			}

			// Shimmer sweep across the image while the frame reshapes —
			// the polaroid signature that _morphFrame doesn't ship.
			this._playShimmerOnImage( t.frameDuration + 0.3 );

			// Disarm .is-morphing once the CSS transitions have settled.
			setTimeout( () => this.root.classList.remove( 'is-morphing' ), durationMs + 60 );

			// Once the fade-in has re-populated the polaroid caption line,
			// play the typewriter/letters reveal on top of it. captionDelay
			// gives the frame morph time to advance so the reveal doesn't
			// race with the shape change.
			return new Promise( ( resolve ) => {
				this._captionTimeout = setTimeout( () => {
					const textEl = this.footer.querySelector( '.morph-caption-text' );
					if ( ! textEl ) { resolve( this ); return; }
					const revealPromise = 'letters' === t.captionEffect
						? this._revealCaptionLetters( textEl, fullText, t )
						: this._typewriteCaption( textEl, fullText, t );
					revealPromise.then( () => resolve( this ) );
				}, t.captionDelay * 1000 );
			} );
		}

		// ── Utilities ───────────────────────────────────────────────────────

		_captionFontSizeForWidth( width ) {
			const effectiveWidth = width || this.root.getBoundingClientRect().width || MorphCard.CAPTION_FONT_REFERENCE_WIDTH;
			const ratio = effectiveWidth / MorphCard.CAPTION_FONT_REFERENCE_WIDTH;
			const size  = ratio * MorphCard.CAPTION_FONT_REFERENCE_SIZE;
			return Math.max( MorphCard.CAPTION_FONT_MIN, Math.min( MorphCard.CAPTION_FONT_MAX, size ) );
		}

		_typewriteCaption( el, text, timing ) {
			return new Promise( ( resolve ) => {
				el.textContent = '';
				let i = 0;
				const step = () => {
					if ( this._destroyed || ! el.isConnected ) { resolve( this ); return; }
					if ( i < text.length ) {
						el.textContent += text.charAt( i );
						i++;
						this._typewriterTimeout = setTimeout( step, timing.typewriterMinDelay + Math.random() * timing.typewriterMaxDelay );
					} else {
						resolve( this );
					}
				};
				step();
			} );
		}

		_revealCaptionLetters( el, text, timing ) {
			if ( typeof AuroraAnime === 'undefined' ) {
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
				this._lettersAnim = AuroraAnime.animate( {
					targets:  letters,
					opacity:  [ 0, 1 ],
					translateY: [ 35, 0 ],
					rotateX:  [ -45, 0 ],
					filter:   [ 'blur(12px)', 'blur(0px)' ],
					delay:    AuroraAnime.stagger( timing.lettersStagger, { start: timing.lettersStartDelay } ),
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
			if ( typeof AuroraMotion === 'undefined' ) return Promise.resolve();
			const { animate } = AuroraMotion;
			const shimmer = document.createElement( 'div' );
			shimmer.className = 'morph-image-shimmer';
			this.image.appendChild( shimmer );
			requestAnimationFrame( () => shimmer.classList.add( 'is-active' ) );
			return new Promise( ( resolve ) => {
				this._shimmerTimeout = setTimeout( () => {
					this._shimmerAnim = animate( shimmer, { opacity: [ 1, 0 ] }, { duration: 0.4, easing: 'ease-out' } );
					this._shimmerAnim.finished.then( () => { shimmer.remove(); resolve( this ); } );
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
			if ( typeof AuroraMotion !== 'undefined' ) {
				const { animate } = AuroraMotion;
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
			if ( this.card ) this.card.destroy();
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

	let morphCardHandlerRegistered = false;

	function tryRegisterMorphHandler() {
		if ( morphCardHandlerRegistered ) return true;
		if ( typeof window.elementorFrontend === 'undefined' || ! window.elementorFrontend.hooks ) return false;
		window.elementorFrontend.hooks.addAction( 'frontend/element_ready/aurora_morph_card.default', ( $scope ) => {
			initStages( $scope );
		} );
		morphCardHandlerRegistered = true;
		return true;
	}

	if ( ! tryRegisterMorphHandler() ) {
		$( window ).on( 'elementor/frontend/init', () => {
			tryRegisterMorphHandler();
		} );
	}

	$( function () { initStages(); } );

	// Expose for other extensions
	window.AuroraPlugin = window.AuroraPlugin || {};
	window.AuroraPlugin.MorphCard = MorphCard;
	window.AuroraPlugin.MorphCardSequence = Sequence;

} )( jQuery );
