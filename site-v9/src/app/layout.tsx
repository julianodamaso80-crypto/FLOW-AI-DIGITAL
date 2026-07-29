import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FlowAI Digital — Marketing, IA e sistemas sob medida",
    template: "%s · FlowAI Digital",
  },
  description:
    "Um squad de agentes de IA para cada etapa do seu comercial, marketing integrado e sistemas personalizados. Tudo conectado para sua empresa crescer.",
  applicationName: SITE_NAME,
  keywords: [
    "agência de inteligência artificial",
    "agentes de IA para empresas",
    "automação de processos com IA",
    "sistemas personalizados",
    "CRM personalizado",
    "tracking e analytics",
    "marketing digital completo",
  ],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "FlowAI Digital — Marketing, IA e sistemas sob medida",
    description:
      "Tudo conectado para sua empresa crescer: marketing, agentes de IA, automação e sistemas sob medida.",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-512.png", sizes: "512x512" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#070A0F",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
