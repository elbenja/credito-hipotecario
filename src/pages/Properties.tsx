
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"

const formSchema = z.object({
  name: z.string().min(1, "Property name is required"),
  description: z.string().optional(),
  price_cost: z.string().min(1, "Price is required"),
  currency: z.enum(["PEN", "USD"]).default("PEN"),
  property_insurance: z.string().optional(),
  other_expenses: z.string().optional(),
})

type Property = {
  id: string
  name: string
  price_cost: number
  currency: string
  property_insurance: number | null
  other_expenses: number | null
  is_first_home: boolean
  description?: string | null
}

const formatCurrency = (amount: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'PEN' ? 'PEN' : 'USD',
    currencyDisplay: 'symbol',
  })
  
  const formatted = formatter.format(amount)
  return currency === 'PEN' ? formatted.replace('PEN', 'S/') : formatted
}

export default function Properties() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Property;
    direction: 'asc' | 'desc';
  } | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const loadProperties = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error loading properties:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load properties",
      })
    }
  }

  useEffect(() => {
    loadProperties()
  }, [user])

  const handleSort = (key: keyof Property) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
    
    const sortedProperties = [...properties].sort((a, b) => {
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
      return 0
    })
    
    setProperties(sortedProperties)
  }

  const getMonthlyExpenses = (property: Property) => {
    const insurance = property.property_insurance || 0
    const other = property.other_expenses || 0
    return insurance + other
  }

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price_cost: "",
      currency: "PEN",
      property_insurance: "",
      other_expenses: "",
    },
  })

  const selectedCurrency = form.watch("currency")

  // Reset form when opening sheet in create mode
  const handleAddNewClick = () => {
    setSelectedProperty(null)
    form.reset({
      name: "",
      description: "",
      price_cost: "",
      currency: "PEN",
      property_insurance: "",
      other_expenses: "",
    })
    setOpen(true)
  }

  // Initialize form with property data when editing
  useEffect(() => {
    if (selectedProperty) {
      form.reset({
        name: selectedProperty.name,
        description: selectedProperty.description || "",
        price_cost: selectedProperty.price_cost.toString(),
        currency: selectedProperty.currency,
        property_insurance: selectedProperty.property_insurance?.toString() || "",
        other_expenses: selectedProperty.other_expenses?.toString() || "",
      })
      setOpen(true)
    }
  }, [selectedProperty, form])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      if (!user) throw new Error("No user found")

      const propertyData = {
        name: values.name,
        description: values.description,
        price_cost: parseFloat(values.price_cost),
        currency: values.currency,
        property_insurance: values.property_insurance ? parseFloat(values.property_insurance) : null,
        other_expenses: values.other_expenses ? parseFloat(values.other_expenses) : 0,
        user_id: user.id,
      }

      if (selectedProperty) {
        // Update existing property
        const { error } = await supabase
          .from("properties")
          .update(propertyData)
          .eq('id', selectedProperty.id)

        if (error) throw error

        // Update local state
        setProperties(properties.map(p => 
          p.id === selectedProperty.id 
            ? { ...p, ...propertyData } 
            : p
        ))

        toast({
          title: "Success",
          description: "Property updated successfully",
        })
      } else {
        // Create new property
        const { data, error } = await supabase
          .from("properties")
          .insert(propertyData)
          .select()

        if (error) throw error

        // Update local state with the new property
        if (data) {
          setProperties([...properties, data[0]])
        }

        toast({
          title: "Success",
          description: "Property added successfully",
        })
      }
      
      setOpen(false)
      setSelectedProperty(null)
      form.reset()
    } catch (error) {
      console.error("Error saving property:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error saving the property",
      })
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Properties</h1>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button onClick={handleAddNewClick}>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>
                  {selectedProperty ? 'Edit Property' : 'Add New Property'}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter property name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter property details (address, notes, etc.)" 
                              className="min-h-[100px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="price_cost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <CurrencyInput
                                placeholder="Enter price"
                                currency={selectedCurrency}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="PEN">PEN (S/)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground">Monthly Cost Breakdown</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="property_insurance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property Insurance</FormLabel>
                              <FormControl>
                                <CurrencyInput
                                  placeholder="Monthly insurance"
                                  currency={selectedCurrency}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="other_expenses"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Other Monthly Expenses</FormLabel>
                              <FormControl>
                                <CurrencyInput
                                  placeholder="Other expenses"
                                  currency={selectedCurrency}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full">
                      {selectedProperty ? 'Update Property' : 'Add Property'}
                    </Button>
                  </form>
                </Form>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('price_cost')}
                >
                  Cost {sortConfig?.key === 'price_cost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Monthly Expenses</TableHead>
                <TableHead>First Home Bonus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties.map((property) => (
                <TableRow 
                  key={property.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedProperty(property)}
                >
                  <TableCell>{property.name}</TableCell>
                  <TableCell>
                    {formatCurrency(property.price_cost, property.currency)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(getMonthlyExpenses(property), property.currency)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={property.is_first_home}
                      onCheckedChange={async (checked) => {
                        try {
                          const { error } = await supabase
                            .from('properties')
                            .update({ is_first_home: checked })
                            .eq('id', property.id)

                          if (error) throw error
                          
                          // Update local state
                          setProperties(properties.map(p => 
                            p.id === property.id 
                              ? { ...p, is_first_home: checked }
                              : p
                          ))
                          
                          toast({
                            title: "Success",
                            description: `First home bonus ${checked ? 'enabled' : 'disabled'}`,
                          })
                        } catch (error) {
                          console.error('Error updating property:', error)
                          toast({
                            variant: "destructive",
                            title: "Error",
                            description: "Could not update property",
                          })
                        }
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  )
}
