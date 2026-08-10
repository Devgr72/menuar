import { useState, useEffect, useCallback } from 'react'
import { getAdminStats, getAdminRestaurants, getAdminInquiries } from '../api/client'
import type { AdminStats, AdminRestaurant, Inquiry } from '@menuar/types'

/**
 * A stale/invalid admin JWT (e.g. signed before JWT_SECRET was set in the API's
 * env, back when it fell back to 'fallback-secret') 401s forever otherwise —
 * drop it and reload so the user lands back on the login screen.
 */
function handleAdminAuthError(err: unknown): boolean {
  const status = (err as { status?: number } | undefined)?.status
  if (status === 401) {
    localStorage.removeItem('adminToken')
    window.location.reload()
    return true
  }
  console.error(err)
  return false
}

export function useAdminStats(token: string | null) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const result = await getAdminStats(token)
      setStats(result)
    } catch (err) {
      handleAdminAuthError(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { refetch() }, [refetch])

  return { stats, loading, refetch }
}

export function useAdminRestaurants(token: string | null, filter: 'all' | 'paid' | 'lead' = 'all') {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetch = useCallback(async (p = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const result = await getAdminRestaurants(token, { status: filter, page: p })
      setRestaurants(result.data)
      setTotal(result.total)
      setPage(result.page)
    } catch (err) {
      handleAdminAuthError(err)
    } finally {
      setLoading(false)
    }
  }, [token, filter])

  useEffect(() => { fetch(1) }, [fetch])

  return { restaurants, total, page, loading, refetch: fetch, goToPage: fetch }
}

export type InquiryFilter = 'all' | 'contact' | 'newsletter'

export function useAdminInquiries(token: string | null, filter: InquiryFilter = 'all') {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetch = useCallback(async (p = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const result = await getAdminInquiries(token, {
        type: filter === 'all' ? undefined : filter,
        page: p,
      })
      setInquiries(result.data)
      setTotal(result.total)
      setPage(result.page)
    } catch (err) {
      handleAdminAuthError(err)
    } finally {
      setLoading(false)
    }
  }, [token, filter])

  useEffect(() => { fetch(1) }, [fetch])

  return { inquiries, total, page, loading, refetch: fetch, goToPage: fetch }
}
