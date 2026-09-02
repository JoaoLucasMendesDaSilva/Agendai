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
- As migrations PostgreSQL 001 a 006 estão ordenadas e devem permanecer
  imutáveis depois de aplicadas.
- A migration 004 habilita RLS e remove privilégios da Data API para as tabelas
  da aplicação, sem criar políticas permissivas para acesso pelo navegador.
- A migration 005 adiciona os controles de governança e retenção de dados.
- A migration 006 adiciona `UNIQUE (usuario_id)` em `negocios`: cada
  empreendedor autenticado pode possuir no máximo um negócio. A aplicação
  resolve colisões de `slug_publico` durante a criação e preserva o slug quando
  o negócio é renomeado.
- A CLI `npm run db:migrate` descobre somente nomes
  `NNN_nome_em_minusculas.sql`, exige sequência contínua desde 001 e calcula
  SHA-256 sobre os bytes exatos. Regras de `.gitattributes` mantêm migrations e
  fixtures SQL em LF para que os checksums sejam portáveis.
- `public.schema_migrations` registra versão, nome, checksum e data. O runner
  valida o formato e a proteção dessa tabela antes de confiar no histórico.
- Cada execução usa uma única conexão e transação, um advisory lock e
  confirmação exata de `current_database()` antes de baseline ou apply.
- O executor recusa PostgreSQL anterior à versão 15; a integração autoritativa
  do repositório usa PostgreSQL 17.
- `render.yaml` descreve o serviço do backend. Como o serviço usa `backend/`
  como raiz, `backend/package.json` (`engines`) é o contrato do Node no Render;
  a `.nvmrc` da raiz define a versão principal Node 24 para desenvolvimento e CI.
- O workflow de qualidade executa unitários e integração serializada em
  PostgreSQL 17 descartável. Ele cobre banco vazio, repetição, drift, rollback,
  concorrência, baseline, garantias de RLS/revogação e a identidade única de
  negócio, além dos audits full-tree do plano 020.

## Estado externo não verificado

Este documento, o repositório e um CI verde não comprovam que migrations —
inclusive a 006 —, RLS, revogações, deploy ou rotação de credenciais já tenham
sido executados no Supabase, no Render ou em produção. Nenhum segredo ou
dashboard de produção foi consultado para atualizar este registro.

## Pré-requisito da migration 006

A migration `006_enforce_business_identity.sql` só pode ser aplicada quando não
existir proprietário associado a mais de um negócio. Depois de confirmar o
banco correto, execute esta consulta agregada somente leitura:

```sql
SELECT COUNT(*) AS grupos_de_proprietarios_duplicados
FROM (
  SELECT usuario_id
  FROM public.negocios
  GROUP BY usuario_id
  HAVING COUNT(*) > 1
) AS grupos_duplicados;
```

O resultado expõe apenas a quantidade de grupos duplicados, sem listar
`usuario_id`, negócios ou dados pessoais. O valor precisa ser `0`. Antes da
migration, é obrigatório ter backup restaurável e procedimento de recuperação
confirmado. Se o resultado for maior que zero, não execute a 006: preserve os
dados e resolva cada caso manualmente com a pessoa responsável pelo negócio.
Nunca selecione, exclua ou mescle automaticamente um registro vencedor. A
migration também faz essa verificação e recusa o apply em caso de duplicidade;
ela não corrige dados.

## Aplicação e baseline

Toda execução que possa aplicar SQL exige o nome exato do banco:

```bash
cd backend
npm run db:migrate -- --confirm-database=<nome-exato-do-banco>
```

O comando recusa por padrão objetos do Agendai existentes sem histórico. Antes
de baseline, faça backup verificável, defina uma janela de manutenção e
inspecione o catálogo em modo somente leitura. Somente um prefixo contínuo e
estruturalmente compatível pode ser confirmado:

```bash
npm run db:migrate -- --baseline-existing --confirm-database=<nome-exato-do-banco>
```

Baseline, migrations pendentes e registros de histórico entram na mesma
transação protegida por lock. Definição parcial, ordem ambígua, histórico
desconhecido ou checksum divergente interrompem a operação. Não edite SQL já
aplicado nem altere `schema_migrations` para aceitar drift.

## Rollback e recuperação

Em um erro conhecido antes da conclusão do commit, o runner tenta desfazer DDL e
histórico da execução. Isso não é uma down migration. Se o `ROLLBACK` não puder
ser confirmado, se o `COMMIT` falhar ou se a conexão cair nesses momentos, o
resultado é desconhecido: não repita automaticamente. Preserve logs sanitizados
e confira `schema_migrations` e o catálogo em modo somente leitura antes de
escolher restauração de backup ou um plano de reparo revisado.

Os testes destrutivos exigem `RUN_POSTGRES_INTEGRATION=1`, ambiente não
produtivo, URL loopback sem parâmetros, banco com token isolado `test` e
confirmação idêntica ao nome real. O cenário que cria papéis globais também
exige `RUN_POSTGRES_ROLE_FIXTURES=1` e só é permitido no serviço descartável do
GitHub Actions. Sem o primeiro aceite a suíte não abre socket; uma tentativa
explicitamente solicitada com guard inválido falha. Esse serviço pode reportar
somente endereço privado interno RFC 1918/IPv6 ULA quando `CI` e
`GITHUB_ACTIONS` forem exatos.

A criação de um login de runtime dedicado, com privilégios mínimos, e a rotação
da credencial administrativa continuam como pendências operacionais separadas.

Nunca registre conexão, senha, chave de serviço ou certificado em commits,
documentação, logs, capturas de tela ou descrições de pull request.
