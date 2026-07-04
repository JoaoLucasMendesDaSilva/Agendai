# Redesign profissional do Agendai

## 1. Objetivo

Transformar o Agendai em um produto visualmente consistente, profissional e preparado para uma banca de TCC, sem limitar as decisões ao escopo inicial do MVP.

O protótipo foi criado como projeto React independente para permitir análise e aprovação visual antes de qualquer alteração no frontend funcional.

## 2. Fontes de referência

O trabalho parte das quatro imagens fornecidas como referência:

1. Agenda operacional com filtros, indicadores e ações rápidas.
2. Página pública com identidade do negócio e fluxo de agendamento.
3. Gestão de clientes com tabela e painel lateral de histórico.
4. Dashboard com resumo operacional e próximo atendimento.

As referências foram usadas como direção, não como cópia literal. A identidade atual do Agendai — verde, superfícies claras, Poppins e linguagem simples — foi preservada.

## 3. Direção visual

### 3.1 Conceito

O conceito adotado é **Painel de Atendimento Claro**: uma ferramenta de trabalho que desaparece enquanto o empreendedor executa sua rotina.

A assinatura do sistema é a **linha do dia**, presente na agenda, nos próximos atendimentos e nos históricos. Ela organiza o tempo como informação estrutural, não como decoração.

### 3.2 Paleta

- Fundo de trabalho: `#f5f7f6`.
- Superfície principal: `#ffffff`.
- Texto principal: `#14201e`.
- Verde de ação: `#178a4b`.
- Verde profundo: `#093e2a`.
- Verde suave: `#e8f6ed`.
- Cores semânticas reservadas para informação, aviso, erro e estados.

O verde não deve ocupar toda a interface. Ele indica ação, seleção, confirmação ou identidade.

### 3.3 Tipografia

- Família: Poppins.
- Pesos utilizados: 400, 500, 600 e 700.
- Títulos de páginas: entre 24 e 28 px nas telas operacionais.
- Corpo: entre 12 e 14 px, conforme densidade.
- Labels e metadados: entre 10 e 12 px.

A fonte foi instalada localmente no protótipo para evitar dependência de Google Fonts durante a apresentação.

### 3.4 Componentes

O sistema visual cobre:

- Sidebar responsiva.
- Topbar e identificação do negócio.
- Botões primário, secundário, textual e somente ícone.
- Inputs, selects, textarea e campo de busca.
- Chips de status.
- Métricas operacionais.
- Tabelas adaptáveis.
- Cards de entidades.
- Diálogos.
- Estados selecionados, hover, foco e desabilitado.
- Tema claro e escuro nas superfícies administrativas.

## 4. Estrutura do protótipo

O projeto isolado está em `design-prototype/`.

Arquivos principais:

- `design-prototype/src/App.jsx`: alternância entre superfícies da demonstração.
- `design-prototype/src/components/AppShell.jsx`: estrutura do painel administrativo.
- `design-prototype/src/components/Brand.jsx`: marca, avatar e status.
- `design-prototype/src/screens/DashboardScreen.jsx`: dashboard.
- `design-prototype/src/screens/AgendaScreen.jsx`: agenda operacional.
- `design-prototype/src/screens/ClientsScreen.jsx`: clientes e histórico.
- `design-prototype/src/screens/ManagementScreens.jsx`: serviços, profissionais e negócio.
- `design-prototype/src/screens/PublicBookingScreen.jsx`: agendamento público.
- `design-prototype/src/screens/AuthScreen.jsx`: login e cadastro.
- `design-prototype/src/screens/LandingScreen.jsx`: site institucional.
- `design-prototype/src/styles.css`: sistema visual completo.
- `design-prototype/src/responsive.css`: ajustes responsivos complementares.
- `design-prototype/src/data.js`: dados realistas usados na demonstração.

## 5. Processo executado

### Etapa 1 — Inventário

1. Levantamento das rotas existentes.
2. Leitura do design system atual em `DESIGN.md`.
3. Análise da sidebar, autenticação, dashboard e páginas funcionais.
4. Identificação dos padrões que poderiam ser preservados.

### Etapa 2 — Planejamento visual

1. Definição da paleta restrita.
2. Preservação da Poppins.
3. Definição da densidade para desktop e celular.
4. Escolha da linha temporal como assinatura visual.
5. Separação entre linguagem operacional e linguagem pública.

### Etapa 3 — Projeto isolado

1. Criação do projeto React com Vite.
2. Instalação local da Poppins.
3. Uso da biblioteca de ícones já adotada pelo produto.
4. Criação de dados simulados coerentes entre as telas.
5. Garantia de que o frontend atual não fosse alterado.

### Etapa 4 — Shell administrativo

1. Sidebar fixa no desktop.
2. Menu lateral com overlay no celular.
3. Topbar com notificações, tema e negócio atual.
4. Navegação entre todas as áreas administrativas.
5. Atalho para a página pública.

### Etapa 5 — Dashboard

1. Resumo operacional.
2. Próximo atendimento com ação principal.
3. Distribuição semanal.
4. Agenda do dia.
5. Atividade recente.
6. Ranking de serviços.

### Etapa 6 — Agenda

1. Indicadores do dia.
2. Filtros por status.
3. Busca por cliente, serviço ou telefone.
4. Agrupamento por data.
5. Ações de confirmação e conclusão.
6. Adaptação de tabela para cartões no celular.

### Etapa 7 — Clientes

1. Métricas da base.
2. Busca e filtros.
3. Lista densa no desktop.
4. Seleção de cliente.
5. Perfil, recorrência e histórico lateral.
6. Ajuste específico de tipografia e quebra de contato.

### Etapa 8 — Cadastros

1. Catálogo de serviços.
2. Ativação e desativação.
3. Lista de profissionais e ocupação.
4. Cadastro rápido em diálogo.
5. Configuração de negócio e horários.
6. Prévia e link público.

### Etapa 9 — Agendamento público

1. Identidade destacada do negócio.
2. Escolha de serviço.
3. Escolha de profissional.
4. Escolha de data e horário.
5. Dados do cliente.
6. Confirmação visual do agendamento.

### Etapa 10 — Acesso e site

1. Login e cadastro na mesma estrutura.
2. Mensagem de confiança e benefícios.
3. Landing page com demonstração do produto.
4. Atalhos para painel e experiência pública.

## 6. Responsividade

### Desktop

- Sidebar permanente.
- Conteúdo com largura ampla.
- Tabelas densas.
- Painéis laterais.
- Dashboard em múltiplas colunas.

### Tablet

- Sidebar recolhida.
- Grades em duas colunas.
- Painéis laterais reposicionados.
- Tabelas com rolagem quando necessário.

### Celular

- Menu lateral com overlay.
- Conteúdo em coluna única.
- Cards de agenda no lugar de linhas largas.
- Fluxo público progressivo e confortável para toque.
- Navegação da demonstração horizontal na parte inferior.

## 7. Acessibilidade

- Foco visível em controles.
- Contraste orientado a WCAG AA.
- Botões e links com elementos semânticos.
- Labels nos campos.
- Estados com texto, não apenas cor.
- `prefers-reduced-motion` respeitado.
- Componentes interativos navegáveis por teclado.

## 8. Interações implementadas

- Navegação administrativa.
- Alternância entre painel, site, página pública e acesso.
- Tema claro e escuro.
- Menu responsivo.
- Busca e seleção de clientes.
- Filtros da agenda.
- Seleção de serviço, profissional e horário.
- Confirmação do agendamento público.
- Login/cadastro alternável.
- Ativação de serviços.
- Diálogos de cadastro rápido.
- Cópia simulada do link público.

## 9. Validação realizada

- Build final de produção executado com sucesso: 1800 módulos transformados.
- Dashboard e agendamento público comparados lado a lado com as referências.
- Dashboard, clientes e página pública inspecionados em desktop.
- Dashboard e agendamento público inspecionados em 390 × 844.
- Ausência de overflow horizontal confirmada no celular.
- Fluxo público testado até a tela de confirmação.
- Problema de estilo no painel lateral de clientes identificado e corrigido.
- Revisão de estrutura React realizada, sem violações críticas.
- Console do navegador permaneceu sem erros durante a inspeção.

As evidências e diferenças intencionais estão registradas em `design-prototype/design-qa.md`. A prancha comparativa pode ser aberta em `design-prototype/qa.html` enquanto o servidor estiver ativo.

## 9.1 Recursos visuais gerados

Foi usado o gerador de imagens integrado para criar uma capa realista de barbearia e três retratos profissionais coerentes. O conjunto de prompts pediu um interior contemporâneo de barbearia, iluminação editorial verde e quente e retratos masculinos profissionais em fundo escuro, sem texto nem marcas.

Arquivos finais:

- `design-prototype/public/assets/barbershop-cover.png`.
- `design-prototype/public/assets/professional-joao.png`.
- `design-prototype/public/assets/professional-lucas.png`.
- `design-prototype/public/assets/professional-marcos.png`.

## 10. Próximas etapas após aprovação

1. Consolidar feedback visual do protótipo.
2. Ajustar tokens e componentes aprovados.
3. Migrar primeiro o shell administrativo.
4. Migrar dashboard, agenda e clientes.
5. Migrar cadastros e negócio.
6. Migrar autenticação, landing e fluxo público.
7. Integrar dados reais sem alterar contratos atuais.
8. Executar testes funcionais e regressivos.
9. Validar tema escuro e responsividade.
10. Atualizar documentação técnica e acadêmica.

## 11. Riscos e cuidados

- Não misturar protótipo e frontend real antes da aprovação.
- Preservar todas as regras de agendamento e segurança.
- Não transformar dados simulados em dependências de produção.
- Migrar tela por tela para evitar uma refatoração impossível de revisar.
- Manter estados de carregamento, erro, vazio e confirmação.
- Verificar contraste real após a integração no navegador final.

## 12. Mensagem de commit sugerida

```text
feat(design): adiciona protótipo profissional completo do Agendai
```
