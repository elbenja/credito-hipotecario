import { useState, useEffect } from "react"
import { useFormContext, FieldPath, FieldValues } from "react-hook-form"
import { useTranslation } from "react-i18next"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  convertTermToMonths, 
  formatTermForInput 
} from "@/utils/term-conversion"

interface TermMonthsFieldProps<T extends FieldValues> {
  name: FieldPath<T>
  label?: string
  placeholder?: string
  className?: string
  required?: boolean
}

export function TermMonthsField<T extends FieldValues>({
  name,
  label,
  placeholder = "20.0",
  className = "",
  required = false
}: TermMonthsFieldProps<T>) {
  const { t } = useTranslation(['mortgages', 'global', 'components'])
  const form = useFormContext<T>()
  
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const [displayConversion, setDisplayConversion] = useState<string>("")
        const [displayValue, setDisplayValue] = useState<string>("")
        const [isOpen, setIsOpen] = useState(false)
        const [yearsValue, setYearsValue] = useState("")
        const [monthsValue, setMonthsValue] = useState("")
        const [error, setError] = useState("")
        
        // Initialize display values from field value
        useEffect(() => {
          if (field.value && field.value > 0) {
            const yearsDisplay = formatTermForInput(field.value)
            setDisplayValue(yearsDisplay)
            setDisplayConversion(`${field.value} months`)
            setYearsValue(yearsDisplay)
            setMonthsValue(field.value.toString())
          } else {
            setDisplayValue("")
            setDisplayConversion("")
            setYearsValue("")
            setMonthsValue("")
          }
        }, [field.value])

        const handleYearsChange = (value: string) => {
          setYearsValue(value)
          const years = parseFloat(value)
          
          if (!isNaN(years)) {
            if (years < 5 || years > 30) {
              setError("Outside the range")
            } else {
              setError("")
              const months = convertTermToMonths(years)
              setMonthsValue(months.toString())
              field.onChange(months)
              form.trigger(name)
            }
          } else if (value === "") {
            setError("")
            setMonthsValue("")
            field.onChange(0)
          }
        }

        const handleMonthsChange = (value: string) => {
          setMonthsValue(value)
          const months = parseInt(value)
          
          if (!isNaN(months)) {
            const years = months / 12
            if (years < 5 || years > 30) {
              setError("Outside the range")
            } else {
              setError("")
              setYearsValue((years).toFixed(1))
              field.onChange(months)
              form.trigger(name)
            }
          } else if (value === "") {
            setError("")
            setYearsValue("")
            field.onChange(0)
          }
        }

        const handleOpenChange = (open: boolean) => {
          setIsOpen(open)
          if (open) {
            // Initialize popover values when opening
            if (field.value && field.value > 0) {
              setYearsValue(formatTermForInput(field.value))
              setMonthsValue(field.value.toString())
            }
          }
        }

        return (
          <FormItem className={className}>
            <FormLabel>
              {label || t('mortgage.term', { ns: 'mortgages' })}
              {required && <span className="text-red-500 ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <Popover open={isOpen} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                  <Input
                    value={displayValue}
                    placeholder={placeholder}
                    readOnly
                    className="cursor-pointer"
                    onClick={() => setIsOpen(true)}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Term Duration</div>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Years</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="5"
                          max="30"
                          placeholder="20.0"
                          value={yearsValue}
                          onChange={(e) => handleYearsChange(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div className="pt-6 text-muted-foreground">=</div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Months</label>
                        <Input
                          type="number"
                          min="60"
                          max="360"
                          placeholder="240"
                          value={monthsValue}
                          onChange={(e) => handleMonthsChange(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {error && (
                      <div className="text-xs text-red-500">{error}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Range: 5-30 years (60-360 months)
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </FormControl>
            <div className="text-xs text-muted-foreground">
              {displayConversion && (
                <span className="ml-2">
                  {displayConversion}
                </span>
              )}
            </div>
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
} 