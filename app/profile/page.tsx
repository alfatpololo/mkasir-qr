'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Mail, Phone, Package, Calendar, DollarSign } from 'lucide-react'
import { Button } from '@/components/Button'
import { signOutCustomerAPI, getSession, getStoredPassword } from '@/lib/auth'
import { getCustomerRiwayat } from '@/lib/pos-api'
import { DEFAULT_MENU_TOKEN } from '@/lib/token-utils'
import { useCartStore } from '@/lib/cart-store'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

export default function ProfilePage() {
  const router = useRouter()
  const clearCart = useCartStore((state) => state.clearCart)
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    favoriteCategory: null as string | null,
    lastOrderDate: null as Date | null
  })
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(true)

  const menuUrl = () => {
    const sessionUser = getSession()
    const cid = (sessionUser as any)?.customerId
    return cid ? `/menu/${DEFAULT_MENU_TOKEN}?customer_id=${cid}` : `/menu/${DEFAULT_MENU_TOKEN}`
  }

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

  // Function to load riwayat
  const loadRiwayat = () => {
    const sessionUser = getSession()
    const storedPassword = getStoredPassword()
    
    // Check session - password might be empty for phone-only login
    if (!sessionUser || !sessionUser.customerId) {
      console.warn('⚠️ No session found, redirecting to menu')
      router.push(menuUrl())
      return
    }
    
    setUser(sessionUser)
    setLoading(true)
    
    // Helper to fetch all pages
    const fetchAllRiwayat = async () => {
      const pageSize = 10
      let page = 1
      let allData: any[] = []
      let totalData = 0
      let totalPages = 1
      
      try {
        // For phone-only login, use default password '000000'
        const kode = storedPassword || '000000'
        console.log(`📋 Starting fetch riwayat for customerId: ${sessionUser.customerId}, kode: ${kode ? '***' : 'EMPTY'}`)
        
        while (true) {
          console.log(`📋 Fetching riwayat page ${page}...`)
          const riwayat = await getCustomerRiwayat(
            sessionUser.customerId!,
            kode,
            page,
            pageSize
          )
          
          console.log(`📋 Riwayat page ${page} full response:`, JSON.stringify(riwayat, null, 2))
          
          // API response structure: { status: "Success", data: [...] }
          const dataArr = riwayat.data || []
          
          if (dataArr.length === 0) {
            console.log(`📋 No more data at page ${page}, stopping...`)
            break
          }
          
          allData = [...allData, ...dataArr]
          
          console.log(`📋 Page ${page}: received ${dataArr.length} items, total so far: ${allData.length}`)
          
          // Break jika data yang diterima kurang dari pageSize (berarti sudah di halaman terakhir)
          if (dataArr.length < pageSize) {
            console.log(`📋 Last page reached (received ${dataArr.length} < ${pageSize}), stopping...`)
            break
          }
          
          page += 1
        }
      } catch (error) {
        console.error('❌ Error fetching riwayat:', error)
        throw error
      }
      
      console.log('📋 Final riwayat data:')
      console.log('📋 Total data from API:', totalData)
      console.log('📋 Aggregated length:', allData.length)
      console.log('📋 All orders:', JSON.stringify(allData, null, 2))
      console.log('📋 Sample orders (first 3):', allData.slice(0, 3))
      
      // Calculate stats from riwayat (tidak perlu simpan data, cukup untuk stats)
      if (allData.length > 0) {
        const totalOrders = allData.length
        const totalSpent = allData.reduce((sum: number, order: any) => {
          // API structure: { id, nomor_transaksi, jumlah_total, dll }
          const orderTotal = order.jumlah_total || 0
          console.log(`💰 Order ${order.id || order.nomor_transaksi || 'unknown'}: total=${orderTotal}, full order:`, order)
          return sum + Number(orderTotal)
        }, 0)
        
        const firstDate = allData[0]?.waktu_pesan || allData[0]?.waktu_bayar
        
        console.log('📊 Stats calculated:', {
          totalOrders,
          totalSpent,
          firstDate,
          allDataLength: allData.length
        })
        
        setStats({
          totalOrders,
          totalSpent,
          favoriteCategory: null,
          lastOrderDate: firstDate ? new Date(firstDate) : null
        })
      } else {
        console.warn('⚠️ No riwayat data found')
        setStats({
          totalOrders: 0,
          totalSpent: 0,
          favoriteCategory: null,
          lastOrderDate: null
        })
      }
    }
    
    fetchAllRiwayat()
      .catch((error) => {
        console.error('❌ Failed to load riwayat from API:', error)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRiwayat()
  }, [router])
  
  // Refresh riwayat when page becomes visible (user might have completed an order in another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Page visible, refreshing riwayat...')
        loadRiwayat()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const handleLogout = async () => {
    try {
      // Clear API session
      await signOutCustomerAPI()
      // Clear cart saat logout
      clearCart()
      // Redirect to menu page
      router.push(menuUrl())
    } catch (error) {
      console.error('Error logging out:', error)
      // Clear cart anyway
      clearCart()
      // Redirect anyway
      router.push(menuUrl())
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
              onClick={() => router.push(menuUrl())}
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
              {user?.customerId && (
                <p className="text-xs text-gray-500 mt-1">
                  ID: {user.customerId}
                </p>
              )}
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

        {/* Button to My Orders */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <button
            onClick={() => router.push('/my-orders')}
            className="w-full p-6 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">Riwayat Pesanan</h3>
                  <p className="text-sm text-gray-500">
                    Lihat semua pesanan Anda
                  </p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

