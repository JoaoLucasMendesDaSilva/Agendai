# Adequacao LGPD

Status em 24 de agosto de 2026: os controles tecnicos e documentos deste repositorio apoiam a adequacao do Agendai a Lei 13.709/2018. A conformidade definitiva depende de informacoes externas que nao podem ser inferidas do codigo: identificacao juridica do responsavel pelo Agendai, contratos com fornecedores, definicao de responsaveis e execucao do processo operacional descrito em `OPERACAO-LGPD.md`.

## Mapa de dados

| Titular | Dados | Origem | Finalidade | Acesso |
| --- | --- | --- | --- | --- |
| Empreendedor | nome, e-mail, telefone opcional, senha protegida | cadastro | criar e manter a conta | titular e backend autenticado |
| Cliente | nome, telefone, e-mail opcional, servico, profissional, data/hora e observacoes opcionais | pagina publica | reservar, administrar e comprovar atendimento | negocio escolhido e backend autorizado |
| Profissional | nome, telefone, e-mail e especialidade | empreendedor | compor agenda e atendimento | negocio responsavel e backend autorizado |
| Negocio | nome, contato, endereco, cidade, imagens e contato de privacidade | empreendedor | pagina publica e administracao da agenda | negocio responsavel e visitantes, somente nos campos publicos |
| Titular solicitante | nome, e-mail, tipo e mensagem | canal LGPD | receber, autenticar e responder direitos | equipe responsavel pelo canal |
| Seguranca | hash de senha, hash do token de agendamento e codigo/status/metodo de erros | sistema | autenticacao, controle de acesso e prevencao a fraude | infraestrutura restrita |

Dados sensiveis nao sao necessarios ao agendamento e nao devem ser inseridos em observacoes. O aviso aparece no formulario e a coleta deve ser recusada ou removida quando identificada na triagem.

## Bases legais e papeis

| Tratamento | Base legal principal | Papel |
| --- | --- | --- |
| Conta do empreendedor | execucao de contrato e procedimentos preliminares | Agendai como controlador |
| Agendamento do cliente | execucao do atendimento e procedimentos preliminares | negocio como controlador; Agendai como operador |
| Seguranca, isolamento e prevencao a abuso | legitimo interesse, com avaliacao de necessidade | Agendai e negocio conforme o contexto |
| Retencao exigida por lei ou defesa de direitos | cumprimento de obrigacao legal ou exercicio regular de direitos | controlador aplicavel |
| Canal de direitos | cumprimento de obrigacao legal e regulatoria | Agendai como controlador do canal |

O aceite de Termos e Politica e registrado como evidencia de ciencia; ele nao substitui a base legal aplicavel ao tratamento.

## Referencias normativas

- Lei 13.709/2018, especialmente arts. 6, 7, 9, 16, 18, 37, 41, 46 e 48: [texto compilado no Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm).
- Orientacoes de atendimento de titulares e canal de contato: [ANPD](https://www.gov.br/anpd/pt-br/canais_atendimento/cidadao-titular-de-dados/denuncia-peticao-de-titular-referente-lgpd).
- Divulgacao da identidade e contato do encarregado: [guia da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/copy_of_guia_da_atuacao_do_encarregado_anpd.pdf).

## Controles implementados

- Politica em `/privacidade`, Termos em `/termos` e canal publico em `POST /api/privacidade/solicitacoes`.
- O aviso aberto a partir de um agendamento identifica o negocio controlador e seu contato de privacidade cadastrado.
- Registro de aceite documental do empreendedor e de leitura do aviso de privacidade no agendamento.
- Contato de privacidade obrigatorio para novos negocios; um negocio sem contato nao recebe novos agendamentos publicos.
- RLS, revogacao de privilegios da Data API e queries com isolamento por negocio.
- Retencao por anonimização de agendamentos finalizados ou cancelados e exclusao de solicitacoes finalizadas por rotina confirmada.
- Exclusao individual somente apos validacao de identidade, por comando administrativo auditavel.

## Documentos publicos

- [Politica de Privacidade](../frontend/src/pages/Privacidade.jsx)
- [Termos de Uso](../frontend/src/pages/Termos.jsx)
- [Procedimento operacional](OPERACAO-LGPD.md)

## Pendencias que exigem decisao externa

1. Preencher a identificacao juridica e o canal institucional do controlador Agendai antes da publicacao comercial.
2. Formalizar contratos de operador, confidencialidade e transferencia internacional com Supabase, Vercel, Render e qualquer novo fornecedor.
3. Designar pessoa responsavel pelo canal LGPD e treinar quem tratara as solicitacoes.
4. Validar este material com assessoria juridica, inclusive prazos e hipoteses de retencao aplicaveis ao segmento de cada negocio.
