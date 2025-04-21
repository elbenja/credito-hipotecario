import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { useSubscription } from "@/context/subscription-context"
import { PropertyDetails } from "./property-details"
import { MonthlyCosts } from "./monthly-costs"
import { BonusSection } from "./bonus-section"
import { Property, BonusRule } from "./types"
import { useTranslation } from "react-i18next"
import { useMemo, useState, useEffect, useRef } from "react"
import { NoMoreSpace } from "@/components/common/NoMoreSpace"

// Define the schema creator function that takes the translation function
export const createPropertyFormSchema = (t: any) => z.object({
  name: z.string().min(1, {
    message: t('property_form.validation.property_name_required', 'Property name is required', { ns: 'components' })
  }),
  description: z.string().optional(),
  price_cost: z.string().min(1, {
    message: t('property_form.validation.price_required', 'Property price is required', { ns: 'components' })
  }),
  currency: z.enum(["PEN", "USD"]).default("PEN"),
  property_insurance: z.string().optional(),
  property_insurance_type: z.enum(["auto", "manual"]).default("auto"),
  is_sustainable: z.boolean().default(false),
  is_first_home: z.boolean().default(false),
})

// Define a type that can be used by child components
export type PropertyFormSchema = z.infer<ReturnType<typeof createPropertyFormSchema>>

type PropertyFormProps = {
  onSuccess: () => void
  onClose: () => void
  selectedProperty: Property | null
}

export function PropertyForm({ onSuccess, onClose, selectedProperty }: PropertyFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { t: tGlobal } = useTranslation('global')
  const { t: tProperties } = useTranslation('properties')
  const { t: tComponents } = useTranslation('components')
  
  // Using the global subscription context
  const {
    isLimitReached,
    getCurrentUsage,
    planName,
    limits
  } = useSubscription();
  
  // Local state
  const [isLoading, setIsLoading] = useState(false);
  const [showLimitReached, setShowLimitReached] = useState(false);
  const [currentUsage, setCurrentUsage] = useState(0);
  const [checkComplete, setCheckComplete] = useState(false);
  const isMounted = useRef(false);

  // Create the schema with translations
  const propertyFormSchema = useMemo(() => 
    createPropertyFormSchema(tComponents), 
    [tComponents]
  )

  const form = useForm<z.infer<typeof propertyFormSchema>>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: selectedProperty?.name || "",
      description: selectedProperty?.description || "",
      price_cost: selectedProperty?.price_cost.toString() || "",
      currency: (selectedProperty?.currency as "PEN" | "USD") || "PEN",
      property_insurance: selectedProperty?.property_insurance?.toString() || "",
      property_insurance_type: selectedProperty?.property_insurance_type || "auto",
      is_sustainable: selectedProperty?.is_sustainable || false,
      is_first_home: selectedProperty?.is_first_home || false,
    },
  })

  // Check limits only once when the component mounts
  useEffect(() => {
    // Prevent multiple executions
    if (isMounted.current) return;
    isMounted.current = true;
    
    // Skip if editing existing property
    if (selectedProperty) {
      setCheckComplete(true);
      return;
    }
    
    const checkLimits = async () => {
      try {
        setIsLoading(true);
        
        console.log("PROPERTY FORM: Checking limits for new property creation");
        
        // Get current usage and limits from subscription context
        // This will bypass cache for properties due to our subscription context changes
        const usage = await getCurrentUsage('property');
        setCurrentUsage(usage);
        
        // Check if limit is reached
        const reached = await isLimitReached('property');
        console.log(`PROPERTY FORM: Limit check result: ${reached ? 'REACHED' : 'NOT REACHED'} (${usage}/${limits.properties})`);
        
        setShowLimitReached(reached);
        setCheckComplete(true);
      } catch (error) {
        console.error("Error checking subscription limits:", error);
        // Default to showing the form on error
        setCheckComplete(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkLimits();
    // Include all dependencies but it only runs once due to isMounted ref
  }, [selectedProperty, isLimitReached, getCurrentUsage, limits]);

  async function onSubmit(values: z.infer<typeof propertyFormSchema>) {
    try {
      if (!user) throw new Error(tGlobal('messages.no_user_found', 'User not found', { ns: 'properties' }))

      // For new properties, check limits again before submission
      if (!selectedProperty) {
        // Always get a fresh count - this will bypass cache for properties
        const currentCount = await getCurrentUsage('property');
        setCurrentUsage(currentCount);
        
        const limitReached = await isLimitReached('property');
        if (limitReached) {
          console.log("PROPERTY FORM: Blocking submission - limit reached");
          toast({
            variant: "destructive",
            title: tGlobal('ui.error'),
            description: tProperties('messages.plan_limit_reached', 'You have reached your plan limit for properties.'),
          });
          setShowLimitReached(true);
          return;
        }
      }

      const propertyData = {
        name: values.name,
        description: values.description,
        price_cost: parseFloat(values.price_cost),
        currency: values.currency,
        property_insurance: values.property_insurance ? parseFloat(values.property_insurance) : null,
        property_insurance_type: values.property_insurance_type,
        is_sustainable: values.is_sustainable,
        is_first_home: values.is_first_home,
        user_id: user.id,
      }

      if (selectedProperty) {
        const { error } = await supabase
          .from("properties")
          .update(propertyData)
          .eq('id', selectedProperty.id)

        if (error) throw error

        toast({
          title: tGlobal('ui.success'),
          description: tProperties('messages.property_updated'),
        })
      } else {
        console.log("PROPERTY FORM: Creating new property");
        const { data, error } = await supabase
          .from("properties")
          .insert(propertyData)
          .select()

        if (error) throw error

        console.log("PROPERTY FORM: Property created successfully");
        toast({
          title: tGlobal('ui.success'),
          description: tProperties('messages.property_added'),
        })
      }
      
      onSuccess()
      onClose()
      form.reset()
    } catch (error) {
      console.error("PROPERTY FORM: Error during submission:", error)
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tProperties('messages.error_saving'),
      })
    }
  }

  // Show loading spinner
  if (isLoading || !checkComplete) {
    return (
      <div className="flex justify-center items-center p-8 h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }
  
  // Show the NoMoreSpace component if limit reached
  if (showLimitReached && !selectedProperty) {
    return (
      <NoMoreSpace 
        resourceType="property"
        currentUsage={currentUsage}
        planLimit={limits.properties}
        currentPlan={planName}
        nextPlan={planName === 'personal' ? {
          name: 'Professional',
          properties: 5,
          mortgages: 15,
          rentals: 10,
          price: 24.90
        } : undefined}
        onBack={onClose}
      />
    );
  }

  // Show the form
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <PropertyDetails form={form} isNewProperty={!selectedProperty} />
        <MonthlyCosts form={form} />
        <BonusSection form={form} />
        
        <Button type="submit" className="w-full">
          {selectedProperty ? tGlobal('ui.update') : tGlobal('ui.create')}
        </Button>
      </form>
    </Form>
  );
}
