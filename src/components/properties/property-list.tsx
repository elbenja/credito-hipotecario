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
// import { useExchangeRate } from "@/hooks/use-exchange-rate"
import { useTranslation } from "react-i18next"
import { MoreVertical, Copy, Trash, ArrowUp, ArrowDown, ChevronsUpDown, Home } from "lucide-react"
// import { useAuth } from "@/context/auth-context"
import { useNavigate } from "react-router-dom"

import { useMortgageDraftStore } from "@/store/mortgage/store"
import { usePropertyBonus } from "@/hooks/usePropertyBonus"
import { useDuplicateProperty } from "@/hooks/properties/useDuplicate"
import { useDeleteProperty } from "@/hooks/properties/useDelete"

import type { Property } from "@/types/property";
// import type { BonusRule } from "@/types/property";
import { formatCurrency } from "@/lib/utils"


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

export function PropertyList({ properties, onPropertySelect, onPropertyUpdate, sortConfig, onSort }: PropertyListProps) {
  const { t } = useTranslation(['properties', 'global'])
  const { toast } = useToast()
  // const { data: exchangeRate } = useExchangeRate()
  // const { user } = useAuth()
  const navigate = useNavigate()
  const { resetDraft } = useMortgageDraftStore()
  
  const { calculateBonus } = usePropertyBonus()
  const deleteProperty = useDeleteProperty()
  const duplicateProperty = useDuplicateProperty()

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
    resetDraft()
    navigate(`/mortgages/new?propertyId=${property.id}`)
  }

  const handleDuplicate = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    duplicateProperty.mutate(property);
  }

  const handleDelete = (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    deleteProperty.mutate(property.id, {
      onSuccess: () => onPropertyUpdate(property, true),
    });
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
                  {formatCurrency(property.price_cost, property.currency as 'USD' | 'PEN')}
                </TableCell>
                <TableCell>
                  {formatCurrency(property.property_insurance || 0, property.currency as 'USD' | 'PEN')}
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
