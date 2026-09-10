# Auditoria do dark mode — Agendai

Data: 09/09/2026

Escopo: login, landing page, agendamento público e gerenciamento público.

Viewports: desktop 1440×1000 e mobile 390×844.

Meta: WCAG AA — 4,5:1 para texto normal, 3:1 para texto grande e componentes.

## Resultado

APROVADO no escopo auditado após três correções reais de contraste.

| Métrica | Antes | Depois |
|---|---:|---:|
| Contrastes aprovados | 545/554 (98,4%) | 556/556 (100%) |
| Falhas únicas de contraste | 3 | 0 |
| Sequências completas por teclado | 10 | 10 |
| Falhas de foco visível | 0 | 0 |
| Interações erro/hover aprovadas | 4/4 | 4/4 |
| Componentes disabled inspecionados | 10 | 10 |
| Estados com overflow horizontal | — | 0/10 |
| Falhas de alvo mínimo WCAG AA | — | 0 |

Correções confirmadas:

- `Cadastre-se`: 3,00:1 → 10,87:1.
- `Sem conflito`: 1,55:1 → 10,86:1.
- Número da etapa ativa: 2,52:1 → 7,53:1.
- Foco do link de cadastro: anel translúcido → token sólido `--focus-ring`.

## Passos e evidências

1. **Login padrão e foco — saudável após correção.** Ordem de tabulação completa; campos, checkbox, senha, botão e cadastro alcançáveis.
   - [Desktop — depois](screenshots-after/01-login-desktop-focus.png)
   - [Mobile — depois](screenshots-after/01-login-mobile-focus.png)
   - [Desktop — antes](screenshots-before/01-login-desktop-focus.png)

2. **Login com erro — saudável.** Mensagens associadas aos campos, foco enviado ao primeiro campo inválido e contraste aprovado.
   - [Desktop](screenshots-after/02-login-desktop-error.png)
   - [Mobile](screenshots-after/02-login-mobile-error.png)

3. **Login hover e disabled — saudável.** Hover altera o fundo; estado ocupado desabilita campos e ação sem perder legibilidade.
   - [Hover desktop](screenshots-after/03-login-desktop-hover.png)
   - [Hover mobile](screenshots-after/03-login-mobile-hover.png)
   - [Disabled desktop](screenshots-after/03-login-desktop-disabled.png)
   - [Disabled mobile](screenshots-after/03-login-mobile-disabled.png)

4. **Landing pública — saudável após correção.** Links e botões navegáveis; `Sem conflito` agora atende AA.
   - [Desktop — depois](screenshots-after/04-landing-desktop.png)
   - [Mobile — depois](screenshots-after/04-landing-mobile.png)
   - [Desktop — antes](screenshots-before/04-landing-desktop.png)

5. **Início do agendamento público — saudável após correção.** Serviço selecionável por teclado; etapa ativa atende AA.
   - [Desktop — depois](screenshots-after/05-agendamento-desktop-inicio.png)
   - [Mobile — depois](screenshots-after/05-agendamento-mobile-inicio.png)
   - [Desktop — antes](screenshots-before/05-agendamento-desktop-inicio.png)

6. **Agendamento público preenchido — saudável.** Serviço, profissional, data, horário, campos, aviso de privacidade e confirmação percorrem ciclo completo por Tab.
   - [Desktop](screenshots-after/06-agendamento-desktop-formulario.png)
   - [Mobile](screenshots-after/06-agendamento-mobile-formulario.png)

7. **Gerenciamento público — saudável.** Confirmar presença, reagendar e cancelar têm foco visível e contraste aprovado.
   - [Desktop](screenshots-after/07-gerenciar-desktop.png)
   - [Mobile](screenshots-after/07-gerenciar-mobile.png)

## Arquivos afetados

- `frontend/src/landing-page.css`: texto do selo em superfície clara usa o verde profundo já existente.
- `frontend/src/professional-public.css`: link de cadastro no dark mode e texto das etapas usam tokens existentes; foco do cadastro usa o token de foco.
- `artifacts/dark-mode-audit-2026-09-09/`: relatório, métricas e 32 screenshots antes/depois.

Banco, dependências e lockfiles não foram alterados por esta auditoria. `package-lock.json` já estava modificado no início e foi preservado.

## Testes executados

- Playwright 1.63.0 + Chromium 153, API local simulada: aprovado.
- `npm test`: 15 arquivos e 45 testes aprovados.
- `npm run build`: aprovado.
- `npm run lint`: aprovado com 2 avisos preexistentes de Fast Refresh; 0 erros.
- `git diff --check`: aprovado; apenas aviso de conversão LF→CRLF do Git.
- Scanner Impeccable: 19 avisos consultivos preexistentes sobre tons/radii não documentados; nenhum introduzido pela correção. Mantidos para evitar mudança fora do escopo.

## Limites

- APIs foram interceptadas com dados fictícios; banco e produção não foram acessados.
- A evidência confirma contraste, teclado, estados e reflow nas superfícies listadas. Não substitui teste manual com leitor de tela nem certifica o produto inteiro.

Métricas completas: [antes](metrics-before.json) · [depois](metrics-after.json)
