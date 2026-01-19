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
    <div className="sticky top-[96px] z-30 bg-white border-b border-gray-100 pb-3 pt-4 shadow-sm">
      <div className="flex gap-2 overflow-x-auto pb-2 px-4 scrollbar-hide">
        <button
          onClick={() => onCategoryChange(null)}
          className={cn(
            'px-5 py-2.5 rounded-xl whitespace-nowrap font-semibold text-sm transition-all duration-200 shadow-sm',
            activeCategory === null
              ? 'bg-primary-600 text-white shadow-md scale-105'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          )}
        >
          Semua
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={cn(
              'px-5 py-2.5 rounded-xl whitespace-nowrap font-semibold text-sm transition-all duration-200 shadow-sm',
              activeCategory === category
                ? 'bg-primary-600 text-white shadow-md scale-105'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            )}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  )
}


