
export type Property = {
  id: string
  name: string
  price_cost: number
  currency: string
  property_insurance: number | null
  other_expenses: number | null
  is_first_home: boolean
  is_sustainable: boolean
  description?: string | null
}

export type BonusRule = {
  min_value: number
  max_value: number
  traditional_bonus: number
  sustainable_bonus: number
}
