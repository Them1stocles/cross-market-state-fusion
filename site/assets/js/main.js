/* ============================================================
   Trevor Chapman — interaction layer
   Vanilla-first; GSAP / Lenis are progressive enhancements.
   ============================================================ */
(function () {
	"use strict";

	var doc = document;
	var body = doc.body;
	var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	var isTouch = window.matchMedia("(hover: none)").matches;

	function $(s, c) { return (c || doc).querySelector(s); }
	function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
	function lerp(a, b, n) { return a + (b - a) * n; }

	/* ----------------------------------------------------------
	   0. Split text for word/char reveals
	   ---------------------------------------------------------- */
	function splitWords(el) {
		el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
		// Walk original child nodes so <br> and structure are preserved.
		var src = Array.prototype.slice.call(el.childNodes);
		el.innerHTML = "";
		src.forEach(function (node) {
			if (node.nodeType === 1 && node.tagName === "BR") {
				el.appendChild(doc.createElement("br"));
				return;
			}
			var text = node.textContent || "";
			text.split(/(\s+)/).forEach(function (w) {
				if (w === "") return;
				if (/^\s+$/.test(w)) { el.appendChild(doc.createTextNode(" ")); return; }
				var wrap = doc.createElement("span");
				wrap.className = "word";
				var inner = doc.createElement("span");
				inner.textContent = w;
				wrap.appendChild(inner);
				el.appendChild(wrap);
			});
		});
	}
	$$(".reveal-words").forEach(splitWords);

	/* ----------------------------------------------------------
	   1. Preloader
	   ---------------------------------------------------------- */
	var preloader = $("#preloader");
	var countEl = $("#loadCount");
	function runPreloader(done) {
		if (!preloader) { done(); return; }
		var n = 0;
		var dur = reduce ? 1 : 1500;
		var start = performance.now();
		function tick(now) {
			var p = Math.min((now - start) / dur, 1);
			// ease-out
			var eased = 1 - Math.pow(1 - p, 3);
			n = Math.round(eased * 100);
			if (countEl) countEl.textContent = n;
			if (p < 1) { requestAnimationFrame(tick); }
			else {
				preloader.style.transition = "opacity .8s ease, transform 1s cubic-bezier(.7,0,.2,1)";
				preloader.style.transform = "translateY(-100%)";
				preloader.style.opacity = "0";
				setTimeout(function () { preloader.style.display = "none"; }, 900);
				body.classList.remove("is-loading");
				body.classList.add("loaded");
				done();
			}
		}
		requestAnimationFrame(tick);
	}

	/* ----------------------------------------------------------
	   2. Smooth scroll (Lenis if available)
	   ---------------------------------------------------------- */
	var lenis = null;
	function initSmoothScroll() {
		if (reduce || typeof Lenis === "undefined") return;
		lenis = new Lenis({ duration: 1.1, smoothWheel: true, lerp: 0.09 });
		function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
		requestAnimationFrame(raf);
		lenis.on("scroll", function (e) {
			if (window.__setCosmosScroll) window.__setCosmosScroll(e.scroll || window.scrollY);
			updateProgress();
		});
	}

	function scrollToTarget(target) {
		var el = typeof target === "string" ? $(target) : target;
		if (!el) return;
		if (lenis) lenis.scrollTo(el, { offset: 0 });
		else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
	}

	// anchor links
	$$('a[href^="#"]').forEach(function (a) {
		a.addEventListener("click", function (e) {
			var id = a.getAttribute("href");
			if (id.length < 2) return;
			var t = $(id);
			if (!t) return;
			e.preventDefault();
			body.classList.remove("menu-open");
			scrollToTarget(t);
		});
	});

	/* ----------------------------------------------------------
	   3. Reveal on scroll (IntersectionObserver — always works)
	   ---------------------------------------------------------- */
	function initReveals() {
		var items = $$(".reveal-up, .reveal-words, .section-head, .media-frame, .pillar, .ethos__word");
		if (!("IntersectionObserver" in window)) {
			items.forEach(function (el) { el.classList.add("in"); });
			return;
		}
		// stagger groups
		$$(".pillar").forEach(function (el, i) { el.style.transitionDelay = (i * 0.1) + "s"; });
		$$(".ethos__word").forEach(function (el, i) { el.style.transitionDelay = (i * 0.08) + "s"; });
		$$(".reveal-words").forEach(function (el) {
			$$(".word > span", el).forEach(function (s, i) { s.style.transitionDelay = (i * 0.045) + "s"; });
		});

		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (en.isIntersecting) {
					en.target.classList.add("in");
					if (en.target.hasAttribute("data-count")) animateCount(en.target);
					if (en.target.querySelectorAll) {
						$$("[data-count]", en.target).forEach(animateCount);
					}
					io.unobserve(en.target);
				}
			});
		}, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });

		items.forEach(function (el) { io.observe(el); });
		$$("[data-count]").forEach(function (el) { io.observe(el); });
	}

	/* ----------------------------------------------------------
	   4. Number counters
	   ---------------------------------------------------------- */
	function animateCount(el) {
		if (el.__counted) return;
		var target = parseFloat(el.getAttribute("data-count"));
		if (isNaN(target)) return;
		el.__counted = true;
		var prefix = el.getAttribute("data-prefix") || "";
		var suffix = el.getAttribute("data-suffix") || "";
		var dur = reduce ? 0 : 1400;
		var start = performance.now();
		function tick(now) {
			var p = Math.min((now - start) / dur, 1);
			var eased = 1 - Math.pow(1 - p, 3);
			var val = Math.round(target * eased);
			el.textContent = prefix + val + suffix;
			if (p < 1) requestAnimationFrame(tick);
		}
		if (dur === 0) { el.textContent = prefix + target + suffix; }
		else requestAnimationFrame(tick);
	}

	/* ----------------------------------------------------------
	   5. Scroll progress + active nav/dots + topbar hide
	   ---------------------------------------------------------- */
	var progressBar = $("#progress");
	var topbar = $("#topbar");
	var sections = $$("main section[id]");
	var navLinks = $$(".nav a");
	var dotLinks = $$(".dots .dot");
	var lastScroll = 0;

	function updateProgress() {
		var st = window.scrollY || window.pageYOffset || 0;
		var h = doc.documentElement.scrollHeight - window.innerHeight;
		var p = h > 0 ? st / h : 0;
		if (progressBar) progressBar.style.width = (p * 100) + "%";

		// topbar styling + auto-hide
		if (topbar) {
			topbar.classList.toggle("is-scrolled", st > 40);
			if (st > lastScroll && st > 500 && !body.classList.contains("menu-open")) topbar.classList.add("is-hidden");
			else topbar.classList.remove("is-hidden");
		}
		lastScroll = st;

		// active section
		var current = "";
		var mid = st + window.innerHeight * 0.4;
		sections.forEach(function (sec) {
			if (sec.offsetTop <= mid) current = sec.id;
		});
		navLinks.forEach(function (a) {
			a.classList.toggle("is-active", a.getAttribute("href") === "#" + current);
		});
		dotLinks.forEach(function (d) {
			d.classList.toggle("is-active", d.getAttribute("href") === "#" + current);
		});
	}
	window.addEventListener("scroll", updateProgress, { passive: true });

	/* ----------------------------------------------------------
	   6. Custom cursor + magnetic + tilt + frame glow
	   ---------------------------------------------------------- */
	function initCursor() {
		if (isTouch) return;
		var cursor = $("#cursor");
		var dot = $(".cursor__dot");
		var ring = $(".cursor__ring");
		if (!cursor) return;
		var mx = window.innerWidth / 2, my = window.innerHeight / 2;
		var rx = mx, ry = my;

		window.addEventListener("mousemove", function (e) {
			mx = e.clientX; my = e.clientY;
			dot.style.transform = "translate(" + mx + "px," + my + "px) translate(-50%,-50%)";
		});
		window.addEventListener("mousedown", function () { cursor.classList.add("is-down"); });
		window.addEventListener("mouseup", function () { cursor.classList.remove("is-down"); });

		function loop() {
			rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
			ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
			requestAnimationFrame(loop);
		}
		loop();

		$$('[data-cursor="hover"], a, button').forEach(function (el) {
			el.addEventListener("mouseenter", function () { cursor.classList.add("is-hover"); });
			el.addEventListener("mouseleave", function () { cursor.classList.remove("is-hover"); });
		});
	}

	function initMagnetic() {
		if (isTouch) return;
		$$(".magnetic").forEach(function (el) {
			var strength = 0.35;
			el.addEventListener("mousemove", function (e) {
				var r = el.getBoundingClientRect();
				var x = e.clientX - (r.left + r.width / 2);
				var y = e.clientY - (r.top + r.height / 2);
				el.style.transform = "translate(" + x * strength + "px," + y * strength + "px)";
			});
			el.addEventListener("mouseleave", function () {
				el.style.transform = "translate(0,0)";
			});
		});
	}

	function initTilt() {
		if (isTouch) return;
		$$("[data-tilt]").forEach(function (el) {
			var frame = $(".media-frame", el) || el;
			var glow = $(".media-frame__glow", el);
			var max = 9;
			el.addEventListener("mousemove", function (e) {
				var r = el.getBoundingClientRect();
				var px = (e.clientX - r.left) / r.width;
				var py = (e.clientY - r.top) / r.height;
				var rx = (py - 0.5) * -2 * max;
				var ry = (px - 0.5) * 2 * max;
				frame.style.transform = "perspective(1000px) rotateX(" + rx + "deg) rotateY(" + ry + "deg) scale(1.02)";
				if (glow) { glow.style.setProperty("--mx", (px * 100) + "%"); glow.style.setProperty("--my", (py * 100) + "%"); }
			});
			el.addEventListener("mouseleave", function () {
				frame.style.transform = "perspective(1000px) rotateX(0) rotateY(0) scale(1)";
			});
		});
	}

	/* ----------------------------------------------------------
	   7. Parallax (rAF, transform-based)
	   ---------------------------------------------------------- */
	function initParallax() {
		if (reduce) return;
		var items = $$("[data-parallax]");
		if (!items.length) return;
		function update() {
			var vh = window.innerHeight;
			items.forEach(function (el) {
				var r = el.getBoundingClientRect();
				if (r.bottom < -200 || r.top > vh + 200) return;
				var speed = parseFloat(el.getAttribute("data-speed")) || 1;
				var center = r.top + r.height / 2 - vh / 2;
				var move = -(center / vh) * speed * 26;
				el.style.transform = "translate3d(0," + move + "px,0)";
			});
			requestAnimationFrame(update);
		}
		requestAnimationFrame(update);
	}

	/* ----------------------------------------------------------
	   8. Ethos words — light up sequentially while in view
	   ---------------------------------------------------------- */
	function initEthos() {
		var words = $$(".ethos__word");
		if (!words.length || !("IntersectionObserver" in window)) return;
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (en.isIntersecting) {
					words.forEach(function (w, i) {
						setTimeout(function () {
							w.classList.add("lit");
							setTimeout(function () { w.classList.remove("lit"); }, 600);
						}, 400 + i * 220);
					});
					io.disconnect();
				}
			});
		}, { threshold: 0.5 });
		io.observe($(".ethos__words"));
	}

	/* ----------------------------------------------------------
	   9. Mobile menu
	   ---------------------------------------------------------- */
	function initMenu() {
		var toggle = $("#navToggle");
		if (!toggle) return;
		toggle.addEventListener("click", function () {
			body.classList.toggle("menu-open");
		});
	}

	/* ----------------------------------------------------------
	   10. Hero title — char reveal via GSAP if present
	   ---------------------------------------------------------- */
	function animateHero() {
		var wraps = $$(".char-wrap");
		// initial state handled by overflow:hidden lines; animate up
		wraps.forEach(function (w, i) {
			w.style.transform = "translateY(110%)";
			w.style.transition = "transform 1s cubic-bezier(.22,1,.36,1) " + (0.1 + i * 0.12) + "s";
		});
		requestAnimationFrame(function () {
			requestAnimationFrame(function () {
				wraps.forEach(function (w) { w.style.transform = "translateY(0)"; });
			});
		});
		// eyebrow / sub / cta
		$$(".hero .reveal-up").forEach(function (el, i) {
			setTimeout(function () { el.classList.add("in"); }, 500 + i * 140);
		});
	}

	/* ----------------------------------------------------------
	   Email — assemble from parts so the plaintext address is
	   never present in the served HTML for scrapers to harvest.
	   ---------------------------------------------------------- */
	function initEmail() {
		var link = $("#emailLink");
		if (!link) return;
		var user = link.getAttribute("data-user");
		var domain = link.getAttribute("data-domain");
		if (!user || !domain) return;
		var addr = user + "@" + domain;
		link.setAttribute("href", "mailto:" + addr);
		var label = $(".contact__email-text", link);
		if (label) label.textContent = addr;
	}

	/* ----------------------------------------------------------
	   Footer year
	   ---------------------------------------------------------- */
	var yEl = $("#year"); if (yEl) yEl.textContent = new Date().getFullYear();

	/* ----------------------------------------------------------
	   Boot
	   ---------------------------------------------------------- */
	function boot() {
		initSmoothScroll();
		initReveals();
		initCursor();
		initMagnetic();
		initTilt();
		initParallax();
		initEthos();
		initMenu();
		initEmail();
		updateProgress();
		animateHero();
	}

	window.addEventListener("load", function () {
		runPreloader(boot);
	});
	// safety: if load already fired or stalls, boot anyway
	setTimeout(function () {
		if (!body.classList.contains("loaded")) runPreloader(boot);
	}, 4000);
})();
