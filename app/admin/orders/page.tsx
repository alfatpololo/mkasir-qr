'use client'

import React, { useEffect, useState } from 'react'
import { Order, OrderStatus } from '@/lib/types'
import { subscribeToAllOrders, updateOrderStatus } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'
import { Clock, ChefHat, Package, CheckCircle2 } from 'lucide-react'

const statusLabels: Record<OrderStatus, string> = {
  WAITING: 'Menunggu',
  PREPARING: 'Menyiapkan',
  READY: 'Siap',
  WAITING_PAYMENT: 'Menunggu Pembayaran',
  PAID: 'Sudah Dibayar',
}

const statusIcons: Record<OrderStatus, React.ReactNode> = {
  WAITING: <Clock className="w-4 h-4" />,
  PREPARING: <ChefHat className="w-4 h-4" />,
  READY: <Package className="w-4 h-4" />,
  WAITING_PAYMENT: <Clock className="w-4 h-4" />,
  PAID: <CheckCircle2 className="w-4 h-4" />,
}

const statusColors: Record<OrderStatus, string> = {
  WAITING: 'bg-yellow-100 text-yellow-800',
  PREPARING: 'bg-blue-100 text-blue-800',
  READY: 'bg-purple-100 text-purple-800',
  WAITING_PAYMENT: 'bg-orange-100 text-orange-800',
  PAID: 'bg-green-100 text-green-800',
}

export default function AdminOrdersPage() {
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Daftar Pesanan</h1>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
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
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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

          {/* Orders List */}
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Tidak ada pesanan</p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">Meja {order.tableNumber}</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}
                        >
                          {statusIcons[order.status]}
                          {statusLabels[order.status]}
                        </span>
                      </div>
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
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-1">
                        <span className="text-gray-700">
                          {item.qty}x {item.name}
                          {item.note && (
                            <span className="text-gray-500 text-sm italic ml-2">
                              ({item.note})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

