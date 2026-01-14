'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { CategoryForm } from '@/components/CategoryForm'
import {
  subscribeToAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/firestore'
import { Category } from '@/lib/types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToAllCategories((categoriesData) => {
      setCategories(categoriesData.filter((cat) => !(cat as any).deleted))
    })

    return () => unsubscribe()
  }, [])

  const handleCreate = async (name: string) => {
    await createCategory(name)
  }

  const handleEdit = async (name: string) => {
    if (!editingCategory) return
    await updateCategory(editingCategory.id, name)
    setEditingCategory(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kategori ini?')) return
    try {
      await deleteCategory(id)
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Gagal menghapus kategori')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kategori</h1>
          <p className="text-gray-600 mt-1">Kelola kategori produk</p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingCategory(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Kategori
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {categories.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-4">Belum ada kategori</p>
            <Button
              variant="primary"
              onClick={() => {
                setEditingCategory(null)
                setIsFormOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kategori Pertama
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dibuat
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {category.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {category.createdAt?.toDate().toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory(category)
                            setIsFormOpen(true)
                          }}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
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

      <CategoryForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingCategory(null)
        }}
        onSubmit={editingCategory ? handleEdit : handleCreate}
        initialName={editingCategory?.name || ''}
        mode={editingCategory ? 'edit' : 'create'}
      />
    </div>
  )
}




