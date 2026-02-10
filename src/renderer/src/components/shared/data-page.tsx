'use client'

import { useState } from 'react'
import { Search, FileSpreadsheet, FileText, Plus } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card'
import { exportToExcel, exportToPDF } from '@renderer/lib/export'
import { Pagination } from '@renderer/components/ui/pagination'

interface DataPageProps {
  title: string
  description: string
  data: any[]
  columns: {
    header: string
    accessor: string
    render?: (item: any, index: number) => React.ReactNode
  }[]
  onAdd?: () => void
  addLabel?: string
  searchPlaceholder?: string
  fileName?: string
  isLoading?: boolean
  // Pagination props
  currentPage?: number
  totalPages?: number
  totalRecords?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onSearchChange?: (search: string) => void
  searchTerm?: string
  extraActions?: React.ReactNode
}

export function DataPage({
  title,
  description,
  data,
  columns,
  onAdd,
  addLabel = 'Add New',
  searchPlaceholder = 'Search...',
  fileName = 'export-data',
  isLoading = false,
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  searchTerm: externalSearchTerm,
  extraActions
}: DataPageProps) {
  const [internalSearchTerm, setInternalSearchTerm] = useState('')

  // Use external search term if provided, otherwise use internal
  const searchTerm = externalSearchTerm !== undefined ? externalSearchTerm : internalSearchTerm
  const setSearchTerm = onSearchChange || setInternalSearchTerm

  // Filter data only if we don't have server-side pagination
  const shouldFilterLocally = !onPageChange
  const filteredData = shouldFilterLocally
    ? data.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : data

  const handleExportExcel = () => {
    // Prepare data for export (flatten objects if needed)
    const exportData = filteredData.map((item) => {
      const flatItem: any = {}
      columns.forEach((col) => {
        const val = col.accessor.split('.').reduce((obj, key) => obj?.[key], item)
        flatItem[col.header] = val
      })
      return flatItem
    })
    exportToExcel(exportData, fileName, title)
  }

  const handleExportPDF = () => {
    const exportData = filteredData.map((item) => {
      const flatItem: any = {}
      columns.forEach((col) => {
        const val = col.accessor.split('.').reduce((obj, key) => obj?.[key], item)
        flatItem[col.header] = val
      })
      return flatItem
    })
    exportToPDF(exportData, fileName, title)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extraActions}
          {onAdd && (
            <Button
              onClick={onAdd}
              className="bg-[#4ade80] hover:bg-[#22c55e] text-black font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card border-border text-foreground">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-muted border-border pl-10 h-10 w-full"
              />
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={handleExportExcel}
                className="border-border hover:bg-accent h-10 flex-1 md:flex-none"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2 text-[#4ade80]" />
                Excel
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="border-border hover:bg-accent h-10 flex-1 md:flex-none"
              >
                <FileText className="w-4 h-4 mr-2 text-red-400" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-border bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  {columns.map((col, idx) => (
                    <TableHead key={idx} className="text-muted-foreground font-semibold py-4">
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-20">
                      <div className="flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4ade80] border-t-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-10 text-muted-foreground bg-card"
                    >
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item, rowIdx) => (
                    <TableRow
                      key={rowIdx}
                      className="hover:bg-accent border-border group transition-colors"
                    >
                      {columns.map((col, colIdx) => (
                        <TableCell key={colIdx} className="py-4 text-sm">
                          {col.render
                            ? col.render(item, rowIdx)
                            : col.accessor.split('.').reduce((obj, key) => obj?.[key], item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {onPageChange && onPageSizeChange && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </Card>
    </div>
  )
}
