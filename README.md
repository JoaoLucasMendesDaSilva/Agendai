# Sistema de Agendamento Online

MVP de um sistema web de agendamento online para pequenos negocios de servicos, desenvolvido como Trabalho de Conclusao de Curso.

O sistema permite que um empreendedor cadastre seu negocio, seus servicos e seus profissionais, divulgue um link publico de agendamento e acompanhe os agendamentos recebidos em um painel privado.

## Visao geral do sistema

O projeto foi pensado para pequenos empreendedores que ainda organizam atendimentos por caderno, ligacoes ou mensagens. A proposta do MVP e centralizar o cadastro do negocio e permitir que clientes escolham servico, profissional, data e horario sem precisar criar conta.

O backend fornece a API REST, autenticacao, validacoes e regras de agendamento. O frontend consome essa API com telas simples, mobile-first e sem bibliotecas visuais pesadas.

## Funcionalidades implementadas

- Cadastro e login do empreendedor.
- Validacao de sessao com JWT.
- Dashboard privado do empreendedor.
- Cadastro e edicao do negocio.
- Gerenciamento de servicos com soft delete.
- Gerenciamento de profissionais com soft delete.
- Consulta publica de negocio por `slug_publico` ou `id`.
- Consulta publica de servicos e profissionais ativos.
- Consulta de horarios disponiveis.
- Criacao publica de agendamento sem cadastro do cliente.
- Bloqueio de conflito de horario.
- Agenda privada do empreendedor.
- Filtro de agendamentos de hoje.
- Alteracao de status do agendamento.
- Cancelamento de agendamento sem exclusao fisica.

## Fluxo do empreendedor

1. Acessar o frontend.
2. Criar conta em `/cadastro`.
3. Fazer login em `/login`.
4. Acessar o dashboard em `/dashboard`.
5. Cadastrar ou editar o negocio em `/negocio`.
6. Cadastrar servicos em `/servicos`.
7. Cadastrar profissionais em `/profissionais`.
8. Divulgar o link publico `/agendar/:slugOuId`.
9. Acompanhar os agendamentos em `/agenda`.
10. Alterar status ou cancelar agendamentos quando necessario.

## Fluxo do cliente

1. Acessar o link publico `/agendar/:slugOuId`.
2. Visualizar dados do negocio.
3. Escolher um servico.
4. Escolher um profissional.
5. Escolher uma data.
6. Escolher um horario disponivel.
7. Informar nome e telefone.
8. Opcionalmente informar e-mail e observacoes.
9. Confirmar o agendamento.

O cliente nao precisa criar conta e nao informa senha.

## Tecnologias utilizadas

- Frontend: React com Vite.
- Backend: Node.js com Express.
- Banco de dados: MySQL.
- Conexao MySQL: mysql2/promise.
- Autenticacao: JWT.
- Hash de senha: bcrypt.
- Seguranca HTTP: Helmet, CORS e express-rate-limit.
- Variaveis de ambiente: dotenv.

## Estrutura do projeto

```txt
tcc-agendamento/
  backend/
    database/
      migrations/
        001_create_schema.sql
    src/
      config/
      controllers/
      middlewares/
      routes/
      services/
      app.js
      server.js
    package.json
  frontend/
    src/
      components/
      contexts/
      pages/
      services/
      App.jsx
      main.jsx
      styles.css
    .env.example
    package.json
  .env.example
  .gitignore
  README.md
```

## Configuracao do backend

1. Entre na pasta do backend:

```bash
cd backend
```

2. Instale as dependencias:

```bash
npm install
```

3. Configure o `.env` na raiz do projeto, usando `.env.example` como base.

4. Execute em desenvolvimento:

```bash
npm run dev
```

5. Para execucao sem watch:

```bash
npm start
```

Por padrao, a API roda em:

```txt
http://localhost:3001
```

## Configuracao do frontend

1. Entre na pasta do frontend:

```bash
cd frontend
```

2. Instale as dependencias:

```bash
npm install
```

3. Configure `frontend/.env`, se necessario, usando `frontend/.env.example` como base:

```env
VITE_API_URL=http://localhost:3001
```

4. Execute em desenvolvimento:

```bash
npm run dev
```

Por padrao, o frontend roda em:

```txt
http://localhost:5173
```

## Configuracao do banco de dados

O script SQL inicial fica em:

```txt
backend/database/migrations/001_create_schema.sql
```

Como executar no MySQL Workbench:

1. Abra o MySQL Workbench.
2. Conecte no servidor MySQL.
3. Va em `File > Open SQL Script`.
4. Selecione `backend/database/migrations/001_create_schema.sql`.
5. Execute o script inteiro.
6. Atualize a lista de schemas.
7. Confirme que o banco `tcc_agendamento` foi criado.

Para verificar:

```sql
USE tcc_agendamento;
SHOW TABLES;
```

## Variaveis de ambiente

Copie `.env.example` para `.env` na raiz do projeto:

```powershell
Copy-Item .env.example .env
```

Variaveis esperadas:

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

Importante:

- `.env` nao deve ser versionado.
- Use um `JWT_SECRET` forte fora do ambiente de desenvolvimento.
- Nao coloque senhas reais em `.env.example`.

## Como executar localmente

1. Crie o banco com o script SQL.
2. Configure o `.env` da raiz.
3. Inicie o backend:

```bash
cd backend
npm install
npm run dev
```

4. Em outro terminal, inicie o frontend:

```bash
cd frontend
npm install
npm run dev
```

5. Acesse:

```txt
http://localhost:5173
```

Testes rapidos da API:

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/db-health
```

Observacao: `/api/db-health` e publico apenas para desenvolvimento. Antes de producao, avalie proteger, limitar ou remover essa rota.

## Como testar o fluxo completo

1. Acesse `/cadastro` e crie uma conta de empreendedor.
2. Acesse `/login` e entre com a conta criada.
3. No dashboard, acesse `Meu negocio`.
4. Cadastre nome, horarios e dias de funcionamento.
5. Acesse `Servicos` e crie pelo menos um servico ativo.
6. Acesse `Profissionais` e crie pelo menos um profissional ativo.
7. Use o `slug_publico` do negocio para abrir:

```txt
http://localhost:5173/agendar/:slugOuId
```

8. No fluxo publico, escolha servico, profissional, data e horario.
9. Informe nome e telefone do cliente.
10. Confirme o agendamento.
11. Volte ao painel privado e acesse `Agenda`.
12. Confira o agendamento criado.
13. Altere o status para `concluido`, se desejar.
14. Teste o cancelamento usando o botao `Cancelar`.

Tambem e recomendado testar:

- Login com senha incorreta.
- Acesso a `/dashboard` sem token.
- Criar servico sem negocio cadastrado.
- Agendar duas vezes o mesmo horario.
- Usar data passada no agendamento publico.
- Desativar servico ou profissional e confirmar que nao aparece no fluxo publico.

## Rotas principais da API

Rotas publicas:

```txt
GET  /api/health
GET  /api/db-health
POST /api/auth/cadastro
POST /api/auth/login

GET  /api/publico/negocio/:slugOuId
GET  /api/publico/negocio/:slugOuId/servicos
GET  /api/publico/negocio/:slugOuId/profissionais
GET  /api/publico/negocio/:slugOuId/horarios-disponiveis
POST /api/publico/negocio/:slugOuId/agendamentos
```

Rotas privadas:

```txt
GET /api/auth/me

GET  /api/negocio
POST /api/negocio
PUT  /api/negocio/:id

GET    /api/servicos
POST   /api/servicos
GET    /api/servicos/:id
PUT    /api/servicos/:id
DELETE /api/servicos/:id

GET    /api/profissionais
POST   /api/profissionais
GET    /api/profissionais/:id
PUT    /api/profissionais/:id
DELETE /api/profissionais/:id

GET    /api/agendamentos
GET    /api/agendamentos/hoje
GET    /api/agendamentos/:id
PUT    /api/agendamentos/:id/status
DELETE /api/agendamentos/:id
```

As rotas privadas exigem:

```txt
Authorization: Bearer <token>
```

## Seguranca aplicada

- Senhas armazenadas com bcrypt.
- Cadastro nao retorna token automaticamente.
- Login gera JWT.
- `JWT_SECRET` vem de variavel de ambiente.
- `.env` esta no `.gitignore`.
- `senha_hash` nunca e retornado.
- Rotas privadas usam middleware de autenticacao.
- Usuario autenticado e carregado do banco antes de acessar rotas privadas.
- Queries usam parametros com `mysql2/promise`.
- Dados privados sao filtrados por `usuario_id` e/ou `negocio_id`.
- Servicos e profissionais usam soft delete com `ativo = false`.
- Criacao publica de agendamento valida servico, profissional, data, horario e conflito.
- Agendamento publico usa transacao.
- Erros internos nao retornam stack trace para o usuario final.
- Helmet, CORS e rate limit estao configurados.
- Frontend nao armazena segredos de API.

## Limitacoes atuais do MVP

- Nao ha FullCalendar; a agenda privada usa lista simples.
- Nao ha notificacoes por e-mail ou WhatsApp.
- Nao ha pagamentos, assinaturas ou marketplace.
- Nao ha relatorios avancados.
- Nao ha testes automatizados implementados.
- Token JWT fica no `localStorage`, aceitavel para MVP, mas deve ser revisado em producao.
- Timezone usa o horario local do servidor, planejado para America/Sao_Paulo.
- `/api/db-health` esta publico para desenvolvimento e deve ser revisto antes de deploy.
- A protecao contra concorrencia em agendamentos e suficiente para o MVP, mas pode ser reforcada em producao.

## Proximas evolucoes

- Melhorar a agenda com calendario visual.
- Implementar notificacoes simuladas ou reais.
- Criar testes automatizados de backend e frontend.
- Melhorar experiencia visual e acessibilidade.
- Preparar deploy do frontend na Vercel.
- Preparar deploy do backend em Render ou Railway.
- Configurar banco em ambiente hospedado.
- Adicionar logs e monitoramento de producao.
- Proteger ou remover `/api/db-health` em producao.
- Revisar estrategia de armazenamento do token no frontend.

## Status atual do projeto

O MVP esta implementado localmente com backend, banco de dados e frontend funcional.

Estado atual:

- Backend funcional com API REST.
- Frontend funcional com telas privadas e fluxo publico.
- Banco MySQL modelado por script SQL.
- Autenticacao JWT implementada.
- Regras principais de agendamento implementadas.
- Build do frontend validado.
- Audits de dependencias sem vulnerabilidades altas na ultima revisao.
- Projeto ainda nao esta em producao.

Este estado atende ao objetivo academico do MVP: demonstrar um sistema simples, seguro e explicavel para pequenos negocios gerenciarem agendamentos online.
