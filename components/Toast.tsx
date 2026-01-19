'use client'

import React, { useEffect } from 'react'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

export type ToastType = 'error' | 'success' | 'info' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  isVisible: boolean
  onClose: () => void
  duration?: number
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'error',
  isVisible,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  const icons = {
    error: <AlertCircle className="w-5 h-5" />,
    success: <CheckCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
  }

  const styles = {
    error: 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-800',
    success: 'bg-gradient-to-r from-green-50 to-green-100 border-green-300 text-green-800',
    info: 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 text-blue-800',
    warning: 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 text-yellow-800',
  }

  const iconColors = {
    error: 'text-red-600',
    success: 'text-green-600',
    info: 'text-blue-600',
    warning: 'text-yellow-600',
  }

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] animate-slide-down">
      <div
        className={`
          ${styles[type]}
          border-2 rounded-xl shadow-2xl px-5 py-4 min-w-[320px] max-w-[90vw]
          flex items-center gap-3 backdrop-blur-sm
        `}
      >
        <div className={`flex-shrink-0 ${iconColors[type]}`}>
          {icons[type]}
        </div>
        <p className="flex-1 font-semibold text-sm leading-relaxed">{message}</p>
        <button
          onClick={onClose}
          className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/10 transition-colors ${iconColors[type]}`}
          aria-label="Tutup notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface UseToastReturn {
  showToast: (message: string, type?: ToastType) => void
  toast: {
    message: string
    type: ToastType
    isVisible: boolean
  }
  hideToast: () => void
}

export const useToast = (): UseToastReturn => {
  const [toast, setToast] = React.useState<{
    message: string
    type: ToastType
    isVisible: boolean
  }>({
    message: '',
    type: 'error',
    isVisible: false,
  })

  const showToast = (message: string, type: ToastType = 'error') => {
    setToast({
      message,
      type,
      isVisible: true,
    })
  }

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }))
  }

  return {
    showToast,
    toast,
    hideToast,
  }
}
