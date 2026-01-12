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
    
    // Get all orders and filter client-side to avoid Firestore index issues
    const snapshot = await getDocs(query(ordersRef, orderBy('createdAt', 'desc')))
    const allOrders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Order))
    
    // Filter orders by email or phone
    const customerOrders = allOrders.filter(order => {
      const emailMatch = customerEmail && order.customerEmail === customerEmail
      const phoneMatch = customerPhone && order.customerPhone === customerPhone
      return emailMatch || phoneMatch
    })
    
    console.log('Customer orders found:', customerOrders.length, 'for email:', customerEmail, 'phone:', customerPhone)
    return customerOrders
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
  
  // Subscribe to all orders and filter client-side to avoid Firestore index issues
  const unsubscribe = onSnapshot(
    query(ordersRef, orderBy('createdAt', 'desc')),
    (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order))
      
      // Filter orders by email or phone
      const customerOrders = allOrders.filter(order => {
        const emailMatch = customerEmail && order.customerEmail === customerEmail
        const phoneMatch = customerPhone && order.customerPhone === customerPhone
        return emailMatch || phoneMatch
      })
      
      console.log('Customer orders found:', customerOrders.length, 'for email:', customerEmail, 'phone:', customerPhone)
      callback(customerOrders)
    },
    (error) => {
      console.error('Error subscribing to customer orders:', error)
      callback([])
    }
  )
  
  return unsubscribe
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


