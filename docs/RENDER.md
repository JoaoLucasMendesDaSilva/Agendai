# Backend no Render

O arquivo `render.yaml` cria o serviço `agendai-api` a partir da pasta `backend`.

## Criar o serviço

1. Envie as alterações ao repositório GitHub.
2. No Render, selecione **New > Blueprint** e escolha o repositório.
3. Informe `DATABASE_URL` quando o Render solicitar a variável secreta. Use a URI do **Shared pooler** do Supabase; não envie nem versione essa URI.
4. Conclua o deploy e abra `https://<servico>.onrender.com/api/health`.

O `JWT_SECRET` é gerado pelo Render. O CORS inicial permite somente `https://tcc-agendamento.vercel.app`.

## Vercel

Depois do primeiro deploy, configure na Vercel:

```env
VITE_API_URL=https://<servico>.onrender.com
```

Salve e faça novo deploy do frontend.

## Limitação do plano gratuito

O plano gratuito não usa disco persistente. Logos e banners enviados para a API podem ser perdidos após reinício, suspensão ou novo deploy. Cadastre-os novamente se isso ocorrer.

## Smoke test

1. `GET /api/health` retorna `status: ok`.
2. Cadastro e login funcionam.
3. Criação de negócio, serviço, profissional e agendamento público funciona.
4. Frontend Vercel chama a URL Render sem erro de CORS.
