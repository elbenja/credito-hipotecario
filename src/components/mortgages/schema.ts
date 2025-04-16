import * as z from "zod"
import { startOfMonth, addMonths } from "date-fns"
import { formatDate, normalizeDate } from "@/lib/utils"

// Unified schema for both amortizations and mortgages
export const mortgageFormSchema = z.object({
  name: z.string().min(1, "amortization_form.validation.required"),
  property_id: z.string().min(1, "amortization_form.validation.required"),
  down_payment: z.string()
    .min(1, "amortization_form.validation.required")
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
  term_years: z.string().min(1, "amortization_form.validation.required"),
  installments_per_year: z.string().min(1, "amortization_form.validation.required"),
  first_installment_date: z.date({
    required_error: "amortization_form.validation.first_installment_date_required",
    invalid_type_error: "amortization_form.validation.first_installment_date_invalid",
  }),
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
  term_years: "20",
  installments_per_year: "12",
  first_installment_date: normalizeDate(startOfMonth(addMonths(new Date(), 1))),
  loan_protection_type: "individual",
  loan_protection_insurance: "0.028",
}

export type MortgageFormValues = z.infer<typeof mortgageFormSchema>

// For compatibility with existing code
export { mortgageFormSchema as amortizationFormSchema }
export type AmortizationFormValues = MortgageFormValues 



