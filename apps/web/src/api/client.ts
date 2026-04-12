import type {
  DashboardResponse,
  DishSlot,
  AdminStats,
  AdminRestaurant,
} from '@menuar/types'

// Empty string = use Vite proxy in dev (avoids CORS on HTTPS).
// Set VITE_API_URL to deployed URL in production.
const API_URL = import.meta.env.VITE_API_URL || ''
const IS_DEV = import.meta.env.DEV

function devLog(label: string, ...args: unknown[]) {
  if (IS_DEV) console.log(`%c[API] ${label}`, 'color:#2563eb;font-weight:bold', ...args)
}
function devWarn(label: string, ...args: unknown[]) {
  if (IS_DEV) console.warn(`%c[API] ${label}`, 'color:#f59e0b;font-weight:bold', ...args)
}
function devError(label: string, ...args: unknown[]) {
  if (IS_DEV) console.error(`%c[API] ${label}`, 'color:#ef4444;font-weight:bold', ...args)
}

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string },
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
  }

  const fullUrl = `${API_URL}${path}`
  const method = options?.method ?? 'GET'
  devLog(`→ ${method} ${fullUrl}`, { hasToken: !!options?.token })

  let res: Response
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers: { ...headers, ...(options?.headers as Record<string, string>) },
    })
  } catch (networkErr) {
    devError(`Network failure ${method} ${fullUrl}`, networkErr)
    throw new Error(`Network error — is the API server running on port 3001? (${(networkErr as Error).message})`)
  }

  devLog(`← ${res.status} ${res.statusText} ${fullUrl}`)

  if (!res.ok) {
    // Read raw text first so we can log it even if it's not JSON
    const rawText = await res.text().catch(() => '')
    devWarn(`Error response body (${res.status}):`, rawText)

    let body: { error?: string; code?: string } = {}
    try {
      body = JSON.parse(rawText)
    } catch {
      devError('Response was not JSON — possible HTML error page or proxy failure', {
        status: res.status,
        url: fullUrl,
        preview: rawText.slice(0, 300),
      })
      // Give a meaningful message based on status
      const statusMsg =
        res.status === 401 ? 'Not authenticated — please sign in again' :
        res.status === 403 ? 'Access denied' :
        res.status === 404 ? 'API endpoint not found — check the API server' :
        res.status === 502 || res.status === 503 ? 'API server is not reachable — is it running on port 3001?' :
        `Server error (HTTP ${res.status})`
      throw Object.assign(new Error(statusMsg), { code: 'HTTP_ERROR', status: res.status })
    }

    devError('API error:', { code: body.code, error: body.error, status: res.status })
    throw Object.assign(new Error(body.error || `Request failed (${res.status})`), {
      code: body.code,
      status: res.status,
    })
  }

  const data = await res.json() as T
  devLog(`✓ Response data for ${path}:`, data)
  return data
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

export async function createSubscription(token: string): Promise<{
  checkoutUrl: string
  razorpaySubId: string
  razorpayKeyId: string
}> {
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

export async function updateProfile(
  token: string,
  data: { ownerName?: string; restaurantName?: string },
): Promise<{ ok: boolean }> {
  return apiFetch('/api/v1/restaurant/profile', {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  })
}

export async function uploadSlotPhotos(
  token: string,
  slotNumber: number,
  anglePhotos: File[],
  meta?: { dishName?: string; description?: string; price?: string; isVeg?: string; menuPhoto?: File },
): Promise<{ slotNumber: number; menuPhotoUrl?: string; photoKeys: string[]; status: string }> {
  const formData = new FormData()
  anglePhotos.forEach((f) => formData.append('photos', f))
  if (meta?.menuPhoto) formData.append('menuPhoto', meta.menuPhoto)
  if (meta?.dishName) formData.append('dishName', meta.dishName)
  if (meta?.description) formData.append('description', meta.description)
  if (meta?.price) formData.append('price', meta.price)
  if (meta?.isVeg !== undefined) formData.append('isVeg', meta.isVeg)

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
