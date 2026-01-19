# Setup ENCRYPTION_KEY

## ⚠️ PENTING: Setup Environment Variable

Agar token encryption berfungsi dengan benar, Anda **WAJIB** mengatur `ENCRYPTION_KEY` di environment variable.

## Cara Setup

### 1. Buat file `.env.local` di root project

```bash
# Di root project: /Applications/XAMPP/xamppfiles/htdocs/mkasir-qr/
touch .env.local
```

### 2. Tambahkan ENCRYPTION_KEY

```bash
ENCRYPTION_KEY=your_secret_encryption_key_min_32_characters_long
```

**Contoh:**
```bash
ENCRYPTION_KEY=my_super_secret_key_12345678901234567890
```

### 3. Restart Development Server

Setelah menambahkan `.env.local`, restart server:

```bash
# Stop server (Ctrl+C)
# Start lagi
npm run dev
```

## Validasi Setup

Untuk memastikan ENCRYPTION_KEY sudah benar, cek di browser console saat mengakses:

```
http://localhost:3000/checkout/55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976
```

Jika masih error "Parameter Tidak Valid", kemungkinan:
1. ENCRYPTION_KEY belum di-set
2. ENCRYPTION_KEY tidak cocok dengan key yang digunakan untuk enkripsi
3. Server belum di-restart setelah menambahkan .env.local

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is not configured"

**Solusi:**
1. Pastikan file `.env.local` ada di root project
2. Pastikan `ENCRYPTION_KEY` sudah di-set dengan benar
3. Restart development server
4. Pastikan key minimal 32 karakter

### Error: "Invalid token format or decryption failed"

**Solusi:**
1. Pastikan ENCRYPTION_KEY sama dengan yang digunakan untuk enkripsi token
2. Pastikan format token benar: `iv_hex:encrypted_hex`
3. Cek console browser untuk error detail

### Error: "Table number not found in decrypted token"

**Solusi:**
1. Pastikan token berisi `no_meja` yang valid
2. Format decrypted harus: `no_meja:stall_id` atau hanya `no_meja`
3. `no_meja` harus angka antara 1-999

## Production

Untuk production, pastikan:
1. Set ENCRYPTION_KEY di environment variable server (bukan di file)
2. Jangan commit `.env.local` ke repository
3. Gunakan key yang kuat (minimal 32 karakter, random)
4. Simpan key dengan aman (password manager, secret management service)

## Testing

Test dengan curl:

```bash
curl -X POST http://localhost:3000/api/decrypt-token \
  -H "Content-Type: application/json" \
  -d '{"token": "55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976"}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "tableNumber": 5,
    "stallId": "...",
    "decrypted": "5:..."
  }
}
```
