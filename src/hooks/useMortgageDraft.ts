import { useEffect, useState } from 'react'
// import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMortgageDraftStore } from '@/store/mortgage/store'
import { mortgageFormSchema, defaultValues, type MortgageFormValues } from '@/components/mortgages/schema'
// import { supabase } from '@/integrations/supabase/client'
import { useMortgageBundle } from './useMortgageBundle'
import { normalizeDate } from '@/utils/utils'

/**
 * This hook combines React Query for server state with Zustand for client state.
 * It fetches mortgage data from the server and syncs it with a local draft state.
 * 
 * When used with a null mortgageId, it works with the default draft values from the store,
 * which makes it suitable for creating new mortgages.
 */
export function useMortgageDraft(mortgageId: string | null) {
  // const queryClient = useQueryClient()
  const { mortgageDraft, setMortgageDraft, updateDraft, resetDraft } = useMortgageDraftStore()
  const [isDirty, setIsDirty] = useState(false)
  
  // Use the mortgage bundle hook when editing existing mortgage
  const { 
    data: bundle,
    isLoading: isBundleLoading,
    error: bundleError,
    refetch
  } = useMortgageBundle(mortgageId)
  
  // Extract mortgage, property, and other data from the bundle
  const mortgage = bundle?.mortgage
  const property = bundle?.mortgage.property
  const extraInstallments = bundle?.extraInstallments || []
  const newRates = bundle?.newRates || []
  
  // Convert mortgage data to form format if available
  const formDefaultValues = mortgage ? {
    name: mortgage.name || '',
    property_id: mortgage.property_id || '',
    down_payment: mortgage.down_payment?.toString() || '0',
    interest_rate: mortgage.interest_rate?.toString() || '0',
    term_years: mortgage.term_years?.toString() || '20',
    installments_per_year: mortgage.installments_per_year?.toString() || '12',
    first_installment_date: mortgage.first_installment_date 
      ? normalizeDate(new Date(mortgage.first_installment_date))
      : normalizeDate(new Date()),
    loan_amount: mortgage.loan_amount?.toString() || '0', //  May 13
    loan_protection_type: mortgage.loan_protection_type || 'individual',
    loan_protection_insurance: mortgage.loan_protection_insurance?.toString() || '0'
  } : mortgageDraft || defaultValues
  
  // Form initialization with correct format
  const form = useForm<MortgageFormValues>({
    resolver: zodResolver(mortgageFormSchema),
    defaultValues: formDefaultValues,
    mode: "onChange"
  })
  
  // Initialize form values when mortgage data loads
  useEffect(() => {
    if (mortgage && !isDirty) {
      // Format first_installment_date as Date object
      const firstInstallmentDate = mortgage.first_installment_date 
        ? normalizeDate(new Date(mortgage.first_installment_date)) 
        : normalizeDate(new Date())
      
      // Prepare form values with string conversions for numeric fields
      const formValues = {
        name: mortgage.name || '',
        property_id: mortgage.property_id || '',
        down_payment: mortgage.down_payment?.toString() || '0',
        interest_rate: mortgage.interest_rate?.toString() || '0',
        term_years: mortgage.term_years?.toString() || '20',
        installments_per_year: mortgage.installments_per_year?.toString() || '12',
        loan_amount: mortgage.loan_amount?.toString() || '0', //  May 13
        first_installment_date: firstInstallmentDate,
        loan_protection_type: mortgage.loan_protection_type || 'individual',
        loan_protection_insurance: mortgage.loan_protection_insurance?.toString() || '0'
      }
      
      // Reset form with these values
      form.reset(formValues)
      
      // Update draft in store
      setMortgageDraft({
        ...formValues,
        property: property || undefined,
        id: mortgage.id,
        loan_amount: parseFloat(formValues.loan_amount) || 0
      })
    }
  }, [mortgage, property, form, isDirty, setMortgageDraft])
  
  // Watch for changes to make the form dirty
  useEffect(() => {
    const subscription = form.watch(() => {
      setIsDirty(true)
      
      // Update draft in store
      updateDraft(form.getValues())
    })
    
    return () => subscription.unsubscribe()
  }, [form, updateDraft])
  
  // Function to mark the form as clean
  const markClean = () => {
    setIsDirty(false)
  }
  
  return {
    bundle,
    mortgage,
    property,
    extraInstallments,
    newRates,
    mortgageDraft,
    form,
    isLoading: isBundleLoading,
    error: bundleError,
    isDirty,
    markClean,
    resetDraft,
    refetch
  }
} 