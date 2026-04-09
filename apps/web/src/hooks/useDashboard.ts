import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import { getDashboard } from '../api/client'
import type { DashboardResponse } from '@menuar/types'

export function useDashboard() {
  const { getToken } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const result = await getDashboard(token)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}
