'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react'
import { Button } from '@/components/Button'
import { useCartStore } from '@/lib/cart-store'
import { createOrder } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import { validateEmail, validatePhone, validateName, validateOrderNote, checkRateLimit } from '@/lib/validation'
import { parseTableParam, parseTableParamQuick, DEFAULT_MENU_TOKEN } from '@/lib/token-utils'
import { buildMejaTransaksiPayload, sendTransactionToMeja, getMejaProfile, buildQRISImageURL } from '@/lib/pos-api'
import { getSession } from '@/lib/auth'
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
  const menuUrl = () => {
    const sessionUser = getSession()
    const cid = (sessionUser as any)?.customerId
    return cid ? `/menu/${DEFAULT_MENU_TOKEN}?customer_id=${cid}` : `/menu/${DEFAULT_MENU_TOKEN}`
  }
  const [customerData, setCustomerData] = useState<{
    name: string
    phone: string
    email: string
    note: string
  } | null>(null)
  const [decryptingData, setDecryptingData] = useState(false)
  const [qrisAvailable, setQrisAvailable] = useState(false)
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [orderTotal, setOrderTotal] = useState<number>(0) // Simpan total sebelum cart di-clear
  const [savedOrderItems, setSavedOrderItems] = useState<Array<{
    productId: string
    name: string
    price: number
    qty: number
    note?: string
  }>>([]) // Simpan items sebelum cart di-clear
  
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
        
        // Simpan token/table ke localStorage untuk redirect nanti
        if (parsed.isToken && parsed.rawToken) {
          localStorage.setItem('tableToken', parsed.rawToken)
        } else {
          localStorage.setItem('tableNumber', String(parsed.tableNumber))
        }
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
      console.log('🔓 Decrypting customer data, token length:', encryptedData.length)
      
      fetch('/api/decrypt-customer-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: encryptedData }),
      })
        .then(async (res) => {
          const data = await res.json()
          
          if (!res.ok) {
            console.error('❌ Decrypt API error:', res.status, data)
            throw new Error(data.error || 'Failed to decrypt customer data')
          }
          
          if (data.success && data.data) {
            console.log('✅ Decryption successful')
            setCustomerData(data.data)
          } else {
            console.error('❌ Decrypt failed:', data)
            throw new Error(data.error || 'Failed to decrypt customer data')
          }
          setDecryptingData(false)
        })
        .catch(err => {
          console.error('❌ Error decrypting customer data:', err)
          setError(err.message || 'Gagal memproses data pembeli. Silakan kembali ke checkout.')
          setDecryptingData(false)
        })
    } else if (!encryptedData && (rawName || rawPhone || rawEmail)) {
      // Jika tidak terenkripsi, set customer data dari raw data (untuk backward compatibility)
      console.warn('Unencrypted data detected, using raw data')
      setCustomerData({
        name: rawName || '',
        phone: rawPhone || '',
        email: rawEmail || '',
        note: rawNote || '',
      })
      setDecryptingData(false)
    }
  }, [encryptedData, rawName, rawPhone, rawEmail, rawNote, customerData, decryptingData, tableInfo, tableParam, router])
  
  // Validate and sanitize inputs
  const nameValidation = validateName(customerData?.name || rawName)
  const phoneValidation = validatePhone(customerData?.phone || rawPhone)
  const emailValidation = validateEmail(customerData?.email || rawEmail)
  const noteValidation = validateOrderNote(customerData?.note || rawNote)

  // Cek QRIS availability dari API /meja/profile
  useEffect(() => {
    if (!tableInfo || !tableInfo.isToken || !tableInfo.rawToken) {
      setLoadingProfile(false)
      return
    }

    const checkQRIS = async () => {
      try {
        setLoadingProfile(true)
        console.log('🔍 Checking QRIS availability for token:', tableInfo.rawToken)
        
        // Type guard: ensure rawToken exists
        if (!tableInfo.rawToken) {
          console.warn('⚠️ No rawToken available, skipping QRIS check')
          setLoadingProfile(false)
          return
        }
        
        const profileResponse = await getMejaProfile(tableInfo.rawToken)
        
        console.log('📋 Profile response:', JSON.stringify(profileResponse, null, 2))
        
        if (profileResponse.status === 'Success' && profileResponse.data?.stall?.qris) {
          const qrisPath = profileResponse.data?.stall?.qris
          console.log('📋 QRIS path from API:', qrisPath)
          
          // Cek apakah qris ada, tidak kosong, dan tidak null
          if (qrisPath && qrisPath.trim() !== '' && qrisPath !== 'null') {
            const qrisUrl = buildQRISImageURL(qrisPath)
            if (qrisUrl) {
              console.log('✅ QRIS available:', qrisUrl)
              setQrisAvailable(true)
              setQrisImageUrl(qrisUrl)
            } else {
              console.log('⚠️ QRIS path invalid, but still allowing QRIS option')
              // Tetap tampilkan QRIS option meskipun URL invalid (fallback)
              setQrisAvailable(true)
              setQrisImageUrl(null)
            }
          } else {
            console.log('⚠️ QRIS not available (empty or null), but still allowing QRIS option')
            // Tetap tampilkan QRIS option meskipun tidak ada di API (fallback)
            setQrisAvailable(true)
            setQrisImageUrl(null)
          }
        } else {
          console.log('⚠️ QRIS not available in response, but still allowing QRIS option')
          // Tetap tampilkan QRIS option meskipun tidak ada di response (fallback)
          setQrisAvailable(true)
          setQrisImageUrl(null)
        }
      } catch (error: any) {
        console.error('❌ Error checking QRIS availability:', error)
        setQrisAvailable(false)
      } finally {
        setLoadingProfile(false)
      }
    }

    checkQRIS()
  }, [tableInfo])

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
      // Redirect ke menu dengan default token + customer_id jika ada
      router.push(menuUrl())
      return
    }
    
    // Jika ada encrypted data tapi belum didekripsi, tunggu
    if (encryptedData && !customerData) {
      return
    }
    
    // Validate customer data (email optional)
    // Jangan redirect jika sudah ada customerData (berarti sudah berhasil didekripsi)
    // Hanya redirect jika benar-benar tidak ada data customer sama sekali
    if (!customerData && (!nameValidation.valid || !phoneValidation.valid)) {
      console.warn('⚠️ Customer data invalid, redirecting to checkout')
      const redirectParam = tableInfo.rawToken || tableParam
      router.push(`/checkout/${redirectParam}`)
      return
    }
  }, [items.length, nameValidation.valid, phoneValidation.valid, tableInfo, tableParam, router, decryptingData, encryptedData, customerData, orderCompleted])
  
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

  const handleSelesai = async () => {
    // Hanya untuk QRIS, insert ke API saat klik Selesai
    if (paymentMethod === 'QRIS_RESTAURANT' && completedOrderId && savedOrderItems.length > 0) {
      setLoading(true)
      
      try {
        console.log('📤 Inserting transaction to /meja/transaksi (QRIS completed)...')
        
        // Tentukan nomor meja: jika token mode, gunakan 0 atau tableNumber dari tableInfo
        const mejaNumber = tableInfo?.isToken 
          ? (tableInfo.tableNumber || 0) 
          : (tableNumber || 0)
        
        // Ambil token meja jika menggunakan token mode (format: stall_id:token)
        const tokenMeja = tableInfo?.isToken && tableInfo.rawToken 
          ? tableInfo.rawToken 
          : undefined
        
        // Ambil customerId dari session jika user sudah login
        const sessionUser = getSession()
        const customerId = (sessionUser as any)?.customerId
        
        console.log('👤 Customer ID dari session (QRIS):', customerId)
        console.log('👤 Customer ID type:', typeof customerId)
        console.log('👤 Session user:', sessionUser)
        
        if (!customerId) {
          console.warn('⚠️ WARNING: No customerId found in session! Order will not be linked to customer account.')
          console.warn('⚠️ User should login first to link orders to their account.')
        }

        // Build payload untuk endpoint /meja/transaksi dengan status "selesai" dan transaction_method_id: 4
        const mejaPayload = buildMejaTransaksiPayload({
          token: tokenMeja,
          tableNumber: mejaNumber,
          customerName: customerName,
          customerPhone: customerPhone,
          customerEmail: customerEmail,
          customerId: customerId, // Tambahkan customerId jika user sudah login
          paymentMethod: 'QRIS_RESTAURANT',
          orderNote: orderNote || undefined,
          items: savedOrderItems,
          status: 'PAID', // Status untuk QRIS yang sudah selesai
          transactionMethodId: 4, // QRIS transaction method
        })
        
        // Update status menjadi "selesai"
        mejaPayload.status = 'selesai'
        
        console.log('📦 Payload untuk /meja/transaksi (QRIS completed):', JSON.stringify(mejaPayload, null, 2))
        console.log('📦 Customer ID di payload:', mejaPayload.customer_id)

        // Kirim ke endpoint /meja/transaksi
        const posResponse = await sendTransactionToMeja(mejaPayload)
        
        // Cek jika status 200 dan response.status === "Success"
        if (posResponse.status === 'Success' && posResponse.data) {
          console.log('✅ Transaction sent to /meja/transaksi successfully')
          console.log('📋 Response data:', posResponse.data)
          
          // Simpan data untuk ditampilkan di UI
          if (posResponse.data.id) {
            setPosOrderId(String(posResponse.data.id))
          } else if (posResponse.data.order_id) {
            setPosOrderId(posResponse.data.order_id)
          }
          
          if (posResponse.data.nomor_transaksi) {
            setPosOrderNumber(posResponse.data.nomor_transaksi)
          } else if (posResponse.data.order_number) {
            setPosOrderNumber(posResponse.data.order_number)
          }
        } else {
          console.warn('⚠️ Response dari /meja/transaksi tidak berhasil:', posResponse)
          const errorMsg = posResponse.error?.message || posResponse.message || 'Gagal mengirim transaksi ke server'
          alert(`⚠️ Gagal mengirim transaksi\n\n${errorMsg}`)
          setLoading(false)
          return
        }
      } catch (posError: any) {
        console.error('❌ Error sending transaction to /meja/transaksi:', posError)
        const errorMessage = posError.message || 'Terjadi kesalahan saat mengirim transaksi ke server'
        alert(`❌ Gagal mengirim transaksi\n\n${errorMessage}`)
        setLoading(false)
        return
      }
      
      setLoading(false)
    }
    
    // Redirect ke halaman konfirmasi "Pesanan berhasil" dengan orderId
    if (completedOrderId) {
      router.push(`/order-success/${completedOrderId}`)
    } else {
      // Fallback ke menu jika tidak ada orderId
      // Redirect ke menu dengan default token + customer_id jika ada
      router.push(menuUrl())
    }
  }

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit called - Konfirmasi Pesanan clicked')
    
    if (!paymentMethod) {
      setError('Mohon pilih metode pembayaran')
      return
    }

    // Validate customer data again (email optional, jadi tidak perlu validasi email)
    if (!nameValidation.valid || !phoneValidation.valid) {
      setError('Data pembeli tidak valid. Silakan kembali dan isi ulang.')
      // Jangan redirect otomatis, biarkan user pilih sendiri
      setLoading(false)
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
    console.log('✅ Validation passed, starting order creation...')

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
      console.log('📝 Creating order in Firestore...')
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
      console.log('✅ Order created in Firestore with ID:', orderId)

      // Kirim data transaksi ke endpoint /meja/transaksi HANYA untuk pembayaran KASIR
      // Untuk QRIS, tidak perlu insert ke /meja/transaksi dulu
      if (paymentMethod === 'CASHIER') {
        console.log('📤 Preparing to send transaction to /meja/transaksi (CASHIER only)...')
        console.log('📊 Items count:', items.length)
        console.log('📊 Table info:', { isToken: tableInfo?.isToken, tableNumber: tableNumber })
        
        let apiSuccess = false
        
        try {
          console.log('📤 Sending transaction data to /meja/transaksi...')
          
          // Tentukan nomor meja: jika token mode, gunakan 0 atau tableNumber dari tableInfo
          const mejaNumber = tableInfo?.isToken 
            ? (tableInfo.tableNumber || 0) 
            : (tableNumber || 0)
          
          // Ambil token meja jika menggunakan token mode (format: stall_id:token)
          const tokenMeja = tableInfo?.isToken && tableInfo.rawToken 
            ? tableInfo.rawToken 
            : undefined
          
          // Ambil customerId dari session jika user sudah login
          const sessionUser = getSession()
          const customerId = (sessionUser as any)?.customerId
          
          console.log('👤 Customer ID dari session (CASHIER):', customerId)
          console.log('👤 Customer ID type:', typeof customerId)
          console.log('👤 Session user (CASHIER):', sessionUser)
          
          if (!customerId) {
            console.warn('⚠️ WARNING: No customerId found in session! Order will not be linked to customer account.')
            console.warn('⚠️ User should login first to link orders to their account.')
          }

          // Build payload untuk endpoint /meja/transaksi menggunakan data dari cart items
          const mejaPayload = buildMejaTransaksiPayload({
            token: tokenMeja,
            tableNumber: mejaNumber,
            customerName: customerName,
            customerPhone: customerPhone,
            customerEmail: customerEmail,
            customerId: customerId, // Tambahkan customerId jika user sudah login
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

          console.log('📦 Payload untuk /meja/transaksi:', JSON.stringify(mejaPayload, null, 2))
          console.log('📦 Customer ID di payload (CASHIER):', mejaPayload.customer_id)

          // Kirim ke endpoint /meja/transaksi
          const posResponse = await sendTransactionToMeja(mejaPayload)
          
          // Cek jika status 200 dan response.status === "Success"
          if (posResponse.status === 'Success' && posResponse.data) {
            console.log('✅ Transaction sent to /meja/transaksi successfully')
            console.log('📋 Response data:', posResponse.data)
            
            // Simpan data untuk ditampilkan di UI
            if (posResponse.data.id) {
              setPosOrderId(String(posResponse.data.id))
            } else if (posResponse.data.order_id) {
              setPosOrderId(posResponse.data.order_id)
            }
            
            if (posResponse.data.nomor_transaksi) {
              setPosOrderNumber(posResponse.data.nomor_transaksi)
            } else if (posResponse.data.order_number) {
              setPosOrderNumber(posResponse.data.order_number)
            }
            
            apiSuccess = true
          } else {
            console.warn('⚠️ Response dari /meja/transaksi tidak berhasil:', posResponse)
            // Tampilkan error ke user jika response tidak berhasil
            const errorMsg = posResponse.error?.message || posResponse.message || 'Gagal mengirim transaksi ke server'
            console.error('❌ API Error:', errorMsg)
            
            // Set error state untuk ditampilkan di UI
            setError(`Gagal mengirim transaksi ke server: ${errorMsg}. Silakan coba lagi.`)
            
            // Tampilkan alert ke user
            alert(`⚠️ Transaksi Gagal\n\n${errorMsg}\n\nSilakan coba lagi atau hubungi admin.`)
            
            // Jangan lanjutkan proses, tetap di halaman ini
            setLoading(false)
            return
          }
        } catch (posError: any) {
          // Log error detail untuk debugging
          console.error('❌ Error sending transaction to /meja/transaksi:', posError)
          console.error('❌ Error details:', {
            message: posError.message,
            stack: posError.stack,
            response: posError.response,
          })
          console.warn('⚠️ Order saved to Firestore but API sync failed. Firestore Order ID:', orderId)
          
          // Set error state untuk ditampilkan di UI
          const errorMessage = posError.message || 'Terjadi kesalahan saat mengirim transaksi ke server'
          setError(`Gagal mengirim transaksi: ${errorMessage}. Silakan coba lagi.`)
          
          // Tampilkan alert ke user
          alert(`❌ Transaksi Gagal\n\n${errorMessage}\n\nSilakan coba lagi atau hubungi admin.\n\nOrder ID: ${orderId}`)
          
          // Jangan lanjutkan proses, tetap di halaman ini
          setLoading(false)
          return
        }

        // Hanya lanjutkan jika API berhasil (untuk CASHIER)
        if (!apiSuccess) {
          setLoading(false)
          return
        }
      } else {
        // Untuk QRIS, tidak perlu insert ke API, langsung lanjut
        console.log('✅ QRIS payment selected, skipping /meja/transaksi API call')
      }

      // Simpan customer data ke localStorage untuk riwayat pesanan (nomor HP wajib, email optional)
      if (customerPhone) {
        localStorage.setItem('customerPhone', customerPhone)
      }
      if (customerEmail) {
        localStorage.setItem('customerEmail', customerEmail)
      }
      
      // Simpan total dan items SEBELUM clear cart
      console.log('💰 Saving order total:', total)
      setOrderTotal(total)
      setSavedOrderItems(orderItems.map(item => ({
        productId: item.productId,
        name: item.name,
        price: items.find(i => i.productId === item.productId)?.price || 0,
        qty: item.qty,
        note: item.note,
      })))
      console.log('💰 Order total saved:', total, 'Items saved:', orderItems.length)
      
      // Clear cart setelah state di-set
      clearCart()
      
      setLoading(false)
      console.log('✅ Order completed, orderId:', orderId)
      
      // Untuk CASHIER, langsung redirect ke order-success
      // Untuk QRIS, tampilkan QRIS page dulu
      if (paymentMethod === 'CASHIER') {
        router.push(`/order-success/${orderId}`)
      } else {
        // Set order completed state untuk menampilkan QRIS page
        setCompletedOrderId(orderId)
        setOrderCompleted(true)
      }
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

  // Gunakan orderTotal jika sudah ada, jika belum gunakan getTotal() (untuk preview sebelum submit)
  const total = orderTotal > 0 ? orderTotal : getTotal()
  console.log('💰 Display total - orderTotal:', orderTotal, 'getTotal():', getTotal(), 'final total:', total)

  // Tampilkan QRIS/Cashier page setelah order completed
  if (orderCompleted && paymentMethod) {
    console.log('📱 Rendering QRIS/Cashier page, orderCompleted:', orderCompleted, 'paymentMethod:', paymentMethod)

    return (
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <h1 className="text-base font-semibold text-gray-900">
              {paymentMethod === 'QRIS_RESTAURANT' ? 'Pembayaran QRIS' : 'Pembayaran Kasir'}
            </h1>
            <div className="w-8 h-8 relative">
              <Image
                src="/images/logo.png"
                alt="MKASIR Logo"
                width={32}
                height={32}
                className="object-contain w-full h-full"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md mx-auto px-4 py-4 space-y-3">

            {paymentMethod === 'QRIS_RESTAURANT' ? (
              // Tampilan QRIS
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-center">
                  {/* Header dengan icon */}
                  <div className="mb-4">
                    <div className="w-16 h-16 mx-auto mb-3 bg-primary-100 rounded-full flex items-center justify-center">
                      <CreditCard className="w-8 h-8 text-primary-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">Scan QR Code</h2>
                    <p className="text-xs text-gray-500">Untuk melakukan pembayaran</p>
                  </div>

                  {/* Total Amount - Highlighted */}
                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4 mb-5 border border-primary-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Pembayaran</p>
                    <p className="text-2xl font-bold text-primary-700">{formatCurrency(total)}</p>
                  </div>
                  
                  {/* QRIS Image dari API */}
                  {qrisImageUrl ? (
                    <div className="bg-white p-5 rounded-xl border-2 border-gray-200 shadow-lg inline-block mb-4">
                      <div className="w-64 h-64 bg-white rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden shadow-inner">
                        <Image
                          src={qrisImageUrl}
                          alt="QRIS Code"
                          width={256}
                          height={256}
                          className="w-full h-full object-contain"
                          unoptimized
                          onError={(e) => {
                            console.error('❌ QRIS image failed to load:', qrisImageUrl)
                            // Fallback: hide image and show message
                            const target = e.target as HTMLImageElement
                            if (target.parentElement) {
                              target.parentElement.innerHTML = `
                                <div class="text-center p-4">
                                  <p class="text-xs text-gray-500 mb-2">QR Code tidak tersedia</p>
                                  <p class="text-xs text-gray-400">Silakan hubungi kasir untuk pembayaran</p>
                                </div>
                              `
                            }
                          }}
                        />
                      </div>
                    </div>
                  ) : loadingProfile ? (
                    <div className="bg-white p-5 rounded-xl border-2 border-gray-200 inline-block mb-4">
                      <div className="w-64 h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                          <p className="text-xs text-gray-500">Memuat QR Code...</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-5 rounded-xl border-2 border-gray-200 inline-block mb-4">
                      <div className="w-64 h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                        <div className="text-center p-4">
                          <p className="text-xs text-gray-500 mb-2">QR Code tidak tersedia</p>
                          <p className="text-xs text-gray-400">Silakan hubungi kasir untuk pembayaran</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <p className="text-xs font-medium text-blue-900 mb-1">Cara Pembayaran:</p>
                    <ol className="text-xs text-blue-800 space-y-1 text-left list-decimal list-inside">
                      <li>Buka aplikasi pembayaran Anda (GoPay, OVO, DANA, dll)</li>
                      <li>Pilih menu Scan QR Code</li>
                      <li>Arahkan kamera ke QR code di atas</li>
                      <li>Konfirmasi pembayaran sesuai nominal</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              // Tampilan Kasir
              <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center shadow-md">
                    <Wallet className="w-10 h-10 text-primary-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Silahkan ke Kasir</h2>
                  
                  {/* Total Amount */}
                  <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl p-4 mb-4 border border-primary-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Pembayaran</p>
                    <p className="text-2xl font-bold text-primary-700">{formatCurrency(total)}</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                    <p className="text-xs font-medium text-blue-900 mb-1">Informasi:</p>
                    <p className="text-xs text-blue-800 text-left">
                      Pesanan Anda sudah tercatat di sistem. Silakan menuju ke kasir untuk melakukan pembayaran dengan menunjukkan nomor order atau data pembeli.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fixed Bottom Button */}
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="max-w-md mx-auto">
            <Button
              variant="primary"
              className="w-full"
              onClick={handleSelesai}
              isLoading={loading}
              disabled={loading}
            >
              <span>Selesai</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">Pembayaran</h1>
          </div>
          <div className="w-8 h-8 relative">
            <Image
              src="/images/logo.png"
              alt="MKASIR Logo"
              width={32}
              height={32}
              className="object-contain w-full h-full"
              priority
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-4 space-y-3">
          {/* Total */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total</span>
              <span className="text-xl font-bold text-primary-600">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-2.5">Data Pembeli</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Nama</span>
                <span className="font-medium text-gray-900 text-right">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="font-medium text-gray-900 text-right break-all max-w-[60%]">{customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">HP</span>
                <span className="font-medium text-gray-900 text-right">{customerPhone}</span>
              </div>
              {orderNote && (
                <div className="pt-2 mt-2 border-t border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Catatan</span>
                    <span className="font-medium text-gray-900 text-right text-xs max-w-[60%]">{orderNote}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Metode Pembayaran</h2>

            {error && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-medium text-red-800">{error}</p>
              </div>
            )}

            {loadingProfile && (
              <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">Memeriksa metode pembayaran...</p>
              </div>
            )}

            <div className="space-y-2">
              {/* Tampilkan QRIS hanya jika tersedia */}
              {qrisAvailable && (
                <label 
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === 'QRIS_RESTAURANT' 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaymentMethod('QRIS_RESTAURANT')}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="QRIS_RESTAURANT"
                    checked={paymentMethod === 'QRIS_RESTAURANT'}
                    onChange={() => setPaymentMethod('QRIS_RESTAURANT')}
                    className="mr-2.5 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <CreditCard className="w-4 h-4 text-primary-600" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">QRIS</div>
                      <div className="text-xs text-gray-500">Bayar di tempat</div>
                    </div>
                  </div>
                </label>
              )}

              {/* Kasir selalu tersedia */}
              <label 
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                  paymentMethod === 'CASHIER' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setPaymentMethod('CASHIER')}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CASHIER"
                  checked={paymentMethod === 'CASHIER'}
                  onChange={() => setPaymentMethod('CASHIER')}
                  className="mr-2.5 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex items-center gap-2 flex-1">
                  <Wallet className="w-4 h-4 text-primary-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Kasir</div>
                    <div className="text-xs text-gray-500">Bayar di kasir</div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-md mx-auto">
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

