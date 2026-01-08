import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem } from './types'

interface CartStore {
  tableNumber: number | null
  items: CartItem[]
  setTableNumber: (tableNumber: number) => void
  addItem: (item: Omit<CartItem, 'qty'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  updateNote: (productId: string, note: string) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      tableNumber: null,
      items: [],
      
      setTableNumber: (tableNumber) => {
        const currentTable = get().tableNumber
        // If switching tables, clear cart
        if (currentTable !== null && currentTable !== tableNumber) {
          set({ items: [], tableNumber })
        } else {
          set({ tableNumber })
        }
      },
      
      addItem: (item) => {
        const items = get().items
        const existingItem = items.find((i) => i.productId === item.productId)
        
        if (existingItem) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, qty: i.qty + 1 }
                : i
            ),
          })
        } else {
          set({ items: [...items, { ...item, qty: 1 }] })
        }
      },
      
      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) })
      },
      
      updateQuantity: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId)
          return
        }
        
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, qty } : i
          ),
        })
      },
      
      updateNote: (productId, note) => {
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, note } : i
          ),
        })
      },
      
      clearCart: () => {
        set({ items: [] })
      },
      
      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.qty, 0)
      },
      
      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.qty, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)

