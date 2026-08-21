const WHATSAPP_NUMBER = "5521992208062";

const clients = [
  { name: "21Go", src: "/images/clients/21go.png", tone: "dark" },
  { name: "My iPhone", src: "/images/clients/my-iphone.png", label: "My iPhone" },
  { name: "Abraseg", src: "/images/clients/abraseg.png" },
  { name: "Análise Web", src: "/images/clients/analise-web.png" },
  { name: "Zen Fiscal", src: "/images/clients/zen-fiscal.png" },
  { name: "Meu Caixa", src: "/images/clients/meu-caixa.png", tone: "dark" }
];

function clientCards(duplicate = false) {
  return clients.map((client) => `
    <article class="flow-client-card ${client.tone === "dark" ? "is-dark" : ""}" ${duplicate ? 'aria-hidden="true"' : ""}>
      <img src="${client.src}" alt="${duplicate ? "" : client.name}" loading="lazy" decoding="async">
      ${client.label ? `<span>${client.label}</span>` : ""}
    </article>
  `).join("");
}

function applyOfficialBrand() {
  document.querySelectorAll(".brand").forEach((brand) => {
    if (brand.dataset.officialBrand) return;
    brand.dataset.officialBrand = "true";
    brand.classList.add("official-brand");
    brand.innerHTML = '<img src="/images/brand/flowai-logo.png" alt="FlowAI Digital">';
  });

  const strip = document.querySelector(".client-strip");
  if (strip && !strip.dataset.logoRail) {
    strip.dataset.logoRail = "true";
    strip.innerHTML = `
      <div class="flow-client-intro">
        <span>Algumas empresas que confiam na FlowAI</span>
        <strong>Negócios que contam com a FlowAI para crescer e evoluir seus processos.</strong>
      </div>
      <div class="flow-client-viewport">
        <div class="flow-client-track">
          <div class="flow-client-group">${clientCards()}</div>
          <div class="flow-client-group" aria-hidden="true">${clientCards(true)}</div>
        </div>
      </div>
    `;
  }

  const duplicateProof = document.querySelector(".proof-section");
  duplicateProof?.classList.add("flow-duplicate-proof");

  applyContentRefinements();
}

function replaceTextKeepingIcon(element, text) {
  if (!element) return;
  [...element.childNodes].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) node.remove();
  });
  element.append(document.createTextNode(text));
}

function removeForcedHeadingBreaks() {
  const selectors = [
    ".section-heading h2",
    ".comparison-intro h2",
    ".pillars-heading h2",
    ".diagnostic-copy h2",
    ".faq-heading h2",
    ".final-cta h2"
  ];
  document.querySelectorAll(selectors.join(",")).forEach((heading) => {
    heading.querySelectorAll("br").forEach((lineBreak) => lineBreak.replaceWith(" "));
  });
}

function applyContentRefinements() {
  removeForcedHeadingBreaks();

  const experience = document.querySelector(".experience-copy");
  if (!experience || experience.dataset.teamContent) return;
  experience.dataset.teamContent = "true";

  const kicker = experience.querySelector(".eyebrow");
  const title = experience.querySelector("h2");
  const description = experience.querySelector("p:not(.eyebrow)");
  if (kicker) kicker.textContent = "Pessoas e agentes por trás da arquitetura";
  if (title) title.textContent = "Eu, meu time e nossos agentes treinados vamos evoluir sua operação.";
  if (description) {
    description.textContent = "São 18 anos trabalhando em grandes empresas e convivendo com operações reais. Hoje, essa experiência se soma ao time FlowAI e a agentes de IA treinados para mapear gargalos, apoiar a execução e construir um ecossistema que funcione no dia a dia da sua empresa.";
  }

  const points = experience.querySelectorAll(".experience-points span");
  replaceTextKeepingIcon(points[0], " Diagnóstico conduzido por pessoas que entendem operações");
  replaceTextKeepingIcon(points[1], " Agentes de IA treinados para apoiar análise e execução");
  replaceTextKeepingIcon(points[2], " Acompanhamento do time FlowAI na implantação e evolução");
}

function quizMarkup() {
  return `
    <div class="flow-quiz" hidden>
      <div class="flow-quiz-backdrop" data-quiz-close></div>
      <section class="flow-quiz-dialog" role="dialog" aria-modal="true" aria-labelledby="flow-quiz-title">
        <button class="flow-quiz-close" type="button" aria-label="Fechar diagnóstico" data-quiz-close>×</button>
        <header class="flow-quiz-header">
          <img src="/images/brand/flowai-logo.png" alt="FlowAI Digital">
          <div class="flow-quiz-progress" aria-label="Progresso do diagnóstico">
            <i class="active"></i><i></i><i></i>
          </div>
          <span class="flow-quiz-step-label">Etapa 1 de 3</span>
        </header>

        <form id="flow-diagnostic-form" novalidate>
          <div class="flow-quiz-step active" data-step="0">
            <p class="flow-quiz-kicker">Diagnóstico rápido</p>
            <h2 id="flow-quiz-title">Primeiro, vamos conhecer você.</h2>
            <p>Leva menos de um minuto. Suas respostas irão organizadas para nossa equipe.</p>
            <div class="flow-quiz-fields two-columns">
              <label>Nome<input name="nome" autocomplete="name" required placeholder="Seu nome"></label>
              <label>Empresa<input name="empresa" autocomplete="organization" required placeholder="Nome da empresa"></label>
              <label>E-mail<input name="email" type="email" autocomplete="email" required placeholder="voce@empresa.com.br"></label>
              <label>WhatsApp<input name="whatsapp" inputmode="tel" autocomplete="tel" required placeholder="(21) 99999-9999"></label>
            </div>
            <label class="flow-quiz-consent">
              <input name="consentimento" type="checkbox" required>
              <span>Autorizo a FlowAI a entrar em contato sobre este diagnóstico.</span>
            </label>
          </div>

          <div class="flow-quiz-step" data-step="1">
            <p class="flow-quiz-kicker">Sua prioridade</p>
            <h2>O que mais precisa evoluir agora?</h2>
            <p>Escolha a opção que melhor representa o momento da empresa.</p>
            <div class="flow-quiz-options">
              <label><input type="radio" name="prioridade" value="CRM e processo comercial" required><span>CRM e vendas</span></label>
              <label><input type="radio" name="prioridade" value="ERP, financeiro e gestão"><span>ERP e financeiro</span></label>
              <label><input type="radio" name="prioridade" value="Atendimento e WhatsApp"><span>Atendimento</span></label>
              <label><input type="radio" name="prioridade" value="Automação de processos"><span>Automações</span></label>
              <label><input type="radio" name="prioridade" value="Dados e dashboards"><span>Dados e dashboards</span></label>
              <label><input type="radio" name="prioridade" value="Ecossistema operacional completo"><span>Ecossistema completo</span></label>
            </div>
          </div>

          <div class="flow-quiz-step" data-step="2">
            <p class="flow-quiz-kicker">Cenário atual</p>
            <h2>Últimas informações para o diagnóstico.</h2>
            <p>Com isso, a conversa já começa focada na realidade da sua operação.</p>
            <div class="flow-quiz-fields two-columns">
              <label>Tamanho da equipe
                <select name="equipe" required>
                  <option value="">Selecione</option>
                  <option>1 a 5 pessoas</option><option>6 a 20 pessoas</option>
                  <option>21 a 50 pessoas</option><option>Mais de 50 pessoas</option>
                </select>
              </label>
              <label>Quando pretende começar?
                <select name="prazo" required>
                  <option value="">Selecione</option>
                  <option>O quanto antes</option><option>Nos próximos 30 dias</option>
                  <option>Nos próximos 3 meses</option><option>Ainda estou avaliando</option>
                </select>
              </label>
            </div>
            <label class="flow-quiz-textarea">Qual é o principal gargalo hoje? <span>(opcional)</span>
              <textarea name="gargalo" rows="3" placeholder="Ex.: dados espalhados, retrabalho, CRM que não acompanha o processo..."></textarea>
            </label>
          </div>

          <footer class="flow-quiz-actions">
            <button type="button" class="flow-quiz-back" hidden>Voltar</button>
            <button type="button" class="flow-quiz-next">Continuar</button>
            <button type="submit" class="flow-quiz-submit" hidden>Enviar diagnóstico pelo WhatsApp</button>
          </footer>
        </form>
      </section>
    </div>
  `;
}

function setupQuiz() {
  document.body.insertAdjacentHTML("beforeend", quizMarkup());
  const modal = document.querySelector(".flow-quiz");
  const dialog = modal.querySelector(".flow-quiz-dialog");
  const form = modal.querySelector("form");
  const steps = [...modal.querySelectorAll(".flow-quiz-step")];
  const bars = [...modal.querySelectorAll(".flow-quiz-progress i")];
  const label = modal.querySelector(".flow-quiz-step-label");
  const back = modal.querySelector(".flow-quiz-back");
  const next = modal.querySelector(".flow-quiz-next");
  const submit = modal.querySelector(".flow-quiz-submit");
  let step = 0;

  function showStep(index) {
    step = Math.max(0, Math.min(index, steps.length - 1));
    steps.forEach((item, i) => item.classList.toggle("active", i === step));
    bars.forEach((item, i) => item.classList.toggle("active", i <= step));
    label.textContent = `Etapa ${step + 1} de ${steps.length}`;
    back.hidden = step === 0;
    next.hidden = step === steps.length - 1;
    submit.hidden = step !== steps.length - 1;
    const focusable = steps[step].querySelector("input, select, textarea");
    requestAnimationFrame(() => focusable?.focus());
  }

  function validateStep() {
    const fields = [...steps[step].querySelectorAll("input, select, textarea")];
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    if (step === 1 && !form.querySelector('input[name="prioridade"]:checked')) {
      form.querySelector('input[name="prioridade"]').reportValidity();
      return false;
    }
    return true;
  }

  function openQuiz() {
    modal.hidden = false;
    document.body.classList.add("quiz-open");
    showStep(0);
    requestAnimationFrame(() => dialog.classList.add("is-open"));
  }

  function closeQuiz() {
    dialog.classList.remove("is-open");
    document.body.classList.remove("quiz-open");
    setTimeout(() => { modal.hidden = true; }, 180);
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("a.button, a.header-cta, a[href*='wa.me']");
    if (!trigger || trigger.closest(".flow-quiz")) return;
    event.preventDefault();
    openQuiz();
  });

  modal.querySelectorAll("[data-quiz-close]").forEach((item) => item.addEventListener("click", closeQuiz));
  next.addEventListener("click", () => { if (validateStep()) showStep(step + 1); });
  back.addEventListener("click", () => showStep(step - 1));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeQuiz(); });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateStep()) return;
    const data = new FormData(form);
    const message = [
      "Olá, FlowAI! Preenchi o diagnóstico do site.",
      "",
      `Nome: ${data.get("nome")}`,
      `Empresa: ${data.get("empresa")}`,
      `E-mail: ${data.get("email")}`,
      `WhatsApp: ${data.get("whatsapp")}`,
      `Prioridade: ${data.get("prioridade")}`,
      `Equipe: ${data.get("equipe")}`,
      `Prazo: ${data.get("prazo")}`,
      `Principal gargalo: ${data.get("gargalo") || "Não informado"}`,
      "",
      "Quero entender como construir um ecossistema adaptado à minha empresa."
    ].join("\n");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  });
}

function init() {
  applyOfficialBrand();
  setupQuiz();
  const observer = new MutationObserver(applyOfficialBrand);
  observer.observe(document.getElementById("root"), { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 5000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
