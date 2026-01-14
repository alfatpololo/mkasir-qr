import * as XLSX from 'xlsx'
import { Product, Category } from './types'
import { addDoc, collection, Timestamp } from 'firebase/firestore'
import { db } from './firebase'

// Import Products from Excel
export const importProductsFromExcel = async (
  file: File,
  categories: Category[]
): Promise<{ success: number; errors: string[] }> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    const errors: string[] = []
    let successCount = 0

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // Create category map for quick lookup
        const categoryMap = new Map<string, string>()
        categories.forEach((cat) => {
          categoryMap.set(cat.name.toLowerCase(), cat.id)
        })

        for (const row of jsonData as any[]) {
          try {
            const name = row['Nama'] || row['nama'] || row['Name'] || row['name']
            const price = parseFloat(row['Harga'] || row['harga'] || row['Price'] || row['price'] || 0)
            const categoryName = row['Kategori'] || row['kategori'] || row['Category'] || row['category'] || ''
            const stock = parseInt(row['Stok'] || row['stok'] || row['Stock'] || row['stock'] || '0')
            const isAvailable = row['Tersedia'] === 'Ya' || row['Tersedia'] === 'ya' || row['Available'] === true || row['available'] === true
            const imageUrl = row['Gambar'] || row['gambar'] || row['Image'] || row['image'] || ''

            if (!name || !price || price <= 0) {
              errors.push(`Baris dengan nama "${name || 'N/A'}" tidak valid: Nama dan harga harus diisi`)
              continue
            }

            // Find category ID
            let categoryId = ''
            if (categoryName) {
              const foundCategory = categoryMap.get(categoryName.toLowerCase())
              if (foundCategory) {
                categoryId = foundCategory
              } else {
                errors.push(`Kategori "${categoryName}" tidak ditemukan untuk produk "${name}"`)
                continue
              }
            }

            // Create product
            await addDoc(collection(db, 'products'), {
              name: name.trim(),
              price: price,
              categoryId: categoryId || null,
              category: categoryName || null,
              stock: stock || 0,
              isAvailable: isAvailable !== false,
              imageUrl: imageUrl || '',
              image: imageUrl || '',
              createdAt: Timestamp.now(),
            })

            successCount++
          } catch (error: any) {
            errors.push(`Error pada baris: ${error.message}`)
          }
        }

        resolve({ success: successCount, errors })
      } catch (error: any) {
        resolve({ success: 0, errors: [`Error membaca file: ${error.message}`] })
      }
    }

    reader.onerror = () => {
      resolve({ success: 0, errors: ['Error membaca file Excel'] })
    }

    reader.readAsArrayBuffer(file)
  })
}

// Download Excel template for products
export const downloadProductTemplate = () => {
  const template = [
    {
      'Nama': 'Nasi Goreng Spesial',
      'Kategori': 'Makanan',
      'Harga': 25000,
      'Stok': 100,
      'Tersedia': 'Ya',
      'Gambar': 'https://example.com/image.jpg',
    },
    {
      'Nama': 'Es Teh Manis',
      'Kategori': 'Minuman',
      'Harga': 5000,
      'Stok': 200,
      'Tersedia': 'Ya',
      'Gambar': '',
    },
  ]

  const ws = XLSX.utils.json_to_sheet(template)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  
  // Set column widths
  ws['!cols'] = [
    { wch: 30 }, // Nama
    { wch: 15 }, // Kategori
    { wch: 12 }, // Harga
    { wch: 8 },  // Stok
    { wch: 12 }, // Tersedia
    { wch: 40 }, // Gambar
  ]

  XLSX.writeFile(wb, 'template_import_produk.xlsx')
}



