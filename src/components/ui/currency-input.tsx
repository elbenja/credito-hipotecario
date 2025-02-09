import React, { useState, useEffect, useRef } from "react"
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
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const cursorPositionRef = useRef<number | null>(null)
  
  useEffect(() => {
    if (value) {
      const newDisplayValue = isFocused ? unformatValue(value) : formatValue(value, currency)
      setDisplayValue(newDisplayValue)
      
      // Restore cursor position after value update if input is focused
      if (isFocused && inputRef.current && cursorPositionRef.current !== null) {
        const newCursorPosition = Math.min(cursorPositionRef.current, newDisplayValue.length)
        inputRef.current.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    } else {
      setDisplayValue('')
    }
  }, [value, currency, isFocused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    cursorPositionRef.current = input.selectionStart
    const unformatted = unformatValue(input.value)
    onChange(unformatted)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    e.target.select()
  }

  const handleBlur = () => {
    setIsFocused(false)
    cursorPositionRef.current = null
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
