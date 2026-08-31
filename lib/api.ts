// Thin fetch wrapper for the image-service-backend API.
// Admin JWT is kept in localStorage (simple SPA auth; see README for the
// httpOnly-cookie tradeoff).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface Page<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token');
}

export function setToken(token: string) {
  window.localStorage.setItem('token', token);
}

export function clearToken() {
  window.localStorage.removeItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }
  if (auth) {
    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      throw new Error('Not authenticated');
    }
    headers.set('authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Not authenticated');
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
