
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { CurrencyInput } from "@/components/ui/currency-input"
import { UseFormReturn } from "react-hook-form"
import * as z from "zod"

const formSchema = z.object({
  name: z.string().min(1, "Property name is required"),
  description: z.string().optional(),
  price_cost: z.string().min(1, "Price is required"),
  currency: z.enum(["PEN", "USD"]).default("PEN"),
  property_insurance: z.string().optional(),
  other_expenses: z.string().optional(),
  is_sustainable: z.boolean().default(false),
  is_first_home: z.boolean().default(false),
})

type MonthlyCostsProps = {
  form: UseFormReturn<z.infer<typeof formSchema>>
}

export function MonthlyCosts({ form }: MonthlyCostsProps) {
  const selectedCurrency = form.watch("currency")

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Monthly Cost Breakdown</h3>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="property_insurance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Insurance</FormLabel>
              <FormControl>
                <CurrencyInput
                  placeholder="Monthly insurance"
                  currency={selectedCurrency}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="other_expenses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other Monthly Expenses</FormLabel>
              <FormControl>
                <CurrencyInput
                  placeholder="Other expenses"
                  currency={selectedCurrency}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
