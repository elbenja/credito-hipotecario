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
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { Lock } from "lucide-react"

// Helper function for currency formatting
const formatAmount = (amount: number, currency: string) => {
  const roundedAmount = Math.round(amount)
  return formatCurrency(roundedAmount, currency, { decimals: 0 })
}

export type Property = {
  id: string
  name: string
  price_cost: number
  currency: "USD" | "PEN"
  is_first_home: boolean
  is_sustainable: boolean
}

type BonusRule = {
  min_value: number
  max_value: number
  traditional_bonus: number
  sustainable_bonus: number
}

type PropertySelectProps = {
  form: UseFormReturn<AmortizationFormValues>
  onPropertyChange: (property: Property | null) => void
  disabled?: boolean
  initialProperty?: Property | null
}

export function PropertyDisplay({ property }: { property: Property }) {
  const { data: exchangeRate } = useExchangeRate()
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])

  useEffect(() => {
    const loadBonusRules = async () => {
      const { data: rulesData } = await supabase
        .from("bonus_rules")
        .select("*")
        .order('min_value', { ascending: true })
      
      setBonusRules(rulesData || [])
    }
    loadBonusRules()
  }, [])

  const convertToPEN = (amount: number, currency: string): number => {
    if (currency === 'PEN') return amount
    return amount * (exchangeRate || 3.7167)
  }

  const calculateBonus = (property: Property): number | null => {
    if (!property.is_first_home) return null

    const propertyValueInPEN = convertToPEN(property.price_cost, property.currency)
    
    const applicableRule = bonusRules.find(
      rule => propertyValueInPEN >= rule.min_value && propertyValueInPEN <= rule.max_value
    )

    if (!applicableRule) return null

    return property.is_sustainable 
      ? applicableRule.sustainable_bonus 
      : applicableRule.traditional_bonus
  }

  const cost = property.price_cost
  const bonus = calculateBonus(property)
  const costInPEN = convertToPEN(cost, property.currency)

  return (
    <div className="relative w-full rounded-md border border-input bg-background px-3 py-2">
      <div className="flex flex-col items-start">
        <span className="font-medium">{property.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">
            Cost: {formatAmount(cost, property.currency)}
            {property.currency === "USD" && ` (≈ ${formatAmount(costInPEN, "PEN")})`}
            {bonus && ` | First-Home Bonus: ${formatAmount(bonus, "PEN")}`}
          </span>
        </div>
      </div>
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <Lock className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}

export function PropertySelect({ 
  form, 
  onPropertyChange, 
  disabled = false,
  initialProperty = null
}: PropertySelectProps) {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])
  const [selectedPropertyName, setSelectedPropertyName] = useState<string>("")
  const [initialLoad, setInitialLoad] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const propertyId = form.watch("property_id")
  const { data: exchangeRate } = useExchangeRate()

  const convertToPEN = (amount: number, currency: string): number => {
    if (currency === 'PEN') return amount
    return amount * (exchangeRate || 3.7167)
  }

  const calculateBonus = (property: Property): number | null => {
    if (!property.is_first_home) return null

    // Convert property value to PEN for bonus calculation without rounding
    const propertyValueInPEN = convertToPEN(property.price_cost, property.currency)
    
    const applicableRule = bonusRules.find(
      rule => propertyValueInPEN >= rule.min_value && propertyValueInPEN <= rule.max_value
    )

    if (!applicableRule) return null

    // Return the exact bonus amount - rounding will be handled in display
    return property.is_sustainable 
      ? applicableRule.sustainable_bonus 
      : applicableRule.traditional_bonus
  }

  useEffect(() => {
    const loadProperties = async () => {
      if (!user || (disabled && !initialLoad && !initialProperty)) return
      
      setIsLoading(true)
      try {
        const [{ data: propertiesData, error: propertiesError }, { data: rulesData, error: rulesError }] = await Promise.all([
          supabase
            .from("properties")
            .select("id, name, price_cost, currency, is_first_home, is_sustainable")
            .eq("user_id", user.id),
          supabase
            .from("bonus_rules")
            .select("*")
            .order('min_value', { ascending: true })
        ])

        if (propertiesError) {
          console.error("Error loading properties:", propertiesError)
          return
        }

        if (rulesError) {
          console.error("Error loading bonus rules:", rulesError)
          return
        }

        const validProperties = (propertiesData || []).filter(
          (p): p is Property => p.currency === "USD" || p.currency === "PEN"
        )
        
        setProperties(validProperties)
        setBonusRules(rulesData || [])

        // Handle initial property if provided
        if (initialProperty) {
          setSelectedPropertyName(initialProperty.name)
          onPropertyChange(initialProperty)
          form.setValue("property_id", initialProperty.id)
        } else if (propertyId) {
          const selectedProperty = validProperties.find(p => p.id === propertyId)
          if (selectedProperty) {
            setSelectedPropertyName(selectedProperty.name)
            onPropertyChange(selectedProperty)
          }
        }
      } catch (error) {
        console.error("Error loading properties:", error)
      } finally {
        setIsLoading(false)
        setInitialLoad(false)
      }
    }

    loadProperties()
  }, [user, propertyId, disabled, initialLoad, initialProperty, form, onPropertyChange])

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

  const formatPropertyOption = (property: Property, isSelected: boolean = false) => {
    const cost = property.price_cost
    const bonus = calculateBonus(property)
    const costInPEN = convertToPEN(cost, property.currency)

    return (
      <div className="w-full py-1">
        <div className="flex flex-col items-start">
          <span className="font-medium">{property.name}</span>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isSelected ? 'text-foreground/90' : 'text-muted-foreground'}`}>
              Cost: {formatAmount(cost, property.currency)}
              {property.currency === "USD" && ` (≈ ${formatAmount(costInPEN, "PEN")})`}
            </span>
            {bonus && (
              <>
                <span className={`text-sm ${isSelected ? 'text-foreground/90' : 'text-muted-foreground'}`}>|</span>
                <span className={`text-sm ${isSelected ? 'text-foreground/90' : 'text-muted-foreground'}`}>
                  First-Home Bonus: {formatAmount(bonus, "PEN")}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getSelectedPropertyDisplay = () => {
    if (isLoading) return "Loading properties..."
    if (!propertyId) return "Select a property"
    const property = properties.find(p => p.id === propertyId)
    if (!property) return "Select a property"
    return formatPropertyOption(property, true)
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
            disabled={disabled || isLoading}
          >
            <FormControl>
              <SelectTrigger className="form-control-focus h-16 items-start pt-2">
                <SelectValue placeholder="Select a property" className="text-left">
                  {getSelectedPropertyDisplay()}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id} className="h-16 py-2">
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
