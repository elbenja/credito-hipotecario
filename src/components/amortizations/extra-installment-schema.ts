
import * as z from "zod"

export const extraInstallmentFormSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  frequency: z.enum(["monthly", "one-time"], {
    required_error: "Please select a frequency",
  }),
  start_date: z.date({
    required_error: "Start date is required",
    invalid_type_error: "Please enter a valid date",
  }),
})

export const defaultValues: ExtraInstallmentFormValues = {
  amount: "",
  frequency: "one-time",
  start_date: new Date(),
}

export type ExtraInstallmentFormValues = z.infer<typeof extraInstallmentFormSchema>
