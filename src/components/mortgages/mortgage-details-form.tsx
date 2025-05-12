
import { useForm } from "react-hook-form"
import {
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
import type { MortgageFormValues } from "./schema"


interface MortgageDetailsFormProps {
  form: ReturnType<typeof useForm<MortgageFormValues>>;
  onSubmit: (values: MortgageFormValues) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function MortgageDetailsForm({
  form,
  onSubmit,
  submitLabel = "Save",
  isSubmitting,
}: MortgageDetailsFormProps) {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="down_payment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Down Payment</FormLabel>
            <FormControl>
              <Input type="number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="loan_protection_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Loan Protection Type</FormLabel>
            <FormControl>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="joint">Joint</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="loan_protection_insurance"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Loan Protection Insurance</FormLabel>
            <FormControl>
              <Input type="number" step="0.0001" min="0" max="1" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="interest_rate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Interest Rate</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" {...field} />
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
            <FormLabel>Term (Years)</FormLabel>
            <FormControl>
              <Input type="number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="installments_per_year"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Installments per Year</FormLabel>
            <FormControl>
              <Input type="number" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="first_installment_date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>First Installment Date</FormLabel>
            <FormControl>
              <Input 
                type="date" 
                {...field} 
                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button type="submit" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}