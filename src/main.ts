import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createParticles, type ParticleScene } from "./scene/particles";

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => el.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, el: ParentNode = document) => [...el.querySelectorAll<T>(s)];

/* ------------------------------------------------------------------ */
/* Smooth scroll                                                       */
/* ------------------------------------------------------------------ */
let lenis: Lenis | null = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.09, anchors: { offset: 0 } });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ------------------------------------------------------------------ */
/* Text splitting                                                      */
/* ------------------------------------------------------------------ */
function splitChars(el: HTMLElement): HTMLElement[] {
  const text = el.textContent ?? "";
  el.setAttribute("aria-label", text.trim());
  el.textContent = "";
  const chars: HTMLElement[] = [];
  text.split(/(\s+)/).forEach((part) => {
    if (!part) return;
    if (/^\s+$/.test(part)) {
      el.append(" ");
      return;
    }
    const word = document.createElement("span");
    word.className = "split-word";
    word.setAttribute("aria-hidden", "true");
    for (const ch of part) {
      const c = document.createElement("span");
      c.className = "split-char";
      c.textContent = ch;
      word.append(c);
      chars.push(c);
    }
    el.append(word);
  });
  return chars;
}

function splitWords(el: HTMLElement): HTMLElement[] {
  const words: HTMLElement[] = [];
  const walk = (node: Node, parent: HTMLElement) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        (child.textContent ?? "").split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(" ");
          const w = document.createElement("span");
          w.className = "w";
          w.textContent = part;
          words.push(w);
          frag.append(w);
        });
        parent.replaceChild(frag, child);
      } else if (child instanceof HTMLElement) {
        walk(child, child);
      }
    });
  };
  walk(el, el);
  return words;
}

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/* ------------------------------------------------------------------ */
/* Hero intro                                                          */
/* ------------------------------------------------------------------ */
const heroLines = $$("[data-split]");
const heroChars = heroLines.map((line, i) => {
  const chars = splitChars(line);
  if (i === 0) line.classList.add("split-solid");
  if (i === 1) {
    // per-character colour so the red→orange gradient survives the split
    line.classList.remove("sun");
    chars.forEach((c, j) => {
      const [r, g, b] = mix([219, 58, 52], [239, 159, 39], j / Math.max(1, chars.length - 1));
      c.style.color = `rgb(${r} ${g} ${b})`;
    });
  }
  return chars;
});
gsap.set(heroLines, { visibility: "visible" });
gsap.set("[data-hero-fade]", { visibility: "visible" });

if (!reduce) {
  const intro = gsap.timeline({ defaults: { ease: "expo.out" }, delay: 0.15 });
  intro
    .from("[data-hero-fade].pill", { y: 20, opacity: 0, filter: "blur(10px)", duration: 1.2 })
    .from(
      heroChars.flat(),
      {
        yPercent: 110,
        rotateX: -85,
        opacity: 0,
        filter: "blur(12px)",
        transformOrigin: "50% 100% -40px",
        duration: 1.5,
        stagger: 0.022,
      },
      0.15,
    )
    .from(
      ".hero-lede, .hero .actions, .scroll-cue",
      { y: 30, opacity: 0, filter: "blur(10px)", duration: 1.4, stagger: 0.12 },
      0.9,
    );

  // hero drifts back as you leave it
  gsap.to(".hero-inner", {
    yPercent: -18,
    opacity: 0,
    scale: 0.94,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
}

/* ------------------------------------------------------------------ */
/* Statement: words light up while pinned                              */
/* ------------------------------------------------------------------ */
const statementText = $("[data-words]");
if (statementText) {
  const words = splitWords(statementText);
  const hot = $$("em .w", statementText);
  if (!reduce) {
    gsap.set(words, { opacity: 0.14 });
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#sobre-mi",
        start: "top top",
        end: "+=160%",
        pin: true,
        scrub: 0.6,
      },
    });
    tl.to(words, { opacity: 1, stagger: 0.12, duration: 0.5, ease: "none" }).to(
      hot,
      { color: "#db3a34", textShadow: "0 0 40px rgba(219,58,52,.45)", duration: 0.4 },
      ">-0.2",
    );
  } else {
    hot.forEach((w) => (w.style.color = "#db3a34"));
  }
}

/* ------------------------------------------------------------------ */
/* Generic reveals                                                     */
/* ------------------------------------------------------------------ */
if (!reduce) {
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: (els) =>
      gsap.from(els, {
        y: 70,
        opacity: 0,
        rotateX: 8,
        filter: "blur(8px)",
        duration: 1.3,
        ease: "expo.out",
        stagger: 0.1,
        clearProps: "filter,transform",
      }),
  });

  // HTB: difficulty/OS bars grow in
  $$(".split-bar").forEach((bar) =>
    gsap.from(bar.children, {
      scaleX: 0,
      duration: 1.4,
      ease: "expo.out",
      stagger: 0.12,
      scrollTrigger: { trigger: bar, start: "top 92%", once: true },
    }),
  );

  $$(".meter span").forEach((bar) =>
    gsap.from(bar, {
      scaleX: 0,
      duration: 1.6,
      ease: "expo.out",
      scrollTrigger: { trigger: bar, start: "top 92%", once: true },
    }),
  );

  $$("[data-count]").forEach((el) => {
    const n = Number(el.dataset.count);
    const o = { v: 0 };
    gsap.to(o, {
      v: n,
      duration: 1.4,
      ease: "power3.out",
      snap: { v: 1 },
      onUpdate: () => (el.textContent = String(o.v)),
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  const contactTitle = $("[data-split-scroll]");
  if (contactTitle) {
    const chars = splitChars(contactTitle);
    contactTitle.classList.add("split-solid");
    gsap.from(chars, {
      yPercent: 100,
      rotateX: -90,
      opacity: 0,
      transformOrigin: "50% 100% -60px",
      stagger: 0.04,
      ease: "none",
      scrollTrigger: { trigger: "#contacto", start: "top 85%", end: "top 25%", scrub: 0.8 },
    });
  }
}

/* ------------------------------------------------------------------ */
/* Journey: horizontal pinned scroll on wide screens                   */
/* ------------------------------------------------------------------ */
const journey = $("#trayectoria")!;
const track = $("[data-journey-track]")!;
const journeyBar = $("[data-journey-bar]")!;
const mm = gsap.matchMedia();

mm.add(
  {
    wide: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    narrow: "(max-width: 767px), (prefers-reduced-motion: reduce)",
  },
  (ctx) => {
    const { wide } = ctx.conditions as { wide: boolean };
    if (!wide) {
      journey.classList.add("vertical");
      if (!reduce) {
        $$(".stop", track).forEach((s) =>
          gsap.from(s, {
            y: 60,
            opacity: 0,
            duration: 1.2,
            ease: "expo.out",
            scrollTrigger: { trigger: s, start: "top 90%", once: true },
          }),
        );
      }
      return () => journey.classList.remove("vertical");
    }

    const distance = () => track.scrollWidth - innerWidth;
    const move = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: journey,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.8,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(journeyBar, { scaleX: self.progress }),
      },
    });

    $$(".stop", track).forEach((stop) => {
      gsap.fromTo(
        stop,
        { rotateY: -28, scale: 0.88, opacity: 0.25, transformPerspective: 1200 },
        {
          rotateY: 0,
          scale: 1,
          opacity: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: stop,
            containerAnimation: move,
            start: "left 100%",
            end: "left 55%",
            scrub: true,
          },
        },
      );
    });
  },
);

/* ------------------------------------------------------------------ */
/* Particle scene, driven by scroll position                           */
/* ------------------------------------------------------------------ */
interface Key {
  el: HTMLElement;
  morph: number;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

const gl = $<HTMLCanvasElement>("#gl")!;
const particles: ParticleScene | null = createParticles(gl);
if (!particles) root.classList.add("no-gl");

if (particles) {
  const narrow = () => innerWidth < 900;
  const keys = (): Key[] => {
    const n = narrow();
    const k = (sel: string, morph: number, x: number, scale: number, opacity: number, y = 0, ny = y * 0.5): Key => {
      const el = $(sel)!;
      // pinned sections live inside a pin-spacer; measure that instead
      const box = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
      return { el: box, morph, x: n ? 0 : x, y: n ? ny : y, scale, opacity: n ? opacity * 0.7 : opacity };
    };
    return [
      k("#inicio", 0, 2.1, 1, 0.85, 0, -2.1),
      k("#sobre-mi", 1, 2.7, 0.85, 0.55),
      k(".facts", 1, 2.7, 0.85, 0.3),
      k("#trayectoria", 2, 0, 1.1, 0.3, 0.15),
      k("#proyectos", 2, -2.4, 1, 0.3),
      k("#hack-the-box", 2, 2.6, 0.9, 0.25),
      k("#habilidades", 3, 0, 1.05, 0.5),
      k("#contacto", 3, 0, 1.4, 0.6),
    ];
  };

  let points: { at: number; key: Key }[] = [];
  const measure = () => {
    points = keys().map((key) => {
      const r = key.el.getBoundingClientRect();
      return { at: r.top + scrollY + r.height / 2 - innerHeight / 2, key };
    });
  };
  ScrollTrigger.addEventListener("refresh", measure);
  measure();

  const smooth = (t: number) => t * t * (3 - 2 * t);
  const state = { morph: 0, x: 0, y: 0, scale: 1, opacity: 1 };
  const apply = () => {
    const y = scrollY;
    let a = points[0];
    let b = points[0];
    for (let i = 0; i < points.length; i++) {
      if (points[i].at <= y) a = points[i];
      if (points[i].at >= y) {
        b = points[i];
        break;
      }
      b = points[i];
    }
    const span = b.at - a.at;
    const t = span > 0 ? smooth(Math.min(1, Math.max(0, (y - a.at) / span))) : 0;
    const lerp = (p: keyof Omit<Key, "el">) => a.key[p] + (b.key[p] - a.key[p]) * t;
    state.morph = lerp("morph");
    state.x = lerp("x");
    state.y = lerp("y");
    state.scale = lerp("scale");
    state.opacity = lerp("opacity");
  };

  // ease the scene toward the scroll-derived state every frame
  const cur = { ...state };
  gsap.ticker.add(() => {
    apply();
    const k = reduce ? 1 : 0.08;
    cur.morph += (state.morph - cur.morph) * k;
    cur.x += (state.x - cur.x) * k;
    cur.y += (state.y - cur.y) * k;
    cur.scale += (state.scale - cur.scale) * k;
    cur.opacity += (state.opacity - cur.opacity) * k;
    particles.uniforms.uMorph.value = cur.morph;
    particles.uniforms.uOpacity.value = cur.opacity;
    particles.layout.x = cur.x;
    particles.layout.y = cur.y;
    particles.layout.scale = cur.scale;
  });

  if (reduce) {
    particles.uniforms.uIntro.value = 1;
    particles.setStill(true);
  } else {
    gsap.to(particles.uniforms.uIntro, { value: 1, duration: 3, ease: "power2.out", delay: 0.1 });
  }
}

/* ------------------------------------------------------------------ */
/* Project cards: 3D tilt + glare                                      */
/* ------------------------------------------------------------------ */
if (finePointer && !reduce) {
  $$("[data-tilt]").forEach((card) => {
    const rx = gsap.quickTo(card, "rotateX", { duration: 0.6, ease: "power3.out" });
    const ry = gsap.quickTo(card, "rotateY", { duration: 0.6, ease: "power3.out" });
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      rx((0.5 - py) * 10);
      ry((px - 0.5) * 12);
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
      card.style.setProperty("--glare", "1");
    });
    card.addEventListener("pointerleave", () => {
      rx(0);
      ry(0);
      card.style.setProperty("--glare", "0");
    });
  });

  $$("[data-magnetic]").forEach((btn) => {
    const mx = gsap.quickTo(btn, "x", { duration: 0.5, ease: "power3.out" });
    const my = gsap.quickTo(btn, "y", { duration: 0.5, ease: "power3.out" });
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      mx((e.clientX - r.left - r.width / 2) * 0.3);
      my((e.clientY - r.top - r.height / 2) * 0.4);
    });
    btn.addEventListener("pointerleave", () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.4)" });
    });
  });
}

/* ------------------------------------------------------------------ */
/* Gear outline for the scan visual                                    */
/* ------------------------------------------------------------------ */
const gearPath = $<SVGPathElement>("[data-gear]");
if (gearPath) {
  const teeth = 14;
  const steps = teeth * 8;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const s = Math.sin(teeth * t);
    const r = s > 0.2 ? 82 : s < -0.2 ? 68 : 68 + ((s + 0.2) / 0.4) * 14;
    d += `${i ? "L" : "M"}${(Math.cos(t) * r).toFixed(1)} ${(Math.sin(t) * r).toFixed(1)}`;
  }
  gearPath.setAttribute("d", d + "Z");
}

/* ------------------------------------------------------------------ */
/* Nav                                                                 */
/* ------------------------------------------------------------------ */
const nav = $("[data-nav]")!;
const burger = $<HTMLButtonElement>("[data-burger]")!;
const menuLinks = $$<HTMLAnchorElement>("[data-menu] a");

function setMenu(open: boolean) {
  root.classList.toggle("menu-open", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  menuLinks.forEach((a) => (a.tabIndex = open ? 0 : -1));
  if (open) lenis?.stop();
  else lenis?.start();
  document.body.style.overflow = open ? "hidden" : "";
}
burger.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
menuLinks.forEach((a) => a.addEventListener("click", () => setMenu(false)));
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && root.classList.contains("menu-open")) {
    setMenu(false);
    burger.focus();
  }
});

let lastY = 0;
ScrollTrigger.create({
  start: 0,
  end: "max",
  onUpdate: () => {
    const y = scrollY;
    nav.classList.toggle("scrolled", y > 10);
    const down = y > lastY && y > 400;
    if (!root.classList.contains("menu-open")) nav.classList.toggle("hidden", down);
    lastY = y;
  },
});
nav.addEventListener("focusin", () => nav.classList.remove("hidden"));

const navLinks = $$<HTMLAnchorElement>("[data-nav-link]");
navLinks.forEach((a) => {
  const section = $(a.hash);
  if (!section) return;
  ScrollTrigger.create({
    trigger: section,
    start: "top 50%",
    end: "bottom 50%",
    onToggle: (self) => {
      if (self.isActive) navLinks.forEach((l) => l.setAttribute("aria-current", String(l === a)));
    },
  });
});

/* ------------------------------------------------------------------ */
/* Copy email                                                          */
/* ------------------------------------------------------------------ */
const copyBtn = $<HTMLButtonElement>("[data-copy]");
const copyLabel = $("[data-copy-label]");
const copyStatus = $("[data-copy-status]");
let copyTimer = 0;
copyBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(copyBtn.dataset.copy!);
    copyLabel!.textContent = "Email copiado";
    copyStatus!.textContent = "Email copiado al portapapeles";
  } catch {
    copyLabel!.textContent = "No se pudo copiar";
  }
  clearTimeout(copyTimer);
  copyTimer = window.setTimeout(() => (copyLabel!.textContent = "Copiar email"), 2200);
});

const year = $("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());

// fonts change line widths: re-measure pins once they load
document.fonts?.ready.then(() => ScrollTrigger.refresh());
