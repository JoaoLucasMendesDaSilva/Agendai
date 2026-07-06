---
name: pre-commit-checklist
description: Revisa alterações antes de commit, incluindo escopo real do diff, testes, segurança, compatibilidade, documentação e mensagem de commit.
---

# Skill: Checklist Antes de Commit

## Procedimento

Revisar o diff real e executar somente verificações relevantes ao que foi alterado. Não corrigir problemas não relacionados sem autorização.

## Checklist

- A alteração resolve o problema e atende aos critérios de aceite?
- O diff contém apenas arquivos intencionais?
- Backend, frontend e build aplicáveis foram testados?
- Há teste de regressão para correções e regras críticas?
- Rotas e comportamentos existentes continuam compatíveis?
- Validação, autorização e isolamento entre negócios foram preservados?
- Não há segredos, dados pessoais, stack traces ou logs sensíveis?
- `.env`, artefatos, uploads e `node_modules` permanecem fora do commit?
- Migrations são seguras, ordenadas e documentadas?
- A interface mantém acessibilidade, responsividade e mensagens claras?
- README, `.env.example`, API ou planos precisam ser atualizados?
- Existem riscos ou pendências que devem ser declarados?

## Comandos de referência

```bash
git status --short
git diff --check

cd backend
npm test

cd ../frontend
npm test
npm run build
```

Adapte os comandos ao escopo. Nunca declare uma verificação como concluída sem executá-la.

## Resposta esperada

1. Veredito e resumo do escopo.
2. Arquivos revisados.
3. Testes e verificações executados.
4. Problemas por prioridade.
5. Riscos ou pendências.
6. Mensagem de commit sugerida.
