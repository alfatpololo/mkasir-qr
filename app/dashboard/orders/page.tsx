'use client'

import React, { useEffect, useState } from 'react'
import { Clock, ChefHat, Package, CheckCircle2 } from 'lucide-react'
import {
  subscribeToAllOrders,
  updateOrderStatus,
} from '@/lib/firestore'
import { Order, OrderStatus } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'

const statusConfig: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  WAITING: {
    label: 'Menunggu',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-800',
  },
  PREPARING: {
    label: 'Menyiapkan',
    icon: <ChefHat className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-800',
  },
  READY: {
    label: 'Siap',
    icon: <Package className="w-4 h-4" />,
    color: 'bg-purple-100 text-purple-800',
  },
  WAITING_PAYMENT: {
    label: 'Menunggu Pembayaran',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-orange-100 text-orange-800',
  },
  PAID: {
    label: 'Sudah Dibayar',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'bg-green-100 text-green-800',
  },
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'ALL'>('ALL')
  const [filterTable, setFilterTable] = useState<number | 'ALL'>('ALL')

  useEffect(() => {
    const unsubscribe = subscribeToAllOrders((ordersData) => {
      setOrders(ordersData)
    })

    return () => unsubscribe()
  }, [])

  const handleStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus)
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Gagal mengupdate status pesanan')
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== 'ALL' && order.status !== filterStatus) return false
    if (filterTable !== 'ALL' && order.tableNumber !== filterTable) return false
    return true
  })

  const uniqueTables = Array.from(new Set(orders.map((o) => o.tableNumber))).sort()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pesanan</h1>
        <p className="text-gray-600 mt-1">Kelola pesanan masuk</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">Semua</option>
              {Object.entries(statusConfig).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meja
            </label>
            <select
              value={filterTable}
              onChange={(e) =>
                setFilterTable(
                  e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)
                )
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">Semua</option>
              {uniqueTables.map((table) => (
                <option key={table} value={table}>
                  Meja {table}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Daftar Pesanan ({filteredOrders.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredOrders.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">Tidak ada pesanan</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const status = statusConfig[order.status]
              return (
                <div
                  key={order.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg">Meja {order.tableNumber}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      {order.customerName && (
                        <div className="mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            👤 {order.customerName}
                          </p>
                          {order.customerPhone && (
                            <p className="text-sm text-gray-600">
                              📱 {order.customerPhone}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-500">
                        Order ID: #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.createdAt?.toDate().toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-primary-600">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                    <div className="space-y-1">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">
                            {item.qty}x {item.name}
                            {item.note && (
                              <span className="text-gray-500 italic ml-2">({item.note})</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {order.status === 'WAITING' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'PREPARING')}
                      >
                        Mulai Siapkan
                      </Button>
                    )}
                    {order.status === 'PREPARING' && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'READY')}
                      >
                        Tandai Siap
                      </Button>
                    )}
                    {order.status === 'READY' && order.paymentMethod === 'QRIS_RESTAURANT' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusUpdate(order.id, 'PAID')}
                      >
                        Tandai Sudah Dibayar
                      </Button>
                    )}
                    {order.status === 'WAITING_PAYMENT' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusUpdate(order.id, 'PAID')}
                        >
                          ✅ Konfirmasi Pembayaran Kasir
                        </Button>
                        <p className="text-xs text-gray-500 mt-1 w-full">
                          Customer sudah selesai, menunggu pembayaran di kasir
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

