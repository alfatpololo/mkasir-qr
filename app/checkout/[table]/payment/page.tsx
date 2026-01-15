'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react'
import { Button } from '@/components/Button'
import { useCartStore } from '@/lib/cart-store'
import { createOrder } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import { validateEmail, validatePhone, validateName, validateOrderNote, checkRateLimit } from '@/lib/validation'
import { parseTableParam, parseTableParamQuick } from '@/lib/token-utils'
import { buildPOSPayload, sendOrderToPOS } from '@/lib/pos-api'
import Image from 'next/image'

function PaymentMethodContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const paramValueRaw = (params as any).table
  
  // Handle parameter yang mungkin array atau string
  let tableParam: string
  if (Array.isArray(paramValueRaw)) {
    // Jika array, gabungkan dengan ':' untuk menangani token dengan format id:token
    tableParam = paramValueRaw.join(':')
  } else {
    tableParam = paramValueRaw as string || ''
  }
  
  // Decode URL jika perlu
  try {
    tableParam = decodeURIComponent(tableParam)
  } catch (e) {
    // Jika decode gagal, gunakan parameter asli
    console.warn('Failed to decode param:', tableParam)
  }
  
  const [tableInfo, setTableInfo] = useState<{
    isValid: boolean
    isToken: boolean
    tableNumber: number
    stallId: string | null
    rawToken?: string
  } | null>(null)
  const [validatingTable, setValidatingTable] = useState(true)
  
  // Semua hooks harus dideklarasikan di sini, sebelum early return
  const [paymentMethod, setPaymentMethod] = useState<'QRIS_RESTAURANT' | 'CASHIER' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(true)
  const [orderCompleted, setOrderCompleted] = useState(false)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [posOrderId, setPosOrderId] = useState<string | null>(null)
  const [posOrderNumber, setPosOrderNumber] = useState<string | null>(null)
  const [customerData, setCustomerData] = useState<{
    name: string
    phone: string
    email: string
    note: string
  } | null>(null)
  const [decryptingData, setDecryptingData] = useState(false)
  
  const items = useCartStore((state) => state.items)
  const getTotal = useCartStore((state) => state.getTotal)
  const clearCart = useCartStore((state) => state.clearCart)
  
  // Validate and parse table parameter (quick mode untuk development)
  useEffect(() => {
    if (!tableParam) {
      setValidatingTable(false)
      return
    }

    setValidatingTable(true)
    
    const timer = setTimeout(() => {
      try {
        // Debug: log parameter yang diterima
        console.log('🔍 Payment - Raw param received:', tableParam)
        console.log('🔍 Payment - Param type:', typeof tableParam)
        
        // Langsung pakai quick parse (dummy data untuk development)
        const parsed = parseTableParamQuick(tableParam)
        console.log('🔍 Payment - Parsed result:', parsed)
        
        setTableInfo(parsed)
      } catch (err: any) {
        console.error('Error validating table param:', err)
        // Fallback ke dummy data
        const dummy = {
          isValid: true,
          isToken: true,
          tableNumber: 5,
          stallId: 'dummy_stall',
          rawToken: tableParam,
        }
        setTableInfo(dummy)
      } finally {
        setValidatingTable(false)
      }
    }, 100)
    
    return () => clearTimeout(timer)
  }, [tableParam])

  // Check if mobile device
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Get encrypted data or plain data from query params
  const encryptedData = searchParams.get('data') || ''
  const rawName = searchParams.get('name') || ''
  const rawPhone = searchParams.get('phone') || ''
  const rawEmail = searchParams.get('email') || ''
  const rawNote = searchParams.get('note') || ''
  
  // Decrypt customer data if encrypted
  useEffect(() => {
    if (encryptedData && !customerData && !decryptingData) {
      setDecryptingData(true)
      fetch('/api/decrypt-customer-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: encryptedData }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setCustomerData(data.data)
          } else {
            // Jika dekripsi gagal, redirect ke checkout
            console.error('Failed to decrypt customer data, redirecting to checkout')
            const redirectParam = tableInfo?.rawToken || tableParam
            router.push(`/checkout/${redirectParam}`)
          }
          setDecryptingData(false)
        })
        .catch(err => {
          console.error('Error decrypting customer data:', err)
          const redirectParam = tableInfo?.rawToken || tableParam
          router.push(`/checkout/${redirectParam}`)
          setDecryptingData(false)
        })
    } else if (!encryptedData && (rawName || rawPhone || rawEmail)) {
      // Jika tidak terenkripsi, redirect ke checkout untuk keamanan
      console.warn('Unencrypted data detected, redirecting to checkout for encryption')
      const redirectParam = tableInfo?.rawToken || tableParam
      router.push(`/checkout/${redirectParam}`)
    }
  }, [encryptedData, rawName, rawPhone, rawEmail, rawNote, customerData, decryptingData, tableInfo, tableParam, router])
  
  // Validate and sanitize inputs
  const nameValidation = validateName(customerData?.name || rawName)
  const phoneValidation = validatePhone(customerData?.phone || rawPhone)
  const emailValidation = validateEmail(customerData?.email || rawEmail)
  const noteValidation = validateOrderNote(customerData?.note || rawNote)

  // Redirect if cart is empty or missing customer data (tapi tunggu dekripsi selesai)
  useEffect(() => {
    if (!tableInfo) return
    if (decryptingData) return // Tunggu dekripsi selesai
    if (orderCompleted) {
      console.log('✅ Order completed, skipping redirect to show QRIS')
      return // Jangan redirect jika order sudah completed (untuk menampilkan QRIS)
    }
    
    if (items.length === 0) {
      console.log('⚠️ Cart is empty, redirecting to menu')
      // Untuk token mode, redirect ke menu dengan token
      if (tableInfo.isToken && tableInfo.rawToken) {
        router.push(`/menu/${tableInfo.rawToken}`)
      } else {
        router.push(`/menu/${tableInfo.tableNumber}`)
      }
      return
    }
    
    // Jika ada encrypted data tapi belum didekripsi, tunggu
    if (encryptedData && !customerData) {
      return
    }
    
    // Validate customer data
    if (!nameValidation.valid || !phoneValidation.valid || !emailValidation.valid) {
      const redirectParam = tableInfo.rawToken || tableParam
      router.push(`/checkout/${redirectParam}`)
      return
    }
  }, [items.length, nameValidation.valid, phoneValidation.valid, emailValidation.valid, tableInfo, tableParam, router, decryptingData, encryptedData, customerData, orderCompleted])
  
  // Show loading while validating or decrypting
  if (validatingTable || decryptingData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {decryptingData ? 'Memproses data...' : 'Memvalidasi token...'}
          </p>
        </div>
      </div>
    )
  }
  
  // Show error if invalid
  if (!tableInfo || !tableInfo.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Parameter Tidak Valid</h2>
          <p className="text-gray-600 mb-4">Nomor meja atau token tidak valid.</p>
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
  
  const isTokenMode = tableInfo.isToken
  const tableNumber = tableInfo.tableNumber
  
  // Get customer data (sudah divalidasi di atas)
  const customerName = nameValidation.valid ? nameValidation.sanitized : ''
  const customerPhone = phoneValidation.valid ? phoneValidation.sanitized : ''
  const customerEmail = emailValidation.valid ? emailValidation.sanitized : ''
  const orderNote = noteValidation.valid ? noteValidation.sanitized : ''

  const handleSelesai = () => {
    // Alert selesai
    alert('Selesai')
    
    // Redirect ke menu dengan token
    if (tableInfo?.isToken && tableInfo.rawToken) {
      router.push(`/menu/${tableInfo.rawToken}`)
    } else {
      router.push(`/menu/${tableInfo?.tableNumber || tableNumber}`)
    }
  }

  const handleSubmit = async () => {
    if (!paymentMethod) {
      setError('Mohon pilih metode pembayaran')
      return
    }

    // Validate customer data again
    if (!nameValidation.valid || !phoneValidation.valid || !emailValidation.valid) {
      setError('Data pembeli tidak valid. Silakan kembali dan isi ulang.')
      const redirectParam = tableInfo?.rawToken || tableParam
      router.push(`/checkout/${redirectParam}`)
      return
    }

    // Rate limiting
    const rateLimitKey = `payment-${tableParam}-${customerEmail}`
    if (!checkRateLimit(rateLimitKey, 3, 60000)) {
      setError('Terlalu banyak percobaan. Silakan tunggu sebentar.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const total = getTotal()
      
      // Validate total
      if (total <= 0 || !isFinite(total)) {
        throw new Error('Total pesanan tidak valid')
      }

      // Validate items
      if (items.length === 0) {
        throw new Error('Keranjang kosong')
      }

      // Determine initial status based on payment method
      let initialStatus: 'WAITING' | 'WAITING_PAYMENT' = 'WAITING'
      if (paymentMethod === 'CASHIER') {
        initialStatus = 'WAITING_PAYMENT'
      }

      // Prepare items with validation
      const orderItems = items
        .filter(item => item.productId && item.name && item.qty > 0 && item.price > 0)
        .map(item => ({
          productId: item.productId,
          name: item.name.slice(0, 200), // Sanitize name length
          qty: Math.min(Math.max(1, item.qty), 999), // Clamp quantity
          note: item.note ? item.note.slice(0, 200) : undefined, // Sanitize note
        }))

      if (orderItems.length === 0) {
        throw new Error('Tidak ada item valid untuk dipesan')
      }

      // Create order with sanitized data
      const orderId = await createOrder({
        tableNumber,
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        paymentMethod,
        orderNote: orderNote || undefined,
        items: orderItems,
        status: initialStatus,
        total,
      })

      // Kirim data transaksi ke POS API
      try {
        console.log('📤 Sending transaction data to POS API...')
        
        // Build payload untuk POS API menggunakan data dari cart items (masih ada sebelum clearCart)
        const posPayload = buildPOSPayload({
          token: tableInfo?.isToken ? tableInfo.rawToken : undefined,
          tableNumber: tableInfo?.isToken ? undefined : tableNumber,
          customerName: customerName,
          customerPhone: customerPhone,
          customerEmail: customerEmail,
          paymentMethod: paymentMethod,
          orderNote: orderNote || undefined,
          items: items.map(item => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            qty: item.qty,
            note: item.note,
          })),
          status: initialStatus,
        })

        console.log('📦 POS Payload:', JSON.stringify(posPayload, null, 2))

        // Kirim ke POS API
        const posResponse = await sendOrderToPOS(posPayload)
        
        if (posResponse.success && posResponse.data) {
          console.log('✅ Transaction sent to POS API successfully:', posResponse.data.order_id)
          console.log('📋 POS Order ID:', posResponse.data.order_id)
          console.log('📋 POS Order Number:', posResponse.data.order_number)
          
          // Simpan POS order ID untuk ditampilkan di UI
          setPosOrderId(posResponse.data.order_id)
          if (posResponse.data.order_number) {
            setPosOrderNumber(posResponse.data.order_number)
          }
        } else {
          console.warn('⚠️ POS API response not successful:', posResponse.error)
        }
      } catch (posError: any) {
        // Jangan gagalkan proses jika POS API error, karena order sudah tersimpan di Firestore
        console.error('❌ Error sending transaction to POS API:', posError)
        console.warn('⚠️ Order saved to Firestore but POS API sync failed. Firestore Order ID:', orderId)
      }

      // Set order completed state SEBELUM clear cart untuk mencegah redirect
      setCompletedOrderId(orderId)
      setOrderCompleted(true)
      
      // Clear cart setelah state di-set
      clearCart()
      
      setLoading(false)
      console.log('✅ Order completed, QRIS should be displayed')
    } catch (err: any) {
      console.error('Error creating order:', err)
      setError(err.message || 'Gagal membuat pesanan. Silakan coba lagi.')
      setLoading(false)
    }
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

  const total = getTotal()

  // Tampilkan hasil setelah order completed
  if (orderCompleted && paymentMethod) {
    console.log('📱 Rendering QRIS/Cashier page, orderCompleted:', orderCompleted, 'paymentMethod:', paymentMethod)
    const menuUrl = tableInfo?.isToken && tableInfo.rawToken 
      ? `/menu/${tableInfo.rawToken}`
      : `/menu/${tableInfo?.tableNumber || tableNumber}`

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 sticky top-0 z-40">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold">
                {paymentMethod === 'QRIS_RESTAURANT' ? 'Pembayaran QRIS' : 'Pembayaran Kasir'}
              </h1>
            </div>
            <div className="w-12 h-12 relative">
              <Image
                src="/images/logo.png"
                alt="MKASIR Logo"
                width={48}
                height={48}
                className="object-contain w-full h-full"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-6">
          {/* Info Pesanan */}
          {completedOrderId && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-green-800">Pesanan berhasil dibuat</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-green-700">Firestore ID: {completedOrderId}</p>
                {posOrderId && (
                  <p className="text-xs text-green-700">POS Order ID: {posOrderId}</p>
                )}
                {posOrderNumber && (
                  <p className="text-xs text-green-700 font-semibold">Order Number: {posOrderNumber}</p>
                )}
                {!posOrderId && (
                  <p className="text-xs text-yellow-700 italic">(Sinkronisasi ke POS API sedang diproses...)</p>
                )}
              </div>
            </div>
          )}

          {paymentMethod === 'QRIS_RESTAURANT' ? (
            // Tampilan QRIS
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Scan QR Code untuk Pembayaran</h2>
                <p className="text-sm text-gray-600 mb-4">Total: {formatCurrency(total)}</p>
                
                {/* QRIS Image - Statis */}
                <div className="bg-white p-6 rounded-xl border-2 border-gray-200 inline-block mb-4">
                  <div className="w-64 h-64 bg-white rounded-lg flex items-center justify-center border-2 border-gray-300">
                    {/* QR Code Pattern - Statis */}
                    <div className="w-56 h-56 bg-white p-2">
                      <div className="grid grid-cols-21 gap-0.5 w-full h-full">
                        {Array.from({ length: 441 }).map((_, i) => {
                          const row = Math.floor(i / 21)
                          const col = i % 21
                          // Pattern QR code sederhana
                          const isBlack = 
                            (row < 3 && col < 3) || // Top-left corner
                            (row < 3 && col >= 18) || // Top-right corner
                            (row >= 18 && col < 3) || // Bottom-left corner
                            (row === 10) || // Horizontal line
                            (col === 10) || // Vertical line
                            ((row + col) % 3 === 0 && row > 3 && row < 18 && col > 3 && col < 18) // Pattern
                          return (
                            <div
                              key={i}
                              className={`w-full h-full ${isBlack ? 'bg-gray-900' : 'bg-white'}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-2">
                  Scan QR code di atas menggunakan aplikasi pembayaran Anda
                </p>
                <p className="text-xs text-gray-500">
                  Setelah pembayaran selesai, klik tombol "Selesai" di bawah
                </p>
              </div>
            </div>
          ) : (
            // Tampilan Kasir
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-10 h-10 text-primary-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Silahkan ke Kasir</h2>
                <p className="text-sm text-gray-600 mb-2">
                  Pesanan Anda sudah tercatat
                </p>
                <p className="text-sm text-gray-600">
                  Silakan menuju ke kasir untuk melakukan pembayaran
                </p>
              </div>
            </div>
          )}

          {/* Tombol Selesai */}
          <Button
            variant="primary"
            className="w-full"
            onClick={handleSelesai}
          >
            <span>Selesai</span>
          </Button>
        </div>
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
              onClick={() => router.back()}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Pilih Metode Pembayaran</h1>
          </div>
          <div className="w-12 h-12 relative">
            <Image
              src="/images/logo.png"
              alt="MKASIR Logo"
              width={48}
              height={48}
              className="object-contain w-full h-full"
              priority
              unoptimized
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Total */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900 text-lg">Total</span>
            <span className="text-2xl font-bold text-primary-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-6">
          <h2 className="font-bold text-gray-900 mb-3 text-lg">Data Pembeli</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-gray-600">Nama</span>
              <span className="font-medium text-gray-900 text-right">{customerName}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-600">Email</span>
              <span className="font-medium text-gray-900 text-right break-all max-w-[60%]">{customerEmail}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-gray-600">Nomor HP</span>
              <span className="font-medium text-gray-900 text-right">{customerPhone}</span>
            </div>
            {orderNote && (
              <div className="pt-2.5 mt-2.5 border-t border-gray-200">
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Catatan Pesanan</span>
                  <span className="font-medium text-gray-900 text-right text-sm max-w-[60%]">{orderNote}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Pilih Metode Pembayaran</h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <label 
              className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'QRIS_RESTAURANT' 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setPaymentMethod('QRIS_RESTAURANT')}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="QRIS_RESTAURANT"
                checked={paymentMethod === 'QRIS_RESTAURANT'}
                onChange={() => setPaymentMethod('QRIS_RESTAURANT')}
                className="mt-1 mr-3 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                  <div className="font-semibold text-gray-900">Bayar di Tempat (QRIS)</div>
                </div>
                <div className="text-xs text-gray-600">
                  Scan QR code resto untuk pembayaran langsung
                </div>
              </div>
            </label>

            <label 
              className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                paymentMethod === 'CASHIER' 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => setPaymentMethod('CASHIER')}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="CASHIER"
                checked={paymentMethod === 'CASHIER'}
                onChange={() => setPaymentMethod('CASHIER')}
                className="mt-1 mr-3 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="w-5 h-5 text-primary-600" />
                  <div className="font-semibold text-gray-900">Bayar ke Kasir</div>
                </div>
                <div className="text-xs text-gray-600">
                  Pesanan selesai, bayar langsung di kasir
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          variant="primary"
          className="w-full"
          onClick={handleSubmit}
          isLoading={loading}
          disabled={!paymentMethod || loading}
        >
          <span>Konfirmasi Pesanan</span>
        </Button>
      </div>
    </div>
  )
}

export default function PaymentMethodPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      }
    >
      <PaymentMethodContent />
    </Suspense>
  )
}

