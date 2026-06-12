/* ============================================================
   Cosmos — self-contained animated starfield + nebula
   No dependencies. Respects prefers-reduced-motion & DPR.
   ============================================================ */
(function () {
	"use strict";

	var canvas = document.getElementById("cosmos");
	if (!canvas) return;
	var ctx = canvas.getContext("2d", { alpha: true });
	var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	var DPR = Math.min(window.devicePixelRatio || 1, 2);
	var W = 0, H = 0;
	var stars = [];
	var nebulae = [];
	var shooting = [];
	var mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
	var scrollY = 0;
	var lastShoot = 0;

	var palette = ["#ffffff", "#cfe2ff", "#fff4d6", "#bda9ff", "#9fe9ff"];

	function rand(a, b) { return a + Math.random() * (b - a); }
	function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

	function resize() {
		W = window.innerWidth;
		H = window.innerHeight;
		canvas.style.width = W + "px";
		canvas.style.height = H + "px";
		canvas.width = W * DPR;
		canvas.height = H * DPR;
		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		build();
	}

	function build() {
		var area = W * H;
		var count = Math.min(420, Math.round(area / 5200));
		stars = [];
		for (var i = 0; i < count; i++) {
			var depth = Math.random();           // 0 far .. 1 near
			stars.push({
				x: Math.random() * W,
				y: Math.random() * H,
				z: depth,
				r: rand(0.3, 1.6) * (0.5 + depth),
				base: rand(0.25, 0.9),
				tw: rand(0.6, 2.4),               // twinkle speed
				ph: Math.random() * Math.PI * 2,
				c: pick(palette)
			});
		}
		nebulae = [
			{ x: 0.25, y: 0.2, r: 0.55, c: "rgba(120,90,255,0.16)" },
			{ x: 0.8, y: 0.35, r: 0.5, c: "rgba(70,180,255,0.10)" },
			{ x: 0.55, y: 0.85, r: 0.6, c: "rgba(245,200,120,0.07)" }
		];
	}

	function spawnShoot() {
		var fromLeft = Math.random() > 0.5;
		shooting.push({
			x: fromLeft ? rand(-0.1, 0.3) * W : rand(0.7, 1.1) * W,
			y: rand(0, 0.4) * H,
			vx: (fromLeft ? 1 : -1) * rand(6, 11),
			vy: rand(3, 6),
			life: 0,
			max: rand(60, 100)
		});
	}

	function drawNebula() {
		for (var i = 0; i < nebulae.length; i++) {
			var n = nebulae[i];
			var px = (mouse.x - 0.5) * 30 * (i + 1);
			var py = (mouse.y - 0.5) * 30 * (i + 1) - scrollY * 0.04 * (i + 1);
			var cx = n.x * W + px;
			var cy = n.y * H + py;
			var rad = n.r * Math.max(W, H);
			var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
			g.addColorStop(0, n.c);
			g.addColorStop(1, "rgba(0,0,0,0)");
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
		}
	}

	var t = 0;
	function frame() {
		t += 0.016;
		mouse.x += (mouse.tx - mouse.x) * 0.06;
		mouse.y += (mouse.ty - mouse.y) * 0.06;

		ctx.clearRect(0, 0, W, H);
		ctx.globalCompositeOperation = "lighter";
		drawNebula();

		// stars
		var mxOff = (mouse.x - 0.5);
		var myOff = (mouse.y - 0.5);
		for (var i = 0; i < stars.length; i++) {
			var s = stars[i];
			// parallax by depth from mouse + scroll
			var px = s.x + mxOff * 40 * s.z;
			var py = s.y + myOff * 40 * s.z - scrollY * 0.12 * s.z;
			// wrap vertically with scroll
			py = ((py % H) + H) % H;
			var a = s.base * (0.55 + 0.45 * Math.sin(t * s.tw + s.ph));
			ctx.beginPath();
			ctx.globalAlpha = a;
			ctx.fillStyle = s.c;
			ctx.arc(px, py, s.r, 0, Math.PI * 2);
			ctx.fill();
			// occasional glow for near stars
			if (s.z > 0.85) {
				ctx.globalAlpha = a * 0.25;
				ctx.arc(px, py, s.r * 3, 0, Math.PI * 2);
				ctx.fill();
			}
		}
		ctx.globalAlpha = 1;

		// shooting stars
		if (!reduce && t - lastShoot > rand(2.5, 6) && shooting.length < 2) {
			lastShoot = t; spawnShoot();
		}
		for (var j = shooting.length - 1; j >= 0; j--) {
			var sh = shooting[j];
			sh.x += sh.vx; sh.y += sh.vy; sh.life++;
			var fade = 1 - sh.life / sh.max;
			if (fade <= 0) { shooting.splice(j, 1); continue; }
			var tailX = sh.x - sh.vx * 8;
			var tailY = sh.y - sh.vy * 8;
			var grad = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
			grad.addColorStop(0, "rgba(255,244,214," + fade + ")");
			grad.addColorStop(1, "rgba(255,244,214,0)");
			ctx.strokeStyle = grad;
			ctx.lineWidth = 1.6;
			ctx.beginPath();
			ctx.moveTo(sh.x, sh.y);
			ctx.lineTo(tailX, tailY);
			ctx.stroke();
		}

		ctx.globalCompositeOperation = "source-over";
		requestAnimationFrame(frame);
	}

	// ---- events ----
	window.addEventListener("resize", resize, { passive: true });
	window.addEventListener("mousemove", function (e) {
		mouse.tx = e.clientX / window.innerWidth;
		mouse.ty = e.clientY / window.innerHeight;
	}, { passive: true });
	window.addEventListener("scroll", function () {
		scrollY = window.scrollY || window.pageYOffset || 0;
	}, { passive: true });
	// expose for Lenis-driven scroll updates
	window.__setCosmosScroll = function (y) { scrollY = y; };

	resize();
	if (reduce) {
		// draw a single static frame
		ctx.clearRect(0, 0, W, H);
		drawNebula();
		for (var k = 0; k < stars.length; k++) {
			var st = stars[k];
			ctx.globalAlpha = st.base; ctx.fillStyle = st.c;
			ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
		}
		ctx.globalAlpha = 1;
	} else {
		requestAnimationFrame(frame);
	}
})();
