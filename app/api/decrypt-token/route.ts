import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Konfigurasi algoritma enkripsi
const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16 // 16 byte untuk AES

// Generate key 32 byte dari ENV (wajib diganti di environment production)
const getKey = () => {
  const baseKey = process.env.ENCRYPTION_KEY
  if (!baseKey || baseKey === 'ganti_encryption_key_di_env_anda') {
    console.error('ENCRYPTION_KEY not set or using default value!')
    throw new Error('ENCRYPTION_KEY environment variable is not configured')
  }
  return crypto.createHash('sha256').update(String(baseKey)).digest().slice(0, 32)
}

// Dekripsi string "iv_hex:encrypted_hex" menjadi teks biasa
function decryptText(encryptedText: string): string | null {
  if (!encryptedText) return null

  const [ivHex, encryptedHex] = String(encryptedText).split(':')
  if (!ivHex || !encryptedHex) {
    console.error('Invalid token format: missing IV or encrypted data')
    return null
  }

  try {
    const key = getKey()
    const iv = Buffer.from(ivHex, 'hex')

    // Validate IV length
    if (iv.length !== IV_LENGTH) {
      console.error(`Invalid IV length: ${iv.length}, expected ${IV_LENGTH}`)
      return null
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error: any) {
    console.error('Decryption error:', error)
    // Re-throw untuk error handling di route handler
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    // Decrypt token
    const decrypted = decryptText(token)

    if (!decrypted) {
      return NextResponse.json(
        { success: false, error: 'Invalid token format or decryption failed' },
        { status: 400 }
      )
    }

    // Parse decrypted text (format: "no_meja:stall_id" atau hanya "no_meja")
    const parts = decrypted.split(':')
    const tableNumberStr = parts[0]?.trim()
    const stallId = parts[1]?.trim() || null

    if (!tableNumberStr) {
      return NextResponse.json(
        { success: false, error: 'Table number not found in decrypted token' },
        { status: 400 }
      )
    }

    const tableNumber = parseInt(tableNumberStr, 10)

    if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > 999) {
      return NextResponse.json(
        { success: false, error: `Invalid table number: ${tableNumberStr}. Must be between 1-999.` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        tableNumber,
        stallId,
        decrypted,
      },
    })
  } catch (error: any) {
    console.error('Error decrypting token:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET method untuk backward compatibility
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Token parameter is required' },
      { status: 400 }
    )
  }

  try {
    // Decrypt token
    let decrypted: string | null
    try {
      decrypted = decryptText(token)
    } catch (error: any) {
      console.error('Decryption error:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Decryption failed. Please check ENCRYPTION_KEY configuration.' 
        },
        { status: 500 }
      )
    }

    if (!decrypted) {
      return NextResponse.json(
        { success: false, error: 'Invalid token format or decryption failed. Please verify ENCRYPTION_KEY matches the encryption key used.' },
        { status: 400 }
      )
    }

    // Parse decrypted text
    const parts = decrypted.split(':')
    const tableNumberStr = parts[0]?.trim()
    const stallId = parts[1]?.trim() || null

    if (!tableNumberStr) {
      return NextResponse.json(
        { success: false, error: 'Table number not found in decrypted token' },
        { status: 400 }
      )
    }

    const tableNumber = parseInt(tableNumberStr, 10)

    if (isNaN(tableNumber) || tableNumber < 1 || tableNumber > 999) {
      return NextResponse.json(
        { success: false, error: `Invalid table number: ${tableNumberStr}. Must be between 1-999.` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        tableNumber,
        stallId,
        decrypted,
      },
    })
  } catch (error: any) {
    console.error('Error decrypting token:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
