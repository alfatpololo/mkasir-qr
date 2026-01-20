'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ShoppingCart, Filter, Search, X, Check, User, LogOut } from 'lucide-react'
import { MenuList } from './MenuList'
import { Cart } from './Cart'
import { OrderStatusComponent } from '@/components/OrderStatus'
import { CategoryTabs } from '@/components/CategoryTabs'
import { useCartStore } from '@/lib/cart-store'
import { createOrder } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'
import { signInWithPhoneOnly, signOutCustomerAPI, getCurrentUserAPI, onAuthStateChangeAPI, getSession, getStoredPassword } from '@/lib/auth'
import { getCustomerRiwayat } from '@/lib/pos-api'
import { parseTableParam, parseTableParamQuick, isEncryptedToken } from '@/lib/token-utils'
import { Toast, useToast } from '@/components/Toast'

export default function MenuPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramValueRaw = (params as any).table
  
  // Handle parameter yang mungkin array atau string
  let rawParam: string
  if (Array.isArray(paramValueRaw)) {
    // Jika array, gabungkan dengan ':' untuk menangani token dengan format id:token
    rawParam = paramValueRaw.join(':')
  } else {
    rawParam = paramValueRaw as string || ''
  }
  
  // Decode URL jika perlu
  try {
    rawParam = decodeURIComponent(rawParam)
  } catch (e) {
    // Jika decode gagal, gunakan parameter asli
    console.warn('Failed to decode param:', rawParam)
  }
  
  const [tableInfo, setTableInfo] = useState<{
    isValid: boolean
    isToken: boolean
    tableNumber: number
    stallId: string | null
    rawToken?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [showOrderStatus, setShowOrderStatus] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showHeader, setShowHeader] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [customerPassword, setCustomerPassword] = useState<string>('') // Simpan password untuk fetch riwayat (dari API response)
  const { showToast, toast, hideToast } = useToast()
  
  const setTableNumber = useCartStore((state) => state.setTableNumber)
  const items = useCartStore((state) => state.items)
  const getTotal = useCartStore((state) => state.getTotal)
  const clearCart = useCartStore((state) => state.clearCart)

  // Handle scroll for header - hide on scroll down, show on scroll up
  useEffect(() => {
    let ticking = false
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          
          // Show header if at top
          if (currentScrollY < 10) {
            setShowHeader(true)
          } else {
            // Hide header when scrolling down, show when scrolling up
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
              setShowHeader(false)
            } else if (currentScrollY < lastScrollY) {
              setShowHeader(true)
            }
          }
          
          setLastScrollY(currentScrollY)
          ticking = false
        })
        ticking = true
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Parse table parameter (supports both numeric and encrypted token)
  useEffect(() => {
    if (!rawParam) {
      setError('Parameter tidak ditemukan')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    
    const timer = setTimeout(() => {
      try {
        // Debug: log parameter yang diterima
        console.log('🔍 Raw param received:', rawParam)
        console.log('🔍 Param type:', typeof rawParam)
        console.log('🔍 Param length:', rawParam?.length)
        
        // Langsung pakai quick parse (dummy data untuk development)
        // Tidak perlu menunggu API, langsung valid dan lanjut
        const parsed = parseTableParamQuick(rawParam)
        console.log('🔍 Parsed result:', parsed)
        
        setTableInfo(parsed)
        
        if (!parsed.isValid) {
          console.warn('⚠️ Token tidak valid:', rawParam)
          setError('Nomor meja atau token tidak valid')
          setLoading(false)
          return
        }

        // Simpan token/table ke localStorage untuk redirect nanti
        if (parsed.isToken && parsed.rawToken) {
          localStorage.setItem('tableToken', parsed.rawToken)
        } else {
          localStorage.setItem('tableNumber', String(parsed.tableNumber))
        }

        // Set table number untuk cart store (hanya untuk numeric mode)
        if (!parsed.isToken) {
          setTableNumber(parsed.tableNumber)
        }
        
        setLoading(false)
      } catch (err: any) {
        console.error('Error validating table:', err)
        // Fallback ke dummy data
        const dummy = {
          isValid: true,
          isToken: true,
          tableNumber: 5,
          stallId: 'dummy_stall',
          rawToken: rawParam,
        }
        setTableInfo(dummy)
        setLoading(false)
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [rawParam, setTableNumber])

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

  // Check auth state (untuk tombol login/profil) - API-based
  useEffect(() => {
    // Check session immediately on mount
    const sessionUser = getSession()
    if (sessionUser) {
      setCurrentUser(sessionUser)
      
      // Sync URL dengan customer_id jika belum ada
      const currentCustomerId = searchParams.get('customer_id')
      if (!currentCustomerId && sessionUser.customerId) {
        const currentPath = window.location.pathname
        const newUrl = `${currentPath}?customer_id=${sessionUser.customerId}`
        router.replace(newUrl)
      }
    }
    
    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChangeAPI((user) => {
      setCurrentUser(user)
      
      // Sync URL dengan customer_id jika user login dan belum ada di URL
      if (user && user.customerId) {
        const currentCustomerId = searchParams.get('customer_id')
        if (!currentCustomerId) {
          const currentPath = window.location.pathname
          const newUrl = `${currentPath}?customer_id=${user.customerId}`
          router.replace(newUrl)
        }
      }
    })
    return () => unsubscribe()
  }, [router, searchParams])

  const handlePhoneLogin = async () => {
    if (!phoneNumber.trim()) {
      setLoginError('Mohon masukkan nomor HP')
      return
    }

    // Basic phone validation
    const phoneRegex = /^(\+62|62|0)[0-9]{9,12}$/
    const normalizedPhone = phoneNumber.replace(/\s|-|\(|\)/g, '')
    if (!phoneRegex.test(normalizedPhone)) {
      setLoginError('Format nomor HP tidak valid')
      return
    }

    setLoginLoading(true)
    setLoginError(null)

    try {
      console.log('🔐 Starting login process with phone only...')
      console.log('🔐 Phone:', normalizedPhone)
      
      // Login dengan hanya nomor HP (password akan di-generate atau dari API)
      const customerData = await signInWithPhoneOnly(normalizedPhone)
      
      console.log('✅ Login successful, customer data:', customerData)
      
      // Verify password/token was saved
      const savedPasswordCheck = getStoredPassword()
      console.log('🔍 Password/token check after login:', savedPasswordCheck)
      
      // Session sudah disimpan di signInWithPhoneOnly
      if (savedPasswordCheck) {
        setCustomerPassword(savedPasswordCheck)
      }
      setCurrentUser(customerData)
      setShowLoginModal(false)
      setPhoneNumber('')
      
      // Fetch riwayat setelah login berhasil (meskipun password kosong untuk phone-only login)
      if (customerData.customerId) {
        try {
          // Gunakan password/token jika ada, atau default '000000' untuk phone-only login
          const kode = savedPasswordCheck || '000000'
          console.log('📋 Fetching riwayat after login, customerId:', customerData.customerId, 'kode:', kode ? '***' : 'EMPTY')
          
          const riwayatData = await getCustomerRiwayat(
            customerData.customerId,
            kode,
            1,
            10
          )
          console.log('✅ Riwayat data fetched after login:', riwayatData)
          // Simpan ke localStorage sebagai cache (opsional, karena akan di-fetch lagi dari API)
          localStorage.setItem('customerRiwayat', JSON.stringify(riwayatData))
        } catch (riwayatError) {
          console.warn('⚠️ Failed to fetch riwayat after login:', riwayatError)
          // Continue anyway, login still successful
          // Riwayat akan di-fetch lagi saat user membuka profile/my-orders
        }
      }
      
      // Tetap di menu, tapi update URL dengan customer_id
      const currentPath = window.location.pathname
      const newUrl = `${currentPath}?customer_id=${customerData.customerId}`
      router.replace(newUrl)
      
      // Show success toast
      showToast('Login berhasil!', 'success')
    } catch (error: any) {
      setLoginError(error.message || 'Gagal login')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Clear API session
      await signOutCustomerAPI()
      setCurrentUser(null)
      setCustomerPassword('')
      
      // Clear cart saat logout
      clearCart()
      
      // Show success toast
      showToast('Logout berhasil!', 'success')
    } catch (error: any) {
      console.error('Error logging out:', error)
      // Clear anyway even if error
      setCurrentUser(null)
      setCustomerPassword('')
      clearCart()
    }
  }

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
      if (!tableInfo || !tableInfo.isValid) {
        alert('Nomor meja atau token tidak valid')
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

      const orderTableNumber = tableInfo.isToken ? 0 : tableInfo.tableNumber

      console.log('Creating order with validated data:', {
        tableNumber: orderTableNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        paymentMethod,
        itemsCount: orderItems.length,
        total,
        status: initialStatus,
      })

      const orderId = await createOrder({
        tableNumber: orderTableNumber,
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

  // Show error if invalid
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memvalidasi token...</p>
        </div>
      </div>
    )
  }

  if (error || !tableInfo || !tableInfo.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Parameter Tidak Valid</h2>
          <p className="text-gray-600 mb-4">{error || 'Nomor meja atau token tidak valid.'}</p>
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
    // Pastikan tableInfo sudah tersedia
    if (!tableInfo || !tableInfo.isValid) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Parameter Tidak Valid</h2>
            <p className="text-gray-600 mb-4">Nomor meja atau token tidak valid.</p>
            <button
              onClick={() => {
                setShowOrderStatus(false)
                setCurrentOrderId(null)
                router.push('/')
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      )
    }

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
            tableNumber={tableInfo.isToken ? 0 : tableInfo.tableNumber}
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
    <div className="w-full bg-white pb-28">
      {/* Navbar - Sticky di atas */}
      <div className="sticky top-0 z-40 bg-white">
        <div className="max-w-md mx-auto">
          {/* Top Bar: Logo, Cart Icon */}
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
            
            {/* Cart Icon & Login - Kanan */}
            <div className="flex items-center gap-2">
              {currentUser ? (
                <button
                  onClick={() => router.push('/profile')}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  title={currentUser.displayName || currentUser.email || 'Profile'}
                >
                  <User className="w-5 h-5 text-white" />
                </button>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  title="Login"
                >
                  <User className="w-5 h-5 text-white" />
                </button>
              )}
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
            </div>
          </div>
        </div>
      </div>

      {/* Header dengan Background Putih - Meja, Filter, Search */}
      <div className="bg-white">
        <div className="max-w-md mx-auto">
          {/* Status Meja - Card dengan Background Foto Cafe */}
          <div 
            className={`mb-4 mt-4 px-4 transition-all duration-300 ease-in-out ${
              showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none h-0 overflow-hidden'
            }`}
          >
            <div className="relative w-full h-28 rounded-xl overflow-hidden">
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
                  {tableInfo.isToken ? '-' : tableInfo.tableNumber}
                </span>
              </div>
            </div>
          </div>
          
          {/* Filter & Search - Minimal */}
          <div 
            className={`flex items-center gap-2 px-4 mb-3 transition-all duration-300 ease-in-out ${
              showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none h-0 overflow-hidden'
            }`}
          >
            <button 
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200 transition-colors text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              {filterCategory && (
                <span className="ml-0.5 w-1.5 h-1.5 bg-primary-600 rounded-full"></span>
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
                  className="w-full px-3 py-2.5 pr-9 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowSearch(true)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <Search className="w-4 h-4 text-gray-500" />
                <span>Cari menu</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CategoryTabs - Sticky di bawah navbar */}
      {availableCategories.length > 0 && (
        <div className="sticky top-[96px] z-30 bg-white border-b border-gray-100">
          <CategoryTabs
            categories={availableCategories}
            activeCategory={filterCategory || activeCategory}
            onCategoryChange={(category) => {
              setActiveCategory(category)
              setFilterCategory(null)
            }}
          />
        </div>
      )}

      <MenuList 
        token={rawParam}
        searchQuery={showSearch ? searchQuery : ''} 
        filterCategory={filterCategory}
        activeCategory={activeCategory}
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
                      setActiveCategory(null)
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
                        setActiveCategory(category)
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
                  setActiveCategory(null)
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
        tableNumber={tableInfo.isToken ? 0 : tableInfo.tableNumber}
        token={tableInfo.isToken ? tableInfo.rawToken || rawParam : undefined}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Login</h2>
                <button
                  onClick={() => {
                    setShowLoginModal(false)
                    setPhoneNumber('')
                    setLoginError(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">Masukkan nomor HP yang sudah terdaftar</p>
            </div>

            {/* Form */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor HP
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => {
                      setPhoneNumber(e.target.value)
                      setLoginError(null)
                    }}
                    placeholder="08xxxxxxxxxx"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handlePhoneLogin()
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 08xxxxxxxxxx</p>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{loginError}</p>
                  </div>
                )}

                <button
                  onClick={handlePhoneLogin}
                  disabled={loginLoading || !phoneNumber.trim()}
                  className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg hover:from-primary-700 hover:to-primary-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm"
                >
                  {loginLoading ? 'Memproses...' : 'Login'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  )
}

