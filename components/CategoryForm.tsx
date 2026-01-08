'use client'

import React, { useState } from 'react'
import { Button } from './Button'
import { X } from 'lucide-react'

interface CategoryFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (name: string) => Promise<void>
  initialName?: string
  mode: 'create' | 'edit'
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialName = '',
  mode,
}) => {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)

  React.useEffect(() => {
    setName(initialName)
  }, [initialName])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      await onSubmit(name.trim())
      setName('')
      onClose()
    } catch (error) {
      console.error('Error submitting category:', error)
      alert('Gagal menyimpan kategori')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'create' ? 'Tambah Kategori' : 'Edit Kategori'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nama Kategori
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Makanan, Minuman, Snack"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
              autoFocus
            />
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

