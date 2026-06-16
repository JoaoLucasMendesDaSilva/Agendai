# Sistema de Agendamento Online

MVP de um sistema web de agendamento online para pequenos negocios de servicos, desenvolvido como Trabalho de Conclusao de Curso.

O objetivo do projeto e permitir que um empreendedor cadastre seu negocio, seus servicos, seus profissionais e receba agendamentos publicos de clientes sem que o cliente precise criar conta.

## Tecnologias usadas

- Frontend: React com Vite
- Backend: Node.js com Express
- Banco de dados: MySQL
- Autenticacao: JWT
- Hash de senha: bcrypt
- Seguranca HTTP: Helmet, CORS e rate limit
- Conexao MySQL: mysql2/promise

## Status atual

Backend implementado:

- Rota de saude da API.
- Conexao com MySQL.
- Autenticacao de empreendedor com cadastro, login e rota `/me`.
- Cadastro e edicao do negocio do empreendedor.
- CRUD de servicos com soft delete.
- CRUD de profissionais com soft delete.
- Rotas publicas para consultar negocio, servicos, profissionais e horarios disponiveis.
- Criacao publica de agendamento com validacao de horario, bloqueio de conflito e transacao.
- Rotas privadas para o empreendedor listar, consultar, alterar status e cancelar agendamentos.

Frontend atual:

- Base React/Vite criada.
- Tela inicial simples informando que o sistema esta em desenvolvimento.
- Interface completa do MVP ainda sera implementada em etapa futura.

Ainda nao implementado:

- Frontend completo.
- Notificacoes por e-mail ou WhatsApp.
- Deploy em producao.
- Pagamentos, assinaturas, marketplace e relatorios avancados.

## Seguranca aplicada

- Senhas sao armazenadas com bcrypt.
- Tokens JWT usam `JWT_SECRET` vindo do `.env`.
- `.env` esta no `.gitignore` e nao deve ser versionado.
- Queries usam parametros com `mysql2/promise`.
- Rotas privadas usam middleware de autenticacao.
- Dados privados sao filtrados por `usuario_id` e/ou `negocio_id`.
- `senha_hash` nao e retornado nas respostas.
- Servicos e profissionais usam soft delete com `ativo = false`.
- Criacao de agendamento valida servico, profissional, horario, conflito e status.
- Erros internos nao retornam stack trace para o usuario final.
- Helmet, CORS e rate limit estao configurados no backend.

## Configurar variaveis de ambiente

Copie o arquivo `.env.example` para `.env` na raiz do projeto:

```bash
copy .env.example .env
```

No Windows PowerShell, tambem pode usar:

```powershell
Copy-Item .env.example .env
```

Preencha as variaveis:

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=troque_este_valor_por_um_segredo_seguro
JWT_EXPIRES_IN=1d

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tcc_agendamento

VITE_API_URL=http://localhost:3001
```

Importante: nao coloque o `.env` no Git.

## Criar banco de dados

O script SQL inicial fica em:

```txt
backend/database/migrations/001_create_schema.sql
```

Como executar no MySQL Workbench:

1. Abra o MySQL Workbench.
2. Conecte no servidor MySQL local.
3. Va em `File > Open SQL Script`.
4. Selecione `backend/database/migrations/001_create_schema.sql`.
5. Execute o script inteiro.
6. Atualize a lista de schemas e confirme que `tcc_agendamento` foi criado.

Para verificar:

```sql
USE tcc_agendamento;
SHOW TABLES;
```

## Rodar o backend

```bash
cd backend
npm install
npm run dev
```

Por padrao, o backend usa:

```txt
http://localhost:3001
```

Testes rapidos:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/db-health
```

Observacao: `/api/db-health` e publico apenas para desenvolvimento. Antes de deploy, avalie proteger, limitar ou remover essa rota.

## Rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

Por padrao, o frontend usa:

```txt
http://localhost:5173
```

## Rotas publicas

Saude e autenticacao:

```txt
GET  /api/health
GET  /api/db-health
POST /api/auth/cadastro
POST /api/auth/login
```

Consulta publica e agendamento:

```txt
GET  /api/publico/negocio/:slugOuId
GET  /api/publico/negocio/:slugOuId/servicos
GET  /api/publico/negocio/:slugOuId/profissionais
GET  /api/publico/negocio/:slugOuId/horarios-disponiveis
POST /api/publico/negocio/:slugOuId/agendamentos
```

## Rotas privadas

Todas as rotas abaixo exigem:

```txt
Authorization: Bearer <token>
```

Usuario autenticado:

```txt
GET /api/auth/me
```

Negocio:

```txt
GET  /api/negocio
POST /api/negocio
PUT  /api/negocio/:id
```

Servicos:

```txt
GET    /api/servicos
POST   /api/servicos
GET    /api/servicos/:id
PUT    /api/servicos/:id
DELETE /api/servicos/:id
```

Profissionais:

```txt
GET    /api/profissionais
POST   /api/profissionais
GET    /api/profissionais/:id
PUT    /api/profissionais/:id
DELETE /api/profissionais/:id
```

Agendamentos:

```txt
GET    /api/agendamentos
GET    /api/agendamentos/hoje
GET    /api/agendamentos/:id
PUT    /api/agendamentos/:id/status
DELETE /api/agendamentos/:id
```

## Observacoes importantes

- `.env` nao deve ser versionado.
- `node_modules/` nao deve ir para o Git.
- `frontend/dist/` e outros arquivos de build nao devem ir para o Git.
- O timezone considerado no MVP e o horario local do servidor, planejado para America/Sao_Paulo.
- O endpoint `/api/db-health` e util no desenvolvimento, mas deve ser revisto antes de producao.
- Notificacoes por e-mail/WhatsApp ainda sao etapas futuras.
- O frontend completo ainda sera implementado.

## Status academico do MVP

O backend atual ja cobre as principais regras do MVP do TCC: autenticacao do empreendedor, cadastro do negocio, gerenciamento de servicos e profissionais, consulta publica de disponibilidade e criacao de agendamentos com bloqueio de conflito. A proxima etapa natural e implementar o frontend para consumir essas rotas de forma simples e mobile-first.
