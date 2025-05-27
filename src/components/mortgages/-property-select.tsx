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
import { useEffect, useState, memo, useCallback, useRef } from "react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { UseFormReturn } from "react-hook-form"
import { MortgageFormValues as AmortizationFormValues } from "./schema"
import { formatCurrency } from "@/utils/utils"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { usePropertyBonus } from '@/hooks/usePropertyBonus'

import { PropertyForm } from "@/components/properties/property-form"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import type { Property } from "@/types/property"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@/utils/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

// Helper function for currency formatting
const formatAmount = (amount: number | null, currency: string): string => {
  if (amount === null) return "-"
  return formatCurrency(amount, currency as "USD" | "PEN")
}

// export interface Property {
//   id: string
//   name: string
//   price_cost: number
//   currency: "USD" | "PEN"
//   is_first_home: boolean
//   is_sustainable: boolean
//   property_insurance: number | null
//   property_insurance_type: "auto" | "manual"
//   bonus: number
//   description?: string
// }

// export interface BonusRule {
//   id: string
//   min_value: number
//   max_value: number
//   traditional_bonus: number
//   sustainable_bonus: number
//   is_active: boolean
// }

export interface PropertySelectProps {
  form: UseFormReturn<any, any, any>
  onPropertyChange?: (property: Property | null) => void
  initialProperty?: Property
  disabled?: boolean
}

interface PropertyEditSheetProps {
  property: Property;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPropertyUpdate?: (property: Property) => void;
}

function PropertyEditSheet({ property, open, onOpenChange, onPropertyUpdate }: PropertyEditSheetProps) {
  const { t } = useTranslation(['global', 'properties', 'dashboard']);

  const handlePropertyUpdate = async () => {
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

    // Get the bonus amount for the updated property
    const { data: bonusAmount, error: bonusError } = await supabase
      .rpc('property_bonus', { p_property_id: property.id });
      
    if (bonusError) {
      console.error("Error fetching property bonus:", bonusError);
    }

    // Create the updated property with bonus
    const updatedProperty = {
      ...data,
      bonus: bonusAmount || 0
    };

    // Close the sheet and call the update handler
    onOpenChange(false);
    if (onPropertyUpdate) {
      onPropertyUpdate(updatedProperty as Property);
    }
  };

  // If no property is provided, don't render anything
  if (!property) {
    return null;
  }

  return (
    <Sheet 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" side="right">
        <SheetHeader>
          <SheetTitle>{t("ui.edit", { ns: "global" })}</SheetTitle>
        </SheetHeader>
        <div className="mt-8">
          <PropertyForm
            onSuccess={handlePropertyUpdate}
            onClose={() => {
              onOpenChange(false);
            }}
            selectedProperty={property}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// TODO: Consider memoizing this component for better performance
export function PropertyDisplay({ 
  property,
  onPropertyUpdate
}: { 
  property: Property | null;
  onPropertyUpdate?: (property: Property) => void;
}) {
  const { t } = useTranslation(['global', 'properties', 'dashboard']);
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);
  const [propertyEditSheetOpen, setPropertyEditSheetOpen] = useState(false);
  
  // Use our custom hook instead of fetching bonus rules directly
  const { calculateBonus, bonusRules, isLoadingRules } = usePropertyBonus();

  // Debug logs for state changes
  useEffect(() => {
    console.log('PropertyDisplay - Sheet Open State:', propertyEditSheetOpen);
  }, [propertyEditSheetOpen]);

  // Update currentProperty when property changes
  useEffect(() => {
    if (property) {
      setCurrentProperty(property);
    }
  }, [property]);

  // Early return if no property or still loading bonus rules
  if (!currentProperty || isLoadingRules) {
    return (
      <div className="flex items-center justify-center p-4 text-gray-500">
        {t('messages.no_properties', { ns: 'properties' })}
      </div>
    );
  }

  // Calculate cost and bonus - now using our hook
  const cost = currentProperty.price_cost;
  const bonus = calculateBonus(currentProperty);

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent any form submission
    e.stopPropagation(); // Stop event bubbling
    console.log('Edit button clicked');
    console.log('Current property:', currentProperty);
    setPropertyEditSheetOpen(true);
  };

  return (
    <div className="space-y-0 ">
      <div className="flex items-center p-2 sm:p-4 justify-between">
        <div>
          <p className="text-sm">{t('property', '', { ns: 'properties' })}</p>
          <h3 className=" font-semibold">{currentProperty?.name}</h3>
         
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleEditClick}
          type="button" // Explicitly set button type
        >
          {t('ui.edit', { ns: 'global' })}
        </Button>
      </div>
{/* start */}
<div className="flex flex-col items-stretch space-y-0 border-t p-0 sm:flex-row">
  <div className="justify-top flex flex-1 flex-col gap-1 px-2 py-2 sm:px-4 sm:py-4">
    <Label className="text-muted-foreground text-xs">
      {t('form.property_cost', { ns: 'properties' })}</Label>
    <span className="text-lg leading-none font-bold sm:text-lg whitespace-nowrap">
      {formatCurrency(currentProperty.price_cost, currentProperty.currency as "USD" | "PEN")}
    </span>
  </div>

  <div className="flex">
    <div className="justify-top relative z-30 flex flex-1 flex-col gap-1 border-t px-2 py-2 text-left even:border-l sm:border-t-0 sm:border-l sm:px-4 sm:py-4">
 
      <Label className="text-muted-foreground text-xs">
      {t('bonus.amount_short', '', { ns: 'properties' })}
      </Label>
      <span className="text-lg leading-none font-bold sm:text-lg whitespace-nowrap">
        {bonus ? formatCurrency(bonus, "PEN") : t('bonus.no_bonus', '', { ns: 'properties' })}
      </span>
    </div>

    <div className="justify-top flex flex-1 flex-col gap-1 border-t px-2 py-2 text-left even:border-l sm:border-t-0 sm:border-l sm:px-4 sm:py-4">
      <Label className="text-muted-foreground text-xs whitespace-nowrap">
      {t('form.property_insurance_short', '', { ns: 'properties' })}
      </Label>
      <span className="text-lg leading-none font-bold sm:text-lg whitespace-nowrap">
      {currentProperty.property_insurance !== null
              ? formatCurrency(currentProperty.property_insurance, currentProperty.currency as "USD" | "PEN")
              : t('bonus.no_bonus', '', { ns: 'properties' })}
      </span>
    </div>
  </div>
</div>
{/* end */}

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
  initialProperty,
  disabled = false
}: PropertySelectProps) {
  const { t } = useTranslation(['global', 'properties', 'dashboard'])
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedPropertyName, setSelectedPropertyName] = useState<string>("")
  const [initialLoad, setInitialLoad] = useState(true)
  const propertyId = form.watch("property_id")
  const { data: exchangeRate } = useExchangeRate()
  const hasFetchedRef = useRef(false)
  
  // Function to calculate automatic property insurance
  const calculateAutoInsurance = (price: number): number => {
    // Property insurance is typically 0.028% of the property value annually
    // Dividing by 12 for monthly payment
    return price * 0.00028 / 12;
  };

  const fetchPropertyDetails = useCallback(async (propertyId: string) => {
    try {
      // Check if we already have this property in our state
      const existingProperty = properties.find(p => p.id === propertyId);
      if (existingProperty) {
        // If the property already has a non-zero bonus, use it directly
        if (existingProperty.bonus > 0 || !existingProperty.is_first_home) {
          // Set the property name
          setSelectedPropertyName(existingProperty.name);
          
          // Call the callback
          if (onPropertyChange) {
            onPropertyChange(existingProperty);
          }
          
          return existingProperty;
        }
      }
      
      // If not in state or needs bonus update, fetch minimum details
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select(`
          id,
          name,
          currency,
          price_cost,
          property_insurance,
          property_insurance_type,
          is_first_home,
          is_sustainable
        `)
        .eq("id", propertyId)
        .single();

      if (propertyError) throw propertyError;
      if (!propertyData) return null;

      // Get property bonus using RPC function
      const { data: bonusAmount, error: bonusError } = await supabase
        .rpc('property_bonus', { p_property_id: propertyId });
        
      if (bonusError) {
        console.error("Error fetching property bonus:", bonusError);
      }

      // Create final property object with proper typing
      const property = {
        ...propertyData,
        currency: propertyData.currency as "USD" | "PEN",
        property_insurance: propertyData.property_insurance,
        bonus: bonusAmount || 0
      } as Property;

      // Set the property name
      setSelectedPropertyName(property.name);
      
      // UPDATE THE PROPERTIES ARRAY to update the displayed bonus
      setProperties(prevProperties => 
        prevProperties.map(p => 
          p.id === property.id ? property : p
        )
      );
      
      // Call the callback
      if (onPropertyChange) {
        onPropertyChange(property);
      }
      
      return property;
    } catch (error) {
      console.error("Error fetching property details:", error);
      return null;
    }
  }, [onPropertyChange, properties]);

    const fetchProperties = async () => {
      if (!user) return
      
      setLoading(true)
      try {
      // Only fetch essential fields
        const { data, error } = await supabase
          .from("properties")
          .select(`
            id,
            name,
            currency,
            price_cost,
          property_insurance,
          property_insurance_type,
            is_first_home,
          is_sustainable
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
        
        if (error) throw error
        
      // Define propertiesWithPlaceholderBonus here to be accessible in the scope
      const propertiesWithPlaceholderBonus = (data || []).map(property => ({
          ...property,
        currency: property.currency as "USD" | "PEN",
        bonus: 0
      })) as Property[];
      
      if (data && data.length > 0) {
        // Set initial properties
        setProperties(propertiesWithPlaceholderBonus);
        
        // Fetch bonuses for all first home properties in parallel
        const bonusPromises = data
          .filter(p => p.is_first_home)
          .map(async (property) => {
            try {
              const { data: bonusAmount, error: bonusError } = await supabase
                .rpc('property_bonus', { p_property_id: property.id });
                
              if (bonusError) {
                console.error("Error fetching property bonus:", bonusError);
                return { id: property.id, bonus: 0 };
              }
              
              return { id: property.id, bonus: bonusAmount || 0 };
            } catch (error) {
              console.error("Error fetching bonus:", error);
              return { id: property.id, bonus: 0 };
            }
          });
        
        // Wait for all bonus fetches to complete
        const bonusResults = await Promise.all(bonusPromises);
        
        // Update properties with the fetched bonuses
        setProperties(prev => {
          return prev.map(property => {
            const bonusResult = bonusResults.find(b => b.id === property.id);
            return bonusResult 
              ? { ...property, bonus: bonusResult.bonus } 
              : property;
          });
        });
      } else {
        setProperties([]);
      }
        
        // Handle initial property if provided
        if (initialProperty && initialLoad) {
          setSelectedPropertyName(initialProperty.name);
          if (onPropertyChange) onPropertyChange(initialProperty);
        } else if (propertyId && initialLoad) {
        // Let's look up the property in our now populated properties array
        const selectedProperty = propertiesWithPlaceholderBonus.find(p => p.id === propertyId);
          if (selectedProperty) {
            setSelectedPropertyName(selectedProperty.name);
          if (onPropertyChange) onPropertyChange(selectedProperty!);
          }
        }
        
        setInitialLoad(false);
      } catch (error) {
        console.error("Error loading properties:", error)
      } finally {
        setLoading(false)
      }
    }
    
  // Replace handlePropertyChange function to properly handle null return from fetchPropertyDetails
  const handlePropertyChange = async (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    if (property) {
      // Set the form value
      form.setValue("property_id", propertyId, { shouldValidate: true })
      
      // Update selected property name for display
      setSelectedPropertyName(property.name)
      
      // Get bonus using database function if this is a first home
      let propertyWithBonus = property
      if (property.is_first_home) {
        // Only fetch bonus if we don't already have it cached (bonus === 0 is initial value)
        if (property.bonus === 0) {
          const fetchedProperty = await fetchPropertyDetails(propertyId)
          if (fetchedProperty !== null) {
            propertyWithBonus = fetchedProperty
          }
        }
      }
      
      // Call the callback with property (with bonus if applicable)
      if (onPropertyChange) onPropertyChange(propertyWithBonus)
    } else {
      setSelectedPropertyName("")
      if (onPropertyChange) onPropertyChange(null)
      form.setValue("property_id", "", { shouldValidate: true })
    }
  }

  useEffect(() => {
    // Prevent refetching on every render by tracking if we've already fetched
    if (!user || hasFetchedRef.current) return
    
    // Mark that we've fetched to avoid repeated calls
    hasFetchedRef.current = true
    
    // Execute the fetch
    fetchProperties()
    
    // Disable the frequent refetching by listening to the visibilitychange event
    const handleVisibilityChange = () => {
      // Don't refetch on visibility change
      if (document.visibilityState === 'visible') {
        // Deliberately empty - we don't want to trigger a refetch
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);  // Only depend on user

  // Handle initial property or property ID changes in a separate effect
  useEffect(() => {
    if (!initialLoad || hasFetchedRef.current === false) return;
    
    // Handle initial property if provided
    if (initialProperty && initialLoad) {
      setSelectedPropertyName(initialProperty.name);
      if (onPropertyChange) onPropertyChange(initialProperty);
      setInitialLoad(false);
    } else if (propertyId && initialLoad) {
      // Find selected property in our properties array
      const selectedProperty = properties.find(p => p.id === propertyId);
      if (selectedProperty) {
        setSelectedPropertyName(selectedProperty.name);
        if (onPropertyChange) onPropertyChange(selectedProperty);
      }
      setInitialLoad(false);
    }
  }, [initialProperty, propertyId, properties, initialLoad, onPropertyChange]);

  const formatPropertyOption = (property: Property, isSelected: boolean = false) => {
    return (
      <div className="w-full py-1">
        <div className="flex flex-col items-start">
          <span className={`text-base font-regular ${isSelected ? 'text-inherit' : 'text-foreground'}`}>
            {property.name}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm ${isSelected ? 'text-inherit/90' : 'text-muted-foreground'}`}>
              {t("form.property_cost", { ns: "properties" })}: {formatAmount(property.price_cost, property.currency)}
            </span>
            {property.bonus > 0 && (
              <>
                <span className={`text-sm ${isSelected ? 'text-inherit/75' : 'text-muted-foreground/75'}`}>|</span>
                <span className={`text-sm ${isSelected ? 'text-inherit/90' : 'text-muted-foreground'}`}>
                  {t("bonus.amount", { ns: "properties" })}: {formatAmount(property.bonus, "PEN")}
                </span>
              </>
            )}
            {property.property_insurance !== null && 
             !(property.property_insurance_type === "manual" && property.property_insurance === 0) && (
              <>
                <span className={`text-sm ${isSelected ? 'text-inherit/75' : 'text-muted-foreground/75'}`}>|</span>
                <span className={`text-sm ${isSelected ? 'text-inherit/90' : 'text-muted-foreground'}`}>
                  {t("form.property_insurance", { ns: "properties" })}: {formatAmount(property.property_insurance, property.currency)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getSelectedPropertyDisplay = () => {
    if (loading) return t('ui.loading', { ns: 'global' })
    if (!propertyId) return t('form.select_property', 'Select a Property', { ns: 'properties' })
    const property = properties.find(p => p.id === propertyId)
    if (!property) return selectedPropertyName || t('form.select_property', 'Select a Property', { ns: 'properties' })
    return selectedPropertyName || property.name
  }

  return (
    <FormField
      control={form.control}
      name="property_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('sections.properties', { ns: 'dashboard' })}</FormLabel>
          <Select
            onValueChange={(value) => {
              field.onChange(value)
              handlePropertyChange(value)
            }}
            value={field.value || ""}
            disabled={disabled || loading}
          >
            <FormControl>
              <SelectTrigger className="form-control-focus h-auto flex items-center py-2">
                <SelectValue 
                  placeholder={t('form.select_property', 'Select a Property', { ns: 'properties' })} 
                  className="text-left"
                >
                  {getSelectedPropertyDisplay()}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {properties.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                  {t('messages.no_properties', 'No properties found', { ns: 'properties' })}
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
