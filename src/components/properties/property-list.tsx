import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useTranslation } from "react-i18next"
import { MoreVertical, Copy, Trash } from "lucide-react"
import { useAuth } from "@/context/auth-context"

type Property = {
  id: string
  name: string
  price_cost: number
  currency: string
  property_insurance: number | null
  property_insurance_type: "auto" | "manual"
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
  onPropertyUpdate: (updatedProperty: Property, isDelete?: boolean) => void
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
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: exchangeRate } = useExchangeRate()
  const { user } = useAuth()

  const convertToPEN = (amount: number, currency: string): number => {
    if (currency === 'PEN') return amount
    return amount * (exchangeRate || 3.7167)
  }

  const calculateBonus = (property: Property): number | null => {
    if (!property.is_first_home) return null

    const propertyValueInPEN = convertToPEN(property.price_cost, property.currency)
    
    const applicableRule = bonusRules.find(
      rule => propertyValueInPEN >= rule.min_value && propertyValueInPEN <= rule.max_value
    )

    if (!applicableRule) return null

    return property.is_sustainable 
      ? applicableRule.sustainable_bonus 
      : applicableRule.traditional_bonus
  }

  const getSortIcon = (key: keyof Property) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? t('sort_ascending') : t('sort_descending')
    }
    return null
  }

  const handleDuplicate = async (e: React.MouseEvent, property: Property) => {
    e.stopPropagation()
    try {
      if (!user) throw new Error(t('no_user_found'))

      const duplicatedProperty = {
        ...property,
        name: `${property.name} (${t('copy')})`,
        user_id: user.id,
      }
      delete (duplicatedProperty as any).id

      const { data, error } = await supabase
        .from("properties")
        .insert(duplicatedProperty)
        .select()
        .single()

      if (error) throw error

      toast({
        title: t('success'),
        description: t('property_duplicated'),
      })

      if (data) {
        onPropertyUpdate(data)
      }
    } catch (error) {
      console.error("Error duplicating property:", error)
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('error_duplicating_property'),
      })
    }
  }

  const handleDelete = async (e: React.MouseEvent, property: Property) => {
    e.stopPropagation()
    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq('id', property.id)

      if (error) throw error

      toast({
        title: t('success'),
        description: t('property_deleted'),
      })

      onPropertyUpdate(property, true)
    } catch (error) {
      console.error("Error deleting property:", error)
      toast({
        variant: "destructive",
        title: t('error'),
        description: t('error_deleting_property'),
      })
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('name')}
          >
            {t('property_name')} {getSortIcon('name')}
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('price_cost')}
          >
            {t('property_cost')} {getSortIcon('price_cost')}
          </TableHead>
          <TableHead>{t('property_insurance')}</TableHead>
          <TableHead>{t('bonus_amount_currency')}</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-4">
              {t('no_properties')}
            </TableCell>
          </TableRow>
        ) : (
          properties.map((property) => {
            const bonusAmount = calculateBonus(property)
            return (
              <TableRow 
                key={property.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onPropertySelect(property)}
                title={t('click_to_edit')}
              >
                <TableCell>{property.name}</TableCell>
                <TableCell>
                  {formatCurrency(property.price_cost, property.currency)}
                </TableCell>
                <TableCell>
                  {formatCurrency(property.property_insurance || 0, property.currency)}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({t(property.property_insurance_type)})
                  </span>
                </TableCell>
                <TableCell>
                  {bonusAmount ? formatCurrency(bonusAmount, 'PEN') : t('no_bonus')}
                </TableCell>
                <TableCell className="w-[50px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">{t('open_menu')}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => handleDuplicate(e, property)}>
                        <Copy className="mr-2 h-4 w-4" />
                        <span>{t('duplicate')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(e, property)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>{t('delete')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
