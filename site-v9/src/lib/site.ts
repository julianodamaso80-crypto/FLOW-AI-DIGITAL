/**
 * Constantes centrais do site FlowAI Digital.
 * ÚNICO lugar onde o número de WhatsApp é definido.
 */

export const SITE_URL = "https://flowaidigital.com.br";
export const SITE_NAME = "FlowAI Digital";

/** Número comercial oficial (Manual de Identidade Visual v1.0). Nunca usar o antigo 5521980214882. */
export const WHATSAPP_NUMBER = "5521992208062";
export const WHATSAPP_DISPLAY = "(21) 99220-8062";

export const INSTAGRAM_URL = "https://www.instagram.com/flowaidigital";

export const WA_MESSAGES = {
  default:
    "Olá! Conheci a FlowAI pelo site e quero entender qual solução é mais adequada para minha empresa.",
  diagnostico:
    "Olá! Quero agendar a call de alinhamento de 30 minutos para diagnosticar minha operação comercial.",
  ecossistema:
    "Olá! Quero entender como o ecossistema de agentes da FlowAI funcionaria na minha empresa.",
  tracking:
    "Olá! Quero conversar sobre tracking e atribuição — hoje meus números não batem entre as plataformas.",
  sistemas:
    "Olá! Quero conversar sobre o desenvolvimento de um sistema personalizado para minha empresa.",
} as const;

export type WaContext = keyof typeof WA_MESSAGES;

export function buildWaLink(context: WaContext = "default"): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WA_MESSAGES[context])}`;
}
