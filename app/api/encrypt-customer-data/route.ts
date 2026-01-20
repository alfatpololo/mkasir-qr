import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Konfigurasi algoritma enkripsi
const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // 16 byte untuk AES

// Generate key 32 byte dari ENV
const getKey = () => {
  const baseKey = process.env.ENCRYPTION_KEY
  
  // Fallback untuk development jika ENCRYPTION_KEY tidak di-set
  if (!baseKey || baseKey === 'ganti_encryption_key_di_env_anda') {
    console.warn('⚠️ ENCRYPTION_KEY not set, using development fallback key')
    // Development fallback key (JANGAN gunakan di production!)
    const devKey = 'dev_encryption_key_32_bytes_long_for_testing_only'
    return crypto.createHash('sha256').update(devKey).digest().slice(0, 32)
  }
  
  return crypto.createHash('sha256').update(String(baseKey)).digest().slice(0, 32)
}

// Enkripsi data customer menjadi token
function encryptCustomerData(data: {
  name: string
  phone: string
  email: string
  note?: string
}): string {
  try {
    const key = getKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    
    // Format data: "name|phone|email|note"
    const dataString = `${data.name}|${data.phone}|${data.email}|${data.note || ''}`
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    let encrypted = cipher.update(dataString, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Format: "iv_hex:encrypted_hex"
    return `${iv.toString('hex')}:${encrypted}`
  } catch (error: any) {
    console.error('❌ Encryption error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    throw new Error(`Failed to encrypt customer data: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, note } = body

    // Validasi input - name dan phone wajib, email opsional
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name and phone are required' },
        { status: 400 }
      )
    }

    // Validasi format - email opsional, bisa string kosong
    if (typeof name !== 'string' || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name and phone must be strings' },
        { status: 400 }
      )
    }

    // Email opsional, jika ada harus string
    if (email !== undefined && email !== null && typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email must be a string' },
        { status: 400 }
      )
    }

    // Note opsional, jika ada harus string
    if (note !== undefined && note !== null && typeof note !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Note must be a string' },
        { status: 400 }
      )
    }

    // Enkripsi data - email dan note bisa kosong/undefined
    const encryptedToken = encryptCustomerData({
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '',
      note: note ? note.trim() : undefined,
    })

    return NextResponse.json({
      success: true,
      data: {
        token: encryptedToken,
      },
    })
  } catch (error: any) {
    console.error('❌ Error encrypting customer data:', error)
    console.error('Error stack:', error.stack)
    
    // Return error message yang lebih informatif
    const errorMessage = error.message || 'Internal server error'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
