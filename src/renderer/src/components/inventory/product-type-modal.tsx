import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@renderer/components/ui/dialog'
import { Package, Ruler } from 'lucide-react'

interface ProductTypeModalProps {
  open: boolean
  onClose: () => void
  onSelectType: (type: 'SIMPLE' | 'RAW_MATERIAL') => void
}

export function ProductTypeModal({ open, onClose, onSelectType }: ProductTypeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Select Product Type</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Simple Product */}
          <button
            onClick={() => onSelectType('SIMPLE')}
            className="flex flex-col items-center gap-3 p-6 border-2 border-border rounded-lg hover:border-[#4ade80] hover:bg-[#4ade80]/5 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-[#4ade80]/20 transition-colors">
              <Package className="w-8 h-8 text-blue-500 group-hover:text-[#4ade80]" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Simple Product</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Box packed items sold by quantity
              </p>
            </div>
          </button>

          {/* Raw Material */}
          <button
            onClick={() => onSelectType('RAW_MATERIAL')}
            className="flex flex-col items-center gap-3 p-6 border-2 border-border rounded-lg hover:border-[#4ade80] hover:bg-[#4ade80]/5 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-[#4ade80]/20 transition-colors">
              <Ruler className="w-8 h-8 text-purple-500 group-hover:text-[#4ade80]" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">Raw Material</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Fabric by meter (e.g., Gents suits)
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
