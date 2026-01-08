'use client'

import React, { useState } from 'react'
import { Minus, Plus, X, ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'

interface CartProps {
  onCheckout: (customerName: string, customerPhone: string, paymentMethod: 'QRIS_RESTAURANT' | 'CASHIER') => void
}

export const Cart: React.FC<CartProps> = ({ onCheckout }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'QRIS_RESTAURANT' | 'CASHIER'>('QRIS_RESTAURANT')
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateNote = useCartStore((state) => state.updateNote)
  const getTotal = useCartStore((state) => state.getTotal)
  const getItemCount = useCartStore((state) => state.getItemCount)

  const itemCount = getItemCount()
  const total = getTotal()

  const handleCheckoutClick = () => {
    setShowCheckoutForm(true)
  }

  const handleSubmitCheckout = () => {
    if (!customerName.trim()) {
      alert('Mohon isi nama pembeli')
      return
    }
    if (!customerPhone.trim()) {
      alert('Mohon isi nomor HP')
      return
    }
    if (!paymentMethod) {
      alert('Mohon pilih metode pembayaran')
      return
    }
    setIsOpen(false)
    setShowCheckoutForm(false)
    onCheckout(customerName.trim(), customerPhone.trim(), paymentMethod)
    setCustomerName('')
    setCustomerPhone('')
    setPaymentMethod('QRIS_RESTAURANT')
  }

  if (itemCount === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <Button
          variant="primary"
          className="w-full"
          disabled
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Keranjang Kosong
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-primary-600" />
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-600">{itemCount} item</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm">
              Lihat Keranjang
            </Button>
          </button>
        </div>
      </div>

      {/* Cart Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] rounded-t-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">Keranjang</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="mb-4 pb-4 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Quantity Control */}
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.qty - 1)}
                      className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-semibold w-8 text-center">{item.qty}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.qty + 1)}
                      className="p-1 bg-gray-100 rounded hover:bg-gray-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <span className="ml-auto font-bold">
                      {formatCurrency(item.price * item.qty)}
                    </span>
                  </div>

                  {/* Note Input */}
                  <input
                    type="text"
                    placeholder="Catatan (opsional)"
                    value={item.note || ''}
                    onChange={(e) => updateNote(item.productId, e.target.value)}
                    className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              {!showCheckoutForm ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary-600">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleCheckoutClick}
                  >
                    Checkout
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Pembeli *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Masukkan nama pembeli"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nomor HP *
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metode Pembayaran *
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ borderColor: paymentMethod === 'QRIS_RESTAURANT' ? '#0ea5e9' : '#e5e7eb' }}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="QRIS_RESTAURANT"
                          checked={paymentMethod === 'QRIS_RESTAURANT'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'QRIS_RESTAURANT' | 'CASHIER')}
                          className="mr-3 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Bayar di Tempat (QRIS)</div>
                          <div className="text-xs text-gray-500">Scan QR code resto untuk pembayaran</div>
                        </div>
                      </label>
                      <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ borderColor: paymentMethod === 'CASHIER' ? '#0ea5e9' : '#e5e7eb' }}>
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="CASHIER"
                          checked={paymentMethod === 'CASHIER'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'QRIS_RESTAURANT' | 'CASHIER')}
                          className="mr-3 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Bayar ke Kasir</div>
                          <div className="text-xs text-gray-500">Pesanan selesai, bayar di kasir</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setShowCheckoutForm(false)}
                    >
                      Kembali
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={handleSubmitCheckout}
                    >
                      Konfirmasi Pesanan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

