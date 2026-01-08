'use client'

import React, { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/Button'
import { TableQRCard } from '@/components/TableQRCard'
import { subscribeToAllTables, createTable, updateTable } from '@/lib/firestore'
import { Table } from '@/lib/types'

export default function TablesPage() {
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
      // QR URL akan selalu dinamis, tidak perlu disimpan
      await createTable(tableNumber)
    } catch (error) {
      console.error('Error creating table:', error)
      alert('Gagal membuat meja')
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

  const getQRUrl = (tableNumber: number) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/menu/${tableNumber}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meja</h1>
          <p className="text-gray-600 mt-1">Kelola meja dan QR code</p>
        </div>
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
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <TableQRCard
              tableNumber={selectedTable.number}
              qrUrl={getQRUrl(selectedTable.number)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`border rounded-lg p-6 ${
              table.active
                ? 'border-gray-200 bg-white'
                : 'border-gray-300 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
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

            <div className="mb-4">
              <TableQRCard
                tableNumber={table.number}
                qrUrl={getQRUrl(table.number)}
              />
            </div>

            <div className="flex gap-2">
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
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-4">Belum ada meja</p>
          <Button variant="primary" onClick={handleCreateTable}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Meja Pertama
          </Button>
        </div>
      )}
    </div>
  )
}

