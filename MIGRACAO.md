# Histórico da migração MySQL para PostgreSQL

## Contexto

O Agendai nasceu com MySQL e backend hospedado na Railway. Essa arquitetura é
histórica. O código atual usa PostgreSQL no Supabase, acessado exclusivamente
pelo backend Express, e possui configuração de backend para o Render.

Os arquivos em `backend/database/migrations/` preservam a evolução acadêmica do
projeto e não devem ser aplicados ao PostgreSQL. As migrations ativas ficam em
`backend/database/postgres-migrations/`.

## Estado verificado no repositório

- O driver ativo é `pg` e as queries usam parâmetros posicionais PostgreSQL.
- `DATABASE_URL`, `DATABASE_SSL_MODE` e `DATABASE_SSL_CA` formam o contrato de
  conexão; hosts remotos usam TLS com validação de certificado e hostname.
- As migrations PostgreSQL 001 a 004 estão ordenadas e devem permanecer
  imutáveis depois de aplicadas.
- A migration 004 habilita RLS e remove privilégios da Data API para as tabelas
  da aplicação, sem criar políticas permissivas para acesso pelo navegador.
- `render.yaml` descreve o serviço do backend. Como o serviço usa `backend/`
  como raiz, `backend/package.json` (`engines`) é o contrato do Node no Render;
  a `.nvmrc` da raiz define a versão principal Node 24 para desenvolvimento e CI.
- O workflow de qualidade contém uma verificação das migrations em PostgreSQL
  descartável com credenciais exclusivas de CI.

## Estado externo não verificado

Este documento não comprova que migrations, RLS, revogações, deploy ou rotação
de credenciais já tenham sido executados no Supabase ou no Render. Nenhum
segredo ou dashboard de produção foi consultado para atualizar este registro.

Até existir um runner com histórico e checksums, aplicar as migrations em um
ambiente existente é uma ação deliberada do operador: faça backup, confirme o
estado do schema e não reaplique SQL cegamente. A criação de um login de runtime
dedicado, com privilégios mínimos, e a rotação da credencial administrativa
continuam como pendências operacionais separadas.

Nunca registre conexão, senha, chave de serviço ou certificado em commits,
documentação, logs, capturas de tela ou descrições de pull request.
