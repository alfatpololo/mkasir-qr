'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react'
import { Button } from '@/components/Button'
import { useCartStore } from '@/lib/cart-store'
import { createOrder } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

function PaymentMethodContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tableNumber = parseInt(params.table as string)
  
  const [paymentMethod, setPaymentMethod] = useState<'QRIS_RESTAURANT' | 'CASHIER' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(true)
  
  // Get customer data from query params
  const customerName = searchParams.get('name') || ''
  const customerPhone = searchParams.get('phone') || ''
  const customerEmail = searchParams.get('email') || ''
  
  const items = useCartStore((state) => state.items)
  const getTotal = useCartStore((state) => state.getTotal)
  const clearCart = useCartStore((state) => state.clearCart)

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

  // Redirect if cart is empty or missing customer data
  useEffect(() => {
    if (items.length === 0) {
      router.push(`/menu/${tableNumber}`)
      return
    }
    
    if (!customerName || !customerPhone || !customerEmail) {
      router.push(`/checkout/${tableNumber}`)
      return
    }
  }, [items.length, customerName, customerPhone, customerEmail, tableNumber, router])

  const handleSubmit = async () => {
    if (!paymentMethod) {
      setError('Mohon pilih metode pembayaran')
      return
    }

    setError('')
    setLoading(true)

    try {
      const total = getTotal()
      
      // Determine initial status based on payment method
      let initialStatus: 'WAITING' | 'WAITING_PAYMENT' = 'WAITING'
      if (paymentMethod === 'CASHIER') {
        initialStatus = 'WAITING_PAYMENT'
      }

      // Prepare items
      const orderItems = items.map(item => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        note: item.note || undefined,
      }))

      // Create order
      const orderId = await createOrder({
        tableNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        paymentMethod,
        items: orderItems,
        status: initialStatus,
        total,
      })

      // Clear cart
      clearCart()

      // Redirect to payment page or menu
      if (paymentMethod === 'QRIS_RESTAURANT') {
        router.push(`/payment/qris?orderId=${orderId}`)
      } else {
        // For CASHIER, redirect back to menu
        router.push(`/menu/${tableNumber}?orderSuccess=${orderId}`)
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
            Halaman ini hanya dapat diakses melalui mobile device.
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

        {/* Customer Info */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-6">
          <h2 className="font-bold text-gray-900 mb-3">Data Pembeli</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Nama</span>
              <span className="font-medium text-gray-900">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email</span>
              <span className="font-medium text-gray-900">{customerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Nomor HP</span>
              <span className="font-medium text-gray-900">{customerPhone}</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Pilih Metode Pembayaran</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
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

