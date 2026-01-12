'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  iconColor?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  iconColor = 'bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 text-white',
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-gray-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2">{value}</p>
          {trend && (
            <p
              className={cn(
                'text-xs font-semibold mt-2 flex items-center gap-1.5',
                trend.isPositive ? 'text-green-600' : 'text-red-500'
              )}
            >
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[10px]',
                trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              )}>
                {trend.isPositive ? '↑' : '↓'}
              </span>
              <span>{Math.abs(trend.value)}% dari kemarin</span>
            </p>
          )}
        </div>
        <div className={cn(
          'p-5 rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative',
          iconColor
        )}>
          <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <Icon className="w-7 h-7 relative z-10" />
        </div>
      </div>
    </div>
  )
}


