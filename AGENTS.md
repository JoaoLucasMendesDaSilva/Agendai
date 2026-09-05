# AGENTS.md — Agendai

## 1. Contexto do projeto

O Agendai é um sistema web de agendamento online para microempreendedores, profissionais autônomos e pequenos negócios de serviços, com origem em um Trabalho de Conclusão de Curso desenvolvido a partir da realidade de Cubatão - SP.

O produto ajuda empreendedores a organizar negócios, serviços, profissionais, clientes e agendamentos, substituindo controles manuais e conversas dispersas por uma experiência simples, confiável e acessível.

O TCC continua sendo parte importante da história e da documentação do projeto, mas não limita sua evolução técnica ou funcional.

## 2. Fase atual

O projeto já ultrapassou a fase de protótipo inicial. A prioridade atual é evoluir o Agendai como produto real, profissional e preparado para uso contínuo.

Toda evolução deve buscar:

1. Confiabilidade das regras de agendamento.
2. Segurança e isolamento dos dados de cada negócio.
3. Boa experiência em dispositivos móveis e desktop.
4. Acessibilidade e linguagem clara em português.
5. Cobertura de testes proporcional ao risco.
6. Desempenho e operação previsíveis em produção.
7. Código legível, sustentável e documentado.

Não tratar o MVP original como teto do produto. Ao mesmo tempo, não adicionar funcionalidades apenas para aumentar o escopo: cada mudança precisa resolver um problema real e ter critérios de aceite claros.

## 3. Capacidades do produto

O núcleo atual inclui:

- Cadastro, login e sessão do empreendedor.
- Configuração e identidade visual do negócio.
- Gestão de serviços e profissionais.
- Gestão de clientes e agendamentos.
- Agenda administrativa, filtros, métricas e relatórios.
- Página pública de agendamento sem conta para o cliente.
- Cálculo de disponibilidade e bloqueio de conflitos.
- Gerenciamento público do agendamento por token seguro.
- Experiência responsiva, tema escuro e recursos de PWA.
- Deploy do frontend e backend.

Antes de afirmar que uma capacidade está concluída, confirme sua implementação, testes e comportamento real no repositório.

## 4. Stack e evolução arquitetural

Stack atual:

- Frontend: React, Vite, HTML, CSS e JavaScript.
- Backend: Node.js com Express.
- Banco de dados: PostgreSQL no Supabase, com migrations SQL incrementais.
- Autenticação: JWT e bcrypt.
- Deploy: Vercel no frontend e Render no backend.

Integrações externas, bibliotecas e provedores devem ser escolhidos conforme necessidade comprovada. Não trocar componentes centrais da stack nem introduzir uma dependência relevante sem:

1. Explicar o problema.
2. Comparar alternativas e custos.
3. Avaliar migração, segurança e manutenção.
4. Aplicar os critérios de aprovação da seção 6.

## 5. Segurança obrigatória

- Nunca salvar senha em texto puro.
- Usar bcrypt com configuração adequada para senhas.
- Nunca retornar senha, hash ou segredo em respostas e logs.
- Manter segredos no servidor, fornecidos por variáveis de ambiente; configuração enviada ao navegador deve ser tratada como pública. Nunca colocar segredos em variáveis `VITE_*` ou no bundle do frontend.
- Nunca versionar `.env`; manter `.env.example` sem valores reais.
- Validar e normalizar entradas em todas as fronteiras da aplicação.
- Usar queries parametrizadas ou uma camada de dados segura.
- Proteger rotas privadas e aplicar autorização por recurso.
- Garantir isolamento entre negócios em toda consulta e mutação.
- Não expor stack traces, detalhes internos ou erros do banco ao usuário.
- Configurar CORS com origens explícitas por ambiente.
- Aplicar rate limit e proteção contra abuso em rotas sensíveis.
- Usar Helmet ou headers equivalentes.
- Validar tipo, tamanho e destino de uploads.
- Não incluir tokens de provedores externos no código.
- Tratar concorrência, idempotência e transações nas operações críticas.
- Verificar certificado e hostname em conexões PostgreSQL remotas; desabilitar
  TLS é permitido apenas para loopback fora de produção.
- Manter RLS e privilégios fechados nas tabelas do Supabase expostas pela Data
  API. RLS é defesa em profundidade e não substitui autorização e isolamento
  por negócio nas queries do Express.

Mudanças em autenticação, autorização, agendamento público, upload, banco ou integrações exigem revisão de segurança proporcional ao risco.

## 6. Decisões de escopo

Classifique propostas por valor para o usuário, risco, custo de operação e alinhamento com o produto.

- Avance com investigação, implementação, testes e documentação dentro do escopo autorizado. Mudanças pequenas e reversíveis não exigem nova aprovação.
- Funcionalidades grandes devem ser divididas em entregas verticais utilizáveis.
- Solicite aprovação antes de ampliar materialmente o escopo, trocar componentes centrais da stack, introduzir impacto arquitetural amplo ou quebra de contrato, executar ações destrutivas ou alterar produção, quando essas ações ainda não estiverem autorizadas.
- Pagamentos, assinaturas, múltiplas unidades, permissões avançadas, marketplace, aplicativo nativo e integrações críticas são possíveis evoluções. Analise impacto e alternativas e confirme que a implementação está incluída no escopo aprovado.
- A autorização já concedida continua válida para as ações e condições aprovadas. Não solicite a mesma aprovação novamente; peça nova decisão se surgir impacto relevante fora dessas condições.
- Antes de pedir aprovação, conclua a investigação e a preparação reversível permitidas, apresente uma proposta concreta e explique a decisão necessária. Enquanto aguarda, continue o trabalho independente autorizado.
- Evite arquitetura especulativa, abstrações sem uso atual e dependências desnecessárias.
- Prefira a menor solução profissional que resolva completamente o problema aprovado.

## 7. Regras de trabalho

Antes de editar:

1. Confirme repositório, branch/worktree, estado das alterações existentes e instruções aplicáveis ao diretório de trabalho e aos arquivos afetados, incluindo eventuais `AGENTS.override.md`.
2. Analise o comportamento existente e os caminhos afetados. Em correções, identifique a causa e os chamadores antes de escolher onde alterar.
3. Defina objetivo e critérios de aceite. Para mudanças que envolvam várias áreas, explique o plano, os arquivos previstos, riscos, migrations, compatibilidade e estratégia de testes.
4. Selecione as skills e revisões pertinentes conforme a seção 12 e aplique os critérios de aprovação da seção 6.

Durante a implementação:

- Preserve alterações existentes do usuário.
- Trabalhe em incrementos pequenos e verificáveis.
- Não faça refatorações não relacionadas sem justificativa.
- Preserve compatibilidade de API. Uma quebra exige aprovação conforme a seção 6, plano de transição para os consumidores afetados e documentação correspondente.
- Não declare sucesso sem executar verificações compatíveis com o risco.
- Comunique descobertas, decisões, bloqueios e mudanças relevantes de estado. Não repita um relatório completo a cada incremento.

Na entrega ou passagem de trabalho:

1. Explique o resultado, o motivo e os arquivos relevantes alterados.
2. Informe verificações executadas, comandos reproduzíveis e resultados. Diferencie testes aprovados, falhas e verificações não executadas, indicando o motivo.
3. Aponte riscos, limitações, dependências e pendências reais.
4. Atualize somente a documentação afetada. Sugira uma mensagem de commit quando a entrega estiver pronta para commit ou isso for solicitado.

### Coordenação com Orca/Codex e múltiplos agentes

- Use um agente para tarefas pequenas. Quando houver autorização para delegação e suporte no ambiente, distribua entregas independentes ou revisões com objetivo definido.
- Antes de delegar, informe objetivo, critérios de aceite, responsável, branch/worktree, base de trabalho, áreas de edição, dependências e verificações esperadas. Confirme que a base contém os contratos e alterações de que a tarefa depende.
- Cada agente que implementar mudanças simultaneamente deve trabalhar em seu próprio worktree. No mesmo checkout, mantenha apenas um agente editando por vez.
- Defina um responsável pela integração. Os demais agentes entregam alterações e evidências, sem integrar o trabalho de outros por iniciativa própria.
- Divida o trabalho por entregas coerentes. Mantenha mudanças fortemente acopladas, como uma regra de agendamento e sua garantia no banco, sob responsabilidade coordenada.
- Quando frontend e backend evoluírem em paralelo, combine entradas, respostas, erros e regras relevantes antes da implementação. Comunique mudanças nesses contratos aos responsáveis afetados.
- Coordene alterações em migrations, dependências, lockfiles e configurações compartilhadas. Preserve a sequência das migrations PostgreSQL; corrija migrations já aplicadas em ambientes compartilhados por novas migrations, sem reescrever o histórico.
- Worktrees não garantem isolamento de banco, serviços externos ou portas. Confira destinos antes de testes e migrations, use ambientes de teste isolados e coordene operações sobre recursos compartilhados. Não use produção como ambiente de teste.
- Ao encontrar sobreposição de trabalho, conflito ou mudança de contrato, pause a edição afetada e alinhe com o responsável pela integração. Preserve alterações alheias e continue tarefas independentes.
- Na passagem de trabalho, informe branch e commit, quando houver, alterações ainda não commitadas, testes e resultados, pendências e ordem de integração. Não presuma que outro agente conhece sua conversa.
- Depois da integração e da resolução de conflitos, valide o conjunto final com as verificações pertinentes. Testes aprovados em branches separadas não substituem essa validação.
- No Orca, atualize o estado e o comentário da tarefa em mudanças relevantes, como início, revisão, bloqueio e conclusão. Antes de usar comandos, consulte a skill `orca-cli` e a referência da versão instalada. Se o runtime estiver indisponível, informe a limitação e continue o trabalho local independente.

## 8. Padrões de implementação

- Priorize código simples, explícito e fácil de manter.
- Mantenha regras de negócio fora de controllers e componentes visuais.
- Centralize acesso à API e tratamento consistente de erros.
- Preserve separação entre routes, controllers, services e middlewares no backend.
- Crie componentes frontend coesos, evitando arquivos gigantes e estados duplicados.
- Use nomes claros e consistentes com o domínio do produto.
- Comente decisões não óbvias, não o funcionamento trivial do código.

## 9. Qualidade de interface

- Seguir `PRODUCT.md` para requisitos de produto e `DESIGN.md` para padrões de interface. Use a documentação de redesign pertinente identificada por caminho exato no índice do README; se a referência estiver ausente, localize-a antes de usá-la, sem inventar caminhos.
- Dentro das instruções aplicáveis ao ambiente, requisitos explícitos aprovados para a tarefa prevalecem sobre orientações desatualizadas do projeto. Se documentos divergirem sem decisão que resolva o conflito, explicite a divergência e confirme apenas a decisão necessária antes de implementar o comportamento afetado.
- Manter experiência mobile-first sem prejudicar desktop.
- Buscar WCAG AA, navegação por teclado, foco visível e contraste adequado.
- Respeitar `prefers-reduced-motion` e estados de carregamento, vazio, erro e sucesso.
- Usar linguagem simples para pessoas com diferentes níveis de familiaridade técnica.
- Verificar visualmente os fluxos alterados em larguras representativas.

## 10. Testes e critérios de aceite

- Backend: testar regras de negócio, autorização, validação, erros e concorrência quando aplicável.
- Frontend: testar utilitários e fluxos críticos, além de verificar build e comportamento visual.
- Banco: revisar migrations, índices, constraints, compatibilidade e estratégia de recuperação.
- Correções de bugs devem incluir teste de regressão sempre que viável.
- Não reduzir ou contornar testes apenas para obter uma execução verde.

Preparação e execução:

- Confirme a versão do Node e o gerenciador de pacotes nos arquivos de versão, manifests e lockfiles existentes. Use o procedimento de instalação do projeto e preserve o lockfile.
- Confira os scripts de cada `package.json` antes de executar os comandos de referência. Não invente scripts nem substitua silenciosamente uma verificação indisponível por outra.
- Confirme as variáveis necessárias a partir de `.env.example`, sem exibir valores sensíveis, e os destinos dos serviços usados nos testes.
- Para testes de banco, use o ambiente isolado definido para a tarefa, aplique somente as migrations PostgreSQL previstas e prepare os dados de teste conforme o procedimento existente. Não execute limpeza ou migrations sobre um banco de destino incerto.
- Mantenha no README ou guia operacional referenciado os comandos confirmados de instalação, preparação do banco e execução. Se faltar configuração, registre a lacuna e continue verificações independentes que possam ser executadas.

Comandos de referência, sujeitos à confirmação dos scripts existentes:

```bash
cd backend
npm test

cd ../frontend
npm test
npm run build
```

### Critérios de agendamento

Ao alterar disponibilidade, criação, cancelamento, reagendamento ou gerenciamento público, confirme as regras existentes e cubra os cenários afetados:

- Concorrência: solicitações simultâneas não podem confirmar reservas incompatíveis para o mesmo recurso; valide a garantia no caminho real de persistência.
- Datas e horários: documente o fuso do negócio, a representação usada na API e no banco e o comportamento na virada do dia. Não deduza o fuso do negócio pelo navegador.
- Disponibilidade: explicite duração, intervalos, bloqueios, limites de funcionamento e estados do agendamento que ocupam a agenda.
- Reagendamento: defina o que acontece com a reserva anterior se o novo horário não puder ser confirmado, preservando-a quando essa for a regra aprovada e evitando perda parcial de dados.
- Isolamento: teste tentativas de consultar e alterar recursos de outro negócio, inclusive usando identificadores válidos.
- Tokens públicos: confirme operações permitidas, validade e revogação; teste token inválido, expirado quando aplicável, revogado e apresentado para outro agendamento.
- Repetição de solicitações: confirme a política de idempotência e teste tentativas repetidas nos caminhos críticos afetados.

Esses critérios orientam a investigação e os testes; não comprovam implementação existente. Se faltar uma decisão de negócio que mude o comportamento, apresente a dúvida e confirme a regra antes de implementá-la, sem bloquear trabalho independente.

## 11. Estrutura de referência

```txt
backend/
  database/
    postgres-migrations/  # migrations ativas, na ordem numérica
    migrations/           # histórico MySQL; não aplicar no PostgreSQL
  src/
    config/
    controllers/
    middlewares/
    routes/
    services/
    utils/
    app.js
    server.js
  test/

frontend/
  public/
  src/
    assets/
    components/
    contexts/
    pages/
    services/
    App.jsx
    main.jsx
  test/

docs/
plans/
```

A estrutura existente deve ser respeitada. Mudanças estruturais precisam ter benefício claro e plano de migração.

## 12. Uso de skills e revisores

Selecione as skills disponíveis em `.agents/skills` ou no ambiente conforme o trabalho concreto; leia apenas as pertinentes. Não carregue todas as skills nem acione todos os revisores por padrão.

Os perfis de `.agents/subagents` são referências de especialização. Confirme como o ambiente os carrega; a existência da pasta não comprova que agentes estejam configurados ou disponíveis. Ao usar agentes personalizados nativos do Codex, confira a configuração suportada pela versão instalada, incluindo arquivos TOML em `.codex/agents/`. Não duplique perfis ou crie configuração sem necessidade.

Quando houver autorização para delegação, selecione revisores pelos riscos afetados, sem uma sequência fixa obrigatória:

- Backend Lead: arquitetura, regras de negócio e compatibilidade de API.
- Database Architect: dados, migrations, integridade e concorrência.
- Security Engineer: autenticação, autorização, isolamento, tokens públicos, uploads e integrações sensíveis.
- QA Tester: cenários críticos, regressões e comportamento integrado.
- Code Reviewer: correção, manutenção e escopo do conjunto final.
- TCC Documenter: decisões e mudanças com impacto técnico ou acadêmico que exijam registro.

Revisores trabalham em leitura por padrão e entregam problema, localização, impacto e evidência ou cenário de reprodução. Correções devem ter responsável definido. Uma aprovação genérica não substitui evidências; revisão sem achados deve informar escopo e limitações.

Se a delegação ou um perfil não estiver disponível, o agente principal realiza a revisão pertinente e informa a ausência de revisão independente. Não invente participação de especialistas nem declare testes que eles não executaram.

## 13. Documentação e veracidade

- Manter README, `.env.example`, documentação de API, planos e guias operacionais sincronizados com o código.
- Manter no README um índice com os caminhos reais dos documentos de produto, design, redesign e operação usados pelo projeto. Atualizar o índice quando uma referência mudar, sem duplicar o conteúdo desses documentos no AGENTS.md.
- Diferenciar claramente estado atual, trabalho em andamento e roadmap.
- Não inventar funcionalidades, resultados de teste, integrações ou condições de produção.
- Registrar decisões relevantes de modo que sejam compreensíveis tanto por avaliadores do TCC quanto por futuros mantenedores do produto.
