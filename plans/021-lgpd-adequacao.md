# Plano de adequacao LGPD

Objetivo: permitir tratamento de dados pessoais no Agendai com transparencia, minimizacao, seguranca, atendimento de direitos e operacao verificavel.

## Entrega implementada

- [x] Mapa de dados, finalidades, papeis e bases legais em `docs/LGPD.md`.
- [x] Politica de Privacidade e Termos de Uso publicos no frontend.
- [x] Canal de solicitacoes do titular com validacao, rate limit, RLS e privilegios fechados.
- [x] Registro de ciencia documental no cadastro e no agendamento publico.
- [x] Contato de privacidade no cadastro do negocio.
- [x] Retencao por anonimização e comando confirmado para pedido individual.
- [x] Procedimento para solicitacoes, incidentes e fornecedores em `docs/OPERACAO-LGPD.md`.

## Criterios de aceite

1. Nenhum agendamento publico novo e criado sem leitura do aviso de privacidade e sem contato de privacidade configurado pelo negocio.
2. O titular pode registrar um pedido sem conta; a aplicacao nao executa exclusao por pedido nao autenticado.
3. Dados retidos alem do prazo sao anonimizados ou eliminados pela rotina operacional.
4. A nova tabela segue o mesmo isolamento de Data API das tabelas existentes.
5. A publicacao comercial somente ocorre apos as pendencias externas de `docs/LGPD.md` serem concluídas e registradas.
