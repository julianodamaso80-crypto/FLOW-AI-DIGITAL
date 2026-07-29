import Image from "next/image";
import Stage, { type LabelSet } from "@/components/Stage";
import SmoothScroll from "@/components/SmoothScroll";
import FinaleMedia from "@/components/FinaleMedia";
import { buildWaLink } from "@/lib/site";
import {
  AGENTS,
  CLIENTS,
  ECOSYSTEM,
  FAQ,
  FINALE,
  FIT,
  HERO,
  METHOD,
  PATH,
  PROBLEMS,
  SOLUTION,
  SQUADS,
  THIRTY,
  TRACKING,
} from "@/content/lp";

/** Altura de rolagem de cada ato, em vh. A soma casa com as janelas do palco. */
const ACT_H = {
  hero: 108,
  ecosystem: 180,
  problem: 108,
  trackingOld: 72,
  trackingNew: 90,
  path: 90,
  agents: 108,
  method: 81,
  finale: 163,
} as const;

/** Rótulos curtos ancorados aos nós 3D. O texto longo fica nos blocos HTML. */
const PROBLEM_TAGS = [
  "Lead sem resposta",
  "Decisão no achismo",
  "Sem follow-up",
  "CRM bagunçado",
  "Sem medição",
  "Sem remarketing",
];

const LABELS: LabelSet[] = [
  {
    stage: "ecosystem",
    items: SQUADS.map((s) => ({ title: s.short, note: s.title })),
  },
  {
    stage: "problem",
    items: PROBLEM_TAGS.map((t, i) => ({ title: t, note: PROBLEMS.items[i] })),
  },
  {
    stage: "trackingOld",
    items: TRACKING.old.items.map((i) => ({ title: i.name, note: i.note })),
  },
  {
    stage: "trackingNew",
    items: TRACKING.next.items.map((i) => ({ title: i.name, note: i.note })),
  },
  {
    stage: "path",
    items: PATH.steps.map((s) => ({ title: s.name, note: s.note })),
  },
  {
    stage: "agents",
    items: AGENTS.chain.map((c) => ({ title: c.from, note: c.msg })),
  },
  {
    stage: "method",
    items: [
      ...THIRTY.flow.map((f) => ({ title: f.title, note: f.desc })),
      { title: THIRTY.branchNo.title, note: THIRTY.branchNo.label },
      { title: THIRTY.branchYes.title, note: THIRTY.branchYes.label },
      ...THIRTY.after.map((f) => ({ title: f.title, note: f.desc })),
    ],
  },
];

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <Stage labelSets={LABELS} targetId="experience" />

      <header className="header">
        <a className="header__logo" href="#topo" aria-label="FlowAI Digital — início">
          <Image
            src="/assets/logo/flowai-logo-144.png"
            alt="FlowAI Digital"
            width={144}
            height={34}
            priority
          />
        </a>
        <nav className="header__nav" aria-label="Navegação principal">
          <a href="#ecossistema">Ecossistema</a>
          <a href="#tracking">Tracking</a>
          <a href="#metodo">Como funciona</a>
          <a href="#duvidas">Dúvidas</a>
        </nav>
        <a className="btn btn--primary" href="/diagnostico/">
          Fazer diagnóstico
        </a>
      </header>

      <main className="content" id="topo">
        <div id="experience">
          {/* ---------------- ATO 1 · HERO ---------------- */}
          <section className="act" style={{ height: `${ACT_H.hero}vh` }} aria-labelledby="h-hero">
            <div className="act__sticky">
              <div className="wrap">
                <div className="act__inner">
                  <p className="eyebrow">{HERO.eyebrow}</p>
                  <h1 id="h-hero">
                    {HERO.title} <span className="accent">{HERO.titleAccent}</span>
                  </h1>
                  <p className="lead">{HERO.subtitle}</p>
                  <div className="btn-row">
                    <a className="btn btn--primary" href="/diagnostico/">
                      {HERO.ctaPrimary}
                    </a>
                    <a className="btn btn--ghost" href="#ecossistema">
                      {HERO.ctaSecondary}
                    </a>
                  </div>
                  <p className="note">{HERO.note}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- ATO 2 · ECOSSISTEMA ---------------- */}
          <section
            className="act"
            id="ecossistema"
            style={{ height: `${ACT_H.ecosystem}vh` }}
            aria-labelledby="h-eco"
          >
            <div className="act__sticky">
              <div className="wrap">
                <div className="act__inner" data-reveal>
                  <p className="eyebrow">{ECOSYSTEM.eyebrow}</p>
                  <h2 id="h-eco">{ECOSYSTEM.title}</h2>
                  <p>{ECOSYSTEM.desc}</p>
                  <ul className="checklist">
                    {SQUADS.slice(0, 6).map((s) => (
                      <li key={s.id}>
                        <strong>{s.title}</strong> — {s.desc}
                      </li>
                    ))}
                  </ul>
                  <div className="btn-row">
                    <a className="btn btn--primary" href="/diagnostico/">
                      {ECOSYSTEM.cta}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- ATO 3 · PROBLEMA ---------------- */}
          <section
            className="act act--right"
            style={{ height: `${ACT_H.problem}vh` }}
            aria-labelledby="h-prob"
          >
            <div className="act__sticky">
              <div className="wrap">
                <div className="act__inner" data-reveal>
                  <p className="eyebrow">{PROBLEMS.eyebrow}</p>
                  <h2 id="h-prob">{PROBLEMS.title}</h2>
                  <p>{PROBLEMS.intro}</p>
                  <ul className="checklist">
                    {PROBLEMS.items.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  <div className="btn-row">
                    <a className="btn btn--primary" href="/diagnostico/">
                      {PROBLEMS.cta}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- ATO 4a · TRACKING ANTIGO ---------------- */}
          <section
            className="act"
            id="tracking"
            style={{ height: `${ACT_H.trackingOld}vh` }}
            aria-labelledby="h-track"
          >
            <div className="act__sticky">
              <div className="wrap">
                <div className="act__inner" data-reveal>
                  <p className="eyebrow">{TRACKING.eyebrow}</p>
                  <h2 id="h-track">
                    {TRACKING.title} <span className="accent">{TRACKING.titleAccent}</span>
                  </h2>
                  <p>{TRACKING.intro}</p>
                  <p className="lead">{TRACKING.old.title}</p>
                  <p>{TRACKING.old.result}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- ATO 4b · TRACKING NOVO ---------------- */}
          <section
            className="act act--right"
            style={{ height: `${ACT_H.trackingNew}vh` }}
            aria-labelledby="h-track2"
          >
            <div className="act__sticky">
              <div className="wrap">
                <div className="act__inner" data-reveal>
                  <p className="eyebrow">{TRACKING.next.label}</p>
                  <h2 id="h-track2">{TRACKING.next.title}</h2>
                  <p>{TRACKING.next.desc}</p>
                  <p className="lead">{TRACKING.next.result}</p>
                  <p className="note">{TRACKING.honesty}</p>
                  <div className="btn-row">
                    <a className="btn btn--primary" href="/diagnostico/">
                      {TRACKING.cta}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- ATO 5 · CAMINHO ---------------- */}
          <section
            className="act act--center"
            style={{ height: `${ACT_H.path}vh` }}
            aria-labelledby="h-path"
          >
            <div className="act__sticky">
              <div className="wrap">
                <div className="act__inner" data-reveal>
                  <p className="eyebrow">{PATH.eyebrow}</p>
                  <h2 id="h-path">{PATH.title}</h2>
                  <p style={{ marginInline: "auto" }}>{TRACKING.question}</p>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- ATO 6 · AGENTES ---------------- */}
          <section
            className="act"
            style={{ height: `${ACT_H.agents}vh` }}
            aria-labelledby="h-agents"
          >
            <div className="act__sticky">
              <div className="wrap">
                <div className="act__inner" data-reveal>
                  <p className="eyebrow">{AGENTS.eyebrow}</p>
                  <h2 id="h-agents">{AGENTS.title}</h2>
                  <p>{AGENTS.intro}</p>
                  <p className="note">{AGENTS.note}</p>
                  <div className="btn-row">
                    <a className="btn btn--primary" href="/diagnostico/">
                      {AGENTS.cta}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- ATO 7 · OS 30 MINUTOS ---------------- */}
          <section
            className="act act--right"
            id="metodo"
            style={{ height: `${ACT_H.method}vh` }}
            aria-labelledby="h-30"
          >
            <div className="act__sticky">
              <div className="wrap">
                <div className="act__inner" data-reveal>
                  <p className="eyebrow">{THIRTY.eyebrow}</p>
                  <h2 id="h-30">{THIRTY.title}</h2>
                  <p>
                    Você sai com um plano de ação mesmo que não faça sentido seguir com a gente.
                  </p>
                  <div className="btn-row">
                    <a className="btn btn--primary" href="/diagnostico/">
                      {THIRTY.cta}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- ATO 8 · FINAL ---------------- */}
          <section
            className="act act--center"
            style={{ height: `${ACT_H.finale}vh` }}
            aria-labelledby="h-fin"
          >
            <div className="act__sticky">
              {/*
                Retrato + vídeo do fundador, gerados por identity reference no
                Higgsfield a partir de fotos reais. Só existem depois de rodar
                baixar-assets.ps1 — até lá, o componente cai de volta no
                estado transparente e o layout não quebra.
              */}
              <FinaleMedia />
              <div className="wrap">
                <div className="act__inner" data-reveal>
                  <h2 id="h-fin">{FINALE.title}</h2>
                  <p style={{ marginInline: "auto" }}>{FINALE.desc}</p>
                  <div className="btn-row" style={{ justifyContent: "center" }}>
                    <a className="btn btn--primary" href="/diagnostico/">
                      {FINALE.cta}
                    </a>
                  </div>
                  <p className="note">{FINALE.note}</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ============ conteúdo comum, fora da experiência 3D ============ */}
        <section className="section" aria-labelledby="h-sol">
          <div className="wrap">
            <p className="eyebrow">{SOLUTION.eyebrow}</p>
            <h2 id="h-sol" data-reveal>
              {SOLUTION.title}
            </h2>
            <div className="cards">
              {SOLUTION.pillars.map((p) => (
                <article className="card" key={p.title} data-reveal>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="h-met">
          <div className="wrap">
            <p className="eyebrow">{METHOD.eyebrow}</p>
            <h2 id="h-met" data-reveal>
              {METHOD.title}
            </h2>
            <div className="cards">
              {METHOD.steps.map((s) => (
                <article className="card" key={s.n} data-reveal>
                  <p className="eyebrow" style={{ margin: 0 }}>
                    {s.n}
                  </p>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </article>
              ))}
            </div>
            <div className="btn-row">
              <a className="btn btn--primary" href="/diagnostico/">
                {METHOD.cta}
              </a>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="h-fit">
          <div className="wrap">
            <p className="eyebrow">{FIT.eyebrow}</p>
            <h2 id="h-fit" data-reveal>
              {FIT.title}
            </h2>
            <ul className="checklist">
              {FIT.items.map((i) => (
                <li key={i} data-reveal>
                  {i}
                </li>
              ))}
            </ul>
            <div className="btn-row">
              <a className="btn btn--primary" href="/diagnostico/">
                {FIT.cta}
              </a>
            </div>
          </div>
        </section>

        <section className="section" aria-labelledby="h-cli">
          <div className="wrap">
            <p className="eyebrow">{CLIENTS.eyebrow}</p>
            <h2 id="h-cli" data-reveal>
              {CLIENTS.title}
            </h2>
            <ul className="clients">
              {CLIENTS.items.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section" id="duvidas" aria-labelledby="h-faq">
          <div className="wrap">
            <p className="eyebrow">{FAQ.eyebrow}</p>
            <h2 id="h-faq" data-reveal>
              {FAQ.title}
            </h2>
            {FAQ.items.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <Image
            src="/assets/logo/flowai-logo-144.png"
            alt="FlowAI Digital"
            width={144}
            height={34}
          />
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

      <a
        className="btn btn--primary wa-float"
        href="/diagnostico/"
        aria-label="Fazer diagnóstico gratuito"
      >
        Fazer diagnóstico
      </a>
    </>
  );
}
