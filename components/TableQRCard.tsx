'use client'

import React, { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { Button } from './Button'

// Dynamic import untuk react-qr-code
let QRCodeSVG: React.ComponentType<any> | null = null

if (typeof window !== 'undefined') {
  try {
    const QRCode = require('react-qr-code')
    if (QRCode.QRCodeSVG) {
      QRCodeSVG = QRCode.QRCodeSVG
    } else if (QRCode.default?.QRCodeSVG) {
      QRCodeSVG = QRCode.default.QRCodeSVG
    } else if (QRCode.default) {
      QRCodeSVG = QRCode.default
    } else {
      QRCodeSVG = QRCode
    }
  } catch (e) {
    console.error('Failed to load react-qr-code:', e)
  }
}

interface TableQRCardProps {
  tableNumber: number
  qrUrl: string
}

export const TableQRCard: React.FC<TableQRCardProps> = ({ tableNumber, qrUrl }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDownload = () => {
    const svg = document.getElementById(`qr-code-table-${tableNumber}`)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = 256
      canvas.height = 256
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `QR-Meja-${tableNumber}.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Meja {tableNumber}</h3>
        <p className="text-sm text-gray-600 mt-1">Scan untuk memesan</p>
      </div>

      <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4 flex justify-center">
        {mounted && QRCodeSVG ? (
          <QRCodeSVG
            id={`qr-code-table-${tableNumber}`}
            value={qrUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        ) : (
          <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded">
            <p className="text-gray-500 text-sm">Loading QR Code...</p>
          </div>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="w-full"
      >
        <Download className="w-4 h-4 mr-2" />
        Download QR Code
      </Button>

      <p className="text-xs text-gray-500 text-center mt-3 break-all">
        {qrUrl}
      </p>
    </div>
  )
}




