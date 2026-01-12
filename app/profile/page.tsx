'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Mail, Phone, Package, Calendar, DollarSign } from 'lucide-react'
import { Button } from '@/components/Button'
import { signOutCustomer, onAuthStateChange, getCurrentUser } from '@/lib/auth'
import { subscribeToCustomerOrders, getCustomerStats } from '@/lib/customer-firestore'
import { getCustomerByEmail } from '@/lib/firestore'
import { Order } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    favoriteCategory: null as string | null,
    lastOrderDate: null as Date | null
  })
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(true)

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (currentUser) => {
      if (!currentUser) {
        router.push('/login')
        return
      }
      
      setUser(currentUser)
      
      // Get customer data from Firestore to get phone number
      const email = currentUser.email || ''
      let phone: string | undefined = undefined
      
      // Try to get phone from Firestore customer data
      if (email) {
        try {
          const customerData = await getCustomerByEmail(email)
          if (customerData?.phoneNumber) {
            phone = customerData.phoneNumber
          }
        } catch (error) {
          console.error('Error getting customer data:', error)
        }
      }
      
      // Fallback to Firebase Auth phone if available
      if (!phone && (currentUser as any).phoneNumber) {
        phone = (currentUser as any).phoneNumber
      }
      
      console.log('Profile: Loading orders for email:', email, 'phone:', phone)
      
      const unsubscribeOrders = subscribeToCustomerOrders(email, phone, (ordersData) => {
        console.log('Profile: Orders received:', ordersData.length)
        setOrders(ordersData)
        setLoading(false)
        
        // Update stats when orders change
        getCustomerStats(email, phone).then((newStats) => {
          console.log('Profile: Stats updated:', newStats)
          setStats(newStats)
        })
      })
      
      // Get initial stats
      const initialStats = await getCustomerStats(email, phone)
      console.log('Profile: Initial stats:', initialStats)
      setStats(initialStats)
      
      return () => unsubscribeOrders()
    })

    return () => unsubscribe()
  }, [router])

  const handleLogout = async () => {
    try {
      await signOutCustomer()
      // Redirect to menu page (POS) instead of login
      router.push('/menu/1')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const formatDate = (date: any) => {
    if (!date) return '-'
    const d = date.toDate ? date.toDate() : new Date(date)
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      WAITING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Menunggu' },
      PREPARING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Sedang Disiapkan' },
      READY: { bg: 'bg-green-100', text: 'text-green-800', label: 'Siap' },
      WAITING_PAYMENT: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Menunggu Pembayaran' },
      PAID: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Sudah Dibayar' },
    }
    
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
    
    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  // Show desktop warning
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary-100 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Buka di Mobile Device
          </h1>
          <p className="text-gray-600 mb-6">
            Halaman ini hanya dapat diakses melalui mobile device.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 sticky top-0 z-40">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/menu/1')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold">Profil Saya</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900 mb-1">
                {user?.displayName || 'Customer'}
              </h2>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{user?.email || '-'}</p>
              </div>
            </div>
            {user?.phoneNumber && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Nomor HP</p>
                  <p className="text-sm font-medium text-gray-900">{user.phoneNumber}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">Total Pesanan</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-gray-600 mb-1">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</p>
          </div>
        </div>

        {/* Orders History */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Riwayat Pesanan</h3>
          </div>

          <div className="divide-y divide-gray-100">
            {orders.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600 font-medium">Belum ada pesanan</p>
                <p className="text-sm text-gray-400 mt-1">Mulai pesan dari menu restoran</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="mb-2 space-y-1">
                    {order.items?.slice(0, 2).map((item, idx) => {
                      // Calculate proportional price based on qty
                      const totalQty = order.items?.reduce((sum, i) => sum + i.qty, 0) || 1
                      const itemPrice = totalQty > 0 ? (order.total || 0) * (item.qty / totalQty) : 0
                      return (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {item.qty}x {item.name}
                          </span>
                          <span className="text-gray-900 font-medium">
                            {formatCurrency(itemPrice)}
                          </span>
                        </div>
                      )
                    })}
                    {order.items && order.items.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{order.items.length - 2} item lainnya
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-lg font-bold text-primary-600">
                      {formatCurrency(order.total || 0)}
                    </span>
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

