import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
// import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { PropertyDetails } from "./property-details"
import { MonthlyCosts } from "./monthly-costs"
import { BonusSection } from "./bonus-section"
import { Property, PropertyWithBonus } from "@/types/property"
import { useTranslation } from "react-i18next"
import { useMemo, useState, useEffect, useRef } from "react"

// import { LoanCalculator } from "@/utils/calculations/mortgage/loan"
// import { useExchangeRate } from "@/hooks/use-exchange-rate"

import { useAddProperty } from "@/hooks/properties"
// Define the schema creator function that takes the translation function
import { updateDependentMortgages } from "@/services/mortgages/updateDependent"
import { useUpdateProperty } from "@/hooks/properties/useUpdate"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useBonusRules } from "@/hooks/useBonusRules"


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
  selectedProperty: PropertyWithBonus | null
  onSuccess: (updated: Property) => void;
    // onSuccess: () => void
    onClose: () => void
}

export function PropertyForm({ onSuccess, onClose, selectedProperty }: PropertyFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { t: tGlobal } = useTranslation('global')
  const { t: tProperties } = useTranslation('properties')
  const { t: tComponents } = useTranslation('components')
  // const { data: exchangeRate } = useExchangeRate()
  // const queryClient = useQueryClient()

  const addProperty = useAddProperty()
  const updateProperty = useUpdateProperty();

  // Local state
  const [isLoading, setIsLoading] = useState(false);

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

  const queryClient = useQueryClient()
  const depMutation = useMutation({
    mutationKey: ['updateDependentMortgages'],
    mutationFn: ({ userId, propertyId }: { userId: string; propertyId: string }) =>
      updateDependentMortgages(userId, propertyId),
    onError: (err) => console.error('failed to update dependents', err),
    onSuccess: () => {
      // Refresh both the combined list and individual mortgages caches
      queryClient.invalidateQueries({ queryKey: ['properties-with-mortgages'] });
      queryClient.invalidateQueries({ queryKey: ['mortgages'] });
    },
  })

  const { data: bonusRules = [] } = useBonusRules()
  // console.log("[PropertyForm] selectedProperty:", selectedProperty);

  async function onSubmit(values: z.infer<typeof propertyFormSchema>) {
    try {
      if (!user) throw new Error(tGlobal('messages.no_user_found', 'User not found', { ns: 'properties' }))

// calculate bonus May 16
        const price = parseFloat(values.price_cost)
        const firstHome = values.is_first_home
        const sustainable = values.is_sustainable
          // Find the bracket
          const rule = bonusRules.find(r => price >= r.min_value && price < r.max_value)

          // Derive bonus exactly as in your UI
          const bonus =
            firstHome && rule
              ? sustainable
                ? rule.sustainable_bonus
                : rule.traditional_bonus
              : 0

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
        bonus,                  // ← your new field May 16
      }

      // let updatedProperty: Property | null = null;

      if (selectedProperty) {
        // merge form fields onto selectedProperty
        const payload = { ...selectedProperty, ...propertyData };


          // // 2. strip bonus off the selectedProperty
          // const { bonus, ...base } = selectedProperty;

          // // 3. merge into a pure Property payload
          // const payload: Property = { ...base, ...propertyData };



        try {
          const fresh = await updateProperty.mutateAsync(payload);
          // console.log("[PropertyForm v2] mutateAsync → fresh:", payload);
          onSuccess(payload);
          onClose();
        } catch (err) {
          console.error("[PropertyForm] mutation error", err);
          // show toast or error message
        }

        toast({
          title: tGlobal('ui.success'),
          description: tProperties('messages.property_updated'),
        })

        // start updateDependentMortgages

        
        // Check if any critical property fields changed
        const criticalFieldsChanged = 
          selectedProperty.price_cost !== propertyData.price_cost ||
          selectedProperty.currency !== propertyData.currency ||
          selectedProperty.property_insurance !== propertyData.property_insurance ||
          selectedProperty.is_first_home !== propertyData.is_first_home ||
          selectedProperty.is_sustainable !== propertyData.is_sustainable;


        // Update dependent mortgages if critical fields changed
        if (criticalFieldsChanged ) {

          // await updateDependentMortgages(selectedProperty.id);
          depMutation.mutate({ userId: user.id, propertyId: selectedProperty.id })
        }
        // end updateDependentMortgages


      } else {
        // Optimistically add new property
        addProperty.mutate(propertyData, {
          onSuccess: (newProperty) => {
            console.log("PROPERTY FORM: Property created successfully");
            toast({
              title: tGlobal('ui.success'),
              description: tProperties('messages.property_added'),
            });
            // onSuccess();
            onClose();
            form.reset();
          },
          onError: (err) => {
            console.error("PROPERTY FORM: Error creating property:", err);
            toast({
              variant: "destructive",
              title: tGlobal('ui.error'),
              description: tProperties('messages.error_saving'),
            });
          },
        });
        return;
      }
      
      // onSuccess(payload)
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
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8 h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
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
