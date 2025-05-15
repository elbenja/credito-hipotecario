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
import { useState } from "react"
import { PropertyForm } from "@/components/properties/property-form"
import { PropertyList } from "@/components/properties/property-list"
import { useAuth } from "@/context/auth-context"
// import { useToast } from "@/components/ui/use-toast"

import { SEO } from "@/components/seo"
import {  PropertyWithBonus } from "@/types/property"
import { useTranslation } from "react-i18next"
import SVGillustration from "@/components/ui/SVGillustration"
import { fetchPropertyWithBonus, useProperties } from "@/services/propertyService"

export default function Properties() {
  const { t, i18n } = useTranslation(['properties', 'global'])
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  // const { toast } = useToast()
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PropertyWithBonus;
    direction: 'asc' | 'desc';
  } | null>(null)

const [selectedProperty, setSelectedProperty] = useState<PropertyWithBonus | null>(null)

// hook to fetch PropertyWithBonus
 const { data: properties = [], isLoading, refetch } = useProperties(user?.id)

  // Handle property success and broadcast event
  const handlePropertySuccess = () => {
    refetch()
    setOpen(false)
    setSelectedProperty(null)
  }

  const handleSort = (key: keyof PropertyWithBonus) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
  }

  // const handlePropertySelect = (property: PropertyWithBonus) => {
  //   setSelectedProperty(property)
  //   setOpen(true)
  // }

  const handlePropertySelect = async (property: Property) => {
    if (!user) return
    const enriched = await fetchPropertyWithBonus(user.id, property.id)
    setSelectedProperty(enriched)
    setOpen(true)
  }
  
  const handlePropertyUpdate = (updatedProperty: PropertyWithBonus , isDelete: boolean = false) => {
    refetch()
  }

  const handleAddNewClick = () => {
    setSelectedProperty(null)
    setOpen(true)
  }

  // Only open the property form when bonus rules are loaded
  const handleOpenEmptyPropertyForm = () => {
    setOpen(true);
  };

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
            onSuccess={handlePropertySuccess}
            onClose={() => setOpen(false)}
            selectedProperty={selectedProperty}
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

      <div className="w-full h-full  flex flex-col justify-start items-center p-4 ">
        {properties.length > 0 ? (
          <PropertyList 
            properties={sortConfig ? [...properties].sort((a, b) => {
              const key = sortConfig.key;
              const aValue = a[key];
              const bValue = b[key];
              
              // Handle string comparison
              if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' 
                  ? aValue.localeCompare(bValue)
                  : bValue.localeCompare(aValue);
              }
              
              // Handle number comparison
              if (typeof aValue === 'number' && typeof bValue === 'number') {
                return sortConfig.direction === 'asc' 
                  ? aValue - bValue 
                  : bValue - aValue;
              }
              
              // Fallback for other types or null/undefined values
              return 0;
            }) : properties}
            onPropertySelect={handlePropertySelect}
            onPropertyUpdate={handlePropertyUpdate}
            sortConfig={sortConfig}
            onSort={handleSort}
          />
        ) : (
          <>
          <div className="w-full h-full flex flex-col justify-center items-center">

            <div className="w-60  rounded-3xl flex flex-col items-center justify-center p-0 gap-4">
                <div className=" rounded-3xl flex flex-col justify-center items-center  gap-1 ">
                  <SVGillustration variant="dog" className="w-60 h-60" />
                  <p  className="text-sm text-center w-40">
                  {t('messages.no_properties', { ns: 'properties' })}

                  </p>
                </div>


             <div className="w-40 h-19 bg-primary text-primary-foreground rounded-3xl flex flex-col justify-center items-center p-4 ">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <button className="text-xs h-8 flex gap-2">  
                      <div className="flex-1 text-right text-sm font-medium leading-none">
                        {t('actions.add_property', { ns: 'properties' })}
                      </div>
                      <div className="size-8 bg-card text-card-foreground rounded-[99px] flex justify-center items-center">
                        <Plus className="h-4 w-4" />
                      </div>
                    </button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>
                        {t('actions.add_property', { ns: 'properties' })}
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-8">
                      <PropertyForm
                        onSuccess={handlePropertySuccess}
                        onClose={() => setOpen(false)}
                        selectedProperty={null}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
          
          </>
        )}
      </div>

    </DashboardLayout>
  )
}
