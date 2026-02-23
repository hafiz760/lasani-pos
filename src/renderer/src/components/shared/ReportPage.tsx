'use client'

import React, { ReactNode, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'
import {
    endOfDay,
    endOfMonth,
    endOfWeek,
    format,
    startOfDay,
    startOfMonth,
    startOfWeek
} from 'date-fns'
import { ArrowLeft, CalendarIcon, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Calendar } from '@renderer/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Label } from '@renderer/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { ScrollArea } from '@renderer/components/ui/scroll-area'

export interface SummaryCardProps {
    label: string
    value: string | number
    colorClassName?: string
    description?: string
}

interface ReportPageProps {
    title: string
    description: string
    icon: React.ElementType
    onGenerate: (range: DateRange) => void | Promise<void>
    onDownloadPdf: () => void
    isLoading?: boolean
    summaryCards?: SummaryCardProps[]
    children: ReactNode
    initialRangeType?: 'today' | 'week' | 'month'
    extraActions?: ReactNode
}

export const quickRanges = [
    {
        label: 'Today',
        getRange: () => {
            const today = new Date()
            return { from: startOfDay(today), to: endOfDay(today) }
        }
    },
    {
        label: 'This Week',
        getRange: () => {
            const today = new Date()
            return {
                from: startOfWeek(today, { weekStartsOn: 1 }),
                to: endOfWeek(today, { weekStartsOn: 1 })
            }
        }
    },
    {
        label: 'This Month',
        getRange: () => {
            const today = new Date()
            return { from: startOfMonth(today), to: endOfMonth(today) }
        }
    }
]

export function ReportPage({
    title,
    description,
    icon: Icon,
    onGenerate,
    onDownloadPdf,
    isLoading = false,
    summaryCards = [],
    children,
    initialRangeType = 'month',
    extraActions
}: ReportPageProps) {
    const navigate = useNavigate()
    const [range, setRange] = useState<DateRange | undefined>()
    const [reportRange, setReportRange] = useState<DateRange | undefined>()
    const [selectedRangeLabel, setSelectedRangeLabel] = useState<string>('')

    useEffect(() => {
        const rangeIndex = initialRangeType === 'today' ? 0 : initialRangeType === 'week' ? 1 : 2
        const initialRange = quickRanges[rangeIndex].getRange()
        setRange(initialRange)
        setReportRange(initialRange)
        setSelectedRangeLabel(quickRanges[rangeIndex].label)
        void onGenerate(initialRange)
    }, [])

    const rangeLabel = useMemo(() => {
        if (!range?.from) return 'Select dates'
        const fromLabel = format(range.from, 'MMM dd, yyyy')
        if (!range.to || startOfDay(range.from).getTime() === startOfDay(range.to).getTime()) {
            return fromLabel
        }
        return `${fromLabel} - ${format(range.to, 'MMM dd, yyyy')}`
    }, [range])

    const activeRangeLabel = useMemo(() => {
        if (!reportRange?.from) return ''
        const fromLabel = format(reportRange.from, 'MMM dd, yyyy')
        if (!reportRange.to || startOfDay(reportRange.from).getTime() === startOfDay(reportRange.to).getTime()) {
            return fromLabel
        }
        return `${fromLabel} - ${format(reportRange.to, 'MMM dd, yyyy')}`
    }, [reportRange])

    const handleGenerate = () => {
        if (!range?.from) return
        const normalized = {
            from: startOfDay(range.from),
            to: endOfDay(range.to || range.from)
        }
        setReportRange(normalized)
        void onGenerate(normalized)
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    className="h-11 w-11 rounded-xl border-border"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-11 w-11 rounded-xl bg-[#E8705A]/10 text-[#E8705A] flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">{title}</h1>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-border">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
                    <div className="space-y-1">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                            Report Filters
                        </CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            className="h-10 border-border"
                            onClick={handleGenerate}
                            disabled={isLoading}
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            {isLoading ? 'Generating...' : 'Generate Report'}
                        </Button>
                        <Button
                            className="h-10 bg-[#E8705A] text-white hover:bg-[#D4604C]"
                            onClick={onDownloadPdf}
                            disabled={isLoading}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                        {extraActions}
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">
                                Date Range
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="h-11 border-border min-w-[240px] justify-start px-4">
                                        <CalendarIcon className="w-4 h-4 mr-3 text-muted-foreground" />
                                        <span className="font-semibold">{rangeLabel}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        selected={range}
                                        onSelect={(newRange) => {
                                            setRange(newRange)
                                            setSelectedRangeLabel('')
                                        }}
                                        numberOfMonths={2}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {quickRanges.map((quick) => (
                                <Button
                                    key={quick.label}
                                    type="button"
                                    variant={selectedRangeLabel === quick.label ? 'default' : 'outline'}
                                    className={`h-9 px-4 text-xs font-bold transition-all duration-200 ${selectedRangeLabel === quick.label
                                            ? 'bg-[#E8705A] text-white hover:bg-[#D4604C] border-transparent shadow-sm'
                                            : 'border-border hover:bg-muted text-muted-foreground'
                                        }`}
                                    onClick={() => {
                                        const nextRange = quick.getRange()
                                        setRange(nextRange)
                                        setReportRange(nextRange)
                                        setSelectedRangeLabel(quick.label)
                                        void onGenerate(nextRange)
                                    }}
                                >
                                    {quick.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            {summaryCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {summaryCards.map((card, idx) => (
                        <Card key={idx} className="border-border overflow-hidden group">
                            <CardContent className="p-5 relative">
                                <div className="text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-wider">
                                    {card.label}
                                </div>
                                <div className={`text-2xl font-black ${card.colorClassName || 'text-foreground'}`}>
                                    {card.value}
                                </div>
                                {card.description && (
                                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                                        {card.description}
                                    </p>
                                )}
                                <div className="absolute top-0 right-0 w-1 h-full bg-border group-hover:bg-[#E8705A] transition-colors" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Main Content (Table) */}
            <Card className="border-border overflow-hidden">
                <CardHeader className="border-b border-border bg-muted/20 py-3">
                    <CardTitle className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center justify-between">
                        <span>Detailed Records</span>
                        <span className="text-[#E8705A] lowercase font-medium italic">
                            Range: {activeRangeLabel}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-fit max-h-[600px]">
                        {children}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}
