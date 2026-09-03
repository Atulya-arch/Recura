export function getApiUrl(path: string): string {
  if (typeof window !== 'undefined') {
    const port = window.location.port;
    if (port === '3000') {
      return `http://127.0.0.1:3001${path}`;
    }
  }
  return path;
}

export async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = getApiUrl(path);
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}
