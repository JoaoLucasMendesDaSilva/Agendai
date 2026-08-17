# Migração MySQL -> PostgreSQL

## Objetivo
Migrar o backend Node.js + Express do MySQL (Railway) para PostgreSQL (Supabase).

## Banco

Supabase
Projeto:
ldjzrxcsvrysaclboyeh

Região:
São Paulo

## Alterações planejadas

- Converter schema MySQL para PostgreSQL
- Trocar mysql2 por pg
- Adaptar database.js
- Adaptar todas as queries (? -> $1)
- Testar backend
- Deploy no Render

## Status

[x] Schema convertido
[ ] Banco importado (execute as migrations PostgreSQL no Supabase)
[x] Backend convertido
[x] Queries convertidas
[x] Testes concluídos (suíte backend local)
[ ] Deploy no Render (configuração pronta; aguarda envio ao GitHub e criação do serviço)
