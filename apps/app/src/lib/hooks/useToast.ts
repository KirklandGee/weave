import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  dismissible?: boolean
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  clearToasts: () => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: Math.random().toString(36).substring(2, 15),
        },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}))

export const useToast = () => {
  const { addToast, removeToast } = useToastStore()

  const toast = {
    success: (message: string, options?: { duration?: number }) =>
      addToast({ message, type: 'success', duration: options?.duration ?? 3000 }),
    error: (message: string, options?: { duration?: number }) =>
      addToast({ message, type: 'error', duration: options?.duration ?? 5000 }),
    warning: (message: string, options?: { duration?: number }) =>
      addToast({ message, type: 'warning', duration: options?.duration ?? 4000 }),
    info: (message: string, options?: { duration?: number }) =>
      addToast({ message, type: 'info', duration: options?.duration ?? 3000 }),
  }

  return { toast, removeToast }
}