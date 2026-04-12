import { useState, useEffect, useCallback } from 'react'
import { getAdminStats, getAdminRestaurants } from '../api/client'
import type { AdminStats, AdminRestaurant } from '@menuar/types'

export function useAdminStats(token: string | null) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const result = await getAdminStats(token)
      setStats(result)
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
    } finally {
      setLoading(false)
    }
  }, [token, filter])

  useEffect(() => { fetch(1) }, [fetch])

  return { restaurants, total, page, loading, refetch: fetch, goToPage: fetch }
}
