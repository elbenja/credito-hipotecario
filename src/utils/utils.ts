import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"  // try later parseISO

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
// export function normalizeDate(date: Date): Date {
//   // Set the time to noon to avoid any timezone issues
//   const normalizedDate = new Date(date);
//   normalizedDate.setHours(12, 0, 0, 0);
//   return normalizedDate;
// }

// benjamin + chatGPT May27 2025
export function normalizeDate(input: string | Date): Date {
  const date = new Date(input);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}
/**
 * Safe date parser for database dates - use this for dates coming from database
 * This function ensures consistent date handling regardless of navigation path
 * or browser timezone settings
 */

// cursor latest both ways  "2025-07-01T16:00:00.000Z", and "2025-07-01"
export function parseDatabaseDate(dateStr: string | Date | null): Date {
  // console.log("parseDatabaseDate", dateStr)

  if (!dateStr) return new Date();
  
  try {
    // If it's already a Date object, extract components
    if (dateStr instanceof Date) {
      // Keep the date on the correct day by constructing a new local date
      return new Date(
        dateStr.getFullYear(),
        dateStr.getMonth(),
        dateStr.getDate(),
        12, 0, 0, 0
      );
    }
    
    // Handle ISO string or YYYY-MM-DD format
    // Extract date components directly to avoid timezone issues
    let year, month, day;
    
    if (dateStr.includes('T')) {
      // ISO format "2019-04-01T00:00:00Z" 
      const datePart = dateStr.split('T')[0];
      [year, month, day] = datePart.split('-').map(n => parseInt(n, 10));
    } else {
      // Simple YYYY-MM-DD format
      [year, month, day] = dateStr.split('-').map(n => parseInt(n, 10));
    }
    
    // JavaScript months are 0-indexed

    return new Date(year, month - 1, day, 12, 0, 0, 0);

  } catch (error) {
    console.error("Error parsing database date:", error);
    return normalizeDate(new Date());
  }
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

export function formatCurrency(
  amount: number | string, 
  currency: "USD" | "PEN" = "PEN", 
  isInput: boolean = false
) {
  // Convert string to number if needed
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount

  // Handle invalid numbers
  if (isNaN(numericAmount)) return currency === "USD" ? "$0" : "S/ 0"

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isInput ? 2 : 0,
    maximumFractionDigits: isInput ? 2 : 0,
    useGrouping: true, // Use comma as thousands separator
  })

  // Format with proper currency symbol and spacing
  return currency === "USD" 
    ? `$${formatter.format(numericAmount)}`
    : `S/ ${formatter.format(numericAmount)}`
}

export function formatInsurance(value: number | string, isPercentage: boolean = false) {
  // Convert string to number if needed
  const numericValue = typeof value === "string" ? parseFloat(value) : value

  // Handle invalid numbers
  if (isNaN(numericValue)) return isPercentage ? "0.0000%" : "0.00"

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isPercentage ? 4 : 2,
    maximumFractionDigits: isPercentage ? 4 : 2,
    useGrouping: true,
  })

  return isPercentage ? `${formatter.format(numericValue)}%` : formatter.format(numericValue)
}

export function formatInterest(value: number | string, isInput: boolean = false) {
  // Convert string to number if needed
  const numericValue = typeof value === "string" ? parseFloat(value) : value

  // Handle invalid numbers
  if (isNaN(numericValue)) return "0.00%"

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isInput ? 4 : 2,
    maximumFractionDigits: isInput ? 4 : 2,
    useGrouping: false,
  })

  return `${formatter.format(numericValue)}%`
}

/**
 * Utility for handling input focus behavior
 * Only clears the input value if it's zero, otherwise keeps the existing value
 */
export function handleInputFocus(e: React.FocusEvent<HTMLInputElement>) {
  const value = e.target.value
  const numValue = parseFloat(value)
  
  // Only clear if the value is zero or invalid
  if (value === "" || value === "0" || value === "0.00" || isNaN(numValue) || numValue === 0) {
    e.target.value = ""
  }
}

// Debounce utility function to prevent rapid function execution
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function(...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}
