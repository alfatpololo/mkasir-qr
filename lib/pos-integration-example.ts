/**
 * Contoh integrasi POS API dengan checkout flow
 * 
 * File ini menunjukkan cara menggunakan POS API untuk mengirim order
 * ke backend API selain menyimpan ke Firestore.
 */

import { buildPOSPayload, sendOrderToPOS, createOrderViaPOS } from './pos-api'
import { createOrder } from './firestore'

/**
 * Contoh: Create order dengan dual storage (Firestore + POS API)
 * 
 * Order akan disimpan ke Firestore untuk tracking internal,
 * dan juga dikirim ke POS API untuk sinkronisasi dengan backend.
 */
export async function createOrderDualStorage(params: {
  token?: string
  tableNumber?: number
  customerName: string
  customerPhone: string
  customerEmail: string
  paymentMethod: 'QRIS_RESTAURANT' | 'CASHIER'
  orderNote?: string
  items: Array<{
    productId: string
    name: string
    price: number
    qty: number
    note?: string
  }>
  status?: 'WAITING' | 'PREPARING' | 'READY' | 'WAITING_PAYMENT' | 'PAID'
}): Promise<{ firestoreId: string; posOrderId?: string }> {
  const { token, tableNumber, customerName, customerPhone, customerEmail, paymentMethod, orderNote, items, status } = params

  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0)

  // Determine status
  const orderStatus = status || (paymentMethod === 'CASHIER' ? 'WAITING_PAYMENT' : 'WAITING')

  // 1. Save to Firestore (primary storage)
  const firestoreId = await createOrder({
    tableNumber: tableNumber || 0,
    customerName,
    customerPhone,
    customerEmail,
    paymentMethod,
    orderNote,
    items: items.map(item => ({
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      note: item.note,
    })),
    status: orderStatus,
    total,
  })

  // 2. Send to POS API (secondary storage/sync)
  let posOrderId: string | undefined
  try {
    posOrderId = await createOrderViaPOS({
      token,
      tableNumber,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      orderNote,
      items,
      status: orderStatus,
    })
    console.log('Order synced to POS API:', posOrderId)
  } catch (error) {
    // Log error but don't fail the order creation
    // Order sudah tersimpan di Firestore, sync ke POS bisa dilakukan later
    console.error('Failed to sync order to POS API:', error)
    // TODO: Implement retry mechanism or queue for later sync
  }

  return {
    firestoreId,
    posOrderId,
  }
}

/**
 * Contoh: Create order hanya ke POS API (tanpa Firestore)
 * 
 * Gunakan ini jika ingin menggunakan POS API sebagai primary storage.
 */
export async function createOrderPOSOnly(params: {
  token?: string
  tableNumber?: number
  customerName: string
  customerPhone: string
  customerEmail: string
  paymentMethod: 'QRIS_RESTAURANT' | 'CASHIER'
  orderNote?: string
  items: Array<{
    productId: string
    name: string
    price: number
    qty: number
    note?: string
  }>
  status?: 'WAITING' | 'PREPARING' | 'READY' | 'WAITING_PAYMENT' | 'PAID'
}): Promise<string> {
  return await createOrderViaPOS(params)
}

/**
 * Contoh: Build payload untuk debugging/testing
 */
export function buildPayloadForTesting(params: {
  token?: string
  tableNumber?: number
  customerName: string
  customerPhone: string
  customerEmail: string
  paymentMethod: 'QRIS_RESTAURANT' | 'CASHIER'
  orderNote?: string
  items: Array<{
    productId: string
    name: string
    price: number
    qty: number
    note?: string
  }>
}): string {
  const payload = buildPOSPayload(params)
  return JSON.stringify(payload, null, 2)
}

/**
 * Contoh penggunaan di checkout page:
 * 
 * ```typescript
 * import { createOrderDualStorage } from '@/lib/pos-integration-example'
 * 
 * const result = await createOrderDualStorage({
 *   token: '55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976',
 *   customerName: 'John Doe',
 *   customerPhone: '081234567890',
 *   customerEmail: 'john.doe@example.com',
 *   paymentMethod: 'QRIS_RESTAURANT',
 *   orderNote: 'Makan di tempat',
 *   items: [
 *     {
 *       productId: '123',
 *       name: 'Nasi Goreng',
 *       price: 25000,
 *       qty: 2,
 *       note: 'Tidak pakai telur'
 *     }
 *   ]
 * })
 * 
 * console.log('Firestore ID:', result.firestoreId)
 * console.log('POS Order ID:', result.posOrderId)
 * ```
 */
