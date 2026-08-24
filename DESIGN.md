---
name: Agendai
description: Sistema de agendamento online simples, profissional e confiavel para pequenos negocios.
colors:
  green-deep: "#093e2a"
  green-primary: "#0d6f3b"
  green-action: "#178a4b"
  action-light-bg: "#0d6f3b"
  action-light-text: "#ffffff"
  action-dark-bg: "#39b96e"
  action-dark-text: "#07130c"
  green-soft: "#e8f6ed"
  green-wash: "#f2fbf5"
  page-bg: "#f5f7f6"
  page-bg-soft: "#f8faf9"
  panel-bg: "#ffffff"
  panel-bg-soft: "#f8faf9"
  ink: "#14201e"
  text: "#344541"
  muted: "#5f706b"
  border: "#dfe7e3"
  quiet-surface: "#f0f4f2"
  warning-bg: "#fff4cc"
  warning: "#c88900"
  info-bg: "#e8f2ff"
  info: "#2368b3"
  danger-bg: "#ffe7e7"
  danger: "#c93b3b"
typography:
  display:
    fontFamily: "Poppins, Arial, Helvetica, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "0"
  headline:
    fontFamily: "Poppins, Arial, Helvetica, sans-serif"
    fontSize: "1.22rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  title:
    fontFamily: "Poppins, Arial, Helvetica, sans-serif"
    fontSize: "1.02rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0"
  body:
    fontFamily: "Poppins, Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Poppins, Arial, Helvetica, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  xs: "8px"
  sm: "10px"
  md: "12px"
  lg: "14px"
  xl: "16px"
  page-card: "20px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.action-light-bg}"
    textColor: "{colors.action-light-text}"
    rounded: "{rounded.sm}"
    padding: "13px 18px"
    height: "50px"
  button-secondary:
    backgroundColor: "{colors.green-wash}"
    textColor: "{colors.green-primary}"
    rounded: "{rounded.sm}"
    padding: "13px 18px"
    height: "50px"
  input-field:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "13px 15px"
    height: "50px"
  dashboard-card:
    backgroundColor: "{colors.panel-bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "22px"
  status-chip-success:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green-primary}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
---

# Design System: Agendai

## 1. Overview

**Creative North Star: "Painel de Atendimento Claro"**

O Agendai e uma ferramenta de trabalho para quem atende pessoas todos os dias. A interface deve parecer clara, organizada e pronta para uso imediato: mais proxima de um painel de atendimento confiavel do que de um software corporativo pesado.

Nas telas autenticadas, essa ideia se materializa como um **Balcao de Atendimento Digital**: o empreendedor consulta e atualiza a operacao entre atendimentos, muitas vezes pelo celular. Metricas relacionadas formam faixas continuas, listas usam linhas e divisores, e cards ficam reservados para agrupamentos que realmente precisam de contencao.

A assinatura operacional e a **linha do atendimento**: hora, marcador, cliente e servico aparecem em sequencia cronologica na agenda e nos resumos do dia. O recurso comunica ordem e proximidade do proximo compromisso; nao deve ser usado como decoracao fora desse contexto.

O visual atual combina fundo claro, superficies brancas, verde profundo como acento principal e estados semanticos simples. A tela deve orientar o empreendedor com poucos elementos por vez, mantendo os fluxos de agenda, servicos, profissionais e clientes diretos o bastante para uso no celular.

O sistema rejeita a aparencia de sistema complicado, amador ou distante do usuario. Tambem rejeita menus complexos, linguagem tecnica, visual improvisado, dashboard financeiro avancado, estetica de marketplace grande e qualquer efeito "tech demais" que afaste microempreendedores.

**Key Characteristics:**
- Produto operacional, nao vitrine decorativa.
- Verde profundo usado para acao, selecao e confianca.
- Superficies claras com hierarquia discreta.
- Linguagem visual mobile-first e facil de tocar.
- Estados de erro, aviso, informacao e sucesso sempre visiveis e compreensiveis.

## 2. Colors

A paleta e restrita e funcional: verde profundo para confianca e acao, neutros limpos para leitura, e cores semanticas somente quando o estado pede.

### Primary
- **Verde Atendimento Profundo** (`green-deep`): usado em headers fortes, hero publico, dark accents e momentos de identidade do Agendai.
- **Verde Operacional** (`green-primary`): usado em texto de acao, navegacao ativa, chips de sucesso e elementos que indicam controle.
- **Verde Acao** (`green-action`): usado em botoes primarios, foco, selecao de horario e graficos.
- **Verde Confirmacao Suave** (`green-soft`): usado em estados positivos, icones de apoio e fundos de componentes selecionados.
- **Verde Fundo Leve** (`green-wash`): usado em botoes secundarios, hover de navegacao e areas de apoio.

### Secondary
- **Amarelo Aviso** (`warning`): usado para status pendente, avisos e informacoes que pedem atencao sem bloquear.
- **Azul Informacao** (`info`): usado para mensagens informativas e metricas secundarias.
- **Vermelho Bloqueio** (`danger`): usado para erro, cancelamento e acoes destrutivas.

### Neutral
- **Fundo de Trabalho** (`page-bg`): base clara do produto.
- **Painel Branco** (`panel-bg`): superficie principal de cards, formularios e tabelas.
- **Tinta Principal** (`ink`): texto principal e titulos.
- **Texto de Apoio** (`muted`): descricoes, detalhes e metadados.
- **Linha Discreta** (`border`): divisores e bordas de baixa friccao.

### Named Rules
**The Less Than Ten Rule.** O verde de acao deve aparecer em menos de 10% de uma tela operacional; quando tudo chama atencao, nada orienta.

**The Semantic Honesty Rule.** Amarelo, azul e vermelho so entram para estado real: aviso, informacao ou erro. Nunca usar essas cores como decoracao solta.

## 3. Typography

**Display Font:** Poppins (com fallback Arial, Helvetica, sans-serif)
**Body Font:** Poppins (com fallback Arial, Helvetica, sans-serif)
**Label/Mono Font:** Poppins (sem fonte mono dedicada)

**Character:** Uma unica familia sans mantem o produto simples e consistente. Poppins da um tom amigavel e profissional sem exigir uma combinacao tipografica complexa.

### Hierarchy
- **Display** (700, `2rem`, `1.12`): titulos de pagina e principais chamadas internas.
- **Headline** (700, `1.22rem`, `1.3`): titulos de paineis, secoes e cards importantes.
- **Title** (700, `1.02rem`, `1.3`): nomes de servicos, profissionais, atalhos e cards de entidade.
- **Body** (400, `1rem`, `1.5`): conteudo principal, formularios e mensagens. Textos longos devem ficar em 65-75 caracteres por linha.
- **Label** (600, `0.9rem`, `1.4`): labels de campos, botoes, navegacao e pequenas instrucoes.

### Named Rules
**The Same Voice Rule.** Nao introduzir fonte display, serifada ou decorativa em telas operacionais. O produto precisa parecer familiar e consistente.

**The No Jargon Rule.** Texto de UI deve explicar a acao em portugues simples: "Escolha o horario", "Gerar relatorio PDF", "Nenhum horario disponivel".

## 4. Elevation

O Agendai usa elevacao profissional discreta. Nas telas autenticadas, bordas claras, fundos tonais e divisores separam superficies; paineis e linhas nao flutuam no hover. Sombras ficam reservadas para elementos sobrepostos, autenticacao e superficies publicas quando a separacao por borda nao for suficiente.

### Shadow Vocabulary
- **Card Discreto** (`0 4px 8px rgba(25, 57, 47, 0.05)`): opcional em superficies publicas ou isoladas; nao usar em cada item do dashboard.
- **Painel Suave** (`0 8px 22px rgba(25, 57, 47, 0.06)`): usado em containers maiores, auth cards e pagina publica.
- **Hover Operacional:** mudanca de fundo ou borda, sem deslocamento e sem sombra ampla.
- **Foco Verde** (`0 0 0 4px rgba(0, 127, 111, 0.12)`): usado em inputs, escolha selecionada e estado ativo.

### Named Rules
**The Professional Discretion Rule.** Sombra deve separar, nao decorar. Se a sombra vira o primeiro elemento percebido, esta forte demais.

**The Focus Is Not Optional Rule.** Todo controle interativo precisa de foco visivel com borda verde ou anel de foco.

## 5. Components

### Buttons
- **Shape:** retangulos levemente arredondados (`10px`), altura confortavel (`50px`) e peso `600`.
- **Primary:** no tema claro, texto branco sobre verde profundo (`#0d6f3b`); no tema escuro, tinta escura (`#07130c`) sobre verde vivo (`#39b96e`). Ambos preservam contraste AA para texto normal.
- **Hover / Focus:** hover muda o tom do verde sem deslocar o controle; foco mantem anel verde legivel.
- **Secondary:** fundo verde muito claro (`#f2fbf5`), texto verde operacional e borda verde translucidada.
- **Danger:** fundo vermelho suave e texto vermelho para cancelamento, erro e exclusao logica.

### Chips
- **Style:** formato pill (`999px`), padding compacto (`6px 10px`), peso `600`.
- **State:** confirmado usa verde suave, pendente usa amarelo suave, informacao usa azul suave, erro usa vermelho suave.

### Cards / Containers
- **Corner Style:** paineis operacionais usam `12px` a `14px`; cards publicos grandes podem chegar a `20px`.
- **Background:** `panel-bg` para conteudo principal e `quiet-surface` para o app shell.
- **Shadow Strategy:** dashboard autenticado usa borda e fundo tonal, sem sombra por padrao. Reservar `Painel Suave` para auth, pagina publica e sobreposicoes.
- **Border:** sempre discreta (`#dfe7e3` ou equivalente translucidado). Evitar bordas coloridas decorativas.
- **Internal Padding:** `16px` para cards compactos, `22px` para paineis.
- **Grouped Content:** metricas, atalhos e listas relacionadas compartilham uma unica borda externa e usam divisores internos. Evitar uma grade de cards iguais para dados do mesmo contexto.

### Inputs / Fields
- **Style:** fundo branco, borda discreta, radius `10px`, altura minima `50px`.
- **Focus:** borda verde de acao e anel `0 0 0 4px rgba(0, 127, 111, 0.12)`.
- **Error / Disabled:** erros aparecem em mensagem vermelha suave; disabled reduz opacidade e remove transformacoes.

### Navigation
- **Style:** sidebar com botoes de `44px` min-height, icones lucide, labels objetivos e estado ativo verde.
- **Active State:** fundo verde suave, texto verde profundo e peso `600`; sem gradiente decorativo.
- **Mobile Treatment:** sidebar vira menu lateral com overlay; topbar mantem acoes compactas e labels podem sumir abaixo de `560px`.
- **Touch Targets:** todo botao, campo, seletor ou acao textual interativa deve ter pelo menos `44px` de altura em celular e desktop.

### Authenticated Dashboard
- **Metrics:** faixa continua com divisores; quatro colunas no desktop, duas no celular quando houver largura suficiente e uma abaixo de `380px`.
- **Tables and Lists:** cabecalho no desktop, linhas tocaveis no celular e nenhuma rolagem horizontal obrigatoria em `320px` ou mais.
- **Forms:** uma coluna no celular, campos relacionados em duas colunas somente quando houver espaco. Valores usam peso regular; labels usam `600`.
- **Loading:** skeletons dentro do contexto carregado. Nao substituir todo o conteudo por spinner central.
- **Empty / Error / Success:** mensagem em portugues simples, causa ou estado atual e proxima acao quando existir.
- **Motion:** transicoes de estado entre `150ms` e `220ms`; sem animar largura, altura, padding, margem ou grid do shell. Respeitar `prefers-reduced-motion`.

### Public Booking Flow
- **Style:** superficie continua e clara, sem aparencia de dashboard. Identidade e informacoes do negocio abrem o fluxo; divisores organizam as etapas sem transformar cada bloco em um card.
- **Progress:** no celular, mostrar etapa atual e barra de progresso fixa; a partir de tablet, exibir as cinco etapas em uma linha. Numeracao existe porque o agendamento e uma sequencia real.
- **Selections:** servicos e profissionais usam listas agrupadas com divisores. Horarios usam botoes compactos e tocaveis. Selecao e foco recebem contraste verde visivel, sem sombra ou deslocamento decorativo.
- **Summary:** no desktop, resumo discreto acompanha o fluxo. No celular, data, horario, servico e profissional aparecem junto ao botao de confirmacao para evitar repeticao de paineis.
- **Confirmation:** sucesso ocupa o conteudo principal e destaca data e horario em uma faixa de compromisso verde profundo, seguida dos dados registrados e do link de gerenciamento quando disponivel.
- **States:** loading usa skeleton contextual. Vazio, erro, indisponibilidade e sucesso usam portugues simples, informam o estado atual e oferecem a proxima acao quando aplicavel.

## 6. Do's and Don'ts

### Do:
- **Do** usar o verde profundo para acao, selecao, navegacao ativa e confirmacao.
- **Do** manter superficies claras, bordas discretas e sombras profissionais discretas.
- **Do** escrever mensagens em portugues simples, especialmente erros e estados vazios.
- **Do** preservar fluxo mobile-first: botoes tocaveis, cards empilhados e formularios sem excesso de campos por linha.
- **Do** respeitar dark mode e `prefers-reduced-motion` em qualquer nova tela.

### Don't:
- **Don't** criar uma interface com cara de sistema complicado, amador ou distante do usuario.
- **Don't** adicionar excesso de informacoes, menus complexos ou linguagem tecnica.
- **Don't** transformar o painel em dashboard financeiro avancado ou marketplace grande.
- **Don't** usar estetica "tech demais", neon, glassmorphism decorativo ou gradientes roxos genericos.
- **Don't** usar borda lateral colorida grossa como destaque de card.
- **Don't** criar cards com radius acima de `20px` nas telas operacionais.
- **Don't** usar sombras pesadas; se parecer flutuante demais, esta fora da linguagem do Agendai.
