/**
 * Utility functions untuk handle token terenkripsi
 */

export interface DecryptedToken {
  tableNumber: number
  stallId: string | null
  decrypted: string
}

/**
 * Encode token untuk URL (mengganti : dengan %3A)
 */
export function encodeTokenForUrl(token: string): string {
  return encodeURIComponent(token)
}

/**
 * Decode token dari URL
 */
export function decodeTokenFromUrl(encoded: string): string {
  try {
    return decodeURIComponent(encoded)
  } catch (e) {
    return encoded
  }
}

/**
 * Check if string is encrypted token format (iv_hex:encrypted_hex)
 */
export function isEncryptedToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  
  // Format: iv_hex:encrypted_hex (keduanya hex, dipisah dengan :)
  const parts = token.split(':')
  if (parts.length !== 2) return false
  
  // Check if both parts are valid hex strings
  const hexRegex = /^[0-9a-fA-F]+$/
  const isValid = hexRegex.test(parts[0]) && hexRegex.test(parts[1])
  
  // Debug logging
  if (!isValid) {
    console.log('🔍 Token validation failed:', {
      token,
      parts,
      part1Valid: hexRegex.test(parts[0]),
      part2Valid: hexRegex.test(parts[1]),
    })
  }
  
  return isValid
}

/**
 * Decrypt token via API
 */
export async function decryptToken(token: string): Promise<DecryptedToken | null> {
  try {
    const response = await fetch('/api/decrypt-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Failed to decrypt token:', errorData)
      return null
    }

    const data = await response.json()
    
    if (!data.success || !data.data) {
      return null
    }

    return {
      tableNumber: data.data.tableNumber,
      stallId: data.data.stallId,
      decrypted: data.data.decrypted,
    }
  } catch (error) {
    console.error('Error decrypting token:', error)
    return null
  }
}

/**
 * Dummy/fallback data untuk development/testing
 */
function getDummyTableInfo(param: string): { isValid: boolean; isToken: boolean; tableNumber: number; stallId: string | null; rawToken?: string } {
  // Jika format encrypted token tapi API gagal, gunakan dummy data
  if (isEncryptedToken(param)) {
    // Extract table number dari hash token (fallback)
    // Atau gunakan default table number untuk development
    const defaultTableNumber = 5 // Default untuk development
    console.log('🔧 Using dummy data for token (development mode):', param)
    return {
      isValid: true,
      isToken: true,
      tableNumber: defaultTableNumber,
      stallId: 'dummy_stall_id',
      rawToken: param,
    }
  }
  
  return { isValid: false, isToken: false, tableNumber: 0, stallId: null }
}

/**
 * Quick parse dengan dummy data langsung (untuk development)
 */
export function parseTableParamQuick(param: string): { isValid: boolean; isToken: boolean; tableNumber: number; stallId: string | null; rawToken?: string } {
  if (!param || typeof param !== 'string') {
    console.warn('⚠️ Invalid param type:', typeof param, param)
    return { isValid: false, isToken: false, tableNumber: 0, stallId: null }
  }

  console.log('🔍 parseTableParamQuick called with:', param)

  // Check if it's a numeric table number
  const isNumeric = /^\d+$/.test(param)

  if (isNumeric) {
    const tableNumber = parseInt(param, 10)
    if (tableNumber >= 1 && tableNumber <= 999) {
      return { isValid: true, isToken: false, tableNumber, stallId: null }
    }
    return { isValid: false, isToken: false, tableNumber: 0, stallId: null }
  }

  // Jika encrypted token, langsung return dummy data (untuk development)
  if (isEncryptedToken(param)) {
    console.log('✅ Detected encrypted token format, using dummy data')
    return getDummyTableInfo(param)
  }

  // Fallback: jika format mirip token (ada : di tengah), anggap sebagai token
  // Ini untuk menangani kasus di mana Next.js mungkin memotong parameter
  if (param.includes(':')) {
    const parts = param.split(':')
    if (parts.length >= 2) {
      console.log('⚠️ Token format detected but validation failed, using dummy data anyway:', param)
      return getDummyTableInfo(param)
    }
  }

  // Fallback lebih agresif: jika parameter panjang dan mengandung karakter hex/alphanumeric,
  // anggap sebagai token (untuk menangani kasus parameter terpotong)
  if (param.length >= 20 && /^[0-9a-fA-F]+$/.test(param)) {
    console.log('⚠️ Long hex string detected, treating as token:', param)
    return getDummyTableInfo(param)
  }

  // Fallback terakhir: jika parameter panjang (kemungkinan token yang terpotong), tetap anggap valid
  if (param.length >= 15) {
    console.log('⚠️ Long parameter detected, treating as token (may be truncated):', param)
    return getDummyTableInfo(param)
  }

  console.warn('❌ Invalid token format:', param)
  return { isValid: false, isToken: false, tableNumber: 0, stallId: null }
}

/**
 * Validate and parse table parameter (supports both numeric and encrypted token)
 * Dengan fallback ke dummy data jika API gagal (untuk development)
 */
export async function parseTableParam(
  param: string,
  useDummyOnError: boolean = true // Default true untuk development
): Promise<{ isValid: boolean; isToken: boolean; tableNumber: number; stallId: string | null; rawToken?: string }> {
  if (!param || typeof param !== 'string') {
    return { isValid: false, isToken: false, tableNumber: 0, stallId: null }
  }

  // Check if it's a numeric table number
  const isNumeric = /^\d+$/.test(param)

  if (isNumeric) {
    const tableNumber = parseInt(param, 10)
    if (tableNumber >= 1 && tableNumber <= 999) {
      return { isValid: true, isToken: false, tableNumber, stallId: null }
    }
    return { isValid: false, isToken: false, tableNumber: 0, stallId: null }
  }

  // Check if it's encrypted token format
  if (isEncryptedToken(param)) {
    try {
      // Timeout untuk API call (2 detik - lebih cepat)
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 2000)
      )
      
      const decryptPromise = decryptToken(param)
      
      const decrypted = await Promise.race([decryptPromise, timeoutPromise])
      
      if (decrypted && decrypted.tableNumber > 0) {
        return {
          isValid: true,
          isToken: true,
          tableNumber: decrypted.tableNumber,
          stallId: decrypted.stallId,
          rawToken: param,
        }
      }
      
      // Jika decryption gagal tapi useDummyOnError, gunakan dummy
      if (useDummyOnError) {
        console.warn('Token decryption failed, using dummy data for development:', param)
        return getDummyTableInfo(param)
      }
      
      console.warn('Token decryption failed or invalid table number:', { param, decrypted })
      return { isValid: false, isToken: true, tableNumber: 0, stallId: null, rawToken: param }
    } catch (error) {
      console.error('Error parsing encrypted token:', error)
      
      // Jika error tapi useDummyOnError, gunakan dummy data
      if (useDummyOnError) {
        console.warn('Using dummy data due to error (API timeout or ENCRYPTION_KEY not set):', error)
        return getDummyTableInfo(param)
      }
      
      return { isValid: false, isToken: true, tableNumber: 0, stallId: null, rawToken: param }
    }
  }

  // Invalid format
  return { isValid: false, isToken: false, tableNumber: 0, stallId: null }
}
