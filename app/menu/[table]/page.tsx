'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ShoppingCart, Filter, Search, X, Check, LogIn, User } from 'lucide-react'
import { MenuList } from './MenuList'
import { Cart } from './Cart'
import { OrderStatusComponent } from '@/components/OrderStatus'
import { useCartStore } from '@/lib/cart-store'
import { createOrder } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'
import { getCurrentUser, onAuthStateChange } from '@/lib/auth'

export default function MenuPage() {
  const params = useParams()
  const router = useRouter()
  const paramValueRaw = (params as any).table
  const rawParam = Array.isArray(paramValueRaw) ? paramValueRaw[0] : (paramValueRaw as string)
  const isNumericOnly = /^\d+$/.test(rawParam)
  const tableNumber = isNumericOnly ? parseInt(rawParam, 10) : 0
  const isTokenMode = !isNumericOnly
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [showOrderStatus, setShowOrderStatus] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const setTableNumber = useCartStore((state) => state.setTableNumber)
  const items = useCartStore((state) => state.items)
  const getTotal = useCartStore((state) => state.getTotal)
  const clearCart = useCartStore((state) => state.clearCart)

  // Mode lama (numerik) masih pakai nomor meja untuk order, 
  // tapi mode token tidak lagi bergantung pada data meja di Firebase.
  useEffect(() => {
    // Mode token: lewati validasi meja Firebase
    if (isTokenMode) {
      setLoading(false)
      return
    }

    // Mode nomor meja lama
    if (tableNumber < 1 || tableNumber > 20) {
      setError('Nomor meja tidak valid')
      setLoading(false)
      return
    }

    setTableNumber(tableNumber)
    setLoading(false)
  }, [tableNumber, setTableNumber, isTokenMode])

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 // md breakpoint
      setIsMobile(isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check auth state (untuk tombol login/profil)
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user)
    })
    return () => unsubscribe()
  }, [])

  const handleCheckout = async (
    customerName: string,
    customerPhone: string,
    customerEmail: string,
    paymentMethod: 'QRIS_RESTAURANT' | 'CASHIER'
  ) => {
    if (items.length === 0) return

    try {
      const total = getTotal()
      
      // Determine initial status based on payment method
      let initialStatus: 'WAITING' | 'WAITING_PAYMENT' = 'WAITING'
      if (paymentMethod === 'CASHIER') {
        initialStatus = 'WAITING_PAYMENT' // Order selesai, menunggu pembayaran di kasir
      }

      // Validate data before sending
      // Untuk mode token, tableNumber boleh 0 (tidak diketahui dari URL)
      if (!isTokenMode && (!tableNumber || tableNumber <= 0)) {
        alert('Nomor meja tidak valid')
        return
      }
      if (items.length === 0) {
        alert('Keranjang kosong')
        return
      }
      if (!customerName || customerName.trim() === '') {
        alert('Nama pembeli harus diisi')
        return
      }
      if (!customerPhone || customerPhone.trim() === '') {
        alert('Nomor HP harus diisi')
        return
      }
      if (!customerEmail || customerEmail.trim() === '') {
        alert('Email harus diisi')
        return
      }
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(customerEmail.trim())) {
        alert('Mohon masukkan email yang valid')
        return
      }
      if (!paymentMethod || (paymentMethod !== 'QRIS_RESTAURANT' && paymentMethod !== 'CASHIER')) {
        alert('Metode pembayaran tidak valid')
        return
      }

      // Prepare items - ensure no undefined values
      const orderItems = items.map((item) => {
        const orderItem: any = {
          productId: item.productId || '',
          name: item.name || '',
          qty: item.qty || 0,
        }
        if (item.note && item.note.trim() !== '') {
          orderItem.note = item.note.trim()
        }
        return orderItem
      }).filter(item => item.productId && item.name && item.qty > 0)

      if (orderItems.length === 0) {
        alert('Tidak ada item valid untuk dipesan')
        return
      }

      console.log('Creating order with validated data:', {
        tableNumber: isTokenMode ? 0 : tableNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        paymentMethod,
        itemsCount: orderItems.length,
        total,
        status: initialStatus,
      })

      const orderId = await createOrder({
        tableNumber: isTokenMode ? 0 : tableNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        paymentMethod,
        items: orderItems,
        status: initialStatus,
        total,
      })

      console.log('Order created successfully:', orderId)

      clearCart()
      setCurrentOrderId(orderId)
      
      // If QRIS_RESTAURANT, redirect to payment page immediately
      if (paymentMethod === 'QRIS_RESTAURANT') {
        router.push(`/payment/qris?orderId=${orderId}`)
      } else {
        // If CASHIER, show order status page
        setShowOrderStatus(true)
      }
    } catch (error: any) {
      console.error('Error creating order:', error)
      const errorMessage = error?.message || 'Gagal membuat pesanan'
      console.error('Error details:', {
        code: error?.code,
        message: errorMessage,
        stack: error?.stack,
      })
      
      alert(`Gagal membuat pesanan: ${errorMessage}\n\nPastikan:\n1. Firestore rules sudah di-deploy\n2. Koneksi internet stabil\n3. Cek Browser Console (F12) untuk detail error`)
    }
  }

  const handlePaymentClick = () => {
    if (currentOrderId) {
      router.push(`/payment/qris?orderId=${currentOrderId}`)
    }
  }

  // Untuk mode meja lama, tetap tampilkan error jika nomor meja tidak valid
  if (!isTokenMode && (loading || error)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Meja tidak ditemukan'}</p>
          <button
            onClick={() => router.push('/')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    )
  }

  if (showOrderStatus && currentOrderId) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <button
              onClick={() => {
                setShowOrderStatus(false)
                setCurrentOrderId(null)
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              ← Kembali ke Menu
            </button>
          </div>
          <OrderStatusComponent
            orderId={currentOrderId}
            tableNumber={isTokenMode ? 0 : tableNumber}
            onPaymentClick={handlePaymentClick}
          />
        </div>
      </div>
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
            Menu ini hanya dapat diakses melalui mobile device. Silakan buka halaman ini menggunakan smartphone atau tablet Anda.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>📱 Scan QR code di meja menggunakan kamera smartphone</p>
            <p>🌐 Atau buka langsung di browser mobile Anda</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header dengan Background Putih */}
      <div className="sticky top-0 z-40 bg-white">
        <div className="max-w-md mx-auto">
          {/* Top Bar: Logo, Cart Icon, Login Button */}
          <div className="flex items-center justify-between mb-0 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-700 px-4 py-0.5">
            {/* Logo - Kiri */}
            <div className="w-24 h-24 relative">
              <Image
                src="/images/logo-white.png"
                alt="MKASIR Logo"
                width={96}
                height={96}
                className="object-contain w-full h-full"
                priority
                unoptimized
              />
            </div>
            
            {/* Cart Icon & Login Button - Kanan */}
            <div className="flex items-center gap-2">
              {/* Cart Icon */}
              <button
                onClick={() => {
                  const cartButton = document.querySelector('[data-cart-trigger]') as HTMLElement
                  cartButton?.click()
                }}
                className="relative p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <ShoppingCart className="w-6 h-6 text-white" />
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </button>
              
              {/* Login/Profile Button */}
              {currentUser ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/profile')}
                  className="border-white text-white hover:bg-white/20"
                >
                  <User className="w-4 h-4" />
                  <span>Profil</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="border-white text-white hover:bg-white/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </Button>
              )}
            </div>
          </div>
          
          {/* Status Meja - Card dengan Background Foto Cafe */}
          <div className="mb-8 mt-8 px-4">
            <div className="relative w-full h-32 rounded-xl overflow-hidden">
              {/* Background Foto Cafe */}
              <Image
                src="/images/cafe-di-menteng-00.webp"
                alt="Cafe Background"
                fill
                className="object-cover"
                priority
                unoptimized
              />
              {/* Overlay Hitam tipis untuk readability */}
              <div className="absolute inset-0 bg-black/35 z-[1]"></div>
              {/* Content di Tengah */}
              <div className="relative h-full flex flex-col items-center justify-center z-[2]">
                <span className="text-xs font-semibold text-white uppercase tracking-wider mb-1 drop-shadow-lg">Meja</span>
                <span className="text-3xl font-bold text-white drop-shadow-lg">
                  {isTokenMode ? '-' : tableNumber}
                </span>
              </div>
            </div>
          </div>
          
          {/* Filter & Search - Sejajar Berdekatan */}
          <div className="flex items-center gap-2 px-4">
            <button 
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-700 hover:via-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/30 font-semibold"
            >
              <Filter className="w-4 h-4" />
              <span className="text-xs font-medium">Filter</span>
              {filterCategory && (
                <span className="ml-1 w-2 h-2 bg-white rounded-full"></span>
              )}
            </button>
            {showSearch ? (
              <div className="flex-1 relative">
                <input
                  id="menu-search-input"
                  type="text"
                  placeholder="Cari menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowSearch(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                <Search className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Search</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <MenuList 
        token={rawParam}
        searchQuery={showSearch ? searchQuery : ''} 
        filterCategory={filterCategory}
        onCategoriesReady={setAvailableCategories}
      />

      {/* Filter Modal */}
      {showFilter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Filter Menu</h3>
              <button
                onClick={() => setShowFilter(false)}
                className="p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Kategori</p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setFilterCategory(null)
                      setShowFilter(false)
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                      filterCategory === null
                        ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="font-medium text-gray-900">Semua Kategori</span>
                    {filterCategory === null && (
                      <Check className="w-5 h-5 text-primary-600" />
                    )}
                  </button>
                  {availableCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setFilterCategory(category)
                        setShowFilter(false)
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                        filterCategory === category
                          ? 'border-primary-500 bg-gradient-to-r from-primary-50 to-primary-100'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium text-gray-900">{category}</span>
                      {filterCategory === category && (
                        <Check className="w-5 h-5 text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setFilterCategory(null)
                  setShowFilter(false)
                }}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setShowFilter(false)}
              >
                Terapkan
              </Button>
            </div>
          </div>
        </div>
      )}

      <Cart
        onCheckout={handleCheckout}
        currentUser={currentUser}
        tableNumber={isTokenMode ? 0 : tableNumber}
      />
    </div>
  )
}

