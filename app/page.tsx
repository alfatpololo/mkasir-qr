'use client'

import React, { useEffect, useState } from 'react'
import { ShoppingCart, DollarSign, Package, Table as TableIcon } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { formatCurrency } from '@/lib/utils'
import {
  subscribeToAllOrders,
  subscribeToAllProducts,
  subscribeToAllTables,
  getTodayOrders,
  getTodayRevenue,
} from '@/lib/firestore'
import { Order, Product, Table } from '@/lib/types'

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [tables, setTables] = useState<Table[]>([])
  const [todayOrders, setTodayOrders] = useState<Order[]>([])
  const [todayRevenue, setTodayRevenue] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load today's data
    const loadTodayData = async () => {
      const orders = await getTodayOrders()
      const revenue = await getTodayRevenue()
      setTodayOrders(orders)
      setTodayRevenue(revenue)
      setLoading(false)
    }

    loadTodayData()

    // Subscribe to real-time updates
    const unsubscribeOrders = subscribeToAllOrders((ordersData) => {
      setOrders(ordersData)
      // Recalculate today's revenue
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const paidToday = ordersData.filter(
        (order) =>
          order.status === 'PAID' &&
          order.createdAt?.toDate() >= today
      )
      const revenue = paidToday.reduce((sum, order) => sum + order.total, 0)
      setTodayRevenue(revenue)
    })

    const unsubscribeProducts = subscribeToAllProducts((productsData) => {
      setProducts(productsData)
    })

    const unsubscribeTables = subscribeToAllTables((tablesData) => {
      setTables(tablesData)
    })

    return () => {
      unsubscribeOrders()
      unsubscribeProducts()
      unsubscribeTables()
    }
  }, [])

  const activeTables = tables.filter((t) => t.active).length
  const recentOrders = orders.slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-gray-500 text-lg">Selamat datang kembali! 👋</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="px-4 py-2 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200">
            <p className="text-xs text-primary-600 font-medium">Hari Ini</p>
            <p className="text-sm font-bold text-primary-700">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Pesanan Hari Ini"
          value={todayOrders.length}
          icon={ShoppingCart}
          iconColor="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white"
        />
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(todayRevenue)}
          icon={DollarSign}
          iconColor="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white"
        />
        <StatCard
          title="Total Produk"
          value={products.length}
          icon={Package}
          iconColor="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 text-white"
        />
        <StatCard
          title="Meja Aktif"
          value={activeTables}
          icon={TableIcon}
          iconColor="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 text-white"
        />
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white via-gray-50/50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
                Pesanan Terbaru
              </h2>
              <p className="text-sm text-gray-500 mt-1 ml-3">Daftar pesanan yang baru masuk hari ini</p>
            </div>
            <div className="px-4 py-2 bg-primary-50 rounded-xl border border-primary-100">
              <span className="text-sm font-semibold text-primary-700">{recentOrders.length} Pesanan</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Meja
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Waktu
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4">
                        <ShoppingCart className="w-10 h-10 text-gray-400" />
                      </div>
                      <p className="text-base font-semibold text-gray-600 mb-1">Belum ada pesanan</p>
                      <p className="text-sm text-gray-400">Pesanan akan muncul di sini</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order, index) => (
                  <tr 
                    key={order.id} 
                    className="group hover:bg-gradient-to-r hover:from-primary-50/30 hover:via-primary-50/20 hover:to-transparent transition-all duration-200 border-b border-gray-50/50"
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        <span className="text-sm font-semibold text-gray-900 font-mono">
                          #{order.id.slice(0, 8)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 text-sm font-semibold border border-primary-200/50 shadow-sm">
                        Meja {order.tableNumber}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      {order.customerName ? (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {order.customerName}
                          </p>
                          {order.customerPhone && (
                            <p className="text-xs text-gray-500 mt-0.5">{order.customerPhone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Tidak ada nama</span>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                        {formatCurrency(order.total)}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm ${
                          order.status === 'PAID'
                            ? 'bg-gradient-to-r from-green-100 via-green-50 to-green-100 text-green-800 border border-green-200/50'
                            : order.status === 'READY'
                            ? 'bg-gradient-to-r from-purple-100 via-purple-50 to-purple-100 text-purple-800 border border-purple-200/50'
                            : order.status === 'WAITING_PAYMENT'
                            ? 'bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100 text-orange-800 border border-orange-200/50'
                            : order.status === 'PREPARING'
                            ? 'bg-gradient-to-r from-blue-100 via-blue-50 to-blue-100 text-blue-800 border border-blue-200/50'
                            : 'bg-gradient-to-r from-yellow-100 via-yellow-50 to-yellow-100 text-yellow-800 border border-yellow-200/50'
                        }`}
                      >
                        {order.status === 'PAID'
                          ? '✓ Sudah Dibayar'
                          : order.status === 'READY'
                          ? '📦 Siap'
                          : order.status === 'WAITING_PAYMENT'
                          ? '⏳ Menunggu Pembayaran'
                          : order.status === 'PREPARING'
                          ? '👨‍🍳 Menyiapkan'
                          : '⏱️ Menunggu'}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">
                          {order.createdAt?.toDate().toLocaleString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-xs text-gray-500">
                          {order.createdAt?.toDate().toLocaleString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
