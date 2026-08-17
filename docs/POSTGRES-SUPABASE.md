# PostgreSQL no Supabase

O backend usa PostgreSQL por meio da variável `DATABASE_URL`. As migrations MySQL históricas continuam em `backend/database/migrations/`; para um banco Supabase vazio, use exclusivamente os arquivos em `backend/database/postgres-migrations/`, nesta ordem:

1. `001_create_schema.sql`
2. `002_add_business_branding.sql`
3. `003_add_public_appointment_token.sql`

No painel do Supabase, abra o **SQL Editor**, execute cada arquivo separadamente e confirme que as cinco tabelas existem: `usuarios`, `negocios`, `servicos`, `profissionais` e `agendamentos`.

Depois, no arquivo `.env` na raiz, informe a URI do Supabase sem versioná-la:

```env
DATABASE_URL=postgresql://postgres:SUA_SENHA@db.SEUPROJETO.supabase.co:5432/postgres
```

As migrations usam `TIMESTAMP` sem fuso em agendamentos para preservar os horários locais do negócio. Os campos de auditoria usam `TIMESTAMPTZ` e são atualizados por trigger. Uma restrição de exclusão impede que duas reservas ativas do mesmo profissional ocupem intervalos sobrepostos, mesmo em requisições simultâneas.

Não execute as migrations MySQL no Supabase. Para um banco que já contenha dados MySQL, é necessária uma exportação/importação de dados separada; este procedimento foi preparado para um banco Supabase vazio.
