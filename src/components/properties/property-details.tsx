import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CurrencyInput } from "@/components/ui/currency-input"
import { UseFormReturn } from "react-hook-form"

import { useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { useTranslation } from "react-i18next"
import * as z from "zod"
import { Input } from "@/components/ui/input"
import { PropertyFormSchema } from "./property-form"

type PropertyDetailsProps = {
  form: UseFormReturn<PropertyFormSchema>
  isNewProperty?: boolean
}

export function PropertyDetails({ form, isNewProperty = false }: PropertyDetailsProps) {
  const { t } = useTranslation('properties')
  const selectedCurrency = form.watch("currency")
  const currentName = form.watch("name")
  const { user } = useAuth()

  useEffect(() => {
    const setupDefaultName = async () => {
      if (!isNewProperty || !user || form.getValues("name")) return

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_property_number')
          .eq('id', user.id)
          .single()

        const nextNumber = (profile?.last_property_number || 0) + 1

        await supabase
          .from('profiles')
          .update({ last_property_number: nextNumber })
          .eq('id', user.id)

        const newPropertyName = t('form.property_name') + ' #' + nextNumber
        form.setValue("name", newPropertyName, { shouldValidate: true })


      } catch (error) {
        console.error('Error setting up default property name:', error)
      }
    }

    setupDefaultName()
  }, [isNewProperty, user, form, t])

  const handleNameChange = (newName: string) => {
    form.setValue("name", newName, { shouldValidate: true })
  }

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('form.name')}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('form.description')}</FormLabel>
            <FormControl>
              <Textarea 
                placeholder={t('form.description_placeholder')}
                className="min-h-[60px]"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="price_cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.property_cost')}</FormLabel>
              <FormControl>
                <CurrencyInput
                  placeholder={t('form.property_cost')}
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
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.currency')}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('form.currency')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PEN">PEN (S/)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  )
}
