# Flow Pembayaran QRIS

## 📋 Cara Menggunakan Payment Flow

### 1. **Customer Order**
- Customer scan QR di meja → buka `/menu/{tableNumber}`
- Pilih produk → tambah ke cart
- Klik **Checkout**
- Order dibuat dengan status: **WAITING**

### 2. **Admin Update Order Status**
- Buka dashboard: `/dashboard/orders`
- Cari order yang baru dibuat
- Klik **"Mulai Siapkan"** → status jadi **PREPARING**
- Klik **"Tandai Siap"** → status jadi **READY**

### 3. **Customer Bayar**
- Setelah order status = **READY**, customer akan lihat tombol **"Bayar dengan QRIS"** di Order Status page
- Klik tombol → redirect ke `/payment/qris?orderId={orderId}`
- Halaman payment menampilkan:
  - QR Code QRIS (mock/simulasi)
  - Total pembayaran
  - Tombol **"Simulasikan Pembayaran Berhasil"** (untuk demo)

### 4. **Simulasi Pembayaran**
- Klik tombol **"✅ Simulasikan Pembayaran Berhasil (Demo)"**
- Payment status berubah jadi **SUCCESS**
- Order status otomatis berubah jadi **PAID**
- Customer melihat halaman sukses

## ⚠️ Troubleshooting

### ❌ "Pesanan belum siap untuk dibayar"
**Penyebab:** Order status belum **READY**

**Solusi:**
1. Buka `/dashboard/orders`
2. Cari order tersebut
3. Update status: WAITING → PREPARING → READY
4. Setelah READY, customer bisa bayar

### ❌ Payment page tidak muncul
**Penyebab:** 
- Order tidak ditemukan
- OrderId tidak valid

**Solusi:**
1. Pastikan order sudah dibuat
2. Cek Browser Console (F12) untuk error
3. Pastikan URL benar: `/payment/qris?orderId={orderId}`

### ❌ Tombol "Bayar dengan QRIS" tidak muncul
**Penyebab:** Order status bukan **READY**

**Solusi:**
- Update order status ke **READY** di dashboard admin

## 🔄 Flow Lengkap

```
Customer Order
    ↓
Status: WAITING
    ↓
Admin: "Mulai Siapkan"
    ↓
Status: PREPARING
    ↓
Admin: "Tandai Siap"
    ↓
Status: READY
    ↓
Customer: Klik "Bayar dengan QRIS"
    ↓
Payment Page (/payment/qris)
    ↓
Customer: Klik "Simulasikan Pembayaran"
    ↓
Payment Status: SUCCESS
    ↓
Order Status: PAID ✅
```

## 📝 Catatan

- Payment menggunakan simulasi (tidak ada payment gateway real)
- QR Code QRIS adalah mock/placeholder
- Untuk production, perlu integrasi dengan payment gateway real
- Order harus status **READY** sebelum bisa dibayar




