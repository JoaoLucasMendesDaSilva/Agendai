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
4. `004_harden_supabase_data_boundary.sql`.

Os arquivos são imutáveis depois de aplicados. Enquanto não houver um runner
com histórico e checksums, uma mudança em ambiente existente exige backup,
levantamento prévio do schema e decisão explícita do operador. Não presuma que
a migration 004 já foi executada em nenhum projeto Supabase.

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

## Aplicação e verificação

Em banco novo e vazio, execute cada migration com parada no primeiro erro e uma
transação por arquivo. A migration 004 também é exercitada no job
`postgres-security-boundary`, tanto sem os papéis Supabase quanto com papéis e
privilégios de teste deliberadamente concedidos.

Antes de operar em banco existente:

1. confirme backup e procedimento de recuperação;
2. identifique quais migrations já foram aplicadas;
3. inspecione políticas e privilégios existentes e interrompa se a finalidade
   deles não puder ser estabelecida;
4. aplique apenas o próximo arquivo esperado;
5. valide RLS, ausência de políticas permissivas, revogações, constraints e um
   fluxo real do backend.

O CI usa somente bancos e credenciais descartáveis. Não execute testes
destrutivos contra desenvolvimento compartilhado, staging ou produção.

Os campos de agendamento usam `TIMESTAMP` sem fuso para preservar o horário
local do negócio. Campos de auditoria usam `TIMESTAMPTZ`, e uma constraint de
exclusão impede sobreposição de reservas ativas do mesmo profissional.
