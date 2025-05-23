import { create } from 'zustand'
import { devtools , persist } from 'zustand/middleware'
import { PropertyWithBonus } from '@/types/property'

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
  property?: PropertyWithBonus
}

// The store interface with actions
interface MortgageDraftStore {
  // State
  mortgageDraft: MortgageDraft | null
  isDirty: boolean
  exchangeRate: number;
  
  // Actions
  setMortgageDraft: (draft: MortgageDraft | null) => void
  updateDraft: (updates: Partial<MortgageDraft>) => void
  resetDraft: () => void
  markClean: () => void
  setExchangeRate: (rate: number) => void
  hardResetDraft: () => void
  // calcLoanAmount: () => void;
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
  property: undefined,
}

// Create the store
export const useMortgageDraftStore = create<MortgageDraftStore>()(
  devtools(
    // persist(
      (set) => ({
        // Initial state
        mortgageDraft: null,
        isDirty: false,
        exchangeRate: 1,  // default 1:1
        
        // Actions
        setMortgageDraft: (draft) => set({ mortgageDraft: draft, isDirty: false }),
        // in your Zustand store definition
        updateDraft: (updates) => set((state) => {
          // console.log(" state.mortgageDraft?.property_id", state.mortgageDraft?.property_id);

          const base = state.mortgageDraft ?? DEFAULT_DRAFT;
          // merge in the user’s changes
          const merged = { ...base, ...updates };

          // **immediately** recalc loan_amount from merged values
          const down = parseFloat(merged.down_payment) || 0;
          const price = merged.property?.price_cost ?? 0;
          // bonus always stored in PEN; convert if currency is not PEN
          const bonusPen = merged.property?.bonus ?? 0;
          const currency = merged.property?.currency ?? 'PEN';
          const bonus = currency === 'PEN'
            ? bonusPen
            : bonusPen / state.exchangeRate;
          merged.loan_amount = Math.max(0, price - bonus - down);
          // console.log("price, bonus, down, loan_amount", price, bonus," " , down, currency , " " , merged.loan_amount);

          return { mortgageDraft: merged, isDirty: true };
        }),
        // updateDraft: (updates) => set((state) => {
        //   if (!state.mortgageDraft) {
        //     return { 
        //       mortgageDraft: { ...DEFAULT_DRAFT, ...updates },
        //       isDirty: true
        //     }
        //   }
          
        //   return {
        //     mortgageDraft: { ...state.mortgageDraft, ...updates },
        //     isDirty: true
        //   }
        // }),
        // hardResetDraft: () => {
        //   console.log("no property", DEFAULT_DRAFT);
        //   set((state) => {
        //     // Preserve property data when resetting
        //     return { 
        //       mortgageDraft: { 
        //         ...DEFAULT_DRAFT,

        //       },
        //       isDirty: false 
        //     };
        //   });
        // },
        hardResetDraft: () => {
          console.log("hardResetDraft")
          return { 
            mortgageDraft: { ...DEFAULT_DRAFT },
            isDirty: false,
          }
        },
        resetDraft: () => {
          // console.log("Resetting draft to default values:", DEFAULT_DRAFT);
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
        setExchangeRate: (rate) => set({ exchangeRate: rate }),
        // calcLoanAmount: () => set((state) => {
        //   const draft = state.mortgageDraft;
        //   if (!draft) return state;
        //   const down = parseFloat(draft.down_payment) || 0;
        //   const price = draft.property?.price_cost ?? 0;
        //   const bonus = draft.property?.bonus ?? 0;
        //   const loan = Math.max(0, price - bonus - down);
        //   return {
        //     mortgageDraft: { ...draft, loan_amount: loan },
        //     isDirty: true,
        //   };
        // }),
      }),
      {
        name: 'mortgage-draft-storage',
        partialize: (state: MortgageDraftStore) => ({ mortgageDraft: state.mortgageDraft }),
      }
    // )
  )
) 