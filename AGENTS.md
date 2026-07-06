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
- Banco de dados: MySQL com migrations SQL.
- Autenticação: JWT e bcrypt.
- Deploy: Vercel no frontend e Railway no backend.

Integrações externas, bibliotecas e provedores devem ser escolhidos conforme necessidade comprovada. Não trocar componentes centrais da stack nem introduzir uma dependência relevante sem:

1. Explicar o problema.
2. Comparar alternativas e custos.
3. Avaliar migração, segurança e manutenção.
4. Solicitar aprovação quando houver impacto arquitetural amplo.

## 5. Segurança obrigatória

- Nunca salvar senha em texto puro.
- Usar bcrypt com configuração adequada para senhas.
- Nunca retornar senha, hash ou segredo em respostas e logs.
- Manter segredos exclusivamente em variáveis de ambiente.
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

Mudanças em autenticação, autorização, agendamento público, upload, banco ou integrações exigem revisão de segurança proporcional ao risco.

## 6. Decisões de escopo

Classifique propostas por valor para o usuário, risco, custo de operação e alinhamento com o produto.

- Mudanças pequenas e reversíveis podem avançar com testes e documentação adequados.
- Funcionalidades grandes devem ser divididas em entregas verticais utilizáveis.
- Pagamentos, assinaturas, múltiplas unidades, permissões avançadas, marketplace, aplicativo nativo e integrações críticas são possíveis evoluções, mas exigem análise e aprovação antes da implementação.
- Evite arquitetura especulativa, abstrações sem uso atual e dependências desnecessárias.
- Prefira a menor solução profissional que resolva completamente o problema aprovado.

## 7. Regras de trabalho

Antes de mudanças grandes:

1. Analise o repositório e o comportamento existente.
2. Explique objetivo, plano e critérios de aceite.
3. Liste os arquivos que pretende alterar.
4. Identifique riscos, migrations, compatibilidade e estratégia de testes.
5. Use as skills e revisores especializados relevantes.
6. Aguarde aprovação quando a alteração for ampla, destrutiva ou arquitetural.

Durante a implementação:

- Preserve alterações existentes do usuário.
- Trabalhe em incrementos pequenos e verificáveis.
- Não faça refatorações não relacionadas sem justificativa.
- Mantenha compatibilidade de API ou documente claramente a quebra.
- Não declare sucesso sem executar verificações compatíveis com o risco.

Depois de cada etapa:

1. Explique o que mudou e por quê.
2. Liste os arquivos alterados.
3. Informe testes executados e como reproduzi-los.
4. Aponte riscos, limitações e pendências reais.
5. Atualize a documentação afetada.
6. Sugira uma mensagem de commit objetiva.

## 8. Padrões de implementação

- Priorize código simples, explícito e fácil de manter.
- Mantenha regras de negócio fora de controllers e componentes visuais.
- Centralize acesso à API e tratamento consistente de erros.
- Preserve separação entre routes, controllers, services e middlewares no backend.
- Crie componentes frontend coesos, evitando arquivos gigantes e estados duplicados.
- Use nomes claros e consistentes com o domínio do produto.
- Comente decisões não óbvias, não o funcionamento trivial do código.

## 9. Qualidade de interface

- Seguir `PRODUCT.md`, `DESIGN.md` e a documentação de redesign profissional.
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

Comandos de referência:

```bash
cd backend
npm test

cd ../frontend
npm test
npm run build
```

## 11. Estrutura de referência

```txt
backend/
  database/migrations/
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

Use as skills da pasta `.agents/skills` quando a tarefa envolver escopo, backend, segurança, banco, agendamento, frontend, documentação, deploy ou revisão antes de commit.

Para tarefas complexas, use os perfis de `.agents/subagents` como revisores especializados quando o ambiente permitir e houver autorização para delegação. O revisor deve produzir evidências e recomendações acionáveis, não apenas aprovação genérica.

Fluxo sugerido para mudanças de alto risco:

1. Backend Lead revisa arquitetura e compatibilidade.
2. Database Architect revisa dados, migrations e concorrência.
3. Security Engineer revisa ameaças e isolamento.
4. QA Tester define cenários e regressões.
5. Code Reviewer verifica qualidade e escopo final.
6. TCC Documenter registra decisões técnicas e acadêmicas relevantes.

## 13. Documentação e veracidade

- Manter README, `.env.example`, documentação de API, planos e guias operacionais sincronizados com o código.
- Diferenciar claramente estado atual, trabalho em andamento e roadmap.
- Não inventar funcionalidades, resultados de teste, integrações ou condições de produção.
- Registrar decisões relevantes de modo que sejam compreensíveis tanto por avaliadores do TCC quanto por futuros mantenedores do produto.
