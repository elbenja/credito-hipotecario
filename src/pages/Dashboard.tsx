import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import SVGillustration from '@/components/ui/SVGillustration'
import { Badge } from "@/components/ui/badge"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
import { Separator } from "@radix-ui/react-separator"
import { FeatureCounts } from "@/components/dashboard/feature-counts"
import { PropertyCards } from "@/components/properties/property-cards"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Plus } from "lucide-react"
import { PropertyForm } from "@/components/properties/property-form"

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'properties', 'mortgages'])
  const { user } = useAuth()
  const [hasProperties, setHasProperties] = useState(false)
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: subscription } = useQuery({
    queryKey: ['user-subscription'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plan:subscription_plans(name)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active')
        .single()

      if (error) throw error
      return data
    },
    enabled: !!user?.id
  })

  // Fetch properties count with optimized caching
  const { data: propertiesCount = 0 } = useQuery({
    queryKey: ['properties-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)

      if (error) throw error
      return count || 0
    },
    enabled: !!user?.id,
    staleTime: 5 * 1000, // 5 seconds (reduced from 30 seconds)
    gcTime: 2 * 60 * 1000 // 2 minutes
  })

  // Set up real-time subscription for property updates
  useEffect(() => {
    if (!user?.id) return

    // Create a channel for property updates
    const channel = supabase.channel('property-updates')
    
    // Subscribe to the channel
    const subscription = channel
      .on('broadcast', { event: 'property-created' }, (payload) => {
        if (payload.payload?.userId === user.id) {
          // Invalidate and refresh queries when property is created
          queryClient.invalidateQueries({ queryKey: ['properties-count', user.id] })
          queryClient.invalidateQueries({ queryKey: ['properties', user.id] })
        }
      })
      .on('broadcast', { event: 'property-updated' }, (payload) => {
        if (payload.payload?.userId === user.id) {
          // Invalidate and refresh queries when property is updated
          queryClient.invalidateQueries({ queryKey: ['properties', user.id] })
        }
      })
      .on('broadcast', { event: 'property-deleted' }, (payload) => {
        if (payload.payload?.userId === user.id) {
          // Invalidate and refresh queries when property is deleted
          queryClient.invalidateQueries({ queryKey: ['properties-count', user.id] })
          queryClient.invalidateQueries({ queryKey: ['properties', user.id] })
        }
      })
      .subscribe()

    // Clean up the subscription when component unmounts
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  // Handle property success with optimistic update
  const handlePropertySuccess = () => {
    // Optimistic update - immediately set hasProperties to true
    setHasProperties(true)
    
    // Optimistically update the properties count in the cache
    queryClient.setQueryData(['properties-count', user?.id], (oldCount: number = 0) => oldCount + 1)
    
    // Broadcast property created message
    const channel = supabase.channel('property-updates')
    channel.send({
      type: 'broadcast',
      event: 'property-created',
      payload: { action: 'create', userId: user?.id },
    })
    
    setOpen(false)
  }

  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold tracking-tight">{t("sections.dashboard")}</h1>
      }}
    >
   
{/* container start */}
<div className="min-h-svh p-2 sm:p-6 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 overflow-hidden">
  
<div className="mb-10 items-start gap-4 content-start flex flex-wrap justify-start">
      
     
      {!hasProperties && (

       <div className="flex justify-center items-end gap-4 "> 


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
                        bonusRules={[]}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>


        <div className="flex justify-start items-center gap-2 h-80">
          <div className="w-64 flex flex-col justify-start items-start gap-8 relative ml-12">
               <div className="flex items-center space-x-4">
                <div className="text-lg font-black flex size-16  flex-none rounded-full bg-muted text-primary  items-center justify-center">01</div>   
                <Link to="/properties">
                  <p className="text-md  leading-none hover:text-brand">{t("sections.step_one")}</p>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                  <div className="text-lg font-black flex size-16  flex-none rounded-full bg-muted text-primary items-center justify-center">02</div>   
                  <Link to="/mortgages">
                    <p className="text-md  leading-none hover:text-brand">{t("sections.step_two")}</p>
                  </Link>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-lg font-black flex size-16  flex-none rounded-full bg-muted text-primary  items-center justify-center">03
                  </div>   
                  <p className="text-md leading-none">{t("sections.step_three")}</p>
                </div>
          </div>
        </div>
        </div>
      )}:{
propertiesCount > 0 && <FeatureCounts />
      }

<PropertyCards 
        onPropertySelect={() => {}} 
        onPropertiesLoaded={setHasProperties}
      />

   </div>
</div>
    </DashboardLayout>
  )
}
