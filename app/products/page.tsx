'use client'

import React, { useEffect, useState, useRef } from 'react'
import { Plus, Edit2, Trash2, Package, Download, Upload, FileText } from 'lucide-react'
import { Button } from '@/components/Button'
import { ProductForm } from '@/components/ProductForm'
import {
  subscribeToAllProducts,
  createProduct,
  updateProduct,
} from '@/lib/firestore'
import { Product } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { getAllCategories } from '@/lib/firestore'
import { exportProductsToExcel, exportProductsToPDF } from '@/lib/export-utils'
import { importProductsFromExcel, downloadProductTemplate } from '@/lib/import-utils'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    const unsubscribe = subscribeToAllProducts((productsData) => {
      setProducts(productsData)
    })

    return () => unsubscribe()
  }, [])

  const handleCreate = async (data: {
    name: string
    price: number
    categoryId: string
    imageUrl: string
    isAvailable: boolean
  }) => {
    const categories = await getAllCategories()
    const category = categories.find((c) => c.id === data.categoryId)
    
    await createProduct({
      name: data.name,
      price: data.price,
      category: category?.name || '',
      categoryId: data.categoryId,
      image: data.imageUrl,
      imageUrl: data.imageUrl,
      stock: data.isAvailable ? 100 : 0,
      isAvailable: data.isAvailable,
    })
  }

  const handleEdit = async (data: {
    name: string
    price: number
    categoryId: string
    imageUrl: string
    isAvailable: boolean
  }) => {
    if (!editingProduct) return
    
    const categories = await getAllCategories()
    const category = categories.find((c) => c.id === data.categoryId)
    
    await updateProduct(editingProduct.id, {
      name: data.name,
      price: data.price,
      category: category?.name || editingProduct.category,
      categoryId: data.categoryId,
      image: data.imageUrl,
      imageUrl: data.imageUrl,
      stock: data.isAvailable ? (editingProduct.stock || 100) : 0,
      isAvailable: data.isAvailable,
    })
    setEditingProduct(null)
  }

  const handleToggleAvailability = async (product: Product) => {
    await updateProduct(product.id, {
      isAvailable: !product.isAvailable,
      stock: product.isAvailable ? 0 : 100,
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produk ini?')) return
    try {
      await updateProduct(id, { isAvailable: false, stock: 0 })
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Gagal menghapus produk')
    }
  }

  const handleExportExcel = () => {
    exportProductsToExcel(products, 'produk')
  }

  const handleDownloadTemplate = () => {
    downloadProductTemplate()
  }

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const categories = await getAllCategories()
      const result = await importProductsFromExcel(file, categories)
      
      if (result.success > 0) {
        alert(`Berhasil mengimport ${result.success} produk`)
      }
      
      if (result.errors.length > 0) {
        alert(`Error:\n${result.errors.slice(0, 5).join('\n')}${result.errors.length > 5 ? `\n...dan ${result.errors.length - 5} error lainnya` : ''}`)
      }
    } catch (error: any) {
      alert(`Gagal mengimport: ${error.message}`)
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <span className="w-1 h-10 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
            Produk
          </h1>
          <p className="text-gray-500 text-lg ml-4">Kelola menu produk Anda</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleExportExcel}
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => exportProductsToPDF(products, 'Laporan Produk')}
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </Button>
          <Button
            variant="secondary"
            onClick={handleDownloadTemplate}
          >
            <Download className="w-4 h-4" />
            <span>Template</span>
          </Button>
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportExcel}
              className="hidden"
              id="import-file"
              disabled={importing}
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="w-4 h-4" />
              <span>{importing ? 'Importing...' : 'Import Excel'}</span>
            </Button>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingProduct(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
        {products.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">Belum ada produk</p>
            <p className="text-sm text-gray-500 mb-6">Mulai dengan menambahkan produk pertama Anda</p>
            <Button
              variant="primary"
              onClick={() => {
                setEditingProduct(null)
                setIsFormOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk Pertama
            </Button>
          </div>
        ) : (
          <>
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white via-gray-50/50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
                    Daftar Produk
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 ml-3">Total {products.length} produk</p>
                </div>
                <div className="px-4 py-2 bg-primary-50 rounded-xl border border-primary-100">
                  <span className="text-sm font-semibold text-primary-700">{products.length} Produk</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Produk
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Harga
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {products.map((product) => (
                    <tr key={product.id} className="group hover:bg-gradient-to-r hover:from-primary-50/30 hover:via-primary-50/20 hover:to-transparent transition-all duration-200 border-b border-gray-50/50">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
                            {product.image || product.imageUrl ? (
                              <img
                                src={product.image || product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs bg-gradient-to-br from-gray-50 to-gray-100">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-base font-semibold text-gray-900 block">
                              {product.name}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-100 to-primary-50 text-primary-700 text-sm font-semibold border border-primary-200/50 shadow-sm">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                          {formatCurrency(product.price)}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleAvailability(product)}
                          className={`inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-xl shadow-sm transition-all border ${
                            product.isAvailable !== false
                              ? 'bg-gradient-to-r from-green-100 via-green-50 to-green-100 text-green-800 border-green-200/50 hover:from-green-200 hover:via-green-100 hover:to-green-200'
                              : 'bg-gradient-to-r from-red-100 via-red-50 to-red-100 text-red-800 border-red-200/50 hover:from-red-200 hover:via-red-100 hover:to-red-200'
                          }`}
                        >
                          {product.isAvailable !== false ? '✓ Tersedia' : '✗ Habis'}
                        </button>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(product)
                              setIsFormOpen(true)
                            }}
                            className="p-3 text-primary-600 hover:bg-primary-50 rounded-xl transition-all hover:scale-110 hover:shadow-md"
                            title="Edit"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110 hover:shadow-md"
                            title="Hapus"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingProduct(null)
        }}
        onSubmit={editingProduct ? handleEdit : handleCreate}
        initialData={
          editingProduct
            ? {
                name: editingProduct.name,
                price: editingProduct.price,
                categoryId: editingProduct.categoryId || '',
                imageUrl: editingProduct.imageUrl || editingProduct.image || '',
                isAvailable: editingProduct.isAvailable !== false,
              }
            : undefined
        }
        mode={editingProduct ? 'edit' : 'create'}
      />
    </div>
  )
}

