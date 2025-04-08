import { z } from "zod";

// Validation schema for the mortgage form
export const mortgageFormSchema = z.object({
  name: z.string().min(1, "mortgage_details_form.errors.name_required"),
  property_id: z.string().min(1, "mortgage_details_form.errors.property_required"),
  down_payment: z.string().min(1, "mortgage_details_form.errors.down_payment_required"),
  interest_rate: z.string().min(1, "mortgage_details_form.errors.interest_rate_required"),
  term_years: z.string().min(1, "mortgage_details_form.errors.term_required"),
  installments_per_year: z.string().min(1, "mortgage_details_form.errors.installments_required"),
  first_installment_date: z.date({
    required_error: "mortgage_details_form.errors.first_installment_date_required",
    invalid_type_error: "mortgage_details_form.errors.first_installment_date_invalid",
  }),
  loan_protection_type: z.enum(["none", "custom", "individual", "joint"]),
  loan_protection_insurance: z.string().optional(),
});

// Type for the form values
export type MortgageFormValues = z.infer<typeof mortgageFormSchema>; 