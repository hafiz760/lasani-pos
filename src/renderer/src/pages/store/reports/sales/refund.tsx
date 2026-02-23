'use client'

import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@renderer/components/ui/badge'
import { Button } from '@renderer/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@renderer/components/ui/select'

interface SaleItem {
    productName?: string
    product?: { name?: string }
    quantity: number
    sellingPrice?: number
    price?: number
    totalAmount: number
    productKind?: 'SIMPLE' | 'RAW_MATERIAL' | 'COMBO_SET'
    baseUnit?: string
    sellByUnit?: string
}

interface SaleDetail {
    _id: string
    invoiceNumber?: string
    createdAt: string
    saleDate?: string
    items: SaleItem[]
    totalAmount: number
    paidAmount?: number
    refundedAmount?: number
    refundHistory?: Array<{
        items: Array<{ product: string; quantity: number; amount: number }>
    }>
}

export default function RefundPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [sale, setSale] = useState<SaleDetail | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [refundMethod, setRefundMethod] = useState('Cash')
    const [refundReason, setRefundReason] = useState('')
    const [refundItems, setRefundItems] = useState<Record<string, number>>({})
    const [isRefunding, setIsRefunding] = useState(false)

    const loadSale = async () => {
        if (!id) return
        setIsLoading(true)
        try {
            const result = await window.api.sales.getById(id)
            if (result.success) {
                setSale(result.data)
                const defaults: Record<string, number> = {}
                result.data.items.forEach((item: any) => {
                    defaults[String(item.product)] = 0
                })
                setRefundItems(defaults)
            } else {
                toast.error(result.error || 'Sale not found')
                navigate(-1)
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to load sale')
            navigate(-1)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadSale()
    }, [id])

    const refundedQtyByProduct = useMemo(() => {
        const map = new Map<string, number>()
        sale?.refundHistory?.forEach((record) => {
            record.items?.forEach((item) => {
                const key = String(item.product)
                map.set(key, (map.get(key) || 0) + item.quantity)
            })
        })
        return map
    }, [sale])

    const refundableAmount = useMemo(() => {
        if (!sale) return 0
        // Now refundable amount is the total value of remaining items in the sale
        return sale.totalAmount || 0
    }, [sale])

    const refundTotal = useMemo(() => {
        if (!sale) return 0
        return sale.items.reduce((sum, item: any) => {
            const qty = refundItems[String(item.product)] || 0
            const price = item.sellingPrice || item.price || 0
            return sum + qty * price
        }, 0)
    }, [refundItems, sale])

    const formatCurrency = (value?: number) => `Rs. ${Number(value || 0).toLocaleString()}`

    const getUnitLabel = (item: SaleItem) => {
        if (item.productKind === 'RAW_MATERIAL') {
            return item.baseUnit || 'meter'
        }
        return item.baseUnit || 'pcs'
    }

    const handleRefund = async () => {
        if (!sale) return
        const userStr = localStorage.getItem('user')
        const user = userStr ? JSON.parse(userStr) : null
        if (!user) {
            toast.error('User session not found.')
            return
        }

        const items = Object.entries(refundItems)
            .filter(([_, qty]) => qty > 0)
            .map(([product, quantity]) => ({ product, quantity }))

        if (items.length === 0) {
            toast.error('Select at least one item to refund.')
            return
        }

        if (refundTotal > refundableAmount) {
            toast.error('Refund exceeds paid amount.')
            return
        }

        setIsRefunding(true)
        try {
            const result = await window.api.sales.refund(sale._id, {
                refundItems: items,
                method: refundMethod,
                reason: refundReason || undefined,
                processedBy: user._id || user.id
            })

            if (result.success) {
                toast.success('Refund processed successfully')
                navigate(`/dashboard/reports/sales/${sale._id}`)
            } else {
                toast.error(result.error || 'Failed to process refund')
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to process refund')
        } finally {
            setIsRefunding(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8705A]"></div>
            </div>
        )
    }

    if (!sale) return null

    return (
        <div className="max-w-6xl mx-auto space-y-5 pb-10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-2">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="h-10 w-10 rounded-xl border-border"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                            <RotateCcw className="h-6 w-6 text-[#E8705A]" />
                            Process Refund
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Invoice #{sale.invoiceNumber || sale._id.substring(0, 8)} • Return items from this sale
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="h-10 px-6 border-border hover:bg-muted font-bold text-sm"
                        disabled={isRefunding}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="h-10 px-6 bg-[#E8705A] hover:bg-[#D4604C] text-white shadow-lg shadow-[#E8705A]/10 font-black uppercase tracking-widest text-[10px]"
                        onClick={handleRefund}
                        disabled={refundTotal <= 0 || refundTotal > refundableAmount || isRefunding}
                    >
                        {isRefunding ? (
                            <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="h-3 w-3 mr-2" />
                                Complete Refund
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="space-y-6 px-2">
                {/* Refund Progress Indicator */}
                <Card className="border-border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Refund Session</span>
                                <div className="text-3xl font-black text-[#E8705A] tracking-tighter">
                                    {formatCurrency(refundTotal)}
                                </div>
                            </div>
                            <div className="text-right space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Returnable Item Value (Limit)</span>
                                <div className="text-lg font-bold text-muted-foreground">
                                    {formatCurrency(refundableAmount)}
                                </div>
                            </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border bg-gray-100 shadow-inner p-0.5">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${refundTotal > refundableAmount
                                    ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                                    : refundTotal > 0
                                        ? 'bg-gradient-to-r from-[#E8705A] to-[#ff9b85] shadow-[0_0_8px_rgba(232,112,90,0.3)]'
                                        : 'bg-muted'
                                    }`}
                                style={{
                                    width: `${Math.min(100, (refundTotal / Math.max(1, refundableAmount)) * 100)}%`
                                }}
                            />
                        </div>
                        {refundTotal > refundableAmount && (
                            <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                                <div className="h-7 w-7 bg-red-500 rounded-full flex items-center justify-center text-white text-sm animate-pulse">
                                    ⚠️
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-tighter leading-none">Limit Exceeded</p>
                                    <p className="text-[10px] opacity-80">You cannot refund more than the amount originally paid.</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Items Selection */}
                    <div className="xl:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                Purchase Records
                                <Badge className="bg-muted text-muted-foreground border-border font-bold text-[10px] py-0 h-5">
                                    {sale.items.length} Products
                                </Badge>
                            </h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {sale.items.map((item: any, idx: number) => {
                                const key = String(item.product)
                                const refundedQty = refundedQtyByProduct.get(key) || 0
                                const available = Math.max(0, item.quantity - refundedQty)
                                const currentRefundQty = refundItems[key] || 0
                                const itemRefundAmount = (item.sellingPrice || item.price || 0) * currentRefundQty

                                return (
                                    <Card
                                        key={idx}
                                        className={`group border transition-all duration-300 shadow-sm overflow-hidden ${currentRefundQty > 0
                                            ? 'border-[#E8705A] ring-1 ring-[#E8705A] bg-[#E8705A]/5'
                                            : 'border-border hover:border-gray-400'
                                            } ${available === 0 ? 'opacity-60 grayscale' : ''}`}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0 w-full">
                                                    <h4 className="font-black text-lg text-foreground group-hover:text-[#E8705A] transition-colors leading-tight mb-2">
                                                        {item.productName || item.product?.name}
                                                    </h4>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-0.5">
                                                            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest block italic">Bought</span>
                                                            <span className="font-bold text-base">{item.quantity} <span className="text-xs font-medium text-muted-foreground">{getUnitLabel(item)}</span></span>
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest block italic">Price</span>
                                                            <span className="font-bold text-base">{formatCurrency(item.sellingPrice || item.price || 0)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
                                                        <div className="py-1 px-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[10px] font-bold text-emerald-700">
                                                            Available: {available} {getUnitLabel(item)}
                                                        </div>
                                                        {refundedQty > 0 && (
                                                            <div className="py-1 px-2.5 bg-red-500/5 border border-red-500/10 rounded-lg text-[10px] font-bold text-red-700 italic">
                                                                Returned: {refundedQty}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/30">
                                                    <div className="flex flex-col items-center md:items-end gap-1.5">
                                                        <Label className="text-[9px] font-black uppercase text-muted-foreground block text-center">Return Qty</Label>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={available}
                                                            value={refundItems[key] || ''}
                                                            onChange={(e) => {
                                                                const next = Number(e.target.value || 0)
                                                                setRefundItems((prev) => ({
                                                                    ...prev,
                                                                    [key]: Math.min(available, Math.max(0, next))
                                                                }))
                                                            }}
                                                            className={`h-11 w-20 text-center text-lg font-black transition-all bg-white shadow-sm ${currentRefundQty > 0 ? 'border-[#E8705A] focus-visible:ring-[#E8705A]' : ''
                                                                }`}
                                                            placeholder="0"
                                                            disabled={available === 0}
                                                        />
                                                    </div>
                                                    {currentRefundQty > 0 && (
                                                        <div className="text-right flex-1 md:flex-none animate-in fade-in slide-in-from-right-4">
                                                            <div className="text-[9px] font-black text-[#E8705A] uppercase tracking-widest mb-0.5 italic text-center">Credit</div>
                                                            <div className="text-base font-black text-center">{formatCurrency(itemRefundAmount)}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right Column: Calculations and Confirmation */}
                    <div className="space-y-5">
                        <Card className="border-border shadow-lg bg-background overflow-hidden sticky top-6">
                            <CardHeader className="bg-muted/30 p-4 border-b border-border">
                                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                    Return Summary
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {refundTotal > 0 ? (
                                    <div className="space-y-4">
                                        <div className="space-y-3 pr-1">
                                            {sale.items
                                                .filter((item: any) => {
                                                    const key = String(item.product)
                                                    return (refundItems[key] || 0) > 0
                                                })
                                                .map((item: any, idx: number) => {
                                                    const key = String(item.product)
                                                    const qty = refundItems[key]
                                                    const amount = (item.sellingPrice || item.price || 0) * qty
                                                    return (
                                                        <div key={idx} className="flex justify-between items-start text-xs group animate-in fade-in slide-in-from-bottom-1">
                                                            <div className="flex flex-col">
                                                                <span className="font-extrabold text-foreground leading-none mb-1">{item.productName || item.product?.name}</span>
                                                                <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter italic">
                                                                    {qty} Units × {formatCurrency(item.sellingPrice || item.price || 0)}
                                                                </span>
                                                            </div>
                                                            <span className="font-black text-[#E8705A]">{formatCurrency(amount)}</span>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                        <div className="border-t-2 border-dashed border-border pt-4 space-y-4">
                                            <div className="flex justify-between items-center bg-[#E8705A]/5 p-3 rounded-lg border border-[#E8705A]/10">
                                                <span className="text-sm font-black uppercase tracking-tighter">Gross Return</span>
                                                <span className="text-2xl font-black text-[#E8705A]">{formatCurrency(refundTotal)}</span>
                                            </div>

                                            {/* Refund Breakdown */}
                                            {refundTotal > 0 && (
                                                <div className="space-y-2 px-1">
                                                    {(() => {
                                                        const pending = Math.max(0, (sale.totalAmount || 0) - (sale.paidAmount || 0))
                                                        const debtRed = Math.min(refundTotal, pending)
                                                        const cashPay = refundTotal - debtRed
                                                        return (
                                                            <>
                                                                {debtRed > 0 && (
                                                                    <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                                                                        <span>Debt Adjustment (Credit)</span>
                                                                        <span>-{formatCurrency(debtRed)}</span>
                                                                    </div>
                                                                )}
                                                                {cashPay > 0 ? (
                                                                    <div className="flex justify-between text-[10px] font-black text-emerald-600">
                                                                        <span>Payout Amount</span>
                                                                        <span>{formatCurrency(cashPay)}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-[9px] text-center italic text-muted-foreground pt-1">
                                                                        No cash payout (Full balance adjustment)
                                                                    </div>
                                                                )}
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            )}

                                            {/* Additional Refund Details Form */}
                                            <div className="space-y-3 mt-4 pt-3 border-t border-border/50">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-0.5">Payment Method</Label>
                                                    <Select value={refundMethod} onValueChange={setRefundMethod}>
                                                        <SelectTrigger className="h-11 bg-muted/20 border-border font-bold text-sm focus:ring-0">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-popover border-border text-popover-foreground">
                                                            <SelectItem value="Cash" className="font-bold py-2 text-xs">Cash Payment</SelectItem>
                                                            <SelectItem value="Bank Transfer" className="font-bold py-2 text-xs">Digital Transfer</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-0.5">Reason for Return</Label>
                                                    <Input
                                                        value={refundReason}
                                                        onChange={(e) => setRefundReason(e.target.value)}
                                                        className="h-11 bg-muted/20 border-border font-medium text-xs focus:ring-0"
                                                        placeholder="Defect, Wrong item, etc..."
                                                    />
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full h-12 bg-[#E8705A] hover:bg-[#D4604C] text-white shadow-lg shadow-[#E8705A]/20 font-black uppercase tracking-widest text-xs mt-2"
                                                onClick={handleRefund}
                                                disabled={refundTotal <= 0 || refundTotal > refundableAmount || isRefunding}
                                            >
                                                {isRefunding ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                                        Processing...
                                                    </div>
                                                ) : (
                                                    <>
                                                        <RotateCcw className="h-4 w-4 mr-2" />
                                                        Complete Return
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-10 text-center text-muted-foreground border-2 border-dashed border-muted/50 rounded-xl">
                                        <div className="h-12 w-12 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <RotateCcw className="h-6 w-6 opacity-20" />
                                        </div>
                                        <h4 className="font-black text-sm text-foreground mb-1 uppercase tracking-tighter">Basket is Empty</h4>
                                        <p className="text-[10px] px-6 leading-relaxed font-medium">Select items from the left to begin.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
