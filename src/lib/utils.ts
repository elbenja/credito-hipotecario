import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date) {
  // For display purposes, we need to ensure the date shows correctly regardless of timezone
  // Using the UTC methods ensures we respect the actual calendar date
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  
  // Create a new date with the same year, month, day but in local timezone
  const localDate = new Date(year, month, day, 12, 0, 0);
  
  return format(localDate, "MMM d, yyyy");
}

/**
 * Normalize a date to noon to avoid timezone issues
 * This ensures that the date won't shift to the previous day regardless of timezone
 */
export function normalizeDate(date: Date): Date {
  // Create new date using UTC values to avoid timezone issues
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  const normalized = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return normalized;
}

/**
 * Create a date object from a string or Date that preserves the exact calendar date
 * regardless of timezone differences
 */
export function createLocalDate(date: string | Date): Date {
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  // Extract UTC components to get the actual calendar date
  const year = inputDate.getUTCFullYear();
  const month = inputDate.getUTCMonth(); 
  const day = inputDate.getUTCDate();
  
  // Create a new date with these components in the local timezone
  return new Date(year, month, day, 12, 0, 0);
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
