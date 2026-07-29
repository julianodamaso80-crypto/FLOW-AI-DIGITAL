/**
 * Tokens da marca FlowAI Digital — extraídos do Manual de Identidade Visual v1.0 (julho/2026).
 * Fonte única de verdade. Nunca escrever cor solta no componente.
 */

export const BRAND = {
  orange: "#FF6A00", // Laranja Flow — CTA, destaque e energia
  amber: "#FFB347", // Âmbar — acentos e dados
  cream: "#FFF2E2", // Creme — fundo claro, leveza e equilíbrio
  graphite: "#2B313A", // Grafite — texto e superfícies
  deep: "#0F141B", // Azul profundo — fundo premium
  black: "#070A0F", // Preto digital — contraste máximo
} as const;

/** Versões numéricas para Three.js (0xRRGGBB). */
export const BRAND_HEX = {
  orange: 0xff6a00,
  amber: 0xffb347,
  cream: 0xfff2e2,
  graphite: 0x2b313a,
  deep: 0x0f141b,
  black: 0x070a0f,
} as const;

/**
 * Janelas de cada ato na linha do tempo global da rolagem (0 a 1).
 * Alterar aqui reposiciona a cena 3D e o texto ao mesmo tempo.
 */
export const ACTS = {
  hero: [0.0, 0.12],
  ecosystem: [0.12, 0.32],
  problem: [0.32, 0.44],
  tracking: [0.44, 0.62],
  path: [0.62, 0.72],
  agents: [0.72, 0.84],
  method: [0.84, 0.93],
  finale: [0.93, 1.0],
} as const;

export type ActName = keyof typeof ACTS;

/** Progresso local (0..1) dentro de um ato, dado o progresso global. */
export function actProgress(global: number, act: ActName): number {
  const [start, end] = ACTS[act];
  if (end === start) return 0;
  return clamp01((global - start) / (end - start));
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Suaviza as pontas sem alterar o meio — mantém a reversibilidade exata. */
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** 0 → 1 → 0, para elementos que entram e saem dentro do mesmo ato. */
export const pulse = (t: number, inAt = 0.15, outAt = 0.85) => {
  if (t < inAt) return smooth(clamp01(t / inAt));
  if (t > outAt) return smooth(clamp01((1 - t) / (1 - outAt)));
  return 1;
};
