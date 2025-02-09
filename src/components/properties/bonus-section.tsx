
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { UseFormReturn } from "react-hook-form"
import * as z from "zod"
import { BonusRule } from "./types"
import { formatCurrency } from "./types"

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

type BonusSectionProps = {
  form: UseFormReturn<z.infer<typeof formSchema>>
  bonusRules: BonusRule[]
}

export function BonusSection({ form, bonusRules }: BonusSectionProps) {
  const price = form.watch("price_cost")
  const isFirstHome = form.watch("is_first_home")
  const isSustainable = form.watch("is_sustainable")

  const isPriceInBonusRange = (priceInPEN: number) => {
    return bonusRules.some(rule => 
      priceInPEN >= rule.min_value && priceInPEN <= rule.max_value
    )
  }

  const getApplicableRule = (priceInPEN: number) => {
    return bonusRules.find(rule => 
      priceInPEN >= rule.min_value && priceInPEN <= rule.max_value
    )
  }

  return (
    <div className="space-y-4">
      
      
      <FormField
        control={form.control}
        name="is_first_home"
        render={({ field }) => (
          <FormItem className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-xl font-semibold">
                First Home Buyer Bonus
                </FormLabel>
                <div className="text-sm text-muted-foreground">
                 Bonus for prices between S/67,400 - S/355,100.
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </div>

            {isFirstHome && price && (
              <div className="mt-4 space-y-4">
                {isPriceInBonusRange(parseFloat(price)) ? (
                  <>
                 

                    <FormField
                      control={form.control}
                      name="is_sustainable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between border-t pt-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-lg font-semibold">
                              Sustainable Property
                            </FormLabel>
                            <div className="text-sm text-muted-foreground">
                              Qualifies for higher bonus amount
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {getApplicableRule(parseFloat(price)) && (
                      <div className="mt-4 rounded-md bg-primary-foreground p-6">
                        <p className="text-lg font-medium">Bonus Amount:</p>
                        <p className="text-4xl font-bold">
                          {formatCurrency(
                            isSustainable
                              ? getApplicableRule(parseFloat(price))!.sustainable_bonus
                              : getApplicableRule(parseFloat(price))!.traditional_bonus,
                            'PEN'
                          )}
                        </p>
                        <div className="space-y-2">
                          {getApplicableRule(parseFloat(price)) && (
                            <p className="text-sm text-muted-foreground">
                              Applicable range: S/{getApplicableRule(parseFloat(price))?.min_value.toLocaleString()} - S/{getApplicableRule(parseFloat(price))?.max_value.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">
                   Price outside the range.
                  </div>
                )}
              </div>
            )}
          </FormItem>
        )}
      />
    </div>
  )
}
