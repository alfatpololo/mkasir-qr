'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle2, Clock, ChefHat, Package } from 'lucide-react'
import { Order, OrderStatus } from '@/lib/types'
import { subscribeToOrder } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'

interface OrderStatusProps {
  orderId: string
  tableNumber: number
  onPaymentClick: () => void
}

const statusConfig: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  WAITING: {
    label: 'Menunggu Konfirmasi',
    icon: <Clock className="w-6 h-6" />,
    color: 'text-yellow-600',
  },
  PREPARING: {
    label: 'Sedang Disiapkan',
    icon: <ChefHat className="w-6 h-6" />,
    color: 'text-blue-600',
  },
  READY: {
    label: 'Siap Diambil',
    icon: <Package className="w-6 h-6" />,
    color: 'text-purple-600',
  },
  WAITING_PAYMENT: {
    label: 'Menunggu Pembayaran di Kasir',
    icon: <Clock className="w-6 h-6" />,
    color: 'text-orange-600',
  },
  PAID: {
    label: 'Sudah Dibayar',
    icon: <CheckCircle2 className="w-6 h-6" />,
    color: 'text-green-600',
  },
}

export const OrderStatusComponent: React.FC<OrderStatusProps> = ({
  orderId,
  tableNumber,
  onPaymentClick,
}) => {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToOrder(orderId, (orderData) => {
      setOrder(orderData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [orderId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">Pesanan tidak ditemukan</p>
      </div>
    )
  }

  const status = statusConfig[order.status]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="text-center mb-6">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-3 ${status.color}`}>
          {status.icon}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {status.label}
        </h2>
        <p className="text-sm text-gray-600">
          Meja {tableNumber}
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {order.items.map((item, index) => (
          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex-1">
              <p className="font-medium text-gray-900">
                {item.qty}x {item.name}
              </p>
              {item.note && (
                <p className="text-sm text-gray-500 italic">{item.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-primary-600">
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>

      {order.status === 'READY' && order.paymentMethod === 'QRIS_RESTAURANT' && (
        <button
          onClick={onPaymentClick}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          Bayar dengan QRIS
        </button>
      )}

      {order.status === 'WAITING_PAYMENT' && (
        <div className="text-center py-4">
          <p className="text-orange-600 font-semibold mb-2">Pesanan Selesai</p>
          <p className="text-sm text-gray-600">
            Silakan bayar di kasir untuk menyelesaikan pesanan
          </p>
        </div>
      )}

      {order.status === 'PAID' && (
        <div className="text-center py-4">
          <p className="text-green-600 font-semibold">Pembayaran berhasil!</p>
          <p className="text-sm text-gray-600 mt-1">Terima kasih atas kunjungan Anda</p>
        </div>
      )}
    </div>
  )
}

