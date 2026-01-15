import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Konfigurasi algoritma enkripsi
const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // 16 byte untuk AES

// Generate key 32 byte dari ENV
const getKey = () => {
  const baseKey = process.env.ENCRYPTION_KEY
  if (!baseKey || baseKey === 'ganti_encryption_key_di_env_anda') {
    console.error('ENCRYPTION_KEY not set or using default value!')
    throw new Error('ENCRYPTION_KEY environment variable is not configured')
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
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt customer data')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, email, note } = body

    // Validasi input
    if (!name || !phone || !email) {
      return NextResponse.json(
        { success: false, error: 'Name, phone, and email are required' },
        { status: 400 }
      )
    }

    // Validasi format
    if (typeof name !== 'string' || typeof phone !== 'string' || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid data types' },
        { status: 400 }
      )
    }

    // Enkripsi data
    const encryptedToken = encryptCustomerData({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      note: note ? note.trim() : undefined,
    })

    return NextResponse.json({
      success: true,
      data: {
        token: encryptedToken,
      },
    })
  } catch (error: any) {
    console.error('Error encrypting customer data:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
