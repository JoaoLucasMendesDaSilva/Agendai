# Correção dos P2 de acessibilidade — 10/09/2026

Base: `92cb73d`. Worktree: `Corrigir-P2-acessibilidade-final`.
Branch: `JoaoLucasMendesDaSilva/Corrigir-P2-acessibilidade-final`.

## Resultado

| Verificação | Antes | Depois |
| --- | --- | --- |
| Menor contraste mensurável do foco | 1,114:1 | 5,434:1 |
| Focos abaixo de 3:1 ou sem indicador detectável | 174/208 | 0/208 |
| Focos sem indicador detectável | 4/208 | 0/208 |
| Logos do login, mínimo no tema claro | 1,234:1 | 5,434:1 |
| Logos do login, mínimo no tema escuro | 1,151:1 | 9,213:1 |
| Nome acessível do perfil em 390×844 | Ausente (`button`) | `Menu do perfil` |
| Dimensões do perfil em 390×844 | 72×44 px | 72×44 px |

Os indicadores corrigidos usam verde opaco já existente no tema, com branco nos fundos escuros de marca. O perfil recebeu somente `aria-label`; avatar, ícones, conteúdo, handlers e layout foram preservados.

## Arquivos

- `frontend/src/styles.css`: foco base, logos, campos, seletores e upload.
- `frontend/src/professional-shell.css`: controles do painel.
- `frontend/src/professional-pages.css`: campos de busca.
- `frontend/src/professional-public.css`: campos, senha, checkbox e erro do login.
- `frontend/src/landing-page.css`: navegação, FAQ e botão sobre fundo escuro.
- `frontend/src/components/DashboardShell.jsx`: nome acessível estável.
- `frontend/src/components/DashboardShell.test.jsx`: regressão mobile com texto oculto, Enter e Escape.
- `frontend/scripts/audit-p2.mjs`: auditoria reproduzível de teclado e contraste no Chromium.
- `DESIGN.md`: substituição da orientação de foco translúcido por foco opaco.

## Verificações executadas

Node 24.14.0; npm 11.12.1; Playwright 1.63.0 já disponível no ambiente.

- `npm.cmd ci --ignore-scripts --no-audit --no-fund`: 242 pacotes instalados; lockfile preservado.
- Em `frontend`: `npm.cmd test` — 45 testes, 15 arquivos, aprovados.
- Em `frontend`: `npm.cmd run build` — aprovado.
- Em `frontend`: `npm.cmd run lint` — zero erros; dois avisos preexistentes de `react-refresh/only-export-components` em `AuthContext.jsx` e `ThemeContext.jsx`.
- `node --check frontend/scripts/audit-p2.mjs` — aprovado.
- `git diff --check` — aprovado.

Auditoria em `/`, `/login`, `/cadastro` e `/dashboard`, nos temas claro e escuro, em 390×844 e 1440×900. Foram percorridos 208 pontos de foco por Tab. Todos os indicadores finais amostrados são opacos e atingem pelo menos 3:1. Perfil abre com Enter, fecha com Escape e mantém o nome. Menu lateral mobile mantém navegação Tab/Shift+Tab e devolve foco ao fechar com Escape. Nenhuma rolagem horizontal nem erro JavaScript nas rotas auditadas. Screenshots de logos e perfil foram inspecionados visualmente.

A árvore de acessibilidade do Chromium confirmou `button` sem nome antes e `button "Menu do perfil"` depois. Remover/reaplicar apenas o atributo não alterou posição nem dimensões: x=304, y=9,5, largura=72, altura=44 px.

## Reprodução

Na worktree, iniciar:

```powershell
cd frontend
npm.cmd run dev -- --host 127.0.0.1 --port 4178 --strictPort
```

Em outro terminal, na raiz da mesma worktree:

```powershell
# Caminho da instalação de Playwright utilizada nesta execução.
$env:PLAYWRIGHT_MODULE='C:/Users/jlmen/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright'
$env:AUDIT_BASE='92cb73d'
node frontend/scripts/audit-p2.mjs
Remove-Item Env:AUDIT_BASE
node frontend/scripts/audit-p2.mjs
```

O script usa Playwright e Chromium já instalados, sem adicionar dependências ao produto. `AUDIT_BASE` recompõe as folhas CSS da revisão indicada e remove o novo nome do perfil para comparar o estado anterior. Sem essa variável, asserções exigem contraste ≥3:1, opacidade e comportamento de teclado. O cálculo usa luminância sRGB e composição alfa contra a superfície adjacente computada; não representa auditoria completa de todas as telas ou estados do produto.

## Evidências locais

Artefatos regeneráveis em `frontend/coverage/qa-p2/`, ignorados pelo Git:

- [Medições anteriores](../frontend/coverage/qa-p2/before.json) e [finais](../frontend/coverage/qa-p2/after.json).
- [Árvore acessível e dimensões do perfil](../frontend/coverage/qa-p2/profile-accessibility.json).
- [Perfil mobile claro](../frontend/coverage/qa-p2/after-profile-light-390.png) e [escuro](../frontend/coverage/qa-p2/after-profile-dark-390.png).
- [Logo desktop claro](../frontend/coverage/qa-p2/after-logo-light-1440-7.png) e [escuro](../frontend/coverage/qa-p2/after-logo-dark-1440-7.png).
- Imagens `before-*` permitem comparação com os mesmos enquadramentos.

## Segurança e limites

Revisão de segurança do diff realizada pelo agente principal: nenhum achado introduzido. Alterações restritas a apresentação, atributo acessível, testes e documentação; sem mudança de autorização, sessão, API ou persistência. Auditoria interceptou todas as chamadas à API com dados fictícios e bloqueou destinos externos. Banco, produção e lockfiles não foram alterados. Testes do backend não foram executados porque nenhum caminho do backend foi modificado. Sem revisão independente.

Orca retornou `runtime_unavailable`; não foi possível atualizar o cartão da tarefa. A validação local foi concluída. Alertas automáticos de design referem-se a estilos preexistentes fora dos dois P2; nenhuma supressão foi adicionada.
