'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { User, Phone, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import { useCartStore } from '@/lib/cart-store'
import { onAuthStateChange } from '@/lib/auth'
import { getCustomerByEmail } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

export default function CheckoutFormPage() {
  const params = useParams()
  const router = useRouter()
  const tableNumber = parseInt(params.table as string)
  
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loadingCustomerData, setLoadingCustomerData] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(true)
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
  })
  
  const items = useCartStore((state) => state.items)
  const getTotal = useCartStore((state) => state.getTotal)

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

  // Check auth state and auto-fill form or auto-checkout
  useEffect(() => {
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
              if (name && email && phoneNumber && items.length > 0 && isMounted) {
                // Auto redirect ke halaman pilih metode pembayaran
                const params = new URLSearchParams({
                  name: name.trim(),
                  phone: phoneNumber.trim(),
                  email: email.trim(),
                })
                router.push(`/checkout/${tableNumber}/payment?${params.toString()}`)
                return
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
  }, [items.length])

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push(`/menu/${tableNumber}`)
    }
  }, [items, tableNumber, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validasi
      if (!formData.customerName.trim()) {
        setError('Mohon isi nama pembeli')
        setLoading(false)
        return
      }
      if (!formData.customerPhone.trim()) {
        setError('Mohon isi nomor HP')
        setLoading(false)
        return
      }
      if (!formData.customerEmail.trim()) {
        setError('Mohon isi email')
        setLoading(false)
        return
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.customerEmail.trim())) {
        setError('Mohon masukkan email yang valid')
        setLoading(false)
        return
      }

      if (items.length === 0) {
        setError('Keranjang kosong')
        setLoading(false)
        return
      }

      // Redirect ke halaman pilih metode pembayaran dengan data form
      const params = new URLSearchParams({
        name: formData.customerName.trim(),
        phone: formData.customerPhone.trim(),
        email: formData.customerEmail.trim(),
      })
      router.push(`/checkout/${tableNumber}/payment?${params.toString()}`)
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
                </span>
                <span className="text-gray-900 font-medium">
                  {formatCurrency(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            <span className="font-bold text-gray-900">Total</span>
            <span className="text-xl font-bold text-primary-600">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Data Pembeli</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
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
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Masukkan nama pembeli"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={loadingCustomerData}
                />
              </div>
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
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={loadingCustomerData}
                />
              </div>
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
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="email@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={loadingCustomerData}
                />
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

