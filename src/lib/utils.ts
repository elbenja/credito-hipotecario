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
 */
export function normalizeDate(date: Date): Date {
  // Set the time to noon to avoid any timezone issues
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);
  return normalizedDate;
}

/**
 * Create a local date from a date string or ISO string
 * This is used to ensure we have a consistent date representation
 */
export function createLocalDate(dateString: string | Date): Date {
  if (!dateString) return new Date();
  
  let date: Date;
  
  // If it's already a Date object, just normalize it
  if (dateString instanceof Date) {
    return normalizeDate(dateString);
  }
  
  // Try to parse YYYY-MM-DD format directly to avoid timezone issues
  const match = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Convert to 0-based month for Date constructor
    const day = parseInt(match[3], 10);
    date = new Date(year, month, day, 12, 0, 0, 0); // noon local time
  } else {
    // Fall back to regular date parsing
    date = new Date(dateString);
    // Normalize to noon
    date = normalizeDate(date);
  }
  
  return date;
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
