/**
 * Aurora for Elementor — wp-admin "Aurora" dashboard page.
 * Tab switching, per-module toggle AJAX, and a live WebGL preview of the
 * Aurora Borealis mesh shader on the Dashboard tab.
 */
(function () {
	'use strict';

	document.addEventListener('DOMContentLoaded', function () {
		initTabs();
		initModuleToggles();
		initPreview();
	});

	// ── Tabs ────────────────────────────────────────────────────────────

	function initTabs() {
		var tabs = document.querySelectorAll('[data-aurora-tab]');
		var panels = document.querySelectorAll('[data-aurora-panel]');
		if (!tabs.length) {
			return;
		}

		function activate(name) {
			tabs.forEach(function (tab) {
				var isActive = tab.getAttribute('data-aurora-tab') === name;
				tab.classList.toggle('is-active', isActive);
				tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
			});
			panels.forEach(function (panel) {
				panel.classList.toggle('is-active', panel.getAttribute('data-aurora-panel') === name);
			});
		}

		tabs.forEach(function (tab) {
			tab.addEventListener('click', function () {
				activate(tab.getAttribute('data-aurora-tab'));
			});
		});

		document.querySelectorAll('[data-aurora-goto-tab]').forEach(function (btn) {
			btn.addEventListener('click', function () {
				activate(btn.getAttribute('data-aurora-goto-tab'));
			});
		});
	}

	// ── Module toggles ──────────────────────────────────────────────────

	function initModuleToggles() {
		var inputs = document.querySelectorAll('[data-aurora-module-toggle]');
		if (!inputs.length || typeof window.AURORA_ADMIN === 'undefined' || typeof window.ajaxurl === 'undefined') {
			return;
		}

		inputs.forEach(function (input) {
			input.addEventListener('change', function () {
				var moduleKey = input.getAttribute('data-aurora-module-toggle');
				var active = input.checked;

				// Keep every card for this same module (dashboard preview grid
				// + full modules grid both render one toggle per module) in
				// sync, since flipping either one should visually update both.
				document
					.querySelectorAll('[data-aurora-module-toggle="' + moduleKey + '"]')
					.forEach(function (other) {
						other.checked = active;
						other.disabled = true;
					});

				var body = new URLSearchParams();
				body.set('action', 'aurora_toggle_module');
				body.set('nonce', window.AURORA_ADMIN.nonce);
				body.set('module', moduleKey);
				body.set('active', active ? '1' : '0');

				fetch(window.ajaxurl, {
					method: 'POST',
					credentials: 'same-origin',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: body.toString()
				})
					.then(function (res) {
						return res.json();
					})
					.then(function (json) {
						if (!json || !json.success) {
							// Revert on failure — the server rejected the change
							// (permission, unknown module key, etc).
							document
								.querySelectorAll('[data-aurora-module-toggle="' + moduleKey + '"]')
								.forEach(function (other) {
									other.checked = !active;
								});
						}
					})
					.catch(function () {
						document
							.querySelectorAll('[data-aurora-module-toggle="' + moduleKey + '"]')
							.forEach(function (other) {
								other.checked = !active;
							});
					})
					.finally(function () {
						document
							.querySelectorAll('[data-aurora-module-toggle="' + moduleKey + '"]')
							.forEach(function (other) {
								other.disabled = false;
							});
					});
			});
		});
	}

	// ── Live Aurora Borealis shader preview ───────────────────────────

	function initPreview() {
		var canvas = document.getElementById('aurora-admin-preview');
		if (!canvas || typeof window.AuroraShaders === 'undefined') {
			return;
		}

		var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
		if (!gl) {
			canvas.style.display = 'none';
			return;
		}

		var vsSource = window.AuroraShaders.VERTEX_SHADER;
		var fsSource = window.AuroraShaders.getFragmentShader('aurora');

		function compile(type, source) {
			var shader = gl.createShader(type);
			gl.shaderSource(shader, source);
			gl.compileShader(shader);
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
				gl.deleteShader(shader);
				return null;
			}
			return shader;
		}

		var vs = compile(gl.VERTEX_SHADER, vsSource);
		var fs = compile(gl.FRAGMENT_SHADER, fsSource);
		if (!vs || !fs) {
			canvas.style.display = 'none';
			return;
		}

		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			canvas.style.display = 'none';
			return;
		}
		gl.useProgram(program);

		// Fullscreen triangle covering the whole clip space (-1..1), same
		// convention the frontend Gradient module uses.
		var buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 3, -1, -1, 3]),
			gl.STATIC_DRAW
		);
		var positionLoc = gl.getAttribLocation(program, 'position');
		gl.enableVertexAttribArray(positionLoc);
		gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

		function uniform(name) {
			return gl.getUniformLocation(program, name);
		}

		var uniforms = {
			resolution: uniform('u_resolution'),
			time: uniform('u_time'),
			mouse: uniform('u_mouse'),
			distortion: uniform('u_distortion'),
			swirl: uniform('u_swirl'),
			scale: uniform('u_scale'),
			angle: uniform('u_angle'),
			grainEnable: uniform('u_grain_enable'),
			grainIntensity: uniform('u_grain_intensity'),
			liquidCursor: uniform('u_liquid_cursor'),
			cursorRadius: uniform('u_cursor_radius'),
			stopCount: uniform('u_stop_count'),
			stops: uniform('u_stops'),
			offsets: uniform('u_offsets')
		};

		// Aurora's own brand gradient (see assets/branding/brandguide.html's
		// --grad-borealis) rather than an arbitrary placeholder palette.
		var stops = [
			[0x05 / 255, 0xb1 / 255, 0x72 / 255],
			[0x00 / 255, 0x99 / 255, 0xcc / 255],
			[0x57 / 255, 0x3e / 255, 0xbd / 255]
		];
		var offsets = [0, 0.5, 1];

		function resize() {
			var rect = canvas.getBoundingClientRect();
			var dpr = Math.min(window.devicePixelRatio || 1, 2);
			var width = Math.max(1, Math.round(rect.width * dpr));
			var height = Math.max(1, Math.round(rect.height * dpr));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
				gl.viewport(0, 0, width, height);
			}
		}

		var start = null;
		var rafId = null;

		function frame(timestamp) {
			if (start === null) {
				start = timestamp;
			}
			resize();

			gl.useProgram(program);
			gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
			gl.uniform1f(uniforms.time, (timestamp - start) / 1000);
			gl.uniform2f(uniforms.mouse, 0, 0);
			gl.uniform1f(uniforms.distortion, 0.55);
			gl.uniform1f(uniforms.swirl, 0.4);
			gl.uniform1f(uniforms.scale, 1.0);
			gl.uniform1f(uniforms.angle, -25);
			gl.uniform1f(uniforms.grainEnable, 0);
			gl.uniform1f(uniforms.grainIntensity, 0);
			gl.uniform1f(uniforms.liquidCursor, 0);
			gl.uniform1f(uniforms.cursorRadius, 0);
			gl.uniform1i(uniforms.stopCount, stops.length);
			gl.uniform3fv(uniforms.stops, flattenStops(stops));
			gl.uniform1fv(uniforms.offsets, new Float32Array(padOffsets(offsets)));

			gl.drawArrays(gl.TRIANGLES, 0, 3);
			rafId = window.requestAnimationFrame(frame);
		}

		function flattenStops(list) {
			var padded = list.slice();
			while (padded.length < 6) {
				padded.push(list[list.length - 1]);
			}
			var out = new Float32Array(18);
			for (var i = 0; i < 6; i++) {
				out[i * 3] = padded[i][0];
				out[i * 3 + 1] = padded[i][1];
				out[i * 3 + 2] = padded[i][2];
			}
			return out;
		}

		function padOffsets(list) {
			var padded = list.slice();
			while (padded.length < 6) {
				padded.push(1);
			}
			return padded;
		}

		// Pause the animation loop when the tab/panel isn't visible to avoid
		// burning cycles on a screen the user has switched away from.
		var panel = canvas.closest('[data-aurora-panel]');
		var observer = null;
		if (panel && 'IntersectionObserver' in window) {
			observer = new IntersectionObserver(function (entries) {
				var visible = entries[0] && entries[0].isIntersecting;
				if (visible && rafId === null) {
					rafId = window.requestAnimationFrame(frame);
				} else if (!visible && rafId !== null) {
					window.cancelAnimationFrame(rafId);
					rafId = null;
					start = null;
				}
			});
			observer.observe(canvas);
		} else {
			rafId = window.requestAnimationFrame(frame);
		}
	}
})();
