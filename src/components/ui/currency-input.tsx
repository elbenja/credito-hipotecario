
import React, { useState, useEffect } from "react"
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

export const CurrencyInput = ({
  value,
  onChange,
  currency,
  ...props
}: CurrencyInputProps) => {
  const [displayValue, setDisplayValue] = useState('')
  
  useEffect(() => {
    if (value) {
      setDisplayValue(formatValue(value, currency))
    } else {
      setDisplayValue('')
    }
  }, [value, currency])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const unformatted = unformatValue(e.target.value)
    onChange(unformatted)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  return (
    <Input
      {...props}
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
    />
  )
}
