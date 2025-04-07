import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useState, useEffect } from "react"
import { PropertyForm } from "@/components/properties/property-form"
import { PropertyList } from "@/components/properties/property-list"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { SEO } from "@/components/seo"
import { Property, BonusRule } from "@/components/properties/types"
import { useTranslation } from "react-i18next"

export default function Properties() {
  const { t, i18n } = useTranslation(['properties', 'global'])
  

  
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const [properties, setProperties] = useState<Property[]>([])
  const [bonusRules, setBonusRules] = useState<BonusRule[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Property;
    direction: 'asc' | 'desc';
  } | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  const loadBonusRules = async () => {
    try {
      const { data, error } = await supabase
        .from('bonus_rules')
        .select('*')
        .eq('is_active', true)
        .order('min_value', { ascending: true })

      if (error) throw error
      setBonusRules(data || [])
    } catch (error) {
      // console.error('Error loading bonus rules:', error)
      toast({
        variant: "destructive",
        title: t('global:ui.error'),
        description: t('properties:messages.error_loading_bonus_rules'),
      })
    }
  }

  const loadProperties = async () => {
    try {
      if (!user) return

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      
      const updatedData = (data || []).map(p => ({
        ...p,
        property_insurance_type: p.property_insurance_type || "auto"
      })) as Property[]
      
      setProperties(updatedData)
    } catch (error) {
      console.error('Error loading properties:', error)
      toast({
        variant: "destructive",
        title: t('global:ui.error'),
        description: t('properties:messages.error_loading_properties'),
      })
    }
  }

  useEffect(() => {
    loadProperties()
    loadBonusRules()
  }, [user])

  const handleSort = (key: keyof Property) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
    const sortedProperties = [...properties].sort((a, b) => {
      const aValue = a[key] ?? '';
      const bValue = b[key] ?? '';
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setProperties(sortedProperties)
  }

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property)
    setOpen(true)
  }

  const handlePropertyUpdate = (updatedProperty: Property, isDelete: boolean = false) => {
    if (isDelete) {
      setProperties(properties.filter(p => p.id !== updatedProperty.id))
    } else {
      setProperties(properties.map(p => 
        p.id === updatedProperty.id ? updatedProperty : p
      ))
    }
  }

  const handleAddNewClick = () => {
    setSelectedProperty(null)
    setOpen(true)
  }

  const headerActions = (
    <Sheet 
      open={open} 
      onOpenChange={setOpen}
      aria-describedby="property-form-description"
    >
      <SheetTrigger asChild>
        <Button onClick={handleAddNewClick}>
          <Plus className="mr-2 h-4 w-4" />
          {t('actions.add_property', { ns: 'properties' })}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {selectedProperty ? t('actions.edit_property', { ns: 'properties' }) : t('actions.add_property', { ns: 'properties' })}
          </SheetTitle>
     
        </SheetHeader>
        <div className="mt-8">
          <PropertyForm
            onSuccess={loadProperties}
            onClose={() => setOpen(false)}
            selectedProperty={selectedProperty}
            bonusRules={bonusRules}
          />
        </div>
      </SheetContent>
    </Sheet>
  )

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold">{t('title', { ns: 'properties' })}</h1>,
        actions: headerActions
      }}
    >
      <SEO 
        title={`${t('title', { ns: 'properties' })} - CreditoHipotecar.io`}
        description={t('description', { ns: 'properties' })}
      />
      <div className="p-8">
        <div className="rounded-md border">
          <PropertyList
            properties={properties}
            bonusRules={bonusRules}
            onPropertySelect={handlePropertySelect}
            onPropertyUpdate={handlePropertyUpdate}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
