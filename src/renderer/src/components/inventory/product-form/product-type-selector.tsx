import { Package, Ruler, Layers } from 'lucide-react'

interface ProductTypeSelectorProps {
  value: 'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET'
  onChange: (value: 'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET') => void
}

export function ProductTypeSelector({ value, onChange }: ProductTypeSelectorProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Select Product Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Simple Product */}
        <button
          type="button"
          onClick={() => onChange('SIMPLE')}
          className={`group flex flex-col items-center gap-4 p-6 border-2 rounded-xl transition-all ${
            value === 'SIMPLE'
              ? 'border-[#4ade80] bg-[#4ade80]/10'
              : 'border-border hover:border-[#4ade80]/50 hover:bg-[#4ade80]/5'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              value === 'SIMPLE' ? 'bg-[#4ade80]/20' : 'bg-blue-500/10 group-hover:bg-[#4ade80]/20'
            }`}
          >
            <Package
              className={`w-7 h-7 transition-colors ${
                value === 'SIMPLE' ? 'text-[#4ade80]' : 'text-blue-500 group-hover:text-[#4ade80]'
              }`}
            />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-bold">Simple Product</h3>
            <p className="text-xs text-muted-foreground">Standard items, accessories</p>
          </div>
        </button>

        {/* Raw Material */}
        <button
          type="button"
          onClick={() => onChange('RAW_MATERIAL')}
          className={`group flex flex-col items-center gap-4 p-6 border-2 rounded-xl transition-all ${
            value === 'RAW_MATERIAL'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-border hover:border-amber-500/50 hover:bg-amber-500/5'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              value === 'RAW_MATERIAL' ? 'bg-amber-500/20' : 'bg-amber-500/10'
            }`}
          >
            <Ruler className="w-7 h-7 text-amber-500" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-bold text-amber-600">Raw Material</h3>
            <p className="text-xs text-muted-foreground">Fabric with meter calculations</p>
          </div>
        </button>

        {/* Combo Set */}
        <button
          type="button"
          onClick={() => onChange('COMBO_SET')}
          className={`group flex flex-col items-center gap-4 p-6 border-2 rounded-xl transition-all ${
            value === 'COMBO_SET'
              ? 'border-purple-500 bg-purple-500/10'
              : 'border-border hover:border-purple-500/50 hover:bg-purple-500/5'
          }`}
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              value === 'COMBO_SET' ? 'bg-purple-500/20' : 'bg-purple-500/10'
            }`}
          >
            <Layers className="w-7 h-7 text-purple-500" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-bold text-purple-600">Combo Set</h3>
            <p className="text-xs text-muted-foreground">Multi-piece sets (3-piece)</p>
          </div>
        </button>
      </div>
    </div>
  )
}
