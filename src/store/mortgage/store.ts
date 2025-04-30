import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Property } from '@/components/mortgages/property-select'

// The mortgage form draft data that can be edited by the user
export interface MortgageDraft {
  id?: string
  name: string
  property_id: string
  down_payment: string
  interest_rate: string
  term_years: string
  installments_per_year: string
  first_installment_date: Date
  loan_protection_type: "none" | "custom" | "individual" | "joint"
  loan_protection_insurance: string
  loan_amount?: number
  property?: Property
}

// The store interface with actions
interface MortgageDraftStore {
  // State
  mortgageDraft: MortgageDraft | null
  isDirty: boolean
  
  // Actions
  setMortgageDraft: (draft: MortgageDraft | null) => void
  updateDraft: (updates: Partial<MortgageDraft>) => void
  resetDraft: () => void
  markClean: () => void
}

// Default form values
const DEFAULT_DRAFT: MortgageDraft = {
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

// Create the store
export const useMortgageDraftStore = create<MortgageDraftStore>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        mortgageDraft: null,
        isDirty: false,
        
        // Actions
        setMortgageDraft: (draft) => set({ mortgageDraft: draft, isDirty: false }),
        
        updateDraft: (updates) => set((state) => {
          if (!state.mortgageDraft) {
            return { 
              mortgageDraft: { ...DEFAULT_DRAFT, ...updates },
              isDirty: true
            }
          }
          
          return {
            mortgageDraft: { ...state.mortgageDraft, ...updates },
            isDirty: true
          }
        }),
        
        resetDraft: () => {
          console.log("Resetting draft to default values:", DEFAULT_DRAFT);
          set((state) => {
            // Preserve property data when resetting
            const preservedPropertyId = state.mortgageDraft?.property_id || '';
            const preservedProperty = state.mortgageDraft?.property;
            
            return { 
              mortgageDraft: { 
                ...DEFAULT_DRAFT,
                property_id: preservedPropertyId,
                property: preservedProperty
              },
              isDirty: false 
            };
          });
        },
        
        markClean: () => set({ isDirty: false }),
      }),
      {
        name: 'mortgage-draft-storage',
        partialize: (state) => ({ mortgageDraft: state.mortgageDraft }),
      }
    )
  )
) 