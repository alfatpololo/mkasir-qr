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

