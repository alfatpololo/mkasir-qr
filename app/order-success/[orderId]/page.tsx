'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { CheckCircle2, FileText, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/Button'
import Image from 'next/image'
import { getSession } from '@/lib/auth'
import { DEFAULT_MENU_TOKEN } from '@/lib/token-utils'

export default function OrderSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string
  const menuUrl = () => {
    const sessionUser = getSession()
    const cid = (sessionUser as any)?.customerId
    return cid ? `/menu/${DEFAULT_MENU_TOKEN}?customer_id=${cid}` : `/menu/${DEFAULT_MENU_TOKEN}`
  }

  const handleRincianPesanan = () => {
    // Redirect ke halaman profile (riwayat pesanan ada di profile)
    router.push('/profile')
  }

  const handleKembaliKeMenu = () => {
    // Redirect ke menu dengan default token
    router.push(menuUrl())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        {/* Header dengan logo */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <Image
              src="/images/logo.png"
              alt="MKASIR Logo"
              width={64}
              height={64}
              className="object-contain w-full h-full"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Judul */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Pesanan berhasil
        </h1>

        {/* Ikon Konfirmasi */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
              {/* Ikon struk dengan checkmark */}
              <div className="relative">
                <div className="w-20 h-20 bg-white rounded-lg shadow-md flex items-center justify-center">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pesan Konfirmasi */}
        <p className="text-gray-600 mb-8 text-sm">
          Pesanan Anda sudah masuk dan sedang diproses
        </p>

        {/* Tombol Aksi */}
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full py-4 text-base font-semibold shadow-lg"
            onClick={handleRincianPesanan}
          >
            <FileText className="w-5 h-5" />
            <span>Rincian pesanan</span>
          </Button>
          
          <Button
            variant="secondary"
            className="w-full py-4 text-base font-semibold border-2"
            onClick={handleKembaliKeMenu}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Kembali ke menu</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
