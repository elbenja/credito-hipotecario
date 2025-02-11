
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
import { formatCurrency } from "@/lib/utils"

export type Property = {
  id: string
  name: string
  price_cost: number
  currency: "USD" | "PEN"
}

type PropertySelectProps = {
  form: UseFormReturn<AmortizationFormValues>
  onPropertyChange: (property: Property | null) => void
  disabled?: boolean
}

export function PropertySelect({ form, onPropertyChange, disabled = false }: PropertySelectProps) {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyName, setSelectedPropertyName] = useState<string>("")
  const propertyId = form.watch("property_id")

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

      // If we have a propertyId, find and set its name
      if (propertyId) {
        const selectedProperty = validProperties.find(p => p.id === propertyId)
        if (selectedProperty) {
          setSelectedPropertyName(selectedProperty.name)
          onPropertyChange(selectedProperty)
        }
      }
    }

    loadProperties()
  }, [user, propertyId])

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (property) {
      setSelectedPropertyName(property.name)
      onPropertyChange(property)
    } else {
      setSelectedPropertyName("")
      onPropertyChange(null)
    }
    form.setValue("property_id", propertyId)
  }

  const formatPropertyOption = (property: Property) => {
    const cost = Math.round(property.price_cost)
    return (
      <div className="grid grid-cols-[1fr,auto] gap-4 w-full items-center py-1">
        <span className="truncate">{property.name} - </span>
        <span>
          {formatCurrency(cost, property.currency)}
        </span>
      </div>
    )
  }

  const getSelectedPropertyDisplay = () => {
    if (!propertyId) return "Select a property"
    const property = properties.find(p => p.id === propertyId)
    if (!property) return "Select a property"
    return formatPropertyOption(property)
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
            value={field.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select a property">
                  {getSelectedPropertyDisplay()}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {formatPropertyOption(property)}
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
