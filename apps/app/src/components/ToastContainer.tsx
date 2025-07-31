'use client'
import React, { useEffect } from 'react'
import { useToastStore } from '@/lib/hooks/useToast'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore()

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 max-w-md w-full">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: {
    id: string
    message: string
    type: 'success' | 'error' | 'warning' | 'info'
    duration?: number
    dismissible?: boolean
  }
  onRemove: () => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const { message, type, duration = 3000, dismissible = true } = toast

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onRemove()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [duration, onRemove])

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <Info className="w-5 h-5 text-amber-500" />
    }
  }

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'info':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    }
  }

  return (
    <div
      className={`
        relative flex items-center gap-3 p-4 rounded-lg border shadow-lg
        animate-in slide-in-from-right-full duration-300
        ${getStyles()}
      `}
    >
      {getIcon()}
      <div className="flex-1 text-sm text-gray-900 dark:text-gray-100">
        {message}
      </div>
      {dismissible && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      )}
    </div>
  )
}

export default ToastContainer