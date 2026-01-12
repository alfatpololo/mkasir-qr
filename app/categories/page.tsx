'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, FolderTree } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <span className="w-1 h-10 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
            Kategori
          </h1>
          <p className="text-gray-500 text-lg ml-4">Kelola kategori produk Anda</p>
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

      {/* Categories Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
        {categories.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
              <FolderTree className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">Belum ada kategori</p>
            <p className="text-sm text-gray-500 mb-6">Mulai dengan menambahkan kategori pertama Anda</p>
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
          <>
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white via-gray-50/50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-6 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
                    Daftar Kategori
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 ml-3">Total {categories.length} kategori</p>
                </div>
                <div className="px-4 py-2 bg-primary-50 rounded-xl border border-primary-100">
                  <span className="text-sm font-semibold text-primary-700">{categories.length} Kategori</span>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Nama Kategori
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Dibuat
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {categories.map((category) => (
                    <tr key={category.id} className="group hover:bg-gradient-to-r hover:from-primary-50/30 hover:via-primary-50/20 hover:to-transparent transition-all duration-200 border-b border-gray-50/50">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-primary-100 via-primary-50 to-primary-100 text-primary-800 text-sm font-semibold border border-primary-200/50 shadow-sm">
                          {category.name}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-700">
                            {category.createdAt?.toDate().toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingCategory(category)
                              setIsFormOpen(true)
                            }}
                            className="p-3 text-primary-600 hover:bg-primary-50 rounded-xl transition-all hover:scale-110 hover:shadow-md"
                            title="Edit"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
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

