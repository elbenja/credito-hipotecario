
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CurrencyInput } from "@/components/ui/currency-input"
import { UseFormReturn } from "react-hook-form"
import { EditableHeading } from "@/components/ui/editable-heading"
import { useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
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

type PropertyDetailsProps = {
  form: UseFormReturn<z.infer<typeof formSchema>>
  isNewProperty?: boolean
}

export function PropertyDetails({ form, isNewProperty = false }: PropertyDetailsProps) {
  const selectedCurrency = form.watch("currency")
  const currentName = form.watch("name")
  const { user } = useAuth()

  useEffect(() => {
    const setupDefaultName = async () => {
      if (!isNewProperty || !user || currentName) return

      try {
        // Get the user's current counter
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_property_number')
          .eq('id', user.id)
          .single()

        const nextNumber = (profile?.last_property_number || 0) + 1

        // Update the counter in the database
        await supabase
          .from('profiles')
          .update({ last_property_number: nextNumber })
          .eq('id', user.id)

        // Set the default name
        form.setValue("name", `New Property #${nextNumber}`, { shouldValidate: true })
      } catch (error) {
        console.error('Error setting up default property name:', error)
      }
    }

    setupDefaultName()
  }, [isNewProperty, user, form])

  const handleNameChange = (newName: string) => {
    form.setValue("name", newName, { shouldValidate: true })
  }

  return (
    <>
      <EditableHeading 
        value={currentName}
        onChange={handleNameChange}
        className="mb-6"
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Enter property details (address, notes, etc.)" 
                className="min-h-[100px]"
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
              <FormLabel>Price</FormLabel>
              <FormControl>
                <CurrencyInput
                  placeholder="Enter price"
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
              <FormLabel>Currency</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
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
