export type Property = {
  id: string
  user_id: string
  name: string
  price_cost: number
  currency: "USD" | "PEN"
  property_insurance: number | null
  property_insurance_type: "auto" | "manual"
  is_first_home: boolean
  is_sustainable: boolean
  description?: string | null
}


export type PropertyWithBonus = Property & {
  bonus?: number | null // Added for convenience
}

export type BonusRule = {
  min_value: number
  max_value: number
  traditional_bonus: number
  sustainable_bonus: number
}
