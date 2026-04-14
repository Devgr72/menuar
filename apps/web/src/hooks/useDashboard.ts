import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import { getDashboard } from '../api/client'
import type { DashboardResponse } from '@menuar/types'

const POLL_INTERVAL_MS = 10_000

export function useDashboard() {
  const { getToken } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (showLoading: boolean) => {
    try {
      if (showLoading) setLoading(true)
      setError(null)
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const result = await getDashboard(token)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    loadData(true)
    const interval = setInterval(() => loadData(false), POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [loadData])

  return { data, loading, error, refetch: () => loadData(true) }
}
