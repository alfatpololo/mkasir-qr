'use client'

import React, { useEffect, useState } from 'react'
import { Table } from '@/lib/types'
import { subscribeToAllTables, createTable, updateTable } from '@/lib/firestore'
import { QRCodeGenerator } from '@/components/QRCodeGenerator'
import { Button } from '@/components/Button'
import { Plus, Edit2 } from 'lucide-react'

export default function AdminTablesPage() {
  const [tables, setTables] = useState<Table[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeToAllTables((tablesData) => {
      setTables(tablesData)
    })

    return () => unsubscribe()
  }, [])

  const handleCreateTable = async () => {
    const tableNumber = tables.length > 0 
      ? Math.max(...tables.map(t => t.number)) + 1 
      : 1
    
    if (tableNumber > 20) {
      alert('Maksimal 20 meja')
      return
    }

    try {
      await createTable(tableNumber)
      console.log(`Meja ${tableNumber} berhasil dibuat`)
    } catch (error: any) {
      console.error('Error creating table:', error)
      const errorMessage = error?.message || 'Gagal membuat meja'
      alert(`Gagal membuat meja: ${errorMessage}\n\nPastikan Firestore rules sudah di-deploy dengan benar.`)
    }
  }

  const handleToggleActive = async (table: Table) => {
    try {
      await updateTable(table.id, { active: !table.active })
    } catch (error) {
      console.error('Error updating table:', error)
      alert('Gagal mengupdate meja')
    }
  }

  const handleShowQR = (table: Table) => {
    setSelectedTable(table)
    setShowQR(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Manajemen Meja</h1>
            <Button
              variant="primary"
              onClick={handleCreateTable}
              disabled={tables.length >= 20}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Meja
            </Button>
          </div>

          {showQR && selectedTable && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">QR Code Meja {selectedTable.number}</h2>
                  <button
                    onClick={() => {
                      setShowQR(false)
                      setSelectedTable(null)
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <QRCodeGenerator tableNumber={selectedTable.number} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`border rounded-lg p-4 ${
                  table.active
                    ? 'border-gray-200 bg-white'
                    : 'border-gray-300 bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold">Meja {table.number}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      table.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {table.active ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleShowQR(table)}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    QR Code
                  </Button>
                  <Button
                    variant={table.active ? 'secondary' : 'primary'}
                    size="sm"
                    className="flex-1"
                    onClick={() => handleToggleActive(table)}
                  >
                    {table.active ? 'Nonaktifkan' : 'Aktifkan'}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {tables.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Belum ada meja</p>
              <Button variant="primary" onClick={handleCreateTable}>
                <Plus className="w-4 h-4 mr-2" />
                Buat Meja Pertama
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

