'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
          <p className="text-gray-600 mt-1">Kelola produk menu</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingProduct(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Produk
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {products.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">Belum ada produk</p>
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.image || product.imageUrl ? (
                            <img
                              src={product.image || product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {product.name}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{product.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(product.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAvailability(product)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.isAvailable !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.isAvailable !== false ? 'Tersedia' : 'Habis'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product)
                            setIsFormOpen(true)
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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




