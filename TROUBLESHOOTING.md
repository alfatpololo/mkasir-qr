# Troubleshooting - Konfirmasi Pesanan Gagal

## 🔍 Langkah Diagnosa

### 1. **Cek Browser Console (F12)**
Buka Browser Console dan lihat error message:
- Tekan `F12` atau `Cmd+Option+I` (Mac)
- Klik tab **Console**
- Cari error berwarna merah
- Copy error message lengkapnya

### 2. **Cek Firestore Rules**
Pastikan rules sudah di-deploy:
1. Buka https://console.firebase.google.com/
2. Pilih project **qr-mkasir**
3. Klik **Firestore Database** → **Rules**
4. Pastikan rules untuk `orders` collection ada:
   ```javascript
   match /orders/{orderId} {
     allow create: if true;
     allow read: if true;
     allow update: if true;
   }
   ```
5. Jika belum, deploy rules dari file `firestore.rules`

### 3. **Cek Koneksi Firebase**
Pastikan Firebase sudah terhubung:
1. Buka Browser Console (F12)
2. Ketik: `firebase`
3. Jika muncul error, berarti Firebase belum terhubung
4. Cek file `.env.local` sudah ada dan berisi config Firebase

### 4. **Cek Network Tab**
1. Buka Browser Console (F12)
2. Klik tab **Network**
3. Coba konfirmasi pesanan lagi
4. Cari request ke Firebase (biasanya ke `firestore.googleapis.com`)
5. Lihat status code:
   - **200** = Success
   - **403** = Permission denied (rules belum di-deploy)
   - **400** = Bad request (data tidak valid)

## 🛠️ Solusi Umum

### Error: "Missing or insufficient permissions"
**Penyebab:** Firestore rules belum di-deploy

**Solusi:**
1. Copy isi file `firestore.rules`
2. Buka Firebase Console → Firestore → Rules
3. Paste dan klik **Publish**
4. Refresh halaman dan coba lagi

### Error: "Firestore database not initialized"
**Penyebab:** Firebase belum terhubung

**Solusi:**
1. Cek file `.env.local` sudah ada
2. Pastikan semua env variables sudah diisi
3. Restart development server: `npm run dev`

### Error: "Failed to create order"
**Penyebab:** Data tidak valid atau koneksi bermasalah

**Solusi:**
1. Cek Browser Console untuk detail error
2. Pastikan semua field sudah diisi (nama, nomor HP)
3. Cek koneksi internet
4. Coba refresh halaman

## 📋 Checklist

- [ ] Firestore rules sudah di-deploy
- [ ] File `.env.local` sudah ada dan berisi config Firebase
- [ ] Development server sudah di-restart setelah setup Firebase
- [ ] Browser Console tidak ada error merah
- [ ] Koneksi internet stabil
- [ ] Semua field form sudah diisi (nama, nomor HP, metode pembayaran)

## 🔧 Debug Mode

Untuk melihat detail error, buka Browser Console dan cari:
- `Creating order with data:` - Data yang dikirim
- `Firestore: Creating order` - Proses create di Firestore
- `Error creating order:` - Error yang terjadi

Jika masih error, copy semua log dari Console dan kirimkan untuk debugging lebih lanjut.



