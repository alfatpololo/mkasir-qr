/**
 * POS API Client - Untuk mengirim order ke backend API
 */

// Base URL API backend
const API_BASE_URL = 'https://mkasir-fnb-dev.tip2.co/api/v1'

// Base URL untuk QRIS image
const QRIS_IMAGE_BASE_URL = 'https://s3asia01.tip2.co/mkasir-fnb/'

/**
 * Interface untuk response /meja/profile
 */
export interface MejaProfileResponse {
  status: string
  message?: string
  data?: {
    stall?: {
      id: number
      qris?: string | null
      [key: string]: any
    }
    meja?: {
      id: number
      nama: string
      [key: string]: any
    }
    nomor_meja?: string
  }
}

/**
 * Get meja profile untuk cek QRIS availability
 */
export async function getMejaProfile(tokenMeja: string): Promise<MejaProfileResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/meja/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        token_meja: tokenMeja,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: MejaProfileResponse = await response.json()
    return data
  } catch (error: any) {
    console.error('Error getting meja profile:', error)
    throw new Error(`Failed to get meja profile: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Build QRIS image URL dari response
 */
export function buildQRISImageURL(qrisPath: string | null | undefined): string | null {
  if (!qrisPath || qrisPath.trim() === '' || qrisPath === 'null') {
    return null
  }
  
  // Jika sudah full URL, return as is
  if (qrisPath.startsWith('http://') || qrisPath.startsWith('https://')) {
    return qrisPath
  }
  
  // Tambahkan base URL
  return `${QRIS_IMAGE_BASE_URL}${qrisPath}`
}

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
  success?: boolean
  status?: string // "Success" atau "Error"
  message?: string
  data?: {
    id?: number | string
    order_id?: string
    nomor_transaksi?: string
    order_number?: string
    nomor_meja?: string | number
    table_number?: number
    total?: number
    status?: string
    created_at?: string
    [key: string]: any // Untuk field tambahan
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Interface untuk transaction detail item
 */
export interface TransactionDetailItem {
  product_id: string | number
  product_name: string
  quantity: number
  price: number
  subtotal: number
  note?: string
}

/**
 * Interface untuk payload /meja/transaksi
 */
export interface MejaTransaksiPayload {
  token_meja?: string // Token meja untuk dekripsi stall_id dan nomor meja
  kode?: string
  user_id?: number | string
  nomor_meja: number
  waktu_pesan: string // ISO 8601 format
  waktu_bayar?: string | null // ISO 8601 format atau null
  jumlah_total: number
  nominal_bayar: number
  diskon?: number
  pajak?: number
  biaya_lainnya?: number
  nominal_dasar: number
  pembayaran_melalui: string // 'QRIS' | 'CASHIER' | dll
  tipe?: string
  status: string
  dibayar: boolean
  catatan?: string
  transaction_method_id?: number | string
  customer_nama: string
  bukakas_id?: number | string
  transaction_details: TransactionDetailItem[]
  email?: string
  customer_email: string
  no_hp?: string
  customer_no_hp: string
  _isPiutang?: boolean
  jatuh_tempo_piutang?: string | null
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

/**
 * Build payload untuk endpoint /meja/transaksi
 */
export function buildMejaTransaksiPayload(params: {
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
  userId?: number | string
  bukakasId?: number | string
  transactionMethodId?: number | string
}): MejaTransaksiPayload {
  const {
    items,
    customerName,
    customerPhone,
    customerEmail,
    paymentMethod,
    orderNote,
    tableNumber,
    status,
    userId,
    bukakasId,
    transactionMethodId,
    token,
  } = params

  // Calculate totals
  const nominalDasar = items.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const diskon = 0 // Default 0, bisa diisi jika ada diskon
  const pajak = 0 // Default 0, bisa diisi jika ada pajak
  const biayaLainnya = 0 // Default 0
  const jumlahTotal = nominalDasar - diskon + pajak + biayaLainnya

  // Determine payment status
  const isPaid = status === 'PAID'
  const nominalBayar = isPaid ? jumlahTotal : 0
  const waktuBayar = isPaid ? new Date().toISOString() : null

  // Map payment method (default: "cashier")
  const pembayaranMelalui = paymentMethod === 'QRIS_RESTAURANT' ? 'qris' : 'cashier'

  // Map status (default: "proses")
  let statusMapped = 'proses'
  if (status === 'PAID') {
    statusMapped = 'paid'
  } else if (status === 'WAITING_PAYMENT') {
    statusMapped = 'proses'
  } else if (status === 'PREPARING') {
    statusMapped = 'proses'
  } else if (status === 'READY') {
    statusMapped = 'proses'
  } else if (status === 'WAITING') {
    statusMapped = 'proses'
  }

  // Build transaction details
  const transactionDetails: TransactionDetailItem[] = items.map(item => ({
    product_id: item.productId,
    product_name: item.name,
    quantity: item.qty,
    price: item.price,
    subtotal: item.price * item.qty,
    note: item.note || undefined,
  }))

  // Get table number (use 0 if token mode)
  const nomorMeja = tableNumber || 0

  // Build payload
  const payload: MejaTransaksiPayload = {
    kode: '000000', // Default kode tenant
    nomor_meja: nomorMeja,
    waktu_pesan: new Date().toISOString(),
    waktu_bayar: waktuBayar,
    jumlah_total: jumlahTotal,
    nominal_bayar: nominalBayar,
    diskon: diskon,
    pajak: pajak,
    biaya_lainnya: biayaLainnya,
    nominal_dasar: nominalDasar,
    pembayaran_melalui: pembayaranMelalui,
    tipe: 'scan_barcode',
    status: statusMapped,
    dibayar: isPaid,
    customer_nama: customerName.trim(),
    transaction_details: transactionDetails,
    email: customerEmail.trim(),
    customer_email: customerEmail.trim(),
    no_hp: customerPhone.trim(),
    customer_no_hp: customerPhone.trim(),
    _isPiutang: false,
    jatuh_tempo_piutang: null,
  }

  // Add token_meja if available (format: stall_id:token)
  if (token && token.trim()) {
    payload.token_meja = token.trim()
  }

  // Add optional fields
  if (orderNote && orderNote.trim()) {
    payload.catatan = orderNote.trim()
  }
  if (userId !== undefined) {
    payload.user_id = userId
  }
  if (bukakasId !== undefined) {
    payload.bukakas_id = bukakasId
  }
  if (transactionMethodId !== undefined) {
    payload.transaction_method_id = transactionMethodId
  }

  return payload
}

/**
 * Send transaction to /meja/transaksi endpoint
 */
export async function sendTransactionToMeja(payload: MejaTransaksiPayload): Promise<POSOrderResponse> {
  const url = `${API_BASE_URL}/meja/transaksi`
  console.log('🌐 Sending POST request to:', url)
  console.log('📦 Payload size:', JSON.stringify(payload).length, 'bytes')
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    console.log('📡 Response status:', response.status, response.statusText)

    const data: POSOrderResponse = await response.json()
    console.log('✅ API Response received:', data)

    // Cek jika status HTTP 200 dan response.status === "Success"
    if (response.ok && response.status === 200) {
      if (data.status === 'Success') {
        // Set success flag
        data.success = true
        console.log('✅ Transaction successful, status: Success')
        return data
      } else {
        // Jika status bukan "Success" meskipun HTTP 200
        console.error('❌ API Response status not Success:', data.status)
        throw new Error(data.message || 'Transaksi gagal')
      }
    }

    // Jika HTTP tidak ok
    console.error('❌ API Error Response:', data)
    throw new Error(data.message || `HTTP error! status: ${response.status}`)
  } catch (error: any) {
    console.error('❌ Error sending transaction to /meja/transaksi:', error)
    console.error('❌ Error type:', error.constructor.name)
    console.error('❌ Error message:', error.message)
    if (error.cause) {
      console.error('❌ Error cause:', error.cause)
    }
    throw new Error(`Failed to send transaction: ${error.message || 'Unknown error'}`)
  }
}
