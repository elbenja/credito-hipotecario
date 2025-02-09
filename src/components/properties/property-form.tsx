
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
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
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"

const formSchema = z.object({
  name: z.string().min(1, "Property name is required"),
  description: z.string().optional(),
  price_cost: z.string().min(1, "Price is required"),
  currency: z.enum(["PEN", "USD"]).default("PEN"),
  property_insurance: z.string().optional(),
  other_expenses: z.string().optional(),
  is_sustainable: z.boolean().default(false),
  is_first_home: z.boolean().default(false),
})

type Property = {
  id: string
  name: string
  price_cost: number
  currency: string
  property_insurance: number | null
  other_expenses: number | null
  is_first_home: boolean
  is_sustainable: boolean
  description?: string | null
}

type BonusRule = {
  min_value: number
  max_value: number
  traditional_bonus: number
  sustainable_bonus: number
}

type PropertyFormProps = {
  onSuccess: () => void
  onClose: () => void
  selectedProperty: Property | null
  bonusRules: BonusRule[]
}

export function PropertyForm({ onSuccess, onClose, selectedProperty, bonusRules }: PropertyFormProps) {
  const { toast } = useToast()
  const { user } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: selectedProperty?.name || "",
      description: selectedProperty?.description || "",
      price_cost: selectedProperty?.price_cost.toString() || "",
      currency: (selectedProperty?.currency as "PEN" | "USD") || "PEN",
      property_insurance: selectedProperty?.property_insurance?.toString() || "",
      other_expenses: selectedProperty?.other_expenses?.toString() || "",
      is_sustainable: selectedProperty?.is_sustainable || false,
      is_first_home: selectedProperty?.is_first_home || false,
    },
  })

  const selectedCurrency = form.watch("currency")
  const price = form.watch("price_cost")
  const isFirstHome = form.watch("is_first_home")
  const isSustainable = form.watch("is_sustainable")

  const isPriceInBonusRange = (priceInPEN: number) => {
    return bonusRules.some(rule => 
      priceInPEN >= rule.min_value && priceInPEN <= rule.max_value
    )
  }

  const getApplicableRule = (priceInPEN: number) => {
    return bonusRules.find(rule => 
      priceInPEN >= rule.min_value && priceInPEN <= rule.max_value
    )
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
          title: "Success",
          description: "Property updated successfully",
        })
      } else {
        const { error } = await supabase
          .from("properties")
          .insert(propertyData)

        if (error) throw error

        toast({
          title: "Success",
          description: "Property added successfully",
        })
      }
      
      onSuccess()
      onClose()
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

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">First Home Buyer Bonus</h3>
          
          <FormField
            control={form.control}
            name="is_first_home"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    First Home Buyer
                  </FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Enable if this is your first property purchase
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {isFirstHome && price && (
            <div className="space-y-4 rounded-lg border p-4">
              {isPriceInBonusRange(parseFloat(price)) ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Property value is within bonus range (S/67,400 - S/355,100)
                    </p>
                    {getApplicableRule(parseFloat(price)) && (
                      <p className="text-sm font-medium">
                        Applicable range: S/{getApplicableRule(parseFloat(price))?.min_value.toLocaleString()} - S/{getApplicableRule(parseFloat(price))?.max_value.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="is_sustainable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Sustainable Property
                          </FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Qualifies for higher bonus amount
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {getApplicableRule(parseFloat(price)) && (
                    <div className="mt-2 rounded-md bg-secondary p-4">
                      <p className="font-medium">Bonus Amount:</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          isSustainable
                            ? getApplicableRule(parseFloat(price))!.sustainable_bonus
                            : getApplicableRule(parseFloat(price))!.traditional_bonus,
                          'PEN'
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Property value must be between S/67,400 and S/355,100 to qualify for the bonus
                </div>
              )}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full">
          {selectedProperty ? 'Update Property' : 'Add Property'}
        </Button>
      </form>
    </Form>
  )
}
