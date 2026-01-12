'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, X, ShoppingCart, Mail, User, Phone } from 'lucide-react'
import { useCartStore } from '@/lib/cart-store'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'
import { User as FirebaseUser } from 'firebase/auth'
import { getCustomerByEmail } from '@/lib/firestore'

interface CartProps {
  onCheckout: (customerName: string, customerPhone: string, customerEmail: string, paymentMethod: 'QRIS_RESTAURANT' | 'CASHIER') => void
  currentUser?: FirebaseUser | null
  tableNumber: number
}

export const Cart: React.FC<CartProps> = ({ onCheckout, currentUser, tableNumber }) => {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showCheckoutForm, setShowCheckoutForm] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'QRIS_RESTAURANT' | 'CASHIER'>('QRIS_RESTAURANT')
  const [loadingCustomerData, setLoadingCustomerData] = useState(false)
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const updateNote = useCartStore((state) => state.updateNote)
  const getTotal = useCartStore((state) => state.getTotal)
  const getItemCount = useCartStore((state) => state.getItemCount)

  const itemCount = getItemCount()
  const total = getTotal()

  // Auto-fill form jika user sudah login
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.displayName || '')
      setCustomerEmail(currentUser.email || '')
      
      // Coba ambil phone number dari Firestore customer data
      if (currentUser.email) {
        setLoadingCustomerData(true)
        getCustomerByEmail(currentUser.email)
          .then((customer) => {
            if (customer?.phoneNumber) {
              setCustomerPhone(customer.phoneNumber)
            }
          })
          .catch(() => {
            // Ignore error, phone akan tetap kosong
          })
          .finally(() => {
            setLoadingCustomerData(false)
          })
      }
    } else {
      // Reset form jika user logout
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
    }
  }, [currentUser])

  const handleCheckoutClick = () => {
    // Redirect ke halaman checkout form
    router.push(`/checkout/${tableNumber}`)
  }

  const handleSubmitCheckout = (skipValidation = false) => {
    // Jika user sudah login dan skipValidation=true, langsung checkout tanpa validasi
    if (currentUser && skipValidation) {
      if (!paymentMethod) {
        alert('Mohon pilih metode pembayaran')
        return
      }
      setIsOpen(false)
      setShowCheckoutForm(false)
      onCheckout(
        customerName.trim(), 
        customerPhone.trim() || '', 
        customerEmail.trim(), 
        paymentMethod
      )
      return
    }
    
    // Validasi untuk semua user (baik yang sudah login maupun belum)
    if (!customerName.trim()) {
      alert('Mohon isi nama pembeli')
      return
    }
    
    // Nomor HP wajib diisi (baik user login maupun belum login)
    if (!customerPhone.trim()) {
      alert('Mohon isi nomor HP')
      return
    }
    
    if (!customerEmail.trim()) {
      alert('Mohon isi email')
      return
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail.trim())) {
      alert('Mohon masukkan email yang valid')
      return
    }
    if (!paymentMethod) {
      alert('Mohon pilih metode pembayaran')
      return
    }
    setIsOpen(false)
    setShowCheckoutForm(false)
    onCheckout(
      customerName.trim(), 
      customerPhone.trim() || '', 
      customerEmail.trim(), 
      paymentMethod
    )
    // Reset form hanya jika bukan user yang sudah login
    if (!currentUser) {
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
    }
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
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-white via-white to-white border-t border-gray-200 shadow-2xl z-50 backdrop-blur-sm">
        <div className="max-w-md mx-auto">
          <button
            data-cart-trigger
            onClick={() => setIsOpen(true)}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-md">
                  <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white">
                    {itemCount}
                  </span>
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-gray-500">{itemCount} item di keranjang</p>
                <p className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" className="shadow-md">
              Lihat Keranjang
            </Button>
          </button>
        </div>
      </div>

      {/* Cart Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <div className="bg-white w-full max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col shadow-2xl border-t-4 border-primary-500">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-primary-50/50 to-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Keranjang Saya
                </h2>
                <p className="text-sm text-gray-500 mt-1">{itemCount} item</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="mb-5 pb-5 border-b border-gray-100 last:border-0 bg-gradient-to-r from-white to-gray-50/50 p-4 rounded-xl"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-base mb-1">{item.name}</h3>
                      <p className="text-sm font-semibold text-primary-600">
                        {formatCurrency(item.price)} / item
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-2 hover:bg-red-50 rounded-xl transition-all hover:scale-110"
                    >
                      <X className="w-5 h-5 text-red-500" />
                    </button>
                  </div>

                  {/* Quantity Control */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.productId, item.qty - 1)}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-primary-100 hover:text-primary-600 transition-all"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-8 text-center text-gray-900">{item.qty}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.qty + 1)}
                        className="p-2 bg-gray-100 rounded-lg hover:bg-primary-100 hover:text-primary-600 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <span className="ml-auto text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                      {formatCurrency(item.price * item.qty)}
                    </span>
                  </div>

                  {/* Note Input */}
                  <input
                    type="text"
                    placeholder="💬 Catatan khusus (opsional)"
                    value={item.note || ''}
                    onChange={(e) => updateNote(item.productId, e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-all"
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              {!showCheckoutForm ? (
                <>
                  <div className="flex items-center justify-between mb-5 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200">
                    <span className="text-lg font-bold text-gray-900">Total Pembayaran</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                      {formatCurrency(total)}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full shadow-lg"
                    onClick={handleCheckoutClick}
                    disabled={loadingCustomerData}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>
                      {currentUser && customerName && customerEmail && customerPhone.trim()
                        ? 'Checkout Sekarang (Data Otomatis)' 
                        : 'Checkout Sekarang'}
                    </span>
                  </Button>
                  {currentUser && customerName && customerEmail && customerPhone.trim() && (
                    <p className="text-xs text-center text-gray-500 mt-2">
                      ✓ Data Anda sudah lengkap, checkout langsung tanpa form
                    </p>
                  )}
                  {currentUser && customerName && customerEmail && !customerPhone.trim() && (
                    <p className="text-xs text-center text-primary-600 mt-2">
                      ⚠ Mohon lengkapi nomor HP untuk checkout langsung
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Pembeli *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Masukkan nama pembeli"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        autoFocus
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
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                        disabled={loadingCustomerData}
                      />
                    </div>
                    {currentUser && (
                      <p className="text-xs text-gray-500 mt-1">
                        Mohon lengkapi nomor HP untuk melengkapi data Anda
                      </p>
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
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
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
                      type="button"
                      variant="primary"
                      className="flex-1"
                      onClick={() => handleSubmitCheckout(false)}
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

