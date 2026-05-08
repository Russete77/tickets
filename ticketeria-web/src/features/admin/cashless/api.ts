const API = import.meta.env.VITE_API_BASE_URL ?? '/api';

export async function cashlessApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth.accessToken');
  const isFormData = init.body instanceof FormData;
  const res = await fetch(`${API}/v1${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: token ? `Bearer ${token}` : '',
      ...init.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  const json = (await res.json()) as { success: boolean; data: T };
  return json.data;
}
