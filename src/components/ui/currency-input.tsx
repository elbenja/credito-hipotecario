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

const formatNumberWithCommas = (value: string) => {
  // Handle empty input
  if (!value) return ''
  
  // Split into integer and decimal parts
  const parts = value.split('.')
  const integerPart = parts[0]
  const decimalPart = parts.length > 1 ? '.' + parts[1] : ''
  
  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  
  return formattedInteger + decimalPart
}

const unformatValue = (value: string) => {
  return value.replace(/[^\d.]/g, '')
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput({ value, onChange, currency, ...props }, ref) {
    const [displayValue, setDisplayValue] = React.useState('')
    const [isFocused, setIsFocused] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    
    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)
    
    // Update display value when the external value changes
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(value ? formatValue(value, currency) : '')
      } else {
        // When focused, show with commas but no currency symbol
        setDisplayValue(value ? formatNumberWithCommas(value) : '')
      }
    }, [value, currency, isFocused])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value
      const cursorPosition = e.target.selectionStart || 0
      
      // Count commas before cursor position to adjust later
      const commasBefore = (rawValue.substring(0, cursorPosition).match(/,/g) || []).length
      
      // Remove commas and non-numeric characters (except decimal)
      const numericValue = rawValue.replace(/[^\d.]/g, '')
      
      // Allow only one decimal point
      if ((numericValue.match(/\./g) || []).length > 1) return
      
      // Allow only two decimal places
      const parts = numericValue.split('.')
      if (parts[1] && parts[1].length > 2) return

      // Format with commas for display
      const formattedValue = formatNumberWithCommas(numericValue)
      
      // Update state and notify parent
      setDisplayValue(formattedValue)
      onChange(numericValue)
      
      // Calculate new cursor position after formatting
      setTimeout(() => {
        if (inputRef.current) {
          const newCommasBefore = (formattedValue.substring(0, cursorPosition).match(/,/g) || []).length
          const cursorOffset = newCommasBefore - commasBefore
          const newPosition = cursorPosition + cursorOffset
          inputRef.current.setSelectionRange(newPosition, newPosition)
        }
      }, 0)
    }

    const handleFocus = () => {
      setIsFocused(true)
      // Show with commas but no currency symbol when focused
      const formattedValue = formatNumberWithCommas(unformatValue(value))
      setDisplayValue(formattedValue)
    }

    const handleBlur = () => {
      setIsFocused(false)
      // Show fully formatted value when blurred
      setDisplayValue(value ? formatValue(value, currency) : '')
    }

    return (
      <Input
        {...props}
        ref={inputRef}
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
