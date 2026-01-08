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
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
      <button
        onClick={() => onCategoryChange(null)}
        className={cn(
          'px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors',
          activeCategory === null
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
      >
        Semua
      </button>
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={cn(
            'px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors',
            activeCategory === category
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          {category}
        </button>
      ))}
    </div>
  )
}

