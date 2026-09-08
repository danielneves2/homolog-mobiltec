# Playbook · Mobiltec Design System v1.0.0

**Fonte original**: `templates/_referencia/help-center-mobiltec.html` (Help Center Mobiltec gerado pelo Claude Design).
**Implementação canônica**: [templates/brand-mobiltec.css](../templates/brand-mobiltec.css).

Toda escolha de cor, tipografia, espaçamento, raio, sombra e motion em qualquer artefato deste repositório **deve** consumir os tokens descritos abaixo via `var(--token)`. Nunca hardcode hex em templates ou agents.

## 1. Identidade da marca

| Token | Valor | Uso |
|---|---|---|
| `--color-primary` | `#7e2065` | Burgundy/magenta · cor de marca principal. Bordas, links, CTA, KPI Total. |
| `--brand-purple` | `#6e226b` | Variante mais escura. Acentos secundários. |
| `--brand-orange` | `#f37804` | Laranja vivo · contraste e KPI C4M. |
| `--brand-red` | `#ca3546` | Vermelho · alerta secundário. |
| `--color-hero-accent` | `#d987c1` | Magenta claro · highlights, gradients. |

## 2. Estados funcionais (light)

| Estado | Sólida | Soft | Pill bg | Pill fg | Border soft |
|---|---|---|---|---|---|
| Info | `#2563eb` | `#eff6ff` | — | `#1e40af` | rgba(37,99,235,.30) |
| Success | `#16a34a` | `#f0fdf4` | rgba(22,163,74,.10) | `#166534` | rgba(22,163,74,.30) |
| Warning | `#ca8a04` | `#fefce8` | rgba(202,138,4,.10) | `#854d0e` | rgba(202,138,4,.50) |
| Destructive | `#dc2626` | rgba(220,38,38,.10) | — | `#991b1b` | rgba(220,38,38,.40) |

No dashboard de chamados, mapear:
- **Status "Fechado/Solucionado"** → success (`var(--color-success-pill-bg/fg)`).
- **Status "Aberto/Aguardando"** → warning.
- **Status "Em atendimento/Em andamento"** → info.
- **Status "Pendente"** → red soft.

## 3. Surfaces

| Token | Light | Dark |
|---|---|---|
| `--color-background` | `#ffffff` | `#0a0a0d` |
| `--color-foreground` | `#0f0f12` | `#f5f5f7` |
| `--color-card` | `#ffffff` | `#131318` |
| `--color-popover` | `#ffffff` | `#1a1a1f` |
| `--color-sidebar` | `#f9f9fb` | `#0d0d11` |
| `--color-secondary` / `--color-muted` / `--color-accent` | `#f4f4f6` | `#1c1c22` |
| `--color-muted-foreground` | `#6b7080` | `#9395a3` |
| `--color-border` / `--color-input` | `#e5e5ea` | rgba(255,255,255,.08–.10) |

## 4. Tipografia

- **Sans**: `Geist` → fallback `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.
- **Mono**: `Geist Mono` → fallback `'Fira Code', 'JetBrains Mono', Consolas, monospace`.
- Pesos disponíveis: 400 / 500 / 600 / 700.
- Carregamento: via Google Fonts no `<head>` do template (`fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap`).

### Escala tipográfica

| Token | px | Uso típico |
|---|---|---|
| `--text-xs` | 11 | Labels, captions, metadados |
| `--text-sm` | 13 | Texto de tabela, descrições secundárias |
| `--text-base` | 15 | Texto corrido (padrão do body) |
| `--text-lg` | 17 | Títulos de seção |
| `--text-xl` | 20 | Subseções |
| `--text-2xl` | 24 | Cliente no header |
| `--text-3xl` | 30 | Valores de KPI |
| `--text-4xl` | 36 | Reservado para títulos hero |

Letter-spacing: títulos com `letter-spacing: -0.01em`; labels uppercase com `letter-spacing: 0.08em`.

## 5. Espaçamento

Escala 4-8-12-16-20-24-32-40-48-64 (desktop). Em mobile (`max-width: 768px`), valores médios reduzem proporcionalmente (3=10, 4=14, 5=18, 6=20, 8=28, 10=36, 12=40, 16=56).

| Token | Desktop | Mobile |
|---|---|---|
| `--space-1` | 4px | 4px |
| `--space-2` | 8px | 8px |
| `--space-3` | 12px | 10px |
| `--space-4` | 16px | 14px |
| `--space-5` | 20px | 18px |
| `--space-6` | 24px | 20px |
| `--space-8` | 32px | 28px |
| `--space-10` | 40px | 36px |
| `--space-12` | 48px | 40px |
| `--space-16` | 64px | 56px |

## 6. Raios

| Token | px | Uso |
|---|---|---|
| `--radius-sm` | 6 | Badges, tags pequenas |
| `--radius-md` | 8 | Botões, inputs |
| `--radius-lg` | 10 | Cards menores, rows |
| `--radius-xl` | 14 | Cards principais, header/footer |
| `--radius-full` | 9999 | Pills, círculos |

## 7. Sombras

5 níveis (`--shadow-xs` a `--shadow-xl`). Em cards do dashboard: `xs` em estado normal, `sm` em hover. Em PDF (`@media print`): **todas removidas** (`box-shadow: none`).

## 8. Motion

- `--t-fast: 120ms ease` — hover, transições de estado de pequeno componente.
- `--t-base: 200ms ease` — transições de layout, mudança de tema.

## 9. Layout

- `--topbar-h: 60px` — altura padrão do header (não aplicado no dashboard atual, mas reservado).
- `--sidebar-w: 280px` — largura padrão de sidebar (idem).

## 10. Gradientes

- `--gradient-warm-soft` — orange→primary com 8% de opacidade. Hero leve.
- `--gradient-hero` — burgundy escuro mesh (light hero não usado no dashboard, reservado).

## 11. Componentes corporativos providos

Definidos em [templates/brand-mobiltec.css](../templates/brand-mobiltec.css):

| Classe | Descrição |
|---|---|
| `.brand-header` | Header do dashboard com logo + nome do cliente + meta. |
| `.brand-header__logo` / `__divider` / `__client` / `__client-label` / `__client-name` / `__meta` / `__observacao` | Subcomponentes. |
| `.brand-footer` / `.brand-footer__mark` | Rodapé corporativo. |
| `.ds-pill` + variantes `.ds-pill--success/warning/info/danger/primary` | Pills reutilizáveis. |

## 12. Regras de uso

1. **Nunca** hardcode hex em templates ou agents. Sempre `var(--token)`.
2. **Sempre** importar `brand-mobiltec.css` (inlinado pelo `dashboard-renderer`).
3. **Sempre** carregar Geist via Google Fonts no `<head>` (o template mestre já faz).
4. Para uma cor que **não existe** no DS, primeiro tentar combinar tokens existentes (ex.: `--color-primary` + opacidade). Só introduzir novo token se for legitimamente reutilizável; nesse caso, atualizar este documento e [brand-mobiltec.css](../templates/brand-mobiltec.css) simultaneamente.
5. Em **PDF** (`@media print`), sempre forçar tema claro. Já implementado no CSS.

## 13. Versão e governança

- **Versão atual**: 1.0.0 (token `--ds-version: '1.0.0'`).
- **Mudanças** no DS exigem confirmação explícita do usuário e bump de versão.
- A referência viva do DS é o Help Center Mobiltec em [templates/_referencia/help-center-mobiltec.html](../templates/_referencia/help-center-mobiltec.html).

## 14. Mapeamento Produto → cor (consolidado)

Decisão arquitetural ao migrar do dashboard original para o DS Mobiltec. **Não regredir** sem nova decisão explícita.

| Produto / Métrica | Token DS | Hex (light) |
|---|---|---|
| **Cloud4Mobile (C4M)** | `--brand-orange` | `#f37804` |
| **NXT4Insight (NXT)** | `--color-primary` (no chart "Produto" usa `--brand-purple`) | `#7e2065` |
| **Total geral** | `--brand-purple` (badge) / `--color-primary` (KPI card) | `#6e226b` / `#7e2065` |
| **KPI Total card** | `--color-primary` (borda topo) | `#7e2065` |
| **KPI Fechados** | `--color-success` | `#16a34a` |
| **KPI SLA** | `--color-hero-accent` | `#d987c1` |
| **Status "Fechado/Solucionado"** | pill success | — |
| **Status "Pendente"** | pill red soft | — |
| **Status "Em atendimento"** | pill info | — |
| **Flag "ISSUE"** | red soft | — |

> **Divergência intencional do dashboard original**: O original [painel-suporte-original.html](../templates/_referencia/painel-suporte-original.html) usava C4M=azul/`#3b82f6` e NXT=roxo/`#a855f7`. O novo template alinha à paleta corporativa Mobiltec (DS v1.0.0). KPIs numéricos permanecem idênticos; apenas a paleta diverge — esse é o objetivo do branding profissional.

## 15. Notas técnicas de implementação

- **Logo Mobiltec**: o template referencia `<img class="brand-header__logo" src="{{LOGO_DATAURI}}" />`, mas o `dashboard-renderer` deve substituir essa tag inteira pelo conteúdo SVG inline lido de [templates/assets/logo-mobiltec.svg](../templates/assets/logo-mobiltec.svg) (mais leve e legível que data URI base64; permite herança de cor via `currentColor` se necessário no futuro).
- **CSS de marca**: deve ser inlinado dentro do bloco `<style>` que contém `{{BRAND_CSS}}` (sem marcadores `/* */` ao redor do placeholder no template — caso contrário o CSS fica inerte dentro de comentário).
