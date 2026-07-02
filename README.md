# Agendai

Agendai é um sistema de agendamento online para pequenos negócios, desenvolvido como Trabalho de Conclusão de Curso (TCC). A aplicação ajuda barbearias, salões, clínicas, estúdios e profissionais autônomos a organizar serviços, profissionais, clientes e horários em um único lugar.

O empreendedor administra o negócio por um painel privado. O cliente acessa um link público, escolhe serviço, profissional, data e horário e confirma o atendimento sem criar uma conta.

## Status do projeto

O Agendai está em estado de **MVP funcional e deployado**:

- frontend React hospedado na Vercel;
- backend Express hospedado na Railway;
- banco MySQL hospedado na Railway;
- fluxo administrativo e agendamento público integrados;
- interface responsiva, PWA instalável e suporte a tema escuro.

URLs privadas, senhas, tokens e credenciais reais não devem ser incluídos no repositório.

## Funcionalidades implementadas

### Autenticação

- Cadastro de empreendedor.
- Login com e-mail e senha.
- Sessão protegida por JWT.
- Validação da sessão com **GET /api/auth/me**.
- Logout e proteção das páginas administrativas.

### Dashboard inteligente

- Total de agendamentos.
- Total de clientes únicos.
- Total de serviços ativos.
- Total de profissionais ativos.
- Próximo agendamento.
- Gráfico de agendamentos da semana.
- Seleção de período e geração de relatório PDF com dados reais.

### Meu Negócio

- Cadastro e edição dos dados do negócio.
- Nome, descrição, telefone, endereço e cidade.
- Horários e dias de funcionamento.
- Slug e link público de agendamento.
- Cópia do link público.
- QR Code com opção de download.
- Compartilhamento do link pelo WhatsApp.
- Upload e substituição de logo.
- Upload e substituição de banner/capa.
- Preview das imagens antes de salvar.

### Serviços

- Cadastro, listagem e edição.
- Duração e preço.
- Desativação lógica com **ativo = false**.
- Apenas serviços ativos aparecem no fluxo público.

### Profissionais

- Cadastro, listagem e edição.
- Especialidade, telefone e e-mail.
- Desativação lógica com **ativo = false**.
- Apenas profissionais ativos aparecem no fluxo público.

### Clientes

- Lista construída a partir dos agendamentos existentes.
- Identificação prioritária por telefone, seguida por e-mail e nome.
- Busca por nome, telefone ou e-mail.
- Total de clientes, clientes recorrentes e novos clientes.
- Histórico resumido de agendamentos por cliente.

### Agenda privada

- Agendamentos agrupados por data.
- Filtros por todos, hoje e status.
- Dados de cliente, serviço, profissional, horário e observações.
- Alteração de status.
- Cancelamento lógico por mudança de status.
- Isolamento dos dados pelo negócio autenticado.

### Página pública personalizada

Rota:

~~~txt
/agendar/:slugOuId
~~~

A página utiliza nome, descrição, logo, banner, telefone, cidade, endereço, horários e dias de funcionamento do negócio. Também apresenta um indicador visual de aberto ou fechado.

Fluxo do cliente:

1. Escolher serviço.
2. Escolher profissional.
3. Escolher data.
4. Escolher horário disponível.
5. Informar nome, telefone, e-mail opcional e observações opcionais.
6. Confirmar o agendamento.

O backend calcula o término pelo tempo do serviço, respeita o funcionamento do negócio e bloqueia sobreposição com agendamentos pendentes ou confirmados.

### Gerenciamento público do agendamento

- Após criar um agendamento, o cliente recebe um link de gerenciamento.
- Rota do frontend: **/gerenciar-agendamento/:token**.
- O token público permite consultar dados limitados do agendamento.
- O cliente pode cancelar, confirmar presença, listar horários de reagendamento e reagendar agendamentos ativos.
- Agendamentos cancelados ou concluídos não ficam livremente mutáveis pelo token público.

### Landing Page

- Apresentação pública do Agendai.
- Benefícios, etapas de funcionamento e planos demonstrativos.
- Chamadas para cadastro e login.
- Layout responsivo alinhado à identidade visual do sistema.

### Experiência visual

- Layout mobile-first.
- Sidebar animada e recolhível.
- Cards, badges, inputs e botões padronizados.
- Ícones com lucide-react.
- Microinterações em CSS.
- Dark Mode persistido no navegador.
- Ilustração no painel de Login e Cadastro.
- Empty states e mensagens de carregamento, erro e sucesso.

### PWA instalável

- Manifesto web.
- Service worker para assets estáticos.
- Ícones de 192 px e 512 px.
- Instalação em Android, iPhone e Desktop.
- Botão de instalação quando o navegador oferece beforeinstallprompt.
- Execução em modo standalone.

O PWA não armazena respostas da API. Sem conexão, dados dinâmicos e agendamentos não ficam disponíveis.

## Arquitetura

~~~txt
Cliente
  |
  v
Frontend React/Vite (Vercel)
  |
  | HTTPS / JSON / JWT
  v
Backend Node.js/Express (Railway)
  |
  v
MySQL (Railway)
~~~

### Frontend

- React 19.
- Vite.
- CSS puro.
- Chart.js.
- jsPDF.
- lucide-react.
- qrcode.react.
- Deploy na Vercel.

### Backend

- Node.js.
- Express.
- mysql2/promise.
- JWT e bcrypt.
- Helmet.
- CORS.
- express-rate-limit.
- Multer para uploads.
- Deploy na Railway.

### Banco

- MySQL com InnoDB.
- Charset utf8mb4.
- Chaves estrangeiras, índices e constraints.
- Hospedagem no Railway.

## Estrutura do projeto

~~~txt
tcc-agendamento/
  backend/
    database/
      migrations/
        001_create_schema.sql
        002_add_business_branding.sql
    src/
      config/
      controllers/
      middlewares/
      routes/
      services/
      utils/
  frontend/
    public/
      icons/
      manifest.webmanifest
      sw.js
    src/
      assets/
      components/
      contexts/
      pages/
      services/
    vercel.json
  .env.example
  README.md
~~~

## Requisitos

- Node.js 20.19.0 ou superior.
- npm.
- MySQL 8 ou compatível.
- MySQL Workbench opcional.

## Variáveis de ambiente

### Backend

O backend lê o arquivo **.env** na raiz do projeto. Use **.env.example** como referência:

~~~env
PORT=3001
NODE_ENV=development
TZ=America/Sao_Paulo
TRUST_PROXY_HOPS=0
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=substitua_por_um_segredo_forte
JWT_EXPIRES_IN=1d
UPLOAD_DIR=

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=tcc_agendamento
~~~

Observações:

- JWT_SECRET deve ser forte e exclusivo.
- TZ deve permanecer como **America/Sao_Paulo** para que validações de dias e horários sejam consistentes.
- TRUST_PROXY_HOPS deve ser **0** localmente e normalmente **1** no Railway.
- CORS_ORIGIN aceita múltiplas origens separadas por vírgula.
- Não use wildcard de CORS em produção.
- UPLOAD_DIR é opcional localmente; sem ele, os arquivos ficam em **backend/uploads**.
- Em produção, UPLOAD_DIR deve apontar para um volume persistente.
- Nunca versione o arquivo .env.

### Frontend

Crie **frontend/.env** a partir de **frontend/.env.example**:

~~~env
VITE_API_URL=http://localhost:3001
~~~

Na Vercel, use a URL HTTPS pública do backend:

~~~env
VITE_API_URL=https://sua-api.exemplo
~~~

Variáveis iniciadas por VITE_ ficam disponíveis no bundle público e não devem conter segredos.

## Banco de dados e migrations

As três migrations devem ser executadas nesta ordem:

1. **backend/database/migrations/001_create_schema.sql**
2. **backend/database/migrations/002_add_business_branding.sql**
3. **backend/database/migrations/003_add_public_appointment_token.sql**

### Migration 001

Cria o banco, charset, tabelas usuarios, negocios, servicos, profissionais e agendamentos, além de chaves estrangeiras, índices e constraints.

### Migration 002

Adiciona em negocios:

- logo_url;
- banner_url.

A migration 002 deve ser executada com o schema correto já selecionado.

### Migration 003

Adiciona em agendamentos:

- token_publico_hash.

Essa coluna armazena o hash do token usado no link público de gerenciamento do agendamento.

### Execução no MySQL Workbench

1. Abra a conexão MySQL.
2. Execute 001_create_schema.sql.
3. Confirme qual schema está configurado em DB_NAME.
4. Selecione esse schema.
5. Execute 002_add_business_branding.sql.
6. Execute 003_add_public_appointment_token.sql.
7. Atualize a lista de tabelas.

Verificação:

~~~sql
SHOW DATABASES;
USE tcc_agendamento;
SHOW TABLES;
DESCRIBE negocios;
DESCRIBE agendamentos;
~~~

As colunas logo_url e banner_url devem aparecer em **DESCRIBE negocios**.
A coluna token_publico_hash deve aparecer em **DESCRIBE agendamentos**.

No Railway, o schema gerenciado pode se chamar **railway**. Se a aba Data mostrar **You have no tables**, confira se o schema selecionado é o mesmo configurado em DB_NAME. Não execute as migrations 002 e 003 em outro schema.

## Uploads de logo e banner

Rota privada:

~~~txt
PUT /api/negocio/:id/identidade-visual
~~~

O request usa multipart/form-data com os campos logo e banner.

### Formatos aceitos

- PNG.
- JPG/JPEG.
- WEBP.

### Limites

- Logo: até 5 MB.
- Banner: até 10 MB.
- No máximo uma logo e um banner por request.

O backend verifica o tipo declarado, a assinatura binária, gera nomes aleatórios e não aceita SVG ou executáveis.

### Persistência no Railway

O armazenamento atual é local no backend. O sistema de arquivos comum do container pode ser perdido em reinicializações e novos deploys.

Para produção:

1. Crie um volume persistente no serviço do backend.
2. Monte o volume em um caminho estável, por exemplo **/data/uploads**.
3. Configure:

~~~env
UPLOAD_DIR=/data/uploads
~~~

4. Faça um upload de teste.
5. Reinicie ou publique novamente o serviço.
6. Confirme que a imagem continua disponível.

Sem volume persistente, logo e banner podem desaparecer. Uma evolução futura possível é usar Cloudinary ou S3.

## Como executar localmente

### 1. Banco

Execute as migrations 001, 002 e 003.

### 2. Backend

Na raiz do projeto, configure .env. Depois:

~~~bash
cd backend
npm install
npm run dev
~~~

API local:

~~~txt
http://localhost:3001
~~~

Testes básicos:

~~~txt
GET http://localhost:3001/api/health
GET http://localhost:3001/api/db-health
~~~

A rota db-health funciona somente em desenvolvimento. Em produção, retorna 404 sem testar publicamente o banco.

### 3. Frontend

~~~bash
cd frontend
npm install
npm run dev
~~~

Frontend local:

~~~txt
http://localhost:5173
~~~

Build de produção:

~~~bash
npm run build
~~~

## Instalação do PWA

A instalação exige HTTPS em produção. Localhost também é aceito para desenvolvimento.

### Android

1. Abra o Agendai no Chrome.
2. Faça login para visualizar o botão **Instalar aplicativo**, quando disponível.
3. Toque no botão ou abra o menu do Chrome.
4. Selecione **Instalar app** ou **Adicionar à tela inicial**.
5. Confirme.

### iPhone e iPad

O iOS não utiliza beforeinstallprompt.

1. Abra o Agendai no Safari.
2. Toque em Compartilhar.
3. Selecione **Adicionar à Tela de Início**.
4. Confirme em **Adicionar**.

### Desktop

No Chrome ou Edge:

1. Abra o Agendai.
2. Use o ícone de instalação da barra de endereço, quando exibido.
3. Como alternativa, abra o menu e selecione **Instalar Agendai**.
4. Confirme.

## Rotas principais da API

### Públicas

~~~txt
GET  /api/health

POST /api/auth/cadastro
POST /api/auth/login

GET  /api/publico/negocio/:slugOuId
GET  /api/publico/negocio/:slugOuId/servicos
GET  /api/publico/negocio/:slugOuId/profissionais
GET  /api/publico/negocio/:slugOuId/horarios-disponiveis
POST /api/publico/negocio/:slugOuId/agendamentos

GET    /api/publico/agendamentos/:token
GET    /api/publico/agendamentos/:token/horarios-disponiveis
PUT    /api/publico/agendamentos/:token/confirmacao
PUT    /api/publico/agendamentos/:token/reagendamento
DELETE /api/publico/agendamentos/:token
~~~

### Privadas

Exigem o header:

~~~txt
Authorization: Bearer <token>
~~~

~~~txt
GET /api/auth/me

GET  /api/negocio
POST /api/negocio
PUT  /api/negocio/:id
PUT  /api/negocio/:id/identidade-visual

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
~~~

## Segurança aplicada

- Senhas protegidas com bcrypt.
- JWT configurado por variável de ambiente.
- Rotas privadas protegidas por middleware.
- Usuário autenticado consultado no banco.
- Respostas públicas não incluem senha_hash.
- Queries parametrizadas com mysql2/promise.
- Isolamento por usuario_id e negocio_id.
- Soft delete de serviços e profissionais.
- Validação de IDs, e-mails, horários e payloads.
- Transação na criação de agendamento.
- Verificação de sobreposição de horários.
- Helmet, limite de JSON, CORS e rate limit.
- Limites e validação binária nos uploads.
- .env, node_modules, dist e uploads locais ignorados pelo Git.

## Deploy

### Frontend na Vercel

- Diretório raiz: **frontend**.
- Runtime: Node.js 20.19.0 ou superior.
- Instalação: **npm install**.
- Build: **npm run build**.
- Saída: **dist**.
- Variável: VITE_API_URL.
- Rewrite SPA fornecido por **frontend/vercel.json**.

Depois do deploy, valide diretamente uma rota interna, como /dashboard ou /agendar/:slugOuId.

### Backend na Railway

- Diretório raiz: **backend**.
- Runtime: Node.js 20.19.0 ou superior.
- Instalação: **npm install**.
- Inicialização: **npm start**.
- NODE_ENV configurado como production.
- TZ configurado como **America/Sao_Paulo**.
- TRUST_PROXY_HOPS configurado conforme a cadeia de proxies do ambiente; no Railway, comece com **1** e valide o IP reconhecido pelo rate limit.
- CORS_ORIGIN com o domínio da Vercel.
- JWT_SECRET forte.
- Credenciais MySQL.
- Volume persistente e UPLOAD_DIR.

Execute todas as migrations no banco correto antes de publicar o backend atualizado.

### MySQL na Railway

- Configure DB_HOST, DB_PORT, DB_USER, DB_PASSWORD e DB_NAME.
- Execute migrations 001, 002 e 003.
- Confirme a tabela negocios, as colunas da identidade visual e a coluna token_publico_hash em agendamentos.
- Não exponha credenciais em commits, prints ou documentação pública.

### Checklist pós-deploy

- GET /api/health responde.
- Cadastro e login funcionam.
- CORS aceita apenas os domínios configurados.
- Dashboard carrega dados reais.
- Link público abre sem login.
- Link de gerenciamento público abre sem login e respeita o token.
- Horários respeitam o funcionamento.
- Conflitos são bloqueados.
- QR Code e WhatsApp usam a URL pública correta.
- Logo e banner permanecem após redeploy.
- PWA pode ser instalado.
- Dark Mode permanece após recarregar.

## Teste manual do fluxo completo

1. Criar conta em /cadastro.
2. Fazer login.
3. Cadastrar o negócio.
4. Enviar logo e banner.
5. Copiar o link e validar o QR Code.
6. Compartilhar pelo WhatsApp.
7. Criar serviços.
8. Criar profissionais.
9. Abrir /agendar/:slugOuId sem login.
10. Confirmar a personalização pública.
11. Escolher serviço, profissional, data e horário.
12. Criar um agendamento.
13. Abrir o link de gerenciamento público.
14. Confirmar presença, listar horários, reagendar e cancelar pelo token.
15. Repetir o horário e confirmar o bloqueio.
16. Verificar o cliente em /clientes.
17. Verificar o agendamento em /agenda.
18. Alterar status e cancelar no painel privado.
19. Conferir métricas e gráfico.
20. Gerar relatório PDF.
21. Alternar tema claro e escuro.
22. Testar a instalação PWA.

## Limitações atuais do MVP

- Não envia notificações automáticas por WhatsApp; existe apenas compartilhamento do link.
- Não envia e-mails.
- Não integra com Google Calendar.
- Não possui pagamentos.
- Não possui bloqueio manual de horários e folgas.
- Não possui testes automatizados completos.
- O JWT é armazenado em localStorage.
- Uploads dependem de volume persistente no Railway.
- O PWA não sincroniza dados offline.
- O relatório PDF é gerado no frontend e resume períodos muito extensos.
- O sistema considera um negócio por empreendedor.

## Próximas evoluções

- Criar banco de testes MySQL descartável para testes automatizados do plano 003.
- Controle de migrations ou pequeno runner para registrar scripts já aplicados.
- Bloqueio manual de horários e folgas.
- Notificações por WhatsApp API e e-mail.
- Verificação de persistência de uploads no ambiente de produção.
- Base de testes automatizados do frontend.
- Paginação do plano 004 para listas com grande volume.
- Integração com Google Calendar.
- Armazenamento externo e otimização de imagens.
- Melhorias de segurança na persistência da sessão.
- Pagamentos e Dashboard avançado apenas como ideias futuras fora do MVP do TCC.

## Estado atual para o TCC

O MVP cobre o ciclo principal:

1. O empreendedor cria uma conta.
2. Configura o negócio e a identidade visual.
3. Cadastra serviços e profissionais.
4. Divulga link, QR Code ou WhatsApp.
5. O cliente agenda sem criar conta.
6. O sistema evita conflitos.
7. O empreendedor acompanha agenda, clientes, indicadores e relatórios.

O projeto permite demonstrar frontend, backend, banco relacional, autenticação, segurança básica, responsividade, PWA e aplicação prática para pequenos negócios.
