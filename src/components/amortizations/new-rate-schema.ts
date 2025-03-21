import * as z from "zod"

export const newRateSchema = z.object({
  new_interest_rate: z.coerce.number()
    .min(4, "Interest rate must be at least 4%")
    .max(18, "Interest rate cannot exceed 18%"),
  effective_date: z.date({
    required_error: "Start date is required",
    invalid_type_error: "Please enter a valid date",
  }),
  new_term_years: z.number().nullable(),
})

export type NewRateFormValues = z.infer<typeof newRateSchema> 