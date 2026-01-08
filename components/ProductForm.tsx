'use client'

import React, { useState, useEffect } from 'react'
import { Button } from './Button'
import { X } from 'lucide-react'
import { Category } from '@/lib/types'
import { getAllCategories } from '@/lib/firestore'

interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    price: number
    categoryId: string
    imageUrl: string
    isAvailable: boolean
  }) => Promise<void>
  initialData?: {
    name: string
    price: number
    categoryId: string
    imageUrl: string
    isAvailable: boolean
  }
  mode: 'create' | 'edit'
}

export const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const [categories, setCategories] = useState<Category[]>([])
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    isAvailable: true,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      getAllCategories().then(setCategories)
    }
  }, [isOpen])

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        price: initialData.price.toString(),
        categoryId: initialData.categoryId,
        imageUrl: initialData.imageUrl,
        isAvailable: initialData.isAvailable,
      })
    } else {
      setFormData({
        name: '',
        price: '',
        categoryId: '',
        imageUrl: '',
        isAvailable: true,
      })
    }
  }, [initialData])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.price || !formData.categoryId) return

    setLoading(true)
    try {
      await onSubmit({
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        categoryId: formData.categoryId,
        imageUrl: formData.imageUrl || 'https://via.placeholder.com/400',
        isAvailable: formData.isAvailable,
      })
      setFormData({
        name: '',
        price: '',
        categoryId: '',
        imageUrl: '',
        isAvailable: true,
      })
      onClose()
    } catch (error) {
      console.error('Error submitting product:', error)
      alert('Gagal menyimpan produk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Tambah Produk' : 'Edit Produk'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nama Produk *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Nasi Goreng Spesial"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                min="0"
                step="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori *
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="">Pilih Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Gambar
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Kosongkan untuk menggunakan gambar default
            </p>
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) =>
                  setFormData({ ...formData, isAvailable: e.target.checked })
                }
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Produk Tersedia
              </span>
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={loading}
            >
              {mode === 'create' ? 'Simpan' : 'Update'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Batal
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

