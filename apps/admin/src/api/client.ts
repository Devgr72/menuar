import type { AdminStats, AdminRestaurant, DishSlot, Inquiry, InquiryStatus } from '@menuar/types'

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
): Promise<{ slot: unknown }> {
  return apiFetch(`/api/v1/admin/slots/${slotId}`, {
    method: 'PUT',
    token,
    body: JSON.stringify(data),
  })
}

export async function getPaymentEvents(page = 1, limit = 50) {
  return apiFetch<{
    events: Array<{
      id: string
      eventType: string
      createdAt: string
      razorpayEventId: string
      subscription: {
        id: string
        status: string
        amount: number
        planType: string
        restaurant: { name: string; slug: string } | null
        owner: { ownerName: string; email: string } | null
      } | null
    }>
    total: number
    page: number
    limit: number
  }>(`/api/v1/admin/events?page=${page}&limit=${limit}`)
}

// ==========================================
// PARTNER MANAGEMENT
// ==========================================

export async function getPartners(params: { page?: number; limit?: number; search?: string; status?: string }) {
  const query = new URLSearchParams();
  if (params.page) query.append('page', params.page.toString());
  if (params.limit) query.append('limit', params.limit.toString());
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  
  return apiFetch<any>(`/api/v1/admin/partners?${query.toString()}`);
}

export async function getPartnerDetails(partnerId: string) {
  return apiFetch<any>(`/api/v1/admin/partners/${partnerId}`);
}

export async function getPartnerRestaurants(partnerId: string) {
  return apiFetch<any>(`/api/v1/admin/partners/${partnerId}/restaurants`);
}

export async function getPartnerCommissions(partnerId: string) {
  return apiFetch<any>(`/api/v1/admin/partners/${partnerId}/commissions`);
}

export async function getPartnerPayouts(partnerId: string) {
  return apiFetch<any>(`/api/v1/admin/partners/${partnerId}/payouts`);
}

export async function updatePartnerStatus(partnerId: string, status: string) {
  return apiFetch<any>(`/api/v1/admin/partners/${partnerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function createPartnerPayout(partnerId: string, payload: { amount: number; commissionIds: string[]; referenceId?: string }) {
  return apiFetch<any>(`/api/v1/admin/partners/${partnerId}/payouts`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function regenerateQR(token: string, restaurantId: string): Promise<{ qrUrl: string; arUrl: string }> {
  return apiFetch(`/api/v1/admin/restaurants/${restaurantId}/regenerate-qr`, { method: 'POST', token })
}

// ─── Inquiries ────────────────────────────────────────────────────────────────

export async function getAdminInquiries(
  token: string,
  params?: { type?: 'contact' | 'newsletter'; status?: InquiryStatus; page?: number },
): Promise<{ data: Inquiry[]; total: number; page: number; limit: number }> {
  const qs = new URLSearchParams()
  if (params?.type) qs.set('type', params.type)
  if (params?.status) qs.set('status', params.status)
  if (params?.page) qs.set('page', String(params.page))
  return apiFetch(`/api/v1/admin/inquiries?${qs}`, { token })
}

export async function updateInquiryStatus(
  token: string,
  id: string,
  status: InquiryStatus,
): Promise<{ inquiry: Inquiry }> {
  return apiFetch(`/api/v1/admin/inquiries/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  })
}
