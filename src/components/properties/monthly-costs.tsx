import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { CurrencyInput } from "@/components/ui/currency-input"
import { UseFormReturn } from "react-hook-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useTranslation } from "react-i18next"
import { useEffect } from "react"
import * as z from "zod"

const formSchema = z.object({
  name: z.string().min(1, {
    message: "validation.property_name_required"
  }),
  description: z.string().optional(),
  price_cost: z.string().min(1, {
    message: "validation.price_required"
  }),
  currency: z.enum(["PEN", "USD"]).default("PEN"),
  property_insurance: z.string().optional(),
  property_insurance_type: z.enum(["auto", "manual"]).default("auto"),
  is_sustainable: z.boolean().default(false),
  is_first_home: z.boolean().default(false),
})

type MonthlyCostsProps = {
  form: UseFormReturn<z.infer<typeof formSchema>>
}

export function MonthlyCosts({ form }: MonthlyCostsProps) {
  const { t } = useTranslation('properties')
  const selectedCurrency = form.watch("currency")
  const propertyValue = parseFloat(form.watch("price_cost") || "0")
  const insuranceType = form.watch("property_insurance_type")

  // Fetch current insurance rate
  const { data: insuranceRate } = useQuery({
    queryKey: ["propertyInsuranceRate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_insurance_rates")
        .select("percentage")
        .order("effective_year", { ascending: false })
        .limit(1)
        .single()

      if (error) throw error
      return data.percentage
    },
    staleTime: Infinity,
  })

  // Calculate auto insurance amount when property value or rate changes
  const autoInsuranceAmount = (propertyValue * (insuranceRate || 0.0280)) / 100

  // Update insurance amount when relevant values change
  useEffect(() => {
    if (insuranceType === "auto") {
      form.setValue("property_insurance", autoInsuranceAmount.toFixed(2))
    }
  }, [propertyValue, insuranceRate, insuranceType, form, autoInsuranceAmount])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="property_insurance_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.property_insurance')}</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  if (value === "auto") {
                    form.setValue("property_insurance", autoInsuranceAmount.toFixed(2))
                  }
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.property_insurance')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="auto">
                    {t('insurance.auto')} ({(insuranceRate || 0.0280).toFixed(4)}%)
                  </SelectItem>
                  <SelectItem value="manual">{t('insurance.manual')}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="property_insurance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('insurance.amount')}</FormLabel>
              <FormControl>
                <CurrencyInput
                  placeholder={t('insurance.amount')}
                  currency={selectedCurrency}
                  {...field}
                  value={insuranceType === "auto" ? autoInsuranceAmount.toFixed(2) : field.value || ''}
                  disabled={insuranceType === "auto"}
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
