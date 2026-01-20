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

// Dekripsi token menjadi data customer
function decryptCustomerData(encryptedToken: string): {
  name: string
  phone: string
  email: string
  note: string
} | null {
  if (!encryptedToken) return null

  const [ivHex, encryptedHex] = String(encryptedToken).split(':')
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

    // Parse format: "name|phone|email|note"
    const parts = decrypted.split('|')
    if (parts.length < 3) {
      console.error('Invalid decrypted data format')
      return null
    }

    return {
      name: parts[0] || '',
      phone: parts[1] || '',
      email: parts[2] || '',
      note: parts[3] || '',
    }
  } catch (error: any) {
    console.error('Decryption error:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    console.log('🔓 Decrypt request received, token length:', token?.length || 0)

    if (!token || typeof token !== 'string') {
      console.error('❌ Token is missing or invalid type')
      return NextResponse.json(
        { success: false, error: 'Token is required and must be a string' },
        { status: 400 }
      )
    }

    if (token.trim().length === 0) {
      console.error('❌ Token is empty')
      return NextResponse.json(
        { success: false, error: 'Token cannot be empty' },
        { status: 400 }
      )
    }

    // Decrypt token
    const decrypted = decryptCustomerData(token)

    if (!decrypted) {
      console.error('❌ Decryption failed for token:', token.substring(0, 50) + '...')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid token format or decryption failed',
          details: process.env.NODE_ENV === 'development' ? 'Check server logs for details' : undefined
        },
        { status: 400 }
      )
    }

    console.log('✅ Decryption successful')
    return NextResponse.json({
      success: true,
      data: decrypted,
    })
  } catch (error: any) {
    console.error('❌ Error decrypting customer data:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
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
    const decrypted = decryptCustomerData(token)

    if (!decrypted) {
      return NextResponse.json(
        { success: false, error: 'Invalid token format or decryption failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: decrypted,
    })
  } catch (error: any) {
    console.error('Error decrypting customer data:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
