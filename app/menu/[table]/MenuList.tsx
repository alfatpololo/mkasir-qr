'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Product } from '@/lib/types'
import { subscribeToAllProducts } from '@/lib/firestore'
import { MenuCard } from '@/components/MenuCard'
import { CategoryTabs } from '@/components/CategoryTabs'

interface MenuListProps {
  searchQuery?: string
  filterCategory?: string | null
  onCategoriesReady?: (categories: string[]) => void
  showHeader?: boolean
}

export const MenuList: React.FC<MenuListProps> = ({ 
  searchQuery = '', 
  filterCategory,
  onCategoriesReady,
  showHeader = true
}) => {
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeToAllProducts((productsData) => {
      setProducts(productsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
    return cats.sort()
  }, [products])

  // Notify parent when categories are ready
  useEffect(() => {
    if (onCategoriesReady && categories.length > 0) {
      onCategoriesReady(categories)
    }
  }, [categories, onCategoriesReady])

  const filteredProducts = useMemo(() => {
    let filtered = products
    
    // Filter by filterCategory (from filter modal)
    if (filterCategory) {
      filtered = filtered.filter((p) => p.category === filterCategory)
      // Also update activeCategory to match filter
      if (activeCategory !== filterCategory) {
        setActiveCategory(filterCategory)
      }
    }
    
    // Filter by activeCategory (from category tabs)
    if (activeCategory && !filterCategory) {
      filtered = filtered.filter((p) => p.category === activeCategory)
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((p) => 
        p.name.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [products, activeCategory, searchQuery, filterCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div 
        className={`transition-all duration-300 ease-in-out ${
          showHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none h-0 overflow-hidden'
        }`}
      >
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      <div className="px-4 pb-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-lg">
              <span className="text-5xl">🍽️</span>
            </div>
            <p className="text-gray-700 font-semibold text-lg mb-1">Tidak ada produk tersedia</p>
            <p className="text-sm text-gray-400">Coba pilih kategori lain</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <MenuCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


