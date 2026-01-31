import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@renderer/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'

interface SearchableSelectProps {
  value?: string | null // ✅ Allow undefined and null
  onValueChange: (value: string) => void // ✅ Changed to match your usage
  options: { label: string; value: string }[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string // ✅ Changed to match your usage
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onValueChange, // ✅ Updated prop name
  options,
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  emptyText = 'No option found.', // ✅ Updated prop name
  className,
  disabled = false
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)

  // ✅ Handle null/undefined values
  const normalizedValue = value || ''
  const selectedOption = options.find((option) => option.value === normalizedValue)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between bg-background border-border', className)}
          disabled={disabled}
        >
          {selectedOption ? (
            selectedOption.label
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label} // Use label for search filtering
                  onSelect={() => {
                    // ✅ Allow deselection by clicking again
                    onValueChange(option.value === normalizedValue ? '' : option.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      normalizedValue === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
