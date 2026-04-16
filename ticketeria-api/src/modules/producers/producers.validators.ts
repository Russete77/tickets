import { z } from 'zod';

/**
 * Validadores Zod para o módulo de produtores
 * Alinhado com documentação oficial da API Asaas v3
 */

export const registerProducerSchema = z.object({
  // Dados da pessoa/empresa (requeridos)
  companyName: z
    .string()
    .min(3, 'Nome da empresa deve ter pelo menos 3 caracteres')
    .max(255, 'Nome da empresa muito longo'),

  cpfCnpj: z
    .string()
    .regex(/^\d{11,14}$/, 'CPF/CNPJ deve conter 11 ou 14 dígitos')
    .optional()
    .describe('Se não fornecido, usará CPF do usuário'),

  companyType: z.enum(['MEI', 'ME', 'EPP', 'LTDA', 'SA', 'INDIVIDUAL'], {
    errorMap: () => ({ message: 'Tipo de empresa inválido. Valores aceitos: MEI, ME, EPP, LTDA, SA, INDIVIDUAL' }),
  }),

  // Dados de contato (requeridos no Asaas)
  email: z
    .string()
    .email('Email inválido')
    .optional()
    .describe('Se não fornecido, usará email do usuário'),

  mobilePhone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone móvel deve conter 10 ou 11 dígitos')
    .optional()
    .describe('Se não fornecido, usará telefone do usuário'),

  phone: z
    .string()
    .regex(/^\d{10,11}$/, 'Telefone deve conter 10 ou 11 dígitos')
    .optional(),

  // Dados de endereço (requeridos no Asaas)
  address: z
    .string()
    .min(3, 'Endereço deve ter pelo menos 3 caracteres')
    .max(255, 'Endereço muito longo'),

  addressNumber: z
    .string()
    .max(10, 'Número do endereço inválido'),

  complement: z
    .string()
    .max(255, 'Complemento muito longo')
    .optional(),

  province: z
    .string()
    .min(3, 'Bairro deve ter pelo menos 3 caracteres')
    .max(100, 'Bairro muito longo')
    .describe('Bairro/região'),

  city: z
    .string()
    .min(3, 'Cidade deve ter pelo menos 3 caracteres')
    .max(100, 'Cidade muito longa'),

  state: z
    .string()
    .regex(/^[A-Z]{2}$/, 'Estado deve ser uma sigla válida (ex: SP, RJ)')
    .optional()
    .describe('Sigla do estado. Se não fornecido, será inferido do CEP'),

  postalCode: z
    .string()
    .regex(/^\d{8}$/, 'CEP deve conter 8 dígitos')
    .describe('CEP sem formatação'),

  // Dados financeiros (requeridos no Asaas)
  incomeValue: z
    .number()
    .positive('Renda mensal deve ser positiva')
    .describe('Renda mensal estimada em BRL'),

  // Dados opcionais
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de nascimento deve estar no formato YYYY-MM-DD')
    .optional(),

  site: z
    .string()
    .url('URL do site inválida')
    .optional(),

  // Dados de conta bancária (opcionais)
  bankAccount: z.object({
    bankCode: z
      .string()
      .regex(/^\d{3}$/, 'Código do banco deve conter 3 dígitos'),
    branchCode: z
      .string()
      .max(8, 'Agência inválida'),
    accountNumber: z
      .string()
      .max(20, 'Número da conta inválido'),
    accountType: z.enum(['CHECKING', 'SAVINGS'], {
      errorMap: () => ({ message: 'Tipo de conta inválido' }),
    }),
    accountHolder: z
      .string()
      .max(255, 'Nome do titular muito longo'),
  }).optional(),
});

/**
 * Schema para obtenção de saldo financeiro
 */
export const getFinancialSummaryQuerySchema = z.object({
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial deve estar no formato YYYY-MM-DD')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final deve estar no formato YYYY-MM-DD')
    .optional(),
});

/**
 * Schema para solicitação de saque/transferência
 */
export const requestWithdrawalSchema = z.object({
  amount: z
    .number()
    .positive('Valor deve ser maior que zero')
    .min(0.01, 'Valor mínimo é R$ 0.01'),
});

/**
 * Schema para extrato financeiro
 */
export const getStatementQuerySchema = z.object({
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inicial deve estar no formato YYYY-MM-DD'),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data final deve estar no formato YYYY-MM-DD'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .optional(),
});

// Type exports
export type RegisterProducerInput = z.infer<typeof registerProducerSchema>;
export type GetFinancialSummaryQuery = z.infer<typeof getFinancialSummaryQuerySchema>;
export type RequestWithdrawalInput = z.infer<typeof requestWithdrawalSchema>;
export type GetStatementQuery = z.infer<typeof getStatementQuerySchema>;
