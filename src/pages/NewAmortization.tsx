import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Plus, PlayCircle } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { EditableHeading } from "@/components/ui/editable-heading"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { PropertySelect, type Property } from "@/components/amortizations/property-select"
import { LoanDetails } from "@/components/amortizations/loan-details"
import { 
  amortizationFormSchema, 
  defaultValues, 
  type AmortizationFormValues 
} from "@/components/amortizations/schema"

export default function NewAmortization() {
  const { user } = useAuth()
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [interestRateLimits, setInterestRateLimits] = useState({
    min_rate: 4,
    max_rate: 18
  })

  const form = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues,
  })

  const formName = form.watch("name")

  useEffect(() => {
    const setupDefaultName = async () => {
      if (!user || formName) return

      try {
        // Get the user's current counter
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_property_number')
          .eq('id', user.id)
          .single()

        const nextNumber = (profile?.last_property_number || 0) + 1

        // Update the counter in the database
        await supabase
          .from('profiles')
          .update({ last_property_number: nextNumber })
          .eq('id', user.id)

        // Set the default name
        form.setValue("name", `Amortization #${nextNumber}`, { shouldValidate: true })
      } catch (error) {
        console.error('Error setting up default amortization name:', error)
      }
    }

    setupDefaultName()
  }, [user, form, formName])

  useEffect(() => {
    const loadInterestRateLimits = async () => {
      const { data, error } = await supabase
        .from("interest_rate_limits")
        .select("min_rate, max_rate")
        .eq("is_active", true)
        .maybeSingle()

      if (error) {
        console.error("Error loading interest rate limits:", error)
        return
      }
      
      if (data) {
        setInterestRateLimits(data)
      }
    }

    loadInterestRateLimits()
  }, [])

  const handleNameChange = (newName: string) => {
    form.setValue("name", newName, { shouldValidate: true })
  }

  const onSubmit = async (values: AmortizationFormValues) => {
    try {
      if (!user || !selectedProperty) return

      const interestRate = parseFloat(values.interest_rate)
      if (interestRate < interestRateLimits.min_rate || interestRate > interestRateLimits.max_rate) {
        return
      }

      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, ""))
      const loanAmount = selectedProperty.price_cost - downPayment

      const amortizationData = {
        name: values.name,
        property_id: values.property_id,
        down_payment: downPayment,
        interest_rate: interestRate,
        term_years: parseInt(values.term_years),
        installments_per_year: parseInt(values.installments_per_year),
        first_installment_date: values.first_installment_date.toISOString(),
        loan_amount: loanAmount,
        user_id: user.id,
        total_payment: 0,
        total_interest: 0,
        installment_amount: 0,
      }

      const { error } = await supabase
        .from("amortizations")
        .insert(amortizationData)

      if (error) throw error

      window.location.href = "/amortizations"
    } catch (error) {
      console.error("Error saving amortization:", error)
    }
  }

  return (
    <DashboardLayout
      header={{
        title: (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <Link to="/amortizations" className="transition-colors hover:text-foreground">
                  Amortizations
                </Link>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>New Amortization</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )
      }}
    >
      <div>
        <div className="px-8 py-4">
          <EditableHeading 
            value={formName || ""} 
            onChange={handleNameChange}
          />
        </div>

        <Separator />
        
        <div className="space-y-6 px-8 pt-6">
          <div className="max-w-2xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <PropertySelect 
                  form={form}
                  onPropertyChange={setSelectedProperty}
                  disabled={false}
                />

                <LoanDetails 
                  form={form}
                  selectedProperty={selectedProperty}
                  interestRateLimits={interestRateLimits}
                />

                <Separator className="w-[calc(100%+4rem)] -mx-8" />

                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full">
                    Save
                  </Button>
                  <Button type="button" variant="secondary" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Save & Create Rental Scenario
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
