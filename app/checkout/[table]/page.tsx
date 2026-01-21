'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { User, Phone, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import { useCartStore } from '@/lib/cart-store'
import { getSession } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils'
import { validateEmail, validatePhone, validateName, validateTableParam, checkRateLimit } from '@/lib/validation'
import { parseTableParam, parseTableParamQuick, DEFAULT_MENU_TOKEN } from '@/lib/token-utils'
import Image from 'next/image'

export default function CheckoutFormPage() {
  const params = useParams()
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
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(true)
  
  // Semua hooks harus dideklarasikan di sini, sebelum early return
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loadingCustomerData, setLoadingCustomerData] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Get session user untuk check apakah sudah login
  const sessionUser = getSession()
  
  const menuUrl = () => {
    const cid = sessionUser?.customerId
    return cid ? `/menu/${DEFAULT_MENU_TOKEN}?customer_id=${cid}` : `/menu/${DEFAULT_MENU_TOKEN}`
  }
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  })
  
  const [fieldErrors, setFieldErrors] = useState<{
    customerName?: string
    customerPhone?: string
    customerEmail?: string
  }>({})
  
  // Helper function untuk check apakah form sudah terisi dari session
  const isFormFilledFromSession = (): boolean => {
    return !!(sessionUser && formData.customerName && formData.customerPhone)
  }
  
  const items = useCartStore((state) => state.items)
  const getTotal = useCartStore((state) => state.getTotal)
  
  // Validate and parse table parameter (quick mode untuk development)
  useEffect(() => {
    if (!tableParam) {
      setError('Parameter tidak ditemukan')
      setValidatingTable(false)
      return
    }

    setValidatingTable(true)
    setError('')
    
    const timer = setTimeout(() => {
      try {
        // Debug: log parameter yang diterima
        console.log('🔍 Checkout - Raw param received:', tableParam)
        console.log('🔍 Checkout - Param type:', typeof tableParam)
        console.log('🔍 Checkout - Param length:', tableParam?.length)
        
        // Langsung pakai quick parse (dummy data untuk development)
        const parsed = parseTableParamQuick(tableParam)
        console.log('🔍 Checkout - Parsed result:', parsed)
        
        setTableInfo(parsed)
        
        if (!parsed.isValid) {
          console.warn('⚠️ Checkout - Token tidak valid:', tableParam)
          setError('Nomor meja atau token tidak valid')
        } else {
          setError('') // Clear error jika valid
          
          // Simpan token/table ke localStorage untuk redirect nanti
          if (parsed.isToken && parsed.rawToken) {
            localStorage.setItem('tableToken', parsed.rawToken)
          } else {
            localStorage.setItem('tableNumber', String(parsed.tableNumber))
          }
        }
        setValidatingTable(false)
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
        setError('') // Clear error karena sudah pakai dummy
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

  // Check session (API-based) dan auto-fill form
  useEffect(() => {
    if (!tableInfo) return
    let isMounted = true
    const sessionUser = getSession()
    if (sessionUser && items.length > 0) {
      const name = sessionUser.displayName || ''
      const phone = sessionUser.phoneNumber || ''
      const email = sessionUser.email || ''
      
      setFormData(prev => ({
        ...prev,
        customerName: name,
        customerPhone: phone,
        customerEmail: email,
      }))
      setCurrentUser(sessionUser)
      
      // Jika data sudah lengkap dari session (nama dan phone), validasi otomatis
      if (name && phone) {
        const nameValidation = validateName(name)
        const phoneValidation = validatePhone(phone)
        const emailValidation = email ? validateEmail(email) : { valid: true, sanitized: email }
        
        // Clear errors jika data valid
        if (nameValidation.valid && phoneValidation.valid && emailValidation.valid) {
          setFieldErrors({})
          setError('')
        }
      }
    }
    return () => { isMounted = false }
  }, [items.length, tableInfo])

  // Redirect if cart is empty
  useEffect(() => {
    if (!tableInfo) return
    
    if (items.length === 0) {
      // Redirect ke menu dengan default token + customer_id jika ada
      router.push(menuUrl())
    }
  }, [items, tableInfo, router])
  
  // Show loading while validating
  if (validatingTable) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memvalidasi token...</p>
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
          <p className="text-gray-600 mb-4">
            {error || 'Nomor meja atau token tidak valid.'}
          </p>
          {tableInfo?.isToken && (
            <p className="text-sm text-gray-500 mb-4">
              Pastikan ENCRYPTION_KEY sudah di-set di environment variable.
            </p>
          )}
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

  // Real-time validation
  const validateField = (field: string, value: string) => {
    let validation: { valid: boolean; sanitized: string; error?: string } | null = null
    
    switch (field) {
      case 'customerName':
        validation = validateName(value)
        break
      case 'customerPhone':
        validation = validatePhone(value)
        break
      case 'customerEmail':
        validation = validateEmail(value)
        break
    }
    
    if (validation) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: validation!.valid ? undefined : validation!.error
      }))
      return validation.valid
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setLoading(true)

    try {
      // Rate limiting
      const rateLimitKey = `checkout-${tableParam}`
      if (!checkRateLimit(rateLimitKey, 5, 60000)) {
        setError('Terlalu banyak percobaan. Silakan tunggu sebentar.')
        setLoading(false)
        return
      }

      // Jika user sudah login dan data dari session lengkap, gunakan data session
      const sessionUser = getSession()
      let finalName = formData.customerName
      let finalPhone = formData.customerPhone
      let finalEmail = formData.customerEmail
      
      if (sessionUser && sessionUser.displayName && sessionUser.phoneNumber) {
        // Prioritaskan data dari session jika ada
        finalName = sessionUser.displayName
        finalPhone = sessionUser.phoneNumber
        finalEmail = sessionUser.email || formData.customerEmail
      }

      // Validate all fields (email optional)
      const nameValidation = validateName(finalName)
      const phoneValidation = validatePhone(finalPhone)
      const emailValidation = finalEmail ? validateEmail(finalEmail) : { valid: true, sanitized: '' }

      // Validasi field wajib (name dan phone)
      if (!nameValidation.valid || !phoneValidation.valid) {
        setFieldErrors({
          customerName: nameValidation.error,
          customerPhone: phoneValidation.error,
        })
        setError('Mohon perbaiki data yang diisi')
        setLoading(false)
        return
      }
      
      // Email opsional, tapi jika diisi harus valid format
      if (!emailValidation.valid) {
        setFieldErrors({
          customerEmail: emailValidation.error,
        })
        setError('Format email tidak valid. Silakan perbaiki atau kosongkan email.')
        setLoading(false)
        return
      }

      if (items.length === 0) {
        setError('Keranjang kosong')
        setLoading(false)
        return
      }

      // Enkripsi data customer sebelum redirect
      try {
        console.log('🔐 Encrypting customer data before redirect...')
        
        // Pastikan semua sanitized values valid (gunakan data final)
        const name = nameValidation.sanitized || finalName.trim()
        const phone = phoneValidation.sanitized || finalPhone.trim()
        const email = emailValidation.sanitized || finalEmail.trim() || ''
        
        if (!name || !phone) {
          throw new Error('Nama dan nomor HP harus diisi')
        }
        
        const payload = {
          name,
          phone,
          email,
        }
        
        console.log('🔐 Payload to encrypt:', payload)
        
        const encryptResponse = await fetch('/api/encrypt-customer-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!encryptResponse.ok) {
          const errorData = await encryptResponse.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ Encryption API error:', encryptResponse.status, errorData)
          throw new Error(errorData.error || 'Gagal mengenkripsi data')
        }

        const encryptData = await encryptResponse.json()
        console.log('🔐 Encryption response:', encryptData)
        
        if (!encryptData.success || !encryptData.data?.token) {
          console.error('❌ Invalid encryption response:', encryptData)
          throw new Error(encryptData.error || 'Gagal mendapatkan token terenkripsi')
        }

        // Redirect dengan token terenkripsi
        const params = new URLSearchParams({
          data: encryptData.data.token,
        })
        
        // Gunakan rawToken jika ada (untuk token mode), atau tableNumber
        const redirectParam = tableInfo?.rawToken || tableInfo?.tableNumber?.toString() || tableParam
        
        // Encode parameter untuk URL (khusus untuk token yang mengandung ':')
        const encodedParam = redirectParam.includes(':') 
          ? redirectParam.split(':').map(part => encodeURIComponent(part)).join(':')
          : encodeURIComponent(redirectParam)
        
        const redirectUrl = `/checkout/${encodedParam}/payment?${params.toString()}`
        
        console.log('✅ Redirecting to:', redirectUrl)
        console.log('✅ Redirect param:', redirectParam)
        console.log('✅ Encoded param:', encodedParam)
        
        // Gunakan window.location untuk memastikan redirect berjalan
        window.location.href = redirectUrl
      } catch (encryptErr: any) {
        console.error('❌ Error encrypting customer data:', encryptErr)
        setError('Gagal mengenkripsi data. Silakan coba lagi.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Error creating order:', err)
      setError(err.message || 'Gagal membuat pesanan')
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
            Halaman checkout ini hanya dapat diakses melalui mobile device.
          </p>
        </div>
      </div>
    )
  }

  const total = getTotal()


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
            <h1 className="text-lg font-bold">Checkout</h1>
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
        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">Ringkasan Pesanan</h2>
          <div className="space-y-2 mb-4">
            {items.map((item) => (
              <div key={item.productId} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {item.qty}x {item.name}
                  {item.note && (
                    <span className="text-gray-500 italic ml-1">({item.note})</span>
                  )}
                </span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="text-lg font-bold text-primary-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Data Pembeli</h2>
            {isFormFilledFromSession() && (
              <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                ✓ Data dari akun (tidak perlu diisi)
              </span>
            )}
          </div>
          
          {isFormFilledFromSession() && (
            <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
              <p className="text-sm text-primary-800">
                Data Anda sudah terisi otomatis dari akun. Anda dapat langsung melanjutkan ke pembayaran.
              </p>
            </div>
          )}

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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Pembeli *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 100) // Max length
                    setFormData({ ...formData, customerName: value })
                    if (value.length > 0) {
                      validateField('customerName', value)
                    } else {
                      setFieldErrors(prev => ({ ...prev, customerName: undefined }))
                    }
                  }}
                  onBlur={(e) => validateField('customerName', e.target.value)}
                  placeholder="Masukkan nama pembeli"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    fieldErrors.customerName
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                  required
                  disabled={loadingCustomerData || isFormFilledFromSession()}
                  readOnly={isFormFilledFromSession()}
                  maxLength={100}
                />
              </div>
              {fieldErrors.customerName && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.customerName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nomor HP *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 15) // Max length
                    setFormData({ ...formData, customerPhone: value })
                    if (value.length > 0) {
                      validateField('customerPhone', value)
                    } else {
                      setFieldErrors(prev => ({ ...prev, customerPhone: undefined }))
                    }
                  }}
                  onBlur={(e) => validateField('customerPhone', e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    fieldErrors.customerPhone
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                  required
                  disabled={loadingCustomerData || isFormFilledFromSession()}
                  readOnly={isFormFilledFromSession()}
                  maxLength={15}
                />
              </div>
              {fieldErrors.customerPhone && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.customerPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-gray-400 text-xs">(opsional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => {
                    const value = e.target.value.slice(0, 100) // Max length
                    setFormData({ ...formData, customerEmail: value })
                    if (value.length > 0) {
                      validateField('customerEmail', value)
                    } else {
                      setFieldErrors(prev => ({ ...prev, customerEmail: undefined }))
                    }
                  }}
                  onBlur={(e) => validateField('customerEmail', e.target.value)}
                  placeholder="email@example.com (opsional)"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    fieldErrors.customerEmail
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                  disabled={loadingCustomerData || isFormFilledFromSession()}
                  readOnly={isFormFilledFromSession()}
                  maxLength={100}
                />
              </div>
              {fieldErrors.customerEmail && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.customerEmail}</p>
              )}
            </div>

          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading || loadingCustomerData}
            >
              <span>Lanjutkan ke Pilih Metode Pembayaran</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

