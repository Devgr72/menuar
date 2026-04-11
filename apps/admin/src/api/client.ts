import type { AdminStats, AdminRestaurant, DishSlot } from '@menuar/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || ''

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN' }))
    throw Object.assign(new Error(body.error || 'Request failed'), {
      code: body.code,
      status: res.status,
    })
  }

  return res.json() as Promise<T>
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminStats(token: string): Promise<AdminStats> {
  return apiFetch('/api/v1/admin/stats', { token })
}

export async function getAdminRestaurants(
  token: string,
  params?: { status?: 'all' | 'paid' | 'lead'; page?: number },
): Promise<{ data: AdminRestaurant[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  return apiFetch(`/api/v1/admin/restaurants?${qs}`, { token })
}

export async function getRestaurantSlots(
  token: string,
  restaurantId: string,
): Promise<{ slots: DishSlot[] }> {
  return apiFetch(`/api/v1/admin/restaurants/${restaurantId}/slots`, { token })
}

export async function uploadSlotGLB(
  token: string,
  slotId: string,
  glbFile: File,
  meta: { dishName?: string; description?: string; ingredients?: string; price?: number; isVeg?: boolean },
): Promise<{ slotId: string; glbUrl: string; status: string }> {
  // We need to use standard fetch for file uploads, overriding Content-Type 
  // so browser boundary forms correctly.
  const formData = new FormData()
  formData.append('glb', glbFile)
  if (meta.dishName) formData.append('dishName', meta.dishName)
  if (meta.description) formData.append('description', meta.description)
  if (meta.ingredients) formData.append('ingredients', meta.ingredients)
  if (meta.price !== undefined) formData.append('price', String(meta.price))
  if (meta.isVeg !== undefined) formData.append('isVeg', String(meta.isVeg))

  const res = await fetch(`${API_URL}/api/v1/admin/slots/${slotId}/glb`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(body.error)
  }

  return res.json()
}

export async function updateSlotMeta(
  token: string,
  slotId: string,
  data: { dishName?: string; description?: string; ingredients?: string; price?: number; isVeg?: boolean },
) {
  return apiFetch(`/api/v1/admin/slots/${slotId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(data),
  })
}

export async function getAdminEvents(token: string) {
  return apiFetch<{ events: unknown[] }>('/api/v1/admin/events', { token })
}
