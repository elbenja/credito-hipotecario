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
export function normalizeDate(date: Date | string): Date {
  // Special handling for string input in YYYY-MM-DD format
  if (typeof date === 'string') {
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      // We have a YYYY-MM-DD format, extract components directly to avoid timezone issues
      const year = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; // Convert to 0-based month for Date constructor
      const day = parseInt(dateMatch[3]);
      
      // Log original string for debugging
      console.log(`normalizeDate - Original date string: "${date}" -> Y:${year} M:${month+1} D:${day}`);
      
      // Create new Date at noon local time
      const normalized = new Date(year, month, day, 12, 0, 0, 0);
      
      // Log the result
      console.log(`normalizeDate - Result from string: ${normalized.toISOString()}`);
      
      return normalized;
    }
  }

  // For non-YYYY-MM-DD strings or Date objects
  // Extract components from the Date object to ensure we don't lose the day of month
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  // Extract components directly from the original date
  const year = inputDate.getFullYear();
  const month = inputDate.getMonth();
  const day = inputDate.getDate();
  
  // Log original date components for debugging
  console.log(`normalizeDate - Original: ${inputDate.toISOString()} -> Y:${year} M:${month+1} D:${day}`);
  
  // Create a new local date with noon to avoid timezone issues
  const normalized = new Date(year, month, day, 12, 0, 0, 0);
  
  // Log the result
  console.log(`normalizeDate - Result: ${normalized.toISOString()}`);
  
  return normalized;
}

/**
 * Create a date object from a string or Date that preserves the exact calendar date
 * regardless of timezone differences
 */
export function createLocalDate(date: string | Date): Date {
  // Special handling for string input in YYYY-MM-DD format
  if (typeof date === 'string') {
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      // We have a YYYY-MM-DD format, extract components directly to avoid timezone issues
      const year = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]) - 1; // Convert to 0-based month for Date constructor
      const day = parseInt(dateMatch[3]);
      
      // Log original string for debugging
      console.log(`createLocalDate - Original date string: "${date}" -> Y:${year} M:${month+1} D:${day}`);
      
      // Create new Date at noon local time
      const localDate = new Date(year, month, day, 12, 0, 0, 0);
      
      // Log the result
      console.log(`createLocalDate - Result from string: ${localDate.toISOString()}`);
      
      return localDate;
    }
  }
  
  // For non-YYYY-MM-DD strings or Date objects
  const inputDate = typeof date === 'string' ? new Date(date) : date;
  
  // Log input date for debugging
  console.log(`createLocalDate - Input: ${typeof date === 'string' ? date : date.toISOString()}`);
  console.log(`createLocalDate - Parsed: ${inputDate.toISOString()}`);
  
  // Extract components from the input date
  // For string inputs, use the local date components since they're already parsed correctly
  const year = inputDate.getFullYear();
  const month = inputDate.getMonth();
  const day = inputDate.getDate();
  
  console.log(`createLocalDate - Components: Y:${year} M:${month+1} D:${day}`);
  
  // Create a new date with these components in the local timezone at noon
  const localDate = new Date(year, month, day, 12, 0, 0, 0);
  
  console.log(`createLocalDate - Result: ${localDate.toISOString()}`);
  
  return localDate;
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
