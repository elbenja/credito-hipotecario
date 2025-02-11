
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import { format, startOfMonth, addMonths } from "date-fns"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Calendar as CalendarIcon, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/integrations/supabase/client"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

type Property = {
  id: string
  name: string
  price_cost: number
  currency: "USD" | "PEN"
}

type InterestRateLimit = {
  min_rate: number
  max_rate: number
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  property_id: z.string().min(1, "Property is required"),
  down_payment: z.string().min(1, "Down payment is required"),
  interest_rate: z.string()
    .min(1, "Interest rate is required")
    .refine(
      (value) => {
        const rate = parseFloat(value)
        return !isNaN(rate)
      },
      "Must be a valid number"
    ),
  term_years: z.string().min(1, "Term is required"),
  installments_per_year: z.string().min(1, "Installments per year is required"),
  first_installment_date: z.date({
    required_error: "First installment date is required",
  }),
})

export default function NewAmortization() {
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [interestRateLimits, setInterestRateLimits] = useState<InterestRateLimit>({
    min_rate: 1,
    max_rate: 25
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      property_id: "",
      down_payment: "",
      interest_rate: "10",
      term_years: "",
      installments_per_year: "",
      first_installment_date: startOfMonth(addMonths(new Date(), 1)),
    },
  })

  const downPayment = parseFloat(form.watch("down_payment").replace(/[^0-9.]/g, "")) || 0
  const downPaymentPercentage = selectedProperty
    ? ((downPayment / selectedProperty.price_cost) * 100).toFixed(1)
    : "0.0"
  const loanAmount = selectedProperty
    ? selectedProperty.price_cost - downPayment
    : 0

  useEffect(() => {
    const loadProperties = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, price_cost, currency")
        .eq("user_id", user.id)

      if (error) {
        console.error("Error loading properties:", error)
        return
      }

      // Validate and filter the properties to ensure they match our type
      const validProperties = (data || []).filter(
        (p): p is Property => p.currency === "USD" || p.currency === "PEN"
      )
      
      setProperties(validProperties)
    }

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
      // If no data is found, we'll use the default values set in useState
    }

    loadProperties()
    loadInterestRateLimits()
  }, [user])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    console.log(values)
    // TODO: Implement save functionality
  }

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId)
    setSelectedProperty(property || null)
    form.setValue("property_id", propertyId)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
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

        <div className="space-y-6">
          <h1 className="text-3xl font-bold">New Amortization</h1>
          
          <div className="max-w-2xl">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter amortization name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="property_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property</FormLabel>
                      <Select
                        onValueChange={handlePropertyChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a property" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id}>
                              {property.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="down_payment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Down Payment</FormLabel>
                          <FormControl>
                            <CurrencyInput
                              {...field}
                              currency={selectedProperty?.currency || "PEN"}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedProperty && (
                      <Badge variant="outline" className="text-xs">
                        {downPaymentPercentage}%
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium">Loan Amount</div>
                    <div className="text-2xl font-bold">
                      {selectedProperty?.currency === "USD" ? "$" : "S/"}{" "}
                      {loanAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <Separator />

                <FormField
                  control={form.control}
                  name="interest_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Rate (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type="number"
                            step="0.1"
                            min={interestRateLimits?.min_rate}
                            max={interestRateLimits?.max_rate}
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            %
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="term_years"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Term (Years)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select term" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[10, 15, 20, 25, 30].map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year} years
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="installments_per_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Installments Per Year</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="12">Monthly (12)</SelectItem>
                            <SelectItem value="14">Bimonthly + 2 (14)</SelectItem>
                            <SelectItem value="24">Biweekly (24)</SelectItem>
                            <SelectItem value="26">Every 2 weeks (26)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="first_installment_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>First Installment Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
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
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-4">
                  <Button type="submit">
                    Save
                  </Button>
                  <Button type="button" variant="secondary">
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
