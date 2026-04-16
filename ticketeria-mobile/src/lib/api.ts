import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:3333/api';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

export class ApiClient {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('AUTH_TOKEN');
    } catch (error) {
      console.warn('Failed to retrieve auth token:', error);
      return null;
    }
  }

  private async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('REFRESH_TOKEN');
    } catch (error) {
      console.warn('Failed to retrieve refresh token:', error);
      return null;
    }
  }

  private async setAuthToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('AUTH_TOKEN', token);
    } catch (error) {
      console.warn('Failed to store auth token:', error);
    }
  }

  private async handleTokenRefresh(): Promise<boolean> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data.token) {
        await this.setAuthToken(data.token);
        return true;
      }

      return false;
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      signal?: AbortSignal;
      retry?: boolean;
    }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const authToken = await this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: options?.signal,
    };

    if (options?.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      let response = await fetch(url, fetchOptions);

      // Handle 401 with token refresh
      if (response.status === 401 && options?.retry !== false) {
        const refreshed = await this.handleTokenRefresh();
        if (refreshed) {
          const newToken = await this.getAuthToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryOptions: RequestInit = { ...fetchOptions, headers };
            response = await fetch(url, retryOptions);
          }
        }
      }

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: response.statusText,
        };

        try {
          const errorData = await response.json();
          error.message = errorData.message || error.message;
          error.code = errorData.code;
          error.details = errorData.details;
        } catch {
          // Use default error message if JSON parsing fails
        }

        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw {
          status: response.status,
          message: 'Invalid response format',
        } as ApiError;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError) {
        throw {
          status: 0,
          message: 'Network error',
          details: error.message,
        } as ApiError;
      }

      if (error && typeof error === 'object' && 'status' in error) {
        throw error as ApiError;
      }

      throw {
        status: 500,
        message: 'Unknown error',
        details: error,
      } as ApiError;
    }
  }

  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>('GET', path, { signal });
  }

  async post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>('POST', path, { body, signal });
  }

  async put<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    return this.request<T>('PUT', path, { body, signal });
  }

  async delete<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>('DELETE', path, { signal });
  }

  abort(): void {
    this.abortController?.abort();
    this.abortController = null;
  }

  createAbortSignal(): AbortSignal {
    this.abortController = new AbortController();
    return this.abortController.signal;
  }
}

export const apiClient = new ApiClient();
