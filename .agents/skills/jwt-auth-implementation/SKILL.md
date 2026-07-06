---
name: jwt-auth-implementation
description: Orienta implementação segura de cadastro, login, hash de senha, geração de JWT, middleware de autenticação e rota /me.
---

# Skill: Implementação de JWT e Autenticação

## Objetivo

Manter autenticação adequada para um produto em produção, com contratos claros, proteção contra abuso e possibilidade de evolução segura.

## Contratos atuais de referência

```txt
POST /api/auth/cadastro
POST /api/auth/login
GET /api/auth/me
```

Confirme as rotas existentes antes de implementar ou documentar mudanças.

## Regras de senha

- Usar bcrypt com custo apropriado e nunca salvar senha pura.
- Nunca retornar ou registrar hash de senha.
- Validar comprimento e requisitos definidos pelo produto.
- Evitar enumeração de contas por mensagens ou diferenças evidentes de resposta.
- Planejar migração segura se o algoritmo ou custo mudar.

## Regras de token e sessão

- Obter `JWT_SECRET` de variável de ambiente e validar sua presença na inicialização.
- Usar expiração explícita, algoritmo esperado e claims mínimas.
- Validar estritamente `Authorization: Bearer <token>`.
- Retornar 401 para ausência ou invalidade de autenticação e 403 para falta de autorização.
- Aplicar autorização e isolamento por negócio depois de autenticar.
- Não colocar dados sensíveis no payload do token.
- Avaliar revogação, renovação e armazenamento do token conforme o risco da mudança.

## Proteções operacionais

- Rate limit em cadastro e login.
- Validação e normalização de e-mail.
- Logs sem credenciais, tokens ou dados pessoais desnecessários.
- Respostas públicas sem stack trace.
- Testes de sucesso, credenciais inválidas, token expirado/malformado e acesso cruzado.

## Resposta esperada

1. Contratos e arquivos criados ou alterados.
2. Fluxos de cadastro, login e autenticação.
3. Decisões de segurança.
4. Testes executados e exemplos seguros de verificação.
5. Riscos e evoluções restantes.
