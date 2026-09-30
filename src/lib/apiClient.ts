import { auth } from './firebase';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

/**
 * Retrieves the current Firebase ID token if user is signed in.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (err) {
    console.warn('[apiClient] Failed to get Firebase ID token:', err);
    return null;
  }
}

/**
 * Uniform fetch client that prepends VITE_API_BASE_URL and attaches Authorization Bearer token.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const headers = new Headers(init.headers || {});

  // Add Authorization header if available and not already set
  if (!headers.has('Authorization')) {
    const token = await getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  return fetch(url, {
    ...init,
    headers,
  });
}
