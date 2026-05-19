# Política de Privacidade e Proteção de Dados — PulsePass

> **STATUS: ESQUELETO — pendente de revisão jurídica.**
> Este documento é um template técnico gerado pela engenharia (Fase 2.5).
> NÃO use em produção sem revisão de advogado especializado em LGPD.

## 1. Controlador

- Razão social: _[preencher]_
- CNPJ: _[preencher]_
- Encarregado (DPO): _[nome / email de contato]_

## 2. Dados pessoais tratados

| Categoria | Campos | Base legal (LGPD art. 7º) |
|---|---|---|
| Identificação | nome, CPF, e-mail, telefone | Execução de contrato |
| Transacional | pedidos, ingressos, transações cashless | Execução de contrato |
| Técnico | IP, device fingerprint, logs de auditoria | Legítimo interesse (antifraude) |
| Autenticação | hash de senha, segredo TOTP | Execução de contrato |

## 3. Finalidades

- Emissão e validação de ingressos
- Processamento de pagamentos e cashless
- Prevenção a fraude (riskScore, detecção de duplicidade)
- Comunicações transacionais

## 4. Direitos do titular (art. 18)

Implementados no produto:

- **Acesso / portabilidade:** `GET /api/v1/lgpd/me/export` — gera ZIP com
  `profile`, `tickets`, `orders`, `transactions`, `audit-trail`. Link por
  e-mail válido por 24h.
- **Eliminação / anonimização:** `DELETE /api/v1/lgpd/me` — anonimiza PII
  de forma irreversível (substituição por `[REDACTED-…]`), preservando
  integridade referencial de registros financeiros. Exige reautenticação
  (senha + 2FA quando ativo).

## 5. Retenção

- Dados financeiros: retidos pelo prazo legal/fiscal mesmo após anonimização
  da identidade (registros mantidos, PII removida).
- Logs de auditoria: _[definir prazo]_.

## 6. Compartilhamento com terceiros

- Gateway de pagamento (Asaas / Pagar.me)
- Envio de e-mail (Resend)
- Armazenamento de objetos (Cloudflare R2)
- _[completar com DPAs assinados]_

## 7. Segurança

- Senhas com hash bcrypt; segredos TOTP por ingresso/usuário
- Transporte TLS; tokens JWT RS256
- Antifraude proativo (worker de detecção + riskScore)

## 8. Itens pendentes (bloqueadores humanos)

- [ ] Revisão jurídica completa
- [ ] DPA assinado com cada subprocessador
- [ ] Definição de prazos de retenção
- [ ] Canal oficial do titular / DPO
- [ ] Registro de operações de tratamento (ROPA)
