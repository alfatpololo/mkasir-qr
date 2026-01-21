'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Clock, ChefHat, Package, CheckCircle2, UtensilsCrossed, CreditCard, Home } from 'lucide-react'
import { getCustomerRiwayat } from '@/lib/pos-api'
import { getSession, getStoredPassword } from '@/lib/auth'
import { DEFAULT_MENU_TOKEN } from '@/lib/token-utils'
import { Order } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/Button'
import Image from 'next/image'

const statusConfig: Record<Order['status'], { label: string; icon: React.ReactNode; color: string }> = {
  WAITING: {
    label: 'Menunggu konfirmasi resto',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-green-600',
  },
  PREPARING: {
    label: 'Sedang disiapkan',
    icon: <ChefHat className="w-4 h-4" />,
    color: 'text-blue-600',
  },
  READY: {
    label: 'Siap diantar',
    icon: <Package className="w-4 h-4" />,
    color: 'text-purple-600',
  },
  WAITING_PAYMENT: {
    label: 'Menunggu pembayaran',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-orange-600',
  },
  PAID: {
    label: 'Sudah dibayar',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-600',
  },
}

function MyOrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdParam = searchParams.get('orderId')
  const menuUrl = () => {
    const sessionUser = getSession()
    const cid = (sessionUser as any)?.customerId
    return cid ? `/menu/${DEFAULT_MENU_TOKEN}?customer_id=${cid}` : `/menu/${DEFAULT_MENU_TOKEN}`
  }
  
  const [riwayatData, setRiwayatData] = useState<any>(null)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sessionUser, setSessionUser] = useState<any>(null)

  useEffect(() => {
    // Load riwayat from API - HANYA API, TIDAK ADA FIRESTORE
    const loadRiwayatFromAPI = async () => {
      const currentSessionUser = getSession()
      const storedPassword = getStoredPassword()
      
      // Check session - password might be empty for phone-only login
      if (!currentSessionUser || !currentSessionUser.customerId) {
        console.warn('⚠️ No session found, redirecting to menu')
        router.push(menuUrl())
      setLoading(false)
      return
    }

      // Simpan session user ke state untuk digunakan di render
      setSessionUser(currentSessionUser)
      
      try {
        setLoading(true)
        // For phone-only login, use default password '000000'
        const kode = storedPassword || '000000'
        console.log(`📋 Starting fetch riwayat for customerId: ${currentSessionUser.customerId}, kode: ${kode ? '***' : 'EMPTY'}`)
        console.log(`📋 CustomerId type:`, typeof currentSessionUser.customerId)
        console.log(`📋 Kode type:`, typeof kode)
        console.log(`📋 Kode value (raw):`, JSON.stringify(kode))
        console.log(`📋 Kode length:`, kode?.length)
        
        // Verify password from localStorage directly
        const localStorageCheck = localStorage.getItem('phoneLoggedInUser')
        if (localStorageCheck) {
          try {
            const parsed = JSON.parse(localStorageCheck)
            console.log('🔍 Direct localStorage check:')
            console.log('🔍 - _password:', parsed._password)
            console.log('🔍 - customerId:', parsed.customerId)
            console.log('🔍 - Password match:', parsed._password === kode)
          } catch (e) {
            console.error('❌ Error parsing localStorage:', e)
          }
        }
        
        // Fetch all pages
        const pageSize = 50
        let page = 1
        let allData: any[] = []
        let totalData = 0
        let totalPages = 1
        let lastResponse: any = null // Simpan response terakhir untuk metadata
        
        while (true) {
          console.log(`📋 Fetching riwayat page ${page}...`)
          const riwayat = await getCustomerRiwayat(
            currentSessionUser.customerId!,
            kode,
            page,
            pageSize
          )
          
          lastResponse = riwayat // Simpan response terakhir
          
          console.log(`📋 ===== DEBUGGING PAGE ${page} =====`)
          console.log(`📋 Riwayat response type:`, typeof riwayat)
          console.log(`📋 Riwayat is null?:`, riwayat === null)
          console.log(`📋 Riwayat is undefined?:`, riwayat === undefined)
          console.log(`📋 Riwayat full response:`, JSON.stringify(riwayat, null, 2))
          
          // API response structure: 
          // { status: "Success", data: [...], currentData: 4, currentPage: 1, totalData: 5, totalPages: 1 }
          // getCustomerRiwayat sudah return CustomerRiwayatResponse dengan structure { status, data: [], ... }
          let dataArr: any[] = []
          
          // Defensive handling: Pastikan riwayat tidak null/undefined
          if (!riwayat) {
            console.error(`❌ Riwayat response is null/undefined`)
            dataArr = []
          } else {
            // Log semua keys dari response untuk debugging
            console.log(`📋 Riwayat keys:`, Object.keys(riwayat))
            console.log(`📋 Riwayat.status:`, riwayat.status)
            console.log(`📋 Riwayat.data exists?:`, 'data' in riwayat)
            console.log(`📋 Riwayat.data type:`, typeof riwayat.data)
            console.log(`📋 Riwayat.data isArray?:`, Array.isArray(riwayat.data))
            console.log(`📋 Riwayat.data value:`, riwayat.data)
            console.log(`📋 Riwayat.data length:`, riwayat.data?.length)
            
            if (riwayat?.data && Array.isArray(riwayat.data)) {
              // Response structure: { status: "Success", data: [...], ... }
              // data adalah array yang berisi object-object transaksi
              // getCustomerRiwayat sudah return CustomerRiwayatResponse dengan data sebagai array
              dataArr = riwayat.data
              console.log(`✅✅✅ SUCCESS: Response has data property (array), length: ${dataArr.length}`)
              console.log(`📊 Response metadata: currentData=${riwayat.currentData}, totalData=${riwayat.totalData}, totalPages=${riwayat.totalPages}`)
              
              // Verify array content
              if (dataArr.length > 0) {
                console.log(`✅✅✅ Array is NOT empty! First item:`, {
                  id: dataArr[0]?.id,
                  nomor_transaksi: dataArr[0]?.nomor_transaksi,
                  jumlah_total: dataArr[0]?.jumlah_total,
                })
              }
              
              // Debug: Log sample data
              if (dataArr.length > 0) {
                console.log(`📊 Sample data item (first):`, JSON.stringify(dataArr[0], null, 2))
                console.log(`📊 First item type:`, typeof dataArr[0])
                console.log(`📊 First item is object?:`, typeof dataArr[0] === 'object' && dataArr[0] !== null)
                if (typeof dataArr[0] === 'object' && dataArr[0] !== null) {
                  console.log(`📊 First item keys:`, Object.keys(dataArr[0]))
                }
              } else {
                console.warn(`⚠️ WARNING: dataArr exists but is EMPTY array!`)
                console.warn(`⚠️ This means API returned empty data array`)
              }
            } else if (riwayat?.data && typeof riwayat.data === 'object' && !Array.isArray(riwayat.data)) {
              // Handle jika data adalah object yang berisi array di dalamnya
              // Cek berbagai kemungkinan property yang mungkin berisi array
              console.log(`📋 data is object, checking for nested array...`)
              const dataObj = riwayat.data as { [key: string]: any }
              console.log(`📋 data keys:`, Object.keys(dataObj))
              
              // Cek berbagai kemungkinan struktur
              if (dataObj.items && Array.isArray(dataObj.items)) {
                dataArr = dataObj.items
                console.log(`✅ Found array in data.items, length: ${dataArr.length}`)
              } else if (dataObj.list && Array.isArray(dataObj.list)) {
                dataArr = dataObj.list
                console.log(`✅ Found array in data.list, length: ${dataArr.length}`)
              } else if (dataObj.transactions && Array.isArray(dataObj.transactions)) {
                dataArr = dataObj.transactions
                console.log(`✅ Found array in data.transactions, length: ${dataArr.length}`)
              } else {
                // Coba convert object values ke array jika semua values adalah objects
                const values = Object.values(dataObj)
                if (values.length > 0 && Array.isArray(values[0])) {
                  dataArr = values[0] as any[]
                  console.log(`✅ Found array in first property of data object, length: ${dataArr.length}`)
                } else {
                  console.error(`❌ Could not find array in data object`)
                  console.error(`❌ data object structure:`, dataObj)
                  dataArr = []
                }
              }
            } else {
              // Fallback: cek apakah riwayat memiliki property items (untuk backward compatibility)
              const riwayatAny = riwayat as any
              if (riwayatAny?.items && Array.isArray(riwayatAny.items)) {
                dataArr = riwayatAny.items
                console.log(`✅ Response has items property, length: ${dataArr.length}`)
              } else {
                console.error(`❌ ERROR: Unexpected response structure!`)
                console.error(`❌ Response:`, riwayat)
                console.error(`❌ Response keys:`, Object.keys(riwayat))
                console.error(`❌ Response.data type:`, typeof riwayat?.data)
                console.error(`❌ Response.data isArray:`, Array.isArray(riwayat?.data))
                console.error(`❌ Response.data value:`, riwayat?.data)
                dataArr = []
              }
            }
          }
          
          console.log(`📋 Final dataArr length: ${dataArr.length}`)
          console.log(`📋 Final dataArr type:`, typeof dataArr)
          console.log(`📋 Final dataArr isArray:`, Array.isArray(dataArr))
          
          // Validasi: Pastikan dataArr adalah array sebelum digunakan
          if (!Array.isArray(dataArr)) {
            console.error(`❌ CRITICAL ERROR: dataArr is not an array! Type:`, typeof dataArr, `Value:`, dataArr)
            dataArr = []
          }
          
          if (dataArr.length === 0) {
            console.log(`📋 No more data at page ${page}, stopping...`)
            break
          }
          
          // Defensive: Pastikan dataArr adalah array sebelum spread
          if (Array.isArray(dataArr) && dataArr.length > 0) {
            allData = [...allData, ...dataArr]
            console.log(`✅ Added ${dataArr.length} items to allData. Total: ${allData.length}`)
        } else {
            console.warn(`⚠️ Skipping invalid dataArr at page ${page}. Type:`, typeof dataArr, `IsArray:`, Array.isArray(dataArr))
          }
          
          console.log(`📋 Page ${page}: received ${dataArr.length} items, total so far: ${allData.length}`)
          
          // Gunakan metadata dari API untuk menentukan apakah sudah di halaman terakhir
          const riwayatAny = riwayat as any
          const totalPagesFromAPI = riwayat?.totalPages || riwayatAny?.total_pages
          
          if (totalPagesFromAPI && page >= totalPagesFromAPI) {
            console.log(`📋 Last page reached (page ${page} >= totalPages ${totalPagesFromAPI}), stopping...`)
            break
          }
          
          // Fallback: Break jika data yang diterima kurang dari pageSize (berarti sudah di halaman terakhir)
          if (dataArr.length < pageSize) {
            console.log(`📋 Last page reached (received ${dataArr.length} < ${pageSize}), stopping...`)
            break
          }
          
          page += 1
        }
        
        console.log('📋 Final riwayat data:', JSON.stringify(allData, null, 2))
        console.log('📋 Sample orders (first 3):', allData.slice(0, 3))
        console.log('📋 Current customerId from session:', currentSessionUser.customerId)
        
        // API sudah filter berdasarkan customer_id di query, jadi semua data yang diterima sudah milik user yang login
        // Tapi kita tetap log untuk debugging
        console.log(`📋 All orders received: ${allData.length} orders for customerId: ${currentSessionUser.customerId}`)
        console.log(`📋 Sample order IDs:`, allData.slice(0, 5).map((o: any) => ({ id: o.id, nomor_transaksi: o.nomor_transaksi })))
        
        const filteredData = allData // API sudah filter, jadi langsung pakai
        
        // Gunakan metadata dari API response terakhir jika ada
        const totalDataFromAPI = lastResponse?.totalData || lastResponse?.total_data || filteredData.length
        const totalPagesFromAPI = lastResponse?.totalPages || lastResponse?.total_pages || 1
        
        const mergedRiwayat = {
          data: filteredData,
          totalData: totalDataFromAPI, // Gunakan totalData dari API
          totalPages: totalPagesFromAPI, // Gunakan totalPages dari API
          currentPage: 1,
        }
        
        console.log(`📊 Merged riwayat metadata: totalData=${totalDataFromAPI}, totalPages=${totalPagesFromAPI}, actualDataLength=${filteredData.length}`)
        
        setRiwayatData(mergedRiwayat)
        console.log('✅ Riwayat loaded from API:', mergedRiwayat)
        
        // Jika ada orderId di URL, cari dari data yang sudah di-fetch
        if (orderIdParam) {
          console.log(`🔍 Searching for orderId: ${orderIdParam} in ${filteredData.length} orders`)
          console.log(`🔍 Available order IDs:`, filteredData.map((o: any) => ({ 
            id: o.id, 
            nomor_transaksi: o.nomor_transaksi,
            idType: typeof o.id,
            nomorType: typeof o.nomor_transaksi
          })))
          
          const foundOrder = filteredData.find((o: any) => {
            // API structure: { id, nomor_transaksi, ... }
            // Coba match dengan id (number) atau nomor_transaksi (string)
            const oId = o.id || o.nomor_transaksi
            const paramId = orderIdParam
            
            // Match exact atau sebagai string
            const match = oId && (String(oId) === String(paramId) || oId === Number(paramId))
            if (match) {
              console.log(`✅ Match found: orderId=${oId}, paramId=${paramId}, type: ${typeof oId}`)
            }
            return match
          })
          
          if (foundOrder) {
            console.log('✅ Found order from API:', foundOrder)
            // Convert API order format ke format yang bisa ditampilkan
            // API structure: { id, nomor_transaksi, nomor_meja, waktu_pesan, waktu_bayar, jumlah_total, status, transaction_details, dll }
            const apiOrder = {
              id: String(foundOrder.id || foundOrder.nomor_transaksi || orderIdParam),
              tableNumber: parseInt(foundOrder.nomor_meja) || 0,
              total: foundOrder.jumlah_total || 0,
              status: foundOrder.status === 'selesai' ? 'PAID' : (foundOrder.status || 'PAID'),
              createdAt: foundOrder.waktu_pesan || foundOrder.waktu_bayar || new Date(),
              items: (foundOrder.transaction_details || []).map((item: any) => ({
                productId: item.product_id || '',
                name: item.product?.nama || item.product_name || '',
                qty: item.kuantitas || item.quantity || 0,
                note: item.catatan || item.note || '',
                price: item.harga || item.price || 0,
              })),
              customerName: foundOrder.customer_nama || '',
              customerPhone: foundOrder.customer_no_hp || '',
              customerEmail: foundOrder.customer_email || '',
            }
            setSelectedOrder(apiOrder)
          } else {
            console.warn('⚠️ Order not found in API data:', orderIdParam)
            console.warn('⚠️ Available order IDs:', filteredData.map((o: any) => o.id || o.nomor_transaksi))
          }
        }
        
        setLoading(false)
      } catch (error) {
        console.error('❌ Failed to load riwayat from API:', error)
        setLoading(false)
      }
    }

    // Load riwayat dari API
    loadRiwayatFromAPI()
  }, [orderIdParam, router])
  
  // Handle orderId dari URL setelah riwayatData sudah di-load
  useEffect(() => {
    if (orderIdParam && riwayatData && riwayatData.data && !selectedOrder) {
      const foundOrder = riwayatData.data.find((o: any) => {
        // API structure: { id, nomor_transaksi, ... }
        const oId = o.id || o.nomor_transaksi
        return oId && String(oId) === String(orderIdParam)
      })
      
      if (foundOrder) {
        console.log('✅ Found order from API (useEffect):', foundOrder)
        // Convert API order format ke format yang bisa ditampilkan
        // API structure: { id, nomor_transaksi, nomor_meja, waktu_pesan, waktu_bayar, jumlah_total, status, transaction_details, dll }
        const apiOrder = {
          id: String(foundOrder.id || foundOrder.nomor_transaksi || orderIdParam),
          tableNumber: parseInt(foundOrder.nomor_meja) || 0,
          total: foundOrder.jumlah_total || 0,
          status: foundOrder.status === 'selesai' ? 'PAID' : (foundOrder.status || 'PAID'),
          createdAt: foundOrder.waktu_pesan || foundOrder.waktu_bayar || new Date(),
          items: (foundOrder.transaction_details || []).map((item: any) => ({
            productId: item.product_id || '',
            name: item.product?.nama || item.product_name || '',
            qty: item.kuantitas || item.quantity || 0,
            note: item.catatan || item.note || '',
            price: item.harga || item.price || 0,
          })),
          customerName: foundOrder.customer_nama || '',
          customerPhone: foundOrder.customer_no_hp || '',
          customerEmail: foundOrder.customer_email || '',
        }
        setSelectedOrder(apiOrder)
      }
    }
  }, [orderIdParam, riwayatData, selectedOrder])


  const formatDate = (date: any) => {
    if (!date) return '-'
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return '-'
    }
  }

  const formatDateTime = (date: any) => {
    if (!date) return '-'
    try {
      const d = date.toDate ? date.toDate() : new Date(date)
      return d.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '-'
    }
  }

  // Tampilkan detail order jika dipilih
  if (selectedOrder) {
    // Map API status to Order status format
    const apiStatus = selectedOrder.status || 'PAID'
    const orderStatus: Order['status'] = apiStatus === 'selesai' ? 'PAID' : (apiStatus as Order['status']) || 'PAID'
    const status = statusConfig[orderStatus] || statusConfig.PAID // Fallback to PAID if status not found

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <button
              onClick={() => setSelectedOrder(null)}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-base font-semibold text-gray-900">Orderan Kamu</h1>
            <div className="w-8 h-8 relative">
              <Image
                src="/images/logo.png"
                alt="MKASIR Logo"
                width={32}
                height={32}
                className="object-contain w-full h-full"
                priority
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto px-4 py-4 space-y-4">
          {/* Order ID */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Order ID</span>
              <span className="text-xs font-mono text-gray-900">{selectedOrder.id.toUpperCase()}</span>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500">OL-DINE-IN</p>
                <p className="text-sm font-semibold text-gray-900">{formatDate(selectedOrder.createdAt)}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <div className={`${status.color}`}>
                {status.icon}
              </div>
              <span className={`text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>

            {/* Table Number */}
            {selectedOrder.tableNumber > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-xs">👤</span>
                </div>
                <span className="text-sm text-gray-700">Meja MEJA {selectedOrder.tableNumber}</span>
              </div>
            )}

            {/* Total */}
            <div className="pt-3 border-t border-gray-100">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedOrder.total)}</p>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Rincian pesanan</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-900">Total</span>
                <span className="text-sm font-bold text-gray-900">Rp {selectedOrder.total.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* Detail Items */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Detail item</h3>
            <div className="space-y-3">
              {selectedOrder.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.qty}x - {item.name}
                    </p>
                    {item.note && (
                      <p className="text-xs text-gray-500 mt-1">Catatan: {item.note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency((selectedOrder.total / selectedOrder.items.reduce((sum: number, i: any) => sum + i.qty, 0)) * item.qty)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tombol Kembali ke Menu */}
          <div className="pb-4">
            <Button
              variant="primary"
              className="w-full py-4 text-base font-semibold"
              onClick={() => {
                router.push(menuUrl())
              }}
            >
              <Home className="w-5 h-5" />
              <span>Kembali ke menu</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Tampilkan daftar orders
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-base font-semibold text-gray-900">Riwayat Pesanan</h1>
          <div className="w-8 h-8 relative">
            <Image
              src="/images/logo.png"
              alt="MKASIR Logo"
              width={32}
              height={32}
              className="object-contain w-full h-full"
              priority
              unoptimized
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : riwayatData && riwayatData.data && Array.isArray(riwayatData.data) && riwayatData.data.length > 0 ? (
          // Tampilkan data dari API riwayat
          <div className="space-y-3">
            {riwayatData.data.map((order: any, index: number) => {
              // API structure: { id, nomor_transaksi, nomor_meja, waktu_pesan, waktu_bayar, jumlah_total, status, transaction_details, dll }
              // Gunakan id (number) sebagai primary, fallback ke nomor_transaksi (string)
              const orderId = order.id ? String(order.id) : (order.nomor_transaksi || `#${index + 1}`)
              const total = order.jumlah_total || 0
              const tanggal = order.waktu_pesan || order.waktu_bayar || '-'
              const userId = order.user_id || order.customer_id || sessionUser?.customerId || '-'
              
              // Format tanggal
              let formattedDate = tanggal
              if (tanggal && typeof tanggal === 'string' && tanggal !== '-') {
                try {
                  const dateObj = new Date(tanggal)
                  if (!isNaN(dateObj.getTime())) {
                    formattedDate = dateObj.toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  }
                } catch (e) {
                  // Keep original if parsing fails
                }
              }
              
              return (
                <button
                  key={orderId}
                  onClick={() => router.push(`/my-orders?orderId=${orderId}`)}
                  className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        Order #{orderId}
                      </p>
                      <p className="text-xs text-gray-500 mb-1">
                        {formattedDate}
                      </p>
                      {order.nomor_meja && (
                        <p className="text-xs text-gray-500">
                          Meja {order.nomor_meja}
                        </p>
                      )}
                      {order.meja && !order.nomor_meja && (
                        <p className="text-xs text-gray-500">
                          Meja {order.meja}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(total)}
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      {order.status === 'selesai' ? 'Selesai' : (order.status || 'Pesanan')} • User ID: {userId}
                    </p>
                  </div>
                </button>
              )
            })}
            {riwayatData.totalPages > 1 && (
              <div className="text-center text-xs text-gray-500 pt-4">
                Total {riwayatData.totalData} pesanan
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">Belum ada pesanan</p>
            <p className="text-sm text-gray-500">Pesanan Anda akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      }
    >
      <MyOrdersContent />
    </Suspense>
  )
}
