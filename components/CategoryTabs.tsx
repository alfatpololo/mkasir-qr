'use client'

import React from 'react'
import { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CategoryTabsProps {
  categories: string[]
  activeCategory: string | null
  onCategoryChange: (category: string | null) => void
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  activeCategory,
  onCategoryChange,
}) => {
  return (
    <div className="bg-white">
      <div className="flex gap-1.5 overflow-x-auto pb-3 pt-3 px-4 scrollbar-hide">
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all duration-200',
            activeCategory === null
              ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          )}
        >
          Semua
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={cn(
              'px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all duration-200',
              activeCategory === category
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            )}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  )
}


