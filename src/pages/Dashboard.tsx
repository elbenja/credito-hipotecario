import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "react-i18next"
import { Link, Navigate } from "react-router-dom"
import SVGillustration from '@/components/ui/SVGillustration'
import { Badge } from "@/components/ui/badge"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/context/auth-context"
// import { Separator } from "@radix-ui/react-separator"
import { FeatureCounts } from "@/components/dashboard/feature-counts"
import { PropertyCards } from "@/components/dashboard/property-cards"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Plus, Terminal } from "lucide-react"
import { PropertyForm } from "@/components/properties/property-form"
import { usePropertyCount } from "@/hooks/properties/useCount"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PlanLimitDialog } from "@/components/common/PlanLimitDialog"
import { useCanCreateFeature } from "@/hooks/usePlanLimits"
import {  Property, PropertyWithBonus } from "@/types/property"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useMortgageDraftStore } from "@/store/mortgage/store"
import { toast } from "sonner"

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'properties', 'mortgages'])
  const { user, hasAccess } = useAuth()
  const [hasProperties, setHasProperties] = useState(false)
  const [open, setOpen] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // const queryClient = useQueryClient()
  const { canCreate } = useCanCreateFeature()
  const { resetDraft } = useMortgageDraftStore();
  // const [selectedProperty, setSelectedProperty] = useState<PropertyWithBonus | null>(null)

  // Handle Stripe checkout success
  useEffect(() => {
    const success = searchParams.get('success');
    const cancelled = searchParams.get('cancelled');
    
    if (success === 'true') {
      toast.success('Payment successful! Your subscription has been upgraded.');
      // Clear the URL parameter
      setSearchParams(prev => {
        prev.delete('success');
        prev.delete('session_id');
        return prev;
      });
    } else if (cancelled === 'true') {
      toast.info('Payment was cancelled. You can try again anytime.');
      // Clear the URL parameter
      setSearchParams(prev => {
        prev.delete('cancelled');
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);
 
  const handleOpenEmptyPropertyForm = async () => {
    // console.log('canCreate', canCreate)
    const allowed = await canCreate('properties')
 
    if (!allowed) {
      setShowDialog(true)
    } else {
      console.log('allowed', allowed)
      // setSelectedProperty(null)
      setOpen(true)
    }
  }

  const handleAddMortgage =  async (e: React.MouseEvent, property: Property)  => {
    // console.log('handleAddMortgage', property)
    const allowed = await canCreate('mortgages')

    if (!allowed) {
      console.log('allowed', allowed)
      setShowDialog(true)
    } else {
      resetDraft();
      // navigate("/mortgages/new");
      // console.log('allowed', allowed)
      e.stopPropagation();
      navigate(`/mortgages/new?propertyId=${property.id}`);
    }
  };

  // // Fetch properties count with optimized caching
  const { data: propertiesCount = 0 } = usePropertyCount()
  // const { data: propertiesCount = 0 } = usePlanLimits()

// old optimistic update M19
  // Handle property success with optimistic update
  const handlePropertySuccess = () => {
    // Optimistic update - immediately set hasProperties to true
    setHasProperties(true)
    setOpen(false)
  }
  useEffect(() => {
    setHasProperties(propertiesCount > 0)
  }, [propertiesCount])







  return (
    <DashboardLayout
      header={{
        title: <h1 className="text-xl font-bold tracking-tight">{t("sections.dashboard")}</h1>
      }}
    >
   
{/* container start */}
<div className="h-full w-full p-6  flex flex-col justify-center items-center ">


  <div className="-mt-12 w-full inline-flex justify-center items-center gap-4 flex-wrap content-center ">
      
     
      {!hasProperties && (

       <div className="flex justify-start items-end gap-4 "> 

            <div className="w-52  rounded-3xl flex flex-col items-center justify-center p-0 gap-4">
                <div className=" rounded-3xl flex flex-col justify-center items-center  gap-1 ">
                  <SVGillustration variant="dog" className="w-52 h-52" />
                  <p  className="text-sm text-center w-40">
                  {t('messages.no_properties', { ns: 'properties' })}

                  </p>
                </div>
                <div className="w-40 h-19 bg-primary text-primary-foreground rounded-3xl flex flex-col justify-center items-center p-4 ">
                <button onClick={handleOpenEmptyPropertyForm} className="text-xs h-8 flex gap-2">  
                      <div className="flex-1 text-right text-sm font-medium leading-none">
                        {t('actions.add_property', { ns: 'properties' })}
                      </div>
                      <div className="size-8 bg-card text-card-foreground rounded-[99px] flex justify-center items-center">
                        <Plus className="h-4 w-4" />
                      </div>
                  </button>
                  </div>
               
            </div>


       
          <div className="w-64 flex flex-col justify-end items-start gap-8 relative ml-6  h-full">
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
      )} 

      <FeatureCounts 
      onOpenEmptyPropertyForm={handleOpenEmptyPropertyForm} />
      <PropertyCards 
        onPropertySelect={() => {}} 
        onPropertiesLoaded={setHasProperties}
        onAddMortgage={handleAddMortgage }
      />

   </div>
  <Alert className="w-80 mb-16 mt-12">
    <Terminal className="h-4 w-4" />
    <AlertTitle>v May24 4:02PM </AlertTitle>
    {/* <AlertDescription>
      You can add components and dependencies to your app using the cli.
    </AlertDescription> */}
  </Alert>

</div>
<Sheet open={open} onOpenChange={setOpen}>

<SheetTrigger asChild>


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

<PlanLimitDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        onUpgrade={() => {
          // TODO: Add navigation or logic to upgrade page
          setShowDialog(false)
        }}
      />
    </DashboardLayout>
  )
}
