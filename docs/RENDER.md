# Backend no Render

O `render.yaml` descreve o serviço `agendai-api`, com diretório raiz `backend`,
plano gratuito, instalação por `npm ci` e inicialização por `npm start`. Esta é
configuração versionada; não comprova que um serviço esteja implantado ou que
suas variáveis estejam corretas no provedor.

## Runtime

O repositório adota Node 24 como contrato de versão principal móvel. `.nvmrc`
é usado no desenvolvimento e no CI. Como o diretório raiz do serviço Render é
`backend`, o campo `engines.node` de `backend/package.json` é a fonte do runtime
no provedor. `render.yaml` não mantém uma segunda versão exata concorrente.

## Variáveis

O Blueprint define valores públicos de ambiente e solicita os segredos sem
versioná-los. Confirme no dashboard:

- `NODE_ENV=production`;
- `TZ=America/Sao_Paulo`;
- `TRUST_PROXY_HOPS=1`, sujeito à validação da cadeia real de proxies;
- `CORS_ORIGIN` limitado aos domínios aprovados;
- `JWT_SECRET` forte, exclusivo e externo ao repositório;
- `DATABASE_URL` configurada como segredo, sem parâmetros ou fragmentos;
- `DATABASE_SSL_MODE=verify-full`;
- `DATABASE_SSL_CA` somente se uma CA confiável adicional for necessária;
- `LGPD_AGENDAMENTOS_RETENCAO_DIAS=730` e
  `LGPD_SOLICITACOES_RETENCAO_DIAS=1825`, salvo prazo revisado juridicamente;
- `UPLOAD_DIR` compatível com a estratégia de persistência aprovada.

Nunca copie conexão, senha, chave de serviço ou certificado para commits,
documentação, logs, capturas de tela ou descrições de pull request. Se TLS não
validar a identidade do servidor, interrompa o deploy e revise a cadeia de
confiança; não desabilite a verificação.

O login administrativo padrão do Supabase não é a credencial de runtime
recomendada a longo prazo. Provisionamento de um login dedicado com privilégios
mínimos e rotação da credencial existente permanecem uma operação separada e
não são declarados como concluídos aqui.

## Banco e ordem operacional

As migrations PostgreSQL ativas são 001 a 005 em
`backend/database/postgres-migrations/`. As migrations MySQL no diretório
`backend/database/migrations/` são históricas e não devem ser executadas no
Supabase.

O runner com histórico e checksums aplica somente o sufixo pendente. Em ambiente
existente, a aplicação continua deliberada: faça backup, confirme o estado do
schema, execute `npm run db:migrate -- --confirm-database=<nome-exato-do-banco>`
e valide o resultado antes de liberar a aplicação. A migration 004 fecha
privilégios da Data API e a 005 adiciona os controles de privacidade; ambas não
substituem JWT e isolamento por negócio no Express.

## Deploy e smoke test

Depois de confirmar banco e variáveis:

1. crie ou atualize o serviço pelo Blueprint;
2. confirme nos logs o runtime Node 24, instalação e inicialização;
3. verifique `GET /api/health` como liveness HTTP;
4. valide conexão ao banco por cadastro/login e um fluxo autenticado;
5. valide negócio, serviço, profissional, agendamento público e gerenciamento;
6. confirme CORS entre o frontend Vercel e o backend Render;
7. teste a estratégia de persistência de uploads após restart ou redeploy.

`/api/health` não consulta PostgreSQL e, sozinho, não comprova readiness do
banco. `/api/db-health` retorna 404 em produção e também não deve ser usado como
health check externo.

## Frontend e armazenamento

Na Vercel, `VITE_API_URL` deve apontar para o endereço HTTPS confirmado do
backend. Como toda variável `VITE_*` é pública no bundle, ela nunca pode conter
segredos.

O plano gratuito do Render não fornece disco persistente por padrão. Logo e
banner podem ser perdidos após reinício, suspensão ou novo deploy até que um
volume ou armazenamento de objetos seja aprovado e verificado. Não declare
persistência apenas porque o upload inicial funcionou.

Mantenha backup anterior às migrations e uma versão implantável da aplicação.
Não reverta RLS, revogações ou TLS verificado para recuperar disponibilidade;
uma recuperação deve preservar a barreira de segurança e seguir um plano
específico revisado.

## Privacidade

O job de retenção não deve ser incluído no processo de inicialização do web
service. Configure uma execução mensal controlada, com as mesmas variáveis de
banco do backend, para `npm run privacy:retention -- --confirm-retention` e
registre seu resultado conforme `docs/OPERACAO-LGPD.md`. A criação desse job e
o acesso às credenciais de produção dependem de aprovação operacional.
