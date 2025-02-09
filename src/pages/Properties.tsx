
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

export default function Properties() {
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
      console.error('Error loading bonus rules:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load bonus rules",
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
      setProperties(data || [])
    } catch (error) {
      console.error('Error loading properties:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load properties",
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
      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
      return 0
    })
    
    setProperties(sortedProperties)
  }

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property)
    setOpen(true)
  }

  const handlePropertyUpdate = (updatedProperty: Property) => {
    setProperties(properties.map(p => 
      p.id === updatedProperty.id ? updatedProperty : p
    ))
  }

  const handleAddNewClick = () => {
    setSelectedProperty(null)
    setOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Properties</h1>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button onClick={handleAddNewClick}>
                <Plus className="mr-2 h-4 w-4" />
                Add Property
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>
                  {selectedProperty ? 'Edit Property' : 'Add New Property'}
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
        </div>

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
