/**
 * Excel formatting utilities
 * Note: Basic xlsx library doesn't support advanced formatting.
 * For colors, conditional formatting, etc., consider using ExcelJS instead.
 */

import * as XLSX from 'xlsx'

export interface ExcelCellStyle {
  font?: {
    bold?: boolean
    color?: string
    size?: number
  }
  fill?: {
    fgColor?: string
  }
  alignment?: {
    horizontal?: 'left' | 'center' | 'right'
    vertical?: 'top' | 'middle' | 'bottom'
  }
  border?: {
    top?: { style: string; color?: string }
    bottom?: { style: string; color?: string }
    left?: { style: string; color?: string }
    right?: { style: string; color?: string }
  }
}

export interface ExcelSheetData {
  name: string
  data: Array<Array<string | number>>
  headers?: string[]
  columnWidths?: number[]
}

/**
 * Formats a number as currency for Excel
 */
export function formatCurrencyForExcel(value: number): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Formats a number as percentage for Excel
 */
export function formatPercentForExcel(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Creates a styled header row for Excel
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createExcelHeaderRow(headers: string[]): any[] {
  return headers.map(header => ({
    v: header,
    t: 's',
    s: {
      font: { bold: true, size: 11 },
      fill: { fgColor: { rgb: 'FF1E293B' } },
      fgColor: { rgb: 'FFFFFFFF' },
      alignment: { horizontal: 'center', vertical: 'middle' },
    },
  }))
}

/**
 * Creates a workbook with multiple sheets
 */
export function createExcelWorkbook(sheets: ExcelSheetData[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  sheets.forEach(sheet => {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.data)

    // Set column widths if provided
    if (sheet.columnWidths) {
      worksheet['!cols'] = sheet.columnWidths.map(width => ({ wch: width }))
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
  })

  return workbook
}

/**
 * Exports data to Excel file
 */
export function exportToExcel(sheets: ExcelSheetData[], filename: string): void {
  const workbook = createExcelWorkbook(sheets)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Creates a formatted Excel sheet with headers and data
 */
export function createFormattedSheet(
  name: string,
  headers: string[],
  data: Array<Array<string | number>>,
  columnWidths?: number[]
): ExcelSheetData {
  const formattedData: Array<Array<string | number>> = []

  // Add header row
  formattedData.push(headers)

  // Add data rows
  data.forEach(row => {
    formattedData.push(row)
  })

  return {
    name,
    data: formattedData,
    headers,
    columnWidths,
  }
}

/**
 * Applies conditional formatting to a cell based on value
 * Note: This is a placeholder - actual conditional formatting
 * requires ExcelJS or manual cell styling
 */
export function applyConditionalFormatting(
  value: number,
  thresholds: { min: number; max: number; color: string }[]
): ExcelCellStyle {
  for (const threshold of thresholds) {
    if (value >= threshold.min && value <= threshold.max) {
      return {
        fill: { fgColor: threshold.color },
      }
    }
  }
  return {}
}
