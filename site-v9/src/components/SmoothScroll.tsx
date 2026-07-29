"use client";

/**
 * Rolagem suave (Lenis) sincronizada com o GSAP ScrollTrigger, e revelação
 * dos blocos de texto. Cada biblioteca tem função própria:
 *  - Lenis: inércia de rolagem consistente entre mouse, trackpad e toque;
 *  - ScrollTrigger: disparo dos textos no momento certo;
 *  - o palco 3D lê a posição da rolagem diretamente, sem intermediário.
 */

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Revelação dos blocos — funciona com ou sem movimento reduzido.
    const revealables = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduced) {
      revealables.forEach((el) => el.classList.add("is-in"));
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      // O toque usa a rolagem nativa: é mais previsível e não briga com o navegador.
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // Um ato por vez: o texto do ato entra e sai junto com a cena 3D dele,
    // para nunca haver dois blocos legíveis sobrepostos.
    const acts = Array.from(document.querySelectorAll<HTMLElement>(".act"));
    acts.forEach((act, index) => {
      const inner = act.querySelector<HTMLElement>(".act__inner");
      if (!inner) return;
      ScrollTrigger.create({
        trigger: act,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const p = self.progress;
          const fadeIn = index === 0 ? 1 : Math.min(1, p / 0.12);
          const fadeOut = Math.min(1, (1 - p) / 0.14);
          inner.style.opacity = String(Math.max(0, Math.min(fadeIn, fadeOut)));
        },
      });
    });

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    revealables.forEach((el) => io.observe(el));

    // Âncoras internas passam pelo Lenis para não brigar com a rolagem suave.
    const onClick = (ev: MouseEvent) => {
      const a = (ev.target as HTMLElement)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = document.getElementById(id);
      if (!el) return;
      ev.preventDefault();
      lenis.scrollTo(el, { offset: -64 });
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      io.disconnect();
      gsap.ticker.remove(raf);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return null;
}
