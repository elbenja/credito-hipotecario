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
import { MoreVertical, Copy, Trash, ArrowUp, ArrowDown, ChevronsUpDown, Home } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useSubscription } from "@/context/subscription-context"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { toast as sonnerToast } from "sonner"

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

export type PropertyListProps = {
  properties: Property[]
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

export function PropertyList({ properties, onPropertySelect, onPropertyUpdate, sortConfig, onSort }: PropertyListProps) {
  const { t } = useTranslation(['properties', 'global'])
  const { toast } = useToast()
  const { data: exchangeRate } = useExchangeRate()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { isLimitReached, getCurrentUsage, limits } = useSubscription()

  const { data: bonusRules = [] } = useQuery({
    queryKey: ['bonus-rules'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('bonus_rules')
          .select('*')
          .eq('is_active', true)
          .order('min_value', { ascending: true })

        if (error) throw error
        return data || []
      } catch (error) {
        console.error("Error loading bonus rules:", error)
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

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
      return sortConfig.direction === 'asc' 
        ? <ArrowUp className="inline h-4 w-4 ml-1" /> 
        : <ArrowDown className="inline h-4 w-4 ml-1" />
    }
    return <ChevronsUpDown className="inline h-4 w-4 ml-1 text-muted-foreground opacity-50" />
  }

  const handleAddMortgage = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation()
    navigate(`/mortgages/new?propertyId=${property.id}`)
  }

  const handleDuplicate = async (e: React.MouseEvent, property: Property) => {
    e.stopPropagation()
    try {
      if (!user) throw new Error(t('messages.no_user_found', 'No user found', { ns: 'global' }))

      const limitReached = await isLimitReached('property')
      if (limitReached) {
        toast({
          variant: "destructive",
          title: t('ui.error', 'Error', { ns: 'global' }),
          description: t('messages.plan_limit_reached', 'You have reached your plan limit for properties.', { ns: 'properties' }),
        })
        return
      }

      const duplicatedProperty = {
        ...property,
        name: `${property.name} (${t('ui.copy', 'Copy', { ns: 'global' })})`,
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
        title: t('ui.success', 'Success', { ns: 'global' }),
        description: t('messages.property_duplicated', 'Property duplicated successfully', { ns: 'properties' }),
      })

      if (data) {
        onPropertyUpdate(data, false)
        
        const channel = supabase.channel('property-updates')
        channel.send({
          type: 'broadcast',
          event: 'property-created',
          payload: { 
            action: 'create', 
            userId: user.id,
            propertyId: data.id
          },
        })
      }
    } catch (error) {
      console.error("Error duplicating property:", error)
      toast({
        variant: "destructive",
        title: t('ui.error', 'Error', { ns: 'global' }),
        description: t('messages.error_duplicating_property', 'Error duplicating property', { ns: 'properties' }),
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
        title: t('ui.success', 'Success', { ns: 'global' }),
        description: t('messages.property_deleted', 'Property deleted successfully', { ns: 'properties' }),
      })

      onPropertyUpdate(property, true)
    } catch (error) {
      console.error("Error deleting property:", error)
      toast({
        variant: "destructive",
        title: t('ui.error', 'Error', { ns: 'global' }),
        description: t('messages.error_deleting_property', 'Error deleting property', { ns: 'properties' }),
      })
    }
  }

  return (
    <Table className="rounded-xl overflow-hidden">
      <TableHeader>
        <TableRow>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('name')}
          >
            {t('form.short_name', 'Name', { ns: 'properties' })} {getSortIcon('name')}
          </TableHead>
          <TableHead>
            {t('form.property_description', 'Description', { ns: 'properties' })}
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('price_cost')}
          >
            {t('form.property_cost', 'Property Cost', { ns: 'properties' })} {getSortIcon('price_cost')}
          </TableHead>
          <TableHead>{t('form.property_insurance', 'Property Insurance', { ns: 'properties' })}</TableHead>
          <TableHead>{t('bonus.amount_currency', 'Bonus Amount', { ns: 'properties' })}</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4">
              {t('messages.no_properties', 'No properties found', { ns: 'properties' })}
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
                title={t('ui.click_to_edit', 'Click to edit', { ns: 'global' })}
              >
                <TableCell>{property.name}</TableCell>
                <TableCell >
                  <div className="line-clamp-2">
                  {property.description || '-'}
                  </div>
                  </TableCell>
                <TableCell>
                  {formatCurrency(property.price_cost, property.currency)}
                </TableCell>
                <TableCell>
                  {formatCurrency(property.property_insurance || 0, property.currency)}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({t(`insurance.${property.property_insurance_type}`, property.property_insurance_type === 'auto' ? 'Automatic' : 'Manual', { ns: 'properties' })})
                  </span>
                </TableCell>
                <TableCell>
                  {bonusAmount ? formatCurrency(bonusAmount, 'PEN') : t('bonus.no_bonus', 'No bonus', { ns: 'properties' })}
                </TableCell>
                <TableCell className="w-[50px]">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="flex h-8 w-8 items-center justify-center rounded-md border transition-colors hover:bg-muted touch-none"
                      onClick={(e) => e.stopPropagation()}
                      data-touch="true"
                      style={{ touchAction: 'none' }}
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">{t('ui.open_menu', 'Open menu', { ns: 'global' })}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={5} className="touch-none">
                      <DropdownMenuItem onClick={(e) => handleAddMortgage(e, property)}>
                        <Home className="mr-2 h-4 w-4" />
                        <span>{t('ui.add_mortgage', 'Add Mortgage', { ns: 'global' })}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleDuplicate(e, property)}>
                        <Copy className="mr-2 h-4 w-4" />
                        <span>{t('ui.duplicate', 'Duplicate', { ns: 'global' })}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => handleDelete(e, property)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        <span>{t('ui.delete', 'Delete', { ns: 'global' })}</span>
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
