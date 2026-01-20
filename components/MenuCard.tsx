'use client'

import React, { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { useCartStore } from '@/lib/cart-store'
import { Button } from './Button'

interface MenuCardProps {
  product: Product
}

export const MenuCard: React.FC<MenuCardProps> = ({ product }) => {
  const addItem = useCartStore((state) => state.addItem)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const items = useCartStore((state) => state.items)
  const isOutOfStock = product.stock === 0
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const imageUrl = product.image || product.imageUrl

  // Cek apakah produk sudah ada di keranjang
  const cartItem = items.find((item) => item.productId === product.id)
  const quantity = cartItem?.qty || 0
  const isInCart = quantity > 0

  const handleAddToCart = () => {
    if (isOutOfStock) return
    
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
    })
  }

  const handleIncrease = () => {
    if (isOutOfStock) return
    
    if (isInCart) {
      updateQuantity(product.id, quantity + 1)
    } else {
      addItem({
        productId: product.id,
        name: product.name,
        price: product.price,
      })
    }
  }

  const handleDecrease = () => {
    if (quantity > 1) {
      updateQuantity(product.id, quantity - 1)
    } else {
      removeItem(product.id)
    }
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoading(false)
  }

  const handleImageLoad = () => {
    setImageLoading(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-all duration-200 group">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {imageUrl && !imageError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}
            <img
              src={imageUrl}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1.5 rounded-full border border-gray-200">
              Habis
            </span>
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-medium text-gray-900 mb-1.5 text-sm line-clamp-2 min-h-[2.5rem] leading-snug">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-semibold text-gray-900">
            {formatCurrency(product.price)}
          </p>
          {product.stock > 0 && product.stock <= 5 && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
              Stok: {product.stock}
            </span>
          )}
        </div>
        
        {isInCart ? (
          <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-1 border border-gray-200">
            <button
              onClick={handleDecrease}
              disabled={isOutOfStock}
              className="flex-1 flex items-center justify-center p-2 bg-white rounded hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="w-4 h-4 text-gray-700" />
            </button>
            <div className="flex-1 text-center min-w-[2rem]">
              <span className="text-sm font-semibold text-gray-900">{quantity}</span>
            </div>
            <button
              onClick={handleIncrease}
              disabled={isOutOfStock || (product.stock > 0 && quantity >= product.stock)}
              className="flex-1 flex items-center justify-center p-2 bg-white rounded hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="w-full py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg hover:from-primary-700 hover:to-primary-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        )}
      </div>
    </div>
  )
}


