<div align="center">

# Agendai

### Plataforma moderna de agendamentos para pequenos negócios

Sistema web completo para gestão de serviços, profissionais, clientes e horários, desenvolvido como projeto de TCC no curso técnico em Desenvolvimento de Sistemas.

<br>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-20232A?style=for-the-badge&logo=vite&logoColor=646CFF)
![Node.js](https://img.shields.io/badge/Node.js-20232A?style=for-the-badge&logo=node.js&logoColor=339933)
![Express](https://img.shields.io/badge/Express-20232A?style=for-the-badge&logo=express&logoColor=FFFFFF)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-20232A?style=for-the-badge&logo=postgresql&logoColor=4169E1)
![JWT](https://img.shields.io/badge/JWT-20232A?style=for-the-badge&logo=jsonwebtokens&logoColor=FFFFFF)
![Vercel](https://img.shields.io/badge/Vercel-20232A?style=for-the-badge&logo=vercel&logoColor=FFFFFF)
![Render](https://img.shields.io/badge/Render-20232A?style=for-the-badge&logo=render&logoColor=46E3B7)

<br><br>

[![Demo informada](https://img.shields.io/badge/Demo_informada-00C853?style=for-the-badge&logo=vercel&logoColor=white)](https://tcc-agendamento.vercel.app/)

</div>

---

## 📌 Sobre o projeto

O **Agendai** é uma plataforma de agendamentos criada para ajudar pequenos negócios a organizarem seus atendimentos de forma simples, moderna e acessível.

A aplicação permite que o empreendedor cadastre seu negócio, configure serviços, profissionais e horários, acompanhe seus agendamentos em uma área administrativa e compartilhe uma página pública para que clientes possam realizar agendamentos online.

O projeto foi desenvolvido como **TCC do curso técnico em Desenvolvimento de Sistemas**, com foco em aplicar conceitos de desenvolvimento web, banco de dados, autenticação, responsividade, experiência do usuário e configuração de deploy em provedores.

---

## 🎯 Objetivo

O objetivo do Agendai é oferecer uma solução prática para microempreendedores que precisam organizar seus horários, reduzir agendamentos manuais e facilitar o contato com seus clientes.

Além disso, o projeto tem como objetivo demonstrar a construção de uma aplicação completa, envolvendo:

- Front-end responsivo;
- Back-end com API REST;
- Banco de dados relacional;
- Autenticação de usuários;
- Upload de imagens;
- Compartilhamento de links pelo WhatsApp;
- Geração de relatórios;
- Deploy do front-end e back-end.

---

## ✨ Funcionalidades

### Área administrativa

- Cadastro e login de usuários;
- Autenticação com JWT;
- Dashboard com métricas reais;
- Gestão de clientes;
- Gestão de serviços;
- Gestão de profissionais;
- Agenda administrativa;
- Filtros por status dos agendamentos;
- Alteração de status dos agendamentos;
- Relatórios em PDF;
- Modo escuro;
- Personalização visual com logo e banner;
- Link público do negócio;
- QR Code para divulgação;
- Interface responsiva.

### Página pública

- Página pública de agendamento;
- Exibição dos dados do negócio;
- Exibição de logo e banner personalizados;
- Seleção de serviço;
- Seleção de profissional;
- Seleção de horário disponível;
- Formulário com dados do cliente;
- Confirmação de agendamento;
- Link seguro para gerenciamento do agendamento;
- Consulta de detalhes limitados por token;
- Confirmação de presença, reagendamento e cancelamento enquanto o agendamento está ativo;
- Estados cancelado e concluído apenas informativos, sem novas alterações;
- Compartilhamento de links pelo WhatsApp.

### Recursos extras

- PWA;
- Service Worker;
- Manifest;
- Layout mobile-first;
- Configuração para deploy;
- Comunicação entre front-end e back-end via API.

---

## 🛠️ Tecnologias utilizadas

### Front-end

- React
- Vite
- JavaScript
- CSS
- Chart.js
- jsPDF
- PWA

### Back-end

- Node.js 24 LTS
- Express
- JWT
- Bcrypt
- Multer
- `pg`

### Banco de dados

- PostgreSQL no Supabase
- Migrations PostgreSQL incrementais

### Deploy

- Vercel
- Render

---

## 🧩 Estrutura do projeto

```bash
Agendai/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middlewares/
│   │   ├── config/
│   │   └── database/             # módulos do runner transacional
│   ├── scripts/                  # CLI explícita de migrations
│   ├── test/
│   │   └── integration/          # PostgreSQL local descartável
│   ├── database/
│   │   ├── postgres-migrations/  # migrations ativas
│   │   │   ├── 001_create_schema.sql
│   │   │   ├── 002_add_business_branding.sql
│   │   │   ├── 003_add_public_appointment_token.sql
│   │   │   └── 004_harden_supabase_data_boundary.sql
│   │   └── migrations/           # histórico MySQL
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   └── styles.css
│   ├── public/
│   └── package.json
│
└── README.md
```

---

## 📱 Responsividade

O Agendai foi desenvolvido com foco em uma experiência responsiva, funcionando em diferentes tamanhos de tela.

A interface foi pensada para uso em:

- Celulares;
- Tablets;
- Notebooks;
- Desktops.

A página pública de agendamento possui foco mobile-first, considerando que a maioria dos clientes pode acessar o link pelo celular.

---

## 🌙 Modo escuro

O sistema possui suporte a **modo claro e modo escuro**, com alternância de tema e persistência da preferência do usuário.

O modo escuro foi aplicado nas principais áreas do sistema, incluindo:

- Dashboard;
- Agenda;
- Clientes;
- Serviços;
- Profissionais;
- Meu Negócio;
- Login;
- Cadastro;
- Página pública.

---

## 📊 Dashboard

O dashboard apresenta métricas reais do negócio, como:

- Total de agendamentos;
- Clientes únicos;
- Serviços ativos;
- Profissionais ativos;
- Próximo agendamento;
- Gráfico de agendamentos da semana.

Esses dados ajudam o empreendedor a acompanhar a movimentação do seu negócio de forma mais clara e organizada.

---

## 📄 Relatórios em PDF

O sistema permite gerar relatórios em PDF com base em um período selecionado.

O relatório contém informações como:

- Nome do negócio;
- Período selecionado;
- Total de agendamentos;
- Total de clientes únicos;
- Serviços ativos;
- Profissionais ativos;
- Serviço mais agendado;
- Profissional mais agendado;
- Lista resumida dos agendamentos do período.

---

## 🔗 Página pública de agendamento

Cada negócio possui uma página pública de agendamento que pode ser compartilhada com os clientes.

Nessa página, o cliente pode:

- Visualizar informações do negócio;
- Escolher um serviço;
- Selecionar um profissional;
- Escolher um horário disponível;
- Preencher seus dados;
- Confirmar o agendamento.

Depois da confirmação, o cliente recebe um link protegido por token para
consultar detalhes limitados e gerenciar os estados suportados. Enquanto o
agendamento estiver ativo, esse link permite confirmar presença, consultar
novos horários, reagendar ou cancelar. Agendamentos cancelados ou concluídos
continuam consultáveis, mas não exibem novas ações de alteração.

---

## 📷 Identidade visual

O Agendai permite que o empreendedor personalize a aparência pública do seu negócio por meio de:

- Upload de logo;
- Upload de banner;
- Exibição da identidade visual na área privada;
- Exibição da identidade visual na página pública.

---

## 🚀 Como executar o projeto

### Pré-requisitos

Antes de começar, é necessário ter instalado:

- Node.js 24 LTS;
- npm;
- acesso a PostgreSQL compatível para preparar ou validar o banco;
- Git.

O repositório fixa a versão principal em `.nvmrc`. Antes de instalar as
dependências, use seu gerenciador de versões e confirme que `node --version`
começa com `v24.`. A escolha do runtime deve ser reavaliada pelos links de
[versões do Node.js](https://nodejs.org/en/about/previous-releases) e
[ciclo de vida/EOL](https://nodejs.org/en/about/eol).

---

## 🔧 Configuração do back-end

O back-end lê o arquivo `.env` localizado na **raiz do repositório**, e não
um arquivo dentro de `backend/`. A partir da raiz, copie o exemplo sem valores
reais:

```powershell
Copy-Item .env.example .env
```

Revise o arquivo criado mantendo os nomes e defaults rastreados:

```env
PORT=3001
NODE_ENV=development
TZ=America/Sao_Paulo
TRUST_PROXY_HOPS=0
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=troque_este_valor_por_um_segredo_seguro
JWT_EXPIRES_IN=1d
UPLOAD_DIR=

DATABASE_URL=
DATABASE_SSL_MODE=verify-full
DATABASE_SSL_CA=

# Testes PostgreSQL destrutivos: não são carregados automaticamente deste arquivo
RUN_POSTGRES_INTEGRATION=
# Somente no serviço descartável do GitHub Actions; cria papéis globais
RUN_POSTGRES_ROLE_FIXTURES=
DATABASE_TEST_URL=
CONFIRM_POSTGRES_TEST_DB=
```

`DATABASE_URL` é obrigatória e deve permanecer somente no ambiente. Não inclua
parâmetros ou fragmentos na URI; a política TLS é definida separadamente por
`DATABASE_SSL_MODE`. `DATABASE_SSL_CA` é opcional e recebe uma CA confiável
somente quando a cadeia padrão do provedor exigir.

Para um PostgreSQL local sem TLS, `DATABASE_SSL_MODE=disable` é aceito apenas
com `NODE_ENV` diferente de `production` e host `localhost`, `127.0.0.1` ou
`::1`. Conexões remotas e de produção sempre validam certificado e hostname.

As quatro variáveis de teste nunca devem apontar para Supabase, desenvolvimento
compartilhado, staging ou produção. O gate destrutivo só é ativado com
`RUN_POSTGRES_INTEGRATION=1`; a criação dos papéis globais usados para testar as
revogações da Data API é exclusiva do serviço descartável do GitHub Actions e
exige ainda `RUN_POSTGRES_ROLE_FIXTURES=1`.

Nunca versione o `.env`, use o placeholder de `JWT_SECRET` em produção ou
copie conexão, senha, chave de serviço ou certificado para documentação, logs,
capturas de tela ou descrições de pull request.

### Runner de migrations PostgreSQL

O runner descobre somente arquivos `NNN_nome_em_minusculas.sql`, exige uma
sequência contínua iniciada em 001 e rejeita nomes desconhecidos, lacunas e
links simbólicos. As migrations ativas usam LF obrigatório; o SHA-256 é
calculado sobre os bytes exatos e gravado com versão, nome e data em
`public.schema_migrations`:

1. `backend/database/postgres-migrations/001_create_schema.sql`;
2. `backend/database/postgres-migrations/002_add_business_branding.sql`;
3. `backend/database/postgres-migrations/003_add_public_appointment_token.sql`;
4. `backend/database/postgres-migrations/004_harden_supabase_data_boundary.sql`.

O executor exige PostgreSQL 15 ou superior; o gate remoto usa PostgreSQL 17.

Esses arquivos são ordenados e imutáveis depois de aplicados. Cada execução usa
uma única conexão e transação, adquire um advisory lock, valida o banco e o
histórico, aplica apenas o sufixo pendente e registra os checksums antes do
`COMMIT`. A tabela de histórico também mantém RLS sem políticas e sem
privilégios para a Data API.

Revise o alvo e tenha backup e recuperação testada antes de qualquer aplicação.
Em um banco novo e vazio, execute deliberadamente:

```bash
cd backend
npm run db:migrate -- --confirm-database=<nome-exato-do-banco>
```

Todo apply exige que a confirmação seja idêntica a `current_database()`. Objetos
do Agendai existentes sem histórico são recusados por padrão. Depois de uma
inspeção estrutural somente leitura, em janela de manutenção, o operador pode
solicitar o baseline guardado:

```bash
npm run db:migrate -- --baseline-existing --confirm-database=<nome-exato-do-banco>
```

O baseline aceita somente um prefixo contínuo e estruturalmente compatível,
registra os checksums atuais e aplica o sufixo pendente dentro da mesma
transação. Estado parcial, ordem ambígua, definição incompatível ou checksum
divergente interrompem a operação sem reparo automático. Nunca altere migration
aplicada nem edite `schema_migrations` para contornar a recusa. As migrations em
`backend/database/migrations/` documentam a fase histórica MySQL e nunca devem
ser executadas no PostgreSQL.

A migration 004 habilita RLS e revoga privilégios da Data API sem criar
políticas permissivas. Essa barreira não substitui JWT, autorização de recurso
ou filtros de isolamento por negócio no Express. Consulte
[`docs/POSTGRES-SUPABASE.md`](docs/POSTGRES-SUPABASE.md) antes da operação.

O runner não faz parte de `npm start`, do build nem da inicialização do servidor.
Em falhas conhecidas antes do commit, ele tenta desfazer DDL e histórico na mesma
transação. Se o `ROLLBACK` não puder ser confirmado, ou se o `COMMIT` falhar, o
resultado é desconhecido: não repita o comando automaticamente; preserve a
evidência e inspecione catálogo e histórico em modo somente leitura antes de
decidir a recuperação. O repositório não comprova que esse runner ou as
migrations foram executados em qualquer projeto Supabase.

Instale as dependências bloqueadas pelo lockfile e inicie a API:

```bash
cd backend
npm ci
npm run dev
```

---

## 💻 Configuração do front-end

O override local do Vite fica em `frontend/.env`. A partir da raiz:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

O valor local esperado é:

```env
VITE_API_URL=http://localhost:3001
```

Variáveis `VITE_*` são incorporadas ao bundle público e nunca devem conter
segredos. Instale e execute o front-end:

```bash
cd frontend
npm ci
npm run dev
```

---

## ✅ Verificações locais

Execute cada bloco a partir da raiz do repositório.

Back-end:

```bash
cd backend
npm ci
npm audit --audit-level=low
npm test
cd ..
```

Integração PostgreSQL destrutiva, somente depois de configurar um banco local
descartável e todos os guards descritos em `.env.example`:

```bash
cd backend
npm run test:integration
cd ..
```

Sem `RUN_POSTGRES_INTEGRATION=1`, essa suíte é marcada como ignorada sem abrir
conexão. Um pedido de execução com qualquer identidade inválida falha fechado.
O cenário que cria papéis globais é exclusivo do serviço descartável do GitHub
Actions e também exige `RUN_POSTGRES_ROLE_FIXTURES=1`.

Front-end:

```bash
cd frontend
npm ci
npm audit --audit-level=low
npm run lint
npm test
npm run build
cd ..
```

Protótipo de design:

```bash
cd design-prototype
npm ci
npm audit --audit-level=low
npm run build
cd ..
```

O workflow `.github/workflows/quality.yml` está configurado para repetir esses
gates em pull requests e pushes para `main`, incluindo auditoria full-tree no
nível `low` para os três lockfiles. O job `postgres-integration` usa PostgreSQL
17 descartável e executa migrations, repetição idempotente, drift de checksum,
rollback, concorrência, baseline e os limites de RLS, privilégios, triggers e
constraints do plano 015. A execução remota é a validação autoritativa da
sintaxe e dos jobs do GitHub Actions; não comprova o estado do Supabase.

---

## 🌐 Deploy

A arquitetura configurada no repositório é front-end na **Vercel**, back-end no
**Render** e PostgreSQL no **Supabase**. O endereço de demonstração informado é:

```text
https://tcc-agendamento.vercel.app/
```

Esse endereço e os dashboards dos provedores são estado externo: disponibilidade,
runtime e variáveis ativas devem ser confirmados antes de cada entrega.

### Configuração a conferir nos provedores

O repositório versiona scripts, contratos `engines.node`, `.nvmrc`,
`render.yaml` e o rewrite de SPA em `frontend/vercel.json`. `.nvmrc` expressa o
contrato móvel da versão principal Node 24 para desenvolvimento e CI. Como o
serviço Render usa `backend` como diretório raiz, `backend/package.json` e seu
`engines.node` são a fonte do runtime no provedor. O runtime efetivo e as
variáveis ainda precisam ser confirmados nos dashboards.

Na Vercel:

- diretório raiz esperado: `frontend`;
- ambiente Node do build: Node.js 24.x, conforme `.nvmrc` e `engines.node`;
- comando de build: `npm run build`;
- diretório de saída: `dist`;
- variável pública: `VITE_API_URL=https://<endereco-do-backend>`;
- rewrite SPA já definido em `frontend/vercel.json`.

No Render:

- diretório raiz esperado: `backend`;
- runtime solicitado por `engines.node`: `>=24 <25`;
- comando de inicialização: `npm start`;
- `PORT` costuma ser fornecida pelo provedor e não deve ser fixada em `3001`;
- `NODE_ENV=production` e `TZ=America/Sao_Paulo`;
- `TRUST_PROXY_HOPS` deve refletir a cadeia real de proxies; quando ausente em
  produção, a aplicação usa `1`;
- `CORS_ORIGIN=https://<dominio-real>` deve listar somente os domínios reais
  permitidos, separados por vírgula quando houver mais de um;
- `JWT_SECRET` deve ser um segredo forte, exclusivo e externo ao repositório;
- `DATABASE_URL` deve ser configurada como segredo, sem parâmetros de conexão;
- `DATABASE_SSL_MODE=verify-full` deve permanecer ativo; configure
  `DATABASE_SSL_CA` somente quando uma CA confiável for necessária;
- `JWT_EXPIRES_IN` e `UPLOAD_DIR` devem receber os valores aprovados para o
  ambiente;
- execute `npm run db:migrate -- --confirm-database=<nome-exato-do-banco>` como
  etapa de release explícita, depois do backup e antes de uma versão que dependa
  do novo schema; nunca inclua o comando no build ou no start do Render.

O login administrativo padrão do Supabase não deve ser mantido como credencial
de runtime de longo prazo. Provisionar um login dedicado com privilégios
mínimos e rotacionar a credencial atual é uma etapa operacional separada, ainda
não comprovada por este repositório.

Uploads são gravados no filesystem indicado por `UPLOAD_DIR` (ou no diretório
local padrão quando vazio). Com o código atual, monte um volume persistente e
aponte `UPLOAD_DIR` para ele; armazenamento de objetos exige um adaptador ainda
não implementado. Um filesystem efêmero pode perder logo e banner após restart
ou redeploy. Este repositório não comprova que esse volume já existe.

### Verificação operacional

Antes de considerar o deploy pronto, confirme nos dashboards o Node 24, os
nomes das variáveis, os logs de build/start, o schema PostgreSQL, o histórico
registrado pelo runner, a aplicação da migration 004 e a persistência de
uploads. `/api/health` comprova apenas que o processo HTTP responde; não
consulta o banco. Valide acesso ao banco por um fluxo autenticado e faça smoke
test de login, agendamento público, link de gerenciamento e upload. Para
validar persistência, envie um arquivo, registre a URL, faça restart ou
redeploy e confirme que o mesmo arquivo continua acessível. `/api/db-health`
retorna 404 em produção e não é um readiness check.

Se a conexão remota não validar a cadeia de certificados, interrompa a
operação e configure uma CA confiável após revisão. Nunca restaure uma opção
que desabilite a validação TLS.

Mantenha backup verificado antes das migrations e uma versão anterior
implantável para rollback da aplicação. O runner reverte somente a transação
cujo erro teve resultado conhecido. Ele não oferece down migration. Falha ou
perda de conexão durante `COMMIT` deixa o resultado desconhecido: não tente de
novo até conferir `schema_migrations` e o catálogo em modo somente leitura. Para
falha descoberta após commit, preserve evidências e restaure o backup ou siga
um plano de recuperação revisado; nunca reverta SQL ou altere o histórico
manualmente.

Referência de runtime da Vercel:
[versões Node.js suportadas](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

---

## 📌 Status do projeto

```text
Em desenvolvimento
```

O Agendai já possui as principais funcionalidades implementadas, mas continua sendo evoluído com melhorias de interface, ajustes técnicos, novas integrações e refinamentos para a apresentação final do TCC.

---

## 🧠 Aprendizados

Durante o desenvolvimento do Agendai, foram trabalhados conceitos importantes como:

- Organização de projeto Full Stack;
- Criação de API REST;
- Integração entre front-end e back-end;
- Autenticação com JWT;
- Evolução do banco relacional da fase histórica MySQL para PostgreSQL;
- Upload de arquivos;
- Geração de relatórios;
- Responsividade;
- Configuração de deploy em provedores;
- Experiência do usuário;
- Estruturação de um sistema real.

---

## 📈 Melhorias futuras

Algumas melhorias planejadas para o projeto:

- Login PostgreSQL de runtime dedicado, com privilégios mínimos e rotação
  operacional da credencial administrativa;
- Ampliação dos testes HTTP de autorização, isolamento e contratos de erro;
- Bloqueios de agenda, folgas e indisponibilidades manuais;
- Simulação e integração progressiva de notificações;
- Persistência de uploads em volume ou armazenamento de objetos;
- Melhorias de performance, acessibilidade, relatórios e documentação da API;
- Perfil do cliente e integração com Google Calendar como evoluções posteriores.

---

## 👨‍💻 Autor

<div align="center">

**João Lucas Mendes da Silva**

Técnico em Desenvolvimento de Sistemas  
Futuro Engenheiro de Dados / Engenheiro de IA

<br>

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/joaolucas18/)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram)](https://www.instagram.com/_ojotinhaa/?theme=dark)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github)](https://github.com/JoaoLucasMendesDaSilva)

</div>
