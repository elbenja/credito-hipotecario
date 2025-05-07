import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { UseFormReturn } from "react-hook-form"
import * as z from "zod"
import { BonusRule } from "../../types/property"
import { formatCurrency } from "@/utils/utils"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useTranslation } from "react-i18next"
import { useState, useEffect, useMemo } from "react"
import { PropertyFormSchema } from "./property-form"

type BonusSectionProps = {
  form: UseFormReturn<PropertyFormSchema>
}

export function BonusSection({ form }: BonusSectionProps) {
  const { t } = useTranslation('properties')
  const price = form.watch("price_cost")
  const currency = form.watch("currency")
  const isFirstHome = form.watch("is_first_home")
  const isSustainable = form.watch("is_sustainable")
  
  // Fetch bonus rules using the database function
  const { data: bonusRules = [] } = useQuery({
    queryKey: ['bonus-rules'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_active_bonus_rules')

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("Error loading bonus rules:", error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  // Helper function to parse price string properly
  const parsePrice = (priceStr: string): number => {
    if (!priceStr) return 0;
    // Remove all non-numeric characters except decimal point
    const sanitized = priceStr.replace(/[^0-9.]/g, '');
    return parseFloat(sanitized);
  };

  // Fetch exchange rate
  const { data: exchangeRate = 3.70 } = useQuery({
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

// code debt use database function
  // const { data, error } = await supabase.rpc('get_exchange_rate', { 
  //   from_curr: 'USD',
  //   to_curr: 'PEN'
  // });

  // Memoize price parsing to avoid recalculating on every render
  const parsedPrice = useMemo(() => parsePrice(price), [price]);
  
  // Memoize currency conversion to PEN
  const priceInPEN = useMemo(() => 
    parsedPrice * exchangeRate,
    [parsedPrice, exchangeRate]
  );

  // Memoize price range check
  const isPriceInBonusRange = useMemo(() => {
    if (!parsedPrice || isNaN(parsedPrice) || bonusRules.length === 0) {
      return false;
    }
    
    // Ensure numeric comparison by converting all values to numbers
    return bonusRules.some((rule: BonusRule) => {
      const minValue = Number(rule.min_value);
      const maxValue = Number(rule.max_value);
      return priceInPEN >= minValue && priceInPEN <= maxValue;
    });
  }, [parsedPrice, priceInPEN, bonusRules]);

  // Memoize applicable rule calculation
  const applicableRule = useMemo(() => {
    if (!parsedPrice || isNaN(parsedPrice) || bonusRules.length === 0) {
      return null;
    }
    
    // Ensure numeric comparison by converting all values to numbers
    return bonusRules.find((rule: BonusRule) => {
      const minValue = Number(rule.min_value);
      const maxValue = Number(rule.max_value);
      return priceInPEN >= minValue && priceInPEN <= maxValue;
    });
  }, [parsedPrice, priceInPEN, bonusRules]);

  // Calculate the lowest min_value and highest max_value
  const { minPrice, maxPrice } = useMemo(() => {
    if (!bonusRules.length) return { minPrice: 0, maxPrice: 0 };
    return {
      minPrice: Math.min(...bonusRules.map((rule: BonusRule) => Number(rule.min_value))),
      maxPrice: Math.max(...bonusRules.map((rule: BonusRule) => Number(rule.max_value)))
    };
  }, [bonusRules]);

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
                {isPriceInBonusRange ? (
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

                    {applicableRule && (
                      <div className="mt-4 rounded-md bg-primary-foreground p-6">
                        <p className="text-lg font-medium">{t('bonus.amount')}:</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(
                            isSustainable
                              ? applicableRule.sustainable_bonus
                              : applicableRule.traditional_bonus,
                            'PEN'
                          )}
                        </p>
                        <div className="space-y-2">
                          {applicableRule && (
                            <p className="text-sm text-muted-foreground">
                              {t('bonus.applicable_range', {
                                min: applicableRule.min_value.toLocaleString(),
                                max: applicableRule.max_value.toLocaleString()
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
                        penAmount: priceInPEN.toLocaleString()
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
