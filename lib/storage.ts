import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

/**
 * Upload image to Firebase Storage
 * @param file - File object to upload
 * @param path - Storage path (e.g., 'products/image.jpg')
 * @returns Download URL of uploaded image
 */
export async function uploadImage(
  file: File,
  path: string
): Promise<string> {
  try {
    const storageRef = ref(storage, path)
    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  } catch (error) {
    console.error('Error uploading image:', error)
    throw new Error('Gagal mengupload gambar')
  }
}

/**
 * Upload product image
 * @param file - Image file
 * @param productId - Product ID (optional, for updating existing product)
 * @returns Download URL
 */
export async function uploadProductImage(
  file: File,
  productId?: string
): Promise<string> {
  // Generate unique filename
  const timestamp = Date.now()
  const filename = productId 
    ? `products/${productId}_${timestamp}_${file.name}`
    : `products/${timestamp}_${file.name}`
  
  return uploadImage(file, filename)
}

/**
 * Delete image from Firebase Storage
 * @param url - Full URL of the image to delete
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    // Extract path from URL
    // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/o\/(.+)\?/)
    if (!pathMatch) {
      throw new Error('Invalid image URL')
    }
    
    // Decode the path (Firebase Storage encodes special characters)
    const encodedPath = pathMatch[1]
    const decodedPath = decodeURIComponent(encodedPath)
    
    const storageRef = ref(storage, decodedPath)
    await deleteObject(storageRef)
  } catch (error) {
    console.error('Error deleting image:', error)
    // Don't throw error, just log it (image might not exist)
  }
}






