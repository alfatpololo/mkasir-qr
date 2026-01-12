'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, FolderTree, Table, ShoppingCart, Menu, Users, FileText, BarChart3, Download, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'

const menuItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Produk',
    href: '/products',
    icon: Package,
  },
  {
    name: 'Kategori',
    href: '/categories',
    icon: FolderTree,
  },
  {
    name: 'Meja',
    href: '/tables',
    icon: Table,
  },
  {
    name: 'Pesanan',
    href: '/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    name: 'Laporan',
    href: '/reports',
    icon: BarChart3,
  },
]

export const Sidebar: React.FC = () => {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white min-h-screen fixed left-0 top-0 z-40 shadow-lg border-r border-gray-200">
      <div className="p-5 border-b border-gray-200 flex justify-center">
        <Logo 
          showTagline={false}
          size="md"
          variant="light"
          logoPath="/images/logo.png"
        />
      </div>

      <nav className="p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                  )}
                >
                  <Icon className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-white' : 'text-gray-500 group-hover:text-primary-600'
                  )} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}

