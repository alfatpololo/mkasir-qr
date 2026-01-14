# Fitur QR Code Generator - Dokumentasi Export

Dokumentasi ini menjelaskan file-file yang perlu diambil untuk menggunakan fitur QR Code generator di backoffice lain.

## 📦 Dependencies yang Diperlukan

Tambahkan ke `package.json`:

```json
{
  "dependencies": {
    "react-qr-code": "^2.0.12",
    "lucide-react": "^0.303.0"
  }
}
```

Install dengan:
```bash
npm install react-qr-code lucide-react
```

## 📁 File yang Perlu Diambil

### 1. Komponen QR Code Generator

**File:** `components/QRCodeGenerator.tsx`

Komponen utama untuk generate QR Code dengan fitur:
- Generate QR Code dari URL/teks
- Download QR Code sebagai PNG
- Customizable size
- SSR-safe (client-side only)

**Props:**
```typescript
interface QRCodeGeneratorProps {
  tableNumber: number        // Nomor meja/identifier
  size?: number              // Ukuran QR Code (default: 256)
  showDownload?: boolean     // Tampilkan tombol download (default: true)
}
```

**Penggunaan:**
```tsx
import { QRCodeGenerator } from '@/components/QRCodeGenerator'

<QRCodeGenerator 
  tableNumber={1} 
  size={256} 
  showDownload={true} 
/>
```

---

### 2. Komponen Table QR Card (Alternatif)

**File:** `components/TableQRCard.tsx`

Komponen yang lebih lengkap dengan card wrapper, cocok untuk display QR Code meja.

**Props:**
```typescript
interface TableQRCardProps {
  tableNumber: number
  qrUrl: string              // URL lengkap untuk QR Code
}
```

**Penggunaan:**
```tsx
import { TableQRCard } from '@/components/TableQRCard'

<TableQRCard 
  tableNumber={1} 
  qrUrl="https://example.com/menu/1" 
/>
```

---

### 3. Komponen Button (Dependency)

**File:** `components/Button.tsx`

Komponen button yang digunakan oleh QR Code generator. Jika sudah punya komponen button sendiri, bisa skip atau adaptasi.

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}
```

---

### 4. Utility Function (Optional)

**File:** `lib/utils.ts` (fungsi `cn`)

Jika menggunakan Tailwind CSS, perlu fungsi `cn` untuk merge classNames:

```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Dependencies untuk utils:**
```json
{
  "dependencies": {
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

---

## 🔧 Cara Integrasi

### Opsi 1: Menggunakan QRCodeGenerator (Standalone)

1. Copy file `components/QRCodeGenerator.tsx`
2. Copy file `components/Button.tsx` (atau adaptasi dengan button component yang sudah ada)
3. Install dependencies: `react-qr-code`, `lucide-react`
4. Pastikan ada fungsi `cn` di `lib/utils.ts` (jika pakai Tailwind)

**Contoh penggunaan:**
```tsx
'use client'

import { QRCodeGenerator } from '@/components/QRCodeGenerator'

export default function MyPage() {
  return (
    <div>
      <h1>Generate QR Code</h1>
      <QRCodeGenerator 
        tableNumber={1}
        size={300}
        showDownload={true}
      />
    </div>
  )
}
```

---

### Opsi 2: Menggunakan TableQRCard

1. Copy file `components/TableQRCard.tsx`
2. Copy file `components/Button.tsx`
3. Install dependencies yang sama
4. Pastikan ada fungsi `cn` di `lib/utils.ts`

**Contoh penggunaan:**
```tsx
'use client'

import { TableQRCard } from '@/components/TableQRCard'

export default function TablesPage() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  
  return (
    <div>
      <TableQRCard 
        tableNumber={1}
        qrUrl={`${baseUrl}/menu/1`}
      />
    </div>
  )
}
```

---

## 🎨 Customization

### Mengubah Ukuran QR Code

```tsx
<QRCodeGenerator 
  tableNumber={1}
  size={400}  // Ubah ukuran di sini
/>
```

### Mengubah Level Error Correction

Edit di `QRCodeGenerator.tsx`:
```tsx
<QRCodeSVG
  id={`qr-code-${tableNumber}`}
  value={qrValue}
  size={size}
  level="H"  // Ubah ke "L", "M", "Q", atau "H"
  includeMargin={true}
/>
```

Level options:
- `L` - Low (~7% error correction)
- `M` - Medium (~15% error correction)
- `Q` - Quartile (~25% error correction)
- `H` - High (~30% error correction) - **Default**

### Mengubah Format Download

Saat ini download sebagai PNG. Untuk format lain, edit fungsi `handleDownload` di komponen.

---

## 📝 Catatan Penting

1. **SSR Safety**: Komponen menggunakan `useState` dan `useEffect` untuk memastikan hanya render di client-side, karena `react-qr-code` tidak support SSR.

2. **Dynamic Import**: Komponen menggunakan dynamic import untuk `react-qr-code` dengan fallback handling untuk berbagai cara import.

3. **Download Functionality**: Fungsi download mengkonversi SVG ke PNG menggunakan Canvas API. Pastikan browser support Canvas API.

4. **Styling**: Komponen menggunakan Tailwind CSS. Pastikan Tailwind sudah dikonfigurasi di project.

---

## 🚀 Quick Start Minimal

Jika hanya butuh generate QR Code tanpa download button:

```tsx
'use client'

import { useEffect, useState } from 'react'

let QRCodeSVG: any = null

if (typeof window !== 'undefined') {
  const QRCode = require('react-qr-code')
  QRCodeSVG = QRCode.QRCodeSVG || QRCode.default?.QRCodeSVG || QRCode.default || QRCode
}

export function SimpleQRCode({ value, size = 256 }: { value: string; size?: number }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !QRCodeSVG) {
    return <div>Loading QR Code...</div>
  }

  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="H"
      includeMargin={true}
    />
  )
}
```

---

## 📞 Support

Jika ada masalah saat integrasi:
1. Pastikan semua dependencies sudah terinstall
2. Pastikan komponen di-wrap dengan `'use client'` jika menggunakan Next.js App Router
3. Pastikan Tailwind CSS sudah dikonfigurasi jika menggunakan styling Tailwind
4. Check console untuk error messages

