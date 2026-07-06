---
name: mysql-migration-generator
description: Cria e revisa migrations MySQL incrementais, com constraints, índices, compatibilidade, integridade e estratégia segura de execução.
---

# Skill: Migrations MySQL

## Objetivo

Evoluir o banco existente de forma rastreável e segura, preservando dados e compatibilidade com a aplicação em produção.

## Antes de criar

- Ler todas as migrations anteriores e o código que consulta as tabelas afetadas.
- Confirmar versão do MySQL e convenções atuais de nomes e tipos.
- Identificar volume de dados, locks, backfill e compatibilidade entre versões da aplicação.
- Definir constraints e índices a partir das invariantes e consultas reais.

## Regras

- Criar uma nova migration ordenada; não reescrever migration já aplicada sem autorização explícita.
- Usar tipos, nullability, defaults e chaves coerentes com o domínio.
- Incluir foreign keys, `UNIQUE`, `CHECK` e índices quando sustentados por regras reais.
- Evitar `IF NOT EXISTS` quando ele puder mascarar divergência de schema.
- Não inserir dados sensíveis em seeds ou scripts.
- Separar alterações incompatíveis em etapas seguras quando necessário.
- Documentar backup, execução, validação e recuperação para mudanças destrutivas.
- Incluir rollback apenas quando ele for seguro; caso contrário, explicar a estratégia de correção progressiva.

## Verificação

- Validar schema final, constraints e índices.
- Testar em banco descartável ou ambiente apropriado antes de produção.
- Executar os testes de backend afetados.
- Conferir que consultas antigas continuam funcionando durante a implantação, quando aplicável.

## Resposta esperada

1. Arquivo e objetivo da migration.
2. SQL e decisões de modelagem.
3. Pré-requisitos, execução e validação.
4. Compatibilidade e recuperação.
5. Riscos operacionais restantes.
