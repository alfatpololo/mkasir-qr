import { auth } from './firebase'
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth'
import { createOrUpdateCustomer } from './firestore'

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
    
    // Save/update customer data to Firestore
    if (user.email && user.displayName) {
      await createOrUpdateCustomer(
        user.uid,
        user.email,
        user.displayName || 'Customer',
        undefined,
        user.photoURL || undefined
      )
    }
    
    return user
  } catch (error: any) {
    console.error('Error signing in:', error)
    throw new Error(error.message || 'Gagal login')
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: displayName
    })
    
    // Save customer data to Firestore
    await createOrUpdateCustomer(
      userCredential.user.uid,
      email,
      displayName,
      phoneNumber,
      userCredential.user.photoURL || undefined
    )
    
    return userCredential.user
  } catch (error: any) {
    console.error('Error signing up:', error)
    throw new Error(error.message || 'Gagal mendaftar')
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
    
    // Save/update customer data to Firestore
    if (user.email) {
      await createOrUpdateCustomer(
        user.uid,
        user.email,
        user.displayName || 'Customer',
        user.phoneNumber || undefined,
        user.photoURL || undefined
      )
    }
    
    return user
  } catch (error: any) {
    console.error('Error signing in with Google:', error)
    throw new Error(error.message || 'Gagal login dengan Google')
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

