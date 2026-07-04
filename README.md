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

[![Deploy](https://img.shields.io/badge/Acessar_Projeto-00C853?style=for-the-badge&logo=vercel&logoColor=white)](https://tcc-agendamento.vercel.app/)
[![GitHub](https://img.shields.io/badge/Repositório-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/JoaoLucasMendesDaSilva/Agendai)

</div>

---

## 📌 Sobre o projeto

O **Agendai** é uma plataforma de agendamentos criada para ajudar pequenos negócios a organizarem seus atendimentos de forma simples, moderna e acessível.

A aplicação permite que o empreendedor cadastre seu negócio, configure serviços, profissionais e horários, acompanhe seus agendamentos em uma área administrativa e compartilhe uma página pública para que clientes possam realizar agendamentos online.

O projeto foi desenvolvido como **TCC do curso técnico em Desenvolvimento de Sistemas**, com foco em aplicar conceitos de desenvolvimento web, banco de dados, autenticação, responsividade, experiência do usuário e deploy em ambiente real.

---

## 🎯 Objetivo

O objetivo do Agendai é oferecer uma solução prática para microempreendedores que precisam organizar seus horários, reduzir agendamentos manuais e facilitar o contato com seus clientes.

Além disso, o projeto tem como objetivo demonstrar a construção de uma aplicação completa, envolvendo:

- Front-end responsivo;
- Back-end com API REST;
- Banco de dados relacional;
- Autenticação de usuários;
- Upload de imagens;
- Integração com WhatsApp;
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
- Integração com WhatsApp.

### Recursos extras

- PWA;
- Service Worker;
- Manifest;
- Layout mobile-first;
- Deploy em produção;
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

- Node.js
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
│   ├── migrations/
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

- Node.js
- MySQL
- Git

---

## 🔧 Configuração do back-end

Acesse a pasta do back-end:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` com as variáveis necessárias:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=agendai
JWT_SECRET=sua_chave_secreta
```

Execute as migrations do banco de dados:

```bash
# Execute os arquivos SQL da pasta migrations no seu banco MySQL
```

Inicie o servidor:

```bash
npm run dev
```

---

## 💻 Configuração do front-end

Acesse a pasta do front-end:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` com a URL da API:

```env
VITE_API_URL=http://localhost:3000
```

Inicie o front-end:

```bash
npm run dev
```

---

## 🌐 Deploy

O projeto está disponível em produção:

```text
https://tcc-agendamento.vercel.app/
```

O front-end foi publicado na **Vercel** e o back-end na **Railway**.

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
- Deploy em produção;
- Experiência do usuário;
- Estruturação de um sistema real.

---

## 📈 Melhorias futuras

Algumas melhorias planejadas para o projeto:

- Integração com Google Calendar;
- Melhorias na persistência de imagens;
- Página de perfil do cliente;
- Notificações automáticas;
- Melhorias nos relatórios;
- Testes automatizados;
- Melhorias de performance;
- Melhor documentação da API;
- Melhorias de acessibilidade.

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
