import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"

type Property = {
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

type BonusRule = {
  min_value: number
  max_value: number
  traditional_bonus: number
  sustainable_bonus: number
}

type PropertyListProps = {
  properties: Property[]
  bonusRules: BonusRule[]
  onPropertySelect: (property: Property) => void
  onPropertyUpdate: (updatedProperty: Property) => void
  sortConfig: {
    key: keyof Property;
    direction: 'asc' | 'desc';
  } | null
  onSort: (key: keyof Property) => void
}

const formatCurrency = (amount: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'PEN' ? 'PEN' : 'USD',
    currencyDisplay: 'symbol',
  })
  
  const formatted = formatter.format(amount)
  return currency === 'PEN' ? formatted.replace('PEN', 'S/') : formatted
}

export function PropertyList({ 
  properties, 
  bonusRules, 
  onPropertySelect, 
  onPropertyUpdate,
  sortConfig,
  onSort
}: PropertyListProps) {
  const { toast } = useToast()

  const getMonthlyExpenses = (property: Property) => {
    const insurance = property.property_insurance || 0
    const other = property.other_expenses || 0
    return insurance + other
  }

  const calculateBonus = (property: Property): number | null => {
    if (!property.is_first_home || property.currency !== 'PEN') return null

    const propertyValue = property.price_cost
    const applicableRule = bonusRules.find(
      rule => propertyValue >= rule.min_value && propertyValue <= rule.max_value
    )

    if (!applicableRule) return null

    return property.is_sustainable 
      ? applicableRule.sustainable_bonus 
      : applicableRule.traditional_bonus
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('name')}
          >
            Name {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('price_cost')}
          >
            Cost {sortConfig?.key === 'price_cost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </TableHead>
          <TableHead>Monthly Expenses</TableHead>
          <TableHead>Bonus Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map((property) => {
          const bonusAmount = calculateBonus(property)
          return (
            <TableRow 
              key={property.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onPropertySelect(property)}
            >
              <TableCell>{property.name}</TableCell>
              <TableCell>
                {formatCurrency(property.price_cost, property.currency)}
              </TableCell>
              <TableCell>
                {formatCurrency(getMonthlyExpenses(property), property.currency)}
              </TableCell>
              <TableCell>
                {bonusAmount ? formatCurrency(bonusAmount, 'PEN') : '-'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
