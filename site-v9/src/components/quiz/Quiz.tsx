"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WHATSAPP_NUMBER } from "@/lib/site";
import {
  MAIN_CHALLENGES,
  PROFILE_QUESTIONS,
  BRANCH_QUESTIONS,
  FINAL_QUESTIONS,
  CLASSIFICATIONS,
  type Branch,
  type QuizQuestion,
} from "@/content/quizData";

/* ------------------------------------------------------------------ */
/* Tipos e utilidades                                                  */
/* Lógica e conteúdo migrados verbatim do site-v8                      */
/* (site-v8/src/components/quiz/Quiz.tsx) — apenas a camada visual foi */
/* adaptada aos tokens/classes CSS do site-v9.                         */
/* ------------------------------------------------------------------ */

interface Contact {
  nome: string;
  whatsapp: string;
  empresa: string;
  instagram: string;
  site: string;
  email: string;
}

interface LeadState {
  id: string;
  createdAt: string;
  consentAt: string | null;
  origem: { url: string; referrer: string; utms: Record<string, string>; device: string };
  contact: Contact;
  mainChallenge: string | null;
  answers: Record<string, string | string[]>;
  status: string;
  lastStep: number;
}

const STORAGE_KEY = "flowai_diagnostico_v1";

function newLeadId(): string {
  return `FLW-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function captureOrigin() {
  const utms: Record<string, string> = {};
  try {
    const url = new URL(window.location.href);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "gclid", "fbclid"].forEach((k) => {
      const v = url.searchParams.get(k);
      if (v) utms[k] = v;
    });
  } catch {
    /* noop */
  }
  return {
    url: window.location.href.split("?")[0],
    referrer: document.referrer || "direto",
    utms,
    device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
  };
}

/** Máscara (00) 00000-0000 */
function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidBrPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  // celular brasileiro: DDD (11-99) + 9 dígitos começando em 9
  return /^[1-9][0-9]9[0-9]{8}$/.test(digits);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

type Phase = "contact" | "challenge" | "questions" | "result";

export default function Quiz() {
  const [lead, setLead] = useState<LeadState | null>(null);
  const [phase, setPhase] = useState<Phase>("contact");
  const [qIndex, setQIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const liveRef = useRef<HTMLParagraphElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // restaura progresso (refresh / voltar depois)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: LeadState & { phase?: Phase; qIndex?: number } = JSON.parse(saved);
        setLead(parsed);
        if (parsed.status === "quiz_completed") {
          setPhase("result");
        } else if (parsed.mainChallenge) {
          setPhase("questions");
          setQIndex(parsed.lastStep || 0);
        } else if (parsed.consentAt) {
          setPhase("challenge");
        }
        if (parsed.consentAt) setConsent(true);
      }
    } catch {
      /* começa do zero */
    }
  }, []);

  function persist(next: LeadState) {
    setLead(next);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* armazenamento indisponível — o quiz continua em memória */
    }
  }

  function announce(msg: string) {
    if (liveRef.current) liveRef.current.textContent = msg;
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ----------------------- fase 1: contato ----------------------- */

  const [contact, setContact] = useState<Contact>({
    nome: "",
    whatsapp: "",
    empresa: "",
    instagram: "",
    site: "",
    email: "",
  });

  useEffect(() => {
    if (lead) setContact(lead.contact);
  }, [lead]);

  function validateContact(): boolean {
    const e: Record<string, string> = {};
    const nomeParts = contact.nome.trim().split(/\s+/);
    if (nomeParts.length < 2 || nomeParts.some((p) => p.length < 2)) {
      e.nome = "Informe nome e sobrenome.";
    }
    if (!isValidBrPhone(contact.whatsapp)) {
      e.whatsapp = "Informe um WhatsApp brasileiro válido: (00) 00000-0000.";
    }
    if (!contact.empresa.trim()) {
      e.empresa = "Informe o nome da empresa.";
    }
    if (!contact.instagram.trim()) {
      e.instagram = "Informe o Instagram da empresa (com ou sem @).";
    }
    if (contact.email.trim() && !isValidEmail(contact.email.trim())) {
      e.email = "E-mail inválido.";
    }
    if (!consent) {
      e.consent = "É necessário concordar para continuar.";
    }
    if (honeypot) {
      e.consent = "Não foi possível validar o envio."; // bot detectado
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function startQuiz(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validateContact()) return;
    const now = new Date().toISOString();
    const next: LeadState = {
      id: lead?.id ?? newLeadId(),
      createdAt: lead?.createdAt ?? now,
      consentAt: now,
      origem: lead?.origem ?? captureOrigin(),
      contact: {
        ...contact,
        instagram: contact.instagram.trim()
          ? `@${contact.instagram.trim().replace(/^@+/, "")}`
          : contact.instagram,
      },
      mainChallenge: null,
      answers: {},
      status: "quiz_started",
      lastStep: 0,
    };
    persist(next);
    setPhase("challenge");
    announce("Dados confirmados. Agora escolha o principal desafio da sua empresa.");
  }

  /* ----------------------- fase 2: desafio ----------------------- */

  function chooseChallenge(id: string) {
    if (!lead) return;
    persist({ ...lead, mainChallenge: id, status: "quiz_in_progress", lastStep: 0 });
    setQIndex(0);
    setPhase("questions");
    announce("Desafio registrado. Vamos às perguntas sobre a sua operação.");
  }

  const branch: Branch = useMemo(() => {
    const found = MAIN_CHALLENGES.find((c) => c.id === lead?.mainChallenge);
    return (found?.branch ?? "completo") as Branch;
  }, [lead?.mainChallenge]);

  const questionFlow: QuizQuestion[] = useMemo(() => {
    return [...PROFILE_QUESTIONS, ...BRANCH_QUESTIONS[branch], ...FINAL_QUESTIONS];
  }, [branch]);

  /* --------------------- fase 3: perguntas ----------------------- */

  const currentQ = questionFlow[qIndex];
  const totalQ = questionFlow.length;

  function answerAndNext(value: string | string[]) {
    if (!lead || !currentQ) return;
    const answers = { ...lead.answers, [currentQ.id]: value };
    const nextIndex = qIndex + 1;
    const done = nextIndex >= totalQ;
    persist({
      ...lead,
      answers,
      lastStep: done ? qIndex : nextIndex,
      status: done ? "quiz_completed" : "quiz_in_progress",
    });
    if (done) {
      setPhase("result");
      announce("Diagnóstico concluído. Veja o resultado abaixo.");
    } else {
      setQIndex(nextIndex);
      announce(`Pergunta ${nextIndex + 1} de ${totalQ}.`);
    }
  }

  function goBack() {
    if (phase === "questions" && qIndex > 0) {
      setQIndex(qIndex - 1);
    } else if (phase === "questions") {
      setPhase("challenge");
    } else if (phase === "challenge") {
      setPhase("contact");
    }
  }

  /* ----------------------- fase 4: resultado --------------------- */

  const classification = CLASSIFICATIONS[branch];

  function buildWhatsAppMessage(full: boolean): string {
    if (!lead) return "";
    const c = lead.contact;
    const challengeLabel = MAIN_CHALLENGES.find((m) => m.id === lead.mainChallenge)?.label ?? "-";
    const utms = lead.origem.utms;
    const fmt = (v: string | string[] | undefined) =>
      v === undefined || v === "" ? "-" : Array.isArray(v) ? v.join(", ") : v;

    const lines: string[] = [
      "NOVO DIAGNÓSTICO FLOWAI",
      `ID do lead: ${lead.id}`,
      `Data: ${new Date(lead.createdAt).toLocaleString("pt-BR")}`,
      `Página de origem: ${lead.origem.url}`,
      `Referrer: ${lead.origem.referrer}`,
      `Dispositivo: ${lead.origem.device}`,
      `UTM source: ${utms.utm_source ?? "-"}`,
      `UTM medium: ${utms.utm_medium ?? "-"}`,
      `UTM campaign: ${utms.utm_campaign ?? "-"}`,
      "",
      "DADOS DO CONTATO",
      `Nome: ${c.nome}`,
      `WhatsApp: ${c.whatsapp}`,
      `Empresa: ${c.empresa}`,
      `Instagram: ${c.instagram}`,
      `Site: ${c.site || "-"}`,
      `E-mail: ${c.email || "-"}`,
      "",
      "PERFIL DA EMPRESA",
      `Segmento: ${fmt(lead.answers.segmento)}`,
      `Quantidade de pessoas: ${fmt(lead.answers.pessoas)}`,
      `Equipe comercial: ${fmt(lead.answers.comercial)}`,
      `Modelo B2B/B2C: ${fmt(lead.answers.modelo)}`,
      "",
      "PRINCIPAL NECESSIDADE",
      `Objetivo: ${challengeLabel}`,
      `Prioridade recomendada: ${classification.title}`,
      `Prazo: ${fmt(lead.answers.prazo)}`,
      `Faixa de investimento: ${fmt(lead.answers.investimento)}`,
      `Melhor horário para contato: ${fmt(lead.answers.horario)}`,
      "",
      "ESTRUTURA ATUAL",
      `Já possui: ${fmt(lead.answers.estrutura)}`,
    ];

    if (full) {
      lines.push("", "RESPOSTAS ESPECÍFICAS");
      BRANCH_QUESTIONS[branch].forEach((q) => {
        lines.push(`${q.label} ${fmt(lead.answers[q.id])}`);
      });
    }

    lines.push(
      "",
      "DIAGNÓSTICO INICIAL",
      `Perfil identificado: ${classification.title}`,
      `Próximo passo: ${classification.next}`,
      "",
      `Consentimento LGPD: sim, em ${lead.consentAt ? new Date(lead.consentAt).toLocaleString("pt-BR") : "-"}`
    );

    return lines.join("\n");
  }

  function openWhatsApp() {
    if (!lead) return;
    // Monta a versão completa; se exceder o limite prático do WhatsApp,
    // envia a versão resumida (o registro integral permanece com o lead).
    let msg = buildWhatsAppMessage(true);
    if (msg.length > 3500) msg = buildWhatsAppMessage(false);
    persist({ ...lead, status: "whatsapp_opened" });
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  /* ------------------------------------------------------------------ */
  /* Renderização                                                        */
  /* ------------------------------------------------------------------ */

  const progress =
    phase === "contact"
      ? 0
      : phase === "challenge"
        ? 8
        : phase === "result"
          ? 100
          : Math.round(8 + (qIndex / totalQ) * 88);

  return (
    <div ref={topRef} className="quiz-shell" style={{ scrollMarginTop: "7rem" }}>
      {/* barra de progresso */}
      <div style={{ marginBottom: "2rem" }} aria-hidden="true">
        <div
          style={{
            height: 6,
            width: "100%",
            overflow: "hidden",
            borderRadius: 999,
            background: "color-mix(in srgb, var(--cream) 10%, transparent)",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 999,
              background: "var(--orange)",
              transition: "width 500ms var(--ease)",
              width: `${progress}%`,
            }}
          />
        </div>
        <p style={{ margin: "0.5rem 0 0", textAlign: "right", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          {progress}%
        </p>
      </div>

      <p ref={liveRef} aria-live="polite" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }} />

      {/* ============ FASE 1 — CONTATO ============ */}
      {phase === "contact" && (
        <form onSubmit={startQuiz} noValidate>
          <p className="eyebrow">Diagnóstico gratuito</p>
          <h2 className="h-section" style={{ fontSize: "var(--step2)" }}>
            Antes de começar, como falamos com você?
          </h2>
          <p style={{ marginTop: "0.75rem", fontSize: "0.92rem" }}>
            Leva menos de 3 minutos. Os campos com * são obrigatórios.
          </p>

          {/* honeypot invisível (anti-spam) */}
          <div style={{ position: "absolute", left: -9999, top: "auto" }} aria-hidden="true">
            <label>
              Não preencha este campo
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </label>
          </div>

          <div style={{ marginTop: "2rem", display: "grid", gap: "1.25rem" }}>
            <div>
              <label htmlFor="q-nome" style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 600 }}>
                Nome completo *
              </label>
              <input
                id="q-nome"
                className="field"
                type="text"
                autoComplete="name"
                value={contact.nome}
                aria-invalid={!!errors.nome}
                aria-describedby={errors.nome ? "q-nome-err" : undefined}
                onChange={(e) => setContact({ ...contact, nome: e.target.value })}
              />
              {errors.nome && <p id="q-nome-err" className="field-error">{errors.nome}</p>}
            </div>

            <div>
              <label htmlFor="q-wa" style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 600 }}>
                WhatsApp *
              </label>
              <input
                id="q-wa"
                className="field"
                type="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                autoComplete="tel-national"
                value={contact.whatsapp}
                aria-invalid={!!errors.whatsapp}
                aria-describedby={errors.whatsapp ? "q-wa-err" : undefined}
                onChange={(e) => setContact({ ...contact, whatsapp: maskPhone(e.target.value) })}
              />
              {errors.whatsapp && <p id="q-wa-err" className="field-error">{errors.whatsapp}</p>}
            </div>

            <div>
              <label htmlFor="q-empresa" style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 600 }}>
                Nome da empresa *
              </label>
              <input
                id="q-empresa"
                className="field"
                type="text"
                autoComplete="organization"
                value={contact.empresa}
                aria-invalid={!!errors.empresa}
                aria-describedby={errors.empresa ? "q-empresa-err" : undefined}
                onChange={(e) => setContact({ ...contact, empresa: e.target.value })}
              />
              {errors.empresa && <p id="q-empresa-err" className="field-error">{errors.empresa}</p>}
            </div>

            <div>
              <label htmlFor="q-insta" style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 600 }}>
                Instagram da empresa *
              </label>
              <input
                id="q-insta"
                className="field"
                type="text"
                placeholder="@suaempresa"
                value={contact.instagram}
                aria-invalid={!!errors.instagram}
                aria-describedby={errors.instagram ? "q-insta-err" : undefined}
                onChange={(e) => setContact({ ...contact, instagram: e.target.value })}
              />
              {errors.instagram && <p id="q-insta-err" className="field-error">{errors.instagram}</p>}
            </div>

            <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: "1fr 1fr" }} className="quiz-grid-2">
              <div>
                <label htmlFor="q-site" style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 600 }}>
                  Site <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(opcional)</span>
                </label>
                <input
                  id="q-site"
                  className="field"
                  type="text"
                  inputMode="url"
                  placeholder="suaempresa.com.br"
                  value={contact.site}
                  onChange={(e) => setContact({ ...contact, site: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="q-email" style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", fontWeight: 600 }}>
                  E-mail <span style={{ fontWeight: 400, color: "var(--text-dim)" }}>(opcional)</span>
                </label>
                <input
                  id="q-email"
                  className="field"
                  type="email"
                  autoComplete="email"
                  value={contact.email}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "q-email-err" : undefined}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                />
                {errors.email && <p id="q-email-err" className="field-error">{errors.email}</p>}
              </div>
            </div>

            <div className="card">
              <label style={{ display: "flex", cursor: "pointer", alignItems: "flex-start", gap: "0.75rem", fontSize: "0.88rem", lineHeight: 1.5, color: "var(--text-dim)" }}>
                <input
                  type="checkbox"
                  style={{ marginTop: "0.2rem", height: 16, width: 16, flexShrink: 0, accentColor: "#ff6a00" }}
                  checked={consent}
                  aria-describedby={errors.consent ? "q-consent-err" : undefined}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Concordo que a FlowAI Digital utilize meus dados para realizar este diagnóstico e entrar em
                  contato sobre as soluções apresentadas.
                </span>
              </label>
              {errors.consent && <p id="q-consent-err" className="field-error" style={{ marginTop: "0.5rem" }}>{errors.consent}</p>}
            </div>

            <button type="submit" className="btn btn--primary" style={{ width: "100%" }}>
              Começar o diagnóstico
            </button>
          </div>
        </form>
      )}

      {/* ============ FASE 2 — DESAFIO PRINCIPAL ============ */}
      {phase === "challenge" && (
        <div>
          <p className="eyebrow">Passo 1 de 2</p>
          <h2 className="h-section" style={{ fontSize: "var(--step2)" }}>
            Qual é o principal desafio da sua empresa hoje?
          </h2>
          <p style={{ marginTop: "0.75rem", fontSize: "0.92rem" }}>
            Escolha a opção mais próxima — o diagnóstico se adapta à sua resposta.
          </p>
          <div style={{ marginTop: "2rem", display: "grid", gap: "0.65rem" }}>
            {MAIN_CHALLENGES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`option-pill ${lead?.mainChallenge === c.id ? "is-selected" : ""}`}
                onClick={() => chooseChallenge(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={goBack}
            style={{ marginTop: "1.5rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer" }}
          >
            ← Voltar
          </button>
        </div>
      )}

      {/* ============ FASE 3 — PERGUNTAS ============ */}
      {phase === "questions" && currentQ && (
        <QuestionStep
          key={currentQ.id}
          question={currentQ}
          index={qIndex}
          total={totalQ}
          initial={lead?.answers[currentQ.id]}
          onAnswer={answerAndNext}
          onBack={goBack}
        />
      )}

      {/* ============ FASE 4 — RESULTADO ============ */}
      {phase === "result" && lead && (
        <div>
          <p className="chip">
            <span className="kbd-dot" aria-hidden="true" />
            Diagnóstico inicial concluído
          </p>
          <h2 className="h-section" style={{ marginTop: "1.1rem", fontSize: "var(--step2)" }}>
            Principal prioridade identificada: <span className="accent">{classification.title}</span>
          </h2>

          <div className="card" style={{ marginTop: "2rem", display: "grid", gap: "1.25rem", padding: "1.6rem" }}>
            <div>
              <p className="eyebrow" style={{ fontSize: "0.68rem" }}>Leitura do cenário</p>
              <p style={{ marginTop: "0.5rem", lineHeight: 1.6 }}>{classification.desc}</p>
            </div>
            <div>
              <p className="eyebrow" style={{ fontSize: "0.68rem" }}>Gargalo principal informado</p>
              <p style={{ marginTop: "0.5rem", lineHeight: 1.6 }}>
                {MAIN_CHALLENGES.find((m) => m.id === lead.mainChallenge)?.label}
              </p>
            </div>
            <div>
              <p className="eyebrow" style={{ fontSize: "0.68rem" }}>Próximo passo recomendado</p>
              <p style={{ marginTop: "0.5rem", lineHeight: 1.6 }}>{classification.next}</p>
            </div>
            <div style={{ borderRadius: 12, border: "1px solid var(--line)", background: "color-mix(in srgb, #fff 3%, transparent)", padding: "1rem", fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-dim)" }}>
              Este é um diagnóstico inicial baseado nas suas respostas. A validação completa depende de uma
              análise da operação — feita em conversa com um especialista, sem custo.
            </div>
          </div>

          <button type="button" onClick={openWhatsApp} className="btn btn--primary" style={{ marginTop: "2rem", width: "100%" }}>
            Enviar meu diagnóstico e falar com a FlowAI
          </button>
          <p style={{ marginTop: "0.75rem", textAlign: "center", fontSize: "0.78rem", color: "var(--text-dim)" }}>
            Abre o WhatsApp com o resumo do seu diagnóstico preenchido — você revisa antes de enviar. ID: {lead.id}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Passo de pergunta                                                   */
/* ------------------------------------------------------------------ */

function QuestionStep({
  question,
  index,
  total,
  initial,
  onAnswer,
  onBack,
}: {
  question: QuizQuestion;
  index: number;
  total: number;
  initial: string | string[] | undefined;
  onAnswer: (value: string | string[]) => void;
  onBack: () => void;
}) {
  const [text, setText] = useState(typeof initial === "string" ? initial : "");
  const [multi, setMulti] = useState<string[]>(Array.isArray(initial) ? initial : []);
  const [err, setErr] = useState("");

  function submitText(ev: React.FormEvent) {
    ev.preventDefault();
    if (!question.optional && !text.trim()) {
      setErr("Escreva uma resposta curta — ou o que vier à cabeça.");
      return;
    }
    onAnswer(text.trim() || "-");
  }

  function toggleMulti(opt: string) {
    setMulti((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }

  return (
    <div>
      <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-dim)" }}>
        Pergunta {index + 1} de {total}
      </p>
      <h2 className="h-section" style={{ marginTop: "0.4rem", fontSize: "var(--step1)" }}>
        {question.label}
      </h2>

      {question.type === "options" && (
        <div style={{ marginTop: "1.75rem", display: "grid", gap: "0.65rem" }}>
          {question.options!.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`option-pill ${initial === opt ? "is-selected" : ""}`}
              onClick={() => onAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === "multi" && (
        <div style={{ marginTop: "1.75rem" }}>
          <p style={{ marginBottom: "0.75rem", fontSize: "0.78rem", color: "var(--text-dim)" }}>
            Selecione todas que se aplicam.
          </p>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {question.options!.map((opt) => {
              const selected = multi.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  className={`option-pill ${selected ? "is-selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => toggleMulti(opt)}
                >
                  {selected ? "✓ " : ""}
                  {opt}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: "1.5rem", width: "100%" }}
            onClick={() => onAnswer(multi.length ? multi : ["-"])}
          >
            Continuar
          </button>
        </div>
      )}

      {question.type === "text" && (
        <form onSubmit={submitText} style={{ marginTop: "1.75rem" }}>
          <label htmlFor={`q-${question.id}`} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
            {question.label}
          </label>
          <textarea
            id={`q-${question.id}`}
            className="field"
            style={{ minHeight: "7rem", resize: "vertical" }}
            placeholder={question.placeholder}
            value={text}
            aria-invalid={!!err}
            onChange={(e) => {
              setText(e.target.value);
              setErr("");
            }}
          />
          {err && <p className="field-error">{err}</p>}
          <button type="submit" className="btn btn--primary" style={{ marginTop: "1.25rem", width: "100%" }}>
            Continuar
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        style={{ marginTop: "1.5rem", fontSize: "0.88rem", fontWeight: 600, color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer" }}
      >
        ← Voltar
      </button>
    </div>
  );
}
