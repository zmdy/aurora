/* ===================================================================
    
    Author          : Valid Theme
    Template Name   : Dixor - Creative Digital Agency Template
    Version         : 1.0
    
* ================================================================= */
(function($) {
	"use strict";

	$(document).ready(function() {



		/* ==================================================
		    # Tooltip Init
		===============================================*/
		$('[data-toggle="tooltip"]').tooltip();


		/* ==================================================
		    # Youtube Video Init
		 ===============================================*/
		$('.player').mb_YTPlayer();


		/* ==================================================
		    # Wow Init
		 ===============================================*/
		var wow = new WOW({
			boxClass: 'wow', // animated element css class (default is wow)
			animateClass: 'animated', // animation css class (default is animated)
			offset: 0, // distance to the element when triggering the animation (default is 0)
			mobile: true, // trigger animations on mobile devices (default is true)
			live: true // act on asynchronously loaded content (default is true)
		});
		wow.init();


		/* ==================================================
		    _Progressbar Init
		 ===============================================*/
		function animateElements() {
			$('.progressbar').each(function() {
				var elementPos = $(this).offset().top;
				var topOfWindow = $(window).scrollTop();
				var percent = $(this).find('.circle').attr('data-percent');
				var animate = $(this).data('animate');
				if (elementPos < topOfWindow + $(window).height() - 30 && !animate) {
					$(this).data('animate', true);
					$(this).find('.circle').circleProgress({
						// startAngle: -Math.PI / 2,
						value: percent / 100,
						size: 130,
						thickness: 5,
						lineCap: 'round',
						emptyFill: '#cccccc',
						fill: {
							gradient: ['#C9F31D', '#add40c']
						}
					}).on('circle-animation-progress', function(event, progress, stepValue) {
						$(this).find('strong').text((stepValue * 100).toFixed(0) + "%");
					}).stop();
				}
			});

		}

		animateElements();
		$(window).scroll(animateElements);


		/* ==================================================
		    # Magnific popup init
		 ===============================================*/
		$(".popup-link").magnificPopup({
			type: 'image',
			// other options
		});

		$(".popup-gallery").magnificPopup({
			type: 'image',
			gallery: {
				enabled: true
			},
			// other options
		});

		$(".popup-youtube, .popup-vimeo, .popup-gmaps").magnificPopup({
			type: "iframe",
			mainClass: "mfp-fade",
			removalDelay: 160,
			preloader: false,
			fixedContentPos: false
		});

		$('.magnific-mix-gallery').each(function() {
			var $container = $(this);
			var $imageLinks = $container.find('.item');

			var items = [];
			$imageLinks.each(function() {
				var $item = $(this);
				var type = 'image';
				if ($item.hasClass('magnific-iframe')) {
					type = 'iframe';
				}
				var magItem = {
					src: $item.attr('href'),
					type: type
				};
				magItem.title = $item.data('title');
				items.push(magItem);
			});

			$imageLinks.magnificPopup({
				mainClass: 'mfp-fade',
				items: items,
				gallery: {
					enabled: true,
					tPrev: $(this).data('prev-text'),
					tNext: $(this).data('next-text')
				},
				type: 'image',
				callbacks: {
					beforeOpen: function() {
						var index = $imageLinks.index(this.st.el);
						if (-1 !== index) {
							this.goTo(index);
						}
					}
				}
			});
		});


		/* ==================================================
            # Hover Active Init
        ===============================================*/
		$('.hover-active-item').on('mouseenter', function() {
			var $this;
			$this = $(this);
			if ($this.hasClass('active')) {
				$this.addClass('active');
			} else {
				$this.addClass('active');
				$this.siblings().removeClass('active');
			}
		})

		/* ==================================================
            # Banner Carousel
         ===============================================*/
		const swiperCounter = new Swiper(".banner-slide-counter", {
			// Optional parameters
			// direction: "vertical",
			loop: true,
			grabCursor: true,
			mousewheel: true,
			centeredSlides: true,
			autoplay: false,
			speed: 1000,
			autoplay: {
				delay: 5000,
				disableOnInteraction: false,
			},

			// If we need pagination
			pagination: {
				el: '.banner-slide-pagination',
				type: 'fraction'
			},


			// Navigation arrows
			navigation: {
				nextEl: ".banner-slide-button-next",
				prevEl: ".banner-slide-button-prev"
			},

			breakpoints: {
				991: {
					slidesPerView: 2,
					spaceBetween: 30,
					centeredSlides: false,
				},
				992: {
					slidesPerView: 2.2,
					spaceBetween: 50,
				},
				1400: {
					slidesPerView: 2.4,
					spaceBetween: 80,
				}
			},

			// And if we need scrollbar
			/*scrollbar: {
            el: '.swiper-scrollbar',
          },*/
		});


		/* ==================================================
            # Banner Four
         ===============================================*/

		var bannerFour = new Swiper('.banner-style-four-carousel', {
			spaceBetween: 10,
			loop: true,
			loopedSlides: 4,
			effect: "fade",
			fadeEffect: {
				crossFade: true
			},
		});
		var bannerBullet = new Swiper('.banner-style-four-bullet', {
			direction: "vertical",
			loop: true,
			grabCursor: true,
			mousewheel: true,
			centeredSlides: true,
			autoplay: false,
			speed: 1000,
			autoplay: {
				delay: 5000,
				disableOnInteraction: false,
			},
			spaceBetween: 50,
			slidesPerView: 'auto',
			touchRatio: 0.2,
			slideToClickedSlide: true,
			loopedSlides: 4,
			breakpoints: {
				991: {
					centeredSlides: true,
				},
			}
		});
		bannerFour.controller.control = bannerBullet;
		bannerBullet.controller.control = bannerFour;



		/* ==================================================
            # Banner Eleven
         ===============================================*/
		 let full_portfolio = document.querySelector(".full-screen-portfolio-slider");
		if (full_portfolio) {
			const fullSlider = new Swiper('.full-screen-portfolio-slider', {
				// pass EffectSlicer module to modules
				modules: [EffectSlicer],
				// specify "slicer" effect
				effect: 'slicer',
				slicerEffect: {
					split: 5,
				},
				direction: 'vertical',
				loop: true,
				grabCursor: true,
				mousewheel: true,
				navigation: {
					nextEl: '.full-screen-slider-next',
					prevEl: '.full-screen-slider-prev',
				},
				pagination: {
					el: '.full-screen-slider-pagination',
					type: 'fraction',
					clickable: true,
				},
			});
		}

		/* ==================================================
            # Banner Twelve
         ===============================================*/
		const fullSliderTWo = new Swiper('.full-screen-portfolio-two', {
			loop: true,
			grabCursor: true,
			mousewheel: true,
			speed: 1000,
			navigation: {
				nextEl: '.full-slider-two-next',
				prevEl: '.full-slider-two-prev',
			},
			pagination: {
				el: '.full-slider-two-pagination',
				type: 'fraction',
				clickable: true,
			},
		});


		/* ==================================================
            # Portfolio Carousel
         ===============================================*/
		const portfolioStyleOneCarousel = new Swiper(".portfolio-style-two-carousel", {
			// Optional parameters
			direction: "horizontal",
			loop: true,
			autoplay: false,
			effect: "fade",
			fadeEffect: {
				crossFade: true
			},
			speed: 1000,
			// If we need pagination
			pagination: {
				el: '.project-pagination',
				type: 'custom',
				clickable: true,
				renderCustom: function(swiper, current, total) {
					return current + '<span></span>' + (total);
				}
			},

			// Navigation arrows
			navigation: {
				nextEl: ".project-button-next",
				prevEl: ".project-button-prev"
			}

			// And if we need scrollbar
			/*scrollbar: {
            el: '.swiper-scrollbar',
          },*/
		});


		/* ==================================================
            # Team Carousel
         ===============================================*/
		const teamOneCarousel = new Swiper(".team-style-one-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 1,
			spaceBetween: 30,
			autoplay: false,
			breakpoints: {
				768: {
					slidesPerView: 2,
					spaceBetween: 60,
				}
			},
		});


		/* ==================================================
            # Testimonials Carousel
         ===============================================*/
		const testimonialOneCarousel = new Swiper(".testimonial-style-one-carousel", {
			// Optional parameters
			direction: "horizontal",
			loop: true,
			autoplay: false,
			speed: 1000,

			// If we need pagination
			pagination: {
				el: '.swiper-pagination',
				type: 'bullets',
				clickable: true,
			},

			// Navigation arrows
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev"
			}

			// And if we need scrollbar
			/*scrollbar: {
            el: '.swiper-scrollbar',
          },*/
		});


		/* ==================================================
            # Testimonial Carousel
         ===============================================*/

		var testimonialTwo = new Swiper('.testimonial-style-two-carousel', {
			spaceBetween: 10,
			navigation: {
				nextEl: '.swiper-button-next',
				prevEl: '.swiper-button-prev',
			},
			loop: true,
			loopedSlides: 4
		});
		var testimonialBullet = new Swiper('.testimonial-bullet', {
			spaceBetween: 10,
			slidesPerView: 'auto',
			touchRatio: 0.2,
			slideToClickedSlide: true,
			loop: true,
			loopedSlides: 3,
			centeredSlides: true,
		});
		testimonialTwo.controller.control = testimonialBullet;
		testimonialBullet.controller.control = testimonialTwo;


		/* ==================================================
            # Testimonials Carousel
         ===============================================*/
		const testimonialThreeCarousel = new Swiper(".testimonial-style-three-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 1,
			spaceBetween: 30,
			autoplay: false,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
			// Navigation arrows
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev"
			},
			breakpoints: {
				768: {
					slidesPerView: 2,
					spaceBetween: 30,
				}
			}
		});


		/* ==================================================
            # Team Carousel
         ===============================================*/
		const teamCarousel = new Swiper(".team-carousel", {
			// Optional parameters
			direction: "horizontal",
			loop: true,
			autoplay: false,
			breakpoints: {
				768: {
					slidesPerView: 2,
					spaceBetween: 50,
				}
			},

			// And if we need scrollbar
			/*scrollbar: {
            el: '.swiper-scrollbar',
          },*/
		});


		/* ==================================================
		    # Brand Carousel
		 ===============================================*/
		const brandCarousel = new Swiper(".brand-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 2,
			spaceBetween: 30,
			autoplay: false,
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
			breakpoints: {
				768: {
					slidesPerView: 3,
					spaceBetween: 30,
				},
				992: {
					slidesPerView: 4,
					spaceBetween: 30,
				},
				1400: {
					slidesPerView: 5,
					spaceBetween: 80,
				}
			},
		});

		/* ==================================================
            # Services Carousel
         ===============================================*/
		const servicesCarousel = new Swiper(".services-carousel", {
			// Optional parameters
			loop: true,
			autoplay: false,
			freeMode: true,
			grabCursor: true,
			slidesPerView: 1,
			spaceBetween: 30,
			// Navigation arrows
			navigation: {
				nextEl: ".services-button-next",
				prevEl: ".services-button-prev"
			},
			breakpoints: {
				768: {
					slidesPerView: 2,
					spaceBetween: 50,
				},
				1400: {
					slidesPerView: 2.8,
					spaceBetween: 50,
				},

				1800: {
					spaceBetween: 70,
					slidesPerView: 2.8,
				},
			},
		});


		/* ==================================================
            # Project Carousel
         ===============================================*/
		const projectStage = new Swiper(".project-center-stage-carousel", {
			// Optional parameters
			loop: true,
			freeMode: true,
			grabCursor: true,
			slidesPerView: 1,
			centeredSlides: true,
			spaceBetween: 30,
			autoplay: false,
			// Navigation arrows
			navigation: {
				nextEl: ".project-center-button-next",
				prevEl: ".project-center-button-prev"
			},
			breakpoints: {
				991: {
					slidesPerView: 2,
					spaceBetween: 30,
					centeredSlides: false,
				},
				1200: {
					slidesPerView: 2.5,
					spaceBetween: 60,
				},
				1800: {
					slidesPerView: 2.8,
					spaceBetween: 80,
				},
			},
		});


		/* ==================================================
		    # Brand Carousel
		 ===============================================*/
		const brandTwoCarousel = new Swiper(".brand-two-carousel", {
			// Optional parameters
			loop: true,
			slidesPerView: 1,
			spaceBetween: 30,
			autoplay: false,
			breakpoints: {
				768: {
					slidesPerView: 2,
				},
				992: {
					slidesPerView: 3,
				},
				1400: {
					slidesPerView: 3,
				}
			},
		});


		$(".radio-btn").on("click", function() {
            $(".radio-inner").toggleClass("active");
            $("body").toggleClass("bg-dark");
        })

		$(".radio-btn-light").on("click", function() {
            $(".radio-inner-light").toggleClass("active");
            $("body").toggleClass("bg-dark");
        })


		/* ==================================================
		    Contact Form Validations
		================================================== */
		$('.contact-form').each(function() {
			var formInstance = $(this);
			formInstance.submit(function() {

				var action = $(this).attr('action');

				$("#message").slideUp(750, function() {
					$('#message').hide();

					$('#submit')
						.after('<img src="assets/img/ajax-loader.gif" class="loader" />')
						.attr('disabled', 'disabled');

					$.post(action, {
							name: $('#name').val(),
							email: $('#email').val(),
							phone: $('#phone').val(),
							comments: $('#comments').val()
						},
						function(data) {
							document.getElementById('message').innerHTML = data;
							$('#message').slideDown('slow');
							$('.contact-form img.loader').fadeOut('slow', function() {
								$(this).remove()
							});
							$('#submit').removeAttr('disabled');
						}
					);
				});
				return false;
			});
		});


	}); // end document ready function

	$(window).on('load', function(event) {
		$('#preloader').delay(500).fadeOut(500);
	});



})(jQuery); // End jQuery