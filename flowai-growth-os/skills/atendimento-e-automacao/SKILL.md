---
description: Cria fluxos de atendimento, sequências de WhatsApp, scripts de follow-up e estruturas de CRM para a FlowAI e para clientes nos nichos de clínicas e imobiliárias.
---

# Skill: Atendimento e Automação

## Princípio central
Automação sem processo é ruído. Processo sem automação é gargalo.
Sempre definir o processo antes de automatizar.

## Estrutura de atendimento ideal (modelo FlowAI)

**Etapa 1 — Primeiro contato (0-5 min)**
IA ou automação responde imediatamente com:
- Confirmação de recebimento
- Pergunta de qualificação (ex: "Qual procedimento você tem interesse?")
- Opções de agendamento

**Etapa 2 — Qualificação (5-15 min)**
- Coletar: nome, interesse, urgência, localização
- Encaminhar para humano se lead qualificado

**Etapa 3 — Proposta / Agendamento**
- Humano fecha agendamento ou envia proposta
- Registro no CRM

**Etapa 4 — Follow-up (24h, 48h, 7 dias)**
- Mensagem 1 (24h): confirmação do agendamento
- Mensagem 2 (48h antes): lembrete
- Mensagem 3 (após): feedback/reativação se não compareceu

**Etapa 5 — Reativação de base**
- Leads que não converteram: campanha de reativação a cada 30-60 dias

## Modelo de fluxo WhatsApp (para clínicas)

```
LEAD ENTRA
↓
Mensagem automática: "Olá [nome]! Vi que você tem interesse em [procedimento].
Para te atender melhor, pode me dizer: qual é a sua principal dúvida sobre o tratamento?"
↓
SE responde → qualificação humana → agendamento
SE não responde em 2h → follow-up automático
SE não responde em 24h → segundo follow-up
SE não responde em 72h → lead marcado como "frio" no CRM
```

## CRM mínimo viável
- Campos obrigatórios: nome, telefone, procedimento de interesse, origem do lead, status, data do próximo contato
- Status: Novo / Em atendimento / Agendado / Não compareceu / Fechado / Perdido
- Meta: zero lead sem status definido

## REGRA ABSOLUTA
Nunca criar fluxo de automação sem mapear o processo humano por trás.
Sempre indicar onde entra o humano e onde entra a máquina.
