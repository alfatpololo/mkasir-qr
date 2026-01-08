'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Product } from '@/lib/types'
import { subscribeToAllProducts } from '@/lib/firestore'
import { MenuCard } from '@/components/MenuCard'
import { CategoryTabs } from '@/components/CategoryTabs'

export const MenuList: React.FC = () => {
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
    const cats = Array.from(new Set(products.map((p) => p.category)))
    return cats.sort()
  }, [products])

  const filteredProducts = useMemo(() => {
    if (!activeCategory) return products
    return products.filter((p) => p.category === activeCategory)
  }, [products, activeCategory])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <div className="p-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Tidak ada produk tersedia</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <MenuCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

