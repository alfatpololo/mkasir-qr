# Dokumentasi Payload POS

Dokumentasi lengkap untuk payload yang dikirim ke backend API POS.

## Base URL

```
https://mkasir-fnb-dev.tip2.co/api/v1
```

## Endpoint

### Create Order
```
POST /orders
```

## Struktur Payload

### Request Body

```json
{
  "token": "string (optional)",           // Token meja (jika menggunakan token mode)
  "table_number": 0,                      // Nomor meja (jika menggunakan table number mode)
  "customer_name": "string (required)",   // Nama pembeli
  "customer_phone": "string (required)",  // Nomor HP pembeli (format: 08xxxxxxxxxx)
  "customer_email": "string (required)",  // Email pembeli
  "payment_method": "QRIS_RESTAURANT | CASHIER", // Metode pembayaran
  "order_note": "string (optional)",     // Catatan pesanan secara keseluruhan
  "items": [                              // Array item pesanan
    {
      "product_id": "string | number",    // ID produk
      "product_name": "string",           // Nama produk
      "quantity": 1,                      // Jumlah
      "price": 0,                         // Harga per item
      "subtotal": 0,                      // Harga total (price * quantity)
      "note": "string (optional)"         // Catatan khusus untuk item ini
    }
  ],
  "total": 0,                             // Total harga keseluruhan
  "status": "WAITING | PREPARING | READY | WAITING_PAYMENT | PAID",
  "metadata": {                           // Metadata tambahan (optional)
    "source": "pos | web | mobile",
    "user_agent": "string",
    "timestamp": "ISO 8601 string"
  }
}
```

## Contoh Payload

### Contoh 1: Order dengan Token Mode

```json
{
  "token": "55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976",
  "customer_name": "John Doe",
  "customer_phone": "081234567890",
  "customer_email": "john.doe@example.com",
  "payment_method": "QRIS_RESTAURANT",
  "order_note": "Makan di tempat, tidak pedas",
  "items": [
    {
      "product_id": "123",
      "product_name": "Nasi Goreng",
      "quantity": 2,
      "price": 25000,
      "subtotal": 50000,
      "note": "Tidak pakai telur"
    },
    {
      "product_id": "456",
      "product_name": "Es Teh Manis",
      "quantity": 1,
      "price": 5000,
      "subtotal": 5000
    }
  ],
  "total": 55000,
  "status": "WAITING",
  "metadata": {
    "source": "pos",
    "user_agent": "Mozilla/5.0...",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Contoh 2: Order dengan Table Number Mode

```json
{
  "table_number": 5,
  "customer_name": "Jane Smith",
  "customer_phone": "081987654321",
  "customer_email": "jane.smith@example.com",
  "payment_method": "CASHIER",
  "items": [
    {
      "product_id": "789",
      "product_name": "Ayam Geprek",
      "quantity": 1,
      "price": 15000,
      "subtotal": 15000
    }
  ],
  "total": 15000,
  "status": "WAITING_PAYMENT",
  "metadata": {
    "source": "pos",
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "order_id": "abc123xyz",
    "order_number": "ORD-2024-001",
    "table_number": 5,
    "total": 55000,
    "status": "WAITING",
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Customer name is required",
    "details": {
      "field": "customer_name",
      "reason": "required"
    }
  }
}
```

## Status Values

- `WAITING` - Pesanan menunggu diproses (default untuk QRIS_RESTAURANT)
- `PREPARING` - Pesanan sedang disiapkan
- `READY` - Pesanan siap diantar
- `WAITING_PAYMENT` - Menunggu pembayaran (default untuk CASHIER)
- `PAID` - Sudah dibayar

## Payment Method Values

- `QRIS_RESTAURANT` - Bayar di tempat menggunakan QRIS
- `CASHIER` - Bayar ke kasir

## Validasi

### Required Fields
- `customer_name` (min 2, max 100 karakter)
- `customer_phone` (10-13 digit, format Indonesia)
- `customer_email` (format email valid, max 100 karakter)
- `payment_method` (harus QRIS_RESTAURANT atau CASHIER)
- `items` (min 1 item, array tidak boleh kosong)
- `total` (harus > 0, harus sesuai dengan sum dari items)

### Optional Fields
- `token` (jika menggunakan token mode)
- `table_number` (jika menggunakan table number mode, harus 1-999)
- `order_note` (max 200 karakter)
- `metadata` (optional)

### Item Validation
- `product_id` (required)
- `product_name` (required, max 200 karakter)
- `quantity` (required, min 1, max 999)
- `price` (required, min 0)
- `subtotal` (required, harus = price * quantity)
- `note` (optional, max 200 karakter)

## Error Codes

- `VALIDATION_ERROR` - Data tidak valid
- `INVALID_TOKEN` - Token tidak valid atau expired
- `INVALID_TABLE` - Nomor meja tidak valid
- `PRODUCT_NOT_FOUND` - Produk tidak ditemukan
- `INSUFFICIENT_STOCK` - Stok tidak mencukupi
- `SERVER_ERROR` - Error dari server
- `NETWORK_ERROR` - Error koneksi

## Usage Example

### Contoh 1: Build dan Send Payload

```typescript
import { buildPOSPayload, sendOrderToPOS } from '@/lib/pos-api'

// Build payload
const payload = buildPOSPayload({
  token: '55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976',
  customerName: 'John Doe',
  customerPhone: '081234567890',
  customerEmail: 'john.doe@example.com',
  paymentMethod: 'QRIS_RESTAURANT',
  orderNote: 'Makan di tempat',
  items: [
    {
      productId: '123',
      name: 'Nasi Goreng',
      price: 25000,
      qty: 2,
      note: 'Tidak pakai telur'
    }
  ]
})

// Send to API
try {
  const response = await sendOrderToPOS(payload)
  if (response.success) {
    console.log('Order ID:', response.data?.order_id)
  }
} catch (error) {
  console.error('Error:', error)
}
```

### Contoh 2: Create Order Langsung

```typescript
import { createOrderViaPOS } from '@/lib/pos-api'

try {
  const orderId = await createOrderViaPOS({
    token: '55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976',
    customerName: 'John Doe',
    customerPhone: '081234567890',
    customerEmail: 'john.doe@example.com',
    paymentMethod: 'QRIS_RESTAURANT',
    items: [
      {
        productId: '123',
        name: 'Nasi Goreng',
        price: 25000,
        qty: 2
      }
    ]
  })
  console.log('Order created:', orderId)
} catch (error) {
  console.error('Error:', error)
}
```

### Contoh 3: Dual Storage (Firestore + POS API)

```typescript
import { createOrderDualStorage } from '@/lib/pos-integration-example'

const result = await createOrderDualStorage({
  token: '55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976',
  customerName: 'John Doe',
  customerPhone: '081234567890',
  customerEmail: 'john.doe@example.com',
  paymentMethod: 'QRIS_RESTAURANT',
  items: [...]
})

console.log('Firestore ID:', result.firestoreId)
console.log('POS Order ID:', result.posOrderId)
```

## Notes

1. **Token vs Table Number**: Gunakan salah satu, tidak keduanya
   - Jika menggunakan token mode, set `token` dan biarkan `table_number` undefined
   - Jika menggunakan table number mode, set `table_number` dan biarkan `token` undefined

2. **Total Calculation**: Backend akan memvalidasi bahwa `total` sesuai dengan sum dari `items[].subtotal`

3. **Status Default**: 
   - `QRIS_RESTAURANT` → `WAITING`
   - `CASHIER` → `WAITING_PAYMENT`

4. **Metadata**: Field `metadata` bersifat optional, tapi disarankan untuk tracking

5. **Timestamp**: Gunakan format ISO 8601 untuk timestamp
