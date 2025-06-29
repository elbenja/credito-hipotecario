import * as z from "zod"
import { startOfMonth, addMonths, parseISO } from "date-fns"
import { formatDate, normalizeDate } from "@/utils/utils"
import { 
  getTermValidationError, 
  convertTermToMonths, 
  parseTermInput,
  formatTermForInput,
  isValidTermMonths
} from "@/utils/term-conversion"

// Unified schema for both amortizations and mortgages
export const mortgageFormSchema = z.object({
  name: z.string().min(1, "amortization_form.validation.required"),
  property_id: z.string().min(1, "amortization_form.validation.required"),
  down_payment: z.string()
    .refine(
      (value) => {
        const amount = parseFloat(value.replace(/[^0-9.]/g, "") || "0")
        return !isNaN(amount)
      },
      "amortization_form.validation.invalid_number"
    ),
  interest_rate: z.string()
    .min(1, "amortization_form.validation.required")
    .refine(
      (value) => {
        const rate = parseFloat(value)
        return !isNaN(rate)
      },
      "amortization_form.validation.invalid_number"
    )
    .refine(
      (value) => {
        const rate = parseFloat(value)
        return rate >= 4
      },
      "amortization_form.validation.interest_rate_min"
    )
    .refine(
      (value) => {
        const rate = parseFloat(value)
        return rate <= 18
      },
      "amortization_form.validation.interest_rate_max"
    ),
  term_months: z.number()
    .min(60, "amortization_form.validation.term_range_error")
    .max(360, "amortization_form.validation.term_range_error")
    .refine(
      (value) => isValidTermMonths(value),
      "amortization_form.validation.term_range_error"
    ),
  // term_years: removed - deprecated field
  installments_per_year: z.string().min(1, "amortization_form.validation.required"),
  first_installment_date: z.preprocess((val) => {
    // if a string is provided, parse it as ISO 8601
    if (typeof val === "string") {
      const parsed = parseISO(val);
      return isNaN(parsed.getTime()) ? val : parsed;
    }
    return val;
  }, z.date({
    required_error: "amortization_form.validation.first_installment_date_required",
    invalid_type_error: "amortization_form.validation.first_installment_date_invalid",
  })),
  loan_protection_type: z.enum(["individual", "joint", "none", "custom"], {
    required_error: "amortization_form.validation.loan_protection_type_required",
  }).default("none"),
  loan_protection_insurance: z.string().default("0"),
})

export const defaultValues: MortgageFormValues = {
  name: "",
  property_id: "",
  down_payment: "0",
  interest_rate: "8.5",
  term_months: 240, // Primary field: 240 months (20 years)
  installments_per_year: "12",
  first_installment_date: normalizeDate(startOfMonth(addMonths(new Date(), 1))),
  loan_protection_type: "individual",
  loan_protection_insurance: "0.028",
}

export type MortgageFormValues = z.infer<typeof mortgageFormSchema>

// For compatibility with existing code
export { mortgageFormSchema as amortizationFormSchema }
export type AmortizationFormValues = MortgageFormValues 

// Helper functions for form handling
export const convertTermYearsInputToMonths = (termYearsInput: string): number | null => {
  const trimmed = termYearsInput.trim()
  if (!trimmed) return null
  
  const years = parseFloat(trimmed)
  if (isNaN(years)) return null
  
  return convertTermToMonths(years)
}

export const formatTermMonthsForYearsInput = (termMonths: number | null): string => {
  if (termMonths === null || termMonths === undefined) return ""
  return formatTermForInput(termMonths)
}



