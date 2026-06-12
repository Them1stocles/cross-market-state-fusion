# trevorchapman.com — cosmic redesign

A cinematic, single-page rebuild of trevorchapman.com. Static HTML/CSS/JS — no
build step, no framework. Drops straight onto GoDaddy (or any static host).

## What's inside
```
site/
├── index.html              # all markup + content
├── assets/
│   ├── css/main.css        # full design system + animations
│   └── js/
│       ├── cosmos.js       # animated starfield / nebula background (vanilla canvas)
│       └── main.js         # preloader, smooth scroll, cursor, reveals, parallax…
└── images/                 # intro / work / about (optimized & resized)
```

## Features
- **Cosmic canvas background** — depth-parallax starfield, drifting nebulae,
  shooting stars, mouse parallax. Pure `<canvas>`, no libraries.
- **Cinematic preloader** with a drawn-gem mark and count-up.
- **Smooth scroll** via [Lenis](https://github.com/darkroomengineering/lenis)
  (CDN, progressive enhancement — the site is fully functional without it).
- **Scroll-reveal** animations, kinetic typography, animated counters.
- **Custom cursor**, magnetic buttons, 3D tilt cards, image wipe-ins.
- **Fully responsive** with an animated mobile menu.
- **Accessible & resilient**: respects `prefers-reduced-motion`, works with
  JavaScript disabled (no content is hidden behind JS), works if the CDN/fonts
  are blocked (system-font + no-smooth fallback).

## Deploy to GoDaddy
Upload the **contents of this `site/` folder** to your hosting web root
(`public_html/`) so that `index.html` sits at the root. That's it — no server
config required.

## Local preview
```bash
cd site
python3 -m http.server 8099
# open http://localhost:8099
```

## Editing content
All copy lives in `index.html`. Investment names are in the two `.marquee`
blocks; portfolio focus areas are the three `.pillar` cards.
