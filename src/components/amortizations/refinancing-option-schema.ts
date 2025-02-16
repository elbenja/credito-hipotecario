
import * as z from "zod"

export const refinancingOptionSchema = z.object({
  new_interest_rate: z.coerce.number(),
  effective_date: z.date(),
  new_term_years: z.coerce.number().optional().nullable(),
})

export type RefinancingOptionFormValues = z.infer<typeof refinancingOptionSchema>
