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
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

// Helper function for currency formatting
const formatAmount = (amount: number, currency: "USD" | "PEN") => {
  const roundedAmount = Math.round(amount)
  return formatCurrency(roundedAmount, currency)
}

export type Property = {
  id: string
  name: string
  description?: string
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

interface PropertyEditSheetProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPropertyUpdate?: (property: Property) => void;
}

function PropertyEditSheet({ property, open, onOpenChange, onPropertyUpdate }: PropertyEditSheetProps) {
  const { t } = useTranslation();
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);

  // Debug logs for props
  useEffect(() => {
    console.log('PropertyEditSheet - Props:', { 
      propertyId: property?.id,
      open,
      hasUpdateCallback: !!onPropertyUpdate 
    });
  }, [property, open, onPropertyUpdate]);

  const handlePropertyUpdate = async () => {
    console.log('PropertyEditSheet - handlePropertyUpdate called');
    // Fetch the updated property data
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq('id', property.id)
      .single();

    if (error) {
      console.error("Error fetching updated property:", error);
      return;
    }

    console.log('PropertyEditSheet - Updated property data:', data);
    onOpenChange(false);
    if (onPropertyUpdate) {
      onPropertyUpdate(data);
    }
  };

  // If no property is provided, don't render anything
  if (!property) {
    console.log('PropertyEditSheet - No property provided');
    return null;
  }

  return (
    <Sheet 
      open={open} 
      onOpenChange={(newOpen) => {
        console.log('Sheet onOpenChange called with:', newOpen);
        onOpenChange(newOpen);
      }}
    >
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>{t("edit_property_title")}</SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          <PropertyForm
            onSuccess={() => {
              console.log('PropertyForm - onSuccess called');
              handlePropertyUpdate();
            }}
            onClose={() => {
              console.log('PropertyForm - onClose called');
              onOpenChange(false);
            }}
            selectedProperty={property}
            bonusRules={bonusRules}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function PropertyDisplay({ 
  property,
  onPropertyUpdate
}: { 
  property: Property | null;
  onPropertyUpdate?: (property: Property) => void;
}) {
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([]);
  const [propertyEditSheetOpen, setPropertyEditSheetOpen] = useState(false);
  const { data: exchangeRate } = useExchangeRate();

  // Debug logs for state changes
  useEffect(() => {
    console.log('PropertyDisplay - Sheet Open State:', propertyEditSheetOpen);
  }, [propertyEditSheetOpen]);

  // Helper function to convert currency to PEN
  const convertToPEN = (amount: number, currency: string): number => {
    if (currency === 'PEN') return amount;
    return amount * (exchangeRate || 3.7167);
  };

  // Helper function to calculate bonus
  const calculateBonus = (property: Property, rules: BonusRule[]): number | null => {
    if (!property.is_first_home) return null;

    // Convert property value to PEN for bonus calculation
    const propertyValueInPEN = convertToPEN(property.price_cost, property.currency);
    
    const applicableRule = rules.find(
      rule => propertyValueInPEN >= rule.min_value && propertyValueInPEN <= rule.max_value
    );

    if (!applicableRule) return null;

    return property.is_sustainable 
      ? applicableRule.sustainable_bonus 
      : applicableRule.traditional_bonus;
  };

  // Load bonus rules
  useEffect(() => {
    const loadBonusRules = async () => {
      const { data, error } = await supabase
        .from("bonus_rules")
        .select("*")
        .order('min_value', { ascending: true });

      if (error) {
        console.error("Error loading bonus rules:", error);
        return;
      }

      setBonusRules(data || []);
    };

    loadBonusRules();
  }, []);

  // Update currentProperty when property changes
  useEffect(() => {
    if (property) {
      setCurrentProperty(property);
    }
  }, [property]);

  // Early return if no property or bonus rules
  if (!currentProperty || bonusRules.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500">
        No property selected
      </div>
    );
  }

  // Calculate cost and bonus
  const cost = currentProperty.price_cost;
  const bonus = calculateBonus(currentProperty, bonusRules);
  const costInPEN = convertToPEN(cost, currentProperty.currency);

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event bubbling
    console.log('Edit button clicked');
    console.log('Current property:', currentProperty);
    setPropertyEditSheetOpen(true);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">Property</p>
          <h3 className=" font-semibold">{currentProperty?.name}</h3>
          {/* <p className="text-sm text-gray-500">{currentProperty.description}</p> */}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEditClick}
          type="button" // Explicitly set button type
        >
          Edit
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        <div className="col-span-3">
          <Label className="text-xs font-normal">Cost</Label>
          <div className="text-sm font-medium">
            {formatCurrency(cost, currentProperty.currency)}
          </div>
        </div>
        <div className="col-span-2">
        <Label className="text-xs font-normal">Bonus</Label>
          <div className="text-sm font-medium">
            {bonus ? formatCurrency(bonus, currentProperty.currency) : "None"}
          </div>
        </div>

        <div className="col-span-2">
        <Label className="text-xs font-normal">Insurance</Label>
          <div className="text-sm font-medium">
            {currentProperty.property_insurance !== null
              ? formatCurrency(currentProperty.property_insurance, currentProperty.currency)
              : "None"}
          </div>
        </div>
      </div>

      <PropertyEditSheet
        property={currentProperty}
        open={propertyEditSheetOpen}
        onOpenChange={(open) => {
          console.log('PropertyEditSheet - onOpenChange called with:', open);
          setPropertyEditSheetOpen(open);
        }}
        onPropertyUpdate={(updatedProperty) => {
          console.log('PropertyEditSheet - property update:', updatedProperty);
          if (onPropertyUpdate) {
            onPropertyUpdate(updatedProperty);
          }
        }}
      />
    </div>
  );
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
            .select("id, name, price_cost, currency, is_first_home, is_sustainable, property_insurance, property_insurance_type")
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
