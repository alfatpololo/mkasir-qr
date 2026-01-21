import { auth } from './firebase'
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail
} from 'firebase/auth'
import { API_BASE_URL } from './pos-api'
import { createOrUpdateCustomer } from './firestore'

/**
 * Convert Firebase error to user-friendly message
 */
function getErrorMessage(error: any): string {
  const errorCode = error.code || ''
  const errorMessage = error.message || ''
  
  // Firebase Auth error codes
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Akun belum terdaftar. Silakan daftar terlebih dahulu.'
    case 'auth/wrong-password':
      return 'Password salah. Silakan coba lagi.'
    case 'auth/invalid-credential':
      return 'Email atau password salah. Pastikan email sudah terdaftar dan password benar.'
    case 'auth/invalid-email':
      return 'Email tidak valid. Silakan masukkan email yang benar.'
    case 'auth/email-already-in-use':
      return 'EMAIL_ALREADY_IN_USE' // Special code untuk handle di UI
    case 'auth/weak-password':
      return 'Password terlalu lemah. Minimal 6 karakter.'
    case 'auth/network-request-failed':
      return 'Koneksi internet bermasalah. Silakan coba lagi.'
    case 'auth/popup-closed-by-user':
      return 'Login dibatalkan. Silakan coba lagi.'
    case 'auth/popup-blocked':
      return 'Popup diblokir browser. Silakan izinkan popup dan coba lagi.'
    case 'auth/cancelled-popup-request':
      return 'Login dibatalkan. Silakan coba lagi.'
    case 'auth/unauthorized-domain':
      return 'Domain tidak diizinkan. Silakan hubungi administrator.'
    default:
      // Check if error message contains specific keywords
      if (errorMessage.includes('user-not-found') || errorMessage.includes('user not found')) {
        return 'Akun belum terdaftar. Silakan daftar terlebih dahulu.'
      }
      if (errorMessage.includes('invalid-credential') || errorMessage.includes('invalid credential')) {
        return 'Email atau password salah. Pastikan email sudah terdaftar dan password benar.'
      }
      if (errorMessage.includes('wrong-password') || errorMessage.includes('wrong password')) {
        return 'Password salah. Silakan coba lagi.'
      }
      if (errorMessage.includes('email-already-in-use') || errorMessage.includes('email already in use')) {
        return 'Email sudah terdaftar. Silakan gunakan email lain atau login.'
      }
      // Return original message if no match
      return errorMessage || 'Terjadi kesalahan. Silakan coba lagi.'
  }
}

export interface CustomerData {
  uid: string
  email: string
  displayName: string
  phoneNumber?: string
  photoURL?: string
  createdAt?: Date
  customerId?: number // Customer ID from API
  stallId?: number // Stall ID from API
}

/**
 * Sign in with email and password
 */
export async function signInCustomer(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const user = userCredential.user
    
    // Save/update customer data to Firestore (silent fail if error)
    if (user.email) {
      try {
        await createOrUpdateCustomer(
          user.uid,
          user.email,
          user.displayName || 'Customer',
          undefined,
          user.photoURL || undefined
        )
      } catch (firestoreError) {
        // Silent fail - customer data will be created on next login or order
        console.warn('Failed to save customer data to Firestore:', firestoreError)
      }
    }
    
    return user
  } catch (error: any) {
    console.error('Error signing in:', error)
    const friendlyMessage = getErrorMessage(error)
    throw new Error(friendlyMessage)
  }
}

/**
 * Sign up new customer
 */
export async function signUpCustomer(
  email: string,
  password: string,
  displayName: string,
  phoneNumber?: string
): Promise<User> {
  try {
    // Cek apakah email sudah terdaftar dengan provider lain (Google)
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email)
      if (signInMethods.length > 0 && signInMethods.includes('google.com')) {
        // Email sudah terdaftar dengan Google
        throw new Error('EMAIL_REGISTERED_WITH_GOOGLE')
      }
    } catch (checkError: any) {
      // Jika error adalah EMAIL_REGISTERED_WITH_GOOGLE, throw lagi
      if (checkError.message === 'EMAIL_REGISTERED_WITH_GOOGLE') {
        throw checkError
      }
      // Jika error lain (misalnya network), lanjutkan saja
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // Update profile with display name
    try {
      await updateProfile(userCredential.user, {
        displayName: displayName
      })
    } catch (profileError) {
      console.warn('Failed to update profile:', profileError)
      // Continue anyway
    }
    
    // Save customer data to Firestore (silent fail if error)
    try {
        await createOrUpdateCustomer(
          userCredential.user.uid,
          email,
          displayName,
          phoneNumber,
          userCredential.user.photoURL || undefined
        )
    } catch (firestoreError) {
      // Silent fail - customer data will be created on next login or order
      console.warn('Failed to save customer data to Firestore:', firestoreError)
    }
    
    return userCredential.user
  } catch (error: any) {
    console.error('Error signing up:', error)
    
    // Handle special case: email sudah terdaftar dengan Google
    if (error.message === 'EMAIL_REGISTERED_WITH_GOOGLE' || error.code === 'auth/email-already-in-use') {
      // Cek apakah email terdaftar dengan Google
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email)
        if (signInMethods.includes('google.com')) {
          throw new Error('EMAIL_REGISTERED_WITH_GOOGLE')
        }
      } catch (checkError: any) {
        if (checkError.message === 'EMAIL_REGISTERED_WITH_GOOGLE') {
          throw checkError
        }
      }
      throw new Error('Email sudah terdaftar. Silakan gunakan email lain atau login.')
    }
    
    const friendlyMessage = getErrorMessage(error)
    throw new Error(friendlyMessage)
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const provider = new GoogleAuthProvider()
    const userCredential = await signInWithPopup(auth, provider)
    const user = userCredential.user
    
    // Save/update customer data to Firestore (silent fail if error)
    if (user.email) {
      try {
        await createOrUpdateCustomer(
          user.uid,
          user.email,
          user.displayName || 'Customer',
          user.phoneNumber || undefined,
          user.photoURL || undefined
        )
      } catch (firestoreError) {
        // Silent fail - customer data will be created on next login or order
        console.warn('Failed to save customer data to Firestore:', firestoreError)
      }
    }
    
    return user
  } catch (error: any) {
    console.error('Error signing in with Google:', error)
    const friendlyMessage = getErrorMessage(error)
    throw new Error(friendlyMessage)
  }
}

/**
 * Sign out current user
 */
export async function signOutCustomer(): Promise<void> {
  try {
    await signOut(auth)
  } catch (error: any) {
    console.error('Error signing out:', error)
    throw new Error(error.message || 'Gagal logout')
  }
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback)
}

/**
 * Hash password using SHA-256
 * Note: In production, use bcrypt or Argon2 for better security
 */
async function hashPassword(password: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Server-side: use Node.js crypto
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(password).digest('hex')
  } else {
    // Client-side: use Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}

/**
 * Verify password
 */
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const hash = await hashPassword(password)
  return hash === hashedPassword
}

/**
 * Save session to localStorage
 */
function saveSession(customerData: CustomerData, password: string): void {
  if (typeof window === 'undefined') {
    console.error('❌ saveSession: window is undefined (server-side)')
    return
  }
  
  console.log('💾 saveSession called')
  console.log('💾 Password parameter:', password)
  console.log('💾 Password type:', typeof password)
  console.log('💾 Customer data:', customerData)
  
  // Pastikan password tidak null/undefined dan trim whitespace
  const passwordClean = password ? String(password).trim() : ''
  if (!passwordClean) {
    console.error('❌ ERROR: Attempting to save session with empty password!')
    console.error('❌ Original password value:', password)
    console.error('❌ Password after trim:', passwordClean)
    // Jangan return, tetap simpan tapi log error
  }
  
  const sessionData = {
    ...customerData,
    _password: passwordClean, // Store password temporarily for API calls
    _timestamp: Date.now(), // Store timestamp for session validation
  }
  
  console.log('💾 Session data to save:')
  console.log('💾 - customerId:', sessionData.customerId)
  console.log('💾 - _password:', sessionData._password)
  console.log('💾 - _password type:', typeof sessionData._password)
  console.log('💾 - _password length:', sessionData._password?.length)
  
  try {
    const jsonString = JSON.stringify(sessionData)
    console.log('💾 JSON string length:', jsonString.length)
    localStorage.setItem('phoneLoggedInUser', jsonString)
    console.log('✅ localStorage.setItem called successfully')
    
    // Verify it was saved correctly - immediate check
    const verify = localStorage.getItem('phoneLoggedInUser')
    if (verify) {
      const parsed = JSON.parse(verify)
      console.log('✅ Verified saved session:')
      console.log('✅ - customerId:', parsed.customerId)
      console.log('✅ - _password:', parsed._password)
      console.log('✅ - _password type:', typeof parsed._password)
      console.log('✅ - _password length:', parsed._password?.length)
      
      if (parsed._password === passwordClean) {
        console.log('✅ Password saved correctly!')
      } else {
        console.error('❌ Password mismatch after save!')
        console.error('❌ Expected:', passwordClean)
        console.error('❌ Got:', parsed._password)
      }
    } else {
      console.error('❌ Failed to retrieve from localStorage immediately after save!')
    }
  } catch (error) {
    console.error('❌ Error saving to localStorage:', error)
  }
  
  // Dispatch custom event to notify other components
  window.dispatchEvent(new Event('authStateChange'))
}

/**
 * Get session from localStorage
 */
export function getSession(): CustomerData | null {
  if (typeof window === 'undefined') return null
  
  try {
    const savedSession = localStorage.getItem('phoneLoggedInUser')
    if (!savedSession) return null
    
    const sessionData = JSON.parse(savedSession)
    
    // Check if session exists and has required fields
    // For phone-only login, _password might be empty (token/kode from API)
    if (!sessionData.customerId) {
      return null
    }
    
    // Return customer data without password
    const { _password, _timestamp, ...customerData } = sessionData
    return customerData as CustomerData
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

/**
 * Get stored password from session (for API calls)
 */
export function getStoredPassword(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const savedSession = localStorage.getItem('phoneLoggedInUser')
    if (!savedSession) {
      console.warn('⚠️ No phoneLoggedInUser found in localStorage')
      return null
    }
    
    const sessionData = JSON.parse(savedSession)
    const password = sessionData._password || null
    
    if (!password) {
      console.warn('⚠️ No _password found in session data')
      console.log('📋 Session data keys:', Object.keys(sessionData))
    } else {
      console.log('✅ Password found in session, length:', password.length)
    }
    
    return password
  } catch (error) {
    console.error('❌ Error getting stored password:', error)
    return null
  }
}

/**
 * Clear session from localStorage
 * Note: customerRiwayat tidak dihapus karena riwayat pesanan tersimpan di backend/API
 * dan akan diambil kembali saat login ulang
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return
  
  // Hanya hapus session user, jangan hapus customerRiwayat
  // karena riwayat pesanan tersimpan di backend/API dan akan diambil kembali saat login
  localStorage.removeItem('phoneLoggedInUser')
  // localStorage.removeItem('customerRiwayat') // Jangan hapus, biarkan sebagai cache
  
  // Dispatch custom event to notify other components
  window.dispatchEvent(new Event('authStateChange'))
}

/**
 * Send OTP to phone number
 */
export async function sendOTP(phoneNumber: string): Promise<{ success: boolean; message?: string }> {
  try {
    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\s|-|\(|\)/g, '')
    
    // Call API to send OTP
    const response = await fetch(`${API_BASE_URL}/meja/customer/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        notelp: normalizedPhone,
      }),
    })

    const apiResponse = await response.json()

    if (!response.ok) {
      const errorMessage = apiResponse?.message || apiResponse?.error || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(errorMessage)
    }

    if (apiResponse.status !== 'Success') {
      throw new Error(apiResponse.message || 'Gagal mengirim OTP')
    }

    return { success: true, message: apiResponse.message || 'OTP berhasil dikirim' }
  } catch (error: any) {
    console.error('Error sending OTP:', error)
    throw new Error(error.message || 'Gagal mengirim OTP')
  }
}

/**
 * Verify OTP and login
 */
export async function verifyOTPAndLogin(phoneNumber: string, otp: string): Promise<CustomerData> {
  try {
    if (!otp || otp.trim() === '') {
      throw new Error('OTP harus diisi')
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\s|-|\(|\)/g, '')
    
    // Call API to verify OTP
    const response = await fetch(`${API_BASE_URL}/meja/customer/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        notelp: normalizedPhone,
        otp: otp.trim(),
      }),
    })

    const apiResponse = await response.json()

    if (!response.ok) {
      const errorMessage = apiResponse?.message || apiResponse?.error || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(errorMessage)
    }
    
    if (apiResponse.status !== 'Success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'OTP tidak valid atau sudah expired')
    }

    const apiData = apiResponse.data
    
    // Extract phone number from details array
    const phoneDetail = apiData.details?.find((d: any) => d.target === 'phone')
    const customerPhone = phoneDetail?.value || normalizedPhone
    
    // Create customer data from API response
    const customerData: CustomerData = {
      uid: `api_${apiData.id}`,
      email: '',
      displayName: apiData.nama || 'Customer',
      phoneNumber: customerPhone,
      photoURL: undefined,
      createdAt: new Date(),
      customerId: apiData.id,
      stallId: apiData.stall_id,
    }
    
    // Save session - untuk OTP, kita simpan OTP sebagai "password" untuk konsistensi
    // Tapi sebenarnya setelah login OTP, kita tidak perlu password lagi
    console.log('💾 Saving session after OTP verification')
    saveSession(customerData, otp) // Simpan OTP sebagai token sesi
    
    return customerData
  } catch (error: any) {
    console.error('Error verifying OTP:', error)
    throw new Error(error.message || 'Gagal verifikasi OTP')
  }
}

/**
 * Sign in with phone number only (no password) via API
 */
export async function signInWithPhoneOnly(phoneNumber: string): Promise<CustomerData> {
  try {
    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\s|-|\(|\)/g, '')
    
    // Call API to login with phone only
    const response = await fetch(`${API_BASE_URL}/meja/customer/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        notelp: normalizedPhone,
      }),
    })

    // Parse response
    let apiResponse: any
    try {
      apiResponse = await response.json()
    } catch (parseError) {
      throw new Error('Gagal memproses response dari server')
    }

    // Check for API errors
    if (!response.ok) {
      const errorMessage = apiResponse?.message || apiResponse?.error || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(errorMessage)
    }
    
    // Check response status
    if (apiResponse.status !== 'Success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Login gagal. Periksa nomor HP Anda.')
    }

    const apiData = apiResponse.data
    
    // Extract phone number from details array
    const phoneDetail = apiData.details?.find((d: any) => d.target === 'phone')
    const customerPhone = phoneDetail?.value || normalizedPhone
    
    // Create customer data from API response
    const customerData: CustomerData = {
      uid: `api_${apiData.id}`,
      email: '',
      displayName: apiData.nama || 'Customer',
      phoneNumber: customerPhone,
      photoURL: undefined,
      createdAt: new Date(),
      customerId: apiData.id,
      stallId: apiData.stall_id,
    }
    
    // Untuk login dengan phone only, gunakan default password '000000' untuk fetch riwayat
    // API akan return token/kode jika ada, jika tidak gunakan default '000000'
    const authToken = apiData.token || apiData.kode || apiData.password || '000000'
    
    // Save session dengan token/kode dari API atau default password
    console.log('💾 Saving session after phone-only login, using password:', authToken ? '***' : 'EMPTY')
    saveSession(customerData, authToken)
    
    return customerData
  } catch (error: any) {
    console.error('Error signing in with phone only:', error)
    throw new Error(error.message || 'Gagal login dengan nomor HP')
  }
}

/**
 * Sign in with phone number and password via API
 */
export async function signInWithPhone(phoneNumber: string, password: string): Promise<CustomerData> {
  try {
    if (!password || password.trim() === '') {
      throw new Error('Password harus diisi')
    }

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/\s|-|\(|\)/g, '')
    
    // Call API to login
    const response = await fetch(`${API_BASE_URL}/meja/customer/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        notelp: normalizedPhone,
        kode: password,
      }),
    })

    // Parse response
    let apiResponse: any
    try {
      apiResponse = await response.json()
    } catch (parseError) {
      throw new Error('Gagal memproses response dari server')
    }

    // Check for API errors
    if (!response.ok) {
      const errorMessage = apiResponse?.message || apiResponse?.error || `HTTP ${response.status}: ${response.statusText}`
      throw new Error(errorMessage)
    }
    
    // Check response status
    if (apiResponse.status !== 'Success' || !apiResponse.data) {
      throw new Error(apiResponse.message || 'Login gagal. Periksa nomor HP dan password Anda.')
    }

    const apiData = apiResponse.data
    
    // Extract phone number from details array
    const phoneDetail = apiData.details?.find((d: any) => d.target === 'phone')
    const customerPhone = phoneDetail?.value || normalizedPhone
    
    // Create customer data from API response
    const customerData: CustomerData = {
      uid: `api_${apiData.id}`,
      email: '',
      displayName: apiData.nama || 'Customer',
      phoneNumber: customerPhone,
      photoURL: undefined,
      createdAt: new Date(),
      customerId: apiData.id, // Customer ID from API (untuk fetch riwayat)
      stallId: apiData.stall_id, // Stall ID from API
    }
    
    // Save session to localStorage dengan password yang digunakan untuk login
    console.log('💾 Saving session after login')
    console.log('💾 Password received in signInWithPhone:', password)
    console.log('💾 Password type:', typeof password)
    console.log('💾 Password length:', password?.length)
    console.log('💾 Password trimmed:', password?.trim())
    
    saveSession(customerData, password)
    
    // Verify password was saved correctly - wait a bit for localStorage to update
    setTimeout(() => {
      const savedPassword = getStoredPassword()
      console.log('🔍 Verifying saved password...')
      console.log('🔍 Saved password:', savedPassword)
      console.log('🔍 Expected password:', password.trim())
      
      if (savedPassword !== password.trim()) {
        console.error('❌ Password mismatch!')
        console.error('❌ Saved:', savedPassword)
        console.error('❌ Expected:', password.trim())
      } else {
        console.log('✅ Password saved correctly and verified!')
      }
    }, 100)
    
    return customerData
  } catch (error: any) {
    console.error('Error signing in with phone:', error)
    throw new Error(error.message || 'Gagal login dengan nomor HP')
  }
}

/**
 * Sign out customer (API-based)
 */
export async function signOutCustomerAPI(): Promise<void> {
  try {
    // Clear session from localStorage
    clearSession()
  } catch (error: any) {
    console.error('Error signing out:', error)
    throw new Error(error.message || 'Gagal logout')
  }
}

/**
 * Get current user from session (API-based)
 */
export function getCurrentUserAPI(): CustomerData | null {
  return getSession()
}

/**
 * Subscribe to auth state changes (API-based)
 * This is a simple implementation that checks localStorage
 */
export function onAuthStateChangeAPI(callback: (user: CustomerData | null) => void): () => void {
  if (typeof window === 'undefined') {
    // Server-side: return no-op cleanup
    return () => {}
  }
  
  let lastUser: CustomerData | null = null
  
  // Call immediately with current session
  const currentUser = getSession()
  lastUser = currentUser
  callback(currentUser)
  
  // Also listen to storage events (for cross-tab sync)
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'phoneLoggedInUser') {
      const user = getSession()
      // Only call callback if user actually changed
      if (JSON.stringify(user) !== JSON.stringify(lastUser)) {
        lastUser = user
        callback(user)
      }
    }
  }
  
  window.addEventListener('storage', handleStorageChange)
  
  // Also listen to custom events (for same-tab updates)
  const handleCustomStorageChange = () => {
    const user = getSession()
    // Only call callback if user actually changed
    if (JSON.stringify(user) !== JSON.stringify(lastUser)) {
      lastUser = user
      callback(user)
    }
  }
  
  window.addEventListener('authStateChange', handleCustomStorageChange as EventListener)
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange)
    window.removeEventListener('authStateChange', handleCustomStorageChange as EventListener)
  }
}

