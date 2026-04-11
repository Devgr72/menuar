import { useState, useEffect, useCallback } from 'react'
// Custom token fetcher
const getCustomToken = async () => typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
import { getAdminStats, getAdminRestaurants, getAdminEvents } from '../api/client'
import type { AdminStats, AdminRestaurant } from '@menuar/types'

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const token = await getCustomToken()
    if (!token) return
    const result = await getAdminStats(token)
    setStats(result)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { stats, loading, refetch: fetch }
}

export function useAdminRestaurants(filter: 'all' | 'paid' | 'lead' = 'all') {
  const [restaurants, setRestaurants] = useState<AdminRestaurant[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetch = useCallback(async (p = 1) => {
    const token = await getCustomToken()
    if (!token) return
    setLoading(true)
    const result = await getAdminRestaurants(token, { status: filter, page: p })
    setRestaurants(result.data)
    setTotal(result.total)
    setPage(result.page)
    setLoading(false)
  }, [filter])

  useEffect(() => { fetch(1) }, [fetch])

  return { restaurants, total, page, loading, refetch: fetch, goToPage: fetch }
}

export function useAdminEvents() {
  const [events, setEvents] = useState<unknown[]>([])

  useEffect(() => {
    getCustomToken().then((token) => {
      if (!token) return
      getAdminEvents(token).then((r) => setEvents(r.events))
    })
  }, [])

  return { events }
}
