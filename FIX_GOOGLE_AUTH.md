# 🔧 Fix: Google Auth "Unauthorized Domain" Error

## Masalah
Saat deploy ke production (Vercel/Netlify/dll), login dengan Google muncul error:
```
auth/unauthorized-domain
```

## Penyebab
Domain production belum ditambahkan ke **Authorized Domains** di Firebase Console.

## ✅ Solusi: Tambahkan Domain ke Firebase

### Langkah 1: Buka Firebase Console
1. Buka https://console.firebase.google.com/
2. Pilih project Anda: **qr-mkasir**

### Langkah 2: Buka Authentication Settings
1. Klik menu **Authentication** di sidebar kiri
2. Klik tab **Settings** (ikon gear ⚙️)
3. Scroll ke bawah ke bagian **Authorized domains**

### Langkah 3: Tambahkan Domain Production
1. Klik tombol **"Add domain"**
2. Masukkan domain production Anda:
   - **Vercel**: `your-app.vercel.app` atau custom domain Anda
   - **Netlify**: `your-app.netlify.app` atau custom domain Anda
   - **Domain custom**: `yourdomain.com` dan `www.yourdomain.com` (jika pakai www)
3. Klik **"Add"**

### Langkah 4: Verifikasi Domain (Jika Diperlukan)
- Firebase akan meminta verifikasi domain untuk custom domain
- Ikuti instruksi yang muncul di Firebase Console
- Untuk subdomain Vercel/Netlify biasanya tidak perlu verifikasi

### Langkah 5: Test Login
1. Refresh halaman production Anda
2. Coba login dengan Google
3. Seharusnya sudah berfungsi! ✅

## 📋 Domain yang Harus Ditambahkan

Pastikan domain berikut sudah ada di Authorized Domains:

### Default (Sudah Otomatis Ada):
- ✅ `localhost` (untuk development)
- ✅ `qr-mkasir.firebaseapp.com` (Firebase hosting)
- ✅ `qr-mkasir.web.app` (Firebase hosting)

### Tambahkan Domain Production:
- ➕ `your-app.vercel.app` (domain Vercel)
- ➕ `yourdomain.com` (custom domain, jika ada)
- ➕ `www.yourdomain.com` (www version, jika pakai)

## ⚠️ Catatan Penting

1. **Tidak perlu restart server** - perubahan langsung aktif
2. **Domain harus exact match** - termasuk `www` atau tidak
3. **Subdomain berbeda** - `app.example.com` dan `www.app.example.com` adalah domain berbeda
4. **HTTP vs HTTPS** - Firebase hanya mendukung HTTPS untuk production

## 🔍 Cara Cek Domain Saat Ini

Untuk melihat domain production Anda:
- **Vercel**: Lihat di dashboard Vercel → Settings → Domains
- **Netlify**: Lihat di dashboard Netlify → Site settings → Domain management
- Atau cek URL browser saat mengakses aplikasi

## 🚨 Jika Masih Error

1. **Cek domain sudah benar** - pastikan tidak ada typo
2. **Tunggu beberapa menit** - kadang perlu waktu untuk propagate
3. **Clear cache browser** - coba hard refresh (Ctrl+Shift+R atau Cmd+Shift+R)
4. **Cek Firebase Console** - pastikan domain sudah muncul di list Authorized Domains
5. **Cek OAuth Consent Screen** - pastikan di Google Cloud Console sudah dikonfigurasi dengan benar

## 📞 Bantuan Lebih Lanjut

Jika masih error setelah mengikuti langkah di atas:
1. Screenshot error message
2. Screenshot Authorized Domains di Firebase Console
3. Cek console browser untuk error detail







