'use client'

/**
 * QR Code Generator - Standalone Version
 * 
 * Komponen ini adalah versi standalone yang tidak bergantung pada komponen Button.
 * Cocok untuk diintegrasikan ke project lain tanpa dependency tambahan.
 * 
 * Usage:
 * ```tsx
 * import { QRCodeGeneratorStandalone } from '@/components/QRCodeGeneratorStandalone'
 * 
 * <QRCodeGeneratorStandalone 
 *   value="https://example.com/menu/1"
 *   label="Meja 1"
 *   size={256}
 *   showDownload={true}
 * />
 * ```
 */

import React, { useEffect, useState } from 'react'

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

export interface QRCodeGeneratorStandaloneProps {
  /**
   * Nilai yang akan di-encode ke QR Code (URL, text, dll)
   */
  value: string
  
  /**
   * Label/Title untuk QR Code (optional)
   */
  label?: string
  
  /**
   * Deskripsi/keterangan (optional)
   */
  description?: string
  
  /**
   * Ukuran QR Code dalam pixel (default: 256)
   */
  size?: number
  
  /**
   * Tampilkan tombol download (default: true)
   */
  showDownload?: boolean
  
  /**
   * Nama file saat download (default: "QR-Code.png")
   */
  downloadFileName?: string
  
  /**
   * Level error correction: 'L' | 'M' | 'Q' | 'H' (default: 'H')
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  
  /**
   * Custom className untuk wrapper
   */
  className?: string
  
  /**
   * Custom className untuk QR Code container
   */
  qrClassName?: string
}

export const QRCodeGeneratorStandalone: React.FC<QRCodeGeneratorStandaloneProps> = ({
  value,
  label,
  description = 'Scan untuk memesan',
  size = 256,
  showDownload = true,
  downloadFileName = 'QR-Code.png',
  errorCorrectionLevel = 'H',
  className = '',
  qrClassName = '',
}) => {
  const [mounted, setMounted] = useState(false)
  const [downloadIcon, setDownloadIcon] = useState<string>('')

  useEffect(() => {
    setMounted(true)
    
    // Load download icon SVG (simple inline SVG)
    setDownloadIcon(
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>'
    )
  }, [])

  const handleDownload = () => {
    const svg = document.getElementById(`qr-code-standalone-${value.replace(/[^a-zA-Z0-9]/g, '-')}`)
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
      downloadLink.download = downloadFileName
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const qrId = `qr-code-standalone-${value.replace(/[^a-zA-Z0-9]/g, '-')}`

  return (
    <div className={`flex flex-col items-center gap-4 p-6 bg-white rounded-lg border border-gray-200 ${className}`}>
      {(label || description) && (
        <div className="text-center mb-2">
          {label && <h3 className="font-bold text-lg text-gray-900">{label}</h3>}
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
      )}
      
      <div className={`bg-white p-4 rounded-lg border-2 border-gray-200 ${qrClassName}`}>
        {mounted && QRCodeSVG ? (
          <QRCodeSVG
            id={qrId}
            value={value}
            size={size}
            level={errorCorrectionLevel}
            includeMargin={true}
          />
        ) : (
          <div 
            className="flex items-center justify-center bg-gray-100 rounded"
            style={{ width: size, height: size }}
          >
            <p className="text-gray-500 text-sm">Loading QR Code...</p>
          </div>
        )}
      </div>

      {showDownload && (
        <button
          onClick={handleDownload}
          className="px-4 py-2 text-sm font-semibold rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors duration-200 flex items-center gap-2"
          type="button"
        >
          {downloadIcon && (
            <span 
              dangerouslySetInnerHTML={{ __html: downloadIcon }}
              className="inline-block w-4 h-4"
            />
          )}
          Download QR Code
        </button>
      )}

      <p className="text-xs text-gray-500 text-center max-w-xs break-all">
        {value}
      </p>
    </div>
  )
}




