# Setup Firebase Storage untuk Upload Gambar

## ✅ Yang Sudah Dibuat

1. **Firebase Storage sudah dikonfigurasi** di `lib/firebase.ts`
2. **Fungsi upload gambar** di `lib/storage.ts`
3. **Form upload gambar** di `components/ProductForm.tsx` dengan preview

## 🔧 Cara Mengaktifkan Firebase Storage

### 1. Aktifkan Firebase Storage di Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project `qr-mkasir`
3. Klik **Storage** di menu sidebar kiri
4. Klik **Get Started**
5. Pilih **Start in test mode** (untuk development) atau **Start in production mode** (untuk production)
6. Pilih lokasi storage (pilih yang terdekat, contoh: `asia-southeast2` untuk Indonesia)
7. Klik **Done**

### 2. Setup Security Rules (PENTING!)

Setelah Storage aktif, buka tab **Rules** di Firebase Console dan paste rules berikut:

**Cara 1: Via Firebase Console (MUDAH)**
1. Buka Firebase Console → Storage → Rules tab
2. Copy semua isi dari file `storage.rules` di project ini
3. Paste di Firebase Console
4. Klik **Publish**

**Rules yang harus di-paste:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read for everyone (public access)
    match /{allPaths=**} {
      allow read: if true;
    }
    
    // Allow write for products folder (untuk demo, allow semua)
    // Untuk production, ganti dengan: allow write: if request.auth != null;
    match /products/{productId} {
      allow write: if true;
    }
    
    // Allow write for other paths if needed
    match /{allPaths=**} {
      allow write: if true;
    }
  }
}
```

**Cara 2: Via Firebase CLI**
```bash
firebase deploy --only storage
```

**⚠️ PENTING:** 
- Rules di atas menggunakan `allow write: if true;` untuk **DEMO/TESTING**
- Untuk **PRODUCTION**, ganti dengan `allow write: if request.auth != null;` untuk keamanan

## 📝 Cara Menggunakan Upload Gambar

### Di Form Produk:

1. Klik **"Upload Gambar"** atau drag & drop gambar
2. Format yang didukung: JPG, PNG, WebP
3. Maksimal ukuran: 5MB
4. Preview gambar akan muncul otomatis
5. Klik **X** untuk menghapus gambar yang dipilih
6. Atau masukkan URL gambar secara manual di field bawah

### Fitur:

- ✅ **Preview gambar** sebelum upload
- ✅ **Validasi file** (tipe dan ukuran)
- ✅ **Progress indicator** saat upload
- ✅ **Fallback ke URL** jika tidak upload file
- ✅ **Auto-generate filename** dengan timestamp

## 🔒 Security Rules untuk Production

Untuk production, gunakan rules yang lebih ketat:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read for everyone
    match /{allPaths=**} {
      allow read: if true;
    }
    
    // Only authenticated admins can upload
    match /products/{productId} {
      allow write: if request.auth != null 
                   && request.resource.size < 5 * 1024 * 1024 // Max 5MB
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## 📁 Struktur Storage

Gambar akan disimpan di:
```
/products/{timestamp}_{filename}
```

Contoh:
```
/products/1703123456789_nasi-goreng.jpg
```

## 🐛 Troubleshooting

### Error: "Storage is not initialized"
- Pastikan Firebase Storage sudah diaktifkan di Firebase Console
- Pastikan `storageBucket` di `firebase.ts` sudah benar

### Error: "Permission denied"
- Cek Storage Rules di Firebase Console
- Pastikan rules sudah di-deploy

### Error: "File too large"
- Maksimal ukuran file: 5MB
- Kompres gambar sebelum upload jika terlalu besar

### Gambar tidak muncul setelah upload
- Cek URL di Firestore apakah sudah tersimpan
- Cek Storage Rules apakah allow read sudah true
- Cek browser console untuk error detail

## ✅ Checklist

- [ ] Firebase Storage sudah diaktifkan
- [ ] Storage Rules sudah di-deploy
- [ ] Test upload gambar dari form produk
- [ ] Gambar muncul di menu customer
- [ ] Storage Rules sudah disesuaikan untuk production (jika perlu)

