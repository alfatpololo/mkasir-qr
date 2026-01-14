# Cara Deploy Firestore Security Rules

## Metode 1: Via Firebase Console (Paling Mudah)

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project **qr-mkasir**
3. Klik **Firestore Database** di menu kiri
4. Klik tab **Rules**
5. Copy semua isi dari file `firestore.rules` di project ini
6. Paste ke editor rules di Firebase Console
7. Klik **Publish**

## Metode 2: Via Firebase CLI

1. Install Firebase CLI (jika belum):
   ```bash
   npm install -g firebase-tools
   ```

2. Login ke Firebase:
   ```bash
   firebase login
   ```

3. Init Firebase di project (jika belum):
   ```bash
   firebase init firestore
   ```
   - Pilih project: **qr-mkasir**
   - File rules: `firestore.rules` (sudah ada)

4. Deploy rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Verifikasi

Setelah deploy, coba buat meja lagi di `/admin/tables`. Jika masih error, cek:

1. **Browser Console** (F12) - lihat error message
2. **Firebase Console** → Firestore → Rules - pastikan rules sudah ter-update
3. Pastikan Firestore Database sudah diaktifkan di Firebase Console

## Troubleshooting

### Error: "Missing or insufficient permissions"
- Pastikan rules sudah di-deploy dengan benar
- Refresh halaman setelah deploy rules
- Clear browser cache

### Error: "Firestore is not enabled"
- Buka Firebase Console → Firestore Database
- Klik "Create database"
- Pilih mode: **Start in test mode** (atau production dengan rules yang sudah di-deploy)




