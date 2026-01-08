# Deploy ke Vercel - Panduan Lengkap

## ✅ QR Code Otomatis Menyesuaikan Domain

QR code sudah menggunakan `window.location.origin` yang akan **otomatis menyesuaikan** dengan domain Vercel Anda. Jadi:

- **Development**: `http://localhost:3000/menu/1`
- **Vercel**: `https://your-app.vercel.app/menu/1`

QR code akan **selalu menggunakan domain yang sedang aktif**.

## 🚀 Cara Deploy ke Vercel

### 1. **Persiapan**

Pastikan semua file sudah commit:
```bash
git add .
git commit -m "Ready for deployment"
```

### 2. **Deploy via Vercel Dashboard**

1. Buka https://vercel.com
2. Login dengan GitHub/GitLab/Bitbucket
3. Klik **"New Project"**
4. Import repository `qris-mkasir`
5. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

### 3. **Environment Variables**

Tambahkan semua environment variables di Vercel Dashboard:

1. Di project settings, klik **"Environment Variables"**
2. Tambahkan semua variabel dari `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAt7hiqMXzVur_QFbPXnqDkgPiue42Ui70
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=qr-mkasir.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=qr-mkasir
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=qr-mkasir.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=84612554788
NEXT_PUBLIC_FIREBASE_APP_ID=1:84612554788:web:80880c141d8217caad38b1
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-EGQD7MZT7P
```

3. Klik **"Deploy"**

### 4. **Update Firebase Authorized Domains**

Setelah deploy, tambahkan domain Vercel ke Firebase:

1. Buka Firebase Console → Authentication → Settings
2. Scroll ke **"Authorized domains"**
3. Klik **"Add domain"**
4. Masukkan domain Vercel Anda: `your-app.vercel.app`
5. Klik **"Add"**

### 5. **Update Firestore Rules (Jika Perlu)**

Pastikan Firestore rules sudah di-deploy dengan benar (sudah dilakukan sebelumnya).

## 📱 QR Code Setelah Deploy

Setelah deploy ke Vercel:

1. **QR Code akan otomatis menggunakan domain Vercel**
2. Scan QR code → akan mengarah ke `https://your-app.vercel.app/menu/{tableNumber}`
3. **Tidak perlu regenerate QR code** - sudah otomatis dinamis!

## 🔄 Regenerate QR Code (Opsional)

Jika ingin update QR code yang sudah ada:

1. Buka dashboard di Vercel: `https://your-app.vercel.app/tables`
2. QR code akan otomatis menggunakan domain Vercel
3. Download QR code baru jika perlu

## ✅ Checklist Deploy

- [ ] Code sudah commit ke Git
- [ ] Environment variables sudah di-set di Vercel
- [ ] Firebase Authorized Domains sudah ditambahkan
- [ ] Firestore rules sudah di-deploy
- [ ] Test QR code setelah deploy
- [ ] Test semua fitur (order, payment, dll)

## 🎯 URL Setelah Deploy

- **Dashboard**: `https://your-app.vercel.app/`
- **Produk**: `https://your-app.vercel.app/products`
- **Kategori**: `https://your-app.vercel.app/categories`
- **Meja**: `https://your-app.vercel.app/tables`
- **Pesanan**: `https://your-app.vercel.app/orders`
- **Menu Customer**: `https://your-app.vercel.app/menu/1` (scan QR)

## 💡 Tips

1. **Custom Domain**: Bisa tambahkan custom domain di Vercel Settings
2. **Preview Deployments**: Setiap push ke branch akan auto-deploy preview
3. **Production Deploy**: Push ke `main` branch akan deploy ke production

QR code akan **selalu bekerja** dengan domain yang benar, baik di development maupun production! 🎉

