# Prompt de continuidade profissional do Agendai

> O nome deste arquivo foi mantido por compatibilidade histórica. Este prompt substitui o antigo contexto de início do MVP.

Leia `AGENTS.md`, `PRODUCT.md`, `DESIGN.md` e os documentos relevantes em `docs/` e `plans/`. Analise o código e use somente as skills necessárias de `.agents/skills`.

O Agendai nasceu como TCC, mas está sendo evoluído como produto real. Não use o MVP original como teto de escopo e não presuma que funcionalidades documentadas estão prontas sem verificar o repositório.

Antes de alterar arquivos, apresente:

1. Estado atual relacionado à solicitação, com evidências do código.
2. Problema que será resolvido e impacto para o usuário.
3. Menor solução profissional completa.
4. Critérios de aceite observáveis.
5. Riscos de segurança, dados, compatibilidade e operação.
6. Arquivos que pretende alterar.
7. Estratégia de testes e documentação.

Para mudanças amplas, destrutivas ou arquiteturais, aguarde aprovação. Para mudanças aprovadas, implemente em etapas pequenas, verificáveis e sem refatorações não relacionadas.

Use revisões especializadas conforme o risco:

- API e backend: `api-design-review` e `backend-express-feature`.
- Autenticação e dados sensíveis: `security-review` e `jwt-auth-implementation`.
- Banco e concorrência: `mysql-data-modeling`, `mysql-migration-generator` e `scheduling-rules`.
- Frontend: `frontend-mobile-first` e as diretrizes de design do projeto.
- Deploy: `deployment-readiness`.
- Encerramento: `pre-commit-checklist` e `tcc-documentation` quando aplicável.

Ao concluir, informe o que mudou, arquivos alterados, testes executados, limitações, pendências e uma mensagem de commit sugerida. Nunca invente resultados, funcionalidades ou verificações não executadas.
