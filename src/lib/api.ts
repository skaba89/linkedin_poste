import { useAppStore } from '@/store/use-app-store';

interface ApiError {
  error: string;
}

class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiClientError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAppStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(path, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as ApiError;

      if (response.status === 401) {
        useAppStore.getState().logout();
        throw new ApiClientError(
          errorData.error || 'Session expirée',
          401
        );
      }

      throw new ApiClientError(
        errorData.error || `Erreur ${response.status}`,
        response.status
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiClientError) {
      throw error;
    }
    throw new ApiClientError(
      'Erreur de connexion au serveur',
      0
    );
  }
}

export { ApiClientError };
