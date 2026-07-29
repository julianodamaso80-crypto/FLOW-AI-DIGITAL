import type { Metadata } from "next";
import Image from "next/image";
import Quiz from "@/components/quiz/Quiz";
import { buildWaLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Diagnóstico gratuito",
  description:
    "Responda algumas perguntas sobre sua operação e receba um diagnóstico inicial personalizado da FlowAI Digital — marketing, IA e sistemas sob medida.",
};

export default function DiagnosticoPage() {
  return (
    <>
      <header className="header">
        <a className="header__logo" href="/" aria-label="FlowAI Digital — início">
          <Image src="/assets/logo/flowai-logo-144.png" alt="FlowAI Digital" width={144} height={34} priority />
        </a>
        <nav className="header__nav" aria-label="Navegação principal">
          <a href="/#ecossistema">Ecossistema</a>
          <a href="/#tracking">Tracking</a>
          <a href="/#metodo">Como funciona</a>
          <a href="/#duvidas">Dúvidas</a>
        </nav>
      </header>

      <main className="quiz-page">
        <Quiz />
      </main>

      <footer className="footer">
        <div className="wrap">
          <Image src="/assets/logo/flowai-logo-144.png" alt="FlowAI Digital" width={144} height={34} />
          <p style={{ marginTop: "1rem" }}>
            Marketing, IA e sistemas sob medida. Tudo conectado para sua empresa crescer.
          </p>
          <p>
            WhatsApp:{" "}
            <a href={buildWaLink("default")} target="_blank" rel="noopener">
              (21) 99220-8062
            </a>
          </p>
          <p>© 2026 FlowAI Digital. Rio de Janeiro, Brasil.</p>
        </div>
      </footer>
    </>
  );
}
