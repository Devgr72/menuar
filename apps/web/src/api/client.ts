import type {
  DashboardResponse,
  DishSlot,
  AdminStats,
  AdminRestaurant,
} from '@menuar/types'

// Empty string = use Vite proxy in dev (avoids CORS on HTTPS).
// Set VITE_API_URL to deployed URL in production.
const API_URL = import.meta.env.VITE_API_URL || ''

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

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function registerRestaurant(
  token: string,
  data: { restaurantName: string; ownerName: string; email?: string },
) {
  return apiFetch('/api/v1/auth/register', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  })
}

export async function getMe(token: string) {
  return apiFetch<{
    owner: { id: string; ownerName: string; email?: string; restaurantId: string } | null
    restaurant?: { id: string; name: string; slug: string; qrUrl?: string; scanCount: number; createdAt: string }
    subscription?: { id: string; status: string; activatedAt?: string } | null
  }>('/api/v1/auth/me', { token })
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export async function createSubscription(token: string): Promise<{ checkoutUrl: string }> {
  return apiFetch('/api/v1/subscription/create', { method: 'POST', token })
}

export async function getSubscriptionStatus(token: string) {
  return apiFetch<{
    subscription: {
      id: string
      status: string
      activatedAt?: string
      nextBillingAt?: string
      haltedAt?: string
      amount: number
    } | null
  }>('/api/v1/subscription/status', { token })
}

// ─── Restaurant dashboard ─────────────────────────────────────────────────────

export async function getDashboard(token: string): Promise<DashboardResponse> {
  return apiFetch('/api/v1/restaurant/dashboard', { token })
}

export async function uploadSlotPhotos(
  token: string,
  slotNumber: number,
  files: File[],
): Promise<{ slotNumber: number; photoKeys: string[]; status: string }> {
  const formData = new FormData()
  files.forEach((f) => formData.append('photos', f))

  const res = await fetch(`${API_URL}/api/v1/restaurant/slots/${slotNumber}/photos`, {
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
  meta: { dishName?: string; description?: string; price?: number; isVeg?: boolean },
): Promise<{ slotId: string; glbUrl: string; status: string }> {
  const formData = new FormData()
  formData.append('glb', glbFile)
  if (meta.dishName) formData.append('dishName', meta.dishName)
  if (meta.description) formData.append('description', meta.description)
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
  data: { dishName?: string; description?: string; price?: number; isVeg?: boolean },
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

export async function recordQRScan(restaurantSlug: string): Promise<void> {
  // Fire-and-forget — don't await in calling code
  fetch(`${API_URL}/api/v1/menu/${restaurantSlug}/scan`, { method: 'POST' }).catch(() => {})
}
