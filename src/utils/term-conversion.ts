/**
 * Term Conversion Utilities
 * Handles conversion between term_years and term_months with proper priority logic
 */

export interface TermData {
  term_months: number;
  term_years: number;
  display_value: string;
}

/**
 * Convert term years to months with proper rounding
 * @param years - Term in years (e.g., 20.5)
 * @returns Term in months (e.g., 246)
 */
export function convertTermToMonths(years: number): number {
  return Math.round(years * 12);
}

/**
 * Convert term months to years with 1 decimal precision
 * @param months - Term in months (e.g., 246)
 * @returns Term in years with 1 decimal (e.g., 20.5)
 */
export function convertMonthsToYears(months: number): number {
  return Math.round((months / 12) * 10) / 10;
}

/**
 * Get effective term in months using priority logic
 * Priority: term_months first, fallback to term_years * 12
 * @param termMonths - Optional term in months
 * @param termYears - Term in years (fallback)
 * @returns Effective term in months
 */
export function getEffectiveTermMonths(termMonths?: number | null, termYears?: number): number {
  // Priority logic: term_months first, fallback to term_years * 12
  if (termMonths != null && termMonths > 0) {
    return termMonths;
  }
  
  if (termYears != null && termYears > 0) {
    return convertTermToMonths(termYears);
  }
  
  throw new Error('Either term_months or term_years must be provided');
}

/**
 * Format term for display as years with 1 decimal precision
 * @param months - Term in months
 * @returns Formatted display string (e.g., "20.5 years")
 */
export function formatTermDisplay(months: number): string {
  const years = convertMonthsToYears(months);
  return `${years.toFixed(1)} years`;
}

/**
 * Create complete TermData object from input values
 * @param termMonths - Optional term in months
 * @param termYears - Optional term in years
 * @returns Complete TermData object
 */
export function createTermData(termMonths?: number | null, termYears?: number): TermData {
  const effectiveMonths = getEffectiveTermMonths(termMonths, termYears);
  const effectiveYears = convertMonthsToYears(effectiveMonths);
  const displayValue = formatTermDisplay(effectiveMonths);
  
  return {
    term_months: effectiveMonths,
    term_years: effectiveYears,
    display_value: displayValue
  };
}

/**
 * Validate term months value
 * @param months - Term in months to validate
 * @returns true if valid (60-360 months)
 */
export function isValidTermMonths(months: number): boolean {
  return months >= 60 && months <= 360; // 5-30 years
}

/**
 * Validate term years value
 * @param years - Term in years to validate
 * @returns true if valid (5-30 years)
 */
export function isValidTermYears(years: number): boolean {
  return years >= 5 && years <= 30;
}

/**
 * Get validation error message for term
 * @param termMonths - Optional term in months
 * @param termYears - Optional term in years
 * @returns Error message or null if valid
 */
export function getTermValidationError(termMonths?: number | null, termYears?: number): string | null {
  try {
    const effectiveMonths = getEffectiveTermMonths(termMonths, termYears);
    
    if (!isValidTermMonths(effectiveMonths)) {
      const years = convertMonthsToYears(effectiveMonths);
      return `Term must be between 5 and 30 years. Current value: ${years} years`;
    }
    
    return null;
  } catch (error) {
    return 'Term value is required';
  }
}

/**
 * Parse user input term value (in years format) to months
 * @param input - User input string (e.g., "20.5")
 * @returns Term in months or null if invalid
 */
export function parseTermInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  
  const years = parseFloat(trimmed);
  if (isNaN(years)) return null;
  
  return convertTermToMonths(years);
}

/**
 * Convert term months to user input format (years with 1 decimal)
 * @param months - Term in months
 * @returns String formatted for user input (e.g., "20.5")
 */
export function formatTermForInput(months: number): string {
  const years = convertMonthsToYears(months);
  return years.toFixed(1);
} 