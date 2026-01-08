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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Ringkasan aktivitas hari ini</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Pesanan Hari Ini"
          value={todayOrders.length}
          icon={ShoppingCart}
          iconColor="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Pendapatan"
          value={formatCurrency(todayRevenue)}
          icon={DollarSign}
          iconColor="bg-green-100 text-green-600"
        />
        <StatCard
          title="Total Produk"
          value={products.length}
          icon={Package}
          iconColor="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Meja Aktif"
          value={activeTables}
          icon={TableIcon}
          iconColor="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pesanan Terbaru</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meja
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Waktu
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Belum ada pesanan
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        #{order.id.slice(0, 8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">Meja {order.tableNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      {order.customerName ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order.customerName}
                          </p>
                          {order.customerPhone && (
                            <p className="text-xs text-gray-500">{order.customerPhone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'READY'
                            ? 'bg-purple-100 text-purple-800'
                            : order.status === 'WAITING_PAYMENT'
                            ? 'bg-orange-100 text-orange-800'
                            : order.status === 'PREPARING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {order.status === 'PAID'
                          ? 'Sudah Dibayar'
                          : order.status === 'READY'
                          ? 'Siap'
                          : order.status === 'WAITING_PAYMENT'
                          ? 'Menunggu Pembayaran'
                          : order.status === 'PREPARING'
                          ? 'Menyiapkan'
                          : 'Menunggu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt?.toDate().toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
