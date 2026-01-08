'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MenuList } from './MenuList'
import { Cart } from './Cart'
import { OrderStatusComponent } from '@/components/OrderStatus'
import { useCartStore } from '@/lib/cart-store'
import { getTable, subscribeToTable } from '@/lib/firestore'
import { Table } from '@/lib/types'
import { createOrder } from '@/lib/firestore'
import { formatCurrency } from '@/lib/utils'

export default function MenuPage() {
  const params = useParams()
  const router = useRouter()
  const tableNumber = parseInt(params.table as string)
  
  const [table, setTable] = useState<Table | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [showOrderStatus, setShowOrderStatus] = useState(false)
  
  const setTableNumber = useCartStore((state) => state.setTableNumber)
  const items = useCartStore((state) => state.items)
  const getTotal = useCartStore((state) => state.getTotal)
  const clearCart = useCartStore((state) => state.clearCart)

  // Validate table number
  useEffect(() => {
    if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > 20) {
      setError('Nomor meja tidak valid')
      setLoading(false)
      return
    }

    // Set table number in cart store
    setTableNumber(tableNumber)

    // Check table exists
    const checkTable = async () => {
      try {
        const tableData = await getTable(tableNumber)
        if (!tableData) {
          setError(`Meja ${tableNumber} tidak ditemukan`)
          setLoading(false)
          return
        }
        
        if (!tableData.active) {
          setError(`Meja ${tableNumber} tidak aktif`)
          setLoading(false)
          return
        }

        setTable(tableData)
        setLoading(false)
      } catch (err) {
        setError('Terjadi kesalahan saat memuat data meja')
        setLoading(false)
      }
    }

    checkTable()

    // Subscribe to table changes
    const unsubscribe = subscribeToTable(tableNumber, (tableData) => {
      if (tableData) {
        setTable(tableData)
        if (!tableData.active) {
          setError(`Meja ${tableNumber} tidak aktif`)
        }
      }
    })

    return () => unsubscribe()
  }, [tableNumber, setTableNumber])

  // Store table number in localStorage
  useEffect(() => {
    if (tableNumber && typeof window !== 'undefined') {
      localStorage.setItem('currentTable', tableNumber.toString())
    }
  }, [tableNumber])

  const handleCheckout = async (
    customerName: string,
    customerPhone: string,
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
      if (!tableNumber || tableNumber <= 0) {
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
        tableNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        paymentMethod,
        itemsCount: orderItems.length,
        total,
        status: initialStatus,
      })

      const orderId = await createOrder({
        tableNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !table) {
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
            tableNumber={tableNumber}
            onPaymentClick={handlePaymentClick}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header with Table Number */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Menu</h1>
              <p className="text-sm text-gray-600">Meja {tableNumber}</p>
            </div>
            {items.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-lg font-bold text-primary-600">
                  {formatCurrency(getTotal())}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <MenuList />

      <Cart onCheckout={handleCheckout} />
    </div>
  )
}

