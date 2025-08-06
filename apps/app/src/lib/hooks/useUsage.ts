import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAuthFetch } from '@/utils/authFetch.client'

export interface UsageSummary {
  user_id: string
  current_month_usage: string | number
  monthly_limit: string | number
  remaining_budget: string | number
  usage_percentage: number
  total_requests: number
  most_used_model: string | null
}

export interface UsageEvent {
  timestamp: string
  model: string
  input_tokens: number
  output_tokens: number
  cost: string | number
}

export interface UsageHistory {
  user_id: string
  events: UsageEvent[]
  total_events: number
}

export function useUsage() {
  const { user } = useUser()
  const authFetch = useAuthFetch()
  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [history, setHistory] = useState<UsageHistory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsageSummary = useCallback(async () => {
    if (!user?.id || !authFetch) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await authFetch(`/api/admin/users/${user.id}/usage`)

      if (!response.ok) {
        throw new Error(`Failed to fetch usage summary: ${response.statusText}`)
      }

      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage summary')
    } finally {
      setLoading(false)
    }
  }, [user?.id, authFetch])

  const fetchUsageHistory = async (limit = 50) => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await authFetch(`/api/admin/users/${user.id}/usage/history?limit=${limit}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch usage history: ${response.statusText}`)
      }

      const data = await response.json()
      setHistory(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage history')
    } finally {
      setLoading(false)
    }
  }

  const refreshUsage = async () => {
    await fetchUsageSummary()
    await fetchUsageHistory()
  }

  useEffect(() => {
    if (user?.id) {
      fetchUsageSummary()
    }
  }, [user?.id, fetchUsageSummary])

  return {
    summary,
    history,
    loading,
    error,
    fetchUsageSummary,
    fetchUsageHistory,
    refreshUsage
  }
}