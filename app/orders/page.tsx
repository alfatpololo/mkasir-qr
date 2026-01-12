'use client'

import React, { useEffect, useState } from 'react'
import { Clock, ChefHat, Package, CheckCircle2, Download, FileText } from 'lucide-react'
import {
  subscribeToAllOrders,
  updateOrderStatus,
} from '@/lib/firestore'
import { Order, OrderStatus } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'
import { exportOrdersToExcel, exportOrdersToPDF } from '@/lib/export-utils'

const statusConfig: Record<OrderStatus, { label: string; icon: React.ReactNode; color: string }> = {
  WAITING: {
    label: 'Menunggu',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800',
  },
  PREPARING: {
    label: 'Menyiapkan',
    icon: <ChefHat className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800',
  },
  READY: {
    label: 'Siap',
    icon: <Package className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800',
  },
  WAITING_PAYMENT: {
    label: 'Menunggu Pembayaran',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800',
  },
  PAID: {
    label: 'Sudah Dibayar',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <span className="w-1 h-10 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
            Pesanan
          </h1>
          <p className="text-gray-500 text-lg ml-4">Kelola pesanan masuk dari pelanggan</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => exportOrdersToExcel(filteredOrders, 'pesanan')}>
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
          <Button variant="primary" onClick={() => exportOrdersToPDF(filteredOrders, 'Laporan Pesanan')}>
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6">
        <div className="flex flex-wrap gap-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'ALL')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 transition-all font-medium"
            >
              <option value="ALL">Semua Status</option>
              {Object.entries(statusConfig).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meja
            </label>
            <select
              value={filterTable}
              onChange={(e) =>
                setFilterTable(
                  e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)
                )
              }
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50 transition-all font-medium"
            >
              <option value="ALL">Semua Meja</option>
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
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white via-gray-50/50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
                Daftar Pesanan
              </h2>
              <p className="text-sm text-gray-500 mt-1 ml-3">Kelola status pesanan pelanggan</p>
            </div>
            <div className="px-4 py-2 bg-primary-50 rounded-xl border border-primary-100">
              <span className="text-sm font-semibold text-primary-700">{filteredOrders.length} Pesanan</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {filteredOrders.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
                <Package className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2">Tidak ada pesanan</p>
              <p className="text-sm text-gray-500">Pesanan akan muncul di sini</p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const status = statusConfig[order.status]
              return (
                <div
                  key={order.id}
                  className="p-6 hover:bg-gradient-to-r hover:from-primary-50/50 hover:to-transparent transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-xl bg-gradient-to-r from-primary-100 to-primary-200 text-primary-800 font-bold text-lg">
                          Meja {order.tableNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                            order.status === 'PAID'
                              ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                              : order.status === 'READY'
                              ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800'
                              : order.status === 'WAITING_PAYMENT'
                              ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800'
                              : order.status === 'PREPARING'
                              ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
                              : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                          }`}
                        >
                          {status.icon}
                          {status.label}
                        </span>
                      </div>
                      {order.customerName && (
                        <div className="mb-2">
                          <p className="text-sm font-semibold text-gray-900">
                            👤 {order.customerName}
                          </p>
                          {order.customerPhone && (
                            <p className="text-sm text-gray-600">
                              📱 {order.customerPhone}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mb-1">
                        Order ID: #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.createdAt?.toDate().toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gradient-green">
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

