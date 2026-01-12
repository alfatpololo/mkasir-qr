'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Don't show sidebar/topbar for menu, payment, login, and profile pages
  const isCustomerPage = pathname?.startsWith('/menu') || pathname?.startsWith('/payment') || pathname?.startsWith('/login') || pathname?.startsWith('/profile')
  
  if (isCustomerPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}

