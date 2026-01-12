import { db } from './firebase'
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore'
import { Order } from './types'

/**
 * Get customer orders by customer email or phone
 */
export async function getCustomerOrders(customerEmail: string, customerPhone?: string): Promise<Order[]> {
  try {
    const ordersRef = collection(db, 'orders')
    let q = query(ordersRef, orderBy('createdAt', 'desc'))
    
    // Filter by email or phone
    if (customerEmail) {
      q = query(ordersRef, where('customerEmail', '==', customerEmail), orderBy('createdAt', 'desc'))
    } else if (customerPhone) {
      q = query(ordersRef, where('customerPhone', '==', customerPhone), orderBy('createdAt', 'desc'))
    }
    
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
  } catch (error) {
    console.error('Error getting customer orders:', error)
    return []
  }
}

/**
 * Subscribe to customer orders
 */
export function subscribeToCustomerOrders(
  customerEmail: string,
  customerPhone: string | undefined,
  callback: (orders: Order[]) => void
): () => void {
  const ordersRef = collection(db, 'orders')
  let q = query(ordersRef, orderBy('createdAt', 'desc'))
  
  // Try to filter by email first, then phone
  if (customerEmail) {
    q = query(ordersRef, where('customerEmail', '==', customerEmail), orderBy('createdAt', 'desc'))
  } else if (customerPhone) {
    q = query(ordersRef, where('customerPhone', '==', customerPhone), orderBy('createdAt', 'desc'))
  }
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
    callback(orders)
  }, (error) => {
    console.error('Error subscribing to customer orders:', error)
    callback([])
  })
}

/**
 * Get customer statistics
 */
export async function getCustomerStats(customerEmail: string, customerPhone?: string): Promise<{
  totalOrders: number
  totalSpent: number
  favoriteCategory: string | null
  lastOrderDate: Date | null
}> {
  try {
    const orders = await getCustomerOrders(customerEmail, customerPhone)
    
    const totalOrders = orders.length
    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    
    // Find favorite category
    const categoryCount: Record<string, number> = {}
    orders.forEach(order => {
      order.items?.forEach(item => {
        // Assuming items have category info, or we need to look it up
        // For now, we'll skip this
      })
    })
    
    const favoriteCategory = Object.keys(categoryCount).length > 0
      ? Object.keys(categoryCount).reduce((a, b) => categoryCount[a] > categoryCount[b] ? a : b)
      : null
    
    const lastOrderDate = orders.length > 0 && orders[0].createdAt
      ? (orders[0].createdAt as any).toDate()
      : null
    
    return {
      totalOrders,
      totalSpent,
      favoriteCategory,
      lastOrderDate
    }
  } catch (error) {
    console.error('Error getting customer stats:', error)
    return {
      totalOrders: 0,
      totalSpent: 0,
      favoriteCategory: null,
      lastOrderDate: null
    }
  }
}


