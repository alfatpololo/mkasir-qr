'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle } from 'lucide-react'
import { DEFAULT_MENU_TOKEN } from '@/lib/token-utils'
import { getSession } from '@/lib/auth'

// Dynamic import untuk react-qr-code
let QRCodeSVG: React.ComponentType<any> | null = null

if (typeof window !== 'undefined') {
  try {
    const QRCode = require('react-qr-code')
    // Coba berbagai cara import
    if (QRCode.QRCodeSVG) {
      QRCodeSVG = QRCode.QRCodeSVG
    } else if (QRCode.default?.QRCodeSVG) {
      QRCodeSVG = QRCode.default.QRCodeSVG
    } else if (QRCode.default) {
      QRCodeSVG = QRCode.default
    } else {
      QRCodeSVG = QRCode
    }
  } catch (e) {
    console.error('Failed to load react-qr-code:', e)
  }
}

import { getOrder, subscribeToOrder, subscribeToPayment, getPaymentByOrderId } from '@/lib/firestore'
import { createPayment, updatePaymentStatus, updateOrderStatus } from '@/lib/firestore'
import { Order, Payment } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'

function QRISPaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('orderId')

  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  const [mounted, setMounted] = useState(false)
  const menuUrl = () => {
    const sessionUser = getSession()
    const cid = (sessionUser as any)?.customerId
    return cid ? `/menu/${DEFAULT_MENU_TOKEN}?customer_id=${cid}` : `/menu/${DEFAULT_MENU_TOKEN}`
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!orderId) {
      router.push('/')
      return
    }

    // Get order
    const loadOrder = async () => {
      try {
        const orderData = await getOrder(orderId)
        if (!orderData) {
          alert('Pesanan tidak ditemukan')
          router.push('/')
          return
        }

        // Allow payment if order is READY, WAITING_PAYMENT, or if paymentMethod is QRIS_RESTAURANT
        if (orderData.status !== 'READY' && orderData.status !== 'WAITING_PAYMENT' && orderData.paymentMethod !== 'QRIS_RESTAURANT') {
          // If order is already paid, allow viewing
          if (orderData.status === 'PAID') {
            // Continue to show payment page
          } else {
            alert(`Pesanan belum siap untuk dibayar. Status: ${orderData.status}`)
            router.push(menuUrl())
            return
          }
        }

        setOrder(orderData)

        // Check if payment already exists
        let existingPayment = await getPaymentByOrderId(orderId)
        let paymentId: string

        if (!existingPayment) {
          // Create payment if not exists
          paymentId = await createPayment({
            orderId,
            method: 'QRIS',
            amount: orderData.total,
            status: 'PENDING',
          })
        } else {
          paymentId = existingPayment.id
          setPayment(existingPayment)
          setPaymentStatus(existingPayment.status.toLowerCase() as 'pending' | 'success' | 'failed')
        }

        // Subscribe to payment
        const unsubscribePayment = subscribeToPayment(paymentId, (paymentData) => {
          if (paymentData) {
            setPayment(paymentData)
            setPaymentStatus(paymentData.status.toLowerCase() as 'pending' | 'success' | 'failed')
            
            if (paymentData.status === 'SUCCESS') {
              // Update order status to PAID
              updateOrderStatus(orderId, 'PAID')
            }
          }
        })

        setLoading(false)

        return () => {
          unsubscribePayment()
        }
      } catch (error) {
        console.error('Error loading order:', error)
        alert('Terjadi kesalahan')
        router.push('/')
      }
    }

    loadOrder()
  }, [orderId, router])

  // Simulate payment success (for demo purposes)
  const handleSimulatePayment = async () => {
    if (!payment) return

    try {
      await updatePaymentStatus(payment.id, 'SUCCESS')
      // Payment status will update via subscription
    } catch (error) {
      console.error('Error updating payment:', error)
      alert('Gagal memproses pembayaran')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600">Memuat data pembayaran...</p>
        </div>
      </div>
    )
  }

  // Generate QRIS payload (mock)
  const qrisPayload = JSON.stringify({
    merchantName: 'Restaurant QR Order',
    amount: order.total,
    orderId: order.id,
    timestamp: new Date().toISOString(),
  })

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pembayaran Berhasil!
          </h2>
          <p className="text-gray-600 mb-6">
            Terima kasih atas pembayaran Anda
          </p>
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Pembayaran</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(order.total)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Meja {order.tableNumber}
            </div>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push(menuUrl())}
          >
            Kembali ke Menu
          </Button>
        </div>
      </div>
    )
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pembayaran Gagal
          </h2>
          <p className="text-gray-600 mb-6">
            Silakan coba lagi atau hubungi kasir
          </p>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => router.push(menuUrl())}
          >
            Kembali
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Bayar dengan QRIS
          </h1>
          <p className="text-center text-gray-600 mb-6">
            Scan QR code dengan aplikasi e-wallet Anda
          </p>

          {/* QR Code */}
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-6 flex justify-center">
            {mounted && QRCodeSVG ? (
              <QRCodeSVG
                value={qrisPayload}
                size={256}
                level="H"
                includeMargin={true}
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                <p className="text-gray-500 text-sm">Loading QR Code...</p>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Pembayaran</span>
              <span className="text-xl font-bold text-primary-600">
                {formatCurrency(order.total)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Meja {order.tableNumber}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Cara Pembayaran:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Buka aplikasi e-wallet (Gojek, OVO, DANA, dll)</li>
              <li>Pilih fitur Scan QRIS</li>
              <li>Scan QR code di atas</li>
              <li>Konfirmasi pembayaran</li>
            </ol>
          </div>

          {/* Demo Button - Simulate Payment */}
          <div className="border-t border-gray-200 pt-4">
            <Button
              variant="primary"
              className="w-full mb-3"
              onClick={handleSimulatePayment}
            >
              ✅ Simulasikan Pembayaran Berhasil (Demo)
            </Button>
            <p className="text-xs text-center text-gray-500">
              Untuk demo: Klik tombol di atas untuk mensimulasikan pembayaran berhasil
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => router.push(menuUrl())}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              Batalkan Pembayaran
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function QRISPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      }
    >
      <QRISPaymentContent />
    </Suspense>
  )
}

