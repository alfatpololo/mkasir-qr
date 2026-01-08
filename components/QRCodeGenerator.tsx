'use client'

import React, { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from './Button'

// Dynamic import untuk react-qr-code
let QRCodeSVG: React.ComponentType<any> | null = null

if (typeof window !== 'undefined') {
  try {
    const QRCode = require('react-qr-code')
    // Coba berbagai cara import
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

interface QRCodeGeneratorProps {
  tableNumber: number
  size?: number
  showDownload?: boolean
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  tableNumber,
  size = 256,
  showDownload = true,
}) => {
  const [mounted, setMounted] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const qrValue = `${baseUrl}/menu/${tableNumber}`

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDownload = () => {
    const svg = document.getElementById(`qr-code-${tableNumber}`)
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = size
      canvas.height = size
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
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg border border-gray-200">
      <div className="text-center mb-2">
        <h3 className="font-bold text-lg text-gray-900">Meja {tableNumber}</h3>
        <p className="text-sm text-gray-600 mt-1">Scan untuk memesan</p>
      </div>
      
      <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
        {mounted && QRCodeSVG ? (
          <QRCodeSVG
            id={`qr-code-${tableNumber}`}
            value={qrValue}
            size={size}
            level="H"
            includeMargin={true}
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
            <p className="text-gray-500 text-sm">Loading QR Code...</p>
          </div>
        )}
      </div>

      {showDownload && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="w-full"
        >
          <Download className="w-4 h-4 mr-2" />
          Download QR Code
        </Button>
      )}

      <p className="text-xs text-gray-500 text-center max-w-xs break-all">
        {qrValue}
      </p>
    </div>
  )
}

