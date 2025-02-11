
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'PEN' ? 'PEN' : 'USD',
    currencyDisplay: 'symbol',
  })
  
  const formatted = formatter.format(amount)
  return currency === 'PEN' ? formatted.replace('PEN', 'S/') : formatted
}
