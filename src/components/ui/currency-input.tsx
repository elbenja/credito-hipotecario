import * as React from "react"
import { Input } from "./input"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
  currency: "PEN" | "USD"
}

const formatValue = (value: string, currency: string) => {
  // Remove any non-digit characters except decimal point
  const numericValue = value.replace(/[^\d.]/g, '')
  
  // Parse the numeric value
  const number = parseFloat(numericValue)
  
  // Return empty string if not a valid number
  if (isNaN(number)) return ''
  
  // Format the number with the appropriate currency symbol
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'PEN' ? 'PEN' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  const formatted = formatter.format(number)
  return currency === 'PEN' ? formatted.replace('PEN', 'S/') : formatted
}

const unformatValue = (value: string) => {
  return value.replace(/[^\d.]/g, '')
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onChange, currency, ...props }, ref) {
    const [displayValue, setDisplayValue] = React.useState('')
    const [isFocused, setIsFocused] = React.useState(false)
    
    // Update display value when the external value changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value ? formatValue(value, currency) : '')
      }
    }, [value, currency, isFocused])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      const numericValue = rawValue.replace(/[^\d.]/g, '')
      
      // Allow only one decimal point
      if ((numericValue.match(/\./g) || []).length > 1) return
      
      // Allow only two decimal places
      const parts = numericValue.split('.')
      if (parts[1] && parts[1].length > 2) return

      setDisplayValue(rawValue)
      onChange(numericValue)
    }

    const handleFocus = () => {
      setIsFocused(true)
      // Show unformatted value when focused
      setDisplayValue(unformatValue(value))
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Show formatted value when blurred
      setDisplayValue(value ? formatValue(value, currency) : '')
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
