
import * as z from "zod"

export const refinancingOptionSchema = z.object({
  new_interest_rate: z.string().transform((val) => Number(val)),
  effective_date: z.date(),
  new_term_years: z.string().optional().transform((val) => val ? Number(val) : undefined),
})

export type RefinancingOptionFormValues = z.infer<typeof refinancingOptionSchema>
