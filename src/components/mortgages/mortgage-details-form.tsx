import { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { MortgageFormValues } from "./schema"

interface Property {
  id: string
  name: string
  currency: "USD" | "PEN"
  price_cost: number
  [key: string]: any // Allow additional properties
}

interface MortgageDetailsFormProps {
  form: UseFormReturn<MortgageFormValues>
  selectedProperty: Property
  onSubmit: (values: MortgageFormValues) => void
  submitLabel?: string
}

export function MortgageDetailsForm({
  form,
  selectedProperty,
  onSubmit,
  submitLabel = "Save"
}: MortgageDetailsFormProps) {
  const { t } = useTranslation()
  
  // This is a placeholder component that should be properly implemented
  // with the same fields and functionality as AmortizationDetailsForm
  // but with mortgage terminology instead.
  
  return (
    <div>
      {/* Implement the form with the same fields as AmortizationDetailsForm */}
      <p>Mortgage Details Form - To be implemented</p>
    </div>
  )
} 