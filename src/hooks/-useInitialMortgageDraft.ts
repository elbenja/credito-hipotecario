import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMortgageDraftStore } from '@/store/mortgage/store'
import { mortgageFormSchema, type MortgageFormValues, defaultValues } from '@/components/mortgages/schema'
import { normalizeDate } from '@/lib/utils'
import type { Property } from '@/components/mortgages/property-select'

export function useInitialMortgageDraft(propertyId?: string | null) {
  const queryClient = useQueryClient()
  const { mortgageDraft, setMortgageDraft, updateDraft, resetDraft } = useMortgageDraftStore()
  const [isLoading, setIsLoading] = useState(false)
  const [calculatedLoanAmount, setCalculatedLoanAmount] = useState(0)
  const [property, setProperty] = useState<Property | null>(null)
  
  // Initialize form with either existing draft or default values
  const form = useForm<MortgageFormValues>({
    resolver: zodResolver(mortgageFormSchema),
    defaultValues: mortgageDraft || { 
      ...defaultValues,
      property_id: propertyId || ""
    },
    mode: "onChange"
  })
  
  // Initial setup effect
  useEffect(() => {
    // Initialize draft if not exists and propertyId is provided
    if (!mortgageDraft && propertyId) {
      updateDraft({ property_id: propertyId })
    }
  }, [propertyId, mortgageDraft, updateDraft])
  
  // Improve property fetching when propertyId is provided
  useEffect(() => {
    if (!propertyId) return
    
    const fetchPropertyMinimal = async () => {
      setIsLoading(true)
      try {
        // Only fetch essential fields for better performance
        const { data, error } = await supabase
          .from("properties")
          .select(`
            id,
            name,
            currency,
            price_cost,
            property_insurance,
            property_insurance_type,
            is_first_home,
            is_sustainable
          `)
          .eq("id", propertyId)
          .single()
          
        if (error) throw error
        
        if (data) {
          // Get bonus using database function
          const { data: bonusAmount, error: bonusError } = await supabase
            .rpc('property_bonus', { p_property_id: data.id })
          
          if (bonusError) console.error("Error fetching bonus:", bonusError)
          
          const propertyWithBonus = {
            ...data,
            bonus: bonusAmount || 0
          } as Property
          
          setProperty(propertyWithBonus)
          
          // Set a default mortgage name based on property
          const defaultMortgageName = `${data.name} Mortgage`
          form.setValue("name", defaultMortgageName, { shouldValidate: true })
          form.setValue("property_id", data.id, { shouldValidate: true })
          
          // Update mortgage draft in store
          updateDraft({ 
            name: defaultMortgageName,
            property_id: data.id,
            property: propertyWithBonus
          })
          
          // Calculate initial loan amount
          updateLoanAmount(propertyWithBonus, form.getValues("down_payment"))
        }
      } catch (error) {
        console.error("Error fetching property:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    // Only fetch if propertyId is provided and we don't already have this property 
    // or there's no mortgage draft with property data
    if (
      propertyId && 
      (!property || property.id !== propertyId) && 
      (!mortgageDraft?.property || mortgageDraft.property.id !== propertyId)
    ) {
      fetchPropertyMinimal()
    }
  }, [propertyId, form, updateDraft, property, mortgageDraft])
  
  // Function to update loan amount
  const updateLoanAmount = (propertyData: Property | null, downPaymentStr: string) => {
    if (!propertyData) return
    
    const downPayment = parseFloat(downPaymentStr?.replace(/[^0-9.]/g, "") || "0")
    const propertyPrice = propertyData.price_cost || 0
    const bonus = propertyData.bonus || 0
    
    // Calculate loan amount: (property_cost - bonus) - down_payment
    const calculatedLoanAmount = (propertyPrice - bonus) - downPayment
    const finalAmount = calculatedLoanAmount > 0 ? calculatedLoanAmount : 0
    
    setCalculatedLoanAmount(finalAmount)
    
    // Update draft in store
    updateDraft({ loan_amount: finalAmount })
  }
  
  // Watch for changes to down_payment and other form fields
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'down_payment' && property) {
        updateLoanAmount(property, value.down_payment || "0")
      }
      
      // Update draft in store for any field change
      updateDraft(value as any)
    })
    
    return () => subscription.unsubscribe()
  }, [form, property, updateDraft])
  
  // Handle property change from property selector
  const handlePropertyChange = async (newProperty: Property | null) => {
    if (!newProperty) {
      setProperty(null)
      setCalculatedLoanAmount(0)
      form.setValue("property_id", "", { shouldValidate: true })
      return
    }
    
    try {
      // Only get the bonus if we don't already have it
      if (newProperty.bonus === undefined) {
        // Get bonus using database function
        const { data: bonusAmount, error: bonusError } = await supabase
          .rpc('property_bonus', { p_property_id: newProperty.id })
        
        if (bonusError) throw bonusError
        
        newProperty = {
          ...newProperty,
          bonus: bonusAmount || 0
        }
      }
      
      setProperty(newProperty)
      form.setValue("property_id", newProperty.id, { shouldValidate: true })
      
      // Update draft in store
      updateDraft({ 
        property_id: newProperty.id,
        property: newProperty
      })
      
      // Set a default mortgage name if not already set
      if (!form.getValues("name")) {
        const defaultMortgageName = `${newProperty.name} Mortgage`
        form.setValue("name", defaultMortgageName, { shouldValidate: true })
        updateDraft({ name: defaultMortgageName })
      }
      
      // Update loan amount
      updateLoanAmount(newProperty, form.getValues("down_payment"))
    } catch (error) {
      console.error("Error processing property selection:", error)
    }
  }
  
  return {
    form,
    property,
    calculatedLoanAmount,
    isLoading,
    handlePropertyChange,
    updateLoanAmount,
    resetDraft
  }
} 