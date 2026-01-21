'use client'

import React, { useEffect, useState } from 'react'
import { Product } from '@/lib/types'
import { subscribeToAllProducts, createProduct, updateProduct } from '@/lib/firestore'
import { Button } from '@/components/Button'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    category: '',
    image: '',
    stock: '',
  })

  useEffect(() => {
    const unsubscribe = subscribeToAllProducts((productsData) => {
      setProducts(productsData)
    })

    return () => unsubscribe()
  }, [])

  const categories = Array.from(new Set(products.map((p) => p.category))).sort()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        image: formData.image || '',
        stock: parseInt(formData.stock) || 0,
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData)
      } else {
        await createProduct(productData)
      }

      setShowForm(false)
      setEditingProduct(null)
      setFormData({
        name: '',
        price: '',
        category: '',
        image: '',
        stock: '',
      })
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Gagal menyimpan produk')
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      image: product.image,
      stock: product.stock.toString(),
    })
    setShowForm(true)
  }

  const handleUpdateStock = async (product: Product, newStock: number) => {
    try {
      await updateProduct(product.id, { stock: newStock })
    } catch (error) {
      console.error('Error updating stock:', error)
      alert('Gagal mengupdate stok')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Produk</h1>
            <Button variant="primary" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          </div>

          {/* Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">
                  {editingProduct ? 'Edit Produk' : 'Tambah Produk'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Produk
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Harga
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL Gambar
                    </label>
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) =>
                        setFormData({ ...formData, image: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stok
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" className="flex-1">
                      {editingProduct ? 'Update' : 'Simpan'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setShowForm(false)
                        setEditingProduct(null)
                        setFormData({
                          name: '',
                          price: '',
                          category: '',
                          image: '',
                          stock: '',
                        })
                      }}
                    >
                      Batal
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Products List */}
          <div className="space-y-4">
            {categories.map((category) => {
              const categoryProducts = products.filter((p) => p.category === category)
              return (
                <div key={category}>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    {category}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryProducts.map((product) => (
                      <div
                        key={product.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {product.name}
                        </h3>
                        <p className="text-lg font-bold text-primary-600 mb-2">
                          {formatCurrency(product.price)}
                        </p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-600">Stok:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleUpdateStock(product, product.stock - 1)
                              }
                              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              -
                            </button>
                            <span className="font-semibold w-8 text-center">
                              {product.stock}
                            </span>
                            <button
                              onClick={() =>
                                handleUpdateStock(product, product.stock + 1)
                              }
                              className="px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {products.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Belum ada produk</p>
              <Button variant="primary" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Produk Pertama
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}









