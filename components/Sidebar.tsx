'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, FolderTree, Table, ShoppingCart, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

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
]

export const Sidebar: React.FC = () => {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Menu className="w-6 h-6" />
          <h1 className="text-xl font-bold">QR POS</h1>
        </div>
      </div>

      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <Icon className="w-5 h-5" />
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

