'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { User, Phone, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import { useCartStore } from '@/lib/cart-store'
import { onAuthStateChange } from '@/lib/auth'
import { getCustomerByEmail } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import { validateEmail, validatePhone, validateName, validateOrderNote, validateTableParam, checkRateLimit } from '@/lib/validation'
import { parseTableParam, parseTableParamQuick } from '@/lib/token-utils'
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
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderNote: '',
  })
  
  const [fieldErrors, setFieldErrors] = useState<{
    customerName?: string
    customerPhone?: string
    customerEmail?: string
    orderNote?: string
  }>({})
  
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

  // Check auth state and auto-fill form or auto-checkout
  useEffect(() => {
    if (!tableInfo) return
    
    let isMounted = true
    
    const unsubscribe = onAuthStateChange(async (user) => {
      if (!isMounted) return
      
      setCurrentUser(user)
      
      if (user && items.length > 0) {
        const email = user.email || ''
        const name = user.displayName || ''
        
        setFormData(prev => ({
          ...prev,
          customerName: name,
          customerEmail: email,
        }))
        
        // Get phone from Firestore
        if (email) {
          setLoadingCustomerData(true)
          try {
            const customer = await getCustomerByEmail(email)
            const phoneNumber = customer?.phoneNumber
            if (phoneNumber && isMounted) {
              setFormData(prev => ({
                ...prev,
                customerPhone: phoneNumber,
              }))
              
              // Jika semua data lengkap, langsung redirect ke halaman pilih metode pembayaran
              if (name && email && phoneNumber && items.length > 0 && isMounted && tableInfo) {
                // Enkripsi data customer sebelum auto-redirect
                try {
                  const encryptResponse = await fetch('/api/encrypt-customer-data', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      name: name.trim(),
                      phone: phoneNumber.trim(),
                      email: email.trim(),
                      note: undefined,
                    }),
                  })

                  if (encryptResponse.ok) {
                    const encryptData = await encryptResponse.json()
                    if (encryptData.success && encryptData.data?.token) {
                      const redirectParam = tableInfo.rawToken || tableParam
                      const params = new URLSearchParams({
                        data: encryptData.data.token,
                      })
                      router.push(`/checkout/${redirectParam}/payment?${params.toString()}`)
                      return
                    }
                  }
                  // Jika enkripsi gagal, jangan redirect (biarkan user mengisi form manual)
                  console.error('Encryption failed for auto-redirect, user must submit form manually')
                  return
                } catch (encryptErr) {
                  console.error('Error encrypting customer data for auto-redirect:', encryptErr)
                  // Jangan redirect jika enkripsi gagal
                  return
                }
              }
            }
          } catch (error) {
            console.error('Error getting customer data:', error)
          } finally {
            if (isMounted) {
              setLoadingCustomerData(false)
            }
          }
        }
      }
    })
    
    return () => {
      isMounted = false
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, tableInfo])

  // Redirect if cart is empty
  useEffect(() => {
    if (!tableInfo) return
    
    if (items.length === 0) {
      // Untuk token mode, redirect ke menu dengan token
      if (tableInfo.isToken && tableInfo.rawToken) {
        router.push(`/menu/${tableInfo.rawToken}`)
      } else {
        router.push(`/menu/${tableInfo.tableNumber}`)
      }
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
      case 'orderNote':
        validation = validateOrderNote(value)
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

      // Validate all fields
      const nameValidation = validateName(formData.customerName)
      const phoneValidation = validatePhone(formData.customerPhone)
      const emailValidation = validateEmail(formData.customerEmail)
      const noteValidation = validateOrderNote(formData.orderNote)

      if (!nameValidation.valid || !phoneValidation.valid || !emailValidation.valid || !noteValidation.valid) {
        setFieldErrors({
          customerName: nameValidation.error,
          customerPhone: phoneValidation.error,
          customerEmail: emailValidation.error,
          orderNote: noteValidation.error,
        })
        setError('Mohon perbaiki data yang diisi')
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
        const encryptResponse = await fetch('/api/encrypt-customer-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: nameValidation.sanitized,
            phone: phoneValidation.sanitized,
            email: emailValidation.sanitized,
            note: noteValidation.sanitized || undefined,
          }),
        })

        if (!encryptResponse.ok) {
          const errorText = await encryptResponse.text()
          console.error('❌ Encryption API error:', encryptResponse.status, errorText)
          throw new Error('Gagal mengenkripsi data')
        }

        const encryptData = await encryptResponse.json()
        console.log('🔐 Encryption response:', encryptData)
        
        if (!encryptData.success || !encryptData.data?.token) {
          console.error('❌ Invalid encryption response:', encryptData)
          throw new Error('Gagal mendapatkan token terenkripsi')
        }

        // Redirect dengan token terenkripsi
        const params = new URLSearchParams({
          data: encryptData.data.token,
        })
        const redirectUrl = `/checkout/${tableParam}/payment?${params.toString()}`
        console.log('✅ Redirecting to:', redirectUrl)
        router.push(redirectUrl)
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
          <h2 className="font-bold text-gray-900 mb-4">Data Pembeli</h2>

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
                  disabled={loadingCustomerData}
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
                  disabled={loadingCustomerData}
                  maxLength={15}
                />
              </div>
              {fieldErrors.customerPhone && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.customerPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
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
                  placeholder="email@example.com"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    fieldErrors.customerEmail
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-primary-500'
                  }`}
                  required
                  disabled={loadingCustomerData}
                  maxLength={100}
                />
              </div>
              {fieldErrors.customerEmail && (
                <p className="text-xs text-red-600 mt-1">{fieldErrors.customerEmail}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Catatan Pesanan <span className="text-gray-400 text-xs font-normal">(opsional)</span>
              </label>
              <textarea
                value={formData.orderNote}
                onChange={(e) => {
                  const value = e.target.value.slice(0, 200) // Max length
                  setFormData({ ...formData, orderNote: value })
                  if (value.length > 0) {
                    validateField('orderNote', value)
                  } else {
                    setFieldErrors(prev => ({ ...prev, orderNote: undefined }))
                  }
                }}
                onBlur={(e) => validateField('orderNote', e.target.value)}
                placeholder="Contoh: Makan di tempat, tidak pedas, tanpa bawang, dll..."
                rows={3}
                maxLength={200}
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none text-sm ${
                  fieldErrors.orderNote
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-primary-500'
                }`}
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-xs text-gray-500">
                  {formData.orderNote.length}/200 karakter
                </p>
                {fieldErrors.orderNote && (
                  <p className="text-xs text-red-600">{fieldErrors.orderNote}</p>
                )}
              </div>
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

