# Operacao LGPD

Este procedimento deve ser seguido por quem opera o Agendai. Nao registre o conteudo de pedidos em planilhas ou canais pessoais; use a tabela `solicitacoes_lgpd` e o ticket interno restrito da operacao.

## Solicitacoes de titulares

1. Receba o pedido pelo formulario em `/privacidade`; o endpoint limita cinco envios por IP por hora.
2. Registre o recebimento e associe o negocio quando informado. Se a solicitacao envolver cliente de um negocio, encaminhe ao contato de privacidade cadastrado pelo negocio sem expor dados adicionais.
3. Antes de revelar, corrigir, exportar ou eliminar dados, valide a identidade pelo e-mail ou telefone associado ao agendamento e solicite somente a informacao indispensavel.
4. Analise a base legal, obrigacoes de guarda e impacto em outros titulares. Nao elimine dados que ainda devam ser conservados; aplique bloqueio ou anonimizacao quando cabivel e explique a decisao.
5. Atualize `status` para `em_analise`, `concluida` ou `recusada`, preenchendo `concluida_at` nos estados finais. A resposta deve ser enviada pelo e-mail informado.
6. Preserve apenas a evidencia necessaria da decisao e siga a retencao do canal.

## Retencao mensal

Agendamentos cancelados ou concluidos com mais de 730 dias sao anonimizados. Solicitações concluidas ou recusadas com mais de 1.825 dias sao eliminadas. Execute uma vez por mes, em ambiente com `DATABASE_URL` de producao configurada:

```bash
cd backend
npm run privacy:retention -- --confirm-retention
```

Registre em ticket interno a data, o operador, a saida resumida e qualquer erro. Os prazos podem ser ajustados pelas variaveis `LGPD_AGENDAMENTOS_RETENCAO_DIAS` e `LGPD_SOLICITACOES_RETENCAO_DIAS`, entre 30 e 3.650 dias, apos avaliacao juridica.

Antes de alterar qualquer prazo, finalidade, fornecedor ou compartilhamento, atualize a Politica de Privacidade, incremente a versao do aviso registrada nos novos agendamentos e preserve a versao anterior como evidencia para os registros ja existentes.

## Pedido individual de eliminacao

Depois de confirmar identidade e negocio controlador, anonimize os agendamentos correspondentes ao e-mail do titular:

```bash
cd backend
npm run privacy:anonymize -- --negocio-id=123 --email=titular@exemplo.com --confirm-anonymize
```

O comando remove nome identificavel, telefone, e-mail, observacoes e token de gerenciamento dos agendamentos encontrados. Ele nao deve ser executado por dados informados apenas em uma requisicao nao verificada.

## Incidente de seguranca

1. Conter o acesso, preservar evidencias e revogar credenciais ou tokens afetados.
2. Avaliar titulares, categorias de dados, volume, impacto e medidas de mitigacao.
3. Acionar responsavel juridico e de seguranca para avaliar comunicacao a ANPD e aos titulares nos termos aplicaveis.
4. Documentar causa, cronologia, decisao, notificacoes e acoes preventivas.

## Fornecedores e revisao

Mantenha inventario dos fornecedores, finalidade, regiao de tratamento, contrato, DPA e responsavel pela revisao. Reavalie esse inventario antes de adicionar integracoes, analytics, e-mail, WhatsApp, armazenamento de arquivos ou qualquer novo provedor.
