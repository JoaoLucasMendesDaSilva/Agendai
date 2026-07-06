---
name: integration-notifications
description: Estrutura e revisa notificações por e-mail e WhatsApp com adaptadores seguros, modo de desenvolvimento, confiabilidade e integração progressiva com provedores reais.
---

# Skill: Integrações de Notificação

## Objetivo

Enviar comunicações úteis e confiáveis sem acoplar as regras de agendamento a um provedor específico.

## Princípios

- Separar contrato de notificação, implementação do provedor e templates.
- Usar adaptador local somente em desenvolvimento ou teste, com identificação explícita.
- Nunca hardcodar nem registrar tokens, conteúdo sensível ou dados pessoais desnecessários.
- Configurar provedores por variáveis de ambiente validadas.
- Tratar timeouts, falhas transitórias, retries limitados e idempotência.
- Definir se a entrega é síncrona ou assíncrona conforme impacto no fluxo principal.
- Não confirmar ao usuário que uma mensagem foi entregue sem evidência do provedor.
- Respeitar consentimento, finalidade, opt-out e requisitos aplicáveis de privacidade.
- Verificar assinatura e autenticidade de webhooks quando usados.

## Fluxos possíveis

```js
enviarConfirmacao(agendamento)
enviarLembrete(agendamento)
enviarAvisoDeCancelamento(agendamento)
```

Os nomes e canais devem seguir necessidades aprovadas, não esta lista como obrigação.

## Operação

- Registrar identificador, tipo, estado e erro sanitizado da tentativa.
- Evitar duplicidade em retries e reprocessamentos.
- Prever observabilidade e procedimento para falhas persistentes.
- Manter templates testáveis e conteúdo claro em português.

## Resposta esperada

1. Caso de uso e contrato definido.
2. Arquivos e adaptadores envolvidos.
3. Variáveis de ambiente e configuração segura.
4. Estratégia de falha, retry, idempotência e observabilidade.
5. Testes executados e riscos restantes.
