---
target: landing page
total_score: 23
p0_count: 0
p1_count: 2
timestamp: 2026-07-06T18-08-44Z
slug: frontend-src-pages-landingpage-jsx
---
## Design Health Score

| # | Heurística | Nota | Problema principal |
|---|---|---:|---|
| 1 | Visibilidade do status | 2/4 | FAQ e tema comunicam estado, mas “Online”, “Atualizado” e “Sincronizado” são cenografia, não feedback real. |
| 2 | Correspondência com o mundo real | 3/4 | A proposta é clara, porém “PWA”, “XLSX” e “Dashboard inteligente” exigem tradução para parte do público. |
| 3 | Controle e liberdade | 3/4 | Desktop oferece boas rotas; no mobile, “Entrar” e atalhos de seção desaparecem. |
| 4 | Consistência e padrões | 3/4 | Componentes são coesos, mas cores semânticas aparecem como decoração nos ícones. |
| 5 | Prevenção de erros | 2/4 | “Grátis” é repetido sem explicar condições, limites ou próximos passos. |
| 6 | Reconhecimento em vez de lembrança | 3/4 | Ações principais são visíveis, mas o mobile força descoberta por rolagem e há siglas técnicas. |
| 7 | Flexibilidade e eficiência | 2/4 | Sticky nav ajuda no desktop; mobile perde login e navegação direta. |
| 8 | Estética e design minimalista | 2/4 | Nove recursos, seis termos, quatro públicos, quatro passos e três benefícios repetem informação e gramática visual. |
| 9 | Recuperação de erros | 1/4 | FAQ fechado não é semanticamente ocultado; não há estados de falha ou recuperação na navegação. |
| 10 | Ajuda e documentação | 2/4 | FAQ é útil, mas faltam preço, segurança, privacidade, suporte e contato. |
| **Total** |  | **23/40** | **Aceitável — melhorias significativas necessárias.** |

## Anti-Patterns Verdict

**A página parece moderadamente gerada por fórmula de landing SaaS.** A composição renderizada é limpa e tecnicamente competente, mas o roteiro é previsível: hero dividido com mockup, dois CTAs, três checks, faixa de palavras-chave, demonstração cenográfica, nove cards de recursos, quatro cards de público, quatro passos numerados, FAQ e CTA final.

O Agendai preserva identidade por meio do verde profundo, Poppins e linguagem acessível. Não há gradient text, glassmorphism dominante ou estética editorial genérica. Ainda assim, falta um ponto de vista específico sobre a rotina de pequenos negócios e uma prova real do produto. Sem o logotipo, a página poderia pertencer a muitos concorrentes.

O detector determinístico retornou `[]`, com **0 achados** em `frontend/src/pages/LandingPage.jsx`. Isso confirma ausência dos padrões sintáticos monitorados, mas não contradiz a avaliação visual: repetição de cards, falta de prova e narrativa genérica são problemas de direção, não violações detectáveis por regex.

Não há overlay visual confiável. A injeção mutável exigida pelo fluxo não estava disponível; foram usadas capturas reais de desktop, mobile e seções intermediárias como evidência de fallback. A renderização confirmou hero legível, mockup polido e queda de ritmo no grid de nove recursos.

## Impressão geral

A landing explica o produto com clareza e parece profissional, mas tenta provar valor enumerando capacidades em vez de demonstrar confiança. A maior oportunidade é trocar inventário de funcionalidades por uma história verificável: um cliente agenda, o conflito é evitado e o empreendedor vê a agenda atualizada.

## O que funciona

- **Hero claro e acionável:** proposta, lead e CTA comunicam o valor principal em poucos segundos.
- **Demonstração visual legível:** a seção “Do link compartilhado à agenda organizada” explica bem a relação entre cliente, validação e painel.
- **Base responsiva e acessível:** grids adaptativos, alvos confortáveis e `prefers-reduced-motion` demonstram cuidado técnico real.

## Problemas prioritários

### [P1] Confiança insuficiente no momento de conversão

**Por que importa:** “grátis”, disponibilidade 24 horas, prevenção de conflitos e relatórios com dados reais são promessas fortes, mas não há condições do plano, segurança, privacidade, suporte, cliente real ou captura verificável.

**Correção:** substituir a faixa de siglas por uma prova concreta: screenshot real com legenda, condição objetiva do acesso gratuito, bloco curto de segurança/privacidade e links de suporte, termos e privacidade no footer.

**Comando sugerido:** `$impeccable harden frontend/src/pages/LandingPage.jsx`

### [P1] FAQ fechado permanece semanticamente exposto

**Por que importa:** `aria-expanded="false"` comunica um painel fechado, mas a resposta continua na árvore de acessibilidade. Leitores de tela podem receber conteúdo que visualmente parece oculto.

**Correção:** sincronizar estado visual e semântico com `hidden={!aberta}` ou equivalente, além de `aria-labelledby` entre pergunta e resposta.

**Comando sugerido:** `$impeccable audit frontend/src/pages/LandingPage.jsx`

### [P2] Linguagem visual excessivamente formularizada

**Por que importa:** hero SaaS + mockup + grids de ícones + passos numerados tornam o produto intercambiável. A página não traduz a origem local nem a rotina concreta de quem atende clientes pelo WhatsApp.

**Correção:** adotar uma direção “agenda de balcão confiável”: captura real dominante, situações brasileiras específicas e uma composição menos simétrica. Transformar a demonstração em uma história contínua do link recebido ao horário confirmado.

**Comando sugerido:** `$impeccable bolder frontend/src/pages/LandingPage.jsx`

### [P2] Catálogo de recursos sem prioridade

**Por que importa:** nove cards iguais dão a “Dark Mode” o mesmo peso de agendamento público e bloqueio de conflitos. A captura renderizada confirma uma parede de cards que interrompe o ritmo da página.

**Correção:** promover três capacidades essenciais — agendamento público, conflito seguro e rotina administrativa — e mover PDF, Excel, PWA e tema para uma lista compacta ou disclosure.

**Comando sugerido:** `$impeccable distill frontend/src/pages/LandingPage.jsx`

### [P2] Mobile remove caminhos importantes

**Por que importa:** abaixo de 640 px, “Entrar” desaparece; abaixo de 900 px, somem os atalhos de seção. Na captura mobile restam apenas tema e “Começar grátis”, o que prejudica usuários existentes e aumenta a rolagem obrigatória.

**Correção:** manter “Entrar” em menu compacto e oferecer navegação por âncoras com alvos de 44 px. Avaliar um CTA contextual após a demonstração, sem criar barra persistente invasiva.

**Comando sugerido:** `$impeccable adapt frontend/src/pages/LandingPage.jsx`

## Persona Red Flags

### Jordan — primeira experiência

- “PWA instalável”, “XLSX” e “Dashboard inteligente” pressupõem familiaridade técnica.
- “Ver o Agendai em ação” leva a um mockup estático, não a uma experiência demonstrável.
- “Começar grátis” não explica duração da configuração, limites ou o que acontece depois.
- Não há contato ou suporte visível além do FAQ.

### Riley — teste de estresse

- “Online”, “Atualizado” e “Sincronizado” parecem estados reais dentro de uma demonstração estática.
- Promessas como “sem conflito” e “24 horas por dia” não apresentam condição, exceção ou evidência.
- O FAQ fechado pode permanecer exposto para tecnologia assistiva.
- Não há tratamento visível para falha de navegação ao cadastro ou login.

### Casey — mobile distraído

- “Entrar” e os atalhos de seção desaparecem no mobile.
- A página exige longa rolagem por nove recursos, quatro públicos, quatro passos e cinco FAQs.
- O CTA principal deixa a zona do polegar após o hero e só reaparece no fim.
- A ilustração PNG não declara dimensões no JSX, merecendo validação de layout shift e conexão lenta.

### Márcia — microempreendedora local

- A página fala de formatos e recursos antes de responder dúvidas operacionais como tempo de configuração, suporte e segurança.
- PDF, Excel, PWA e Dark Mode têm mais destaque do que resultados cotidianos como reduzir faltas e organizar o próximo atendimento.
- A ausência de preço, contato e política de suporte aumenta a percepção de risco.
- Falta uma prova de que o produto é simples para um negócio pequeno, não uma ferramenta “tech”.

## Observações menores

- O kicker “Agenda profissional. Experiência simples.” é correto, mas genérico.
- Azul e amarelo nos ícones são decorativos, contrariando a regra de honestidade semântica do design system.
- `auth-illustration.png` reaproveitada no hero parece um ativo interno, não uma peça de marca específica.
- “WhatsApp”, “QR Code” e “PWA” no footer parecem chips interativos, mas são `span`.
- O mockup usa textos pequenos que precisam de validação em zoom de 200%.
- O botão primário global em gradiente diverge do verde sólido documentado no design system.

## Perguntas a considerar

- Sem o logotipo, que detalhe faria alguém reconhecer uma solução criada para pequenos negócios de Cubatão?
- Uma empreendedora confiaria mais em nove recursos ou em ver um agendamento real entrar sem conflito?
- “Ver o Agendai em ação” deveria mostrar uma ilustração ou permitir realizar um agendamento de demonstração?
- Se “grátis” é a principal promessa de conversão, por que suas condições estão invisíveis?
- Dark Mode, PDF e Excel realmente merecem o mesmo destaque que disponibilidade e prevenção de conflitos?
