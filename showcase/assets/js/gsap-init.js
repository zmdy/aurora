/* ===================================================================
    
    Author          : Valid Theme
    Template Name   : Dixor - Creative Portfolio Template
    Version         : 1.0
    
* ================================================================= */
(function($) {
	"use strict";

	$(document).ready(function() {


		/* ==================================================
            # Hover Active Init
        ===============================================*/
		$('.services-style-one-item').on('mouseenter', function() {
			$(this).addClass('active').parent().siblings().find('.services-style-one-item').removeClass('active');
		})

		/* ==================================================
		    Image Container GSAP
		================================================== */
		let home_container = document.querySelector(".home-container");
		if (home_container) {
			gsap.registerPlugin(ScrollTrigger);

			let tl = gsap.timeline({
				// yes, we can add it to an entire timeline!
				scrollTrigger: {
					trigger: ".home-container",
					pin: true, // pin the trigger element while active
					start: "0%", // when the top of the trigger hits the top of the viewport
					end: "100%", // end after scrolling 500px beyond the start
					scrub: 1, // smooth scrubbing, takes 1 second to "catch up" to the scrollbar
				},
			});

			// tl.from(".home-container", { stagger: 0.4, opacity: 0 });

			tl.from(".home-container img, .home-container video", {
				width: "50%"
			}, {
				width: "100%"
			});
			tl.from(".home-container .video", {
				opacity: 0,
				y: -100
			}, {
				opacity: 1,
				y: 0
			});
		}

		/* ==================================================
		    Video Container GSAP
		================================================== */
		let vide_containers = document.querySelector(".video-container");
		if (vide_containers) {
			gsap.registerPlugin(ScrollTrigger);

			let t2 = gsap.timeline({
				// yes, we can add it to an entire timeline!
				scrollTrigger: {
					trigger: ".video-container",
					pin: true, // pin the trigger element while active
					start: "0%", // when the top of the trigger hits the top of the viewport
					end: "100%", // end after scrolling 500px beyond the start
					scrub: 1, // smooth scrubbing, takes 1 second to "catch up" to the scrollbar
				},
			});

			// tl.from(".home-container", { stagger: 0.4, opacity: 0 });

			t2.from(".video-container video", {
				width: "50%"
			}, {
				width: "100%"
			});
			t2.from(".video-items .content", {
				opacity: 1,
				x: "-40%"
			}, {
				opacity: 1,
				x: 0
			});

		}


		/* ===================================================================
			Curosor Hover Init JS
		* ================================================================= */
		let curosr_hover = document.querySelector(".cursor-target");
		if (curosr_hover) {
			const cursor = document.querySelector(".cursor");
			const follower = document.querySelector(".cursor-follower");
			const card = document.querySelectorAll(".cursor-target");

			let posX = 0,
				posY = 0,
				mouseX = 0,
				mouseY = 0;

			TweenMax.to({}, 0.02, {
				repeat: -1,
				onRepeat: function() {
					posX += (mouseX - posX) / 9;
					posY += (mouseY - posY) / 9;

					TweenMax.set(follower, {
						css: {
							left: posX - 20,
							top: posY - 20
						}
					});

					TweenMax.set(cursor, {
						css: {
							left: mouseX,
							top: mouseY
						}
					});
				}
			});

			document.addEventListener("mousemove", (e) => {
				mouseX = e.pageX;
				mouseY = e.pageY;
			});

			card.forEach((el) => {
				el.addEventListener("mouseenter", () => {
					cursor.classList.add("active");
					follower.classList.add("active");
				});

				el.addEventListener("mouseleave", () => {
					cursor.classList.remove("active");
					follower.classList.remove("active");
				});
			});

		}


		/* ==================================================
        	# Text Scroll Animation
        ===============================================*/
		var width = $(window).width();
		if (width > 1023) {
			let text_scroll = document.querySelector(".text-scroll-animation");
			if (text_scroll) {
				gsap.registerPlugin(ScrollTrigger);
				const textElements = gsap.utils.toArray('.text');
				textElements.forEach(text => {
					gsap.to(text, {
						backgroundSize: '100%',
						ease: 'none',
						scrollTrigger: {
							trigger: text,
							start: 'center 100%',
							end: 'center 50%',
							scrub: true,
						},
					});
				});
			}
		}


		/* ==================================================
		    GSAP Image Reveal
		================================================== */
		let img_reveals = document.querySelector(".img-reveal");
		if (img_reveals) {

			gsap.registerPlugin(ScrollTrigger);

			let revealContainers = document.querySelectorAll(".img-reveal");

			revealContainers.forEach((container) => {
				let image = container.querySelector("img");
				let t3 = gsap.timeline({
					scrollTrigger: {
						trigger: container,
						toggleActions: "restart none none reset"
					}
				});

				t3.set(container, {
					autoAlpha: 1
				});
				t3.from(container, .8, {
					xPercent: -20,
					ease: Power2.out
				});
			});
		}


		/* ===================================================================
			Horizontal Scroll Init JS
		* ================================================================= */
		var width = $(window).width();
		if (width > 1023) {

			/* ===============================  scroll  =============================== */
			let section_scroll = document.querySelector(".thecontainer");
			if (section_scroll) {
				gsap.registerPlugin(ScrollTrigger);

				let sections = gsap.utils.toArray(".panel");

				gsap.to(sections, {
					xPercent: -100 * (sections.length - 1),
					ease: "none",
					scrollTrigger: {
						trigger: ".thecontainer",
						pin: true,
						scrub: 1,
						// snap: 1 / (sections.length - 1),
						end: () => "+=" + document.querySelector(".thecontainer").offsetWidth
					}
				});
			}

		}


		/* ==================================================
		    Services Hover JS
		================================================== */
		let image_hover_view = document.querySelector(".service-hover-wrapper");
		if (image_hover_view) {
			const link = document.querySelectorAll('.service-hover-item');
			const linkHoverReveal = document.querySelectorAll('.service-hover-wrapper');
			const linkImages = document.querySelectorAll('.service-hover-placeholder');
			for (let i = 0; i < link.length; i++) {
				link[i].addEventListener('mousemove', (e) => {
					linkHoverReveal[i].style.opacity = 1;
					linkHoverReveal[i].style.transform = `translate(-100%, -50% )`;
					linkImages[i].style.transform = 'scale(1, 1)';
					linkHoverReveal[i].style.left = e.clientX + "px";
				})
				link[i].addEventListener('mouseleave', (e) => {
					linkHoverReveal[i].style.opacity = 0;
					linkHoverReveal[i].style.transform = `translate(-50%, -50%)`;
					linkImages[i].style.transform = 'scale(0.5, 0.5)';
				})
			}
		}


		/* ==================================================
		    Services Hover JS
		================================================== */
		let image_hover_animation = document.querySelector(".image-hover-wrapper");
		if (image_hover_animation) {
			const link = document.querySelectorAll('.image-hover-item');
			const linkHoverReveal = document.querySelectorAll('.image-hover-wrapper');
			const linkImages = document.querySelectorAll('.image-hover-placeholder');
			for (let i = 0; i < link.length; i++) {
				link[i].addEventListener('mousemove', (e) => {
					linkHoverReveal[i].style.opacity = 1;
					linkHoverReveal[i].style.transform = `translateX(-50px) rotate(-8deg)`;
					linkImages[i].style.transform = 'scale(1, 1)';
				})
				link[i].addEventListener('mouseleave', (e) => {
					linkHoverReveal[i].style.opacity = 0;
					linkHoverReveal[i].style.transform = `translateX(100px) rotate(8deg)`;
					linkImages[i].style.transform = 'scale(0.5, 0.5)';
				})
			}
		}


		/* ===================================================================
			Accordion Hover
		* ================================================================= */
		let accordion_animation = document.querySelector("#accordion");
		if (accordion_animation) {
			var expand;
			var $accordion, $wideScreen;
			$accordion = $('#accordion').children('li');
			$wideScreen = $(window).width() > 767;
			if ($wideScreen) {
				$accordion.on('mouseenter click', function(e) {
					var $this;
					e.stopPropagation();
					$this = $(this);
					if ($this.hasClass('out')) {
						$this.addClass('out');
					} else {
						$this.addClass('out');
						$this.siblings().removeClass('out');
					}
				});
			} else {
				$accordion.on('touchstart touchend', function(e) {
					var $this;
					e.stopPropagation();
					$this = $(this);
					if ($this.hasClass('out')) {
						$this.addClass('out');
					} else {
						$this.addClass('out');
						$this.siblings().removeClass('out');
					}
				});
			}
		}


		/* ==================================================
		    GSAP Element Scroll Animation
		================================================== */

		let upDown_Scroll = document.querySelector(".upDownScrol");
		if (upDown_Scroll) {
			gsap.set(".upDownScrol", {
				yPercent: 80
			});

			gsap.to(".upDownScrol", {
				yPercent: -80,
				ease: "none",
				scrollTrigger: {
					trigger: ".upDownScrol",
					end: "bottom center",
					scrub: 1
				},
			});
		}


		let upDown_Slow = document.querySelector(".upDownScrolSlow");
		if (upDown_Slow) {
			gsap.set(".upDownScrolSlow", {
				yPercent: 50
			});

			gsap.to(".upDownScrolSlow", {
				yPercent: -20,
				ease: "none",
				scrollTrigger: {
					trigger: ".upDownScrolSlow",
					end: "bottom center",
					scrub: 1
				},
			});
		}

		// Images parallax
		var width = $(window).width();
		if (width > 1023) {
			let imageParallax = document.querySelector(".img-container");
			if (imageParallax) {
				gsap.utils.toArray('.img-container').forEach(container => {
					const img = container.querySelector('img');

					const t4 = gsap.timeline({
						scrollTrigger: {
							trigger: container,
							scrub: true,
							pin: false,
						}
					});

					t4.fromTo(img, {
						yPercent: -60,
						ease: 'none'
					}, {
						yPercent: 60,
						ease: 'none'
					});
				});
			}
		}


		/* ==================================================
		    Portfolio Animation
		================================================== */

		let ofsetHeight = document.querySelector(".portfolio-style-three-items");
		if (ofsetHeight) {
			ScrollTrigger.matchMedia({
				"(min-width: 992px)": function() {

					let pbmitpanels = gsap.utils.toArray(".portfolio-style-three-item");
					const spacer = 0;

					let pbmitheight = pbmitpanels[0].offsetHeight + 30;
					pbmitpanels.forEach((pbmitpanel, i) => {
						//This is for padding between item
						TweenMax.set(pbmitpanel, {
							top: i * 0
						});
						const tween = gsap.to(pbmitpanel, {
							scrollTrigger: {
								trigger: pbmitpanel,
								start: () => `top bottom-=100`,
								end: () => `top top+=40`,
								scrub: true,
								invalidateOnRefresh: true
							},
							ease: "none",
							//This is for scaling outsite 
							scale: () => 1 - (pbmitpanels.length - i) * 0.025
						});
						ScrollTrigger.create({
							trigger: pbmitpanel,
							start: () => "top 140px",
							endTrigger: '.portfolio-style-three-items',
							end: `bottom top+=${pbmitheight + (pbmitpanels.length * spacer)}`,
							pin: true,
							pinSpacing: false,
						});
					});
				},
				"(max-width:1025px)": function() {
					ScrollTrigger.getAll().forEach(pbmitpanels => pbmitpanels.kill(true));
				}
			});
		}



		/* ==================================================
		    GSAP Item move top
		================================================== */
		let itemMoveTop = document.querySelector(".item-move-top-items");
		if (itemMoveTop) {
			ScrollTrigger.matchMedia({
				"(min-width: 992px)": function() {

					let pbmitpanels = gsap.utils.toArray(".item-move-top-item");
					const spacer = 0;

					let pbmitheight = pbmitpanels[0].offsetHeight + 120;
					pbmitpanels.forEach((pbmitpanel, i) => {
						//This is for padding between item
						TweenMax.set(pbmitpanel, {
							top: i * 0
						});
						const tween = gsap.to(pbmitpanel, {
							scrollTrigger: {
								trigger: pbmitpanel,
								start: () => `top bottom-=100`,
								end: () => `top top+=0`,
								scrub: true,
								invalidateOnRefresh: true
							},
							ease: "none",
							//This is for scaling outsite 
							scale: () => 1 - (pbmitpanels.length - i) * 0.0
						});
						ScrollTrigger.create({
							trigger: pbmitpanel,
							start: () => "top 140px",
							endTrigger: '.item-move-top-items',
							end: `bottom top+=${pbmitheight + (pbmitpanels.length * spacer)}`,
							pin: true,
							pinSpacing: false,
						});
					});
				},
				"(max-width:1025px)": function() {
					ScrollTrigger.getAll().forEach(pbmitpanels => pbmitpanels.kill(true));
				}
			});
		}


		/* ==================================================
		    Splite Text
		================================================== */

		var width = $(window).width();
		if (width > 1023) {
			let text_split = document.querySelector(".split-text");
			if (text_split) {
				const animEls = document.querySelectorAll('.split-text');
				animEls.forEach(el => {
					var splitEl = new SplitText(el, {
						type: "lines, words",
						linesClass: "line"
					});
					var splitTl = gsap.timeline({
						duration: .35,
						ease: 'power4',
						scrollTrigger: {
							trigger: el,
							start: 'top 90%'
						}
					});

					splitTl.from(splitEl.words, {
						yPercent: "100",
						stagger: 0.025,
					});

				});
			}
		}

	}); // end document ready function

	$(window).scroll(function() {

		/* ==================================================
		    Background Zoom Init
		================================================== */
		let background_Zoom = document.querySelector("#js-hero");
		if (background_Zoom) {
			var scroll = $(window).scrollTop();
			$("#js-hero").css({
				width: (100 + scroll / 18) + "%"
			})
		}

		/* ==================================================
		    Scroll Smooth Init
		================================================== */
		var width = $(window).width();
		if (width > 1023) {
			let smooth_scroll_animation = document.querySelector(".smooth-scroll-container");
			if (smooth_scroll_animation) {
				ScrollSmoother.create({
					content: ".smooth-scroll-container",
					smooth: 2
				});
			}
		}

	});


})(jQuery); // End jQuery