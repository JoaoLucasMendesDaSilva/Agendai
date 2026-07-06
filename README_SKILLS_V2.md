# Guia de Skills e Revisores do Agendai

Este diretório reúne instruções reutilizáveis e perfis de revisão para apoiar a evolução profissional do Agendai com segurança, consistência e boa documentação.

O nome do arquivo foi preservado por compatibilidade histórica. O conteúdo atual não representa mais um pacote voltado apenas à construção de um MVP.

## Estrutura

```txt
tcc-agendamento/
  AGENTS.md
  .agents/
    skills/
    subagents/
  backend/
  frontend/
  docs/
  plans/
```

## Skills disponíveis

### Planejamento e qualidade

- `tcc-scope-guard`: avalia valor, risco e tamanho das propostas sem usar o MVP como teto.
- `api-design-review`: revisa contratos e consistência da API.
- `pre-commit-checklist`: verifica qualidade, testes, segurança e documentação.
- `learning-review`: explica decisões e conceitos técnicos.

### Backend e autenticação

- `backend-express-feature`
- `jwt-auth-implementation`
- `integration-notifications`

### Banco e agendamento

- `mysql-data-modeling`
- `mysql-migration-generator`
- `scheduling-rules`

### Segurança

- `security-review`

### Frontend

- `frontend-mobile-first`
- `impeccable`

### Documentação e operação

- `tcc-documentation`
- `deployment-readiness`

## Revisores especializados

- `backend-lead`
- `security-engineer`
- `database-architect`
- `frontend-ux-reviewer`
- `qa-tester`
- `code-reviewer`
- `tcc-documenter`
- `teacher-mentor`

## Princípios de uso

- Escolha somente as skills relevantes para a tarefa atual.
- Use a análise de escopo para encontrar a menor entrega profissional completa, não para bloquear toda evolução além do MVP original.
- Exija evidências para afirmar que algo está pronto.
- Em mudanças críticas, combine revisão de arquitetura, dados, segurança e testes.
- Perfis de subagents são revisores especializados; seu uso depende de autorização e disponibilidade do ambiente.
- As instruções de `AGENTS.md` prevalecem como política geral do repositório.

## Exemplos

```txt
Use backend-express-feature, api-design-review e security-review para implementar esta rota. Antes de editar, analise o contrato atual, proponha critérios de aceite e liste os arquivos afetados.
```

```txt
Use tcc-scope-guard para avaliar valor, riscos, dependências e a menor entrega profissional desta funcionalidade. Não trate o MVP original como limite automático.
```

```txt
Use pre-commit-checklist para revisar as alterações atuais, executar as verificações aplicáveis e sugerir uma mensagem de commit baseada no diff real.
```

## Manutenção

As skills e os perfis devem acompanhar a fase real do produto. Quando arquitetura, operação ou prioridades mudarem, atualize estas instruções junto com a documentação relacionada para evitar orientações contraditórias.
