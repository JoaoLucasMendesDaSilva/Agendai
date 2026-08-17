<div align="center">

# Agendai

### Plataforma moderna de agendamentos para pequenos negócios

Sistema web completo para gestão de serviços, profissionais, clientes e horários, desenvolvido como projeto de TCC no curso técnico em Desenvolvimento de Sistemas.

<br>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-20232A?style=for-the-badge&logo=vite&logoColor=646CFF)
![Node.js](https://img.shields.io/badge/Node.js-20232A?style=for-the-badge&logo=node.js&logoColor=339933)
![Express](https://img.shields.io/badge/Express-20232A?style=for-the-badge&logo=express&logoColor=FFFFFF)
![MySQL](https://img.shields.io/badge/MySQL-20232A?style=for-the-badge&logo=mysql&logoColor=4479A1)
![JWT](https://img.shields.io/badge/JWT-20232A?style=for-the-badge&logo=jsonwebtokens&logoColor=FFFFFF)
![Vercel](https://img.shields.io/badge/Vercel-20232A?style=for-the-badge&logo=vercel&logoColor=FFFFFF)
![Railway](https://img.shields.io/badge/Railway-20232A?style=for-the-badge&logo=railway&logoColor=FFFFFF)

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
- MySQL

### Banco de dados

- MySQL
- Migrations SQL

### Deploy

- Vercel
- Railway

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
│   │   └── config/
│   ├── database/
│   │   └── migrations/
│   │       ├── 001_create_schema.sql
│   │       ├── 002_add_business_branding.sql
│   │       └── 003_add_public_appointment_token.sql
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
- MySQL compatível com as migrations do projeto;
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

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=tcc_agendamento
```

Nunca versione o `.env` nem use o placeholder de `JWT_SECRET` em produção.

### Migrations manuais

Ainda não existe um runner com histórico de migrations. Faça backup, confirme
o schema de destino e execute os arquivos manualmente nesta ordem:

1. `backend/database/migrations/001_create_schema.sql`;
2. `backend/database/migrations/002_add_business_branding.sql`;
3. `backend/database/migrations/003_add_public_appointment_token.sql`.

A migration 001 cria e seleciona `tcc_agendamento`. Em um MySQL gerenciado que
já forneça outro schema, revise o SQL e o banco configurado antes da execução.
As migrations 002 e 003 devem ser executadas uma única vez; repeti-las pode
falhar porque ainda não há tabela de histórico. Não reaplique SQL cegamente em
um ambiente existente.

Depois, confira as colunas esperadas:

```sql
DESCRIBE negocios;      -- deve incluir logo_url e banner_url
DESCRIBE agendamentos;  -- deve incluir token_publico_hash
```

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
npm test
cd ..
```

Front-end:

```bash
cd frontend
npm ci
npm run lint
npm test
npm run build
cd ..
```

Protótipo de design:

```bash
cd design-prototype
npm ci
npm run build
cd ..
```

O workflow `.github/workflows/quality.yml` está configurado para repetir esses
gates em pull requests e pushes para `main`. A primeira execução remota é a
validação autoritativa da sintaxe e dos jobs do GitHub Actions.

---

## 🌐 Deploy

A arquitetura adotada é front-end na **Vercel** e back-end na **Railway**. O
endereço de demonstração informado é:

```text
https://tcc-agendamento.vercel.app/
```

Esse endereço e os dashboards dos provedores são estado externo: disponibilidade,
runtime e variáveis ativas devem ser confirmados antes de cada entrega.

### Configuração a conferir nos provedores

O repositório versiona scripts, `engines.node`, `.nvmrc` e o rewrite de SPA em
`frontend/vercel.json`. Não há `railway.toml`, Dockerfile, Procfile ou outra
configuração Railway rastreada. Diretórios raiz, runtime efetivo, variáveis e
volumes abaixo precisam ser configurados e confirmados nos dashboards.

Na Vercel:

- diretório raiz esperado: `frontend`;
- ambiente Node do build: Node.js 24.x, conforme `.nvmrc` e `engines.node`;
- comando de build: `npm run build`;
- diretório de saída: `dist`;
- variável pública: `VITE_API_URL=https://<endereco-do-backend>`;
- rewrite SPA já definido em `frontend/vercel.json`.

Na Railway:

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
- `JWT_EXPIRES_IN`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  e `UPLOAD_DIR` devem receber valores do serviço configurado;
- as migrations devem ser aplicadas na ordem documentada antes de uma versão
  que dependa do novo schema.

Uploads são gravados no filesystem indicado por `UPLOAD_DIR` (ou no diretório
local padrão quando vazio). Com o código atual, monte um volume persistente e
aponte `UPLOAD_DIR` para ele; armazenamento de objetos exige um adaptador ainda
não implementado. Um filesystem efêmero pode perder logo e banner após restart
ou redeploy. Este repositório não comprova que esse volume já existe.

### Verificação operacional

Antes de considerar o deploy pronto, confirme nos dashboards o Node 24, os
nomes das variáveis, os logs de build/start, o schema MySQL e a persistência de
uploads. Faça um smoke test de `/api/health`, login, agendamento público, link
de gerenciamento e upload. Para validar persistência, envie um arquivo,
registre a URL, faça restart ou redeploy e confirme que o mesmo arquivo continua
acessível. `/api/db-health` retorna 404 em produção e não deve ser usado como
health check externo.

Mantenha backup do banco antes das migrations e uma versão anterior implantável
para rollback da aplicação. Não reverta SQL manualmente sem um plano específico
de recuperação.

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
- Manipulação de banco de dados MySQL;
- Upload de arquivos;
- Geração de relatórios;
- Responsividade;
- Configuração de deploy em provedores;
- Experiência do usuário;
- Estruturação de um sistema real.

---

## 📈 Melhorias futuras

Algumas melhorias planejadas para o projeto:

- Runner com histórico, locking e validação de migrations;
- Banco MySQL descartável para testes de integração e concorrência;
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
