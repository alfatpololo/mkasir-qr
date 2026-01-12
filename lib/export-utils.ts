// @ts-ignore - xlsx types
import * as XLSX from 'xlsx'
// @ts-ignore - jspdf types
import jsPDF from 'jspdf'
// @ts-ignore - jspdf-autotable types
import autoTable from 'jspdf-autotable'
import { formatCurrency } from './utils'
import { Order, Product } from './types'
import { Customer } from './firestore'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

// Export Orders to Excel
export const exportOrdersToExcel = (orders: Order[], filename: string = 'orders') => {
  const data = orders.map((order) => ({
    'Order ID': order.id,
    'Tanggal': order.createdAt?.toDate ? format(order.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: id }) : '-',
    'Meja': order.tableNumber,
    'Customer': order.customerName || '-',
    'Email': order.customerEmail || '-',
    'Phone': order.customerPhone || '-',
    'Items': order.items.map(i => `${i.qty}x ${i.name}`).join(', '),
    'Total': order.total,
    'Status': order.status,
    'Payment Method': order.paymentMethod || '-',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orders')
  
  // Set column widths
  const colWidths = [
    { wch: 15 }, // Order ID
    { wch: 20 }, // Tanggal
    { wch: 8 },  // Meja
    { wch: 20 }, // Customer
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 40 }, // Items
    { wch: 12 }, // Total
    { wch: 15 }, // Status
    { wch: 15 }, // Payment Method
  ]
  ws['!cols'] = colWidths

  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

// Export Products to Excel
export const exportProductsToExcel = (products: Product[], filename: string = 'products') => {
  const data = products.map((product) => ({
    'ID': product.id,
    'Nama': product.name,
    'Kategori': product.category || '-',
    'Harga': product.price,
    'Stok': product.stock || 0,
    'Tersedia': product.isAvailable ? 'Ya' : 'Tidak',
    'Gambar': product.imageUrl || product.image || '-',
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  
  // Set column widths
  const colWidths = [
    { wch: 15 }, // ID
    { wch: 30 }, // Nama
    { wch: 15 }, // Kategori
    { wch: 12 }, // Harga
    { wch: 8 },  // Stok
    { wch: 12 }, // Tersedia
    { wch: 40 }, // Gambar
  ]
  ws['!cols'] = colWidths

  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

// Export Customers to Excel
export const exportCustomersToExcel = (customers: Customer[], orders: Order[], filename: string = 'customers') => {
  // Calculate stats for each customer
  const customerStats = new Map<string, { orders: number; total: number }>()
  
  orders.forEach((order) => {
    const key = order.customerEmail || order.customerPhone || ''
    if (key) {
      const stats = customerStats.get(key) || { orders: 0, total: 0 }
      stats.orders += 1
      stats.total += order.total || 0
      customerStats.set(key, stats)
    }
  })

  const data = customers.map((customer) => {
    const stats = customerStats.get(customer.email) || { orders: 0, total: 0 }
    return {
      'ID': customer.id,
      'UID': customer.uid,
      'Nama': customer.displayName,
      'Email': customer.email,
      'Phone': customer.phoneNumber || '-',
      'Total Pesanan': stats.orders,
      'Total Belanja': stats.total,
      'Tanggal Daftar': customer.createdAt?.toDate ? format(customer.createdAt.toDate(), 'dd/MM/yyyy', { locale: id }) : '-',
    }
  })

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Customers')
  
  // Set column widths
  const colWidths = [
    { wch: 15 }, // ID
    { wch: 15 }, // UID
    { wch: 25 }, // Nama
    { wch: 30 }, // Email
    { wch: 15 }, // Phone
    { wch: 12 }, // Total Pesanan
    { wch: 15 }, // Total Belanja
    { wch: 15 }, // Tanggal Daftar
  ]
  ws['!cols'] = colWidths

  XLSX.writeFile(wb, `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
}

// Export Orders to PDF
export const exportOrdersToPDF = async (orders: Order[], title: string = 'Laporan Pesanan') => {
  try {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(18)
    doc.text(title, 14, 22)
    
    // Date
    doc.setFontSize(10)
    doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, 14, 30)
    
    // Table data
    const tableData = orders.map((order) => [
      order.id.slice(0, 8),
      order.tableNumber.toString(),
      order.customerName || '-',
      formatCurrency(order.total),
      order.status,
      order.createdAt?.toDate ? format(order.createdAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: id }) : '-',
    ])

    // Use autoTable
    try {
      autoTable(doc, {
        head: [['Order ID', 'Meja', 'Customer', 'Total', 'Status', 'Tanggal']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
      })
    } catch (autoTableError) {
      // Fallback jika autoTable error
      // Fallback: simple text list
      let yPos = 40
      doc.setFontSize(10)
      doc.text('Order ID | Meja | Customer | Total | Status | Tanggal', 14, yPos)
      yPos += 10
      orders.slice(0, 30).forEach((order) => {
        const line = `${order.id.slice(0, 8)} | ${order.tableNumber} | ${order.customerName || '-'} | ${formatCurrency(order.total)} | ${order.status} | ${order.createdAt?.toDate ? format(order.createdAt.toDate(), 'dd/MM/yyyy', { locale: id }) : '-'}`
        doc.text(line, 14, yPos)
        yPos += 7
      })
    }

    // Summary
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const paidOrders = orders.filter(o => o.status === 'PAID').length
    
    const finalY = (doc as any).lastAutoTable?.finalY || (orders.length > 0 ? 40 + (Math.min(orders.length, 30) * 7) : 100)
    const summaryY = finalY + 10
    doc.setFontSize(12)
    doc.text('Ringkasan:', 14, summaryY)
    doc.setFontSize(10)
    doc.text(`Total Pesanan: ${orders.length}`, 14, summaryY + 8)
    doc.text(`Pesanan Dibayar: ${paidOrders}`, 14, summaryY + 16)
    doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 14, summaryY + 24)

    doc.save(`${title}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('Gagal export PDF. Pastikan jspdf-autotable sudah terinstall: npm install jspdf-autotable')
  }
}

// Export Products to PDF
export const exportProductsToPDF = async (products: Product[], title: string = 'Laporan Produk') => {
  try {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text(title, 14, 22)
    doc.setFontSize(10)
    doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, 14, 30)
    
    const tableData = products.map((product) => [
      product.name,
      product.category || '-',
      formatCurrency(product.price),
      (product.stock || 0).toString(),
      product.isAvailable ? 'Ya' : 'Tidak',
    ])

    try {
      autoTable(doc, {
        head: [['Nama', 'Kategori', 'Harga', 'Stok', 'Tersedia']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
      })
    } catch (autoTableError) {
      let yPos = 40
      doc.setFontSize(10)
      doc.text('Nama | Kategori | Harga | Stok | Tersedia', 14, yPos)
      yPos += 10
      products.slice(0, 30).forEach((product) => {
        const line = `${product.name} | ${product.category || '-'} | ${formatCurrency(product.price)} | ${product.stock || 0} | ${product.isAvailable ? 'Ya' : 'Tidak'}`
        doc.text(line, 14, yPos)
        yPos += 7
      })
    }

    const finalY = (doc as any).lastAutoTable?.finalY || (products.length > 0 ? 40 + (Math.min(products.length, 30) * 7) : 100)
    const summaryY = finalY + 10
    doc.setFontSize(12)
    doc.text('Ringkasan:', 14, summaryY)
    doc.setFontSize(10)
    doc.text(`Total Produk: ${products.length}`, 14, summaryY + 8)
    doc.text(`Produk Tersedia: ${products.filter(p => p.isAvailable).length}`, 14, summaryY + 16)

    doc.save(`${title}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('Gagal export PDF. Pastikan jspdf-autotable sudah terinstall: npm install jspdf-autotable')
  }
}

// Export Customers to PDF
export const exportCustomersToPDF = async (customers: Customer[], orders: Order[], title: string = 'Laporan Customer') => {
  try {
    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text(title, 14, 22)
    doc.setFontSize(10)
    doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, 14, 30)
    
    // Calculate stats
    const customerStats = new Map<string, { orders: number; total: number }>()
    orders.forEach((order) => {
      const key = order.customerEmail || order.customerPhone || ''
      if (key) {
        const stats = customerStats.get(key) || { orders: 0, total: 0 }
        stats.orders += 1
        stats.total += order.total || 0
        customerStats.set(key, stats)
      }
    })
    
    const tableData = customers.map((customer) => {
      const stats = customerStats.get(customer.email) || { orders: 0, total: 0 }
      return [
        customer.displayName,
        customer.email,
        customer.phoneNumber || '-',
        stats.orders.toString(),
        formatCurrency(stats.total),
      ]
    })

    try {
      autoTable(doc, {
        head: [['Nama', 'Email', 'Phone', 'Total Pesanan', 'Total Belanja']],
        body: tableData,
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
      })
    } catch (autoTableError) {
      let yPos = 40
      doc.setFontSize(10)
      doc.text('Nama | Email | Phone | Total Pesanan | Total Belanja', 14, yPos)
      yPos += 10
      customers.slice(0, 30).forEach((customer) => {
        const stats = customerStats.get(customer.email) || { orders: 0, total: 0 }
        const line = `${customer.displayName} | ${customer.email} | ${customer.phoneNumber || '-'} | ${stats.orders} | ${formatCurrency(stats.total)}`
        doc.text(line, 14, yPos)
        yPos += 7
      })
    }

    const finalY = (doc as any).lastAutoTable?.finalY || (customers.length > 0 ? 40 + (Math.min(customers.length, 30) * 7) : 100)
    const summaryY = finalY + 10
    doc.setFontSize(12)
    doc.text('Ringkasan:', 14, summaryY)
    doc.setFontSize(10)
    doc.text(`Total Customer: ${customers.length}`, 14, summaryY + 8)

    doc.save(`${title}_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('Gagal export PDF. Pastikan jspdf-autotable sudah terinstall: npm install jspdf-autotable')
  }
}

// Export Sales Report to PDF
export const exportSalesReportToPDF = async (
  orders: Order[],
  period: string,
  totalRevenue: number,
  totalOrders: number
) => {
  try {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(18)
    doc.text('Laporan Penjualan', 14, 22)
    
    // Period
    doc.setFontSize(12)
    doc.text(`Periode: ${period}`, 14, 30)
    doc.text(`Tanggal: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, 14, 37)
    
    // Summary Box
    doc.setFillColor(34, 197, 94)
    doc.roundedRect(14, 45, 90, 25, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.text('Total Revenue', 20, 57)
    doc.setFontSize(20)
    doc.text(formatCurrency(totalRevenue), 20, 68)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.text(`Total Pesanan: ${totalOrders}`, 120, 57)
    doc.text(`Rata-rata per Pesanan: ${formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}`, 120, 64)
    
    // Orders table
    const tableData = orders.slice(0, 50).map((order) => [
      order.id.slice(0, 8),
      order.tableNumber.toString(),
      formatCurrency(order.total),
      order.status,
      order.createdAt?.toDate ? format(order.createdAt.toDate(), 'dd/MM/yyyy', { locale: id }) : '-',
    ])

    // Use autoTable
    try {
      autoTable(doc, {
        head: [['Order ID', 'Meja', 'Total', 'Status', 'Tanggal']],
        body: tableData,
        startY: 75,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 197, 94] },
      })
    } catch (autoTableError) {
      // Fallback: simple text list
      let yPos = 80
      doc.setFontSize(10)
      doc.text('Order ID | Meja | Total | Status | Tanggal', 14, yPos)
      yPos += 10
      orders.slice(0, 30).forEach((order) => {
        const line = `${order.id.slice(0, 8)} | ${order.tableNumber} | ${formatCurrency(order.total)} | ${order.status} | ${order.createdAt?.toDate ? format(order.createdAt.toDate(), 'dd/MM/yyyy', { locale: id }) : '-'}`
        doc.text(line, 14, yPos)
        yPos += 7
      })
    }

    if (orders.length > 50) {
      const finalY = (doc as any).lastAutoTable?.finalY || (orders.length > 0 ? 80 + (Math.min(orders.length, 30) * 7) : 100)
      doc.setFontSize(10)
      doc.text(`* Menampilkan 50 pesanan pertama dari ${orders.length} total pesanan`, 14, finalY + 10)
    }

    doc.save(`Laporan_Penjualan_${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  } catch (error) {
    console.error('Error exporting PDF:', error)
    alert('Gagal export PDF. Pastikan jspdf-autotable sudah terinstall: npm install jspdf-autotable')
  }
}
