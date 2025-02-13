import * as z from "zod"
import { startOfMonth, addMonths } from "date-fns"

export const amortizationFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  property_id: z.string().min(1, "Property is required"),
  down_payment: z.string().min(1, "Down payment is required"),
  interest_rate: z.string()
    .min(1, "Interest rate is required")
    .refine(
      (value) => {
        const rate = parseFloat(value)
        return !isNaN(rate)
      },
      "Must be a valid number"
    )
    .refine(
      (value) => {
        const rate = parseFloat(value)
        return rate >= 4
      },
      "Interest rate must be at least 4%"
    )
    .refine(
      (value) => {
        const rate = parseFloat(value)
        return rate <= 18
      },
      "Interest rate cannot exceed 18%"
    ),
  term_years: z.string().min(1, "Term is required"),
  installments_per_year: z.string().min(1, "Installments per year is required"),
  first_installment_date: z.date({
    required_error: "First installment date is required",
  }),
})

export const defaultValues: AmortizationFormValues = {
  name: "",
  property_id: "",
  down_payment: "0",
  interest_rate: "4",
  term_years: "20",
  installments_per_year: "12",
  first_installment_date: startOfMonth(addMonths(new Date(), 1)),
}

export type AmortizationFormValues = z.infer<typeof amortizationFormSchema>
