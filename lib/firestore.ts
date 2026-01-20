import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore'
import { db } from './firebase'
import { Table, Product, Order, Payment, Category } from './types'

// Tables
export const getTable = async (tableNumber: number): Promise<Table | null> => {
  const tablesRef = collection(db, 'tables')
  const q = query(tablesRef, where('number', '==', tableNumber))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return null
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Table
}

export const subscribeToTable = (
  tableNumber: number,
  callback: (table: Table | null) => void
) => {
  const tablesRef = collection(db, 'tables')
  const q = query(tablesRef, where('number', '==', tableNumber))
  
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null)
      return
    }
    const doc = snapshot.docs[0]
    callback({ id: doc.id, ...doc.data() } as Table)
  })
}

export const getAllTables = async (): Promise<Table[]> => {
  const snapshot = await getDocs(collection(db, 'tables'))
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Table))
}

export const subscribeToAllTables = (
  callback: (tables: Table[]) => void
) => {
  const tablesRef = collection(db, 'tables')
  const q = query(tablesRef, orderBy('number'))
  
  return onSnapshot(q, (snapshot) => {
    const tables = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Table[]
    callback(tables)
  })
}

export const createTable = async (number: number, qrUrl?: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'tables'), {
    number,
    active: true,
    qrUrl: qrUrl || '',
  })
  return docRef.id
}

export const updateTable = async (id: string, data: Partial<Table>): Promise<void> => {
  await updateDoc(doc(db, 'tables', id), data)
}

// Products
export const getAllProducts = async (): Promise<Product[]> => {
  const snapshot = await getDocs(collection(db, 'products'))
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product))
}

export const subscribeToAllProducts = (
  callback: (products: Product[]) => void
) => {
  const productsRef = collection(db, 'products')
  const q = query(productsRef, orderBy('category'))
  
  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[]
    callback(products)
  })
}

export const getProduct = async (id: string): Promise<Product | null> => {
  const docRef = doc(db, 'products', id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) return null
  
  return { id: docSnap.id, ...docSnap.data() } as Product
}

export const createProduct = async (product: Omit<Product, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'products'), product)
  return docRef.id
}

export const updateProduct = async (id: string, data: Partial<Product>): Promise<void> => {
  await updateDoc(doc(db, 'products', id), data)
}

// Orders
export const createOrder = async (order: Omit<Order, 'id' | 'createdAt'>): Promise<string> => {
  try {
    console.log('Firestore: Creating order in collection "orders"')
    console.log('Order data received:', JSON.stringify(order, null, 2))
    
    if (!db) {
      throw new Error('Firestore database not initialized')
    }

    // Clean items array - remove undefined values from each item
    const cleanItems = order.items.map((item) => {
      const cleanItem: any = {
        productId: item.productId,
        name: item.name,
        qty: item.qty,
      }
      // Only add note if it exists and is not empty
      if (item.note !== undefined && item.note !== null && item.note.trim() !== '') {
        cleanItem.note = item.note.trim()
      }
      return cleanItem
    })

    // Build clean order object - Firestore doesn't accept undefined
    const cleanOrder: any = {
      tableNumber: order.tableNumber,
      items: cleanItems,
      status: order.status,
      total: order.total,
      createdAt: Timestamp.now(),
    }
    
    // Add optional fields only if they exist
    if (order.customerName !== undefined && order.customerName !== null && order.customerName.trim() !== '') {
      cleanOrder.customerName = order.customerName.trim()
    }
    if (order.customerPhone !== undefined && order.customerPhone !== null && order.customerPhone.trim() !== '') {
      cleanOrder.customerPhone = order.customerPhone.trim()
    }
    if (order.customerEmail !== undefined && order.customerEmail !== null && order.customerEmail.trim() !== '') {
      cleanOrder.customerEmail = order.customerEmail.trim()
    }
    if (order.paymentMethod !== undefined && order.paymentMethod !== null) {
      cleanOrder.paymentMethod = order.paymentMethod
    }
    if (order.orderNote !== undefined && order.orderNote !== null && order.orderNote.trim() !== '') {
      cleanOrder.orderNote = order.orderNote.trim()
    }

    // Final validation
    if (!cleanOrder.tableNumber || !cleanOrder.items || cleanOrder.items.length === 0) {
      throw new Error('Invalid order data: tableNumber and items are required')
    }

    console.log('Firestore: Clean order data (no undefined):', JSON.stringify(cleanOrder, null, 2))

    const docRef = await addDoc(collection(db, 'orders'), cleanOrder)
    
    console.log('Firestore: Order created successfully with ID:', docRef.id)
    return docRef.id
  } catch (error: any) {
    console.error('Firestore: Error creating order:', error)
    console.error('Error code:', error.code)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    throw new Error(`Failed to create order: ${error.message || 'Unknown error'}`)
  }
}

export const getOrder = async (id: string): Promise<Order | null> => {
  const docRef = doc(db, 'orders', id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) return null
  
  return { id: docSnap.id, ...docSnap.data() } as Order
}

export const subscribeToOrder = (
  orderId: string,
  callback: (order: Order | null) => void
) => {
  const orderRef = doc(db, 'orders', orderId)
  
  return onSnapshot(orderRef, (docSnap) => {
    if (!docSnap.exists()) {
      callback(null)
      return
    }
    callback({ id: docSnap.id, ...docSnap.data() } as Order)
  })
}

export const subscribeToTableOrders = (
  tableNumber: number,
  callback: (orders: Order[]) => void
) => {
  const ordersRef = collection(db, 'orders')
  const q = query(
    ordersRef,
    where('tableNumber', '==', tableNumber),
    orderBy('createdAt', 'desc')
  )
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[]
    callback(orders)
  })
}

export const getAllOrders = async (): Promise<Order[]> => {
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[]
}

export const subscribeToAllOrders = (
  callback: (orders: Order[]) => void
) => {
  const ordersRef = collection(db, 'orders')
  const q = query(ordersRef, orderBy('createdAt', 'desc'))
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Order[]
    callback(orders)
  })
}

export const updateOrderStatus = async (
  orderId: string,
  status: Order['status']
): Promise<void> => {
  await updateDoc(doc(db, 'orders', orderId), { status })
}

// Payments
export const createPayment = async (
  payment: Omit<Payment, 'id' | 'createdAt'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'payments'), {
    ...payment,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export const getPayment = async (id: string): Promise<Payment | null> => {
  const docRef = doc(db, 'payments', id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) return null
  
  return { id: docSnap.id, ...docSnap.data() } as Payment
}

export const getPaymentByOrderId = async (orderId: string): Promise<Payment | null> => {
  const paymentsRef = collection(db, 'payments')
  const q = query(paymentsRef, where('orderId', '==', orderId))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return null
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Payment
}

export const subscribeToPayment = (
  paymentId: string,
  callback: (payment: Payment | null) => void
) => {
  const paymentRef = doc(db, 'payments', paymentId)
  
  return onSnapshot(paymentRef, (docSnap) => {
    if (!docSnap.exists()) {
      callback(null)
      return
    }
    callback({ id: docSnap.id, ...docSnap.data() } as Payment)
  })
}

export const updatePaymentStatus = async (
  paymentId: string,
  status: Payment['status']
): Promise<void> => {
  await updateDoc(doc(db, 'payments', paymentId), { status })
}

// Categories
export const getAllCategories = async (): Promise<Category[]> => {
  const snapshot = await getDocs(collection(db, 'categories'))
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Category))
}

export const subscribeToAllCategories = (
  callback: (categories: Category[]) => void
) => {
  const categoriesRef = collection(db, 'categories')
  const q = query(categoriesRef, orderBy('name'))
  
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Category[]
    callback(categories)
  })
}

export const getCategory = async (id: string): Promise<Category | null> => {
  const docRef = doc(db, 'categories', id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) return null
  
  return { id: docSnap.id, ...docSnap.data() } as Category
}

export const createCategory = async (name: string): Promise<string> => {
  const docRef = await addDoc(collection(db, 'categories'), {
    name,
    createdAt: Timestamp.now(),
  })
  return docRef.id
}

export const updateCategory = async (id: string, name: string): Promise<void> => {
  await updateDoc(doc(db, 'categories', id), { name })
}

export const deleteCategory = async (id: string): Promise<void> => {
  await updateDoc(doc(db, 'categories', id), { deleted: true })
}

// Dashboard Stats
export const getTodayOrders = async (): Promise<Order[]> => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = Timestamp.fromDate(today)
  
  const ordersRef = collection(db, 'orders')
  const q = query(
    ordersRef,
    where('createdAt', '>=', todayStart),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Order[]
}

export const getTodayRevenue = async (): Promise<number> => {
  const orders = await getTodayOrders()
  return orders
    .filter((order) => order.status === 'PAID')
    .reduce((sum, order) => sum + order.total, 0)
}

// Customers
export interface Customer {
  id: string
  uid: string
  email: string
  displayName: string
  phoneNumber?: string
  password?: string // Hashed password
  photoURL?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export const createOrUpdateCustomer = async (
  uid: string,
  email: string,
  displayName: string,
  phoneNumber?: string,
  photoURL?: string
): Promise<void> => {
  const customersRef = collection(db, 'customers')
  
  // Cari berdasarkan email juga (untuk integrasi Google + Manual)
  const qByEmail = query(customersRef, where('email', '==', email))
  const snapshotByEmail = await getDocs(qByEmail)
  
  // Cari berdasarkan UID juga
  const qByUid = query(customersRef, where('uid', '==', uid))
  const snapshotByUid = await getDocs(qByUid)
  
  const customerData: any = {
    uid,
    email,
    displayName,
    photoURL: photoURL || null,
    updatedAt: Timestamp.now(),
  }
  
  if (phoneNumber) {
    // Normalize phone number (remove spaces, dashes, parentheses)
    customerData.phoneNumber = phoneNumber.replace(/\s|-|\(|\)/g, '')
  }
  
  // Jika sudah ada berdasarkan email atau UID, update
  if (!snapshotByEmail.empty) {
    const docRef = snapshotByEmail.docs[0].ref
    await updateDoc(docRef, customerData)
  } else if (!snapshotByUid.empty) {
    const docRef = snapshotByUid.docs[0].ref
    await updateDoc(docRef, customerData)
  } else {
    // Create new customer
    await addDoc(customersRef, {
      ...customerData,
      createdAt: Timestamp.now(),
    })
  }
}

export const getAllCustomers = async (): Promise<Customer[]> => {
  const snapshot = await getDocs(collection(db, 'customers'))
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Customer[]
}

export const subscribeToAllCustomers = (
  callback: (customers: Customer[]) => void
) => {
  const customersRef = collection(db, 'customers')
  const q = query(customersRef, orderBy('createdAt', 'desc'))
  
  return onSnapshot(q, (snapshot) => {
    const customers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Customer[]
    callback(customers)
  })
}

export const getCustomerByEmail = async (email: string): Promise<Customer | null> => {
  const customersRef = collection(db, 'customers')
  const q = query(customersRef, where('email', '==', email))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return null
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Customer
}

export const getCustomerByPhone = async (phoneNumber: string): Promise<Customer | null> => {
  const customersRef = collection(db, 'customers')
  // Normalize phone number (remove spaces, dashes, etc)
  const normalizedPhone = phoneNumber.replace(/\s|-|\(|\)/g, '')
  const q = query(customersRef, where('phoneNumber', '==', normalizedPhone))
  const snapshot = await getDocs(q)
  
  if (snapshot.empty) return null
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as Customer
}

