import * as XLSX from 'xlsx'

export function exportToExcel(data: Record<string, any>[], filename: string, sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.utils.sheet_add_aoa(ws, [], { origin: 'A1' })
  
  // Auto-width columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
  }))
  ws['!cols'] = colWidths
  
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export function exportToPDF() {
  window.print()
}
