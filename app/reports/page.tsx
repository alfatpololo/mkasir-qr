'use client'

import React, { useEffect, useState } from 'react'
import { BarChart3, Download, Calendar, DollarSign, Package, TrendingUp, FileText } from 'lucide-react'
import { subscribeToAllOrders, getAllProducts } from '@/lib/firestore'
import { Order, Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'
import { exportOrdersToExcel, exportProductsToExcel, exportCustomersToExcel, exportOrdersToPDF, exportSalesReportToPDF } from '@/lib/export-utils'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, subMonths } from 'date-fns'
import { id } from 'date-fns/locale'

export default function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today')
  const [reportType, setReportType] = useState<'sales' | 'products' | 'customers'>('sales')

  useEffect(() => {
    const unsubscribeOrders = subscribeToAllOrders((ordersData) => {
      setOrders(ordersData)
    })

    getAllProducts().then(setProducts)

    setLoading(false)

    return () => unsubscribeOrders()
  }, [])

  // Filter orders by date range
  const getFilteredOrders = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = endOfDay(now)

    switch (dateRange) {
      case 'today':
        startDate = startOfDay(now)
        break
      case 'week':
        startDate = startOfDay(subDays(now, 7))
        break
      case 'month':
        startDate = startOfMonth(now)
        break
      case 'all':
        return orders
      default:
        startDate = startOfDay(now)
    }

    return orders.filter((order) => {
      const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : (order.createdAt ? new Date(order.createdAt.toMillis ? order.createdAt.toMillis() : Date.now()) : new Date())
      return orderDate >= startDate && orderDate <= endDate
    })
  }

  const filteredOrders = getFilteredOrders()

  // Calculate statistics
  const stats = {
    totalOrders: filteredOrders.length,
    totalRevenue: filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0),
    paidOrders: filteredOrders.filter((o) => o.status === 'PAID').length,
    averageOrder: filteredOrders.length > 0 
      ? filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0) / filteredOrders.length 
      : 0,
  }

  // Top products
  const getTopProducts = () => {
    const productCounts = new Map<string, { name: string; count: number; revenue: number }>()
    
    filteredOrders.forEach((order) => {
      const totalQty = order.items?.reduce((sum, i) => sum + i.qty, 0) || 1
      order.items?.forEach((item) => {
        const existing = productCounts.get(item.productId) || { name: item.name, count: 0, revenue: 0 }
        existing.count += item.qty
        // Calculate proportional revenue based on qty
        const itemRevenue = totalQty > 0 ? (order.total || 0) * (item.qty / totalQty) : 0
        existing.revenue += itemRevenue
        productCounts.set(item.productId, existing)
      })
    })

    return Array.from(productCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const topProducts = getTopProducts()

  const handleExportExcel = () => {
    switch (reportType) {
      case 'sales':
        exportOrdersToExcel(filteredOrders, 'laporan_penjualan')
        break
      case 'products':
        exportProductsToExcel(products, 'laporan_produk')
        break
      case 'customers':
        // Need customers data - will be handled separately
        break
    }
  }

  const handleExportPDF = async () => {
    if (reportType === 'sales') {
      const period = dateRange === 'today' 
        ? format(new Date(), 'dd MMMM yyyy', { locale: id })
        : dateRange === 'week'
        ? `${format(subDays(new Date(), 7), 'dd MMM yyyy', { locale: id })} - ${format(new Date(), 'dd MMM yyyy', { locale: id })}`
        : dateRange === 'month'
        ? format(new Date(), 'MMMM yyyy', { locale: id })
        : 'Semua Waktu'
      
      await exportSalesReportToPDF(filteredOrders, period, stats.totalRevenue, stats.totalOrders)
    } else {
      await exportOrdersToPDF(filteredOrders, 'Laporan Pesanan')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-600 mt-1">Analisis dan ekspor data penjualan</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" onClick={handleExportExcel}>
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
          <Button variant="primary" onClick={handleExportPDF}>
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
        <div className="flex gap-2">
          {(['sales', 'products', 'customers'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                reportType === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type === 'sales' && 'Penjualan'}
              {type === 'products' && 'Produk'}
              {type === 'customers' && 'Customer'}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      {reportType === 'sales' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Periode:</span>
            {(['today', 'week', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === 'today' && 'Hari Ini'}
                {range === 'week' && '7 Hari Terakhir'}
                {range === 'month' && 'Bulan Ini'}
                {range === 'all' && 'Semua'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {reportType === 'sales' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Pesanan</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-primary-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Pesanan Dibayar</p>
            <p className="text-3xl font-bold text-gray-900">{stats.paidOrders}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Rata-rata Pesanan</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.averageOrder)}</p>
          </div>
        </div>
      )}

      {/* Top Products */}
      {reportType === 'sales' && topProducts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Produk Terlaris</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Nama Produk</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Terjual</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topProducts.map((product, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary-600">#{idx + 1}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4">{product.count} item</td>
                    <td className="px-6 py-4 font-bold text-primary-600">{formatCurrency(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products Report */}
      {reportType === 'products' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Laporan Produk</h2>
            <p className="text-sm text-gray-600 mt-1">Total: {products.length} produk</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Nama</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Kategori</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Harga</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Stok</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-gray-600">{product.category || '-'}</td>
                    <td className="px-6 py-4 font-bold text-primary-600">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4">{product.stock || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        product.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {product.isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customers Report */}
      {reportType === 'customers' && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <p className="text-gray-600">Fitur laporan customer akan tersedia di halaman Customers dengan tombol export.</p>
        </div>
      )}
    </div>
  )
}

