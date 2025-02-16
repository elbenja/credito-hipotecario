
export type ExtraInstallment = {
  id: string
  amortization_id: string
  amount: number
  frequency: 'monthly' | 'one-time'
  start_date: string
  created_at: string
  updated_at: string
}

export type ExtraInstallmentFormValues = {
  amount: string
  frequency: 'monthly' | 'one-time'
  start_date: Date
}
