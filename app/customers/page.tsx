'use client'

import React, { useEffect, useState } from 'react'
import { Users, Mail, Phone, Package, DollarSign, Calendar, Search, Download, FileText } from 'lucide-react'
import { subscribeToAllOrders, subscribeToAllCustomers, Customer } from '@/lib/firestore'
import { Order } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { exportCustomersToExcel, exportCustomersToPDF } from '@/lib/export-utils'
import { Button } from '@/components/Button'

interface CustomerData {
  uid?: string
  email: string | null
  phone: string | null
  name: string | null
  photoURL?: string | null
  totalOrders: number
  totalSpent: number
  lastOrderDate: Date | null
  orders: Order[]
  createdAt?: Date | null
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [registeredCustomers, setRegisteredCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  // Subscribe to registered customers
  useEffect(() => {
    const unsubscribe = subscribeToAllCustomers((customersData) => {
      setRegisteredCustomers(customersData)
    })
    return () => unsubscribe()
  }, [])

  // Subscribe to orders
  useEffect(() => {
    const unsubscribe = subscribeToAllOrders((ordersData) => {
      setOrders(ordersData)
    })
    return () => unsubscribe()
  }, [])

  // Combine registered customers with order data
  useEffect(() => {
    if (registeredCustomers.length === 0 && orders.length === 0) {
      setLoading(false)
      return
    }

    // Create a map of customers from registered customers
    const customerMap = new Map<string, CustomerData>()

    // First, add all registered customers
    registeredCustomers.forEach((customer) => {
      const key = customer.email
      customerMap.set(key, {
        uid: customer.uid,
        email: customer.email,
        phone: customer.phoneNumber || null,
        name: customer.displayName,
        photoURL: customer.photoURL || null,
        totalOrders: 0,
        totalSpent: 0,
        lastOrderDate: null,
        orders: [],
        createdAt: customer.createdAt?.toDate ? customer.createdAt.toDate() : null,
      })
    })

    // Then, add customers from orders (for those who haven't registered but made orders)
    orders.forEach((order) => {
      const key = order.customerEmail || order.customerPhone || 'guest'
      
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          email: order.customerEmail || null,
          phone: order.customerPhone || null,
          name: order.customerName || null,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          orders: [],
        })
      }
    })

    // Now calculate stats from orders
    orders.forEach((order) => {
      const key = order.customerEmail || order.customerPhone || 'guest'
      const customer = customerMap.get(key)
      
      if (customer) {
        customer.totalOrders += 1
        customer.totalSpent += order.total || 0
        
        const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : (order.createdAt ? new Date(order.createdAt.toMillis ? order.createdAt.toMillis() : Date.now()) : new Date())
        if (!customer.lastOrderDate || orderDate > customer.lastOrderDate) {
          customer.lastOrderDate = orderDate
        }
        
        customer.orders.push(order)
        
        // Update name if available from order
        if (order.customerName && !customer.name) {
          customer.name = order.customerName
        }
      }
    })

    // Convert map to array and sort by last order date or created date
    const customersArray = Array.from(customerMap.values())
      .filter(c => c.email || c.phone) // Only show customers with email or phone
      .sort((a, b) => {
        // Prioritize customers with orders
        if (a.totalOrders === 0 && b.totalOrders > 0) return 1
        if (a.totalOrders > 0 && b.totalOrders === 0) return -1
        
        // Sort by last order date or created date
        const dateA = a.lastOrderDate || a.createdAt
        const dateB = b.lastOrderDate || b.createdAt
        
        if (!dateA) return 1
        if (!dateB) return -1
        return dateB.getTime() - dateA.getTime()
      })

    setCustomers(customersArray)
    setLoading(false)
  }, [registeredCustomers, orders])

  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    )
  })

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
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
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Kelola data customer dan riwayat pesanan</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => exportCustomersToExcel(registeredCustomers, orders, 'customers')}
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => exportCustomersToPDF(registeredCustomers, orders, 'Laporan Customer')}
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary-100 rounded-lg">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900">{customers.length}</p>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Pesanan</p>
          <p className="text-3xl font-bold text-gray-900">
            {customers.reduce((sum, c) => sum + c.totalOrders, 0)}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari customer (nama, email, atau nomor HP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Kontak
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Total Pesanan
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Total Belanja
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Pesanan Terakhir
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 font-medium">
                      {searchQuery ? 'Tidak ada customer yang ditemukan' : 'Belum ada customer'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchQuery ? 'Coba cari dengan kata kunci lain' : 'Customer akan muncul setelah melakukan pesanan'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {customer.photoURL ? (
                          <img
                            src={customer.photoURL}
                            alt={customer.name || 'Customer'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-bold text-sm">
                              {customer.name ? customer.name.charAt(0).toUpperCase() : '?'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {customer.name || 'Customer'}
                          </p>
                          {customer.uid && (
                            <p className="text-xs text-gray-500">Terdaftar</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {!customer.email && !customer.phone && (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{customer.totalOrders}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary-600">
                        {formatCurrency(customer.totalSpent)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(customer.lastOrderDate)}</span>
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

