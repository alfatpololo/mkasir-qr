/**
 * POS API Client - Untuk mengirim order ke backend API
 */

// Base URL API backend
const API_BASE_URL = 'https://mkasir-fnb-dev.tip2.co/api/v1'

/**
 * Interface untuk item dalam payload POS
 */
export interface POSOrderItem {
  product_id: string | number
  product_name: string
  quantity: number
  price: number
  subtotal: number
  note?: string
}

/**
 * Interface untuk payload order POS
 */
export interface POSOrderPayload {
  token?: string // Token meja (jika menggunakan token mode)
  table_number?: number // Nomor meja (jika menggunakan table number mode)
  customer_name: string
  customer_phone: string
  customer_email: string
  payment_method: 'QRIS_RESTAURANT' | 'CASHIER'
  order_note?: string // Catatan pesanan secara keseluruhan
  items: POSOrderItem[]
  total: number
  status: 'WAITING' | 'PREPARING' | 'READY' | 'WAITING_PAYMENT' | 'PAID'
  metadata?: {
    source: 'pos' | 'web' | 'mobile'
    user_agent?: string
    timestamp?: string
  }
}

/**
 * Interface untuk response dari API
 */
export interface POSOrderResponse {
  success: boolean
  message?: string
  data?: {
    order_id: string
    order_number?: string
    table_number?: number
    total: number
    status: string
    created_at: string
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Build payload POS dari cart items dan customer data
 */
export function buildPOSPayload(params: {
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
}): POSOrderPayload {
  const { items, customerName, customerPhone, customerEmail, paymentMethod, orderNote, token, tableNumber, status } = params

  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.price * item.qty), 0)

  // Build items payload
  const posItems: POSOrderItem[] = items.map(item => ({
    product_id: item.productId,
    product_name: item.name,
    quantity: item.qty,
    price: item.price,
    subtotal: item.price * item.qty,
    note: item.note || undefined,
  }))

  // Determine initial status
  const orderStatus = status || (paymentMethod === 'CASHIER' ? 'WAITING_PAYMENT' : 'WAITING')

  // Build payload
  const payload: POSOrderPayload = {
    customer_name: customerName.trim(),
    customer_phone: customerPhone.trim(),
    customer_email: customerEmail.trim(),
    payment_method: paymentMethod,
    items: posItems,
    total: total,
    status: orderStatus,
    metadata: {
      source: 'pos',
      user_agent: typeof window !== 'undefined' ? window.navigator?.userAgent : undefined,
      timestamp: new Date().toISOString(),
    },
  }

  // Add token or table_number based on mode
  if (token) {
    payload.token = token
  } else if (tableNumber !== undefined && tableNumber > 0) {
    payload.table_number = tableNumber
  }

  // Add order note if exists
  if (orderNote && orderNote.trim()) {
    payload.order_note = orderNote.trim()
  }

  return payload
}

/**
 * Send order to POS backend API
 */
export async function sendOrderToPOS(payload: POSOrderPayload): Promise<POSOrderResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data: POSOrderResponse = await response.json()
    return data
  } catch (error: any) {
    console.error('Error sending order to POS API:', error)
    throw new Error(`Failed to send order to POS: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Create order via POS API (alternative to Firestore)
 */
export async function createOrderViaPOS(params: {
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
  // Build payload
  const payload = buildPOSPayload(params)

  // Send to API
  const response: POSOrderResponse = await sendOrderToPOS(payload)

  if (!response.success || !response.data?.order_id) {
    throw new Error(response.error?.message || response.message || 'Failed to create order')
  }

  return response.data.order_id
}

/**
 * Get order status from POS API
 */
export async function getOrderStatusFromPOS(orderId: string): Promise<POSOrderResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: POSOrderResponse = await response.json()
    return data
  } catch (error: any) {
    console.error('Error getting order status from POS API:', error)
    throw new Error(`Failed to get order status: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Update order status via POS API
 */
export async function updateOrderStatusViaPOS(
  orderId: string,
  status: 'WAITING' | 'PREPARING' | 'READY' | 'WAITING_PAYMENT' | 'PAID'
): Promise<POSOrderResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data: POSOrderResponse = await response.json()
    return data
  } catch (error: any) {
    console.error('Error updating order status via POS API:', error)
    throw new Error(`Failed to update order status: ${error.message || 'Unknown error'}`)
  }
}
