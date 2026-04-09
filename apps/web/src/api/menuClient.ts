import type { ApiSuccess, MenuResponse } from '@menuar/types';

const API_URL = import.meta.env.VITE_API_URL || '';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText, code: 'UNKNOWN' }));
    throw new Error(err.error ?? 'API error');
  }
  const json: ApiSuccess<T> = await res.json();
  return json.data;
}

export const menuClient = {
  getMenu: (restaurantSlug: string) =>
    apiFetch<MenuResponse>(`/api/v1/menu/${restaurantSlug}`),
};
