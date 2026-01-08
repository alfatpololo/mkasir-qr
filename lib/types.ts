import { Timestamp } from 'firebase/firestore'

export interface Category {
  id: string
  name: string
  createdAt: Timestamp
}

export interface Table {
  id: string
  number: number
  active: boolean
  qrUrl?: string
}

export interface Product {
  id: string
  name: string
  price: number
  category: string
  categoryId?: string
  image: string
  imageUrl?: string
  stock: number
  isAvailable?: boolean
}

export interface CartItem {
  productId: string
  name: string
  price: number
  qty: number
  note?: string
}

export interface Order {
  id: string
  tableNumber: number
  customerName?: string
  customerPhone?: string
  paymentMethod?: 'QRIS_RESTAURANT' | 'CASHIER' // QRIS_RESTAURANT = bayar di tempat, CASHIER = bayar ke kasir
  items: {
    productId: string
    name: string
    qty: number
    note?: string
  }[]
  status: 'WAITING' | 'PREPARING' | 'READY' | 'WAITING_PAYMENT' | 'PAID'
  total: number
  createdAt: Timestamp
}

export interface Payment {
  id: string
  orderId: string
  method: 'QRIS'
  amount: number
  status: 'PENDING' | 'SUCCESS' | 'FAILED'
  createdAt: Timestamp
}

export type OrderStatus = Order['status']
export type PaymentStatus = Payment['status']

