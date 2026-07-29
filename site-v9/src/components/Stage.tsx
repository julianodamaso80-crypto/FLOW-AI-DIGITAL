"use client";

/**
 * Palco 3D da experiência.
 *
 * Um único campo de nós e ligações, renderizado em WebGL, que se reconfigura
 * conforme a rolagem avança. A posição de cada nó é função pura do progresso:
 * rolar para cima desfaz exatamente o que rolar para baixo construiu.
 *
 * Os rótulos são HTML real, posicionados por projeção das coordenadas 3D —
 * o texto continua selecionável, acessível e indexável.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { BRAND_HEX, clamp01, lerp, smooth } from "@/lib/brand";
import { NODE_COUNT, buildTimeline, type Layout } from "@/lib/layouts";

/** Janela de cada estágio na linha do tempo global (0 a 1). */
const STAGES: { key: string; from: number; to: number }[] = [
  { key: "hero", from: 0.0, to: 0.12 },
  { key: "ecosystem", from: 0.12, to: 0.32 },
  { key: "problem", from: 0.32, to: 0.44 },
  { key: "trackingOld", from: 0.44, to: 0.52 },
  { key: "trackingNew", from: 0.52, to: 0.62 },
  { key: "path", from: 0.62, to: 0.72 },
  { key: "agents", from: 0.72, to: 0.84 },
  { key: "method", from: 0.84, to: 0.93 },
  { key: "finale", from: 0.93, to: 1.0 },
];

/** Câmera por estágio: posição e alvo. */
const CAMS: Record<string, { pos: [number, number, number]; look: [number, number, number] }> = {
  hero: { pos: [0, 1.5, 26], look: [-2, 0.5, 0] },
  ecosystem: { pos: [0, 14, 20], look: [0, 0, 0] },
  problem: { pos: [0, 0.5, 24], look: [0, 0.5, 0] },
  trackingOld: { pos: [2, 1, 22], look: [0, 0, 0] },
  trackingNew: { pos: [0, 3.5, 21], look: [0, 0, 0] },
  path: { pos: [-13, 4, 20], look: [2, 0, -6] },
  agents: { pos: [0, 2, 22], look: [0, -1, -8] },
  method: { pos: [0, 2, 25], look: [1.5, -1.5, -6] },
  finale: { pos: [0, 0.5, 27], look: [0, 0, 0] },
};

const MAX_LINKS = 160;
const MAX_LABELS = 12;

export interface LabelSet {
  /** chave do estágio */
  stage: string;
  /** textos na ordem dos nós rotulados */
  items: { title: string; note?: string }[];
}

export default function Stage({
  labelSets,
  targetId = "experience",
}: {
  labelSets: LabelSet[];
  targetId?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      host.dataset.mode = "reduced";
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      host.dataset.mode = "nowebgl";
      return;
    }

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(BRAND_HEX.black, 0.016);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(0, 1.5, 26);

    /**
     * No desktop o texto fica à esquerda, então a cena 3D é deslocada para a
     * direita. No mobile ela fica centralizada e mais discreta, atrás do texto.
     */
    const world = new THREE.Group();
    scene.add(world);

    /* ---------------- nós ---------------- */
    const nodeGeo = new THREE.SphereGeometry(0.3, isMobile ? 10 : 16, isMobile ? 8 : 12);
    // Sem vertexColors: a cor vem de instanceColor, por nó.
    const nodeMat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, NODE_COUNT);
    nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const nodeColors = new Float32Array(NODE_COUNT * 3);
    nodes.instanceColor = new THREE.InstancedBufferAttribute(nodeColors, 3);
    nodes.instanceColor.setUsage(THREE.DynamicDrawUsage);
    world.add(nodes);

    /* ---------------- halos ---------------- */
    const haloTex = makeHaloTexture();
    const haloMat = new THREE.SpriteMaterial({
      map: haloTex,
      color: BRAND_HEX.orange,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halos: THREE.Sprite[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const s = new THREE.Sprite(haloMat.clone());
      s.scale.setScalar(2.2);
      world.add(s);
      halos.push(s);
    }

    /* ---------------- ligações ---------------- */
    const linkGeo = new THREE.BufferGeometry();
    const linkPos = new Float32Array(MAX_LINKS * 2 * 3);
    const linkCol = new Float32Array(MAX_LINKS * 2 * 3);
    linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
    linkGeo.setAttribute("color", new THREE.BufferAttribute(linkCol, 3));
    const linkMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const links = new THREE.LineSegments(linkGeo, linkMat);
    world.add(links);

    /* ---------------- pulsos de dado ---------------- */
    const pulseGeo = new THREE.SphereGeometry(0.16, 8, 6);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: BRAND_HEX.amber,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const PULSES = isMobile ? 10 : 22;
    const pulses = new THREE.InstancedMesh(pulseGeo, pulseMat, PULSES);
    pulses.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    world.add(pulses);

    /* ---------------- estado ---------------- */
    const timeline = buildTimeline();
    const layoutOf = (key: string): Layout =>
      (timeline.find((t) => t.act === key) ?? timeline[0]).layout;

    const cur = new Float32Array(NODE_COUNT * 3);
    const curGlow = new Float32Array(NODE_COUNT);
    cur.set(layoutOf("hero").pos);
    curGlow.set(layoutOf("hero").glow);

    const placed: { x: number; y: number }[] = [];
    const dummy = new THREE.Object3D();
    const cOrange = new THREE.Color(BRAND_HEX.orange);
    const cAmber = new THREE.Color(BRAND_HEX.amber);
    const cCream = new THREE.Color(BRAND_HEX.cream);
    const tmpColor = new THREE.Color();
    const proj = new THREE.Vector3();

    let progress = 0;
    let activeStage = 0;
    let time = 0;

    let worldOffsetX = 0;
    let dimFactor = 1;
    function resize() {
      const w = host!.clientWidth;
      const h = host!.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // desloca a cena para o lado livre da tela
      worldOffsetX = w >= 1024 ? 7.5 : w >= 768 ? 3.5 : 0;
      world.position.x = worldOffsetX;
      dimFactor = w < 768 ? 0.55 : 1;
    }
    resize();

    /**
     * Progresso da experiência: 0 quando o bloco #experience encosta no topo,
     * 1 quando sua última tela sai. Fora dessa faixa o palco some, para o
     * conteúdo comum (FAQ, rodapé) ficar limpo.
     */
    const target = document.getElementById(targetId);
    function readProgress() {
      if (!target) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress = max > 0 ? clamp01(window.scrollY / max) : 0;
        return;
      }
      const rect = target.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      progress = span > 0 ? clamp01(-rect.top / span) : 0;
      // visibilidade do palco
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      const fade =
        rect.bottom < window.innerHeight * 0.9
          ? clamp01(rect.bottom / (window.innerHeight * 0.9))
          : 1;
      host!.style.opacity = visible ? String(fade * dimFactor) : "0";
      host!.style.visibility = visible ? "visible" : "hidden";
    }

    function stageAt(g: number) {
      for (let i = STAGES.length - 1; i >= 0; i--) {
        if (g >= STAGES[i].from) return i;
      }
      return 0;
    }

    function frame(dt: number) {
      time += dt;
      readProgress();

      const si = stageAt(progress);
      activeStage = si;
      const st = STAGES[si];
      const local = clamp01((progress - st.from) / (st.to - st.from));
      // 35% iniciais reconfiguram; o resto segura a cena para leitura
      const morph = smooth(clamp01(local / 0.35));

      const prev = layoutOf(si === 0 ? "hero" : STAGES[si - 1].key);
      const next = layoutOf(st.key);

      // ---- posições e brilho ----
      for (let i = 0; i < NODE_COUNT; i++) {
        const a = i * 3;
        const drift = Math.sin(time * 0.6 + i * 1.7) * 0.09;
        cur[a] = lerp(prev.pos[a], next.pos[a], morph);
        cur[a + 1] = lerp(prev.pos[a + 1], next.pos[a + 1], morph) + drift;
        cur[a + 2] = lerp(prev.pos[a + 2], next.pos[a + 2], morph);
        curGlow[i] = lerp(prev.glow[i], next.glow[i], morph);
      }

      // ---- nós ----
      for (let i = 0; i < NODE_COUNT; i++) {
        const g = curGlow[i];
        const a = i * 3;
        dummy.position.set(cur[a], cur[a + 1], cur[a + 2]);
        const s = 0.55 + g * 1.15;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        nodes.setMatrixAt(i, dummy.matrix);

        tmpColor.copy(g > 0.7 ? cAmber : g > 0.3 ? cOrange : cCream);
        tmpColor.multiplyScalar(0.25 + g * 0.75);
        nodeColors[a] = tmpColor.r;
        nodeColors[a + 1] = tmpColor.g;
        nodeColors[a + 2] = tmpColor.b;

        const halo = halos[i];
        halo.position.set(cur[a], cur[a + 1], cur[a + 2]);
        halo.scale.setScalar(1.4 + g * 3.4);
        (halo.material as THREE.SpriteMaterial).opacity = g * 0.5;
      }
      nodes.instanceMatrix.needsUpdate = true;
      nodes.instanceColor!.needsUpdate = true;

      // ---- ligações: as do layout anterior somem, as do novo aparecem ----
      let v = 0;
      const push = (pair: [number, number], alpha: number) => {
        if (v >= MAX_LINKS || alpha <= 0.01) return;
        const [x, y] = pair;
        const o = v * 6;
        linkPos[o] = cur[x * 3];
        linkPos[o + 1] = cur[x * 3 + 1];
        linkPos[o + 2] = cur[x * 3 + 2];
        linkPos[o + 3] = cur[y * 3];
        linkPos[o + 4] = cur[y * 3 + 1];
        linkPos[o + 5] = cur[y * 3 + 2];
        const c = cOrange;
        for (let k = 0; k < 2; k++) {
          linkCol[o + k * 3] = c.r * alpha;
          linkCol[o + k * 3 + 1] = c.g * alpha;
          linkCol[o + k * 3 + 2] = c.b * alpha;
        }
        v++;
      };
      prev.links.forEach((p) => push(p, (1 - morph) * 0.85));
      next.links.forEach((p) => push(p, morph * 0.95));
      for (let k = v; k < MAX_LINKS; k++) {
        const o = k * 6;
        for (let j = 0; j < 6; j++) linkPos[o + j] = 0;
        for (let j = 0; j < 6; j++) linkCol[o + j] = 0;
      }
      linkGeo.attributes.position.needsUpdate = true;
      linkGeo.attributes.color.needsUpdate = true;
      linkGeo.setDrawRange(0, MAX_LINKS * 2);

      // ---- pulsos correndo pelas ligações ativas ----
      const active = next.links;
      for (let p = 0; p < PULSES; p++) {
        if (active.length === 0 || morph < 0.5) {
          dummy.position.set(0, -999, 0);
          dummy.scale.setScalar(0.001);
        } else {
          const li = p % active.length;
          const [x, y] = active[li];
          const t = ((time * 0.28 + p * 0.37) % 1);
          dummy.position.set(
            lerp(cur[x * 3], cur[y * 3], t),
            lerp(cur[x * 3 + 1], cur[y * 3 + 1], t),
            lerp(cur[x * 3 + 2], cur[y * 3 + 2], t),
          );
          dummy.scale.setScalar(0.7 + Math.sin(t * Math.PI) * 0.6);
        }
        dummy.updateMatrix();
        pulses.setMatrixAt(p, dummy.matrix);
      }
      pulses.instanceMatrix.needsUpdate = true;
      pulseMat.opacity = morph * 0.9;

      // Anel do ecossistema: gira lentamente durante o ato inteiro, para que
      // os 12 squads se revezem na frente da câmera em vez de ficarem
      // amontoados perto do centro na projeção em tela.
      world.rotation.y = st.key === "ecosystem" ? local * Math.PI * 0.85 : 0;

      // ---- câmera ----
      const camPrev = CAMS[si === 0 ? "hero" : STAGES[si - 1].key];
      const camNext = CAMS[st.key];
      const ct = smooth(local);
      camera.position.set(
        lerp(camPrev.pos[0], camNext.pos[0], ct),
        lerp(camPrev.pos[1], camNext.pos[1], ct),
        lerp(camPrev.pos[2], camNext.pos[2], ct) + Math.sin(time * 0.25) * 0.35,
      );
      camera.lookAt(
        lerp(camPrev.look[0], camNext.look[0], ct),
        lerp(camPrev.look[1], camNext.look[1], ct),
        lerp(camPrev.look[2], camNext.look[2], ct),
      );

      renderer.render(scene, camera);
      updateLabels(st.key, next, morph);
    }

    /** Projeta os nós rotulados e escreve os rótulos HTML sobre o canvas. */
    function updateLabels(stageKey: string, layout: Layout, morph: number) {
      const set = labelSets.find((s) => s.stage === stageKey);
      const w = host!.clientWidth;
      const h = host!.clientHeight;
      const narrow = w < 768;
      // Distância mínima entre dois rótulos na tela — maior que a própria caixa
      // do rótulo (~170-250px de largura), para nunca sobrepor texto.
      const minGap = narrow ? 70 : 175;
      placed.length = 0;
      for (let k = 0; k < MAX_LABELS; k++) {
        const el = labelRefs.current[k];
        if (el) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
        }
      }

      // Ordena por profundidade (mais perto da câmera primeiro) para que,
      // ao colidir, o rótulo mais próximo vença e o mais distante suma.
      const order = layout.labeled
        .map((nodeIndex, k) => ({ k, nodeIndex }))
        .filter((o) => o.nodeIndex !== undefined)
        .map((o) => {
          const a = o.nodeIndex * 3;
          return { ...o, z: cur[a + 2] };
        })
        .sort((p, q) => q.z - p.z);

      for (const { k, nodeIndex } of order) {
        const el = labelRefs.current[k];
        const item = set?.items[k];
        if (!el) continue;
        if (narrow || !item || morph < 0.55) continue;
        const a = nodeIndex * 3;
        // localToWorld aplica a posição E a rotação do grupo (o giro do anel
        // do ecossistema), então o rótulo HTML sempre acompanha o nó certo.
        proj.set(cur[a], cur[a + 1], cur[a + 2]);
        world.localToWorld(proj);
        proj.project(camera);
        if (proj.z > 1) continue;
        const x = (proj.x * 0.5 + 0.5) * w;
        const y = (-proj.y * 0.5 + 0.5) * h;

        const collides = placed.some((p) => Math.hypot(p.x - x, p.y - y) < minGap);
        if (collides) continue;
        placed.push({ x, y });

        const depth = clamp01(1 - (proj.z - 0.9) * 6);
        el.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) translate(-50%, -50%)`;
        el.style.opacity = String(((morph - 0.55) / 0.45) * (0.45 + depth * 0.55));
        el.style.pointerEvents = "auto";
        const title = el.querySelector("[data-t]");
        const note = el.querySelector("[data-n]");
        if (title && title.textContent !== item.title) title.textContent = item.title;
        if (note) {
          const nt = item.note ?? "";
          if (note.textContent !== nt) note.textContent = nt;
        }
      }
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frame(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    window.addEventListener("orientationchange", resize);
    host.dataset.mode = "webgl";
    host.dataset.ready = "1";

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
      nodeGeo.dispose();
      nodeMat.dispose();
      linkGeo.dispose();
      linkMat.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
      haloTex.dispose();
      halos.forEach((s) => (s.material as THREE.SpriteMaterial).dispose());
      renderer.dispose();
    };
  }, [labelSets, targetId]);

  return (
    <div ref={hostRef} className="stage" aria-hidden="true" data-mode="loading">
      <canvas ref={canvasRef} className="stage__canvas" />
      <div className="stage__labels">
        {Array.from({ length: MAX_LABELS }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className="stage__label"
          >
            <span data-t className="stage__label-title" />
            <span data-n className="stage__label-note" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Halo radial gerado em runtime — evita mais um arquivo de imagem. */
function makeHaloTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.25, "rgba(255,170,80,0.45)");
  g.addColorStop(1, "rgba(255,106,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
