# Dokumentasi Token Encryption

## Overview

Token yang digunakan di URL seperti `55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976` adalah hasil enkripsi dari `no_meja` dan `stall_id` menggunakan AES-256-CBC.

## Format Token

Token memiliki format: `iv_hex:encrypted_hex`
- Bagian pertama (`55f8ea03be564f2eb42df9cc85fe4315`) adalah IV (Initialization Vector) dalam hex
- Bagian kedua (`7849a63532888c158a26034be95d5976`) adalah encrypted text dalam hex

## Setup Environment Variable

Tambahkan `ENCRYPTION_KEY` di file `.env.local`:

```bash
ENCRYPTION_KEY=your_secret_encryption_key_here_min_32_chars
```

**PENTING**: 
- Key harus minimal 32 karakter
- Jangan commit key ke repository
- Gunakan key yang berbeda untuk production

## API Endpoint

### POST /api/decrypt-token

Dekripsi token menjadi `no_meja` dan `stall_id`.

**Request:**
```json
{
  "token": "55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976"
}
```

**Response Success:**
```json
{
  "success": true,
  "data": {
    "tableNumber": 5,
    "stallId": "stall_123",
    "decrypted": "5:stall_123"
  }
}
```

**Response Error:**
```json
{
  "success": false,
  "error": "Invalid token format or decryption failed"
}
```

### GET /api/decrypt-token?token=...

Alternatif menggunakan GET method.

## Usage di Code

### 1. Parse Table Parameter (Async)

```typescript
import { parseTableParam } from '@/lib/token-utils'

const result = await parseTableParam('55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976')

if (result.isValid) {
  console.log('Table Number:', result.tableNumber)
  console.log('Stall ID:', result.stallId)
  console.log('Is Token:', result.isToken)
  console.log('Raw Token:', result.rawToken)
}
```

### 2. Check if Encrypted Token

```typescript
import { isEncryptedToken } from '@/lib/token-utils'

if (isEncryptedToken(token)) {
  // Token is encrypted, need to decrypt
  const decrypted = await decryptToken(token)
}
```

### 3. Decrypt Token Directly

```typescript
import { decryptToken } from '@/lib/token-utils'

const decrypted = await decryptToken('55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976')

if (decrypted) {
  console.log('Table:', decrypted.tableNumber)
  console.log('Stall:', decrypted.stallId)
}
```

## Flow di Checkout Pages

1. **Checkout Form Page** (`/checkout/[table]`):
   - Parse table parameter (async)
   - Jika encrypted token, decrypt via API
   - Validasi table number dari hasil dekripsi
   - Gunakan `rawToken` untuk redirect

2. **Payment Page** (`/checkout/[table]/payment`):
   - Parse table parameter (async)
   - Validasi token sebelum create order
   - Gunakan `rawToken` untuk redirect kembali ke menu

## Error Handling

Jika token tidak valid atau gagal didekripsi:
- Tampilkan error page: "Parameter Tidak Valid"
- Redirect ke beranda jika diperlukan

## Security Notes

1. **Server-Side Only**: Dekripsi hanya dilakukan di server (API route)
2. **Environment Variable**: Key tidak pernah diexpose ke client
3. **Validation**: Token divalidasi format sebelum dekripsi
4. **Error Handling**: Gagal dekripsi tidak expose informasi sensitif

## Testing

### Test dengan Token Valid

```bash
curl -X POST http://localhost:3000/api/decrypt-token \
  -H "Content-Type: application/json" \
  -d '{"token": "55f8ea03be564f2eb42df9cc85fe4315:7849a63532888c158a26034be95d5976"}'
```

### Test dengan Token Invalid

```bash
curl -X POST http://localhost:3000/api/decrypt-token \
  -H "Content-Type: application/json" \
  -d '{"token": "invalid_token"}'
```

## Troubleshooting

### Error: "Invalid token format or decryption failed"

1. Pastikan `ENCRYPTION_KEY` sudah di-set di `.env.local`
2. Pastikan key sama dengan yang digunakan untuk enkripsi
3. Pastikan format token benar: `iv_hex:encrypted_hex`

### Error: "Invalid table number in token"

1. Pastikan token berisi `no_meja` yang valid (1-999)
2. Format decrypted: `no_meja:stall_id` atau hanya `no_meja`

### Token tidak terdeteksi sebagai encrypted

- Pastikan format: `[hex]:[hex]` dengan kedua bagian adalah hex string
- Minimal panjang: 16 karakter per bagian (untuk IV)
