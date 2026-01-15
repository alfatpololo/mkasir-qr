/**
 * Validation utilities for security and data integrity
 */

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 500) // Max length
}

/**
 * Validate and sanitize email
 */
export function validateEmail(email: string): { valid: boolean; sanitized: string; error?: string } {
  if (!email || typeof email !== 'string') {
    return { valid: false, sanitized: '', error: 'Email harus diisi' }
  }
  
  const trimmed = email.trim().toLowerCase()
  
  if (trimmed.length === 0) {
    return { valid: false, sanitized: '', error: 'Email harus diisi' }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, sanitized: '', error: 'Email terlalu panjang (maks 100 karakter)' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return { valid: false, sanitized: '', error: 'Format email tidak valid' }
  }
  
  return { valid: true, sanitized: trimmed }
}

/**
 * Validate and sanitize phone number (Indonesian format)
 */
export function validatePhone(phone: string): { valid: boolean; sanitized: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, sanitized: '', error: 'Nomor HP harus diisi' }
  }
  
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  if (digitsOnly.length === 0) {
    return { valid: false, sanitized: '', error: 'Nomor HP harus diisi' }
  }
  
  // Indonesian phone number: 10-13 digits, usually starts with 0 or 62
  if (digitsOnly.length < 10 || digitsOnly.length > 13) {
    return { valid: false, sanitized: '', error: 'Nomor HP harus 10-13 digit' }
  }
  
  // Normalize: if starts with 62, convert to 0
  let normalized = digitsOnly
  if (normalized.startsWith('62')) {
    normalized = '0' + normalized.slice(2)
  }
  
  // Ensure starts with 0
  if (!normalized.startsWith('0')) {
    normalized = '0' + normalized
  }
  
  if (normalized.length < 10 || normalized.length > 13) {
    return { valid: false, sanitized: '', error: 'Format nomor HP tidak valid' }
  }
  
  return { valid: true, sanitized: normalized }
}

/**
 * Validate and sanitize name
 */
export function validateName(name: string): { valid: boolean; sanitized: string; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, sanitized: '', error: 'Nama harus diisi' }
  }
  
  const trimmed = name.trim()
  
  if (trimmed.length === 0) {
    return { valid: false, sanitized: '', error: 'Nama harus diisi' }
  }
  
  if (trimmed.length < 2) {
    return { valid: false, sanitized: '', error: 'Nama minimal 2 karakter' }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, sanitized: '', error: 'Nama terlalu panjang (maks 100 karakter)' }
  }
  
  // Allow letters, spaces, and common name characters
  const nameRegex = /^[a-zA-Z\s\.\-\']+$/
  if (!nameRegex.test(trimmed)) {
    return { valid: false, sanitized: '', error: 'Nama hanya boleh mengandung huruf, spasi, titik, tanda hubung, dan apostrof' }
  }
  
  return { valid: true, sanitized: trimmed }
}

/**
 * Validate and sanitize order note
 */
export function validateOrderNote(note: string): { valid: boolean; sanitized: string; error?: string } {
  if (!note || typeof note !== 'string') {
    return { valid: true, sanitized: '' } // Optional field
  }
  
  const trimmed = note.trim()
  
  if (trimmed.length > 200) {
    return { valid: false, sanitized: '', error: 'Catatan maksimal 200 karakter' }
  }
  
  // Sanitize but allow more characters for notes
  const sanitized = trimmed
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 200)
  
  return { valid: true, sanitized }
}

/**
 * Validate table number or token format (synchronous check only)
 * For async decryption, use parseTableParam from token-utils.ts
 */
export function validateTableParam(param: string): { isValid: boolean; isToken: boolean; value: string | number } {
  if (!param || typeof param !== 'string') {
    return { isValid: false, isToken: false, value: '' }
  }
  
  // Check if it's a numeric table number
  const isNumeric = /^\d+$/.test(param)
  
  if (isNumeric) {
    const tableNumber = parseInt(param, 10)
    if (tableNumber >= 1 && tableNumber <= 999) {
      return { isValid: true, isToken: false, value: tableNumber }
    }
    return { isValid: false, isToken: false, value: '' }
  }
  
  // Check if it's encrypted token format (iv_hex:encrypted_hex)
  const encryptedTokenPattern = /^[0-9a-fA-F]+:[0-9a-fA-F]+$/
  if (encryptedTokenPattern.test(param)) {
    // Valid format, but we can't validate decryption synchronously
    // Return as valid format, actual decryption will be done async
    return { isValid: true, isToken: true, value: param }
  }
  
  // Token mode: validate token format (alphanumeric, dashes, underscores, length)
  const tokenRegex = /^[a-zA-Z0-9\-_]+$/
  if (tokenRegex.test(param) && param.length >= 10 && param.length <= 200) {
    return { isValid: true, isToken: true, value: param }
  }
  
  return { isValid: false, isToken: false, value: '' }
}

/**
 * Rate limiting helper (client-side, basic)
 */
const submissionTimestamps: Map<string, number[]> = new Map()

export function checkRateLimit(key: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now()
  const timestamps = submissionTimestamps.get(key) || []
  
  // Remove old timestamps outside the window
  const recentTimestamps = timestamps.filter(ts => now - ts < windowMs)
  
  if (recentTimestamps.length >= maxRequests) {
    return false // Rate limit exceeded
  }
  
  // Add current timestamp
  recentTimestamps.push(now)
  submissionTimestamps.set(key, recentTimestamps)
  
  return true // Within rate limit
}
