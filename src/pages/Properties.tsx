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
import { Property } from "@/components/properties/types"
import { useTranslation } from "react-i18next"
import SVGillustration from "@/components/ui/SVGillustration"
import { useQuery, useQueryClient } from "@tanstack/react-query"

export default function Properties() {
  const { t, i18n } = useTranslation(['properties', 'global'])
  const [open, setOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Property;
    direction: 'asc' | 'desc';
  } | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  // Fetch properties with React Query
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      if (!user) return []

      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error loading properties:', error)
          toast({
            variant: "destructive",
            title: t('global:ui.error'),
            description: t('properties:messages.error_loading_properties'),
          })
          throw error
        }
        
        return (data || []).map(p => ({
          ...p,
          property_insurance_type: p.property_insurance_type || "auto"
        })) as Property[]
      } catch (error) {
        console.error('Error loading properties:', error)
        toast({
          variant: "destructive",
          title: t('global:ui.error'),
          description: t('properties:messages.error_loading_properties'),
        })
        throw error
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  })

  // Set up real-time subscription for property updates
  useEffect(() => {
    if (!user?.id) return

    // Create a channel for property updates
    const channel = supabase.channel('property-updates')
    
    // Subscribe to the channel
    channel
      .on('broadcast', { event: 'property-created' }, (payload) => {
        if (payload.payload?.userId === user.id) {
          // Invalidate and refresh properties when a property is created
          queryClient.invalidateQueries({ queryKey: ['properties', user.id] })
        }
      })
      .on('broadcast', { event: 'property-updated' }, (payload) => {
        if (payload.payload?.userId === user.id) {
          // Invalidate and refresh properties when a property is updated
          queryClient.invalidateQueries({ queryKey: ['properties', user.id] })
        }
      })
      .on('broadcast', { event: 'property-deleted' }, (payload) => {
        if (payload.payload?.userId === user.id) {
          // Invalidate and refresh properties when a property is deleted
          queryClient.invalidateQueries({ queryKey: ['properties', user.id] })
        }
      })
      .subscribe()

    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  // Handle property success and broadcast event
  const handlePropertySuccess = () => {
    // Optimistically update the query cache
    queryClient.invalidateQueries({ queryKey: ['properties', user?.id] })
    
    // Broadcast property created/updated message
    const channel = supabase.channel('property-updates')
    channel.send({
      type: 'broadcast',
      event: selectedProperty ? 'property-updated' : 'property-created',
      payload: { 
        action: selectedProperty ? 'update' : 'create', 
        userId: user?.id,
        propertyId: selectedProperty?.id
      },
    })
    
    setOpen(false)
    setSelectedProperty(null)
  }

  const handleSort = (key: keyof Property) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key, direction })
  }

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property)
    setOpen(true)
  }

  const handlePropertyUpdate = (updatedProperty: Property, isDelete: boolean = false) => {
    // Optimistically update the cache
    if (isDelete) {
      queryClient.setQueryData(['properties', user?.id], (oldData: Property[] = []) => 
        oldData.filter(p => p.id !== updatedProperty.id)
      )
      
      // Broadcast property deleted message
      const channel = supabase.channel('property-updates')
      channel.send({
        type: 'broadcast',
        event: 'property-deleted',
        payload: { 
          action: 'delete', 
          userId: user?.id,
          propertyId: updatedProperty.id
        },
      })
    } else {
      queryClient.setQueryData(['properties', user?.id], (oldData: Property[] = []) => 
        oldData.map(p => p.id === updatedProperty.id ? updatedProperty : p)
      )
    }
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
