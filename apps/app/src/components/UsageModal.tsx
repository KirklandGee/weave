'use client'

import { useState, useEffect } from 'react'
import { X, Activity, DollarSign, MessageSquare, Brain, TrendingUp } from 'lucide-react'
import { useUsage } from '@/lib/hooks/useUsage'

interface UsageModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UsageModal({ isOpen, onClose }: UsageModalProps) {
  const { summary, history, loading, error, fetchUsageHistory } = useUsage()
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (isOpen && !history) {
      fetchUsageHistory()
    }
  }, [isOpen, history, fetchUsageHistory])

  if (!isOpen) return null

  const formatCurrency = (amount: number | string) => `$${Number(amount).toFixed(2)}`
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUsageColor = (percentage: number) => {
    const pct = Number(percentage)
    if (pct >= 90) return 'text-red-400 bg-red-400/10'
    if (pct >= 75) return 'text-yellow-400 bg-yellow-400/10'
    return 'text-green-400 bg-green-400/10'
  }

  const getProgressColor = (percentage: number) => {
    const pct = Number(percentage)
    if (pct >= 90) return 'bg-red-500'
    if (pct >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">LLM Usage</h2>
          </div>
          <button
            title="LLM Usage button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && !summary && (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-zinc-400">Loading usage data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-400">Error: {error}</p>
            </div>
          )}

          {summary && (
            <>
              {/* Usage Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-zinc-400 text-sm">Current Usage</span>
                  </div>
                  <p className="text-white text-lg font-semibold">
                    {formatCurrency(summary.current_month_usage)}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    of {formatCurrency(summary.monthly_limit)} limit
                  </p>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span className="text-zinc-400 text-sm">Usage</span>
                  </div>
                  <p className={`text-lg font-semibold ${getUsageColor(summary.usage_percentage).split(' ')[0]}`}>
                    {Number(summary.usage_percentage).toFixed(1)}%
                  </p>
                  <p className="text-zinc-500 text-xs">of monthly limit</p>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    <span className="text-zinc-400 text-sm">Requests</span>
                  </div>
                  <p className="text-white text-lg font-semibold">
                    {summary.total_requests}
                  </p>
                  <p className="text-zinc-500 text-xs">this month</p>
                </div>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-4 h-4 text-orange-400" />
                    <span className="text-zinc-400 text-sm">Top Model</span>
                  </div>
                  <p className="text-white text-sm font-medium">
                    {summary.most_used_model || 'N/A'}
                  </p>
                  <p className="text-zinc-500 text-xs">most used</p>
                </div>
              </div>

              {/* Usage Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-zinc-300 font-medium">Monthly Usage Progress</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getUsageColor(summary.usage_percentage)}`}>
                    {formatCurrency(summary.remaining_budget)} remaining
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(summary.usage_percentage)}`}
                    style={{ width: `${Math.min(Number(summary.usage_percentage), 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* History Toggle */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                >
                  {showHistory ? 'Hide Details' : 'Show Details'}
                </button>
              </div>

              {/* Usage History Table */}
              {showHistory && history && (
                <div className="bg-zinc-800/30 border border-zinc-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="text-left p-3 text-zinc-400 font-medium text-sm">Date</th>
                          <th className="text-left p-3 text-zinc-400 font-medium text-sm">Model</th>
                          <th className="text-right p-3 text-zinc-400 font-medium text-sm">Tokens</th>
                          <th className="text-right p-3 text-zinc-400 font-medium text-sm">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.events.slice(0, 10).map((event, index) => (
                          <tr key={index} className="border-b border-zinc-800 last:border-b-0">
                            <td className="p-3 text-zinc-300 text-sm">{formatDate(event.timestamp)}</td>
                            <td className="p-3 text-zinc-300 text-sm">{event.model}</td>
                            <td className="p-3 text-zinc-300 text-sm text-right">
                              {(event.input_tokens + event.output_tokens).toLocaleString()}
                            </td>
                            <td className="p-3 text-zinc-300 text-sm text-right font-medium">
                              {formatCurrency(event.cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {history.events.length > 10 && (
                    <div className="p-3 text-center border-t border-zinc-700">
                      <span className="text-zinc-500 text-sm">
                        Showing 10 of {history.total_events} recent events
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}