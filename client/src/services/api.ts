const getBaseUrl = (): string => {
  const envApi = import.meta.env.VITE_API_URL;
  if (!envApi) return '/api/v1';
  const trimmed = envApi.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api/v1') && !trimmed.endsWith('/api')) {
    return `${trimmed}/api/v1`;
  }
  return trimmed;
};

const BASE_URL = getBaseUrl();

export function getMediaUrl(mediaPath?: string | null): string {
  if (!mediaPath) return '';
  if (
    mediaPath.startsWith('http://') ||
    mediaPath.startsWith('https://') ||
    mediaPath.startsWith('blob:') ||
    mediaPath.startsWith('data:')
  ) {
    return mediaPath;
  }
  const rawApi = import.meta.env.VITE_API_URL;
  if (rawApi) {
    const origin = rawApi.trim().replace(/\/api(\/v1)?\/?$/, '');
    return `${origin}${mediaPath.startsWith('/') ? mediaPath : `/${mediaPath}`}`;
  }
  return mediaPath;
}

class ApiClient {
  private getAccessToken(): string | null {
    return localStorage.getItem('live_access_token');
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('live_refresh_token');
  }

  private setTokens(access: string, refresh?: string) {
    localStorage.setItem('live_access_token', access);
    if (refresh) localStorage.setItem('live_refresh_token', refresh);
  }

  clearTokens() {
    localStorage.removeItem('live_access_token');
    localStorage.removeItem('live_refresh_token');
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${BASE_URL}${cleanEndpoint}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token expiration & automatic refresh
    if (response.status === 401 && this.getRefreshToken()) {
      const refreshToken = this.getRefreshToken();
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const data = await refreshRes.json();
          this.setTokens(data.accessToken, data.refreshToken);
          headers['Authorization'] = `Bearer ${data.accessToken}`;

          // Retry original request
          response = await fetch(url, {
            ...options,
            headers,
          });
        } else {
          this.clearTokens();
          window.dispatchEvent(new CustomEvent('auth-expired'));
        }
      } catch {
        this.clearTokens();
        window.dispatchEvent(new CustomEvent('auth-expired'));
      }
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  get<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  post<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers,
    });
  }

  put<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers,
    });
  }

  patch<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers,
    });
  }

  delete<T = any>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const api = new ApiClient();

