# Auditoria técnica do frontend profissional

Data: 04/07/2026

Escopo: frontend React completo, incluindo landing page, autenticação, área administrativa, agendamento público e gerenciamento do agendamento.

## Veredito sobre antipadrões

**Aprovado com ressalvas.** A interface final não apresenta os principais sinais de UI genérica gerada por IA: não há texto em gradiente, glassmorphism decorativo, animações elásticas ou cartões excessivamente arredondados nas novas camadas. O detector ainda encontra estilos legados com bordas laterais e valores fora do design system em `styles.css`, mas dois desses estilos são neutralizados pelas folhas profissionais carregadas depois. O principal problema sistêmico é a convivência entre CSS legado e quatro camadas de sobrescrita.

## Audit Health Score

| # | Dimensão | Nota | Principal constatação |
|---|---|---:|---|
| 1 | Acessibilidade | 2/4 | Contraste secundário, estados selecionados e mensagens dinâmicas precisam de correção |
| 2 | Performance | 2/4 | Bundle inicial de 942,22 kB e todas as rotas carregadas de forma síncrona |
| 3 | Responsividade | 3/4 | Estrutura mobile-first sólida, com alvos e textos pequenos em controles compactos |
| 4 | Temas | 3/4 | Dark mode e tokens funcionam, mas há divergência entre CSS legado, tokens novos e `DESIGN.md` |
| 5 | Antipadrões | 3/4 | Novas telas são intencionais; resíduos legados ainda elevam a complexidade |
| **Total** |  | **13/20** | **Aceitável — requer correções antes da entrega final** |

## Resumo executivo

- Pontuação: **13/20 — Aceitável**.
- Ocorrências: **0 P0, 4 P1, 5 P2 e 2 P3**.
- Build de produção aprovado.
- Frontend: **9 testes aprovados**.
- Backend: **30 testes aprovados**.
- Detector das folhas profissionais: sem ocorrências.
- Limitação: a inspeção visual automatizada do `localhost` foi bloqueada pela política do navegador interno; a validação de viewport ainda precisa de conferência manual.

## Achados P1 — corrigir antes da banca

### P1.1 — Contraste do texto secundário abaixo de AA

- **Local:** `frontend/src/professional-shell.css:15` e usos de `--gray-500` nas telas.
- **Categoria:** Acessibilidade / Temas.
- **Impacto:** textos pequenos e metadados podem ficar difíceis de ler em telas claras.
- **Evidência:** `#6c7b77` sobre `#ffffff` resulta em aproximadamente **4,43:1**, abaixo dos 4,5:1 exigidos para texto normal.
- **Padrão:** WCAG 2.2 — 1.4.3 Contrast (Minimum).
- **Recomendação:** escurecer o token claro de texto secundário e substituir o placeholder legado `#98a2b3` por um token aprovado.
- **Comando sugerido:** `$impeccable colorize`.

### P1.2 — Seleções não são comunicadas a leitores de tela

- **Local:** `AgendamentoPublico.jsx:534-651` e `Clientes.jsx:352-358`.
- **Categoria:** Acessibilidade.
- **Impacto:** serviço, profissional, horário e cliente selecionados dependem apenas da classe visual `is-selected`. Em Clientes, `role="listitem"` substitui a semântica nativa do botão.
- **Padrão:** WCAG 2.2 — 4.1.2 Name, Role, Value.
- **Recomendação:** usar `aria-pressed` nos botões selecionáveis e remover o `role` que sobrescreve o botão de cliente.
- **Comando sugerido:** `$impeccable harden`.

### P1.3 — Erros e sucessos dinâmicos não possuem anúncio consistente

- **Local:** Login, Cadastro, Dashboard, Agenda, Clientes, Serviços, Profissionais, Meu Negócio e páginas públicas.
- **Categoria:** Acessibilidade.
- **Impacto:** usuários de leitor de tela podem não perceber falhas de formulário ou confirmações após ações assíncronas.
- **Padrão:** WCAG 2.2 — 4.1.3 Status Messages.
- **Recomendação:** padronizar mensagens de erro com `role="alert"` e mensagens informativas/sucesso com `role="status"` ou `aria-live` adequado.
- **Comando sugerido:** `$impeccable harden`.

### P1.4 — Bundle inicial excessivo

- **Local:** `App.jsx:7-19` e imports estáticos de Chart.js/jsPDF em `Dashboard.jsx:2-3`.
- **Categoria:** Performance.
- **Impacto:** primeira abertura mais lenta, especialmente em celulares e redes móveis.
- **Evidência:** bundle principal de **942,22 kB** bruto e **297,37 kB gzip**; Vite emite aviso para chunks acima de 500 kB.
- **Recomendação:** lazy loading por rota e imports dinâmicos de Chart.js e jsPDF somente quando necessários.
- **Comando sugerido:** `$impeccable optimize`.

## Achados P2 — corrigir no próximo passe

### P2.1 — Tipografia operacional excessivamente pequena

- **Local:** folhas `professional-pages.css` e `professional-management.css`; exemplo extremo em `professional-pages.css:768` com `0.54rem`.
- **Categoria:** Acessibilidade / Responsividade.
- **Impacto:** metadados chegam a aproximadamente 8,6 px, prejudicando leitura em celulares e projeção durante a banca.
- **Padrão:** WCAG 1.4.4 Resize Text e boas práticas de legibilidade.
- **Recomendação:** estabelecer piso de 0,7–0,75 rem para texto informativo e testar zoom de 200%.
- **Comando sugerido:** `$impeccable typeset`.

### P2.2 — Controles compactos abaixo de 44 px

- **Local:** filtros, links de painel, selects, botões de cancelamento e ações do shell; exemplos em `professional-pages.css:119`, `:452`, `:659` e `professional-management.css:170`.
- **Categoria:** Responsividade / Acessibilidade.
- **Impacto:** toque menos confiável em celulares, embora a maioria ainda ultrapasse o mínimo de 24 px da WCAG 2.5.8.
- **Recomendação:** elevar ações primárias e controles frequentes para pelo menos 44 px; manter compactação apenas em desktop.
- **Comando sugerido:** `$impeccable adapt`.

### P2.3 — CSS legado e profissional convivem por sobrescrita

- **Local:** imports iniciais de `App.jsx` e `frontend/src/styles.css`.
- **Categoria:** Temas / Manutenibilidade / Antipadrões.
- **Impacto:** aumenta risco de regressão por especificidade e dificulta explicar o design system no TCC.
- **Evidência:** uma folha legada de grande porte seguida por quatro folhas profissionais; detector encontra cores, raios e bordas antigas que já não representam a interface final.
- **Recomendação:** consolidar tokens e migrar regras ativas para módulos por superfície, removendo regras comprovadamente sem uso.
- **Comando sugerido:** `$impeccable document` seguido de `$impeccable distill`.

### P2.4 — Cobertura de testes de interface limitada

- **Local:** suíte Vitest do frontend.
- **Categoria:** Regressão.
- **Impacto:** CRUDs de serviços/profissionais, agenda administrativa e navegação responsiva podem quebrar sem detecção automática.
- **Evidência:** 5 arquivos e 9 testes, concentrados em utilitários, Negócio e agendamento público.
- **Recomendação:** adicionar testes de interação para filtros, status, seleção de cliente, criação/edição e estados vazios.
- **Comando sugerido:** `$impeccable harden`.

### P2.5 — Overflow horizontal é ocultado globalmente

- **Local:** `styles.css:74` e `professional-shell.css:78`.
- **Categoria:** Responsividade.
- **Impacto:** conteúdo que ultrapasse a viewport pode ser cortado silenciosamente, escondendo defeitos em vez de permitir diagnóstico.
- **Padrão:** WCAG 2.2 — 1.4.10 Reflow.
- **Recomendação:** remover a ocultação global após corrigir containers específicos e testar 320 px, 360 px e zoom de 200%.
- **Comando sugerido:** `$impeccable adapt`.

## Achados P3 — polimento

### P3.1 — Fonte externa bloqueante

- **Local:** `styles.css:1`.
- **Categoria:** Performance.
- **Impacto:** `@import` do Google Fonts adiciona uma etapa bloqueante e depende da rede.
- **Recomendação:** usar `<link rel="preconnect">`/`<link rel="stylesheet">` no HTML ou hospedar os arquivos localmente.
- **Comando sugerido:** `$impeccable optimize`.

### P3.2 — Transição de largura no progresso público

- **Local:** `styles.css:1775`.
- **Categoria:** Performance.
- **Impacto:** animar `width` força recálculo de layout durante a mudança de etapa.
- **Recomendação:** usar `transform: scaleX()` com origem à esquerda e respeitar redução de movimento.
- **Comando sugerido:** `$impeccable animate`.

## Problemas sistêmicos

1. Texto compacto demais aparece em várias telas, não em um componente isolado.
2. Mensagens assíncronas não compartilham um componente acessível único.
3. O sistema visual novo é aplicado sobre o CSS antigo por cascata.
4. O roteamento manual importa todas as telas antecipadamente.
5. Testes funcionais do backend são fortes, mas testes de interação do frontend ainda são poucos.

## Pontos positivos

- Todos os inputs principais possuem labels visíveis.
- Imagens possuem texto alternativo ou `alt=""` quando decorativas.
- Navegação e ações usam elementos semânticos, principalmente `button`, `nav`, `main`, `header` e `aside`.
- Existe suporte consistente a `prefers-reduced-motion`.
- Dark mode possui tokens próprios e contraste medido adequado nos pares principais.
- Layout é mobile-first e utiliza breakpoints estruturais.
- Estados de carregamento, vazio, erro e sucesso aparecem nas jornadas críticas.
- Regras de disponibilidade, conflitos e segurança continuam cobertas pelos 30 testes do backend.

## Ordem recomendada de correção

1. **P1 — `$impeccable harden`:** corrigir semântica de seleção, anúncios dinâmicos e papel dos botões de cliente.
2. **P1 — `$impeccable colorize`:** elevar contraste dos textos secundários e placeholders.
3. **P1 — `$impeccable optimize`:** dividir rotas e carregar bibliotecas pesadas sob demanda.
4. **P2 — `$impeccable adapt`:** ajustar alvos de toque, reflow e overflow.
5. **P2 — `$impeccable typeset`:** estabelecer tamanho mínimo legível.
6. **P2 — `$impeccable document` + `$impeccable distill`:** consolidar design system e remover CSS legado sem uso.
7. **Final — `$impeccable polish`:** revisão visual e comportamental consolidada.

Após as correções, esta auditoria deve ser executada novamente para medir a evolução da pontuação.
