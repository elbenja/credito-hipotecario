import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { addYears, subYears, startOfDay, isBefore, isAfter, isSameDay } from "date-fns"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarDatePicker } from "@/components/ui/calendar-date-picker"
import { cn, normalizeDate } from "@/lib/utils"
import type { Property } from "./property-select"
import type { AmortizationFormValues } from "./schema"

interface AmortizationDetailsFormProps {
  form: ReturnType<typeof useForm<AmortizationFormValues>>
  selectedProperty: Property
  onSubmit: (values: AmortizationFormValues) => Promise<void>
  submitLabel?: string
}

export function AmortizationDetailsForm({
  form,
  selectedProperty,
  onSubmit,
  submitLabel = "Update"
}: AmortizationDetailsFormProps) {
  const { t } = useTranslation()

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <h4 className="font-medium mb-4">Basics</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="down_payment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Down Payment</FormLabel>
                    <FormControl>
                      <Input {...field} onChange={(e) => {
                        field.onChange(e);
                        form.trigger("down_payment");
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="property_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property %</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        max="100"
                        placeholder="0.00"
                        value={form.watch("down_payment") ? 
                          Number(((parseFloat(form.watch("down_payment")) / selectedProperty.price_cost) * 100).toFixed(2)) : 
                          ""}
                        onChange={(e) => {
                          const value = e.target.value
                          // Allow empty input
                          if (value === "") {
                            form.setValue("down_payment", "0")
                            return
                          }
                          
                          // Parse the percentage input and calculate down payment
                          const percentage = parseFloat(value)
                          if (!isNaN(percentage)) {
                            const downPayment = (percentage / 100 * selectedProperty.price_cost).toFixed(2)
                            form.setValue("down_payment", downPayment)
                          }
                        }}
                        onBlur={(e) => {
                          // Format to 2 decimal places when leaving the field
                          const value = e.target.value
                          if (value) {
                            const percentage = parseFloat(value)
                            if (!isNaN(percentage)) {
                              e.target.value = percentage.toFixed(2)
                              const downPayment = (percentage / 100 * selectedProperty.price_cost).toFixed(2)
                              form.setValue("down_payment", downPayment)
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="loan_protection_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Protection Insurance</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.trigger("loan_protection_type");
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="joint">Joint</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="custom">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loan_protection_insurance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Insurance Cost</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="number"
                          step="0.0001"
                          min="0"
                          max="1"
                          disabled={form.watch("loan_protection_type") !== "custom"}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            const numValue = parseFloat(value);
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
                              field.onChange(value);
                              form.trigger("loan_protection_insurance");
                            }
                          }}
                          placeholder="Enter rate (0-1)"
                          className="pr-8"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-muted-foreground">
                          %
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="interest_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest rate</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" onChange={(e) => {
                        field.onChange(e);
                        form.trigger("interest_rate");
                      }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="term_years"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amortization Term</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.trigger("term_years");
                    }} value={field.value}>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="installments_per_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Installments per Year</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.trigger("installments_per_year");
                    }} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select installments" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="12">Regular </SelectItem>
                        <SelectItem value="14">Double </SelectItem>
                      </SelectContent>
                    </Select>
                
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="first_installment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Date</FormLabel>
                    <FormControl>
                      <CalendarDatePicker
                        date={{
                          from: field.value,
                          to: field.value
                        }}
                        onDateSelect={({ from }) => {
                          if (from) {
                            field.onChange(normalizeDate(from));
                            form.trigger("first_installment_date");
                          }
                        }}
                        variant="outline"
                        numberOfMonths={1}
                        yearsRange={35} // 15 years back + 20 years forward
                        fromYear={new Date().getFullYear() - 15}
                        disabled={(date) => {
                          const startOfDate = startOfDay(date);
                          const fifteenYearsAgo = startOfDay(subYears(new Date(), 15));
                          const twentyYearsFromNow = startOfDay(addYears(new Date(), 20));
                          
                          return (
                            isBefore(startOfDate, fifteenYearsAgo) || 
                            isAfter(startOfDate, twentyYearsFromNow) ||
                            isSameDay(startOfDate, fifteenYearsAgo) || 
                            isSameDay(startOfDate, twentyYearsFromNow)
                          );
                        }}
                        className={cn(
                          "w-full justify-start text-left font-normal form-control-focus",
                          !field.value && "text-muted-foreground"
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full">{submitLabel}</Button>
      </form>
    </Form>
  )
} 