---
target: landing page final
total_score: 32
p0_count: 0
p1_count: 1
timestamp: 2026-07-06T18-31-11Z
slug: frontend-src-pages-landingpage-jsx
---
## Design Health Score

| # | Heurística | Nota | Observação principal |
|---|---|---:|---|
| 1 | Visibilidade do status | 3/4 | FAQ e menu comunicam estado; falta indicação da seção atual e transição de rota. |
| 2 | Correspondência com o mundo real | 4/4 | Copy baseada em conversa perdida, agenda do dia, horários e login/senha. |
| 3 | Controle e liberdade | 4/4 | Atalhos, login alternativo, FAQ, Escape e retorno de foco oferecem bom controle. |
| 4 | Consistência e padrões | 4/4 | Botões, landmarks, elevação e vocabulário foram alinhados ao design system. |
| 5 | Prevenção de erros | 3/4 | Qualificadores honestos evitam promessas falsas; faltam condições comerciais e privacidade. |
| 6 | Reconhecimento em vez de lembrança | 4/4 | Controles rotulados, valor central visível e divulgação progressiva reduzem memória. |
| 7 | Flexibilidade e eficiência | 3/4 | Há atalhos, CTAs, login e tema; falta uma demonstração real antes do cadastro. |
| 8 | Estética e design minimalista | 3/4 | Hierarquia 3+disclosure é focada; a macrosequência ainda lembra landing SaaS. |
| 9 | Recuperação de erros | 2/4 | A superfície quase não produz erros, então recuperação não é demonstrada. |
| 10 | Ajuda e documentação | 2/4 | FAQ é útil, mas faltam suporte, contato, privacidade e termos. |
| **Total** |  | **32/40** | **Bom — base sólida, com lacunas estratégicas de confiança.** |

## Anti-Patterns Verdict

**Aprovado com ressalvas.** A página não parece mais uma grade de cards gerada por fórmula. Os nove recursos equivalentes foram substituídos por três capacidades hierarquizadas; recursos secundários usam divulgação progressiva; o processo numerado representa uma sequência real; não há gradient text, listras decorativas, métricas falsas, radius excessivo ou glassmorphism generalizado.

A ressalva é a macroestrutura ainda familiar — navegação arredondada, hero dividido, prova, capacidades, processo, FAQ e CTA — junto a pequenos pre-headings recorrentes e ícones Lucide. A origem em Cubatão, a copy cotidiana e o quadro de rotina tornam o resultado mais próprio, mas uma captura real ou demo segura seria necessária para torná-lo inconfundível.

O detector retornou `[]`, com 0 achados no JSX atual. Isso confirma ausência das violações automatizadas, não excelência visual por si só.

## Impressão geral

A landing saiu de uma vitrine de funcionalidades para uma narrativa coerente: problema cotidiano, exemplo explícito, garantias objetivas, três capacidades centrais, público, processo, dúvidas e decisão. A confiança aumentou sem inventar preço, depoimentos ou métricas.

## O que funciona

- A promessa “Menos conversa perdida. Mais horário confirmado.” é concreta e próxima da rotina do público.
- “Exemplo de rotina” deixa claro que o quadro é ilustrativo, evitando estados falsamente ao vivo.
- Três pilares substituem a parede de nove cards; seis recursos continuam acessíveis sob demanda.
- Menu mobile preserva login e âncoras, fecha com Escape e devolve foco ao gatilho.
- FAQ fechado sai da árvore de acessibilidade e possui associação semântica completa.
- CTA sólido usa contraste AA de 5,97:1 e sombras legadas foram neutralizadas.

## Problemas prioritários restantes

### [P1] Falta uma camada verificável de confiança antes do cadastro

**Por que importa:** a página menciona login protegido e ausência atual de cartão, mas não oferece política de privacidade, termos, tratamento de dados, identidade responsável ou canal real de suporte.

**Correção:** quando esses materiais existirem, adicionar links reais e uma explicação curta em linguagem simples. Não criar rotas ou contatos fictícios.

**Comando sugerido:** `$impeccable harden landing page` seguido de `$impeccable clarify landing page`.

### [P2] A página explica melhor do que prova

**Por que importa:** o quadro de rotina é honesto, mas continua ilustrativo. Um visitante cauteloso não consegue experimentar o agendamento nem comparar com uma captura atual do produto.

**Correção:** publicar uma captura anotada real ou um negócio de demonstração seguro mostrando escolha, validação e chegada à agenda. Não inventar testemunhos ou métricas.

**Comando sugerido:** `$impeccable bolder landing page` quando houver evidência real disponível.

### [P3] Jargão residual em recursos secundários

“PWA” ainda aparece como detalhe técnico. Liderar sempre com “instalar como aplicativo” e deixar a sigla apenas entre parênteses quando necessária.

**Comando sugerido:** `$impeccable clarify landing page`.

### [P3] Menu mobile pode ter encerramento adicional

Escape e retorno de foco estão corretos e testados. Fechamento por toque externo e ao cruzar o breakpoint continuam melhorias opcionais.

**Comando sugerido:** `$impeccable adapt landing page`.

## Carga cognitiva

**1 de 8 falhas — carga baixa.** Foco, chunking, agrupamento, hierarquia, progressão, memória e divulgação progressiva passam. A única falha estrita é a navegação desktop expor seis controles, embora estejam divididos em dois grupos claros.

## Persona Red Flags

### Jordan — primeira experiência

O caminho inicial é claro e todos os controles possuem texto ou rótulo acessível. Restam dúvidas sobre o que acontece após o cadastro, quando poderia existir cobrança e onde pedir ajuda.

### Riley — teste de estresse

Os qualificadores honestos e a ausência de “grátis” ajudam. Riley ainda buscará evidências sobre concorrência de agendamentos, dados coletados, indisponibilidade do serviço e condições futuras — respostas que dependem de documentação real.

### Casey — mobile distraído

Login, âncoras, alvos de 44px, Escape, foco restaurado e CTAs full-width resolvem a lacuna anterior. Toque externo e fechamento por mudança de breakpoint são melhorias de conveniência, não bloqueios.

### Márcia — microempreendedora local

A linguagem cotidiana, a origem em Cubatão e os três pilares tornam o produto mais próximo. Ainda falta um canal humano real de suporte e uma explicação comercial definitiva para reduzir o risco percebido.

## Observações menores

- “Criar agenda” e “Criar minha agenda” podem ser padronizados em um futuro passe de copy.
- O FAQ permite várias respostas abertas; isso é adequado para comparação e não precisa ser alterado por estética.
- Testes não cobrem clique externo, mudança de breakpoint ou rotas de política ainda inexistentes.
- A inspeção visual final foi bloqueada pela política do navegador local; afirmações de composição foram verificadas por código, testes e build, não por nova captura.

## Perguntas a considerar

- Qual é a condição comercial verdadeira que pode ser publicada hoje?
- Qual evidência real pode ser disponibilizada sem inventar prova: captura anotada ou negócio de demonstração?
- Qual canal de suporte e qual política de dados estarão oficialmente disponíveis no lançamento?
