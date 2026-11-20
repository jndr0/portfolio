# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Single-page personal portfolio for Alejandro Peñalver Sánchez (Spanish-language content). Vanilla TypeScript built with Vite. Uses Three.js for the WebGL particle scene, GSAP + ScrollTrigger for motion and Lenis for smooth scrolling. No framework, no CSS framework. Deployed to GitHub Pages.

## Commands

- `npm run dev` starts the Vite dev server at `http://localhost:5173/portfolio/`.
- `npm run build` runs `tsc --noEmit` (TypeScript 7), then `vite build` into `dist/`. Type errors fail the build.
- `npm run preview` serves the built `dist/`.

There is no test suite or linter.

## Architecture

- `index.html` holds all page content and markup. Text edits go there.
- The colour palette is taken from the user's writeups site, jndr0.gitlab.io (its dark Docusaurus theme). The accent is red `#db3a34`; small red text uses `--accent-text`. The Hack The Box section only shows totals (count, difficulty and OS split) and one link to `https://jndr0.gitlab.io/writeups`. The user does not want individual machines listed or linked. Update the counts (facts, hero, meta description, HTB card) when new writeups are added.
- `src/style.css` holds design tokens (CSS variables on `:root`) and all styles, including the CSS-only card visuals (sensor traces, gear scan, marquee).
- `src/main.ts` wires up all behaviour:
  - Lenis is synced to ScrollTrigger through `gsap.ticker`.
  - `splitChars` and `splitWords` split text for the hero intro, the pinned statement and the contact title. Gradient text can't survive per-character transforms, so split elements get `.split-solid` or per-char colours.
  - `[data-reveal]` elements are revealed with `ScrollTrigger.batch`.
  - The `#trayectoria` horizontal pinned scroll uses `gsap.matchMedia`. Below 768px or under reduced motion it falls back to a vertical list via `.journey.vertical`.
  - Also here: tilt and magnetic hover, nav hide/active state, mobile menu, copy-email.
- `src/scene/particles.ts` is one fixed full-screen `<canvas id="gl">` behind the page. It is a `Points` cloud with a custom shader that morphs between four precomputed shapes (attributes `aP0`–`aP3`). `uMorph` goes 0→3, and there is a scanner-line highlight.
- `src/scene/shapes.ts` generates those shapes: sphere, padlock, gear and galaxy. It uses a seeded PRNG so the shapes are deterministic.
- `main.ts` drives the scene through a keyframe list (the `keys()` function). Each section maps to a morph value, x/y offset, scale and opacity. The current values are interpolated from scroll position and eased each tick. Pinned sections are measured through their `.pin-spacer`. Positions are re-measured on `ScrollTrigger` refresh.
- If WebGL is unavailable, `createParticles` returns `null`, `html.no-gl` is set and a CSS gradient fallback shows.
- An inline script swaps `html.no-js` to `.js`. CSS hides `[data-split]` and `[data-hero-fade]` only under `.js` until `main.ts` reveals them.

## Deployment

`.github/workflows/deploy.yml` runs `npm ci && npm run build` and deploys `dist/` to GitHub Pages on every push to `main`. `vite.config.ts` sets `base: "/portfolio/"`, so the site lives at `https://jndr0.github.io/portfolio/`. Root-absolute URLs in `index.html` (e.g. `/favicon.svg`, `/src/main.ts`) are rewritten by Vite with the base. Don't hand-prefix them.
