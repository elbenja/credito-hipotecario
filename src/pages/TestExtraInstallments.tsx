import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { PropertySelect, Property, PropertyDisplay } from "@/components/amortizations/property-select"
import { SEO } from "@/components/seo"
import { amortizationFormSchema, type AmortizationFormValues, defaultValues } from "@/components/amortizations/schema"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, formatCurrency, formatDate } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { ExtraInstallmentsSection } from "@/components/amortizations/extra-installments-section"
import { ScenariosComparison } from "@/components/amortizations/scenarios-comparison"
import { LoanCalculator } from "@/services/amortization/calculations/loan"
import { useScenarioCalculations } from "@/hooks/use-scenario-calculations"
import type { Database } from "@/types/supabase"

type Amortization = Database['public']['Tables']['amortizations']['Row']
type ExtraInstallment = Database['public']['Tables']['extra_installments']['Row']
type RateChange = Database['public']['Tables']['rate_changes']['Row']

interface PaymentRow {
  payment_date: string | Date
  capital: number
  interest: number
  property_insurance: number
  loan_insurance: number
  monthly_payment: number
  is_different_from_base: boolean
}

interface ScenarioSummary {
  total_interest_and_insurance: number
  total_months: number
  monthly_payment: number
}

interface Scenario {
  summary: ScenarioSummary
  payments: PaymentRow[]
}

interface Scenarios {
  regular?: Scenario
  accelerated?: Scenario
  lower_payment?: Scenario
  new_rate?: Scenario
}

export default function TestExtraInstallments() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [selectedAmortization, setSelectedAmortization] = useState<Amortization | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const propertyForm = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
    defaultValues: {
      ...defaultValues,
      name: "Test Amortization"
    },
  })

  const amortizationForm = useForm<AmortizationFormValues>({
    resolver: zodResolver(amortizationFormSchema),
  })

  const { data: linkedAmortizations = [], isLoading: isLoadingAmortizations } = useQuery({
    queryKey: ["linked-amortizations", selectedProperty?.id],
    queryFn: async () => {
      if (!user || !selectedProperty) return []

      const { data, error } = await supabase
        .from("amortizations")
        .select("*")
        .eq("property_id", selectedProperty.id)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error fetching amortizations:", error)
        return []
      }

      return data as Amortization[]
    },
    enabled: !!user && !!selectedProperty?.id,
  })

  const handlePropertyChange = (property: Property | null) => {
    setSelectedProperty(property)
    setSelectedAmortization(null)
    if (property) {
      setIsEditing(false)
    }
  }

  const handleAmortizationSelect = (amortization: Amortization) => {
    setSelectedAmortization(amortization)
    // Update form values when selecting an amortization
    amortizationForm.reset({
      name: amortization.name,
      property_id: amortization.property_id,
      down_payment: amortization.down_payment.toString(),
      interest_rate: amortization.interest_rate.toString(),
      term_years: amortization.term_years.toString(),
      installments_per_year: amortization.installments_per_year.toString(),
      first_installment_date: new Date(amortization.first_installment_date),
      loan_protection_type: amortization.loan_protection_type,
      loan_protection_insurance: amortization.loan_protection_insurance?.toString(),
    })
  }

  const onUpdateAmortization = async (values: AmortizationFormValues) => {
    try {
      if (!selectedAmortization || !selectedProperty) return

      const downPayment = parseFloat(values.down_payment.replace(/[^0-9.]/g, ""))
      const loanAmount = selectedProperty.price_cost - downPayment

      const amortizationData = {
        name: values.name,
        down_payment: downPayment,
        interest_rate: parseFloat(values.interest_rate),
        term_years: parseInt(values.term_years),
        installments_per_year: parseInt(values.installments_per_year),
        first_installment_date: values.first_installment_date.toISOString(),
        loan_amount: loanAmount,
        loan_protection_type: values.loan_protection_type,
        loan_protection_insurance: values.loan_protection_insurance ? parseFloat(values.loan_protection_insurance) : undefined,
      }

      const { error } = await supabase
        .from("amortizations")
        .update(amortizationData)
        .eq('id', selectedAmortization.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Amortization updated successfully",
      })

      // Refresh the amortizations list
      queryClient.invalidateQueries({
        queryKey: ["linked-amortizations", selectedProperty.id]
      })
    } catch (error) {
      console.error("Error updating amortization:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error updating the amortization",
      })
    }
  }

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
          <Form {...propertyForm}>
            <form className="space-y-6">
              {isEditing ? (
                <PropertySelect 
                  form={propertyForm} 
                  onPropertyChange={handlePropertyChange}
                />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Property
                    </span>
                  </div>
                  {selectedProperty && <PropertyDisplay property={selectedProperty} />}
                </div>
              )}
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

      {/* Amortizations Section - Only shown when property is selected */}
      {selectedProperty && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-6">Amortizations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Linked Amortizations List */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Linked Amortizations</h3>
              <div className="space-y-4">
                {isLoadingAmortizations ? (
                  <p className="text-muted-foreground">Loading amortizations...</p>
                ) : linkedAmortizations.length > 0 ? (
                  linkedAmortizations.map((amortization) => (
                    <div
                      key={amortization.id}
                      className={`p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors ${
                        selectedAmortization?.id === amortization.id ? 'border-primary' : ''
                      }`}
                      onClick={() => handleAmortizationSelect(amortization)}
                    >
                      <h4 className="font-medium">{amortization.name}</h4>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>Loan Amount: {formatCurrency(amortization.loan_amount, selectedProperty.currency)}</p>
                        <p>Interest Rate: {amortization.interest_rate}%</p>
                        <p>First Payment: {formatDate(new Date(amortization.first_installment_date))}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No amortizations found for this property.</p>
                )}
              </div>
            </div>

            {/* Editable Amortization Information */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Amortization Details</h3>
              <div className="p-6 border rounded-lg">
                {selectedAmortization ? (
                  <Form {...amortizationForm}>
                    <form onSubmit={amortizationForm.handleSubmit(onUpdateAmortization)} className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-4">Basics</h4>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={amortizationForm.control}
                              name="down_payment"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Down Payment</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={amortizationForm.control}
                              name="property_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Property %</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      value={((parseFloat(amortizationForm.watch("down_payment") || "0") / selectedProperty.price_cost) * 100).toFixed(2)}
                                      onChange={(e) => {
                                        const percentage = parseFloat(e.target.value)
                                        const downPayment = (percentage / 100 * selectedProperty.price_cost).toString()
                                        amortizationForm.setValue("down_payment", downPayment)
                                      }}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={amortizationForm.control}
                              name="loan_protection_type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Loan Protection Insurance</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="individual">Individual</SelectItem>
                                      <SelectItem value="joint">Joint</SelectItem>
                                      <SelectItem value="none">None</SelectItem>
                                      <SelectItem value="custom">Custom Amount</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={amortizationForm.control}
                              name="loan_protection_insurance"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Monthly Insurance Cost</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={amortizationForm.control}
                              name="interest_rate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Interest rate</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" step="0.01" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={amortizationForm.control}
                              name="term_years"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Amortization Term</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select term" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {[5, 10, 15, 20, 25, 30].map((years) => (
                                        <SelectItem key={years} value={years.toString()}>
                                          {years} years
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={amortizationForm.control}
                              name="installments_per_year"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Installments per Year</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select installments" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="12">Regular (12)</SelectItem>
                                      <SelectItem value="14">Double (14)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={amortizationForm.control}
                              name="first_installment_date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>First Date</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "w-full pl-3 text-left font-normal",
                                            !field.value && "text-muted-foreground"
                                          )}
                                        >
                                          {field.value ? (
                                            formatDate(field.value)
                                          ) : (
                                            <span>Pick a date</span>
                                          )}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={field.value}
                                        onSelect={field.onChange}
                                        disabled={(date) =>
                                          date < new Date() || date < new Date("1900-01-01")
                                        }
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      <Button type="submit" className="w-full">Update</Button>
                    </form>
                  </Form>
                ) : (
                  <p className="text-muted-foreground">Select an amortization to view details</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Extra Installments Section */}
      {selectedAmortization && selectedProperty && (
        <>
          <div className="mt-8">
            <ExtraInstallmentsSection
              amortizationId={selectedAmortization.id}
              currency={selectedProperty.currency}
              loanAmount={selectedAmortization.loan_amount}
              onInstallmentsChange={() => {
                // Refresh the amortizations list when installments change
                queryClient.invalidateQueries({
                  queryKey: ["linked-amortizations", selectedProperty.id]
                })
                // Also invalidate scenarios
                queryClient.invalidateQueries({
                  queryKey: ["scenarios", selectedAmortization.id]
                })
              }}
            />
          </div>

          <ScenarioCalculationsSection 
            amortization={selectedAmortization}
            property={selectedProperty}
          />
        </>
      )}
    </div>
  )
}

// New component to handle scenario calculations
function ScenarioCalculationsSection({ 
  amortization,
  property 
}: { 
  amortization: Amortization
  property: Property
}) {
  console.log('Amortization:', amortization)
  console.log('Property:', property)

  const { scenarios, isLoading, extraInstallments, rateChanges } = useScenarioCalculations({
    amortizationId: amortization.id,
    loan_amount: amortization.loan_amount,
    interest_rate: amortization.interest_rate,
    term_years: amortization.term_years,
    installments_per_year: amortization.installments_per_year,
    first_installment_date: amortization.first_installment_date,
    property_insurance: property.property_insurance || 0,
    loan_insurance: amortization.loan_protection_insurance || 0
  })

  console.log('Scenarios:', scenarios)
  console.log('Extra Installments:', extraInstallments)
  console.log('Rate Changes:', rateChanges)
  console.log('Is Loading:', isLoading)

  if (isLoading) {
    return (
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-6">Payment Scenarios</h2>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Calculating scenarios...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-6">Payment Scenarios</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Accelerated Scenario</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios.accelerated?.summary.total_interest_and_insurance || 0, property.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months</p>
                <p className="text-lg font-medium">{scenarios.accelerated?.summary.total_months || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios.accelerated?.summary.monthly_payment || 0, property.currency)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Capital</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Interest</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Property Insurance</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Loan Insurance</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Monthly Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.accelerated?.payments.map((payment, index) => (
                    <tr key={index} className={payment.is_different_from_base ? "bg-muted/50" : undefined}>
                      <td className="text-left">{formatDate(new Date(payment.payment_date))}</td>
                      <td className="text-right">{formatCurrency(payment.capital, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.interest, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.property_insurance, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.loan_insurance, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.monthly_payment, property.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Lower Payment Scenario</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios.lower_payment?.summary.total_interest_and_insurance || 0, property.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months</p>
                <p className="text-lg font-medium">{scenarios.lower_payment?.summary.total_months || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios.lower_payment?.summary.monthly_payment || 0, property.currency)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Capital</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Interest</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Property Insurance</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Loan Insurance</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Monthly Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.lower_payment?.payments.map((payment, index) => (
                    <tr key={index} className={payment.is_different_from_base ? "bg-muted/50" : undefined}>
                      <td className="text-left">{formatDate(new Date(payment.payment_date))}</td>
                      <td className="text-right">{formatCurrency(payment.capital, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.interest, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.property_insurance, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.loan_insurance, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.monthly_payment, property.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Regular Scenario</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios.regular?.summary.total_interest_and_insurance || 0, property.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months</p>
                <p className="text-lg font-medium">{scenarios.regular?.summary.total_months || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios.regular?.summary.monthly_payment || 0, property.currency)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Capital</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Interest</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Property Insurance</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Loan Insurance</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Monthly Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.regular?.payments.map((payment, index) => (
                    <tr key={index} className={payment.is_different_from_base ? "bg-muted/50" : undefined}>
                      <td className="text-left">{formatDate(new Date(payment.payment_date))}</td>
                      <td className="text-right">{formatCurrency(payment.capital, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.interest, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.property_insurance, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.loan_insurance, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.monthly_payment, property.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h3 className="text-xl font-semibold mb-4">New Rate Scenario</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Sum Interest & Insurances</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios.new_rate?.summary.total_interest_and_insurance || 0, property.currency)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Months</p>
                <p className="text-lg font-medium">{scenarios.new_rate?.summary.total_months || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Payment</p>
                <p className="text-lg font-medium">
                  {formatCurrency(scenarios.new_rate?.summary.monthly_payment || 0, property.currency)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Capital</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Interest</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Property Insurance</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Loan Insurance</th>
                    <th className="text-right text-sm font-medium text-muted-foreground">Monthly Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.new_rate?.payments.map((payment, index) => (
                    <tr key={index} className={payment.is_different_from_base ? "bg-muted/50" : undefined}>
                      <td className="text-left">{formatDate(new Date(payment.payment_date))}</td>
                      <td className="text-right">{formatCurrency(payment.capital, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.interest, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.property_insurance, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.loan_insurance, property.currency)}</td>
                      <td className="text-right">{formatCurrency(payment.monthly_payment, property.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 