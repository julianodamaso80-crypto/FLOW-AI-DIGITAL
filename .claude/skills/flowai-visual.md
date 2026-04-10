# FlowAI Visual Identity System

## Paleta de Cores (fonte unica de verdade)

| Nome | Hex | Uso | Proporcao |
|------|-----|-----|-----------|
| Off-white Quente | `#F5EFE6` | Fundo principal, areas amplas | 70% |
| Areia Editorial | `#E7D8C7` | Apoio, cards, areas secundarias, backgrounds alternados | Parte dos 70% |
| Marrom Espresso | `#6B412D` | Titulos, texto forte, contraste premium | 20% |
| Terracota Flow | `#C9653C` | CTAs, acentos, destaques, elementos da marca | 10% |
| Cobre Queimado | `#A95532` | Hover states, bordas, profundidade | Parte dos 10% |

### Regra 70/20/10
- **70% base clara** (Off-white + Areia)
- **20% texto/estrutura** (Marrom Espresso)
- **10% acao/destaque** (Terracota + Cobre)

### Cores Auxiliares (derivadas)
- Texto secundario: `#8B7355` (marrom claro para subtextos)
- Bordas sutis: `rgba(107, 65, 45, 0.12)` (Espresso com opacidade)
- Sombras: `rgba(107, 65, 45, 0.08)` (nunca preto puro)
- Fundo de hover: `rgba(201, 101, 60, 0.06)` (Terracota sutil)

### NUNCA usar
- Preto puro (`#000000`) — usar Marrom Espresso
- Fundo escuro como padrao — base e sempre clara
- Neon azul, verde eletrico, roxo
- Metalizado frio (prata, cinza frio)
- Branco puro (`#FFFFFF`) — usar Off-white Quente

## Tipografia

### Fonte Display (Headlines)
- **Noto Serif Bold**
- Uso: headlines, capas, chamadas institucionais
- Tamanhos: 48-72px (desktop), 32-48px (mobile)
- Line-height: 1.15
- Letter-spacing: -0.02em

### Fonte UI (Corpo/Interface)
- **Noto Sans SemiBold** (subtitulos, nav, CTAs)
- **Noto Sans Regular** (corpo de texto)
- Uso: corpo, UI, botoes, navegacao
- Tamanhos: 16-20px corpo, 14px small, 12px caption
- Line-height: 1.6 (corpo), 1.4 (UI)

### Import Google Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif:wght@700&family=Noto+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Grid e Espacamento

- Max-width container: 1200px
- Padding lateral: 24px (mobile), 48px (tablet), 64px (desktop)
- Espacamento entre secoes: 96px (desktop), 64px (mobile)
- Espacamento entre elementos: 24px, 32px, 48px (escala de 8)
- Grid: 12 colunas, gap 24px

## Border Radius
- Pequeno (botoes, inputs): 8px
- Medio (cards): 12px
- Grande (secoes, modais): 16px
- Extra (destaque): 24px

## Sombras
- Sutil: `0 1px 3px rgba(107, 65, 45, 0.06)`
- Media: `0 4px 16px rgba(107, 65, 45, 0.08)`
- Forte: `0 8px 32px rgba(107, 65, 45, 0.12)`

## Animacoes Aprovadas
- Fade-in on scroll: opacity 0→1, translateY 20px→0, duration 600ms
- Hover scale: scale(1.02), duration 200ms, ease-out
- Button hover: background darken, shadow increase, duration 150ms
- Stagger text: 50ms delay entre palavras/linhas
- Counter: numeros contando de 0 ao valor final, 1500ms, easeOutExpo

### Animacoes PROIBIDAS
- Bounce, shake, wobble
- Parallax agressivo
- Auto-play video com som
- Animacoes que duram mais de 800ms
- Mais de 2 animacoes simultaneas na tela

## Logo
- Arquivo principal: usar logo existente em `site-v6-video/assets/logo/`
- Versao clara (fundo escuro): `logo-flowai-light.png`
- Versao padrao: `logo-flowai.png`
- Versao 3D: `logo-flowai-3d.png`
- Tamanho nav: height 36px
- Area de respiro: minimo 16px ao redor

## Imagens
- Estilo: editorial, premium, real (nao ilustracao cartoon)
- Tratamento: overlay leve com Areia Editorial ou Espresso
- Formato: JPG (fotos), SVG (icones), WebP (otimizado)
- Cantos: border-radius 12px em imagens dentro de cards
