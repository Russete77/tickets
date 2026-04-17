import { env } from './env';

export const asaasConfig = {
  apiUrl: env.ASAAS_API_URL,
  apiKey: env.ASAAS_API_KEY,
  webhookSecret: env.ASAAS_WEBHOOK_SECRET,
  webhookUrl: env.ASAAS_WEBHOOK_URL || env.API_BASE_URL,
  walletId: env.ASAAS_WALLET_ID,
};

/**
 * Fetch wrapper para API do Asaas
 * Suporta uso de API key da plataforma ou de subcontas
 *
 * CRITICAL: Quando usar apiKey custom:
 * - Para operações de subconta, passar o apiKey descriptografado da subconta
 * - Para operações de plataforma, usar apiKey padrão (não passar nada)
 * - O endpoint /v3/finance/balance DEVE ser chamado com apiKey da subconta
 */
export async function asaasFetch<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    apiKey?: string;
  } = {},
): Promise<T> {
  const { method = 'GET', body, apiKey } = options;
  const key = apiKey || asaasConfig.apiKey;

  const response = await fetch(`${asaasConfig.apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: key,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    try {
      const errorData = await response.json() as { errors?: Array<{ message?: string }> };
      throw new Error(
        `Asaas API error: ${response.status} ${response.statusText} - ${errorData.errors?.[0]?.message || JSON.stringify(errorData)}`,
      );
    } catch (parseError) {
      throw new Error(
        `Asaas API error: ${response.status} ${response.statusText}`,
      );
    }
  }

  return response.json() as Promise<T>;
}
