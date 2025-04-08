import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { PropertyDetails } from "./property-details"
import { MonthlyCosts } from "./monthly-costs"
import { BonusSection } from "./bonus-section"
import { Property, BonusRule } from "./types"
import { useTranslation } from "react-i18next"

const formSchema = z.object({
  name: z.string().min(1, "validation.property_name_required"),
  description: z.string().optional(),
  price_cost: z.string().min(1, "validation.price_required"),
  currency: z.enum(["PEN", "USD"]).default("PEN"),
  property_insurance: z.string().optional(),
  property_insurance_type: z.enum(["auto", "manual"]).default("auto"),
  is_sustainable: z.boolean().default(false),
  is_first_home: z.boolean().default(false),
})

type PropertyFormProps = {
  onSuccess: () => void
  onClose: () => void
  selectedProperty: Property | null
  bonusRules: BonusRule[]
}

export function PropertyForm({ onSuccess, onClose, selectedProperty, bonusRules }: PropertyFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const { t: tGlobal } = useTranslation('global')
  const { t: tProperties } = useTranslation('properties')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!user) throw new Error(tGlobal('messages.no_user_found', 'User not found', { ns: 'properties' }))

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
        const { error } = await supabase
          .from("properties")
          .insert(propertyData)

        if (error) throw error

        toast({
          title: tGlobal('ui.success'),
          description: tProperties('messages.property_added'),
        })
      }
      
      onSuccess()
      onClose()
      form.reset()
    } catch (error) {
      console.error("Error saving property:", error)
      toast({
        variant: "destructive",
        title: tGlobal('ui.error'),
        description: tProperties('messages.error_saving'),
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <PropertyDetails form={form} isNewProperty={!selectedProperty} />
        <MonthlyCosts form={form} />
        <BonusSection form={form} bonusRules={bonusRules} />
        
        <Button type="submit" className="w-full">
          {selectedProperty ? tGlobal('ui.update') : tGlobal('ui.create')}
        </Button>
      </form>
    </Form>
  )
}
