'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Clock, ChefHat, Package, CheckCircle2, UtensilsCrossed, CreditCard, Home } from 'lucide-react'
import { subscribeToCustomerOrders } from '@/lib/customer-firestore'
import { getOrder } from '@/lib/firestore'
import { Order } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'
import Image from 'next/image'

const statusConfig: Record<Order['status'], { label: string; icon: React.ReactNode; color: string }> = {
  WAITING: {
    label: 'Menunggu konfirmasi resto',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-green-600',
  },
  PREPARING: {
    label: 'Sedang disiapkan',
    icon: <ChefHat className="w-4 h-4" />,
    color: 'text-blue-600',
  },
  READY: {
    label: 'Siap diantar',
    icon: <Package className="w-4 h-4" />,
    color: 'text-purple-600',
  },
  WAITING_PAYMENT: {
    label: 'Menunggu pembayaran',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-orange-600',
  },
  PAID: {
    label: 'Sudah dibayar',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-600',
  },
}

function MyOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdParam = searchParams.get('orderId')
  
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [unsubscribeFn, setUnsubscribeFn] = useState<(() => void) | null>(null)

  const loadCustomerOrders = (customerEmail: string, customerPhone?: string) => {
    // Nomor HP wajib, email optional
    if (!customerPhone && !customerEmail) {
      console.warn('Customer phone or email not found, cannot load orders')
      setLoading(false)
      return
    }

    console.log('Loading orders for:', customerEmail, customerPhone)

    // Cleanup previous subscription
    if (unsubscribeFn) {
      unsubscribeFn()
    }

    const unsubscribe = subscribeToCustomerOrders(
      customerEmail,
      customerPhone,
      (ordersData) => {
        console.log('Orders received:', ordersData.length)
        setOrders(ordersData)
        setLoading(false)

        // Jika ada orderId di URL, tampilkan detail order tersebut
        if (orderIdParam && ordersData.length > 0) {
          const order = ordersData.find(o => o.id === orderIdParam)
          if (order) {
            setSelectedOrder(order || null)
          }
        }
      }
    )

    setUnsubscribeFn(() => unsubscribe)
    return unsubscribe
  }

  useEffect(() => {
    // Jika ada orderId di URL, load order tersebut dulu untuk mendapatkan customer email
    if (orderIdParam && !selectedOrder) {
      getOrder(orderIdParam).then((order) => {
        if (order) {
          setSelectedOrder(order)
          // Gunakan email dari order untuk load semua orders
          if (order.customerEmail) {
            loadCustomerOrders(order.customerEmail, order.customerPhone)
          }
        } else {
          // Jika order tidak ditemukan, coba dari localStorage
          const customerEmail = localStorage.getItem('customerEmail') || ''
          const customerPhone = localStorage.getItem('customerPhone') || undefined
          if (customerEmail) {
            loadCustomerOrders(customerEmail, customerPhone)
          } else {
            setLoading(false)
          }
        }
      })
    } else {
      // Ambil email dari localStorage atau session
      const customerEmail = localStorage.getItem('customerEmail') || ''
      const customerPhone = localStorage.getItem('customerPhone') || undefined
      if (customerEmail) {
        loadCustomerOrders(customerEmail, customerPhone)
      } else {
        setLoading(false)
      }
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeFn) {
        unsubscribeFn()
      }
    }
  }, [orderIdParam])


  const formatDate = (date: any) => {
    if (!date) return '-'
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return '-'
    }
  }

  const formatDateTime = (date: any) => {
    if (!date) return '-'
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  // Tampilkan detail order jika dipilih
  if (selectedOrder) {
    const status = statusConfig[selectedOrder.status]

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button
              onClick={() => setSelectedOrder(null)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">Orderan Kamu</h1>
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

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          {/* Order ID */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Order ID</span>
              <span className="text-xs font-mono text-gray-900">{selectedOrder.id.toUpperCase()}</span>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500">OL-DINE-IN</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(selectedOrder.createdAt)}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <div className={`${status.color}`}>
                {status.icon}
              </div>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* Table Number */}
            {selectedOrder.tableNumber > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs">👤</span>
                </div>
                <span className="text-sm text-gray-700">Meja MEJA {selectedOrder.tableNumber}</span>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedOrder.total)}</p>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Rincian pesanan</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-sm font-bold text-gray-900">Rp {selectedOrder.total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Detail Items */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Detail item</h3>
            <div className="space-y-3">
              {selectedOrder.items.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.qty}x - {item.name}
                    </p>
                    {item.note && (
                      <p className="text-xs text-gray-500 mt-1">Catatan: {item.note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency((selectedOrder.total / selectedOrder.items.reduce((sum, i) => sum + i.qty, 0)) * item.qty)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tombol Kembali ke Menu */}
          <div className="pb-4">
            <Button
              variant="primary"
              className="w-full py-4 text-base font-semibold"
              onClick={() => {
                // Ambil token dari localStorage atau gunakan tableNumber
                const savedToken = localStorage.getItem('tableToken')
                const savedTableNumber = localStorage.getItem('tableNumber')
                
                if (savedToken) {
                  // Jika ada token, gunakan token
                  router.push(`/menu/${savedToken}`)
                } else if (savedTableNumber) {
                  // Jika ada tableNumber, gunakan tableNumber
                  router.push(`/menu/${savedTableNumber}`)
                } else if (selectedOrder.tableNumber > 0) {
                  // Fallback ke tableNumber dari order
                  router.push(`/menu/${selectedOrder.tableNumber}`)
                } else {
                  // Fallback terakhir
                  router.push('/menu/1')
                }
              }}
            >
              <Home className="w-5 h-5" />
              <span>Kembali ke menu</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Tampilkan daftar orders
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-base font-semibold text-gray-900">Riwayat Pesanan</h1>
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

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">Belum ada pesanan</p>
            <p className="text-sm text-gray-500">Pesanan Anda akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const status = statusConfig[order.status]
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`${status.color}`}>
                          {status.icon}
                        </div>
                        <span className={`text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-1">
                        {formatDateTime(order.createdAt)}
                      </p>
                      {order.tableNumber > 0 && (
                        <p className="text-xs text-gray-500">
                          Meja {order.tableNumber}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      {order.items.length} item • ID: {order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      }
    >
      <MyOrdersContent />
    </Suspense>
  )
}
