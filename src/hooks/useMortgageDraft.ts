import { useEffect } from 'react'
import { useMortgageBundle } from './useMortgageBundle'
import { useMortgageDraftStore, MortgageDraft } from '@/store/mortgage/store'
import { useForm } from 'react-hook-form'
import { mortgageFormSchema, MortgageFormValues } from '@/components/mortgages/schema'
import { zodResolver } from '@hookform/resolvers/zod'
import { normalizeDate, parseDatabaseDate } from '@/lib/utils'

/**
 * This hook combines React Query for server state with Zustand for client state.
 * It fetches mortgage data from the server and syncs it with a local draft state.
 */
export const useMortgageDraft = (mortgageId: string | null) => {
  // Get the mortgage bundle from React Query (server state)
  const { 
    data: bundle, 
    isLoading, 
    error,
    refetch,
    isRefetching
  } = useMortgageBundle(mortgageId)
  
  // Get the mortgage draft state from Zustand (client state)
  const { 
    mortgageDraft, 
    setMortgageDraft, 
    updateDraft, 
    resetDraft,
    isDirty,
    markClean
  } = useMortgageDraftStore()
  
  // Create a React Hook Form instance
  const form = useForm<MortgageFormValues>({
    resolver: zodResolver(mortgageFormSchema),
    defaultValues: {
      name: "",
      property_id: "",
      down_payment: "0",
      interest_rate: "8.5",
      term_years: "20",
      installments_per_year: "12",
      first_installment_date: new Date(),
      loan_protection_type: "individual",
      loan_protection_insurance: "0.028",
    }
  })
  
  // Initialize or update the local draft when bundle data changes
  useEffect(() => {
    if (bundle?.mortgage && !isRefetching) {
      // If we don't have a draft yet or it's not dirty, sync from the server
      if (!mortgageDraft || !isDirty) {
        const { mortgage, property } = bundle
        
        const newDraft: MortgageDraft = {
          id: mortgage.id,
          name: mortgage.name || "",
          property_id: property.id,
          down_payment: mortgage.down_payment?.toString() || "",
          interest_rate: mortgage.interest_rate?.toString() || "",
          term_years: mortgage.term_years?.toString() || "",
          installments_per_year: mortgage.installments_per_year?.toString() || "",
          first_installment_date: parseDatabaseDate(mortgage.first_installment_date) || new Date(),
          loan_protection_type: mortgage.loan_protection_type as "none" | "custom" | "individual" | "joint",
          loan_protection_insurance: mortgage.loan_protection_insurance?.toString() || "",
          loan_amount: mortgage.loan_amount,
          property: property
        }
        
        // Update both the Zustand store and the form
        setMortgageDraft(newDraft)
        
        // Update the form with the new values
        form.reset({
          name: newDraft.name,
          property_id: newDraft.property_id,
          down_payment: newDraft.down_payment,
          interest_rate: newDraft.interest_rate,
          term_years: newDraft.term_years,
          installments_per_year: newDraft.installments_per_year,
          first_installment_date: newDraft.first_installment_date,
          loan_protection_type: newDraft.loan_protection_type,
          loan_protection_insurance: newDraft.loan_protection_insurance
        }, {
          keepDirty: false,
          keepValues: false
        })
      }
    } else if (!bundle && !isLoading && !mortgageDraft) {
      // If we don't have bundle data and aren't loading, reset the draft
      resetDraft()
      form.reset()
    }
  }, [bundle, isLoading, mortgageDraft, isDirty, isRefetching, setMortgageDraft, resetDraft, form])
  
  // Watch form changes and update the draft
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values && Object.keys(values).length > 0) {
        updateDraft(values as MortgageDraft)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [form, updateDraft])
  
  return {
    bundle,
    mortgage: bundle?.mortgage,
    property: bundle?.property,
    extraInstallments: bundle?.extraInstallments || [],
    newRates: bundle?.newRates || [],
    mortgageDraft,
    form,
    isLoading,
    error,
    isDirty,
    refetch,
    resetDraft,
    markClean
  }
} 