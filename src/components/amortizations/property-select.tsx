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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useEffect, useState } from "react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { UseFormReturn } from "react-hook-form"
import { AmortizationFormValues } from "./schema"
import { formatCurrency } from "@/lib/utils"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { Pencil } from "lucide-react"
import { PropertyForm } from "@/components/properties/property-form"
import { useTranslation } from "react-i18next"

// Helper function for currency formatting
const formatAmount = (amount: number, currency: string) => {
  const roundedAmount = Math.round(amount)
  return formatCurrency(roundedAmount, currency)
}

export type Property = {
  id: string
  name: string
  price_cost: number
  currency: "USD" | "PEN"
  is_first_home: boolean
  is_sustainable: boolean
  property_insurance: number | null
  property_insurance_type: "auto" | "manual"
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

export function PropertyDisplay({ 
  property,
  onPropertyUpdate
}: { 
  property: Property
  onPropertyUpdate?: (updatedProperty: Property) => void
}) {
  const { t } = useTranslation()
  const { data: exchangeRate } = useExchangeRate()
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])
  const [open, setOpen] = useState(false)
  const [currentProperty, setCurrentProperty] = useState<Property>(property)

  useEffect(() => {
    const loadBonusRules = async () => {
      const { data: rulesData, error } = await supabase
        .from("bonus_rules")
        .select("*")
        .order('min_value', { ascending: true })
      
      if (error) {
        console.error(t("error_loading_bonus_rules"), error)
        return
      }
      
      setBonusRules(rulesData || [])
    }
    loadBonusRules()
  }, [t])

  useEffect(() => {
    const loadProperty = async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq('id', property.id)
        .single()

      if (error) {
        console.error(t("error_fetching_property"), error)
        return
      }

      if (data) {
        setCurrentProperty(data as Property)
      }
    }

    loadProperty()
  }, [property.id, t])

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

  const cost = currentProperty.price_cost
  const bonus = calculateBonus(currentProperty)
  const costInPEN = convertToPEN(cost, currentProperty.currency)

  const handlePropertyUpdate = async () => {
    // Fetch the updated property data
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq('id', currentProperty.id)
      .single()

    if (error) {
      console.error("Error fetching updated property:", error)
      return
    }

    if (data) {
      const updatedProperty = data as Property
      setCurrentProperty(updatedProperty)
      // Call the onPropertyUpdate callback if provided
      if (onPropertyUpdate) {
        onPropertyUpdate(updatedProperty)
      }
    }
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="relative w-full rounded-md border border-input bg-background px-3 py-2">
        <div className="flex flex-col items-start">
          <span className="font-medium">{currentProperty.name}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-foreground">
              {t("property_cost")}: {formatAmount(cost, currentProperty.currency)}
            </span>
            {bonus && (
              <>
                <span className="text-sm text-muted-foreground/75">|</span>
                <span className="text-sm text-foreground">
                  {t("property_bonus")}: {formatAmount(bonus, "PEN")}
                </span>
              </>
            )}
            {currentProperty.property_insurance !== null && 
             !(currentProperty.property_insurance_type === "manual" && currentProperty.property_insurance === 0) && (
              <>
                <span className="text-sm text-muted-foreground/75">|</span>
                <span className="text-sm text-foreground">
                  {t("property_insurance")}: {formatAmount(currentProperty.property_insurance, currentProperty.currency)}
                </span>
              </>
            )}
          </div>
        </div>
        <div 
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:text-primary transition-colors"
          onClick={() => setOpen(true)}
        >
          <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
        </div>
      </div>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("edit_property_title")}</SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          <PropertyForm
            onSuccess={handlePropertyUpdate}
            onClose={() => setOpen(false)}
            selectedProperty={currentProperty}
            bonusRules={bonusRules}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function PropertySelect({ 
  form, 
  onPropertyChange, 
  disabled = false,
  initialProperty = null
}: PropertySelectProps) {
  const { t } = useTranslation()
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
            .select("id, name, price_cost, currency, is_first_home, is_sustainable, property_insurance")
            .eq("user_id", user.id),
          supabase
            .from("bonus_rules")
            .select("*")
            .order('min_value', { ascending: true })
        ])

        if (propertiesError) {
          console.error(t("error_loading_properties"), propertiesError)
          return
        }

        if (rulesError) {
          console.error(t("error_loading_bonus_rules"), rulesError)
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
        } else if (propertyId) {
          const selectedProperty = validProperties.find(p => p.id === propertyId)
          if (selectedProperty) {
            setSelectedPropertyName(selectedProperty.name)
            onPropertyChange(selectedProperty)
          }
        }
      } catch (error) {
        console.error(t("error_loading_properties"), error)
      } finally {
        setIsLoading(false)
        setInitialLoad(false)
      }
    }

    loadProperties()
  }, [user, propertyId, disabled, initialLoad, initialProperty, onPropertyChange, t])

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
          <span className={`text-base font-regular ${isSelected ? 'text-inherit' : 'text-foreground'}`}>
            {property.name}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm ${isSelected ? 'text-inherit/90' : 'text-muted-foreground'}`}>
              {t("property_cost")}: {formatAmount(cost, property.currency)}
            </span>
            {bonus && (
              <>
                <span className={`text-sm ${isSelected ? 'text-inherit/75' : 'text-muted-foreground/75'}`}>|</span>
                <span className={`text-sm ${isSelected ? 'text-inherit/90' : 'text-muted-foreground'}`}>
                  {t("property_bonus")}: {formatAmount(bonus, "PEN")}
                </span>
              </>
            )}
            {property.property_insurance !== null && 
             !(property.property_insurance_type === "manual" && property.property_insurance === 0) && (
              <>
                <span className={`text-sm ${isSelected ? 'text-inherit/75' : 'text-muted-foreground/75'}`}>|</span>
                <span className={`text-sm ${isSelected ? 'text-inherit/90' : 'text-muted-foreground'}`}>
                  {t("property_insurance")}: {formatAmount(property.property_insurance, property.currency)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getSelectedPropertyDisplay = () => {
    if (isLoading) return t("loading_properties")
    if (!propertyId) return t("select_property")
    const property = properties.find(p => p.id === propertyId)
    if (!property) return t("select_property")
    return formatPropertyOption(property, true)
  }

  return (
    <FormField
      control={form.control}
      name="property_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("property")}</FormLabel>
          <Select
            onValueChange={handlePropertyChange}
            value={field.value}
            disabled={disabled || isLoading}
          >
            <FormControl>
              <SelectTrigger className="form-control-focus h-auto flex items-center py-2">
                <SelectValue placeholder={t("select_property")} className="text-left">
                  {getSelectedPropertyDisplay()}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {properties.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  {t("no_properties")}
                </div>
              ) : (
                properties.map((property) => (
                  <SelectItem 
                    key={property.id} 
                    value={property.id} 
                    className="h-auto py-2 hover:bg-accent/40 data-[state=checked]:bg-accent data-[state=checked]:text-muted-foreground"
                  >
                    {formatPropertyOption(property)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
