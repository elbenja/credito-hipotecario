import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number, currency: string, options: { decimals?: number } = {}) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'PEN' ? 'PEN' : 'USD',
    currencyDisplay: 'symbol',
    minimumFractionDigits: options.decimals ?? 2,
    maximumFractionDigits: options.decimals ?? 2,
  })
  
  const formatted = formatter.format(amount)
  return currency === 'PEN' ? formatted.replace('PEN', 'S/') : formatted
}
