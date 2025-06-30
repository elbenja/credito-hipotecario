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
        const [rawYearsValue, setRawYearsValue] = useState("")
        const [rawMonthsValue, setRawMonthsValue] = useState("")
        const [error, setError] = useState("")
        
        // Initialize display values from field value
        useEffect(() => {
          if (field.value && field.value > 0) {
            const yearsDisplay = formatTermForInput(field.value)
            setDisplayValue(yearsDisplay)
            setDisplayConversion(`${field.value} ${t('term_months_field.months_label', { ns: 'components' })}`)
            // Only update raw values if they're empty (initial load)
            if (!rawYearsValue) {
              setRawYearsValue(yearsDisplay)
            }
            if (!rawMonthsValue) {
              setRawMonthsValue(field.value.toString())
            }
          } else {
            setDisplayValue("")
            setDisplayConversion("")
            setRawYearsValue("")
            setRawMonthsValue("")
          }
        }, [field.value])

        const handleYearsChange = (value: string) => {
          setRawYearsValue(value)
          const years = parseFloat(value)
          
          if (!isNaN(years)) {
            if (years < 5 || years > 30) {
              setError(t('term_months_field.range_error', { ns: 'components' }))
            } else {
              setError("")
              const months = convertTermToMonths(years)
              setRawMonthsValue(months.toString())
              field.onChange(months)
              form.trigger(name)
            }
          } else if (value === "") {
            setError("")
            setRawMonthsValue("")
            field.onChange(0)
          }
        }

        const handleYearsBlur = () => {
          const years = parseFloat(rawYearsValue)
          if (!isNaN(years) && years >= 5 && years <= 30) {
            // Format the value on blur
            const formattedValue = formatTermForInput(convertTermToMonths(years))
            setRawYearsValue(formattedValue)
          } else if (rawYearsValue.endsWith('.')) {
            // Auto-complete trailing decimal (e.g., "20." becomes "20.0")
            const baseValue = rawYearsValue.slice(0, -1)
            const years = parseFloat(baseValue)
            if (!isNaN(years) && years >= 5 && years <= 30) {
              const formattedValue = years.toFixed(1)
              setRawYearsValue(formattedValue)
              const months = convertTermToMonths(years)
              setRawMonthsValue(months.toString())
              field.onChange(months)
              form.trigger(name)
              setError("")
            }
          }
        }

        const handleMonthsChange = (value: string) => {
          setRawMonthsValue(value)
          const months = parseInt(value)
          
          if (!isNaN(months)) {
            const years = months / 12
            if (years < 5 || years > 30) {
              setError(t('term_months_field.range_error', { ns: 'components' }))
            } else {
              setError("")
              setRawYearsValue((years).toFixed(1))
              field.onChange(months)
              form.trigger(name)
            }
          } else if (value === "") {
            setError("")
            setRawYearsValue("")
            field.onChange(0)
          }
        }

        const handleMonthsBlur = () => {
          const months = parseInt(rawMonthsValue)
          if (!isNaN(months) && months >= 60 && months <= 360) {
            // Format the years value when months input loses focus
            const years = months / 12
            const formattedYears = formatTermForInput(months)
            setRawYearsValue(formattedYears)
          }
        }

        const handleOpenChange = (open: boolean) => {
          setIsOpen(open)
          if (open) {
            // Initialize popover values when opening
            if (field.value && field.value > 0) {
              setRawYearsValue(formatTermForInput(field.value))
              setRawMonthsValue(field.value.toString())
            }
          } else {
            // When closing popover, update the main display
            if (field.value && field.value > 0) {
              const formattedDisplay = formatTermForInput(field.value)
              setDisplayValue(formattedDisplay)
              setDisplayConversion(`${field.value} ${t('term_months_field.months_label', { ns: 'components' })}`)
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
                    className="cursor-pointer text-left"
                    onClick={() => setIsOpen(true)}
                  />
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    {/* <div className="text-sm font-medium">{t('term_months_field.title', { ns: 'components' })}</div> */}
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">{t('term_months_field.years_label', { ns: 'components' })}</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="5"
                          max="30"
                          placeholder="20.0"
                          value={rawYearsValue}
                          onChange={(e) => handleYearsChange(e.target.value)}
                          onBlur={handleYearsBlur}
                          className="mt-1"
                        />
                      </div>
                      <div className="pt-6 text-muted-foreground">=</div>
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">{t('term_months_field.months_label', { ns: 'components' })}</label>
                        <Input
                          type="number"
                          min="60"
                          max="360"
                          placeholder="240"
                          value={rawMonthsValue}
                          onChange={(e) => handleMonthsChange(e.target.value)}
                          onBlur={handleMonthsBlur}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    {error && (
                      <div className="text-xs text-red-500">{error}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {t('term_months_field.range_info', { ns: 'components' })}
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