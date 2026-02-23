import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { printContent } from '@renderer/lib/print-utils'
import { toast } from 'sonner'

export default function SalesReportPrintPreviewPage() {
  const navigate = useNavigate()
  const [reportHtml, setReportHtml] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('salesReportPreview') || ''
    setReportHtml(stored)
  }, [])

  const handlePrint = () => {
    if (!reportHtml) {
      toast.error('No report data to print.')
      return
    }
    void printContent({ title: 'Sales Report', content: reportHtml })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 w-11 rounded-xl border-border"
            onClick={() => navigate('/dashboard/reports/sales-report')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Sales Report Preview</h1>
            <p className="text-sm text-muted-foreground">Review the report and print when ready.</p>
          </div>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Report Preview
          </CardTitle>
          <Button
            className="bg-[#E8705A] text-white hover:bg-[#D4604C] font-black h-10"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </CardHeader>
        <CardContent>
          {reportHtml ? (
            <ScrollArea className="max-h-[70vh]">
              <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              No report data found. Please generate the report again.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
