import { z } from "zod"
import { getTermValidationError } from "@/utils/term-conversion"

/**
 * Schema for the new rate form
 */
export const newRateSchema = z.object({
  new_interest_rate: z
    .coerce.number({
      required_error: "Interest rate is required",
      invalid_type_error: "Interest rate must be a valid number",
    })
    .min(4, "Interest rate must be at least 4%")
    .max(18, "Interest rate cannot exceed 18%"),
  effective_date: z.date({
    required_error: "Start date is required",
    invalid_type_error: "Invalid start date",
  }),
  new_term_years: z
    .coerce.number({
      invalid_type_error: "Term must be a valid number",
    })
    .min(1, "Term must be at least 1 year")
    .max(50, "Term cannot exceed 50 years")
    .nullable()
    .optional(),
})

export type NewRateFormValues = z.infer<typeof newRateSchema> 