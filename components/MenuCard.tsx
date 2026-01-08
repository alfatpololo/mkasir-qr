'use client'

import React from 'react'
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

  const handleAddToCart = () => {
    if (isOutOfStock) return
    
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="relative aspect-square bg-gray-100">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="text-white font-semibold">Habis</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
        <p className="text-lg font-bold text-primary-600 mb-3">
          {formatCurrency(product.price)}
        </p>
        
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
        >
          <Plus className="w-4 h-4 mr-1" />
          Tambah
        </Button>
      </div>
    </div>
  )
}

