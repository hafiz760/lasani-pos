import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Printer } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@renderer/components/ui/table'
import { Badge } from '@renderer/components/ui/badge'
import { exportToPDF } from '@renderer/lib/export'
import { printContent } from '@renderer/lib/print-utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

type ReportRow = {
  id: string
  transactionDate: string
  description: string
  account: string
  entryType: string
  totalAmount: number
  referenceType: string
}

type ReportTotals = {
  totalCredit: number
  totalDebit: number
  netChange: number
}

type ReportPayload = {
  rangeLabel: string
  rows: ReportRow[]
  totals: ReportTotals
}

export default function TransactionsPrintPreviewPage() {
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportPayload | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('transactionsReportPreview')
    if (!stored) return
    try {
      setReport(JSON.parse(stored))
    } catch {
      setReport(null)
    }
  }, [])

  const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toLocaleString()}`

  const printHtml = useMemo(() => {
    if (!report) return ''
    const totals = report.totals
    return `
      <div style="font-family: 'Inter', sans-serif; padding: 20px; color: #111;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">
          <div>
            <h2 style="margin: 0; font-size: 20px;">Transactions Report</h2>
            <p style="margin: 4px 0 0; color: #6b7280; font-size: 12px;">Range: ${report.rangeLabel}</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #6b7280;">
            <div>Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0;">
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Total Debit</div>
            <div style="font-size: 16px; font-weight: 700;">${formatCurrency(
              totals.totalDebit
            )}</div>
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Total Credit</div>
            <div style="font-size: 16px; font-weight: 700;">${formatCurrency(
              totals.totalCredit
            )}</div>
          </div>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Net Cash</div>
            <div style="font-size: 16px; font-weight: 700;">${formatCurrency(totals.netChange)}</div>
          </div>
        </div>

        <div style="margin-top: 20px;">
          <h3 style="margin: 0 0 8px; font-size: 14px;">Transactions</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
              <tr style="background: #f3f4f6; text-align: left;">
                <th style="padding: 8px;">Date</th>
                <th style="padding: 8px;">Description</th>
                <th style="padding: 8px;">Account</th>
                <th style="padding: 8px;">Type</th>
                <th style="padding: 8px; text-align: right;">Amount</th>
                <th style="padding: 8px;">Reference</th>
              </tr>
            </thead>
            <tbody>
              ${report.rows
                .map(
                  (row) => `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 8px;">${format(
                        new Date(row.transactionDate),
                        'MMM dd, yyyy HH:mm'
                      )}</td>
                      <td style="padding: 8px;">${row.description}</td>
                      <td style="padding: 8px;">${row.account}</td>
                      <td style="padding: 8px;">${row.entryType}</td>
                      <td style="padding: 8px; text-align: right;">${formatCurrency(
                        row.totalAmount
                      )}</td>
                      <td style="padding: 8px;">${row.referenceType}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `
  }, [report])

  const handleDownloadPdf = () => {
    if (!report?.rows.length) {
      toast.error('No report data to download')
      return
    }

    const exportData = report.rows.map((row) => ({
      Date: format(new Date(row.transactionDate), 'MMM dd, yyyy HH:mm'),
      Description: row.description,
      Account: row.account,
      Type: row.entryType,
      Amount: formatCurrency(row.totalAmount),
      Reference: row.referenceType
    }))

    exportData.push({
      Date: 'TOTAL',
      Description: '',
      Account: '',
      Type: '',
      Amount: `Debit ${formatCurrency(report.totals.totalDebit)} | Credit ${formatCurrency(
        report.totals.totalCredit
      )}`,
      Reference: ''
    })

    exportToPDF(
      exportData,
      `transactions_report_${format(new Date(), 'yyyyMMdd')}`,
      `Transactions Report (${report.rangeLabel})`
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 w-11 rounded-xl border-border"
          onClick={() => navigate('/dashboard/accounting/transactions')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Transactions Report</h1>
          <p className="text-sm text-muted-foreground">Preview, print, or download the report.</p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Report Preview
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="h-10 border-border" onClick={handleDownloadPdf}>
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button
              className="h-10 bg-[#4ade80] text-black hover:bg-[#22c55e]"
              onClick={() => {
                if (!printHtml) return
                void printContent({ title: 'Transactions Report', content: printHtml })
              }}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!report ? (
            <div className="text-center text-muted-foreground py-10">
              No report data found. Please generate the report again.
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-4 bg-muted/20">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Total Debit
                    </div>
                    <div className="text-lg font-black text-emerald-600">
                      {formatCurrency(report.totals.totalDebit)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-4 bg-muted/20">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Total Credit
                    </div>
                    <div className="text-lg font-black text-red-500">
                      {formatCurrency(report.totals.totalCredit)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-4 bg-muted/20">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      Net Cash
                    </div>
                    <div className="text-lg font-black text-foreground">
                      {formatCurrency(report.totals.netChange)}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.rows.length ? (
                        report.rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              {format(new Date(row.transactionDate), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {row.description}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.account}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-border text-[10px] uppercase text-muted-foreground"
                              >
                                {row.entryType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <span
                                className={
                                  row.entryType === 'DEBIT' ? 'text-emerald-600' : 'text-red-500'
                                }
                              >
                                {row.entryType === 'DEBIT' ? '' : '-'}
                                {formatCurrency(row.totalAmount)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs uppercase text-muted-foreground">
                              {row.referenceType}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No transactions found for this range.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
