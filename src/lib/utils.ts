import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  return format(date, "MMM d, yyyy")
}

export function formatCurrency(amount: number | string, currency: "USD" | "PEN" = "PEN") {
  // Convert string to number if needed
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount

  // Handle invalid numbers
  if (isNaN(numericAmount)) return currency === "USD" ? "$0.00" : "S/ 0.00"

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // Format with proper currency symbol and spacing
  return currency === "USD" 
    ? `$${formatter.format(numericAmount)}`
    : `S/ ${formatter.format(numericAmount)}`
}
