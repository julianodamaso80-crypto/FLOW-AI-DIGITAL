/**
 * Layouts do campo de nós.
 *
 * A experiência inteira é UM sistema de nós e ligações que se reconfigura.
 * Cada ato define onde os nós ficam e quais se conectam; a rolagem interpola
 * entre dois layouts vizinhos. Como a posição é função pura do progresso,
 * rolar para cima desfaz exatamente o que rolar para baixo construiu.
 */

export const NODE_COUNT = 72;

export interface Layout {
  /** Posição de cada nó: 3 floats por nó. */
  pos: Float32Array;
  /** Pares de índices ligados por linha. */
  links: [number, number][];
  /** Nós que recebem rótulo HTML, na ordem em que devem aparecer. */
  labeled: number[];
  /** Intensidade de brilho por nó (0 a 1). */
  glow: Float32Array;
}

/** Gera um layout vazio com os nós em repouso numa nuvem ambiente estável. */
function base(seed = 1): Layout {
  const pos = new Float32Array(NODE_COUNT * 3);
  const glow = new Float32Array(NODE_COUNT);
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < NODE_COUNT; i++) {
    const r = 26 + rnd() * 18;
    const th = rnd() * Math.PI * 2;
    const ph = Math.acos(2 * rnd() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = (rnd() - 0.5) * 22;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 10;
    glow[i] = 0.06;
  }
  return { pos, links: [], labeled: [], glow };
}

function set(l: Layout, i: number, x: number, y: number, z: number, g = 1) {
  l.pos[i * 3] = x;
  l.pos[i * 3 + 1] = y;
  l.pos[i * 3 + 2] = z;
  l.glow[i] = g;
}

/* ------------------------------------------------------------------ */
/* ATO 1 — HERO: as linhas de fluxo do símbolo se desenhando            */
/* ------------------------------------------------------------------ */
export function heroLayout(): Layout {
  const l = base(7);
  // Três trajetórias ascendentes que sobem e viram à direita — leitura do "F"
  // do símbolo, sem nunca desenhar a logomarca (essa é sempre o PNG original).
  const lanes = [
    { y: 3.2, x0: -9, x1: 6.5, z: 0 },
    { y: 0.6, x0: -11, x1: 4.0, z: 0 },
    { y: -2.0, x0: -13, x1: 1.5, z: 0 },
  ];
  let n = 0;
  lanes.forEach((lane, li) => {
    const count = 8;
    for (let k = 0; k < count; k++) {
      const t = k / (count - 1);
      // trajeto horizontal que curva para cima no fim
      const x = lane.x0 + (lane.x1 - lane.x0) * t;
      const bend = Math.max(0, t - 0.62) / 0.38;
      const y = lane.y + bend * bend * (3.4 - li * 0.6);
      set(l, n, x, y, lane.z + (li - 1) * 1.2, k === count - 1 ? 1 : 0.55);
      if (k > 0) l.links.push([n - 1, n]);
      n++;
    }
  });
  return l;
}

/* ------------------------------------------------------------------ */
/* ATO 2 — ECOSSISTEMA: os 12 squads em anel                            */
/* ------------------------------------------------------------------ */
export function ringLayout(count = 12, radius = 11): Layout {
  const l = base(11);
  const core = 0;
  set(l, core, 0, 0, 0, 1);
  const labeled: number[] = [];
  for (let k = 0; k < count; k++) {
    const i = k + 1;
    const a = (k / count) * Math.PI * 2 - Math.PI / 2;
    set(l, i, Math.cos(a) * radius, Math.sin(a) * radius * 0.42, Math.sin(a) * radius * 0.9, 0.9);
    l.links.push([core, i]);
    l.links.push([i, ((k + 1) % count) + 1]);
    labeled.push(i);
  }
  l.labeled = labeled;
  return l;
}

/* ------------------------------------------------------------------ */
/* ATO 3 — PROBLEMA: seis fragmentos soltos, sem ligação                */
/* ------------------------------------------------------------------ */
export function scatterLayout(count = 6): Layout {
  const l = base(23);
  const labeled: number[] = [];
  const spots: [number, number, number][] = [
    [-10, 4.5, 2],
    [-3.5, 6.2, -5],
    [7.5, 3.4, 1],
    [-8, -3.6, -3],
    [1.5, -5.2, 3],
    [9.5, -2.2, -4],
  ];
  for (let k = 0; k < count; k++) {
    const i = k + 1;
    set(l, i, spots[k][0], spots[k][1], spots[k][2], 0.35);
    labeled.push(i);
  }
  l.labeled = labeled;
  return l; // sem links: é exatamente esse o problema
}

/* ------------------------------------------------------------------ */
/* ATO 4a — TRACKING ANTIGO: cinco ferramentas desconectadas            */
/* ------------------------------------------------------------------ */
export function brokenLayout(count = 5): Layout {
  const l = base(31);
  const labeled: number[] = [];
  const spots: [number, number, number][] = [
    [-11, 5.0, 1],
    [-4, -4.6, -4],
    [3.5, 5.6, 3],
    [10.5, -1.0, -2],
    [-1, 1.2, 6],
  ];
  for (let k = 0; k < count; k++) {
    const i = k + 1;
    set(l, i, spots[k][0], spots[k][1], spots[k][2], 0.4);
    labeled.push(i);
  }
  l.labeled = labeled;
  return l;
}

/* ------------------------------------------------------------------ */
/* ATO 4b — TRACKING NOVO: o ciclo fechado de sete etapas               */
/* ------------------------------------------------------------------ */
export function cycleLayout(count = 7, radius = 9.5): Layout {
  const l = base(31);
  const labeled: number[] = [];
  for (let k = 0; k < count; k++) {
    const i = k + 1;
    const a = (k / count) * Math.PI * 2 - Math.PI / 2;
    set(l, i, Math.cos(a) * radius, Math.sin(a) * radius * 0.55, Math.sin(a) * radius * 0.5, 1);
    l.links.push([i, ((k + 1) % count) + 1]);
    labeled.push(i);
  }
  l.labeled = labeled;
  return l;
}

/* ------------------------------------------------------------------ */
/* ATO 5 — CAMINHO: clique → LP → formulário → atendimento → venda      */
/* ------------------------------------------------------------------ */
export function pathLayout(count = 5): Layout {
  const l = base(41);
  const labeled: number[] = [];
  for (let k = 0; k < count; k++) {
    const i = k + 1;
    const t = k / (count - 1);
    set(l, i, -14 + t * 28, -2 + t * 4.5, 6 - t * 16, 1);
    if (k > 0) l.links.push([i - 1, i]);
    labeled.push(i);
  }
  l.labeled = labeled;
  return l;
}

/* ------------------------------------------------------------------ */
/* ATO 6 — AGENTES: a corrente de mensagens em profundidade             */
/* ------------------------------------------------------------------ */
export function chainLayout(count = 6): Layout {
  const l = base(53);
  const labeled: number[] = [];
  for (let k = 0; k < count; k++) {
    const i = k + 1;
    const side = k % 2 === 0 ? -1 : 1;
    set(l, i, side * 7.5, 7.5 - k * 3.0, -k * 3.4, 1);
    if (k > 0) l.links.push([i - 1, i]);
    labeled.push(i);
  }
  // fecha o ciclo: o dashboard devolve ao tráfego
  l.links.push([count, 1]);
  l.labeled = labeled;
  return l;
}

/* ------------------------------------------------------------------ */
/* ATO 7 — MÉTODO: os 30 minutos, com a bifurcação                      */
/* ------------------------------------------------------------------ */
export function methodLayout(): Layout {
  const l = base(61);
  const labeled: number[] = [];
  // tronco de 4 etapas
  for (let k = 0; k < 4; k++) {
    const i = k + 1;
    set(l, i, 0, 9 - k * 3.2, -k * 1.6, 1);
    if (k > 0) l.links.push([i - 1, i]);
    labeled.push(i);
  }
  // bifurcação
  set(l, 5, -7.5, -5.4, -7.5, 0.75); // não faz sentido
  set(l, 6, 7.5, -5.4, -7.5, 1); // faz sentido
  l.links.push([4, 5]);
  l.links.push([4, 6]);
  labeled.push(5, 6);
  // continuação
  for (let k = 0; k < 3; k++) {
    const i = 7 + k;
    set(l, i, 7.5, -9.0 - k * 3.0, -9.5 - k * 1.8, 1);
    l.links.push([i === 7 ? 6 : i - 1, i]);
    labeled.push(i);
  }
  l.labeled = labeled;
  return l;
}

/* ------------------------------------------------------------------ */
/* ATO 8 — FINAL: tudo converge para uma malha única                    */
/* ------------------------------------------------------------------ */
export function finaleLayout(): Layout {
  const l = base(71);
  // Anel externo + núcleo, lido de frente: a operação inteira conectada.
  const core = 0;
  set(l, core, 0, 0, 0, 1);
  const outer = 16;
  for (let k = 0; k < outer; k++) {
    const i = k + 1;
    const a = (k / outer) * Math.PI * 2;
    const r = 12.5;
    set(l, i, Math.cos(a) * r, Math.sin(a) * r * 0.62, Math.sin(a * 2) * 2.5, 0.85);
    l.links.push([i, (k + 1) % outer === 0 ? 1 : i + 1]);
    if (k % 2 === 0) l.links.push([core, i]);
  }
  const inner = 8;
  for (let k = 0; k < inner; k++) {
    const i = outer + 1 + k;
    const a = (k / inner) * Math.PI * 2 + 0.4;
    const r = 6.0;
    set(l, i, Math.cos(a) * r, Math.sin(a) * r * 0.62, 1.5, 1);
    l.links.push([i, k === inner - 1 ? outer + 1 : i + 1]);
    l.links.push([core, i]);
  }
  return l;
}

/** Sequência de layouts na ordem dos atos. */
export function buildTimeline() {
  return [
    { act: "hero", layout: heroLayout() },
    { act: "ecosystem", layout: ringLayout(12, 11) },
    { act: "problem", layout: scatterLayout(6) },
    { act: "trackingOld", layout: brokenLayout(5) },
    { act: "trackingNew", layout: cycleLayout(7, 9.5) },
    { act: "path", layout: pathLayout(5) },
    { act: "agents", layout: chainLayout(6) },
    { act: "method", layout: methodLayout() },
    { act: "finale", layout: finaleLayout() },
  ] as const;
}
