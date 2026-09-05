# PostgreSQL no Supabase

## Arquitetura atual

O backend Express acessa PostgreSQL no Supabase pelo driver `pg`. O frontend
não usa a Data API para consultar as tabelas da aplicação. Autenticação JWT,
autorização de recurso e isolamento por negócio continuam sendo
responsabilidades do backend em todas as queries e mutações.

As migrations MySQL em `backend/database/migrations/` são apenas histórico do
TCC. Não as execute no PostgreSQL. As migrations ativas ficam em
`backend/database/postgres-migrations/` e devem ser aplicadas nesta ordem:

1. `001_create_schema.sql`;
2. `002_add_business_branding.sql`;
3. `003_add_public_appointment_token.sql`;
4. `004_harden_supabase_data_boundary.sql`;
5. `005_add_privacy_governance.sql`;
6. `006_enforce_business_identity.sql`;
7. `007_enforce_appointment_tenant_relationships.sql`.

Os arquivos são imutáveis depois de aplicados. O runner aceita somente nomes
`NNN_nome_em_minusculas.sql`, exige sequência contínua desde 001 e rejeita
arquivos desconhecidos, lacunas e links simbólicos. Migrations e fixtures SQL
têm LF fixado por `.gitattributes`; o SHA-256 é calculado sobre os bytes exatos,
antes da leitura UTF-8.

O histórico fica em `public.schema_migrations`, com versão, nome, checksum e
data de aplicação. O runner valida sua estrutura e proteção antes de confiar
nos registros. No estado final, a tabela mantém RLS, nenhuma política e nenhum
privilégio para `PUBLIC` ou papéis disponíveis da Data API. Não presuma que o
runner, a tabela de histórico ou qualquer migration, inclusive a 006 ou a 007,
já exista em um projeto Supabase apenas porque está implementada e testada no
repositório.

## Conexão e TLS

O contrato de ambiente do backend é:

```env
DATABASE_URL=
DATABASE_SSL_MODE=verify-full
DATABASE_SSL_CA=
```

`DATABASE_URL` é secreta e não aceita parâmetros nem fragmentos. O modo
`verify-full` valida a autoridade emissora e a identidade do servidor. A CA
opcional deve ser configurada apenas quando a cadeia padrão do provedor exigir
um certificado confiável adicional.

`DATABASE_SSL_MODE=disable` existe somente para PostgreSQL local sem TLS. A
aplicação o rejeita em produção e para qualquer host diferente de `localhost`,
`127.0.0.1` ou `::1`. Se uma conexão remota falhar na validação, interrompa a
operação e revise a CA; nunca desabilite a validação do certificado.

Não registre conexão, usuário, senha, chave de serviço ou conteúdo de
certificado em documentação, commits, logs, capturas de tela ou descrições de
pull request.

## Limite da Data API

A migration 004:

- habilita RLS nas cinco tabelas da aplicação, sem `FORCE ROW LEVEL SECURITY`;
- não cria políticas de acesso para navegador;
- revoga privilégios de tabela, sequência e função de `PUBLIC` e, quando
  existirem, dos papéis `anon`, `authenticated` e `service_role`;
- preserva o acesso do proprietário atual usado pelo backend até que exista um
  login de runtime dedicado.

RLS é defesa em profundidade contra exposição acidental pela Data API. Ela não
substitui os predicados de tenant no Express e não transforma o frontend em
cliente direto do banco.

O login administrativo padrão do Supabase tem privilégios amplos e não deve
ser recomendado como credencial permanente da aplicação. Criar um login
dedicado, conceder somente os privilégios necessários, validar o comportamento
com RLS e rotacionar a credencial administrativa são atividades operacionais
posteriores; este repositório não afirma que foram concluídas.

## Identidade do negócio e migration 006

A migration `006_enforce_business_identity.sql` cria a constraint
`uk_negocios_usuario_id`, que garante no PostgreSQL no máximo um negócio por
empreendedor autenticado. O serviço trata colisões de `slug_publico` durante a
criação, e a renomeação altera o nome sem trocar esse slug, preservando links
públicos já compartilhados.

A 006 exige zero proprietários duplicados. Depois de confirmar o alvo, faça
backup restaurável e execute a seguinte consulta agregada somente leitura:

```sql
SELECT COUNT(*) AS grupos_de_proprietarios_duplicados
FROM (
  SELECT usuario_id
  FROM public.negocios
  GROUP BY usuario_id
  HAVING COUNT(*) > 1
) AS grupos_duplicados;
```

A saída contém somente a quantidade de grupos, sem expor `usuario_id`, negócios
ou linhas pessoais, e deve ser `0`. Se for maior, pare: a resolução exige
análise humana e backup confirmado. Nunca selecione, exclua ou mescle
automaticamente um negócio vencedor. A migration recusa duplicidades e não faz
reparo de dados.

## Relacionamentos de tenant e migration 007

A migration `007_enforce_appointment_tenant_relationships.sql` exige que
`agendamentos.negocio_id` coincida com `servicos.negocio_id` e
`profissionais.negocio_id` e continue referenciando `negocios.id`.
As constraints `fk_agendamentos_servico_negocio` e
`fk_agendamentos_profissional_negocio` tornam esse invariante durável no banco.
Elas são defesa em profundidade: autorização e filtros de tenant continuam
obrigatórios em todas as queries do Express.

Antes do apply, confirme um backup restaurável e execute a consulta agregada
somente leitura:

```sql
SELECT
  COUNT(*) FILTER (
    WHERE servico.id IS NULL
       OR servico.negocio_id IS DISTINCT FROM agendamento.negocio_id
  ) AS relacionamentos_servico_inconsistentes,
  COUNT(*) FILTER (
    WHERE profissional.id IS NULL
       OR profissional.negocio_id IS DISTINCT FROM agendamento.negocio_id
  ) AS relacionamentos_profissional_inconsistentes
FROM public.agendamentos AS agendamento
LEFT JOIN public.servicos AS servico
  ON servico.id = agendamento.servico_id
LEFT JOIN public.profissionais AS profissional
  ON profissional.id = agendamento.profissional_id;
```

Ambos os resultados precisam ser `0`. A saída e o guard da migration contêm
somente contagens. Se houver inconsistência, pare, preserve os dados e faça
investigação humana autorizada com o backup confirmado; não reatribua nem
exclua linhas automaticamente. A migration recusa o apply e não corrige dados.

## Runner, aplicação e baseline

O runner usa uma única conexão e transação. Depois de `BEGIN`, adquire um
advisory lock transacional, confirma a identidade do banco, valida histórico ou
baseline, aplica o sufixo pendente e registra os checksums antes de `COMMIT`.
Ele não é chamado pelo start do Express, pelo build nem pelo Render; a aplicação
é uma etapa de release explícita.

O executor exige PostgreSQL 15 ou superior. O workflow autoritativo usa a
versão 17 descartável; compatibilidade com versões anteriores à 15 não é
declarada.

Antes de qualquer apply, confirme backup restaurável, procedimento de
recuperação, janela de manutenção e nome do banco. Em banco novo e vazio:

```bash
cd backend
npm run db:migrate -- --confirm-database=<nome-exato-do-banco>
```

A confirmação precisa ser idêntica ao resultado de `current_database()`. Sem
histórico, qualquer objeto conhecido faz a execução normal recusar o alvo. Para
um ambiente existente, primeiro inspecione schema, constraints, índices,
triggers, RLS, políticas, privilégios e proprietários em modo somente leitura.
As tabelas, sequências, função e eventual histórico oficiais precisam pertencer
ao `current_user` da conexão; proprietário diferente é uma condição de parada.
Depois, somente se houver um prefixo contínuo e estruturalmente compatível,
execute:

```bash
npm run db:migrate -- --baseline-existing --confirm-database=<nome-exato-do-banco>
```

O baseline grava os checksums dos arquivos atuais e aplica o sufixo pendente na
mesma transação e sob o mesmo lock. Estado parcial ou fora de ordem, definição
incompatível, linha de histórico desconhecida ou checksum divergente causa
recusa sem reparo. Preserve a evidência; não edite migration aplicada nem a
tabela de histórico.

## Rollback e resultado de commit desconhecido

Em falhas conhecidas antes do commit, o runner tenta executar rollback de todo
DDL, baseline e histórico produzidos naquela execução. Se o rollback não puder
ser confirmado, ele retorna resultado desconhecido e a execução não deve ser
repetida automaticamente. O runner não implementa down migrations e não desfaz
uma execução já confirmada.

Se houver erro ou perda de conexão durante `COMMIT`, o resultado pode ter sido
confirmado pelo PostgreSQL mesmo sem resposta ao cliente. Não repita o comando
automaticamente. Preserve os logs sanitizados e faça inspeção somente leitura
de `schema_migrations` e do catálogo. Restaure o backup ou faça um reparo apenas
por um plano separado e revisado.

## Integração PostgreSQL destrutiva

`npm run test:integration` só pode abrir conexão quando todos estes controles
forem satisfeitos:

- `RUN_POSTGRES_INTEGRATION=1` e `NODE_ENV` diferente de `production`;
- `DATABASE_TEST_URL` local, sem parâmetros ou fragmento;
- host da URL em loopback e endereço observado também em loopback; somente o
  serviço descartável do GitHub Actions pode reportar endereço privado interno
  RFC 1918/IPv6 ULA quando `CI=true` e `GITHUB_ACTIONS=true`;
- nome do banco contendo o token isolado `test`;
- `CONFIRM_POSTGRES_TEST_DB` idêntico ao banco da URL e ao banco conectado;
- usuário conectado idêntico ao usuário da URL.

O cenário opcional que cria papéis globais exige também
`RUN_POSTGRES_ROLE_FIXTURES=1` e só é permitido no serviço descartável do
GitHub Actions. Sem o aceite principal, os testes são ignorados sem abrir
socket; se a execução foi solicitada e um guard falhar, a suíte falha fechado.

O job `postgres-integration` usa somente PostgreSQL 17 e credenciais
descartáveis de CI. Ele verifica banco novo, repetição, checksums, rollback,
lock concorrente, baseline, os catálogos de segurança, a identidade única de
negócio e os relacionamentos de tenant dos agendamentos. Não execute essa suíte
contra desenvolvimento compartilhado, staging, Supabase ou produção.
Repositório e CI verdes comprovam o comportamento no serviço descartável, não
que a migration 006 ou a 007 esteja aplicada no Supabase ou em produção.

Os campos de agendamento usam `TIMESTAMP` sem fuso para preservar o horário
local do negócio. Campos de auditoria usam `TIMESTAMPTZ`, uma constraint de
exclusão impede sobreposição de reservas ativas do mesmo profissional e as
constraints compostas impedem vínculos de agendamento entre negócios.
