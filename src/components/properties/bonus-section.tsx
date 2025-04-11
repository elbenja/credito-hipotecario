import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { UseFormReturn } from "react-hook-form"
import * as z from "zod"
import { BonusRule } from "./types"
import { formatCurrency } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

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

type BonusSectionProps = {
  form: UseFormReturn<z.infer<typeof formSchema>>
}

export function BonusSection({ form }: BonusSectionProps) {
  const { t } = useTranslation('properties')
  const price = form.watch("price_cost")
  const currency = form.watch("currency")
  const isFirstHome = form.watch("is_first_home")
  const isSustainable = form.watch("is_sustainable")
  
  // Fetch bonus rules directly in the component
  const { data: bonusRules = [] } = useQuery({
    queryKey: ['bonus-rules'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bonus_rules')
          .select('*')
          .eq('is_active', true)
          .order('min_value', { ascending: true })

        if (error) throw error
        
        console.log('BonusSection - Fetched bonus rules directly:', data);
        return data || []
      } catch (error) {
        console.error("Error loading bonus rules:", error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  // Log when bonus rules change
  useEffect(() => {
    // console.log('BonusSection received bonusRules:', bonusRules);
  }, [bonusRules]);

  // Debug the raw price value
  // console.log('Raw price from form:', price, typeof price);
  
  // Helper function to parse price string properly
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    // Remove all non-numeric characters except decimal point
    const sanitized = priceStr.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(sanitized);
    // console.log('Sanitized price:', sanitized, 'Parsed price:', parsed);
    return parsed;
  };

  // Fetch exchange rate
  const { data: exchangeRate } = useQuery({
    queryKey: ['exchangeRate', currency, 'PEN'],
    queryFn: async () => {
      if (currency === 'PEN') return 1

      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('from_currency', currency)
        .eq('to_currency', 'PEN')
        .single()

      if (error) throw error
      return data?.rate || 3.70 // Fallback rate
    }
  })

  const convertToPEN = (amount: number): number => {
    return amount * (exchangeRate || 3.70)
  }

  const isPriceInBonusRange = (price: number): boolean => {
    if (!price || isNaN(price) || bonusRules.length === 0) {
      console.log('Invalid price or no bonus rules:', { price, rulesLength: bonusRules.length });
      return false;
    }
    
    const priceInPEN = convertToPEN(price)
    
    // Detailed debugging
    // console.log('==== BONUS VALIDATION ====');
    // console.log('Price to validate:', price, typeof price);
    // console.log('Price in PEN:', priceInPEN, typeof priceInPEN);
    // console.log('Bonus rules count:', bonusRules.length);
    
    // if (bonusRules.length > 0) {
    //   console.log('First rule min:', bonusRules[0].min_value, typeof bonusRules[0].min_value);
    //   console.log('First rule max:', bonusRules[0].max_value, typeof bonusRules[0].max_value);
    // }
    
    // Manual check each rule
    bonusRules.forEach((rule, index) => {
      const minValue = Number(rule.min_value);
      const maxValue = Number(rule.max_value);
      // console.log(`Rule ${index + 1}: ${minValue} - ${maxValue}, Price in range: ${priceInPEN >= minValue && priceInPEN <= maxValue}`);
    });
    
    // Ensure numeric comparison by converting all values to numbers
    const isInRange = bonusRules.some(rule => {
      const minValue = Number(rule.min_value);
      const maxValue = Number(rule.max_value);
      return priceInPEN >= minValue && priceInPEN <= maxValue;
    });
    
    console.log('Final result - Is price in range:', isInRange);
    return isInRange;
  }

  const getApplicableRule = (price: number) => {
    if (!price || isNaN(price) || bonusRules.length === 0) {
      console.log('Cannot get applicable rule - Invalid price or no rules');
      return null;
    }
    
    const priceInPEN = convertToPEN(price)
    
    // Ensure numeric comparison by converting all values to numbers
    const matchingRule = bonusRules.find(rule => {
      const minValue = Number(rule.min_value);
      const maxValue = Number(rule.max_value);
      return priceInPEN >= minValue && priceInPEN <= maxValue;
    });
    
    // if (matchingRule) {
    //   console.log('Found matching rule:', {
    //     min: matchingRule.min_value,
    //     max: matchingRule.max_value,
    //     traditional: matchingRule.traditional_bonus,
    //     sustainable: matchingRule.sustainable_bonus
    //   });
    // } else {
    //   console.log('No matching rule found for price:', priceInPEN);
    // }
    
    return matchingRule;
  }

  // Calculate the lowest min_value and highest max_value
  const minPrice = Math.min(...bonusRules.map(rule => rule.min_value));
  const maxPrice = Math.max(...bonusRules.map(rule => rule.max_value));

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="is_first_home"
        render={({ field }) => (
          <FormItem className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel className="text-lg font-semibold">
                  {t('bonus.first_home_buyer')}
                </FormLabel>
                <div className="text-sm text-muted-foreground">
                  {t('bonus.price_range', { min: minPrice.toLocaleString(), max: maxPrice.toLocaleString() })}
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
                {isPriceInBonusRange(parsePrice(price)) ? (
                  <>
                    <FormField
                      control={form.control}
                      name="is_sustainable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between border-t pt-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-lg font-semibold">
                              {t('bonus.sustainable_property')}
                            </FormLabel>
                            <div className="text-sm text-muted-foreground">
                              {t('bonus.qualifies_higher_bonus')}
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

                    {getApplicableRule(parsePrice(price)) && (
                      <div className="mt-4 rounded-md bg-primary-foreground p-6">
                        <p className="text-lg font-medium">{t('bonus.amount')}:</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(
                            isSustainable
                              ? getApplicableRule(parsePrice(price))!.sustainable_bonus
                              : getApplicableRule(parsePrice(price))!.traditional_bonus,
                            'PEN'
                          )}
                        </p>
                        <div className="space-y-2">
                          {getApplicableRule(parsePrice(price)) && (
                            <p className="text-sm text-muted-foreground">
                              {t('bonus.applicable_range', {
                                min: getApplicableRule(parsePrice(price))?.min_value.toLocaleString(),
                                max: getApplicableRule(parsePrice(price))?.max_value.toLocaleString()
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {currency === 'USD' ? 
                      t('bonus.price_outside_range_usd', {
                        penAmount: convertToPEN(parsePrice(price)).toLocaleString()
                      }) :
                      t('bonus.price_outside_range')
                    }
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
