
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { UseFormReturn } from "react-hook-form"
import { AmortizationFormValues } from "./schema"

export type Property = {
  id: string
  name: string
  price_cost: number
  currency: "USD" | "PEN"
}

type PropertySelectProps = {
  form: UseFormReturn<AmortizationFormValues>
  onPropertyChange: (property: Property | null) => void
}

export function PropertySelect({ form, onPropertyChange }: PropertySelectProps) {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])

  useEffect(() => {
    const loadProperties = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, price_cost, currency")
        .eq("user_id", user.id)

      if (error) {
        console.error("Error loading properties:", error)
        return
      }

      const validProperties = (data || []).filter(
        (p): p is Property => p.currency === "USD" || p.currency === "PEN"
      )
      
      setProperties(validProperties)
    }

    loadProperties()
  }, [user])

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    onPropertyChange(property || null)
    form.setValue("property_id", propertyId)
  }

  return (
    <FormField
      control={form.control}
      name="property_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Property</FormLabel>
          <Select
            onValueChange={handlePropertyChange}
            defaultValue={field.value}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
