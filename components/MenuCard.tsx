'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import { Button } from './Button'

interface MenuCardProps {
  product: Product
}

export const MenuCard: React.FC<MenuCardProps> = ({ product }) => {
  const addItem = useCartStore((state) => state.addItem)
  const isOutOfStock = product.stock === 0
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const imageUrl = product.image || product.imageUrl

  const handleAddToCart = () => {
    if (isOutOfStock) return
    
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
    })
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group active:scale-[0.98]">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {imageUrl && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
            )}
            <img
              src={imageUrl}
              alt={product.name}
              className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-2 rounded-xl bg-white shadow-md flex items-center justify-center">
                <span className="text-4xl">🍽️</span>
              </div>
              <p className="text-xs text-gray-400 font-medium">No Image</p>
            </div>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold shadow-xl">
              Habis
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-gray-900 mb-2 text-base line-clamp-2 min-h-[2.5rem] leading-tight">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <p className="text-xl font-bold text-primary-600">
            {formatCurrency(product.price)}
          </p>
          {product.stock > 0 && product.stock <= 5 && (
            <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
              Stok: {product.stock}
            </span>
          )}
        </div>
        
        <Button
          variant="primary"
          size="md"
          className="w-full py-3 shadow-sm hover:shadow-md transition-shadow"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Tambah</span>
        </Button>
      </div>
    </div>
  )
}


