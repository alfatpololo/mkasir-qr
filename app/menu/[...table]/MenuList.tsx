'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { Product } from '@/lib/types'
import { MenuCard } from '@/components/MenuCard'
import { CategoryTabs } from '@/components/CategoryTabs'

// Base URL API backend
const API_BASE_URL = 'https://mkasir-fnb-dev.tip2.co/api/v1'

interface MenuListProps {
  token: string
  searchQuery?: string
  filterCategory?: string | null
  onCategoriesReady?: (categories: string[]) => void
}

export const MenuList: React.FC<MenuListProps> = ({ 
  token,
  searchQuery = '', 
  filterCategory,
  onCategoriesReady
}) => {
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalData, setTotalData] = useState<number>(0)

  // Ambil produk dari backend berdasarkan token (bukan dari Firebase)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(
          `${API_BASE_URL}/meja/products-by-token?token=${encodeURIComponent(token)}&page=${page}`
        )

        if (!res.ok) {
          throw new Error('Response server tidak valid')
        }

        const json = await res.json()
        const tipeJual = json?.tipe_jual as 'online' | 'kios' | undefined
        const rawProducts = Array.isArray(json?.data) ? json.data : []

        // Info pagination dari backend
        if (typeof json?.currentPage === 'number') {
          setPage(json.currentPage)
        }
        if (typeof json?.totalPages === 'number') {
          setTotalPages(json.totalPages)
        }
        if (typeof json?.totalData === 'number') {
          setTotalData(json.totalData)
        }

        const mapped: Product[] = rawProducts.map((p: any) => {
          const useOnlinePrice =
            tipeJual === 'online' && typeof p.harga_online === 'number' && p.harga_online > 0
          const price = useOnlinePrice
            ? p.harga_online
            : typeof p.harga_jual === 'number'
            ? p.harga_jual
            : 0

          const rawImageUrl = p.foto_url || p.foto || ''
          // Tambahkan prefix base URL jika foto_url tidak kosong dan belum merupakan URL lengkap
          const imageUrl = rawImageUrl 
            ? (rawImageUrl.startsWith('http://') || rawImageUrl.startsWith('https://'))
              ? rawImageUrl
              : `https://s3asia01.tip2.co/mkasir-fnb/${rawImageUrl}`
            : ''

          return {
            id: String(p.id),
            name: p.nama || '',
            price,
            category: p.product_category?.nama || 'Lainnya',
            categoryId: p.product_category_id ? String(p.product_category_id) : undefined,
            image: imageUrl,
            imageUrl: imageUrl || undefined,
            stock: typeof p.kuantitas === 'number' ? p.kuantitas : 0,
            isAvailable: p.status === 1 && p.tampil_menu === true,
          }
        })

        // Hanya tampilkan produk yang masih tersedia (opsional)
        const availableProducts = mapped.filter(
          (p) => (p.isAvailable !== false) && p.price > 0
        )

        setProducts(availableProducts)
      } catch (err) {
        console.error('Gagal memuat produk by token:', err)
        setError('Gagal memuat menu. Silakan coba lagi.')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchProducts()
    }
  }, [token, page])

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
    return cats.sort()
  }, [products])

  // Beri tahu parent ketika kategori siap
  useEffect(() => {
    if (onCategoriesReady && categories.length > 0) {
      onCategoriesReady(categories)
    }
  }, [categories, onCategoriesReady])

  const filteredProducts = useMemo(() => {
    let filtered = products
    
    // Filter by filterCategory (dari modal filter)
    if (filterCategory) {
      filtered = filtered.filter((p) => p.category === filterCategory)
      // Sinkronkan activeCategory dengan filter
      if (activeCategory !== filterCategory) {
        setActiveCategory(filterCategory)
      }
    }
    
    // Filter by activeCategory (dari tabs kategori)
    if (activeCategory && !filterCategory) {
      filtered = filtered.filter((p) => p.category === activeCategory)
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((p) => 
        p.name.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [products, activeCategory, searchQuery, filterCategory])

  const isFilteredView = useMemo(
    () =>
      Boolean(
        searchQuery.trim() ||
          filterCategory ||
          (activeCategory !== null && activeCategory !== undefined)
      ),
    [searchQuery, filterCategory, activeCategory]
  )

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-red-600 text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <CategoryTabs
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <div className="px-4 pb-28">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-5 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center shadow-lg">
              <span className="text-5xl">🍽️</span>
            </div>
            <p className="text-gray-700 font-semibold text-lg mb-1">Tidak ada produk tersedia</p>
            <p className="text-sm text-gray-400">
              {isFilteredView ? 'Coba ubah filter atau pencarian' : 'Coba pilih kategori lain'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => (
                <MenuCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-xs text-gray-500 text-center">
                {isFilteredView ? (
                  <>
                    Menampilkan {filteredProducts.length} menu hasil filter
                    {totalData > 0 && <> • Total produk: {totalData}</>}
                  </>
                ) : (
                  <>
                    Menampilkan {filteredProducts.length} dari {totalData} produk
                    {totalPages > 1 && <> • Halaman {page} dari {totalPages}</>}
                  </>
                )}
              </p>
              {totalPages > 1 && (
                <div className="flex w-full max-w-xs items-center justify-between gap-3">
                  <button
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    className={`flex-1 px-4 py-2.5 text-sm rounded-xl border font-medium ${
                      page <= 1 || loading
                        ? 'border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] transition'
                    }`}
                  >
                    Sebelumnya
                  </button>
                  <span className="text-xs text-gray-500 min-w-[60px] text-center">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    className={`flex-1 px-4 py-2.5 text-sm rounded-xl font-semibold ${
                      page >= totalPages || loading
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:scale-[0.98] transition'
                    }`}
                  >
                    Berikutnya
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}


