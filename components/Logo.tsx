'use client'

import React, { useState } from 'react'
import Image from 'next/image'

interface LogoProps {
  className?: string
  showTagline?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  logoPath?: string
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  showTagline = true,
  size = 'md',
  variant = 'light',
  logoPath = '/images/logo.png' // Default: taruh logo di /public/images/logo.png
}) => {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
  }

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  const imageSizes = {
    sm: 64,
    md: 128,
    lg: 192,
  }

  const isDark = variant === 'dark'
  const textColor = isDark ? 'text-white' : 'text-gray-900'
  const taglineColor = isDark ? 'text-white/70' : 'text-primary-500'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Image */}
      <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
        <Image
          src={logoPath}
          alt="MKASIR Logo"
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="object-contain w-full h-full"
          priority
          onError={() => setImageError(true)}
          unoptimized
        />
      </div>

      {/* Logo Text - Tampilkan jika showTagline true */}
      {showTagline && !imageError && (
        <div className="flex flex-col">
          <div className={`font-bold ${textSizes[size]} leading-tight ${textColor}`}>
            <span className="text-[#f59e0b]">M</span>
            <span className={isDark ? 'text-white' : 'text-primary-600'}>KASIR</span>
          </div>
          <span className={`text-xs font-medium leading-tight ${taglineColor}`}>
            manajemenkasir
          </span>
        </div>
      )}
    </div>
  )
}

