'use client'

import React, { useEffect, useState } from 'react'
import { Plus, Table as TableIcon } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2 flex items-center gap-3">
            <span className="w-1 h-10 bg-gradient-to-b from-primary-500 to-primary-600 rounded-full"></span>
            Meja
          </h1>
          <p className="text-gray-500 text-lg ml-4">Kelola meja dan QR code untuk pelanggan</p>
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                QR Code Meja {selectedTable.number}
              </h2>
              <button
                onClick={() => {
                  setShowQR(false)
                  setSelectedTable(null)
                }}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all hover:scale-110"
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

      {tables.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-16 text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
            <TableIcon className="w-12 h-12 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700 mb-2">Belum ada meja</p>
          <p className="text-sm text-gray-500 mb-6">Mulai dengan membuat meja pertama Anda</p>
          <Button variant="primary" onClick={handleCreateTable}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Meja Pertama
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => (
            <div
              key={table.id}
              className={`border-2 rounded-3xl p-6 shadow-lg transition-all hover:shadow-2xl hover:-translate-y-1 ${
                table.active
                  ? 'border-primary-200 bg-white hover:border-primary-300'
                  : 'border-gray-200 bg-gray-50/50 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-2xl font-bold text-gray-900">Meja {table.number}</h3>
                <span
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm border ${
                    table.active
                      ? 'bg-gradient-to-r from-green-100 via-green-50 to-green-100 text-green-800 border-green-200/50'
                      : 'bg-gray-200 text-gray-600 border-gray-300/50'
                  }`}
                >
                  {table.active ? '✓ Aktif' : '✗ Tidak Aktif'}
                </span>
              </div>

              <div className="mb-5">
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
      )}
    </div>
  )
}

