import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { PropertySelect, Property } from "@/components/amortizations/property-select"
import { SEO } from "@/components/seo"
import { amortizationFormSchema, type AmortizationFormValues, defaultValues } from "@/components/amortizations/schema"
import { Form } from "@/components/ui/form"

export default function TestExtraInstallments() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const form = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues: {
      ...defaultValues,
      name: "Test Amortization"
    },
  })

  return (
    <div className="container mx-auto py-8">
      <SEO 
        title="Test Extra Installments - CreditoHipotecar.io"
        description="Testing page for property selection and extra installments functionality"
      />
      
      <h1 className="text-2xl font-bold mb-6">Property Selection Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Property Selection Section */}
        <div className="space-y-4">
          <Form {...form}>
            <form className="space-y-6">
              <PropertySelect 
                form={form} 
                onPropertyChange={setSelectedProperty}
              />
            </form>
          </Form>
        </div>

        {/* Selected Property Details Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold mb-4">Selected Property Details</h2>
          <div className="p-6 border rounded-lg">
            {selectedProperty ? (
              <div className="space-y-2">
                <p><span className="font-medium">Name:</span> {selectedProperty.name}</p>
                <p><span className="font-medium">Price:</span> {selectedProperty.price_cost} {selectedProperty.currency}</p>
                <p><span className="font-medium">First Home:</span> {selectedProperty.is_first_home ? "Yes" : "No"}</p>
                <p><span className="font-medium">Sustainable:</span> {selectedProperty.is_sustainable ? "Yes" : "No"}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">No property selected</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 