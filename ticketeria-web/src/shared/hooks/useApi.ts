import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { api, ApiResponse } from '@shared/lib/api';

export function useGet<T>(
  key: unknown[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, Error>({
    queryKey: key,
    queryFn: async () => {
      const response = await api.get<T>(endpoint);
      if (response.error) throw new Error(response.error);
      return response.data as T;
    },
    ...options,
  });
}

export function usePost<TData, TVariables>(
  endpoint: string,
  options?: UseMutationOptions<ApiResponse<TData>, Error, TVariables>
) {
  return useMutation<ApiResponse<TData>, Error, TVariables>({
    mutationFn: (variables) => api.post<TData>(endpoint, variables),
    ...options,
  });
}

export function usePut<TData, TVariables>(
  endpoint: string | ((vars: TVariables) => string),
  options?: UseMutationOptions<ApiResponse<TData>, Error, TVariables>
) {
  return useMutation<ApiResponse<TData>, Error, TVariables>({
    mutationFn: (variables) => {
      const url = typeof endpoint === 'function' ? endpoint(variables) : endpoint;
      return api.put<TData>(url, variables);
    },
    ...options,
  });
}

export function useDelete<TData, TVariables extends string>(
  endpointFn: (id: TVariables) => string,
  options?: UseMutationOptions<ApiResponse<TData>, Error, TVariables>
) {
  return useMutation<ApiResponse<TData>, Error, TVariables>({
    mutationFn: (id) => api.delete<TData>(endpointFn(id)),
    ...options,
  });
}
