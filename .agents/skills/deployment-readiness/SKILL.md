---
name: deployment-readiness
description: Revisa a prontidão operacional do frontend e backend do Agendai para deploy e produção em Vercel e Railway, com foco em segurança, confiabilidade e recuperação.
---

# Skill: Prontidão para Deploy e Produção

## Objetivo

Verificar se uma versão pode ser implantada e operada com risco conhecido, sem expor segredos nem depender de configuração local implícita.

## Backend

- `PORT`, banco, JWT, CORS, proxy e demais configurações vêm do ambiente.
- Variáveis obrigatórias são validadas na inicialização.
- `.env.example` está completo e sem valores reais.
- CORS permite somente origens esperadas por ambiente.
- Logs são úteis, estruturados quando viável e não expõem dados sensíveis.
- Erros públicos são sanitizados.
- Scripts de produção e versão suportada do Node estão definidos.
- Health check, encerramento gracioso e limites de upload são avaliados.

## Frontend

- URL da API e demais configurações públicas estão corretas por ambiente.
- Build de produção funciona sem depender do estado local.
- Nenhum segredo é incorporado ao bundle.
- Rotas SPA, PWA e cache do service worker foram verificados.
- Fluxos críticos funcionam em mobile e desktop.

## Banco

- Migrations são incrementais, documentadas e testadas.
- Há plano de backup, validação e recuperação proporcional ao risco.
- Conexões usam TLS quando exigido e limites adequados ao provedor.
- O deploy considera compatibilidade entre schema, backend e frontend.

## Operação

- Executar testes e smoke test do ambiente implantado.
- Verificar logs, métricas e procedimento de rollback.
- Documentar domínios, variáveis e dependências externas.
- Não declarar prontidão quando uma verificação crítica não puder ser realizada.

## Resposta esperada

1. Veredito de prontidão com evidências.
2. Bloqueadores e riscos por prioridade.
3. Ajustes necessários.
4. Plano de deploy, smoke test e rollback.
5. Pendências operacionais.
